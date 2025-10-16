<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Maintenance;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class MaintenanceController extends Controller
{
    public function index()
    {
        $maintenances = Maintenance::with(['asset'])->get();
        
        return response()->json([
            'success' => true,
            'data' => $maintenances
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'asset_id' => 'required|exists:assets,id',
            'type' => 'required|in:Perbaikan,Pemeliharaan',
            'date' => 'required|date',
            'unit_id' => 'nullable|exists:units,id',
            'party_type' => 'required|in:Internal,External',
            'technician_name' => 'required|string|max:255',
            'phone_number' => 'required|string|max:20',
            'photo_proof' => 'nullable|image|mimes:jpeg,png,jpg|max:5120', // max 5MB
            'description' => 'nullable|string',
            'status' => 'nullable|in:Scheduled,In Progress,Completed,Cancelled',
        ]);

        // Handle photo upload
        if ($request->hasFile('photo_proof')) {
            $file = $request->file('photo_proof');
            $filename = time() . '_' . $file->getClientOriginalName();
            $path = $file->storeAs('maintenance_proofs', $filename, 'public');
            $validated['photo_proof'] = $path;
        }

        $maintenance = Maintenance::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Maintenance record created successfully',
            'data' => $maintenance->load(['asset', 'unit'])
        ], Response::HTTP_CREATED);
    }

    public function getAssetMaintenances($assetId)
    {
        $maintenances = Maintenance::where('asset_id', $assetId)
            ->with(['asset', 'unit', 'validator'])
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
        $maintenance = Maintenance::find($id);

        if (!$maintenance) {
            return response()->json([
                'success' => false,
                'message' => 'Maintenance record not found'
            ], Response::HTTP_NOT_FOUND);
        }

        $validated = $request->validate([
            'asset_id' => 'sometimes|required|exists:assets,id',
            'type' => 'sometimes|required|in:Perbaikan,Pemeliharaan',
            'date' => 'sometimes|required|date',
            'unit_id' => 'nullable|exists:units,id',
            'party_type' => 'sometimes|required|in:Internal,External',
            'technician_name' => 'sometimes|required|string|max:255',
            'phone_number' => 'sometimes|required|string|max:20',
            'photo_proof' => 'nullable|image|mimes:jpeg,png,jpg|max:5120',
            'description' => 'nullable|string',
            'status' => 'sometimes|required|in:Scheduled,In Progress,Completed,Cancelled',
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
        $maintenance = Maintenance::find($id);

        if (!$maintenance) {
            return response()->json([
                'success' => false,
                'message' => 'Maintenance record not found'
            ], Response::HTTP_NOT_FOUND);
        }

        $user = $request->user();

        // Check if user has permission to validate (Super Admin, Admin Holding, or Admin Unit)
        $allowedRoles = ['Super Admin', 'Admin Holding', 'Admin Unit'];
        if (!in_array($user->role, $allowedRoles)) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to validate maintenance records'
            ], Response::HTTP_FORBIDDEN);
        }

        $validated = $request->validate([
            'validation_status' => 'required|in:APPROVED,REJECTED',
            'validation_notes' => 'nullable|string',
        ]);

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
                // Set status to "In Repair" for Perbaikan or "In Maintenance" for Pemeliharaan
                $newStatus = $maintenance->type === 'Perbaikan' ? 'In Repair' : 'In Maintenance';
                $asset->update(['status' => $newStatus]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Maintenance validation updated successfully',
            'data' => $maintenance->load(['asset', 'unit', 'validator'])
        ]);
    }
}