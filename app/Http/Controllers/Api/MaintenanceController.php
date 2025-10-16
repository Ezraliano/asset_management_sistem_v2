<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Maintenance;
use App\Models\Asset;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class MaintenanceController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        // Build query with relationships
        $query = Maintenance::with(['asset', 'unit', 'validator', 'completedBy']);

        // Filter berdasarkan role
        if ($user->role === 'Admin Unit') {
            // Admin Unit hanya bisa lihat maintenance dari unit mereka
            $query->forUnit($user->unit_id);
        }
        // Super Admin dan Admin Holding bisa lihat semua

        $maintenances = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $maintenances
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'asset_id' => 'required|exists:assets,id',
            'type' => 'required|in:Perbaikan,Pemeliharaan',
            'date' => 'required|date',
            'unit_id' => 'nullable|exists:units,id',
            'party_type' => 'required|in:Internal,External',
            'instansi' => 'required|string|max:255',
            'phone_number' => 'required|string|max:20',
            'photo_proof' => 'nullable|image|mimes:jpeg,png,jpg|max:5120', // max 5MB
            'description' => 'nullable|string',
        ]);

        // Cek permission
        $asset = Asset::find($validated['asset_id']);
        if (!$user->canCreateMaintenance($asset)) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki izin untuk membuat perbaikan/pemeliharaan untuk aset ini'
            ], Response::HTTP_FORBIDDEN);
        }

        // Handle photo upload
        if ($request->hasFile('photo_proof')) {
            $file = $request->file('photo_proof');
            $filename = time() . '_' . $file->getClientOriginalName();
            $path = $file->storeAs('maintenance_proofs', $filename, 'public');
            $validated['photo_proof'] = $path;
        }

        // Set default status to PENDING
        $validated['status'] = 'PENDING';
        $validated['validation_status'] = 'PENDING';

        $maintenance = Maintenance::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Laporan perbaikan/pemeliharaan berhasil dibuat. Menunggu validasi.',
            'data' => $maintenance->load(['asset', 'unit'])
        ], Response::HTTP_CREATED);
    }

    public function getAssetMaintenances($assetId)
    {
        $maintenances = Maintenance::where('asset_id', $assetId)
            ->with(['asset', 'unit', 'validator', 'completedBy'])
            ->orderBy('date', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $maintenances
        ]);
    }

    public function show($id)
    {
        $maintenance = Maintenance::with(['asset'])->find($id);

        if (!$maintenance) {
            return response()->json([
                'success' => false,
                'message' => 'Maintenance record not found'
            ], Response::HTTP_NOT_FOUND);
        }

        return response()->json([
            'success' => true,
            'data' => $maintenance
        ]);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        $maintenance = Maintenance::with('asset')->find($id);

        if (!$maintenance) {
            return response()->json([
                'success' => false,
                'message' => 'Maintenance record not found'
            ], Response::HTTP_NOT_FOUND);
        }

        // Cek permission
        if (!$user->canValidateMaintenance($maintenance)) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki izin untuk mengupdate data perbaikan ini'
            ], Response::HTTP_FORBIDDEN);
        }

        // Hanya bisa update jika masih PENDING
        if ($maintenance->validation_status !== 'PENDING') {
            return response()->json([
                'success' => false,
                'message' => 'Tidak dapat mengupdate perbaikan yang sudah divalidasi'
            ], Response::HTTP_BAD_REQUEST);
        }

        $validated = $request->validate([
            'asset_id' => 'sometimes|required|exists:assets,id',
            'type' => 'sometimes|required|in:Perbaikan,Pemeliharaan',
            'date' => 'sometimes|required|date',
            'unit_id' => 'nullable|exists:units,id',
            'party_type' => 'sometimes|required|in:Internal,External',
            'instansi' => 'sometimes|required|string|max:255',
            'phone_number' => 'sometimes|required|string|max:20',
            'photo_proof' => 'nullable|image|mimes:jpeg,png,jpg|max:5120',
            'description' => 'nullable|string',
        ]);

        // Handle photo upload
        if ($request->hasFile('photo_proof')) {
            $file = $request->file('photo_proof');
            $filename = time() . '_' . $file->getClientOriginalName();
            $path = $file->storeAs('maintenance_proofs', $filename, 'public');
            $validated['photo_proof'] = $path;
        }

        $maintenance->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Maintenance record updated successfully',
            'data' => $maintenance->load(['asset', 'unit'])
        ]);
    }

    public function destroy($id)
    {
        $maintenance = Maintenance::find($id);

        if (!$maintenance) {
            return response()->json([
                'success' => false,
                'message' => 'Maintenance record not found'
            ], Response::HTTP_NOT_FOUND);
        }

        $maintenance->delete();

        return response()->json([
            'success' => true,
            'message' => 'Maintenance record deleted successfully'
        ]);
    }

    public function validate(Request $request, $id)
    {
        $user = $request->user();
        $maintenance = Maintenance::with('asset')->find($id);

        if (!$maintenance) {
            return response()->json([
                'success' => false,
                'message' => 'Maintenance record not found'
            ], Response::HTTP_NOT_FOUND);
        }

        // Check permission menggunakan method di User model
        if (!$user->canValidateMaintenance($maintenance)) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki izin untuk memvalidasi perbaikan ini'
            ], Response::HTTP_FORBIDDEN);
        }

        // Cek apakah sudah divalidasi
        if ($maintenance->validation_status !== 'PENDING') {
            return response()->json([
                'success' => false,
                'message' => 'Perbaikan ini sudah divalidasi sebelumnya'
            ], Response::HTTP_BAD_REQUEST);
        }

        $validated = $request->validate([
            'validation_status' => 'required|in:APPROVED,REJECTED',
            'validation_notes' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            // Update validation status
            $maintenance->update([
                'validation_status' => $validated['validation_status'],
                'validated_by' => $user->id,
                'validation_date' => now(),
                'validation_notes' => $validated['validation_notes'] ?? null,
            ]);

            // Change asset status when validation is approved
            if ($validated['validation_status'] === 'APPROVED') {
                $asset = $maintenance->asset;
                if ($asset) {
                    // Set status to "Dalam Perbaikan" untuk Perbaikan atau "Dalam Pemeliharaan" untuk Pemeliharaan
                    $newStatus = $maintenance->type === 'Perbaikan' ? 'Dalam Perbaikan' : 'Dalam Pemeliharaan';
                    $asset->update(['status' => $newStatus]);

                    // Update maintenance status to IN_PROGRESS
                    $maintenance->update(['status' => 'IN_PROGRESS']);
                }
            } elseif ($validated['validation_status'] === 'REJECTED') {
                // Jika ditolak, set status maintenance menjadi CANCELLED
                $maintenance->update(['status' => 'CANCELLED']);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => $validated['validation_status'] === 'APPROVED'
                    ? 'Perbaikan berhasil disetujui. Status aset telah diubah menjadi Dalam Perbaikan/Pemeliharaan.'
                    : 'Perbaikan ditolak.',
                'data' => $maintenance->load(['asset', 'unit', 'validator'])
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat memvalidasi perbaikan: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    public function complete(Request $request, $id)
    {
        $user = $request->user();
        $maintenance = Maintenance::with('asset')->find($id);

        if (!$maintenance) {
            return response()->json([
                'success' => false,
                'message' => 'Maintenance record not found'
            ], Response::HTTP_NOT_FOUND);
        }

        // Check permission
        if (!$user->canCompleteMaintenance($maintenance)) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki izin untuk menyelesaikan perbaikan ini'
            ], Response::HTTP_FORBIDDEN);
        }

        // Cek apakah sudah divalidasi dan approved
        if ($maintenance->validation_status !== 'APPROVED') {
            return response()->json([
                'success' => false,
                'message' => 'Perbaikan harus disetujui terlebih dahulu sebelum bisa diselesaikan'
            ], Response::HTTP_BAD_REQUEST);
        }

        // Cek apakah sudah completed
        if ($maintenance->status === 'COMPLETED') {
            return response()->json([
                'success' => false,
                'message' => 'Perbaikan ini sudah diselesaikan sebelumnya'
            ], Response::HTTP_BAD_REQUEST);
        }

        DB::beginTransaction();
        try {
            // Update maintenance status to COMPLETED
            $maintenance->update([
                'status' => 'COMPLETED',
                'completed_by' => $user->id,
                'completion_date' => now(),
            ]);

            // Update asset status back to Available
            $asset = $maintenance->asset;
            if ($asset) {
                $asset->update(['status' => 'Available']);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Perbaikan berhasil diselesaikan. Status aset telah diubah menjadi Available.',
                'data' => $maintenance->load(['asset', 'unit', 'validator', 'completedBy'])
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat menyelesaikan perbaikan: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}