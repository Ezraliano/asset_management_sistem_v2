<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\IncidentReport;
use App\Models\AssetLoan;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class IncidentReportController extends Controller
{
    /**
     * Display a listing of incident reports.
     */
    public function index(Request $request)
    {
        try {
            $user = Auth::user();

            $query = IncidentReport::with(['asset.unit', 'reporter', 'reviewer']);

            // Filter by user role
            if ($user->role === 'User') {
                // Users can only see their own reports
                $query->where('reporter_id', $user->id);
            } elseif ($user->role === 'Admin Unit' && $user->unit_id) {
                // Admin Unit can only see reports for assets in their unit
                $query->whereHas('asset', function($q) use ($user) {
                    $q->where('unit_id', $user->unit_id);
                });
            }
            // Super Admin and Admin Holding can see all reports

            // Filter by status
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            // Filter by type
            if ($request->has('type')) {
                $query->where('type', $request->type);
            }

            // Filter by date range
            if ($request->has('start_date')) {
                $query->where('date', '>=', $request->start_date);
            }
            if ($request->has('end_date')) {
                $query->where('date', '<=', $request->end_date);
            }

            // Search by asset name or description
            if ($request->has('search')) {
                $searchTerm = $request->search;
                $query->where(function($q) use ($searchTerm) {
                    $q->where('description', 'like', '%' . $searchTerm . '%')
                      ->orWhereHas('asset', function($assetQuery) use ($searchTerm) {
                          $assetQuery->where('name', 'like', '%' . $searchTerm . '%')
                                    ->orWhere('asset_tag', 'like', '%' . $searchTerm . '%');
                      });
                });
            }

            // Sorting
            $sortBy = $request->query('sort_by', 'created_at');
            $sortOrder = $request->query('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            // Pagination
            $perPage = $request->query('per_page', 15);
            $incidents = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $incidents
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching incident reports: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch incident reports',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Store a newly created incident report.
     */
    public function store(Request $request)
    {
        DB::beginTransaction();

        try {
            $user = Auth::user();

            $request->validate([
                'asset_id' => 'required|exists:assets,id',
                'type' => 'required|in:Damage,Loss',
                'description' => 'required|string|min:10|max:1000',
                'date' => 'required|date|before_or_equal:today',
                'evidence_photo' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
            ]);

            $asset = Asset::with('unit')->findOrFail($request->asset_id);

            // Check if user can report incident for this asset
            // Users can only report for assets in their unit
            if ($user->role === 'User' && $asset->unit_id !== $user->unit_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only report incidents for assets in your unit'
                ], Response::HTTP_FORBIDDEN);
            }

            // Check if asset is currently on loan
            $activeLoan = AssetLoan::where('asset_id', $asset->id)
                ->where('status', 'APPROVED')
                ->first();

            // Handle photo upload
            $photoPath = null;
            if ($request->hasFile('evidence_photo')) {
                $photoPath = $request->file('evidence_photo')->store('incident-evidence', 'public');
            } else {
                throw new \Exception('Evidence photo is required');
            }

            $incident = IncidentReport::create([
                'asset_id' => $request->asset_id,
                'reporter_id' => $user->id,
                'type' => $request->type,
                'description' => $request->description,
                'date' => $request->date,
                'status' => 'PENDING',
                'evidence_photo_path' => $photoPath,
            ]);

            // Jika laporan kehilangan dan asset sedang dipinjam, update status loan
            if ($request->type === 'Loss' && $activeLoan) {
                $activeLoan->update([
                    'status' => 'LOST',
                    'return_condition' => 'lost',
                    'actual_return_date' => $request->date,
                    'return_notes' => 'Asset hilang berdasarkan laporan insiden: ' . $request->description
                ]);
            }

            DB::commit();

            Log::info("✅ Incident report created: ID {$incident->id} by User {$user->name} for Asset {$asset->name}");

            return response()->json([
                'success' => true,
                'message' => 'Incident report created successfully',
                'data' => $incident->load(['asset.unit', 'reporter'])
            ], Response::HTTP_CREATED);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();

            Log::error('Validation error creating incident report: ' . json_encode($e->errors()));

            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], Response::HTTP_BAD_REQUEST);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Error creating incident report: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to create incident report',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Display the specified incident report.
     */
    public function show($id)
    {
        try {
            $user = Auth::user();

            $incident = IncidentReport::with(['asset.unit', 'reporter', 'reviewer'])->find($id);

            if (!$incident) {
                return response()->json([
                    'success' => false,
                    'message' => 'Incident report not found'
                ], Response::HTTP_NOT_FOUND);
            }

            // Authorization check
            if ($user->role === 'User' && $incident->reporter_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to view this incident report'
                ], Response::HTTP_FORBIDDEN);
            }

            // Check for Admin Unit
            if ($user->role === 'Admin Unit' && $user->unit_id && $incident->asset->unit_id !== $user->unit_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to view incident reports from other units'
                ], Response::HTTP_FORBIDDEN);
            }

            return response()->json([
                'success' => true,
                'data' => $incident
            ]);

        } catch (\Exception $e) {
            Log::error("Error fetching incident report {$id}: " . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch incident report',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Update incident status by admin dengan validasi lengkap.
     */
    public function updateStatus(Request $request, $id)
    {
        DB::beginTransaction();

        try {
            $user = Auth::user();

            // Authorization check
            $isAdmin = in_array($user->role, ['Super Admin', 'Admin Holding', 'Admin Unit']);
            if (!$isAdmin) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to update incident status'
                ], Response::HTTP_FORBIDDEN);
            }

            $incident = IncidentReport::with('asset.unit')->find($id);

            if (!$incident) {
                return response()->json([
                    'success' => false,
                    'message' => 'Incident report not found'
                ], Response::HTTP_NOT_FOUND);
            }

            // Check for Admin Unit
            if ($user->role === 'Admin Unit' && $user->unit_id && $incident->asset->unit_id !== $user->unit_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to update incidents from other units'
                ], Response::HTTP_FORBIDDEN);
            }

            $request->validate([
                'status' => 'required|in:PENDING,UNDER_REVIEW,RESOLVED,CLOSED',
                'resolution_notes' => 'nullable|string|max:1000',
                'responsible_party' => 'nullable|string|max:255',
            ]);

            $oldStatus = $incident->status;
            $newStatus = $request->status;

            $updateData = [
                'status' => $newStatus,
                'reviewed_by' => $user->id,
                'review_date' => Carbon::now(),
            ];

            if ($request->has('resolution_notes')) {
                $updateData['resolution_notes'] = $request->resolution_notes;
            }

            if ($request->has('responsible_party')) {
                $updateData['responsible_party'] = $request->responsible_party;
            }

            $incident->update($updateData);

            // Update asset status based on incident type and status
            if (($newStatus === 'RESOLVED' || $newStatus === 'CLOSED') && $oldStatus !== $newStatus) {
                if ($incident->type === 'Loss') {
                    $incident->asset->update(['status' => 'Lost']);
                    
                    // Jika ada loan yang terkait, update status loan juga
                    $activeLoan = AssetLoan::where('asset_id', $incident->asset_id)
                        ->where('status', 'APPROVED')
                        ->first();
                    
                    if ($activeLoan) {
                        $activeLoan->update([
                            'status' => 'LOST',
                            'return_condition' => 'lost',
                            'actual_return_date' => Carbon::today(),
                            'return_notes' => 'Asset hilang berdasarkan laporan insiden yang disetujui: ' . ($request->resolution_notes ?? 'Tidak ada catatan tambahan')
                        ]);
                        
                        Log::info("✅ Auto-updated loan status to LOST for asset {$incident->asset_id} due to approved loss incident");
                    }
                } elseif ($incident->type === 'Damage') {
                    $incident->asset->update(['status' => 'Dalam Perbaikan']);
                    
                    Log::info("✅ Auto-updated asset status to Dalam Perbaikan for asset {$incident->asset_id} due to approved damage incident");
                }
            } elseif ($newStatus === 'PENDING' && $oldStatus !== 'PENDING') {
                // Jika status dikembalikan ke PENDING, reset asset status jika perlu
                if ($incident->type === 'Loss') {
                    // Cek apakah ada loan aktif untuk asset ini
                    $activeLoan = AssetLoan::where('asset_id', $incident->asset_id)
                        ->where('status', 'APPROVED')
                        ->first();
                    
                    if ($activeLoan) {
                        $incident->asset->update(['status' => 'Terpinjam']);
                    } else {
                        $incident->asset->update(['status' => 'Available']);
                    }
                } elseif ($incident->type === 'Damage') {
                    $incident->asset->update(['status' => 'Available']);
                }
                
                Log::info("✅ Reset asset status for incident {$incident->id} due to status change to PENDING");
            }

            DB::commit();

            Log::info("✅ Incident status updated: ID {$incident->id} from {$oldStatus} to {$newStatus} by Admin {$user->name}");

            return response()->json([
                'success' => true,
                'message' => 'Incident status updated successfully',
                'data' => $incident->fresh()->load(['asset.unit', 'reporter', 'reviewer'])
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();

            Log::error('Validation error updating incident status: ' . json_encode($e->errors()));

            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], Response::HTTP_BAD_REQUEST);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error("Error updating incident status {$id}: " . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to update incident status',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get incident reports for validation (admin only)
     * Reports with status PENDING and UNDER_REVIEW
     */
    public function getReportsForValidation(Request $request)
    {
        try {
            $user = Auth::user();

            // Authorization check
            $isAdmin = in_array($user->role, ['Super Admin', 'Admin Holding', 'Admin Unit']);
            if (!$isAdmin) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to view validation reports'
                ], Response::HTTP_FORBIDDEN);
            }

            $query = IncidentReport::with(['asset.unit', 'reporter', 'reviewer'])
                ->whereIn('status', ['PENDING', 'UNDER_REVIEW']);

            // Filter by unit for Admin Unit
            if ($user->role === 'Admin Unit' && $user->unit_id) {
                $query->whereHas('asset', function($q) use ($user) {
                    $q->where('unit_id', $user->unit_id);
                });
            }

            // Filter by type
            if ($request->has('type')) {
                $query->where('type', $request->type);
            }

            // Filter by status
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            // Search
            if ($request->has('search')) {
                $searchTerm = $request->search;
                $query->where(function($q) use ($searchTerm) {
                    $q->where('description', 'like', '%' . $searchTerm . '%')
                      ->orWhereHas('asset', function($assetQuery) use ($searchTerm) {
                          $assetQuery->where('name', 'like', '%' . $searchTerm . '%')
                                    ->orWhere('asset_tag', 'like', '%' . $searchTerm . '%');
                      })
                      ->orWhereHas('reporter', function($reporterQuery) use ($searchTerm) {
                          $reporterQuery->where('name', 'like', '%' . $searchTerm . '%');
                      });
                });
            }

            // Filter by date range
            if ($request->has('start_date')) {
                $query->where('date', '>=', $request->start_date);
            }
            if ($request->has('end_date')) {
                $query->where('date', '<=', $request->end_date);
            }

            // Sorting - prioritize by creation date and status
            $sortBy = $request->query('sort_by', 'created_at');
            $sortOrder = $request->query('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            // Pagination
            $perPage = $request->query('per_page', 15);
            $incidents = $query->paginate($perPage);

            // Get counts for statistics
            $pendingCount = (clone $query)->where('status', 'PENDING')->count();
            $underReviewCount = (clone $query)->where('status', 'UNDER_REVIEW')->count();

            return response()->json([
                'success' => true,
                'data' => $incidents,
                'statistics' => [
                    'pending_count' => $pendingCount,
                    'under_review_count' => $underReviewCount,
                    'total_validation' => $pendingCount + $underReviewCount
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching validation reports: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch validation reports',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Bulk update incident status (for admin)
     */
    public function bulkUpdateStatus(Request $request)
    {
        DB::beginTransaction();

        try {
            $user = Auth::user();

            // Authorization check
            $isAdmin = in_array($user->role, ['Super Admin', 'Admin Holding', 'Admin Unit']);
            if (!$isAdmin) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to perform bulk updates'
                ], Response::HTTP_FORBIDDEN);
            }

            $request->validate([
                'incident_ids' => 'required|array',
                'incident_ids.*' => 'exists:incident_reports,id',
                'status' => 'required|in:UNDER_REVIEW,RESOLVED,CLOSED',
                'resolution_notes' => 'nullable|string|max:1000',
            ]);

            $incidentIds = $request->incident_ids;
            $newStatus = $request->status;

            // Get incidents with their assets
            $incidents = IncidentReport::with('asset')
                ->whereIn('id', $incidentIds)
                ->whereIn('status', ['PENDING', 'UNDER_REVIEW'])
                ->get();

            // Filter incidents based on user permissions
            if ($user->role === 'Admin Unit' && $user->unit_id) {
                $incidents = $incidents->filter(function ($incident) use ($user) {
                    return $incident->asset->unit_id === $user->unit_id;
                });
            }

            if ($incidents->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No valid incidents found for bulk update'
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $processedCount = 0;
            $updatedAssets = [];

            foreach ($incidents as $incident) {
                $oldStatus = $incident->status;
                
                $updateData = [
                    'status' => $newStatus,
                    'reviewed_by' => $user->id,
                    'review_date' => Carbon::now(),
                ];

                if ($request->has('resolution_notes')) {
                    $updateData['resolution_notes'] = $request->resolution_notes;
                }

                $incident->update($updateData);

                // Update asset status if moving to RESOLVED or CLOSED
                if (($newStatus === 'RESOLVED' || $newStatus === 'CLOSED') && $oldStatus !== $newStatus) {
                    if ($incident->type === 'Loss') {
                        $incident->asset->update(['status' => 'Lost']);
                        
                        // Update related loan if exists
                        $activeLoan = AssetLoan::where('asset_id', $incident->asset_id)
                            ->where('status', 'APPROVED')
                            ->first();
                        
                        if ($activeLoan) {
                            $activeLoan->update([
                                'status' => 'LOST',
                                'return_condition' => 'lost',
                                'actual_return_date' => Carbon::today(),
                                'return_notes' => 'Asset hilang berdasarkan bulk approval of incident report'
                            ]);
                        }
                    } elseif ($incident->type === 'Damage') {
                        $incident->asset->update(['status' => 'Dalam Perbaikan']);
                    }
                    
                    $updatedAssets[] = $incident->asset_id;
                }

                $processedCount++;
            }

            DB::commit();

            Log::info("✅ Bulk incident status update completed: {$processedCount} incidents updated to {$newStatus} by Admin {$user->name}");

            return response()->json([
                'success' => true,
                'message' => "Successfully updated {$processedCount} incidents to {$newStatus}",
                'processed_count' => $processedCount,
                'updated_assets_count' => count(array_unique($updatedAssets)),
                'total_requested' => count($incidentIds)
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();

            Log::error('Validation error in bulk incident update: ' . json_encode($e->errors()));

            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], Response::HTTP_BAD_REQUEST);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Error in bulk incident update: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to perform bulk update',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get evidence photo for an incident.
     */
    public function getIncidentPhoto($id)
    {
        try {
            $user = Auth::user();

            $incident = IncidentReport::with('asset')->find($id);

            if (!$incident) {
                return response()->json([
                    'success' => false,
                    'message' => 'Incident report not found'
                ], Response::HTTP_NOT_FOUND);
            }

            if (!$incident->evidence_photo_path) {
                return response()->json([
                    'success' => false,
                    'message' => 'Evidence photo not found'
                ], Response::HTTP_NOT_FOUND);
            }

            // Authorization check
            if ($user->role === 'User' && $incident->reporter_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to view this photo'
                ], Response::HTTP_FORBIDDEN);
            }

            // Check for Admin Unit
            if ($user->role === 'Admin Unit' && $user->unit_id && $incident->asset->unit_id !== $user->unit_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to view photos from other units'
                ], Response::HTTP_FORBIDDEN);
            }

            if (!Storage::disk('public')->exists($incident->evidence_photo_path)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Photo file not found'
                ], Response::HTTP_NOT_FOUND);
            }

            return response()->file(storage_path('app/public/' . $incident->evidence_photo_path));

        } catch (\Exception $e) {
            Log::error("Error fetching incident photo {$id}: " . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch incident photo',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get incident reports for a specific asset.
     */
    public function getAssetIncidentReports($assetId)
    {
        try {
            $user = Auth::user();

            $asset = Asset::find($assetId);

            if (!$asset) {
                return response()->json([
                    'success' => false,
                    'message' => 'Asset not found'
                ], Response::HTTP_NOT_FOUND);
            }

            // Authorization check for Admin Unit
            if ($user->role === 'Admin Unit' && $user->unit_id && $asset->unit_id !== $user->unit_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to view incidents for assets from other units'
                ], Response::HTTP_FORBIDDEN);
            }

            // Authorization check for User
            if ($user->role === 'User' && $asset->unit_id !== $user->unit_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to view incidents for assets from other units'
                ], Response::HTTP_FORBIDDEN);
            }

            $incidents = IncidentReport::where('asset_id', $assetId)
                ->with(['asset.unit', 'reporter', 'reviewer'])
                ->orderBy('date', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $incidents
            ]);

        } catch (\Exception $e) {
            Log::error("Error fetching incidents for asset {$assetId}: " . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch asset incidents',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get incident statistics.
     */
    public function statistics()
    {
        try {
            $user = Auth::user();

            $query = IncidentReport::query();

            // Filter by user role
            if ($user->role === 'User') {
                $query->where('reporter_id', $user->id);
            } elseif ($user->role === 'Admin Unit' && $user->unit_id) {
                $query->whereHas('asset', function($q) use ($user) {
                    $q->where('unit_id', $user->unit_id);
                });
            }

            $totalIncidents = $query->count();
            $pendingIncidents = (clone $query)->where('status', 'PENDING')->count();
            $underReviewIncidents = (clone $query)->where('status', 'UNDER_REVIEW')->count();
            $resolvedIncidents = (clone $query)->where('status', 'RESOLVED')->count();
            $closedIncidents = (clone $query)->where('status', 'CLOSED')->count();

            $damageIncidents = (clone $query)->where('type', 'Damage')->count();
            $lossIncidents = (clone $query)->where('type', 'Loss')->count();

            // Recent incidents for validation (for admin)
            $recentValidationIncidents = [];
            if (in_array($user->role, ['Super Admin', 'Admin Holding', 'Admin Unit'])) {
                $recentValidationIncidents = (clone $query)
                    ->whereIn('status', ['PENDING', 'UNDER_REVIEW'])
                    ->with(['asset.unit', 'reporter'])
                    ->orderBy('created_at', 'desc')
                    ->limit(5)
                    ->get();
            }

            // Recent all incidents
            $recentIncidents = (clone $query)
                ->with(['asset.unit', 'reporter'])
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'total_incidents' => $totalIncidents,
                    'pending_incidents' => $pendingIncidents,
                    'under_review_incidents' => $underReviewIncidents,
                    'resolved_incidents' => $resolvedIncidents,
                    'closed_incidents' => $closedIncidents,
                    'damage_incidents' => $damageIncidents,
                    'loss_incidents' => $lossIncidents,
                    'recent_incidents' => $recentIncidents,
                    'recent_validation_incidents' => $recentValidationIncidents,
                    'validation_pending_count' => $pendingIncidents + $underReviewIncidents,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching incident statistics: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch incident statistics',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Delete an incident report (Admin only).
     */
    public function destroy($id)
    {
        DB::beginTransaction();

        try {
            $user = Auth::user();

            // Only Super Admin and Admin Holding can delete
            if (!in_array($user->role, ['Super Admin', 'Admin Holding'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to delete incident reports'
                ], Response::HTTP_FORBIDDEN);
            }

            $incident = IncidentReport::find($id);

            if (!$incident) {
                return response()->json([
                    'success' => false,
                    'message' => 'Incident report not found'
                ], Response::HTTP_NOT_FOUND);
            }

            // Delete photo file if exists
            if ($incident->evidence_photo_path && Storage::disk('public')->exists($incident->evidence_photo_path)) {
                Storage::disk('public')->delete($incident->evidence_photo_path);
            }

            $incident->delete();

            DB::commit();

            Log::info("✅ Incident report deleted: ID {$id} by Admin {$user->name}");

            return response()->json([
                'success' => true,
                'message' => 'Incident report deleted successfully'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error("Error deleting incident report {$id}: " . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete incident report',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get incident reports that need attention (for dashboard)
     */
    public function getIncidentsNeedAttention()
    {
        try {
            $user = Auth::user();

            $query = IncidentReport::with(['asset.unit', 'reporter'])
                ->whereIn('status', ['PENDING', 'UNDER_REVIEW']);

            // Filter by user role
            if ($user->role === 'Admin Unit' && $user->unit_id) {
                $query->whereHas('asset', function($q) use ($user) {
                    $q->where('unit_id', $user->unit_id);
                });
            } elseif ($user->role === 'User') {
                $query->where('reporter_id', $user->id);
            }

            $incidents = $query->orderBy('created_at', 'desc')
                ->limit(10)
                ->get();

            return response()->json([
                'success' => true,
                'data' => $incidents
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching incidents needing attention: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch incidents needing attention',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}