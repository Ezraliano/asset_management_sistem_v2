<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\AssetLoan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AssetLoanController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        // Eager load relationships for efficiency
        $loans = AssetLoan::with(['asset', 'borrower', 'approver']);

        // Check user role and filter accordingly
        $user = Auth::user();
        if ($user && in_array($user->role, ['User'])) {
            // Regular users can only see their own loans
            $loans->where('borrower_id', $user->id);
        }
        // Admin Holding, Unit, and Super Admin can see all loans (no additional filter needed)

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
            return response()->json(['message' => 'Asset is not available for loan. Current status: ' . $asset->status], 422);
        }

        $loan = AssetLoan::create([
            'asset_id' => $asset->id,
            'borrower_id' => Auth::id(),
            'request_date' => Carbon::today(),
            'expected_return_date' => $request->expected_return_date,
            'purpose' => $request->purpose,
            'status' => 'PENDING', // Initial status
        ]);

        return response()->json($loan, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(AssetLoan $assetLoan)
    {
        // Check if user can view this loan
        $user = Auth::user();
        if ($user && $user->role === 'User' && $assetLoan->borrower_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized to view this loan'], 403);
        }

        // Eager load relationships
        return response()->json($assetLoan->load(['asset', 'borrower', 'approver']));
    }

    /**
     * Approve a loan request.
     * This is for admin/unit to approve.
     */
    public function approve(Request $request, AssetLoan $assetLoan)
    {
        // Optional: Add authorization check to ensure only certain roles can approve
        // if (Auth::user()->role !== 'admin') {
        //     return response()->json(['message' => 'Unauthorized'], 403);
        // }

        if ($assetLoan->status !== 'PENDING') {
            return response()->json(['message' => 'This loan is not pending approval.'], 422);
        }
        
        $request->validate([
            'loan_proof_photo_path' => 'nullable|string|max:255',
        ]);

        try {
            DB::transaction(function () use ($assetLoan, $request) {
                // Update the loan status
                $assetLoan->update([
                    'status' => 'APPROVED',
                    'approved_by' => Auth::id(),
                    'approval_date' => Carbon::today(),
                    'loan_date' => Carbon::today(), // Set loan date on approval
                    'loan_proof_photo_path' => $request->loan_proof_photo_path,
                ]);

                // Update the asset status
                $assetLoan->asset->update(['status' => 'Terpinjam']);
            });
        } catch (\Exception $e) {
            return response()->json(['message' => 'An error occurred during approval.', 'error' => $e->getMessage()], 500);
        }


        return response()->json($assetLoan->fresh()->load(['asset', 'borrower', 'approver']));
    }

    /**
     * Reject a loan request.
     * This is for admin/unit to reject.
     */
    public function reject(AssetLoan $assetLoan)
    {
        // Optional: Add authorization check
        
        if ($assetLoan->status !== 'PENDING') {
            return response()->json(['message' => 'This loan is not pending approval.'], 422);
        }

        $assetLoan->update([
            'status' => 'REJECTED',
            'approved_by' => Auth::id(), // The user who rejected it
            'approval_date' => Carbon::today(),
        ]);

        return response()->json($assetLoan->fresh());
    }

    /**
     * Mark a loan as returned.
     * This is for admin/unit to process a return.
     */
    public function returnAsset(Request $request, AssetLoan $assetLoan)
    {
        // Optional: Add authorization check

        if ($assetLoan->status !== 'APPROVED') {
            return response()->json(['message' => 'This loan is not currently active.'], 422);
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
            return response()->json(['message' => 'An error occurred during asset return.', 'error' => $e->getMessage()], 500);
        }

        return response()->json($assetLoan->fresh()->load(['asset', 'borrower', 'approver']));
    }
}