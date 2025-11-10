<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\AssetLoan;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class AssetLoanController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        try {
            // Eager load relationships for efficiency
            $loans = AssetLoan::with(['asset.unit', 'borrower', 'approver']);

            // Check user role and filter accordingly
            $user = Auth::user();
            if ($user && $user->role === 'User') {
                // Regular users can only see their own loans
                $loans->where('borrower_id', $user->id);
            } elseif ($user && $user->role === 'Admin Unit' && $user->unit_id) {
                // Admin Unit can see loans for assets in their unit OR loans they borrowed themselves
                $loans->where(function ($query) use ($user) {
                    $query->whereHas('asset', function($q) use ($user) {
                        $q->where('unit_id', $user->unit_id);
                    })->orWhere('borrower_id', $user->id);
                });
            }
            // Super Admin and Admin Holding can see all loans (no additional filter needed)

            // Allow filtering by status - TAMBAHKAN STATUS LOST
            if ($request->has('status')) {
                $loans->where('status', $request->status);
            }

            // Filter by date range
            if ($request->has('start_date')) {
                $loans->where('request_date', '>=', $request->start_date);
            }
            if ($request->has('end_date')) {
                $loans->where('request_date', '<=', $request->end_date);
            }

            // Search by asset name or borrower name
            if ($request->has('search')) {
                $searchTerm = $request->search;
                $loans->where(function($query) use ($searchTerm) {
                    $query->whereHas('asset', function($q) use ($searchTerm) {
                        $q->where('name', 'like', '%' . $searchTerm . '%')
                          ->orWhere('asset_tag', 'like', '%' . $searchTerm . '%');
                    })->orWhereHas('borrower', function($q) use ($searchTerm) {
                        $q->where('name', 'like', '%' . $searchTerm . '%');
                    });
                });
            }

            // Sorting
            $sortBy = $request->query('sort_by', 'created_at');
            $sortOrder = $request->query('sort_order', 'desc');
            $loans->orderBy($sortBy, $sortOrder);

            // Pagination
            $perPage = $request->query('per_page', 15);
            $loans = $loans->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $loans,
                'filters' => [
                    'status' => $request->status,
                    'search' => $request->search,
                    'start_date' => $request->start_date,
                    'end_date' => $request->end_date
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching asset loans: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch asset loans',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Store a newly created resource in storage.
     * This is for user to request a loan.
     */
    public function store(Request $request)
    {
        DB::beginTransaction();
        
        try {
            $request->validate([
                'asset_id' => 'required|exists:assets,id',
                'loan_date' => 'required|date',
                'start_time' => 'required|date_format:H:i',
                'end_time' => 'required|date_format:H:i|after:start_time',
                'expected_return_date' => 'required|date|after_or_equal:today',
                'purpose' => 'required|string|max:500',
            ]);

            $user = Auth::user();
            $asset = Asset::with('unit')->findOrFail($request->asset_id);

            // ✅ VALIDASI: User hanya bisa pinjam asset di unit mereka sendiri
            if ($user->role === 'User' && $asset->unit_id !== $user->unit_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda hanya dapat meminjam asset di unit Anda sendiri'
                ], Response::HTTP_FORBIDDEN);
            }

            // Check if the asset is available for loan
            if ($asset->status !== 'Available') {
                return response()->json([
                    'success' => false,
                    'message' => 'Asset is not available for loan. Current status: ' . $asset->status
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            // ✅ VALIDASI: Asset yang sudah terjual tidak bisa dipinjam
            if ($asset->status === 'Terjual') {
                return response()->json([
                    'success' => false,
                    'message' => 'Asset sudah terjual dan tidak dapat dipinjam'
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            // Check if user has pending loan for the same asset
            $existingPendingLoan = AssetLoan::where('asset_id', $asset->id)
                ->where('borrower_id', $user->id)
                ->where('status', 'PENDING')
                ->exists();

            if ($existingPendingLoan) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda sudah memiliki permintaan peminjaman yang pending untuk asset ini'
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $loan = AssetLoan::create([
                'asset_id' => $asset->id,
                'borrower_id' => $user->id,
                'request_date' => Carbon::today(),
                'loan_date' => $request->loan_date,
                'start_time' => $request->start_time,
                'end_time' => $request->end_time,
                'expected_return_date' => $request->expected_return_date,
                'purpose' => $request->purpose,
                'status' => 'PENDING', // Initial status
            ]);

            DB::commit();

            Log::info("✅ Loan request created successfully: Asset {$asset->name} by User {$user->name}");

            return response()->json([
                'success' => true,
                'message' => 'Loan request submitted successfully',
                'data' => $loan->load(['asset.unit', 'borrower'])
            ], Response::HTTP_CREATED);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            
            Log::error('Validation error creating loan: ' . json_encode($e->errors()));
            
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], Response::HTTP_BAD_REQUEST);

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('Error creating loan: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to create loan request',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(AssetLoan $assetLoan)
    {
        try {
            $user = Auth::user();

            // Check if user can view this loan
            if ($user->role === 'User' && $assetLoan->borrower_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to view this loan'
                ], Response::HTTP_FORBIDDEN);
            }

            // Check for Admin Unit - hanya bisa lihat loan di unit mereka
            if ($user->role === 'Admin Unit' && $user->unit_id && $assetLoan->asset->unit_id !== $user->unit_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to view loans from other units'
                ], Response::HTTP_FORBIDDEN);
            }

            // Eager load relationships
            $assetLoan->load(['asset.unit', 'borrower', 'approver']);

            return response()->json([
                'success' => true,
                'data' => $assetLoan
            ]);

        } catch (\Exception $e) {
            Log::error("Error fetching loan {$assetLoan->id}: " . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch loan details',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Approve a loan request with photo upload and approval date.
     * This is for admin/unit to approve.
     */
    public function approve(Request $request, AssetLoan $assetLoan)
    {
        DB::beginTransaction();
        
        try {
            $user = Auth::user();

            // Load asset with unit relationship
            $assetLoan->load('asset.unit');

            // ✅ Middleware sudah handle authorization, langsung proses approval
            if ($assetLoan->status !== 'PENDING') {
                return response()->json([
                    'success' => false,
                    'message' => 'This loan is not pending approval.'
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
            
            $request->validate([
                'approval_date' => 'required|date|before_or_equal:today',
                'loan_proof_photo' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
            ]);

            // Handle photo upload
            if ($request->hasFile('loan_proof_photo')) {
                $photoPath = $request->file('loan_proof_photo')->store('loan-proofs', 'public');
            } else {
                throw new \Exception('Proof photo is required');
            }

            // Update the loan status
            $assetLoan->update([
                'status' => 'APPROVED',
                'approved_by' => $user->id,
                'approval_date' => $request->approval_date,
                'loan_date' => Carbon::today(),
                'loan_proof_photo_path' => $photoPath,
                // Clear rejection reason if it was previously set
                'rejection_reason' => null,
            ]);

            // Update the asset status
            $assetLoan->asset->update(['status' => 'Terpinjam']);

            DB::commit();

            Log::info("✅ Loan approved successfully: Loan ID {$assetLoan->id} by User {$user->name}");

            return response()->json([
                'success' => true,
                'message' => 'Loan approved successfully',
                'data' => $assetLoan->fresh()->load(['asset.unit', 'borrower', 'approver'])
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            
            Log::error('Validation error approving loan: ' . json_encode($e->errors()));
            
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], Response::HTTP_BAD_REQUEST);

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error("Error approving loan {$assetLoan->id}: " . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'An error occurred during approval.', 
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Reject a loan request with rejection reason.
     * This is for admin/unit to reject.
     */
    public function reject(Request $request, AssetLoan $assetLoan)
    {
        DB::beginTransaction();
        
        try {
            $user = Auth::user();

            // Load asset with unit relationship
            $assetLoan->load('asset.unit');

            // ✅ Middleware sudah handle authorization, langsung proses rejection
            if ($assetLoan->status !== 'PENDING') {
                return response()->json([
                    'success' => false,
                    'message' => 'This loan is not pending approval.'
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $request->validate([
                'approval_date' => 'required|date|before_or_equal:today',
                'rejection_reason' => 'required|string|min:10|max:500',
            ]);

            // Update the loan status with rejection reason
            $assetLoan->update([
                'status' => 'REJECTED',
                'approved_by' => $user->id,
                'approval_date' => $request->approval_date,
                'rejection_reason' => $request->rejection_reason,
                // Clear loan proof photo if it was previously set
                'loan_proof_photo_path' => null,
                'loan_date' => null,
            ]);

            // Asset status remains 'Available' since it wasn't loaned out
            // No need to update asset status for rejected loans

            DB::commit();

            Log::info("✅ Loan rejected successfully: Loan ID {$assetLoan->id} by User {$user->name}");

            return response()->json([
                'success' => true,
                'message' => 'Loan rejected successfully',
                'data' => $assetLoan->fresh()->load(['asset.unit', 'borrower', 'approver'])
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            
            Log::error('Validation error rejecting loan: ' . json_encode($e->errors()));
            
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], Response::HTTP_BAD_REQUEST);

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error("Error rejecting loan {$assetLoan->id}: " . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'An error occurred during rejection.', 
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Submit return request by user (status becomes PENDING_RETURN).
     * This is for users to submit their asset return with proof photo.
     */
    public function returnAsset(Request $request, AssetLoan $assetLoan)
    {
        DB::beginTransaction();

        try {
            $user = Auth::user();

            // Load asset with unit relationship
            $assetLoan->load('asset.unit');

            // Authorization - Only the borrower can submit return
            if ($assetLoan->borrower_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to return this asset.'
                ], Response::HTTP_FORBIDDEN);
            }

            if ($assetLoan->status !== 'APPROVED') {
                return response()->json([
                    'success' => false,
                    'message' => 'This loan is not currently active.'
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $request->validate([
                'return_date' => 'required|date|before_or_equal:today',
                'notes' => 'nullable|string|max:1000',
                'return_proof_photo' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
            ]);

            // Handle photo upload
            $photoPath = null;
            if ($request->hasFile('return_proof_photo')) {
                $photoPath = $request->file('return_proof_photo')->store('return-proofs', 'public');
            } else {
                throw new \Exception('Return proof photo is required');
            }

            // Update the loan status to PENDING_RETURN
            // Kondisi akan dinilai oleh admin saat approve
            $assetLoan->update([
                'status' => 'PENDING_RETURN',
                'actual_return_date' => $request->return_date,
                'return_notes' => $request->notes,
                'return_condition' => null, // Akan diisi oleh admin saat validasi
                'return_proof_photo_path' => $photoPath,
            ]);

            // Asset status remains 'Terpinjam' until admin approves the return

            DB::commit();

            Log::info("✅ Return request submitted: Loan ID {$assetLoan->id} by User {$user->name}");

            return response()->json([
                'success' => true,
                'message' => 'Return request submitted successfully. Waiting for admin approval.',
                'data' => $assetLoan->fresh()->load(['asset.unit', 'borrower', 'approver'])
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();

            Log::error('Validation error submitting return: ' . json_encode($e->errors()));

            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], Response::HTTP_BAD_REQUEST);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error("Error submitting return for loan {$assetLoan->id}: " . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'An error occurred during return submission.',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Report asset as lost by user
     */
    public function reportLostAsset(Request $request, AssetLoan $assetLoan)
    {
        DB::beginTransaction();
        
        try {
            $user = Auth::user();

            // Authorization - Only the borrower can report loss
            if ($assetLoan->borrower_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to report loss for this asset.'
                ], Response::HTTP_FORBIDDEN);
            }

            if ($assetLoan->status !== 'APPROVED') {
                return response()->json([
                    'success' => false,
                    'message' => 'This loan is not currently active.'
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $request->validate([
                'loss_date' => 'required|date|before_or_equal:today',
                'loss_description' => 'required|string|min:10|max:1000',
                'loss_proof_photo' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
            ]);

            // Handle photo upload
            $photoPath = null;
            if ($request->hasFile('loss_proof_photo')) {
                $photoPath = $request->file('loss_proof_photo')->store('loss-proofs', 'public');
            } else {
                throw new \Exception('Loss proof photo is required');
            }

            // Update the loan status to LOST
            $assetLoan->update([
                'status' => 'LOST',
                'actual_return_date' => $request->loss_date,
                'return_notes' => $request->loss_description,
                'return_condition' => 'lost',
                'return_proof_photo_path' => $photoPath,
            ]);

            // Update asset status to Lost
            $assetLoan->asset->update(['status' => 'Lost']);

            DB::commit();

            Log::info("✅ Asset reported as lost: Loan ID {$assetLoan->id} by User {$user->name}");

            return response()->json([
                'success' => true,
                'message' => 'Asset loss reported successfully.',
                'data' => $assetLoan->fresh()->load(['asset.unit', 'borrower', 'approver'])
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            
            Log::error('Validation error reporting loss: ' . json_encode($e->errors()));
            
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], Response::HTTP_BAD_REQUEST);

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error("Error reporting loss for loan {$assetLoan->id}: " . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'An error occurred during loss reporting.',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Approve return request by admin.
     * This updates the loan status to RETURNED and updates asset status.
     */
    public function approveReturn(Request $request, AssetLoan $assetLoan)
    {
        DB::beginTransaction();

        try {
            $user = Auth::user();

            // Load asset with unit relationship and borrower
            $assetLoan->load('asset.unit', 'borrower');

            // Authorization check
            $isAdmin = in_array($user->role, ['Super Admin', 'Admin Holding', 'Admin Unit']);
            if (!$isAdmin) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to approve returns.'
                ], Response::HTTP_FORBIDDEN);
            }

            // ✅ VALIDASI UNTUK ADMIN UNIT
            // Admin Unit HANYA BOLEH approve return untuk:
            // 1. Asset ada di unit mereka (asset milik unit mereka)
            // 2. DAN borrower juga dari unit mereka (peminjaman internal dalam unit yang sama)
            // Jika salah satu tidak terpenuhi, hanya Super Admin & Admin Holding yang boleh
            if ($user->role === 'Admin Unit' && $user->unit_id) {
                $assetBelongsToUserUnit = $assetLoan->asset->unit_id === $user->unit_id;
                $borrowerFromSameUnit = $assetLoan->borrower &&
                                        $assetLoan->borrower->unit_id === $user->unit_id;

                // Jika asset bukan milik unit admin, atau borrower dari unit lain, TOLAK
                if (!$assetBelongsToUserUnit || !$borrowerFromSameUnit) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Validasi pengembalian untuk peminjaman antar unit hanya dapat dilakukan oleh Super Admin atau Admin Holding.'
                    ], Response::HTTP_FORBIDDEN);
                }
            }

            if ($assetLoan->status !== 'PENDING_RETURN') {
                return response()->json([
                    'success' => false,
                    'message' => 'This loan is not pending return approval.'
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $request->validate([
                'verification_date' => 'required|date|before_or_equal:today',
                'condition' => 'required|in:good,damaged,lost',
                'assessment_notes' => 'nullable|string|max:1000',
            ]);

            // Determine asset status based on admin's condition assessment
            $assetStatus = 'Available';
            if ($request->condition === 'damaged') {
                $assetStatus = 'Dalam Perbaikan';
            } elseif ($request->condition === 'lost') {
                $assetStatus = 'Lost';
            }

            // Update the loan status to RETURNED
            $assetLoan->update([
                'status' => 'RETURNED',
                'return_condition' => $request->condition, // Admin menilai kondisi
                'return_verified_by' => $user->id,
                'return_verification_date' => $request->verification_date,
                'return_rejection_reason' => null,
                // Gabungkan notes dari user dengan assessment dari admin
                'return_notes' => $assetLoan->return_notes .
                    ($request->assessment_notes ? "\n[ADMIN ASSESSMENT] " . $request->assessment_notes : ''),
            ]);

            // Update the asset status based on return condition
            $assetLoan->asset->update(['status' => $assetStatus]);

            DB::commit();

            Log::info("✅ Return approved: Loan ID {$assetLoan->id} by Admin {$user->name}, Condition: {$request->condition}, Asset status: {$assetStatus}");

            return response()->json([
                'success' => true,
                'message' => 'Return approved successfully. Asset status updated.',
                'data' => $assetLoan->fresh()->load(['asset.unit', 'borrower', 'approver', 'returnVerifier'])
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();

            Log::error('Validation error approving return: ' . json_encode($e->errors()));

            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], Response::HTTP_BAD_REQUEST);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error("Error approving return for loan {$assetLoan->id}: " . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'An error occurred during return approval.',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Reject return request by admin.
     * This reverts the loan status back to APPROVED so user can re-submit.
     */
    public function rejectReturn(Request $request, AssetLoan $assetLoan)
    {
        DB::beginTransaction();

        try {
            $user = Auth::user();

            // Load asset with unit relationship and borrower
            $assetLoan->load('asset.unit', 'borrower');

            // Authorization check
            $isAdmin = in_array($user->role, ['Super Admin', 'Admin Holding', 'Admin Unit']);
            if (!$isAdmin) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to reject returns.'
                ], Response::HTTP_FORBIDDEN);
            }

            // ✅ VALIDASI UNTUK ADMIN UNIT
            // Admin Unit HANYA BOLEH reject return untuk:
            // 1. Asset ada di unit mereka (asset milik unit mereka)
            // 2. DAN borrower juga dari unit mereka (peminjaman internal dalam unit yang sama)
            // Jika salah satu tidak terpenuhi, hanya Super Admin & Admin Holding yang boleh
            if ($user->role === 'Admin Unit' && $user->unit_id) {
                $assetBelongsToUserUnit = $assetLoan->asset->unit_id === $user->unit_id;
                $borrowerFromSameUnit = $assetLoan->borrower &&
                                        $assetLoan->borrower->unit_id === $user->unit_id;

                // Jika asset bukan milik unit admin, atau borrower dari unit lain, TOLAK
                if (!$assetBelongsToUserUnit || !$borrowerFromSameUnit) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Validasi pengembalian untuk peminjaman antar unit hanya dapat dilakukan oleh Super Admin atau Admin Holding.'
                    ], Response::HTTP_FORBIDDEN);
                }
            }

            if ($assetLoan->status !== 'PENDING_RETURN') {
                return response()->json([
                    'success' => false,
                    'message' => 'This loan is not pending return approval.'
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $request->validate([
                'verification_date' => 'required|date|before_or_equal:today',
                'rejection_reason' => 'required|string|min:10|max:500',
            ]);

            // Revert the loan status back to APPROVED
            $assetLoan->update([
                'status' => 'APPROVED',
                'return_verified_by' => $user->id,
                'return_verification_date' => $request->verification_date,
                'return_rejection_reason' => $request->rejection_reason,
                // Keep the return data for reference
            ]);

            // Asset status remains 'Terpinjam'

            DB::commit();

            Log::info("✅ Return rejected: Loan ID {$assetLoan->id} by Admin {$user->name}. Reason: {$request->rejection_reason}");

            return response()->json([
                'success' => true,
                'message' => 'Return rejected. User must re-submit return request.',
                'data' => $assetLoan->fresh()->load(['asset.unit', 'borrower', 'approver', 'returnVerifier'])
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();

            Log::error('Validation error rejecting return: ' . json_encode($e->errors()));

            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], Response::HTTP_BAD_REQUEST);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error("Error rejecting return for loan {$assetLoan->id}: " . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'An error occurred during return rejection.',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get loan proof photo
     */
    public function getProofPhoto(AssetLoan $assetLoan)
    {
        try {
            if (!$assetLoan->loan_proof_photo_path) {
                return response()->json([
                    'success' => false,
                    'message' => 'Proof photo not found'
                ], Response::HTTP_NOT_FOUND);
            }

            // Check if user can view this photo
            $user = Auth::user();
            if ($user->role === 'User' && $assetLoan->borrower_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to view this photo'
                ], Response::HTTP_FORBIDDEN);
            }

            // Check for Admin Unit - hanya bisa lihat photo di unit mereka
            if ($user->role === 'Admin Unit' && $user->unit_id && $assetLoan->asset->unit_id !== $user->unit_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to view photos from other units'
                ], Response::HTTP_FORBIDDEN);
            }

            if (!Storage::disk('public')->exists($assetLoan->loan_proof_photo_path)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Photo file not found'
                ], Response::HTTP_NOT_FOUND);
            }

            // Get file path
            $fullPath = Storage::disk('public')->path($assetLoan->loan_proof_photo_path);

            // Check if file exists on disk
            if (!\File::exists($fullPath)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Photo file not found on disk'
                ], Response::HTTP_NOT_FOUND);
            }

            // Get MIME type
            $mimeType = \File::mimeType($fullPath);
            $fileName = basename($assetLoan->loan_proof_photo_path);

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
            Log::error("Error fetching proof photo for loan {$assetLoan->id}: " . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch proof photo',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get return proof photo dengan Stream
     */
    public function getReturnProofPhoto(AssetLoan $assetLoan)
    {
        try {
            if (!$assetLoan->return_proof_photo_path) {
                return response()->json([
                    'success' => false,
                    'message' => 'Return proof photo not found'
                ], Response::HTTP_NOT_FOUND);
            }

            // Check if user can view this photo
            $user = Auth::user();
            if ($user->role === 'User' && $assetLoan->borrower_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to view this photo'
                ], Response::HTTP_FORBIDDEN);
            }

            // Check for Admin Unit - hanya bisa lihat photo di unit mereka
            if ($user->role === 'Admin Unit' && $user->unit_id && $assetLoan->asset->unit_id !== $user->unit_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to view photos from other units'
                ], Response::HTTP_FORBIDDEN);
            }

            if (!Storage::disk('public')->exists($assetLoan->return_proof_photo_path)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Photo file not found'
                ], Response::HTTP_NOT_FOUND);
            }

            // Get file path
            $fullPath = Storage::disk('public')->path($assetLoan->return_proof_photo_path);

            // Check if file exists on disk
            if (!\File::exists($fullPath)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Photo file not found on disk'
                ], Response::HTTP_NOT_FOUND);
            }

            // Get MIME type
            $mimeType = \File::mimeType($fullPath);
            $fileName = basename($assetLoan->return_proof_photo_path);

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
            Log::error("Error fetching return proof photo for loan {$assetLoan->id}: " . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch return proof photo',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get loans statistics for dashboard
     */
    public function statistics()
    {
        try {
            $user = Auth::user();

            $query = AssetLoan::query();

            // Regular users can only see their own statistics
            if ($user->role === 'User') {
                $query->where('borrower_id', $user->id);
            } elseif ($user->role === 'Admin Unit' && $user->unit_id) {
                // Admin Unit can only see statistics for their unit's assets
                $query->whereHas('asset', function($q) use ($user) {
                    $q->where('unit_id', $user->unit_id);
                });
            }

            $totalLoans = $query->count();
            $pendingLoans = (clone $query)->where('status', 'PENDING')->count();
            $approvedLoans = (clone $query)->where('status', 'APPROVED')->count();
            $rejectedLoans = (clone $query)->where('status', 'REJECTED')->count();
            $returnedLoans = (clone $query)->where('status', 'RETURNED')->count();
            $lostLoans = (clone $query)->where('status', 'LOST')->count(); // TAMBAHKAN STATISTIK LOST
            $pendingReturnLoans = (clone $query)->where('status', 'PENDING_RETURN')->count();

            // Recent pending loans for admin
            $recentPendingLoans = [];
            if (in_array($user->role, ['Super Admin', 'Admin Holding'])) {
                $recentPendingLoans = AssetLoan::with(['asset.unit', 'borrower'])
                    ->where('status', 'PENDING')
                    ->orderBy('created_at', 'desc')
                    ->limit(5)
                    ->get();
            } elseif ($user->role === 'Admin Unit' && $user->unit_id) {
                $recentPendingLoans = AssetLoan::with(['asset.unit', 'borrower'])
                    ->whereHas('asset', function($q) use ($user) {
                        $q->where('unit_id', $user->unit_id);
                    })
                    ->where('status', 'PENDING')
                    ->orderBy('created_at', 'desc')
                    ->limit(5)
                    ->get();
            }

            // Overdue loans (approved loans with expected return date passed)
            $overdueLoansQuery = (clone $query)
                ->where('status', 'APPROVED')
                ->where('expected_return_date', '<', Carbon::today());

            $overdueLoans = $overdueLoansQuery->count();
            $overdueLoansList = $overdueLoansQuery->with(['asset.unit', 'borrower'])
                ->orderBy('expected_return_date', 'asc')
                ->limit(5)
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'total_loans' => $totalLoans,
                    'pending_loans' => $pendingLoans,
                    'approved_loans' => $approvedLoans,
                    'rejected_loans' => $rejectedLoans,
                    'returned_loans' => $returnedLoans,
                    'lost_loans' => $lostLoans,
                    'pending_return_loans' => $pendingReturnLoans,
                    'overdue_loans' => $overdueLoans,
                    'recent_pending_loans' => $recentPendingLoans,
                    'overdue_loans_list' => $overdueLoansList,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching loan statistics: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch loan statistics',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, AssetLoan $assetLoan)
    {
        DB::beginTransaction();
        
        try {
            $user = Auth::user();
            
            // Check if user can update this loan
            if ($user->role === 'User' && $assetLoan->borrower_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to update this loan'
                ], Response::HTTP_FORBIDDEN);
            }

            // Check for Admin Unit - hanya bisa update loan di unit mereka
            if ($user->role === 'Admin Unit' && $user->unit_id && $assetLoan->asset->unit_id !== $user->unit_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to update loans from other units'
                ], Response::HTTP_FORBIDDEN);
            }

            $request->validate([
                'expected_return_date' => 'sometimes|required|date|after_or_equal:today',
                'purpose' => 'sometimes|required|string|max:500',
            ]);

            // Only allow updates for PENDING loans
            if ($assetLoan->status !== 'PENDING') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only pending loans can be updated'
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $assetLoan->update($request->only(['expected_return_date', 'purpose']));

            DB::commit();

            Log::info("✅ Loan updated successfully: Loan ID {$assetLoan->id}");

            return response()->json([
                'success' => true,
                'message' => 'Loan updated successfully',
                'data' => $assetLoan->fresh()->load(['asset.unit', 'borrower'])
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            
            Log::error('Validation error updating loan: ' . json_encode($e->errors()));
            
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], Response::HTTP_BAD_REQUEST);

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error("Error updating loan {$assetLoan->id}: " . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to update loan',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Cancel a loan request (for borrower)
     */
    public function cancel(AssetLoan $assetLoan)
    {
        DB::beginTransaction();
        
        try {
            $user = Auth::user();
            
            // Check if user can cancel this loan
            if ($assetLoan->borrower_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to cancel this loan'
                ], Response::HTTP_FORBIDDEN);
            }

            // Only allow cancellation for PENDING loans
            if ($assetLoan->status !== 'PENDING') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only pending loans can be cancelled'
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $assetLoan->update([
                'status' => 'REJECTED',
                'rejection_reason' => 'Dibatalkan oleh peminjam',
            ]);

            DB::commit();

            Log::info("✅ Loan cancelled by user: Loan ID {$assetLoan->id}");

            return response()->json([
                'success' => true,
                'message' => 'Loan cancelled successfully',
                'data' => $assetLoan->fresh()
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error("Error cancelling loan {$assetLoan->id}: " . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel loan',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get my loans (for regular users)
     */
    public function myLoans(Request $request)
    {
        try {
            $user = Auth::user();
            
            $loans = AssetLoan::with(['asset.unit', 'approver'])
                ->where('borrower_id', $user->id);

            // Allow filtering by status
            if ($request->has('status')) {
                $loans->where('status', $request->status);
            }

            // Filter by date range
            if ($request->has('start_date')) {
                $loans->where('request_date', '>=', $request->start_date);
            }
            if ($request->has('end_date')) {
                $loans->where('request_date', '<=', $request->end_date);
            }

            // Search by asset name
            if ($request->has('search')) {
                $searchTerm = $request->search;
                $loans->whereHas('asset', function($q) use ($searchTerm) {
                    $q->where('name', 'like', '%' . $searchTerm . '%')
                      ->orWhere('asset_tag', 'like', '%' . $searchTerm . '%');
                });
            }

            // Sorting
            $sortBy = $request->query('sort_by', 'created_at');
            $sortOrder = $request->query('sort_order', 'desc');
            $loans = $loans->orderBy($sortBy, $sortOrder)->get();

            return response()->json([
                'success' => true,
                'data' => $loans
            ]);

        } catch (\Exception $e) {
            Log::error("Error fetching my loans for user {$user->id}: " . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch your loans',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get pending returns (for admin to approve/reject).
     * Returns loans with status PENDING_RETURN.
     */
    public function getPendingReturns(Request $request)
    {
        try {
            $user = Auth::user();

            // Authorization check
            $isAdmin = in_array($user->role, ['Super Admin', 'Admin Holding', 'Admin Unit']);
            if (!$isAdmin) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to view pending returns.'
                ], Response::HTTP_FORBIDDEN);
            }

            $query = AssetLoan::with(['asset.unit', 'borrower.unit', 'approver'])
                ->where('status', 'PENDING_RETURN');

            // ✅ Filter by unit for Admin Unit
            // Admin Unit hanya bisa lihat pending return untuk peminjaman DALAM unit mereka sendiri
            // (bukan peminjaman antar unit)
            if ($user->role === 'Admin Unit' && $user->unit_id) {
                $query->whereHas('asset', function($q) use ($user) {
                    $q->where('unit_id', $user->unit_id);
                })
                ->whereHas('borrower', function($q) use ($user) {
                    // Borrower juga harus dari unit yang sama (bukan cross-unit)
                    $q->where('unit_id', $user->unit_id);
                });
            }

            // Sorting
            $sortBy = $request->query('sort_by', 'actual_return_date');
            $sortOrder = $request->query('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            // Pagination
            $perPage = $request->query('per_page', 15);
            $pendingReturns = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $pendingReturns,
                'total_pending' => $pendingReturns->total()
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching pending returns: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch pending returns',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get lost assets (for admin to view)
     */
    public function getLostAssets(Request $request)
    {
        try {
            $user = Auth::user();

            // Authorization check
            $isAdmin = in_array($user->role, ['Super Admin', 'Admin Holding', 'Admin Unit']);
            if (!$isAdmin) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to view lost assets.'
                ], Response::HTTP_FORBIDDEN);
            }

            $query = AssetLoan::with(['asset.unit', 'borrower', 'approver'])
                ->where('status', 'LOST');

            // Filter by unit for Admin Unit
            if ($user->role === 'Admin Unit' && $user->unit_id) {
                $query->whereHas('asset', function($q) use ($user) {
                    $q->where('unit_id', $user->unit_id);
                });
            }

            // Search
            if ($request->has('search')) {
                $searchTerm = $request->search;
                $query->where(function($q) use ($searchTerm) {
                    $q->whereHas('asset', function($assetQuery) use ($searchTerm) {
                        $assetQuery->where('name', 'like', '%' . $searchTerm . '%')
                                  ->orWhere('asset_tag', 'like', '%' . $searchTerm . '%');
                    })->orWhereHas('borrower', function($borrowerQuery) use ($searchTerm) {
                        $borrowerQuery->where('name', 'like', '%' . $searchTerm . '%');
                    });
                });
            }

            // Sorting
            $sortBy = $request->query('sort_by', 'actual_return_date');
            $sortOrder = $request->query('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            // Pagination
            $perPage = $request->query('per_page', 15);
            $lostAssets = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $lostAssets,
                'total_lost' => $lostAssets->total()
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching lost assets: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch lost assets',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get overdue loans
     */
    public function getOverdueLoans(Request $request)
    {
        try {
            $user = Auth::user();

            $query = AssetLoan::with(['asset.unit', 'borrower'])
                ->where('status', 'APPROVED')
                ->where('expected_return_date', '<', Carbon::today());

            // Filter by unit for Admin Unit
            if ($user->role === 'Admin Unit' && $user->unit_id) {
                $query->whereHas('asset', function($q) use ($user) {
                    $q->where('unit_id', $user->unit_id);
                });
            }

            // Filter for User (only their loans)
            if ($user->role === 'User') {
                $query->where('borrower_id', $user->id);
            }

            $overdueLoans = $query->orderBy('expected_return_date', 'asc')->get();

            return response()->json([
                'success' => true,
                'data' => $overdueLoans,
                'total_overdue' => $overdueLoans->count()
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching overdue loans: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch overdue loans',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Extend loan period
     */
    public function extendLoan(Request $request, AssetLoan $assetLoan)
    {
        DB::beginTransaction();
        
        try {
            $user = Auth::user();

            // Check permissions
            if ($user->role === 'User' && $assetLoan->borrower_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to extend this loan'
                ], Response::HTTP_FORBIDDEN);
            }

            // Check for Admin Unit - hanya bisa extend loan di unit mereka
            if ($user->role === 'Admin Unit' && $user->unit_id && $assetLoan->asset->unit_id !== $user->unit_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to extend loans from other units'
                ], Response::HTTP_FORBIDDEN);
            }

            $request->validate([
                'new_expected_return_date' => 'required|date|after:' . $assetLoan->expected_return_date,
                'extension_reason' => 'required|string|max:500',
            ]);

            // Only allow extension for APPROVED loans
            if ($assetLoan->status !== 'APPROVED') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only approved loans can be extended'
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $oldDate = $assetLoan->expected_return_date;
            $assetLoan->update([
                'expected_return_date' => $request->new_expected_return_date,
                'return_notes' => $assetLoan->return_notes . 
                    "\n[EXTENDED] From {$oldDate} to {$request->new_expected_return_date}. Reason: {$request->extension_reason}",
            ]);

            DB::commit();

            Log::info("✅ Loan extended: Loan ID {$assetLoan->id} from {$oldDate} to {$request->new_expected_return_date}");

            return response()->json([
                'success' => true,
                'message' => 'Loan extended successfully',
                'data' => $assetLoan->fresh()->load(['asset.unit', 'borrower'])
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            
            Log::error('Validation error extending loan: ' . json_encode($e->errors()));
            
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], Response::HTTP_BAD_REQUEST);

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error("Error extending loan {$assetLoan->id}: " . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to extend loan',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get loan history for a specific asset
     */
    public function getAssetLoanHistory($assetId)
    {
        try {
            $user = Auth::user();

            // Get asset to check permissions
            $asset = Asset::with('unit')->find($assetId);

            if (!$asset) {
                return response()->json([
                    'success' => false,
                    'message' => 'Asset not found'
                ], Response::HTTP_NOT_FOUND);
            }

            // Check permissions for Admin Unit
            if ($user->role === 'Admin Unit' && $user->unit_id && $asset->unit_id !== $user->unit_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to view loan history for assets from other units'
                ], Response::HTTP_FORBIDDEN);
            }

            // Get all loan history for the asset
            $loanHistory = AssetLoan::with(['borrower', 'approver', 'returnVerifier'])
                ->where('asset_id', $assetId)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $loanHistory
            ]);

        } catch (\Exception $e) {
            Log::error("Error fetching loan history for asset {$assetId}: " . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch loan history',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Bulk action for loans (approve/reject multiple)
     */
    public function bulkAction(Request $request)
    {
        DB::beginTransaction();

        try {
            $user = Auth::user();
            $validated = $request->validate([
                'loan_ids' => 'required|array',
                'loan_ids.*' => 'exists:asset_loans,id',
                'action' => 'required|in:approve,reject',
                'approval_date' => 'required_if:action,approve,reject|date|before_or_equal:today',
                'rejection_reason' => 'required_if:action,reject|string|min:10|max:500',
            ]);

            $loanIds = $validated['loan_ids'];
            $action = $validated['action'];

            // Get loans with their assets
            $loans = AssetLoan::with('asset.unit')
                ->whereIn('id', $loanIds)
                ->where('status', 'PENDING')
                ->get();

            // Filter loans based on user permissions
            if ($user->role === 'Admin Unit' && $user->unit_id) {
                $loans = $loans->filter(function ($loan) use ($user) {
                    return $loan->asset->unit_id === $user->unit_id;
                });
            }

            if ($loans->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No valid loans found for bulk action'
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $processedCount = 0;

            foreach ($loans as $loan) {
                if ($action === 'approve') {
                    $loan->update([
                        'status' => 'APPROVED',
                        'approved_by' => $user->id,
                        'approval_date' => $validated['approval_date'],
                        'loan_date' => Carbon::today(),
                        'rejection_reason' => null,
                    ]);
                    $loan->asset->update(['status' => 'Terpinjam']);
                } else {
                    $loan->update([
                        'status' => 'REJECTED',
                        'approved_by' => $user->id,
                        'approval_date' => $validated['approval_date'],
                        'rejection_reason' => $validated['rejection_reason'],
                        'loan_proof_photo_path' => null,
                        'loan_date' => null,
                    ]);
                }
                $processedCount++;
            }

            DB::commit();

            Log::info("✅ Bulk {$action} completed: {$processedCount} loans processed by User {$user->name}");

            return response()->json([
                'success' => true,
                'message' => "Successfully {$action}d {$processedCount} loans",
                'processed_count' => $processedCount,
                'total_requested' => count($loanIds)
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();

            Log::error('Validation error in bulk action: ' . json_encode($e->errors()));

            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], Response::HTTP_BAD_REQUEST);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Error in bulk action: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to perform bulk action',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}