<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class AssetController extends Controller
{
    public function index(Request $request)
    {
        try {
            // Ambil parameter filter dari request
            $category = $request->query('category');
            $unit_id = $request->query('unit_id');
            $status = $request->query('status');
            $search = $request->query('search');

            // Mulai query dengan eager loading untuk depreciations dan unit
            $query = Asset::with(['depreciations' => function($query) {
                $query->orderBy('month_sequence', 'desc')->limit(1);
            }, 'unit']);

            // ✅ PERBAIKAN: Filter berdasarkan unit user
            $user = Auth::user();
            if ($user && in_array($user->role, ['Admin Unit', 'User'])) {
                // Admin Unit & User hanya bisa lihat asset di unit mereka
                if ($user->unit_id) {
                    $query->where('unit_id', $user->unit_id);
                } else {
                    // User tanpa unit_id akan melihat empty list
                    $query->whereRaw('1 = 0'); // Force empty result
                }
            } elseif ($user && $user->role === 'Admin Holding' && $unit_id) {
                // Admin Holding bisa filter by unit tertentu
                $query->where('unit_id', $unit_id);
            }
            // Super Admin bisa lihat semua (no filter)

            // Terapkan filter jika ada
            if (!empty($category)) {
                $query->where('category', 'like', '%' . $category . '%');
            }

            // Filter unit_id hanya untuk Super Admin dan Admin Holding
            if (!empty($unit_id) && $user && in_array($user->role, ['Super Admin', 'Admin Holding'])) {
                $query->where('unit_id', $unit_id);
            }

            if (!empty($status)) {
                $query->where('status', $status);
            }

            // Filter pencarian
            if (!empty($search)) {
                $query->where(function($q) use ($search) {
                    $q->where('asset_tag', 'like', '%' . $search . '%')
                      ->orWhere('name', 'like', '%' . $search . '%')
                      ->orWhere('category', 'like', '%' . $search . '%');
                });
            }

            // Sorting
            $sortBy = $request->query('sort_by', 'created_at');
            $sortOrder = $request->query('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            // Pagination
            $perPage = $request->query('per_page', 15);
            $assets = $query->paginate($perPage);

            // Tambahkan informasi depresiasi ke setiap asset
            $assets->getCollection()->transform(function ($asset) {
                $latestDepreciation = $asset->depreciations->first();
                
                $asset->current_book_value = $latestDepreciation 
                    ? $latestDepreciation->current_value 
                    : $asset->value;
                
                $asset->accumulated_depreciation = $latestDepreciation 
                    ? $latestDepreciation->accumulated_depreciation 
                    : 0;
                
                $asset->depreciated_months = $latestDepreciation 
                    ? $latestDepreciation->month_sequence 
                    : 0;
                
                $asset->pending_depreciation_months = $asset->getPendingDepreciationMonths();
                $asset->is_up_to_date = $asset->getPendingDepreciationMonths() === 0;

                return $asset;
            });

            return response()->json([
                'success' => true,
                'data' => $assets,
                'filters' => [
                    'category' => $category,
                    'unit_id' => $unit_id,
                    'status' => $status,
                    'search' => $search
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching assets: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch assets',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    public function store(Request $request)
    {
        DB::beginTransaction();
        
        try {
            $user = Auth::user();
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'category' => 'required|string|max:255',
                'unit_id' => 'nullable|exists:units,id',
                'value' => 'required|numeric|min:0',
                'purchase_date' => 'required|date|before_or_equal:today',
                'useful_life' => 'required|integer|min:1',
                'status' => 'required|in:In Use,In Repair,Disposed,Lost,Available,Terpinjam',
            ]);

            // ✅ Middleware sudah validasi role, kita hanya perlu handle business logic
            // Admin Unit otomatis di-set unit_id nya
            if ($user && $user->role === 'Admin Unit' && $user->unit_id) {
                $validated['unit_id'] = $user->unit_id;
            }

            // Handle purchase date dengan timezone
            $purchaseDate = Carbon::parse($validated['purchase_date']);
            $today = Carbon::now('Asia/Jakarta');
            
            if (strlen($validated['purchase_date']) <= 10) {
                $purchaseDate->setTime(19, 30, 0);
            }
            
            if ($purchaseDate->greaterThan($today)) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Purchase date cannot be in the future'
                ], Response::HTTP_BAD_REQUEST);
            }

            $validated['purchase_date'] = $purchaseDate->format('Y-m-d H:i:s');
            $validated['created_at'] = $validated['purchase_date'];
            $validated['updated_at'] = $validated['purchase_date'];

            $asset = Asset::create($validated);

            DB::commit();

            Log::info("✅ Asset created successfully: {$asset->asset_tag} - Purchase Date: {$asset->purchase_date}");

            return response()->json([
                'success' => true,
                'message' => 'Asset created successfully',
                'data' => $asset
            ], Response::HTTP_CREATED);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            
            Log::error('Validation error creating asset: ' . json_encode($e->errors()));
            
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], Response::HTTP_BAD_REQUEST);

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('Error creating asset: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to create asset',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    public function show($id)
    {
        try {
            // ✅ UPDATE: Include depresiasi data dengan informasi lengkap
            $asset = Asset::with(['depreciations' => function($query) {
                $query->orderBy('month_sequence', 'asc');
            }, 'unit'])->find($id);

            if (!$asset) {
                Log::warning("Asset not found: {$id}");
                return response()->json([
                    'success' => false,
                    'message' => 'Asset not found'
                ], Response::HTTP_NOT_FOUND);
            }

            // ✅ Middleware sudah handle unit authorization, langsung proses data
            $latestDepreciation = $asset->depreciations->last();
            
            $asset->current_book_value = $latestDepreciation 
                ? $latestDepreciation->current_value 
                : $asset->value;
            
            $asset->accumulated_depreciation = $latestDepreciation 
                ? $latestDepreciation->accumulated_depreciation 
                : 0;
            
            $asset->depreciated_months = $latestDepreciation 
                ? $latestDepreciation->month_sequence 
                : 0;
            
            $asset->pending_depreciation_months = $asset->getPendingDepreciationMonths();
            $asset->elapsed_months_since_purchase = $asset->getElapsedMonths();
            $asset->expected_depreciated_months = $asset->getExpectedDepreciationMonths();
            $asset->is_up_to_date = $asset->getPendingDepreciationMonths() === 0;
            $asset->monthly_depreciation = $asset->calculateMonthlyDepreciation();

            Log::info("✅ Asset retrieved successfully: {$asset->asset_tag}");

            return response()->json([
                'success' => true,
                'data' => $asset
            ]);

        } catch (\Exception $e) {
            Log::error("Error fetching asset {$id}: " . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch asset',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    public function update(Request $request, $id)
    {
        DB::beginTransaction();
        
        try {
            $asset = Asset::find($id);

            if (!$asset) {
                return response()->json([
                    'success' => false,
                    'message' => 'Asset not found'
                ], Response::HTTP_NOT_FOUND);
            }

            $validated = $request->validate([
                'asset_tag' => 'sometimes|required|string|unique:assets,asset_tag,' . $id,
                'name' => 'sometimes|required|string|max:255',
                'category' => 'sometimes|required|string|max:255',
                'unit_id' => 'nullable|exists:units,id',
                'value' => 'sometimes|required|numeric|min:0',
                'purchase_date' => 'sometimes|required|date|before_or_equal:today',
                'useful_life' => 'sometimes|required|integer|min:1',
                'status' => 'sometimes|required|in:In Use,In Repair,Disposed,Lost,Available,Terpinjam',
            ]);

            // ✅ Middleware sudah validasi unit permission, langsung proses update
            $user = Auth::user();
            if ($user && $user->role === 'Admin Unit' && $user->unit_id) {
                // Admin Unit tidak bisa ubah unit_id asset
                if (isset($validated['unit_id']) && $validated['unit_id'] != $user->unit_id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Anda tidak dapat mengubah unit asset'
                    ], Response::HTTP_FORBIDDEN);
                }
                // Force unit_id sesuai unit Admin Unit
                $validated['unit_id'] = $user->unit_id;
            }

            // Validasi purchase date jika ada
            if (isset($validated['purchase_date'])) {
                $purchaseDate = Carbon::parse($validated['purchase_date']);
                $today = Carbon::today();
                
                if ($purchaseDate->greaterThan($today)) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'Purchase date cannot be in the future'
                    ], Response::HTTP_BAD_REQUEST);
                }
            }

            // ✅ CEK PERUBAHAN CRITICAL: Jika value atau useful life berubah, mungkin perlu reset depresiasi
            $criticalChanges = false;
            $changeDetails = [];
            
            if (isset($validated['value']) && $validated['value'] != $asset->value) {
                $criticalChanges = true;
                $changeDetails[] = 'value changed from ' . $asset->value . ' to ' . $validated['value'];
            }
            
            if (isset($validated['useful_life']) && $validated['useful_life'] != $asset->useful_life) {
                $criticalChanges = true;
                $changeDetails[] = 'useful_life changed from ' . $asset->useful_life . ' to ' . $validated['useful_life'];
            }
            
            if (isset($validated['purchase_date']) && $validated['purchase_date'] != $asset->purchase_date) {
                $criticalChanges = true;
                $changeDetails[] = 'purchase_date changed from ' . $asset->purchase_date . ' to ' . $validated['purchase_date'];
            }

            $asset->update($validated);

            DB::commit();

            // Log perubahan critical
            if ($criticalChanges) {
                Log::warning("Critical changes detected for asset {$asset->asset_tag}: " . implode(', ', $changeDetails));
            }

            Log::info("✅ Asset updated successfully: {$asset->asset_tag}");

            return response()->json([
                'success' => true,
                'message' => 'Asset updated successfully',
                'data' => $asset,
                'critical_changes' => $criticalChanges,
                'change_details' => $criticalChanges ? $changeDetails : null
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            
            Log::error('Validation error updating asset: ' . json_encode($e->errors()));
            
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], Response::HTTP_BAD_REQUEST);

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error("Error updating asset {$id}: " . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to update asset',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    public function destroy($id)
    {
        DB::beginTransaction();
        
        try {
            $asset = Asset::with('depreciations')->find($id);

            if (!$asset) {
                return response()->json([
                    'success' => false,
                    'message' => 'Asset not found'
                ], Response::HTTP_NOT_FOUND);
            }

            $assetTag = $asset->asset_tag;
            $depreciationCount = $asset->depreciations->count();

            // Hapus asset (depreciations akan terhapus otomatis karena cascade)
            $asset->delete();

            DB::commit();

            Log::info("✅ Asset deleted successfully: {$assetTag} (with {$depreciationCount} depreciation records)");

            return response()->json([
                'success' => true,
                'message' => 'Asset deleted successfully',
                'deleted_asset_tag' => $assetTag,
                'deleted_depreciation_records' => $depreciationCount
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error("Error deleting asset {$id}: " . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete asset',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * ✅ METHOD BARU: Get asset statistics dengan filter unit
     */
    public function statistics()
    {
        try {
            $user = Auth::user();
            
            // Query dasar untuk statistics
            $baseQuery = Asset::query();
            
            // ✅ Filter berdasarkan unit untuk Admin Unit dan User
            if ($user && in_array($user->role, ['Admin Unit', 'User'])) {
                $baseQuery->where('unit_id', $user->unit_id);
            }

            $totalAssets = $baseQuery->count();
            $totalValue = $baseQuery->sum('value');
            $activeAssets = $baseQuery->whereNotIn('status', ['Disposed', 'Lost'])->count();
            
            $assetsByStatus = $baseQuery->clone()
                ->selectRaw('status, count(*) as count')
                ->groupBy('status')
                ->get()
                ->pluck('count', 'status');
            
            $assetsByCategory = $baseQuery->clone()
                ->selectRaw('category, count(*) as count, sum(value) as total_value')
                ->groupBy('category')
                ->get();

            $recentlyAdded = $baseQuery->clone()
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get();

            // Hitung informasi depresiasi dengan filter unit
            $depreciationQuery = \App\Models\AssetDepreciation::query();
            if ($user && in_array($user->role, ['Admin Unit', 'User'])) {
                $depreciationQuery->whereHas('asset', function($q) use ($user) {
                    $q->where('unit_id', $user->unit_id);
                });
            }

            $totalDepreciationRecords = $depreciationQuery->count();
            $totalDepreciatedAmount = $depreciationQuery->sum('depreciation_amount');
            
            $assetsWithPendingDepreciation = $baseQuery->clone()
                ->whereNotIn('status', ['Disposed', 'Lost'])
                ->get()
                ->filter(function ($asset) {
                    return $asset->getPendingDepreciationMonths() > 0;
                })
                ->count();

            return response()->json([
                'success' => true,
                'data' => [
                    'total_assets' => $totalAssets,
                    'total_value' => (float) $totalValue,
                    'active_assets' => $activeAssets,
                    'assets_by_status' => $assetsByStatus,
                    'assets_by_category' => $assetsByCategory,
                    'recently_added_assets' => $recentlyAdded,
                    'depreciation_stats' => [
                        'total_depreciation_records' => $totalDepreciationRecords,
                        'total_depreciated_amount' => (float) $totalDepreciatedAmount,
                        'assets_with_pending_depreciation' => $assetsWithPendingDepreciation
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching asset statistics: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch asset statistics',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * ✅ METHOD BARU: Bulk update assets dengan validasi unit
     */
    public function bulkUpdate(Request $request)
    {
        DB::beginTransaction();
        
        try {
            $user = Auth::user();
            $validated = $request->validate([
                'asset_ids' => 'required|array',
                'asset_ids.*' => 'exists:assets,id',
                'updates' => 'required|array',
                'updates.unit_id' => 'nullable|exists:units,id',
                'updates.status' => 'sometimes|in:In Use,In Repair,Disposed,Lost',
                'updates.category' => 'sometimes|string|max:255',
            ]);

            $assetIds = $validated['asset_ids'];
            $updates = $validated['updates'];

            // ✅ Validasi: Admin Unit hanya bisa update asset di unit mereka
            if ($user && $user->role === 'Admin Unit' && $user->unit_id) {
                $userAssetIds = Asset::where('unit_id', $user->unit_id)
                    ->whereIn('id', $assetIds)
                    ->pluck('id')
                    ->toArray();
                
                if (count($userAssetIds) !== count($assetIds)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Anda hanya dapat mengupdate asset di unit Anda sendiri'
                    ], Response::HTTP_FORBIDDEN);
                }

                // Admin Unit tidak bisa ubah unit_id
                if (isset($updates['unit_id']) && $updates['unit_id'] != $user->unit_id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Anda tidak dapat mengubah unit asset'
                    ], Response::HTTP_FORBIDDEN);
                }
                
                // Force unit_id sesuai unit Admin Unit
                $updates['unit_id'] = $user->unit_id;
            }

            // Validasi purchase date jika ada
            if (isset($updates['purchase_date'])) {
                $purchaseDate = Carbon::parse($updates['purchase_date']);
                $today = Carbon::today();
                
                if ($purchaseDate->greaterThan($today)) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'Purchase date cannot be in the future'
                    ], Response::HTTP_BAD_REQUEST);
                }
            }

            $updatedCount = Asset::whereIn('id', $assetIds)->update($updates);

            DB::commit();

            Log::info("✅ Bulk update completed: {$updatedCount} assets updated");

            return response()->json([
                'success' => true,
                'message' => "Successfully updated {$updatedCount} assets",
                'updated_count' => $updatedCount
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            
            Log::error('Validation error in bulk update: ' . json_encode($e->errors()));
            
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], Response::HTTP_BAD_REQUEST);

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('Error in bulk update: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to perform bulk update',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * ✅ METHOD BARU: Search assets dengan filter advanced dan unit-based
     */
    public function search(Request $request)
    {
        try {
            $user = Auth::user();
            $query = Asset::with(['depreciations' => function($query) {
                $query->orderBy('month_sequence', 'desc')->limit(1);
            }]);

            // ✅ Filter berdasarkan unit user
            if ($user && in_array($user->role, ['Admin Unit', 'User'])) {
                $query->where('unit_id', $user->unit_id);
            }

            // Filter by text search
            if ($request->has('q') && !empty($request->q)) {
                $searchTerm = $request->q;
                $query->where(function($q) use ($searchTerm) {
                    $q->where('asset_tag', 'like', '%' . $searchTerm . '%')
                      ->orWhere('name', 'like', '%' . $searchTerm . '%')
                      ->orWhere('category', 'like', '%' . $searchTerm . '%')
                      ->orWhere('Unit', 'like', '%' . $searchTerm . '%');
                });
            }

            // Filter by value range
            if ($request->has('min_value')) {
                $query->where('value', '>=', $request->min_value);
            }
            if ($request->has('max_value')) {
                $query->where('value', '<=', $request->max_value);
            }

            // Filter by purchase date range
            if ($request->has('purchase_date_from')) {
                $query->where('purchase_date', '>=', $request->purchase_date_from);
            }
            if ($request->has('purchase_date_to')) {
                $query->where('purchase_date', '<=', $request->purchase_date_to);
            }

            // Filter by useful life
            if ($request->has('min_useful_life')) {
                $query->where('useful_life', '>=', $request->min_useful_life);
            }
            if ($request->has('max_useful_life')) {
                $query->where('useful_life', '<=', $request->max_useful_life);
            }

            // Filter by depresiasi status
            if ($request->has('depreciation_status')) {
                $depreciationStatus = $request->depreciation_status;
                
                $assets = $query->get();
                $filteredAssets = $assets->filter(function ($asset) use ($depreciationStatus) {
                    $pendingMonths = $asset->getPendingDepreciationMonths();
                    
                    switch ($depreciationStatus) {
                        case 'up_to_date':
                            return $pendingMonths === 0;
                        case 'pending':
                            return $pendingMonths > 0;
                        case 'fully_depreciated':
                            $currentValue = $asset->depreciations->first() 
                                ? $asset->depreciations->first()->current_value 
                                : $asset->value;
                            return $currentValue <= 0;
                        default:
                            return true;
                    }
                });
                
                $assets = $filteredAssets->values();
            } else {
                $assets = $query->get();
            }

            // Tambahkan informasi depresiasi
            $assets->transform(function ($asset) {
                $latestDepreciation = $asset->depreciations->first();
                
                $asset->current_book_value = $latestDepreciation 
                    ? $latestDepreciation->current_value 
                    : $asset->value;
                
                $asset->accumulated_depreciation = $latestDepreciation 
                    ? $latestDepreciation->accumulated_depreciation 
                    : 0;
                
                $asset->depreciated_months = $latestDepreciation 
                    ? $latestDepreciation->month_sequence 
                    : 0;
                
                $asset->pending_depreciation_months = $asset->getPendingDepreciationMonths();
                $asset->is_up_to_date = $asset->getPendingDepreciationMonths() === 0;

                return $asset;
            });

            // Pagination manual untuk hasil filtered
            $perPage = $request->get('per_page', 15);
            $page = $request->get('page', 1);
            
            $paginatedAssets = new \Illuminate\Pagination\LengthAwarePaginator(
                $assets->forPage($page, $perPage),
                $assets->count(),
                $perPage,
                $page
            );

            return response()->json([
                'success' => true,
                'data' => $paginatedAssets,
                'total_results' => $assets->count()
            ]);

        } catch (\Exception $e) {
            Log::error('Error searching assets: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to search assets',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * ✅ METHOD BARU: Export assets data dengan filter unit
     */
    public function export(Request $request)
    {
        try {
            $user = Auth::user();
            $query = Asset::with(['depreciations' => function($query) {
                $query->orderBy('month_sequence', 'desc')->limit(1);
            }]);

            // ✅ Filter berdasarkan unit user
            if ($user && in_array($user->role, ['Admin Unit', 'User'])) {
                $query->where('unit_id', $user->unit_id);
            }

            $assets = $query->get();

            $exportData = $assets->map(function ($asset) {
                $latestDepreciation = $asset->depreciations->first();
                
                return [
                    'asset_tag' => $asset->asset_tag,
                    'name' => $asset->name,
                    'category' => $asset->category,
                    'location' => $asset->location,
                    'original_value' => $asset->value,
                    'current_book_value' => $latestDepreciation ? $latestDepreciation->current_value : $asset->value,
                    'accumulated_depreciation' => $latestDepreciation ? $latestDepreciation->accumulated_depreciation : 0,
                    'depreciated_months' => $latestDepreciation ? $latestDepreciation->month_sequence : 0,
                    'pending_depreciation_months' => $asset->getPendingDepreciationMonths(),
                    'purchase_date' => $asset->purchase_date,
                    'useful_life' => $asset->useful_life,
                    'status' => $asset->status,
                    'monthly_depreciation' => $asset->calculateMonthlyDepreciation(),
                    'is_up_to_date' => $asset->getPendingDepreciationMonths() === 0 ? 'Yes' : 'No',
                    'elapsed_months' => $asset->getElapsedMonths()
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $exportData,
                'exported_at' => Carbon::now()->toDateTimeString(),
                'total_assets' => $assets->count()
            ]);

        } catch (\Exception $e) {
            Log::error('Error exporting assets: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to export assets data',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * ✅ METHOD BARU: Validate asset data sebelum create/update
     */
    public function validateAsset(Request $request)
    {
        try {
            $user = Auth::user();
            $validated = $request->validate([
                'asset_tag' => 'sometimes|required|string|unique:assets,asset_tag',
                'purchase_date' => 'sometimes|required|date|before_or_equal:today',
                'value' => 'sometimes|required|numeric|min:0',
                'useful_life' => 'sometimes|required|integer|min:1',
                'unit_id' => 'nullable|exists:units,id',
            ]);

            $validationResults = [];
            $isValid = true;

            // Validasi purchase date
            if (isset($validated['purchase_date'])) {
                $purchaseDate = Carbon::parse($validated['purchase_date']);
                $today = Carbon::today();
                
                if ($purchaseDate->greaterThan($today)) {
                    $validationResults[] = [
                        'field' => 'purchase_date',
                        'valid' => false,
                        'message' => 'Purchase date cannot be in the future'
                    ];
                    $isValid = false;
                } else {
                    $validationResults[] = [
                        'field' => 'purchase_date',
                        'valid' => true,
                        'message' => 'Purchase date is valid'
                    ];
                }
            }

            // Validasi asset tag uniqueness
            if (isset($validated['asset_tag'])) {
                $exists = Asset::where('asset_tag', $validated['asset_tag'])->exists();
                if ($exists) {
                    $validationResults[] = [
                        'field' => 'asset_tag',
                        'valid' => false,
                        'message' => 'Asset tag already exists'
                    ];
                    $isValid = false;
                } else {
                    $validationResults[] = [
                        'field' => 'asset_tag',
                        'valid' => true,
                        'message' => 'Asset tag is available'
                    ];
                }
            }

            // Validasi unit untuk Admin Unit
            if (isset($validated['unit_id']) && $user && $user->role === 'Admin Unit') {
                if ($validated['unit_id'] != $user->unit_id) {
                    $validationResults[] = [
                        'field' => 'unit_id',
                        'valid' => false,
                        'message' => 'Anda hanya dapat menambahkan asset di unit Anda sendiri'
                    ];
                    $isValid = false;
                } else {
                    $validationResults[] = [
                        'field' => 'unit_id',
                        'valid' => true,
                        'message' => 'Unit valid untuk akses Anda'
                    ];
                }
            }

            return response()->json([
                'success' => true,
                'valid' => $isValid,
                'validation_results' => $validationResults,
                'validated_data' => $validated
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'valid' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], Response::HTTP_BAD_REQUEST);
        }
    }

    /**
     * ✅ METHOD BARU: Get available assets for borrowing (User role) dengan filter unit
     */
    public function getAvailableAssets(Request $request)
    {
        try {
            $user = Auth::user();
            
            // Only return assets with "Available" status for borrowing
            $query = Asset::where('status', 'Available')
                ->with(['depreciations' => function($query) {
                    $query->orderBy('month_sequence', 'desc')->limit(1);
                }, 'unit']);

            // ✅ PERBAIKAN: Filter berdasarkan unit user
            if ($user && in_array($user->role, ['Admin Unit', 'User'])) {
                // User hanya bisa pinjam asset di unit mereka sendiri
                if ($user->unit_id) {
                    $query->where('unit_id', $user->unit_id);
                } else {
                    // User tanpa unit_id akan melihat empty list
                    $query->whereRaw('1 = 0'); // Force empty result
                }
            }

            // Optional search filter
            if ($request->has('search') && !empty($request->search)) {
                $searchTerm = $request->search;
                $query->where(function($q) use ($searchTerm) {
                    $q->where('asset_tag', 'like', '%' . $searchTerm . '%')
                      ->orWhere('name', 'like', '%' . $searchTerm . '%')
                      ->orWhere('category', 'like', '%' . $searchTerm . '%')
                      ->orWhere('location', 'like', '%' . $searchTerm . '%');
                });
            }

            // Sorting
            $sortBy = $request->query('sort_by', 'name');
            $sortOrder = $request->query('sort_order', 'asc');
            $query->orderBy($sortBy, $sortOrder);

            $assets = $query->get();

            // Add depreciation info to each asset
            $assets->transform(function ($asset) {
                $latestDepreciation = $asset->depreciations->first();

                $asset->current_book_value = $latestDepreciation
                    ? $latestDepreciation->current_value
                    : $asset->value;

                return $asset;
            });

            return response()->json([
                'success' => true,
                'data' => $assets
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching available assets: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch available assets',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * ✅ METHOD BARU: Get assets by unit (untuk dropdown/filter)
     */
    public function getAssetsByUnit($unitId)
    {
        try {
            $user = Auth::user();
            
            // Validasi akses unit
            if ($user && in_array($user->role, ['Admin Unit', 'User']) && $user->unit_id != $unitId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to access assets from this unit'
                ], Response::HTTP_FORBIDDEN);
            }

            $assets = Asset::where('unit_id', $unitId)
                ->with('unit')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $assets
            ]);

        } catch (\Exception $e) {
            Log::error("Error fetching assets for unit {$unitId}: " . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch assets for unit',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}