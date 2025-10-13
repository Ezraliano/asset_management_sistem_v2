<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\AssetLoan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;

class AssetLoanController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        // Eager load relationships for efficiency
        $loans = AssetLoan::with(['asset.unit', 'borrower', 'approver']);

        // Check user role and filter accordingly
        $user = Auth::user();
        if ($user && in_array($user->role, ['User'])) {
            // Regular users can only see their own loans
            $loans->where('borrower_id', $user->id);
        } elseif ($user && $user->role === 'Admin Unit' && $user->unit_id) {
            // Admin Unit can only see loans for assets in their unit
            $loans->whereHas('asset', function($query) use ($user) {
                $query->where('unit_id', $user->unit_id);
            });
        }
        // Super Admin and Admin Holding can see all loans (no additional filter needed)

        // Allow filtering by status
        if ($request->has('status')) {
            $loans->where('status', $request->status);
        }

        return response()->json($loans->latest()->get());
    }

    /**
     * Store a newly created resource in storage.
     * This is for user to request a loan.
     */
    public function store(Request $request)
    {
        $request->validate([
            'asset_id' => 'required|exists:assets,id',
            'expected_return_date' => 'required|date|after_or_equal:today',
            'purpose' => 'required|string|max:500',
        ]);

        $asset = Asset::findOrFail($request->asset_id);

        // Check if the asset is available for loan
        if ($asset->status !== 'Available') {
            return response()->json([
                'success' => false,
                'message' => 'Asset is not available for loan. Current status: ' . $asset->status
            ], 422);
        }

        $loan = AssetLoan::create([
            'asset_id' => $asset->id,
            'borrower_id' => Auth::id(),
            'request_date' => Carbon::today(),
            'expected_return_date' => $request->expected_return_date,
            'purpose' => $request->purpose,
            'status' => 'PENDING', // Initial status
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Loan request submitted successfully',
            'data' => $loan->load(['asset', 'borrower'])
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(AssetLoan $assetLoan)
    {
        // Check if user can view this loan
        $user = Auth::user();
        if ($user && $user->role === 'User' && $assetLoan->borrower_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized to view this loan'
            ], 403);
        }

        // Eager load relationships
        return response()->json([
            'success' => true,
            'data' => $assetLoan->load(['asset', 'borrower', 'approver'])
        ]);
    }

    /**
     * Approve a loan request with photo upload and approval date.
     * This is for admin/unit to approve.
     */
    public function approve(Request $request, AssetLoan $assetLoan)
    {
        $user = Auth::user();

        // Load asset with unit relationship
        $assetLoan->load('asset.unit');

        // Check if user has permission to approve
        if (!in_array($user->role, ['Super Admin', 'Admin Holding'])) {
            // If Admin Unit, check if asset belongs to their unit
            if ($user->role === 'Admin Unit') {
                if (!$user->unit_id || $assetLoan->asset->unit_id !== $user->unit_id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Unauthorized to approve loans for assets outside your unit'
                    ], 403);
                }
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to approve loans'
                ], 403);
            }
        }

        if ($assetLoan->status !== 'PENDING') {
            return response()->json([
                'success' => false,
                'message' => 'This loan is not pending approval.'
            ], 422);
        }
        
        $request->validate([
            'approval_date' => 'required|date|before_or_equal:today',
            'loan_proof_photo' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        try {
            DB::transaction(function () use ($assetLoan, $request, $user) {
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
            });
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'An error occurred during approval.', 
                'error' => $e->getMessage()
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Loan approved successfully',
            'data' => $assetLoan->fresh()->load(['asset', 'borrower', 'approver'])
        ]);
    }

    /**
     * Reject a loan request with rejection reason.
     * This is for admin/unit to reject.
     */
    public function reject(Request $request, AssetLoan $assetLoan)
    {
        $user = Auth::user();

        // Load asset with unit relationship
        $assetLoan->load('asset.unit');

        // Check if user has permission to reject
        if (!in_array($user->role, ['Super Admin', 'Admin Holding'])) {
            // If Admin Unit, check if asset belongs to their unit
            if ($user->role === 'Admin Unit') {
                if (!$user->unit_id || $assetLoan->asset->unit_id !== $user->unit_id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Unauthorized to reject loans for assets outside your unit'
                    ], 403);
                }
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to reject loans'
                ], 403);
            }
        }

        if ($assetLoan->status !== 'PENDING') {
            return response()->json([
                'success' => false,
                'message' => 'This loan is not pending approval.'
            ], 422);
        }

        $request->validate([
            'approval_date' => 'required|date|before_or_equal:today',
            'rejection_reason' => 'required|string|min:10|max:500',
        ]);

        try {
            DB::transaction(function () use ($assetLoan, $request, $user) {
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
            });
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'An error occurred during rejection.', 
                'error' => $e->getMessage()
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Loan rejected successfully',
            'data' => $assetLoan->fresh()->load(['asset', 'borrower', 'approver'])
        ]);
    }

    /**
     * Mark a loan as returned.
     * This is for admin/unit to process a return.
     */
    public function returnAsset(Request $request, AssetLoan $assetLoan)
    {
        $user = Auth::user();

        // Load asset with unit relationship
        $assetLoan->load('asset.unit');

        // Check if user has permission to process returns
        if (!in_array($user->role, ['Super Admin', 'Admin Holding'])) {
            // If Admin Unit, check if asset belongs to their unit
            if ($user->role === 'Admin Unit') {
                if (!$user->unit_id || $assetLoan->asset->unit_id !== $user->unit_id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Unauthorized to process returns for assets outside your unit'
                    ], 403);
                }
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to process returns'
                ], 403);
            }
        }

        if ($assetLoan->status !== 'APPROVED') {
            return response()->json([
                'success' => false,
                'message' => 'This loan is not currently active.'
            ], 422);
        }

        $request->validate([
            'return_notes' => 'nullable|string|max:1000',
        ]);

        try {
            DB::transaction(function () use ($assetLoan, $request) {
                // Update the loan status
                $assetLoan->update([
                    'status' => 'RETURNED',
                    'actual_return_date' => Carbon::today(),
                    'return_notes' => $request->return_notes,
                ]);

                // Update the asset status back to Available
                $assetLoan->asset->update(['status' => 'Available']);
            });
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'An error occurred during asset return.', 
                'error' => $e->getMessage()
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Asset returned successfully',
            'data' => $assetLoan->fresh()->load(['asset', 'borrower', 'approver'])
        ]);
    }

    /**
     * Get loan proof photo
     */
    public function getProofPhoto(AssetLoan $assetLoan)
    {
        if (!$assetLoan->loan_proof_photo_path) {
            return response()->json([
                'success' => false,
                'message' => 'Proof photo not found'
            ], 404);
        }

        // Check if user can view this photo
        $user = Auth::user();
        if ($user && $user->role === 'User' && $assetLoan->borrower_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized to view this photo'
            ], 403);
        }

        if (!Storage::disk('public')->exists($assetLoan->loan_proof_photo_path)) {
            return response()->json([
                'success' => false,
                'message' => 'Photo file not found'
            ], 404);
        }

        return response()->file(storage_path('app/public/' . $assetLoan->loan_proof_photo_path));
    }

    /**
     * Get loans statistics for dashboard
     */
    public function statistics()
    {
        $user = Auth::user();

        $query = AssetLoan::query();

        // Regular users can only see their own statistics
        if ($user && in_array($user->role, ['User'])) {
            $query->where('borrower_id', $user->id);
        } elseif ($user && $user->role === 'Admin Unit' && $user->unit_id) {
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

        return response()->json([
            'success' => true,
            'data' => [
                'total_loans' => $totalLoans,
                'pending_loans' => $pendingLoans,
                'approved_loans' => $approvedLoans,
                'rejected_loans' => $rejectedLoans,
                'returned_loans' => $returnedLoans,
                'recent_pending_loans' => $recentPendingLoans,
            ]
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, AssetLoan $assetLoan)
    {
        // Check if user can update this loan
        $user = Auth::user();
        if ($user && $user->role === 'User' && $assetLoan->borrower_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized to update this loan'
            ], 403);
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
            ], 422);
        }

        $assetLoan->update($request->only(['expected_return_date', 'purpose']));

        return response()->json([
            'success' => true,
            'message' => 'Loan updated successfully',
            'data' => $assetLoan->fresh()->load(['asset', 'borrower'])
        ]);
    }

    /**
     * Cancel a loan request (for borrower)
     */
    public function cancel(AssetLoan $assetLoan)
    {
        $user = Auth::user();
        
        // Check if user can cancel this loan
        if ($assetLoan->borrower_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized to cancel this loan'
            ], 403);
        }

        // Only allow cancellation for PENDING loans
        if ($assetLoan->status !== 'PENDING') {
            return response()->json([
                'success' => false,
                'message' => 'Only pending loans can be cancelled'
            ], 422);
        }

        $assetLoan->update([
            'status' => 'REJECTED',
            'rejection_reason' => 'Dibatalkan oleh peminjam',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Loan cancelled successfully',
            'data' => $assetLoan->fresh()
        ]);
    }

    /**
     * Get my loans (for regular users)
     */
    public function myLoans(Request $request)
    {
        $user = Auth::user();
        
        $loans = AssetLoan::with(['asset', 'approver'])
            ->where('borrower_id', $user->id);

        // Allow filtering by status
        if ($request->has('status')) {
            $loans->where('status', $request->status);
        }

        $loans = $loans->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $loans
        ]);
    }
}