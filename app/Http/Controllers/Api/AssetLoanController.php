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

        return response()->json($loan->load(['asset', 'borrower']), 201);
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
     * Approve a loan request with photo upload and approval date.
     * This is for admin/unit to approve.
     */
    public function approve(Request $request, AssetLoan $assetLoan)
    {
        $user = Auth::user();
        
        // Check if user has permission to approve
        if (!in_array($user->role, ['Super Admin', 'Admin Holding'])) {
            return response()->json(['message' => 'Unauthorized to approve loans'], 403);
        }

        if ($assetLoan->status !== 'PENDING') {
            return response()->json(['message' => 'This loan is not pending approval.'], 422);
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
                ]);

                // Update the asset status
                $assetLoan->asset->update(['status' => 'Terpinjam']);
            });
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'An error occurred during approval.', 
                'error' => $e->getMessage()
            ], 500);
        }

        return response()->json([
            'message' => 'Loan approved successfully',
            'data' => $assetLoan->fresh()->load(['asset', 'borrower', 'approver'])
        ]);
    }

    /**
     * Reject a loan request.
     * This is for admin/unit to reject.
     */
    public function reject(Request $request, AssetLoan $assetLoan)
    {
        $user = Auth::user();
        
        // Check if user has permission to reject
        if (!in_array($user->role, ['Super Admin', 'Admin Holding'])) {
            return response()->json(['message' => 'Unauthorized to reject loans'], 403);
        }

        if ($assetLoan->status !== 'PENDING') {
            return response()->json(['message' => 'This loan is not pending approval.'], 422);
        }

        $request->validate([
            'approval_date' => 'required|date|before_or_equal:today',
        ]);

        $assetLoan->update([
            'status' => 'REJECTED',
            'approved_by' => $user->id,
            'approval_date' => $request->approval_date,
        ]);

        return response()->json([
            'message' => 'Loan rejected successfully',
            'data' => $assetLoan->fresh()
        ]);
    }

    /**
     * Mark a loan as returned.
     * This is for admin/unit to process a return.
     */
    public function returnAsset(Request $request, AssetLoan $assetLoan)
    {
        $user = Auth::user();
        
        // Check if user has permission to process returns
        if (!in_array($user->role, ['Super Admin', 'Admin Holding'])) {
            return response()->json(['message' => 'Unauthorized to process returns'], 403);
        }

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
            return response()->json([
                'message' => 'An error occurred during asset return.', 
                'error' => $e->getMessage()
            ], 500);
        }

        return response()->json([
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
            return response()->json(['message' => 'Proof photo not found'], 404);
        }

        // Check if user can view this photo
        $user = Auth::user();
        if ($user && $user->role === 'User' && $assetLoan->borrower_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized to view this photo'], 403);
        }

        if (!Storage::disk('public')->exists($assetLoan->loan_proof_photo_path)) {
            return response()->json(['message' => 'Photo file not found'], 404);
        }

        return response()->file(storage_path('app/public/' . $assetLoan->loan_proof_photo_path));
    }
}