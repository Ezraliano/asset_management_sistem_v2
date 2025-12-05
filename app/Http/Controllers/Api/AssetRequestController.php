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
                'reviewer',
                'asset',
                'asset.unit'
            ]);

            // Filter by role
            if ($user->role === 'unit' && $user->unit_name) {
                $query->where('requester_unit_name', $user->unit_name);
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
            if ($user->role === 'unit') {
                if (!$user->unit_name) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Unit tidak ditemukan untuk user ini'
                    ], Response::HTTP_FORBIDDEN);
                }
            }

            $assetRequest = AssetRequest::create([
                'requester_unit_name' => $user->unit_name,
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
                'asset_id' => 'nullable|exists:assets,id',
                'loan_photo' => 'nullable|image|mimes:jpeg,png,jpg|max:5120', // 5MB max
            ]);

            $user = Auth::user();

            // Authorization check
            if (!in_array($user->role, ['super-admin', 'admin'])) {
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

            // Handle photo upload
            $photoPath = null;
            if ($request->hasFile('loan_photo')) {
                $file = $request->file('loan_photo');
                $filename = 'loan_' . time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
                $photoPath = $file->storeAs('asset_loans', $filename, 'public');
            }

            // Update request status
            $assetRequest->update([
                'status' => 'APPROVED',
                'reviewed_by' => $user->id,
                'review_date' => Carbon::now(),
                'approval_notes' => $request->approval_notes,
                'asset_id' => $request->asset_id,
                'loan_photo_path' => $photoPath,
                'loan_status' => 'ACTIVE',
                'actual_loan_date' => Carbon::now(),
            ]);

            // Update asset status to 'Terpinjam' if asset is selected
            if ($request->asset_id) {
                $asset = Asset::find($request->asset_id);
                if ($asset) {
                    $asset->update(['status' => 'Terpinjam']);
                    Log::info("Asset {$asset->asset_tag} status updated to Terpinjam");
                }
            }

            DB::commit();

            Log::info("✅ Asset request approved: ID {$id} (Asset: {$assetRequest->asset_name}) by {$user->name}");

            return response()->json([
                'success' => true,
                'message' => 'Request berhasil disetujui',
                'data' => $assetRequest->fresh()->load(['reviewer', 'requester', 'requesterUnit', 'asset'])
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], Response::HTTP_BAD_REQUEST);

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
            if (!in_array($user->role, ['super-admin', 'admin'])) {
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
                'reviewer',
                'asset',
                'asset.unit'
            ])->findOrFail($id);

            // Authorization: Admin Unit can only see their own unit's requests
            if ($user->role === 'unit' && $user->unit_name) {
                if ($assetRequest->requester_unit_name !== $user->unit_name) {
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

    /**
     * Return asset back to holding
     * Only the requester unit (Admin Unit) can submit return
     */
    public function returnAsset(Request $request, $id)
    {
        DB::beginTransaction();

        try {
            $request->validate([
                'return_notes' => 'nullable|string|max:1000',
                'return_proof_photo' => 'nullable|image|mimes:jpeg,png,jpg|max:5120', // 5MB max
            ]);

            $user = Auth::user();

            $assetRequest = AssetRequest::with(['requesterUnit', 'requester'])
                ->findOrFail($id);

            // Authorization: Only Admin Unit from requester unit can return
            if ($user->role === 'unit') {
                if (!$user->unit_name || $assetRequest->requester_unit_name !== $user->unit_name) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Unauthorized to return this asset'
                    ], Response::HTTP_FORBIDDEN);
                }
            } else if (!in_array($user->role, ['super-admin', 'admin'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to return this asset'
                ], Response::HTTP_FORBIDDEN);
            }

            // Validate loan status
            if ($assetRequest->loan_status !== 'ACTIVE') {
                return response()->json([
                    'success' => false,
                    'message' => 'Asset tidak dalam status peminjaman aktif'
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            // Handle photo upload
            $photoPath = null;
            if ($request->hasFile('return_proof_photo')) {
                $file = $request->file('return_proof_photo');
                $filename = 'return_proof_' . time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
                $photoPath = $file->storeAs('asset_returns', $filename, 'public');
            }

            // Update to PENDING_RETURN status
            $assetRequest->update([
                'loan_status' => 'PENDING_RETURN',
                'return_notes' => $request->return_notes,
                'return_proof_photo_path' => $photoPath,
            ]);

            DB::commit();

            Log::info("✅ Asset return submitted: Request ID {$id} by {$user->name}");

            return response()->json([
                'success' => true,
                'message' => 'Pengembalian asset berhasil diajukan, menunggu konfirmasi dari holding',
                'data' => $assetRequest->fresh()->load(['requesterUnit', 'requester', 'reviewer'])
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], Response::HTTP_BAD_REQUEST);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Error submitting asset return: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to submit return: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Confirm asset return by Holding
     * Only Super Admin and Admin Holding can confirm
     */
    public function confirmReturn(Request $request, $id)
    {
        DB::beginTransaction();

        try {
            $request->validate([
                'confirmation_notes' => 'nullable|string|max:500',
            ]);

            $user = Auth::user();

            // Authorization check
            if (!in_array($user->role, ['super-admin', 'admin'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to confirm asset return'
                ], Response::HTTP_FORBIDDEN);
            }

            $assetRequest = AssetRequest::with(['requesterUnit', 'requester'])
                ->findOrFail($id);

            if ($assetRequest->loan_status !== 'PENDING_RETURN') {
                return response()->json([
                    'success' => false,
                    'message' => 'Request tidak dalam status menunggu konfirmasi pengembalian'
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            // Confirm return
            $assetRequest->update([
                'loan_status' => 'RETURNED',
                'actual_return_date' => Carbon::now(),
                'return_confirmed_by' => $user->id,
                'return_confirmation_date' => Carbon::now(),
            ]);

            // ✅ FIX: Update asset status back to 'Available' when return is confirmed
            if ($assetRequest->asset_id) {
                $asset = Asset::find($assetRequest->asset_id);
                if ($asset) {
                    $asset->update(['status' => 'Available']);
                    Log::info("✅ Asset {$asset->asset_tag} status updated to Available (returned)");
                }
            }

            DB::commit();

            Log::info("✅ Asset return confirmed: Request ID {$id} by {$user->name}");

            return response()->json([
                'success' => true,
                'message' => 'Pengembalian asset berhasil dikonfirmasi. Asset sekarang kembali tersedia.',
                'data' => $assetRequest->fresh()->load(['requesterUnit', 'requester', 'reviewer', 'returnConfirmer', 'asset'])
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Error confirming asset return: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to confirm return: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Reject asset return by Holding
     * Only Super Admin and Admin Holding can reject
     */
    public function rejectReturn(Request $request, $id)
    {
        DB::beginTransaction();

        try {
            $request->validate([
                'return_rejection_reason' => 'required|string|max:500',
            ]);

            $user = Auth::user();

            // Authorization check
            if (!in_array($user->role, ['super-admin', 'admin'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to reject asset return'
                ], Response::HTTP_FORBIDDEN);
            }

            $assetRequest = AssetRequest::with(['requesterUnit', 'requester'])
                ->findOrFail($id);

            if ($assetRequest->loan_status !== 'PENDING_RETURN') {
                return response()->json([
                    'success' => false,
                    'message' => 'Request tidak dalam status menunggu konfirmasi pengembalian'
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            // Reject return - revert to ACTIVE status
            $assetRequest->update([
                'loan_status' => 'ACTIVE',
                'return_rejection_reason' => $request->return_rejection_reason,
                'return_notes' => null,
                'return_proof_photo_path' => null,
            ]);

            DB::commit();

            Log::info("⚠️ Asset return rejected: Request ID {$id} by {$user->name}");

            return response()->json([
                'success' => true,
                'message' => 'Pengembalian asset ditolak, unit harus mengajukan pengembalian ulang',
                'data' => $assetRequest->fresh()->load(['requesterUnit', 'requester', 'reviewer'])
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Error rejecting asset return: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to reject return: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get pending returns for holding to review
     * Only Super Admin and Admin Holding can access
     */
    public function getPendingReturns(Request $request)
    {
        try {
            $user = Auth::user();

            // Authorization check
            if (!in_array($user->role, ['super-admin', 'admin'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to view pending returns'
                ], Response::HTTP_FORBIDDEN);
            }

            $pendingReturns = AssetRequest::with([
                'requesterUnit',
                'requester',
                'reviewer'
            ])
            ->where('loan_status', 'PENDING_RETURN')
            ->orderBy('updated_at', 'desc')
            ->get();

            return response()->json([
                'success' => true,
                'data' => $pendingReturns
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching pending returns: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch pending returns'
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get active loans (requests that are currently borrowed)
     */
    public function getActiveLoans(Request $request)
    {
        try {
            $user = Auth::user();

            $query = AssetRequest::with([
                'requesterUnit',
                'requester',
                'reviewer'
            ])
            ->where('loan_status', 'ACTIVE');

            // Filter by role
            if ($user->role === 'unit' && $user->unit_name) {
                $query->where('requester_unit_name', $user->unit_name);
            }

            $activeLoans = $query->orderBy('actual_loan_date', 'desc')->get();

            return response()->json([
                'success' => true,
                'data' => $activeLoans
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching active loans: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch active loans'
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get available assets for lending
     * Only Super Admin and Admin Holding can access
     */
    public function getAvailableAssets(Request $request)
    {
        try {
            $user = Auth::user();

            // Authorization check
            if (!in_array($user->role, ['super-admin', 'admin'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to view available assets'
                ], Response::HTTP_FORBIDDEN);
            }

            // Get assets that are available (status = Available)
            $assets = Asset::with(['unit'])
                ->where('status', 'Available')
                ->orderBy('name', 'asc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $assets
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching available assets: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch available assets'
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
