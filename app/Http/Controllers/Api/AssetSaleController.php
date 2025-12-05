<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\AssetSale;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class AssetSaleController extends Controller
{
    /**
     * Display a listing of asset sales with unit-based filtering
     */
    public function index(Request $request)
    {
        try {
            $user = Auth::user();

            // Eager load relationships
            $query = AssetSale::with(['asset.unit', 'soldBy']);

            // Filter based on user role
            if ($user && $user->role === 'unit' && $user->unit_name) {
                // Admin Unit only sees sales from their unit
                $query->whereHas('asset', function($q) use ($user) {
                    $q->where('unit_name', $user->unit_name);
                });
            } elseif ($user && $user->role === 'admin' && $request->has('unit_name')) {
                // Admin Holding can filter by specific unit
                $query->whereHas('asset', function($q) use ($request) {
                    $q->where('unit_name', $request->unit_name);
                });
            }
            // super-admin sees all sales (no filter)

            // Search filter
            if ($request->has('search') && !empty($request->search)) {
                $searchTerm = $request->search;
                $query->where(function($q) use ($searchTerm) {
                    $q->where('buyer_name', 'like', '%' . $searchTerm . '%')
                      ->orWhere('buyer_contact', 'like', '%' . $searchTerm . '%')
                      ->orWhereHas('asset', function($assetQuery) use ($searchTerm) {
                          $assetQuery->where('name', 'like', '%' . $searchTerm . '%')
                                    ->orWhere('asset_tag', 'like', '%' . $searchTerm . '%');
                      });
                });
            }

            // Date range filter
            if ($request->has('start_date')) {
                $query->where('sale_date', '>=', $request->start_date);
            }
            if ($request->has('end_date')) {
                $query->where('sale_date', '<=', $request->end_date);
            }

            // Sorting
            $sortBy = $request->query('sort_by', 'sale_date');
            $sortOrder = $request->query('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            // Pagination
            $perPage = $request->query('per_page', 15);
            $sales = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $sales,
                'filters' => [
                    'unit_name' => $request->unit_name,
                    'search' => $request->search,
                    'start_date' => $request->start_date,
                    'end_date' => $request->end_date
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching asset sales: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch asset sales',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Store a newly created asset sale
     */
    public function store(Request $request)
    {
        DB::beginTransaction();

        try {
            $user = Auth::user();

            $validated = $request->validate([
                'asset_id' => 'required|exists:assets,id',
                'sale_price' => 'required|numeric|min:0',
                'sale_date' => 'required|date|before_or_equal:today',
                'buyer_name' => 'required|string|max:255',
                'buyer_contact' => 'nullable|string|max:255',
                'sale_proof' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120', // 5MB max
                'reason' => 'required|string|max:1000',
                'notes' => 'nullable|string|max:1000',
            ]);

            // Get the asset with unit relationship
            $asset = Asset::with('unit')->findOrFail($validated['asset_id']);

            // Validate unit access for Admin Unit
            if ($user->role === 'unit' && $user->unit_name && $asset->unit_name !== $user->unit_name) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda hanya dapat menjual asset di unit Anda sendiri'
                ], Response::HTTP_FORBIDDEN);
            }

            // Validate asset status
            if ($asset->status === 'Terjual') {
                return response()->json([
                    'success' => false,
                    'message' => 'Asset sudah terjual sebelumnya'
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            if ($asset->status === 'Terpinjam') {
                return response()->json([
                    'success' => false,
                    'message' => 'Asset sedang dipinjam dan tidak dapat dijual. Silakan kembalikan asset terlebih dahulu.'
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            // Check if asset already has an active sale record
            $existingSale = AssetSale::where('asset_id', $asset->id)->exists();
            if ($existingSale) {
                return response()->json([
                    'success' => false,
                    'message' => 'Asset sudah memiliki record penjualan'
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            // Handle file upload
            $saleProofPath = null;
            if ($request->hasFile('sale_proof')) {
                $file = $request->file('sale_proof');
                $fileName = 'sale_' . $asset->id . '_' . time() . '.' . $file->getClientOriginalExtension();
                $saleProofPath = $file->storeAs('asset_sales', $fileName, 'public');
            }

            // Create asset sale record
            $sale = AssetSale::create([
                'asset_id' => $asset->id,
                'sold_by_id' => $user->id,
                'sale_price' => $validated['sale_price'],
                'sale_date' => $validated['sale_date'],
                'buyer_name' => $validated['buyer_name'],
                'buyer_contact' => $validated['buyer_contact'] ?? null,
                'sale_proof_path' => $saleProofPath,
                'reason' => $validated['reason'],
                'notes' => $validated['notes'] ?? null,
            ]);

            // Update asset status to 'Terjual'
            $asset->update(['status' => 'Terjual']);

            DB::commit();

            Log::info("✅ Asset sold successfully: Asset {$asset->asset_tag} by User {$user->name} for {$validated['sale_price']}");

            return response()->json([
                'success' => true,
                'message' => 'Asset berhasil dijual',
                'data' => $sale->load(['asset.unit', 'soldBy'])
            ], Response::HTTP_CREATED);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();

            Log::error('Validation error creating asset sale: ' . json_encode($e->errors()));

            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], Response::HTTP_BAD_REQUEST);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Error creating asset sale: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to create asset sale',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Display the specified asset sale
     */
    public function show($id)
    {
        try {
            $user = Auth::user();

            $sale = AssetSale::with(['asset.unit', 'soldBy'])->find($id);

            if (!$sale) {
                return response()->json([
                    'success' => false,
                    'message' => 'Asset sale not found'
                ], Response::HTTP_NOT_FOUND);
            }

            // Check unit access for Admin Unit
            if ($user->role === 'unit' && $user->unit_name && $sale->asset->unit_name !== $user->unit_name) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to view sales from other units'
                ], Response::HTTP_FORBIDDEN);
            }

            // Add profit/loss calculation
            $sale->profit_loss = $sale->calculateProfitLoss();
            $sale->is_profit = $sale->isProfit();

            return response()->json([
                'success' => true,
                'data' => $sale
            ]);

        } catch (\Exception $e) {
            Log::error("Error fetching asset sale {$id}: " . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch asset sale',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Update the specified asset sale (admin & super-admin only)
     */
    public function update(Request $request, $id)
    {
        DB::beginTransaction();

        try {
            $sale = AssetSale::with('asset')->find($id);

            if (!$sale) {
                return response()->json([
                    'success' => false,
                    'message' => 'Asset sale not found'
                ], Response::HTTP_NOT_FOUND);
            }

            $validated = $request->validate([
                'sale_price' => 'sometimes|required|numeric|min:0',
                'sale_date' => 'sometimes|required|date|before_or_equal:today',
                'buyer_name' => 'sometimes|required|string|max:255',
                'buyer_contact' => 'nullable|string|max:255',
                'sale_proof' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
                'reason' => 'sometimes|required|string|max:1000',
                'notes' => 'nullable|string|max:1000',
            ]);

            // Handle file upload if new file provided
            if ($request->hasFile('sale_proof')) {
                // Delete old file if exists
                if ($sale->sale_proof_path && Storage::disk('public')->exists($sale->sale_proof_path)) {
                    Storage::disk('public')->delete($sale->sale_proof_path);
                }

                $file = $request->file('sale_proof');
                $fileName = 'sale_' . $sale->asset_id . '_' . time() . '.' . $file->getClientOriginalExtension();
                $validated['sale_proof_path'] = $file->storeAs('asset_sales', $fileName, 'public');
            }

            $sale->update($validated);

            DB::commit();

            Log::info("✅ Asset sale updated successfully: Sale ID {$sale->id}");

            return response()->json([
                'success' => true,
                'message' => 'Asset sale updated successfully',
                'data' => $sale->fresh()->load(['asset.unit', 'soldBy'])
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();

            Log::error('Validation error updating asset sale: ' . json_encode($e->errors()));

            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], Response::HTTP_BAD_REQUEST);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error("Error updating asset sale {$id}: " . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to update asset sale',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Cancel an asset sale and revert asset status (admin & super-admin only)
     */
    public function destroy($id)
    {
        DB::beginTransaction();

        try {
            $sale = AssetSale::with('asset')->find($id);

            if (!$sale) {
                return response()->json([
                    'success' => false,
                    'message' => 'Asset sale not found'
                ], Response::HTTP_NOT_FOUND);
            }

            $asset = $sale->asset;
            $assetTag = $asset->asset_tag;

            // Delete sale proof file if exists
            if ($sale->sale_proof_path && Storage::disk('public')->exists($sale->sale_proof_path)) {
                Storage::disk('public')->delete($sale->sale_proof_path);
            }

            // Revert asset status back to 'Available'
            $asset->update(['status' => 'Available']);

            // Delete the sale record
            $sale->delete();

            DB::commit();

            Log::info("✅ Asset sale cancelled successfully: Asset {$assetTag}, Sale ID {$id}");

            return response()->json([
                'success' => true,
                'message' => 'Asset sale cancelled successfully. Asset status reverted to Available.',
                'asset_tag' => $assetTag
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error("Error cancelling asset sale {$id}: " . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel asset sale',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get sale proof file dengan Stream
     */
    public function getProofFile($id)
    {
        try {
            $user = Auth::user();
            $sale = AssetSale::with('asset')->find($id);

            if (!$sale) {
                return response()->json([
                    'success' => false,
                    'message' => 'Asset sale not found'
                ], Response::HTTP_NOT_FOUND);
            }

            // Check unit access for Admin Unit
            if ($user->role === 'unit' && $user->unit_name && $sale->asset->unit_name !== $user->unit_name) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to access files from other units'
                ], Response::HTTP_FORBIDDEN);
            }

            if (!$sale->sale_proof_path) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sale proof file not found'
                ], Response::HTTP_NOT_FOUND);
            }

            if (!Storage::disk('public')->exists($sale->sale_proof_path)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sale proof file does not exist on storage'
                ], Response::HTTP_NOT_FOUND);
            }

            // Get file path
            $fullPath = Storage::disk('public')->path($sale->sale_proof_path);

            // Check if file exists on disk
            if (!\File::exists($fullPath)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sale proof file not found on disk'
                ], Response::HTTP_NOT_FOUND);
            }

            // Get MIME type
            $mimeType = \File::mimeType($fullPath);
            $fileName = basename($sale->sale_proof_path);

            // Stream file dengan range support
            $fileSize = filesize($fullPath);
            $request = request();

            // Handle range request untuk resume download
            if ($request->hasHeader('Range')) {
                $range = $request->header('Range');
                if (preg_match('/bytes=(\d+)-(\d*)/', $range, $matches)) {
                    $start = intval($matches[1]);
                    $end = $matches[2] !== '' ? intval($matches[2]) : $fileSize - 1;

                    if ($start >= 0 && $end < $fileSize && $start <= $end) {
                        $length = $end - $start + 1;

                        return response()->stream(function() use ($fullPath, $start, $length) {
                            $handle = fopen($fullPath, 'r');
                            fseek($handle, $start);
                            echo fread($handle, $length);
                            fclose($handle);
                        }, 206, [
                            'Content-Type' => $mimeType,
                            'Content-Length' => $length,
                            'Content-Range' => "bytes $start-$end/$fileSize",
                            'Content-Disposition' => "inline; filename=\"$fileName\"",
                            'Accept-Ranges' => 'bytes',
                            'Cache-Control' => 'public, max-age=3600'
                        ]);
                    }
                }
            }

            // Stream file normal
            return response()->stream(function() use ($fullPath) {
                $handle = fopen($fullPath, 'r');
                while (!feof($handle)) {
                    echo fread($handle, 8192); // 8KB chunks
                }
                fclose($handle);
            }, 200, [
                'Content-Type' => $mimeType,
                'Content-Length' => $fileSize,
                'Content-Disposition' => "inline; filename=\"$fileName\"",
                'Accept-Ranges' => 'bytes',
                'Cache-Control' => 'public, max-age=3600'
            ]);

        } catch (\Exception $e) {
            Log::error("Error fetching sale proof file for sale {$id}: " . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch sale proof file',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get asset sales statistics
     */
    public function statistics()
    {
        try {
            $user = Auth::user();

            $query = AssetSale::query();

            // Filter by unit for Admin Unit
            if ($user && $user->role === 'unit' && $user->unit_name) {
                $query->whereHas('asset', function($q) use ($user) {
                    $q->where('unit_name', $user->unit_name);
                });
            }

            $totalSales = $query->count();
            $totalRevenue = $query->sum('sale_price');

            // Recent sales
            $recentSales = $query->clone()
                ->with(['asset.unit', 'soldBy'])
                ->orderBy('sale_date', 'desc')
                ->limit(5)
                ->get();

            // Sales this month
            $salesThisMonth = $query->clone()
                ->whereYear('sale_date', Carbon::now()->year)
                ->whereMonth('sale_date', Carbon::now()->month)
                ->count();

            $revenueThisMonth = $query->clone()
                ->whereYear('sale_date', Carbon::now()->year)
                ->whereMonth('sale_date', Carbon::now()->month)
                ->sum('sale_price');

            // Sales by month (last 6 months)
            $salesByMonth = [];
            for ($i = 5; $i >= 0; $i--) {
                $date = Carbon::now()->subMonths($i);
                $count = $query->clone()
                    ->whereYear('sale_date', $date->year)
                    ->whereMonth('sale_date', $date->month)
                    ->count();

                $revenue = $query->clone()
                    ->whereYear('sale_date', $date->year)
                    ->whereMonth('sale_date', $date->month)
                    ->sum('sale_price');

                $salesByMonth[] = [
                    'month' => $date->format('M Y'),
                    'count' => $count,
                    'revenue' => (float) $revenue
                ];
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'total_sales' => $totalSales,
                    'total_revenue' => (float) $totalRevenue,
                    'sales_this_month' => $salesThisMonth,
                    'revenue_this_month' => (float) $revenueThisMonth,
                    'recent_sales' => $recentSales,
                    'sales_by_month' => $salesByMonth
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching asset sale statistics: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch asset sale statistics',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get available assets for sale (not sold, not borrowed)
     */
    public function getAvailableAssets(Request $request)
    {
        try {
            $user = Auth::user();

            $query = Asset::with('unit')
                ->whereNotIn('status', ['Terjual', 'Terpinjam'])
                ->whereDoesntHave('sales'); // Asset yang belum pernah dijual

            // Filter by unit for Admin Unit
            if ($user && $user->role === 'unit' && $user->unit_name) {
                $query->where('unit_name', $user->unit_name);
            }

            // Optional search filter
            if ($request->has('search') && !empty($request->search)) {
                $searchTerm = $request->search;
                $query->where(function($q) use ($searchTerm) {
                    $q->where('asset_tag', 'like', '%' . $searchTerm . '%')
                      ->orWhere('name', 'like', '%' . $searchTerm . '%')
                      ->orWhere('category', 'like', '%' . $searchTerm . '%');
                });
            }

            $assets = $query->orderBy('name', 'asc')->get();

            return response()->json([
                'success' => true,
                'data' => $assets
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching available assets for sale: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch available assets',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
