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
                'asset_name' => 'required|string|max:255',
                'needed_date' => 'required|date|after_or_equal:today',
                'expected_return_date' => 'required|date|after:needed_date',
                'start_time' => 'required|date_format:H:i',
                'end_time' => 'required|date_format:H:i|after:start_time',
                'purpose' => 'required|string|max:500',
                'reason' => 'required|string|max:1000',
            ]);

            $user = Auth::user();

            // Validate: Admin Unit must have a unit
            if ($user->role === 'Admin Unit') {
                if (!$user->unit_id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Unit tidak ditemukan untuk user ini'
                    ], Response::HTTP_FORBIDDEN);
                }
            }

            $assetRequest = AssetRequest::create([
                'requester_unit_id' => $user->unit_id,
                'requester_id' => $user->id,
                'asset_name' => $request->asset_name,
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

            Log::info("✅ Asset request created: Asset '{$request->asset_name}' requested by Unit {$user->unit->name}");

            return response()->json([
                'success' => true,
                'message' => 'Request peminjaman asset berhasil diajukan',
                'data' => $assetRequest->load(['requesterUnit', 'requester', 'reviewer'])
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
     * Approve asset request
     * Only Super Admin and Admin Holding can approve
     * NOTE: Since we only store asset_name (manual input),
     * we don't create asset loan automatically anymore
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

            $assetRequest = AssetRequest::with(['requester', 'requesterUnit'])
                ->findOrFail($id);

            if ($assetRequest->status !== 'PENDING') {
                return response()->json([
                    'success' => false,
                    'message' => 'Request sudah diproses sebelumnya'
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            // Update request status
            $assetRequest->update([
                'status' => 'APPROVED',
                'reviewed_by' => $user->id,
                'review_date' => Carbon::now(),
                'approval_notes' => $request->approval_notes,
            ]);

            DB::commit();

            Log::info("✅ Asset request approved: ID {$id} (Asset: {$assetRequest->asset_name}) by {$user->name}");

            return response()->json([
                'success' => true,
                'message' => 'Request berhasil disetujui',
                'data' => $assetRequest->fresh()->load(['reviewer', 'requester', 'requesterUnit'])
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

            $assetRequest = AssetRequest::with(['requester', 'requesterUnit'])
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
                'data' => $assetRequest->fresh()->load(['reviewer', 'requester', 'requesterUnit'])
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
