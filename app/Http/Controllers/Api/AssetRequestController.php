<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AssetRequest;
use App\Models\Asset;
use App\Models\AssetLoan;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class AssetRequestController extends Controller
{
    /**
     * Display a listing of asset requests.
     * - Admin Unit sees their own unit's requests
     * - Admin Holding & Super Admin see all requests
     */
    public function index(Request $request)
    {
        try {
            $user = Auth::user();

            $query = AssetRequest::with([
                'requesterUnit',
                'requester',
                'asset.unit',
                'reviewer'
            ]);

            // Filter by role
            if ($user->role === 'Admin Unit' && $user->unit_id) {
                $query->where('requester_unit_id', $user->unit_id);
            }

            // Filter by status if provided
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            $requests = $query->orderBy('created_at', 'desc')->get();

            return response()->json([
                'success' => true,
                'data' => $requests
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching asset requests: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch asset requests'
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Store a new asset request.
     * Only Admin Unit can create requests for assets from other units
     */
    public function store(Request $request)
    {
        DB::beginTransaction();

        try {
            $request->validate([
                'asset_id' => 'required|exists:assets,id',
                'needed_date' => 'required|date|after_or_equal:today',
                'expected_return_date' => 'required|date|after:needed_date',
                'start_time' => 'required|date_format:H:i',
                'end_time' => 'required|date_format:H:i|after:start_time',
                'purpose' => 'required|string|max:500',
                'reason' => 'required|string|max:1000',
            ]);

            $user = Auth::user();
            $asset = Asset::with('unit')->findOrFail($request->asset_id);

            // Validate: Admin Unit can only request assets from other units
            if ($user->role === 'Admin Unit') {
                if (!$user->unit_id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Unit tidak ditemukan untuk user ini'
                    ], Response::HTTP_FORBIDDEN);
                }

                if ($asset->unit_id === $user->unit_id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Tidak dapat membuat request untuk asset di unit Anda sendiri. Silakan gunakan fitur peminjaman biasa.'
                    ], Response::HTTP_UNPROCESSABLE_ENTITY);
                }
            }

            // Check if asset is available
            if (!in_array($asset->status, ['Available', 'Tersedia'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Asset tidak tersedia untuk dipinjam. Status saat ini: ' . $asset->status
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            // Check if there's already a pending request for this asset from this unit
            $existingRequest = AssetRequest::where('asset_id', $asset->id)
                ->where('requester_unit_id', $user->unit_id)
                ->where('status', 'PENDING')
                ->exists();

            if ($existingRequest) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unit Anda sudah memiliki request pending untuk asset ini'
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $assetRequest = AssetRequest::create([
                'requester_unit_id' => $user->unit_id,
                'requester_id' => $user->id,
                'asset_id' => $asset->id,
                'request_date' => Carbon::today(),
                'needed_date' => $request->needed_date,
                'expected_return_date' => $request->expected_return_date,
                'start_time' => $request->start_time,
                'end_time' => $request->end_time,
                'purpose' => $request->purpose,
                'reason' => $request->reason,
                'status' => 'PENDING',
            ]);

            DB::commit();

            Log::info("✅ Asset request created: Asset {$asset->name} requested by Unit {$user->unit->name}");

            return response()->json([
                'success' => true,
                'message' => 'Request peminjaman asset berhasil diajukan',
                'data' => $assetRequest->load(['requesterUnit', 'requester', 'asset.unit'])
            ], Response::HTTP_CREATED);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], Response::HTTP_BAD_REQUEST);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Error creating asset request: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to create asset request: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Approve asset request and create asset loan
     * Only Super Admin and Admin Holding can approve
     */
    public function approve(Request $request, $id)
    {
        DB::beginTransaction();

        try {
            $request->validate([
                'approval_notes' => 'nullable|string|max:500',
            ]);

            $user = Auth::user();

            // Authorization check
            if (!in_array($user->role, ['Super Admin', 'Admin Holding'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to approve asset requests'
                ], Response::HTTP_FORBIDDEN);
            }

            $assetRequest = AssetRequest::with(['asset', 'requester', 'requesterUnit'])
                ->findOrFail($id);

            if ($assetRequest->status !== 'PENDING') {
                return response()->json([
                    'success' => false,
                    'message' => 'Request sudah diproses sebelumnya'
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            // Check if asset is still available
            if (!in_array($assetRequest->asset->status, ['Available', 'Tersedia'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Asset tidak lagi tersedia'
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            // Update request status
            $assetRequest->update([
                'status' => 'APPROVED',
                'reviewed_by' => $user->id,
                'review_date' => Carbon::now(),
                'approval_notes' => $request->approval_notes,
            ]);

            // Create asset loan automatically
            $loan = AssetLoan::create([
                'asset_id' => $assetRequest->asset_id,
                'borrower_id' => $assetRequest->requester_id,
                'request_date' => $assetRequest->request_date,
                'loan_date' => $assetRequest->needed_date,
                'start_time' => $assetRequest->start_time,
                'end_time' => $assetRequest->end_time,
                'expected_return_date' => $assetRequest->expected_return_date,
                'purpose' => $assetRequest->purpose,
                'status' => 'APPROVED',
                'approved_by' => $user->id,
                'approval_date' => Carbon::now(),
            ]);

            // Update asset status to Terpinjam
            $assetRequest->asset->update(['status' => 'Terpinjam']);

            DB::commit();

            Log::info("✅ Asset request approved: ID {$id} by {$user->name}, Loan created: {$loan->id}");

            return response()->json([
                'success' => true,
                'message' => 'Request berhasil disetujui dan peminjaman telah dibuat',
                'data' => [
                    'request' => $assetRequest->fresh()->load(['reviewer', 'requester', 'asset']),
                    'loan' => $loan->load(['asset', 'borrower', 'approver'])
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Error approving asset request: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to approve request: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Reject asset request
     * Only Super Admin and Admin Holding can reject
     */
    public function reject(Request $request, $id)
    {
        DB::beginTransaction();

        try {
            $request->validate([
                'rejection_reason' => 'required|string|max:500',
            ]);

            $user = Auth::user();

            // Authorization check
            if (!in_array($user->role, ['Super Admin', 'Admin Holding'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to reject asset requests'
                ], Response::HTTP_FORBIDDEN);
            }

            $assetRequest = AssetRequest::with(['asset', 'requester', 'requesterUnit'])
                ->findOrFail($id);

            if ($assetRequest->status !== 'PENDING') {
                return response()->json([
                    'success' => false,
                    'message' => 'Request sudah diproses sebelumnya'
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            // Update request status
            $assetRequest->update([
                'status' => 'REJECTED',
                'reviewed_by' => $user->id,
                'review_date' => Carbon::now(),
                'rejection_reason' => $request->rejection_reason,
            ]);

            DB::commit();

            Log::info("✅ Asset request rejected: ID {$id} by {$user->name}");

            return response()->json([
                'success' => true,
                'message' => 'Request berhasil ditolak',
                'data' => $assetRequest->fresh()->load(['reviewer', 'requester', 'asset'])
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Error rejecting asset request: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to reject request: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get a single asset request
     */
    public function show($id)
    {
        try {
            $user = Auth::user();

            $assetRequest = AssetRequest::with([
                'requesterUnit',
                'requester',
                'asset.unit',
                'reviewer'
            ])->findOrFail($id);

            // Authorization: Admin Unit can only see their own unit's requests
            if ($user->role === 'Admin Unit' && $user->unit_id) {
                if ($assetRequest->requester_unit_id !== $user->unit_id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Unauthorized to view this request'
                    ], Response::HTTP_FORBIDDEN);
                }
            }

            return response()->json([
                'success' => true,
                'data' => $assetRequest
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching asset request: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch asset request'
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
