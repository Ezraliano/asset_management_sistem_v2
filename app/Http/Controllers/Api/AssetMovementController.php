<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\AssetMovement;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class AssetMovementController extends Controller
{
    /**
     * Get all movements (with filters for user role)
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $query = AssetMovement::with([
            'asset',
            'fromUnit',
            'toUnit',
            'requestedBy',
            'validatedBy'
        ]);

        // Filter based on user role
        if ($user->isAdminUnit()) {
            // Admin Unit hanya bisa lihat movement yang dari/ke unit mereka
            $query->where(function($q) use ($user) {
                $q->where('from_unit_name', $user->unit_name)
                  ->orWhere('to_unit_name', $user->unit_name);
            });
        }
        // Super Admin & Admin Holding bisa lihat semua

        $movements = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $movements
        ]);
    }

    /**
     * Request asset transfer to another unit
     */
    public function requestTransfer(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'asset_id' => 'required|exists:assets,id',
            'to_unit_name' => 'required|exists:units,id',
            'notes' => 'nullable|string|max:1000',
        ]);

        $asset = Asset::findOrFail($validated['asset_id']);

        // Validasi: User harus bisa manage asset ini
        if (!$user->canUpdateAsset($asset)) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki akses untuk memindahkan asset ini'
            ], Response::HTTP_FORBIDDEN);
        }

        // Validasi: Asset tidak boleh dipindahkan ke unit yang sama
        if ($asset->unit_name == $validated['to_unit_name']) {
            return response()->json([
                'success' => false,
                'message' => 'Asset sudah berada di unit tujuan'
            ], Response::HTTP_BAD_REQUEST);
        }

        // Validasi: Cek apakah ada pending movement untuk asset ini
        $existingPending = AssetMovement::where('asset_id', $asset->id)
            ->where('status', 'PENDING')
            ->exists();

        if ($existingPending) {
            return response()->json([
                'success' => false,
                'message' => 'Asset ini memiliki request perpindahan yang masih pending'
            ], Response::HTTP_BAD_REQUEST);
        }

        $movement = AssetMovement::create([
            'asset_id' => $asset->id,
            'from_unit_name' => $asset->unit_name,
            'to_unit_name' => $validated['to_unit_name'],
            'requested_by_id' => $user->id,
            'status' => 'PENDING',
            'notes' => $validated['notes'] ?? null,
            'requested_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Request perpindahan asset berhasil dibuat',
            'data' => $movement->load([
                'asset',
                'fromUnit',
                'toUnit',
                'requestedBy'
            ])
        ], Response::HTTP_CREATED);
    }

    /**
     * Get pending movements for validation (unit penerima)
     */
    public function getPendingMovements(Request $request)
    {
        $user = $request->user();

        $query = AssetMovement::with([
            'asset',
            'fromUnit',
            'toUnit',
            'requestedBy'
        ])->where('status', 'PENDING');

        // Admin Unit hanya bisa lihat yang ditujukan ke unit mereka
        if ($user->isAdminUnit()) {
            $query->where('to_unit_name', $user->unit_name);
        }
        // Super Admin & Admin Holding bisa lihat semua pending

        $movements = $query->orderBy('requested_at', 'asc')->get();

        return response()->json([
            'success' => true,
            'data' => $movements
        ]);
    }

    /**
     * Approve asset transfer
     */
    public function approveTransfer(Request $request, $id)
    {
        $user = $request->user();
        $movement = AssetMovement::with(['asset', 'fromUnit', 'toUnit'])->findOrFail($id);

        // Validasi: Movement harus PENDING
        if (!$movement->isPending()) {
            return response()->json([
                'success' => false,
                'message' => 'Request ini sudah diproses sebelumnya'
            ], Response::HTTP_BAD_REQUEST);
        }

        // Validasi: User harus bisa manage unit tujuan
        if ($user->isAdminUnit() && $user->unit_name !== $movement->to_unit_name) {
            return response()->json([
                'success' => false,
                'message' => 'Anda hanya bisa menerima asset untuk unit Anda'
            ], Response::HTTP_FORBIDDEN);
        }

        DB::beginTransaction();
        try {
            // Update movement status
            $movement->update([
                'status' => 'APPROVED',
                'validated_by_id' => $user->id,
                'validated_at' => now(),
            ]);

            // Update asset unit_name
            $movement->asset->update([
                'unit_name' => $movement->to_unit_name,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Perpindahan asset berhasil disetujui',
                'data' => $movement->load([
                    'asset',
                    'fromUnit',
                    'toUnit',
                    'requestedBy',
                    'validatedBy'
                ])
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Gagal menyetujui perpindahan asset: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Reject asset transfer
     */
    public function rejectTransfer(Request $request, $id)
    {
        $user = $request->user();

        $validated = $request->validate([
            'rejection_reason' => 'required|string|max:1000',
        ]);

        $movement = AssetMovement::with(['asset', 'fromUnit', 'toUnit'])->findOrFail($id);

        // Validasi: Movement harus PENDING
        if (!$movement->isPending()) {
            return response()->json([
                'success' => false,
                'message' => 'Request ini sudah diproses sebelumnya'
            ], Response::HTTP_BAD_REQUEST);
        }

        // Validasi: User harus bisa manage unit tujuan
        if ($user->isAdminUnit() && $user->unit_name !== $movement->to_unit_name) {
            return response()->json([
                'success' => false,
                'message' => 'Anda hanya bisa menolak asset untuk unit Anda'
            ], Response::HTTP_FORBIDDEN);
        }

        $movement->update([
            'status' => 'REJECTED',
            'validated_by_id' => $user->id,
            'validated_at' => now(),
            'rejection_reason' => $validated['rejection_reason'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Perpindahan asset berhasil ditolak',
            'data' => $movement->load([
                'asset',
                'fromUnit',
                'toUnit',
                'requestedBy',
                'validatedBy'
            ])
        ]);
    }

    /**
     * Get movement history for specific asset
     */
    public function getAssetMovements($assetId)
    {
        $movements = AssetMovement::where('asset_id', $assetId)
            ->with([
                'fromUnit',
                'toUnit',
                'requestedBy',
                'validatedBy'
            ])
            ->orderBy('requested_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $movements
        ]);
    }

    /**
     * Get single movement detail
     */
    public function show($id)
    {
        $movement = AssetMovement::with([
            'asset',
            'fromUnit',
            'toUnit',
            'requestedBy',
            'validatedBy'
        ])->find($id);

        if (!$movement) {
            return response()->json([
                'success' => false,
                'message' => 'Asset movement not found'
            ], Response::HTTP_NOT_FOUND);
        }

        return response()->json([
            'success' => true,
            'data' => $movement
        ]);
    }

    /**
     * Cancel pending movement (only by requester or admin)
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $movement = AssetMovement::findOrFail($id);

        // Hanya bisa cancel jika masih PENDING
        if (!$movement->isPending()) {
            return response()->json([
                'success' => false,
                'message' => 'Hanya request yang masih pending yang bisa dibatalkan'
            ], Response::HTTP_BAD_REQUEST);
        }

        // Validasi: User harus pembuat request atau admin
        if ($movement->requested_by_id !== $user->id && !$user->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki akses untuk membatalkan request ini'
            ], Response::HTTP_FORBIDDEN);
        }

        $movement->delete();

        return response()->json([
            'success' => true,
            'message' => 'Request perpindahan asset berhasil dibatalkan'
        ]);
    }
}