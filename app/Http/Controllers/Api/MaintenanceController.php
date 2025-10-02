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
            'date' => 'required|date',
            'description' => 'required|string',
            'status' => 'required|in:Scheduled,In Progress,Completed,Cancelled',
        ]);

        $maintenance = Maintenance::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Maintenance record created successfully',
            'data' => $maintenance->load(['asset'])
        ], Response::HTTP_CREATED);
    }

    public function getAssetMaintenances($assetId)
    {
        $maintenances = Maintenance::where('asset_id', $assetId)
            ->with(['asset'])
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
            'date' => 'sometimes|required|date',
            'description' => 'sometimes|required|string',
            'status' => 'sometimes|required|in:Scheduled,In Progress,Completed,Cancelled',
        ]);

        $maintenance->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Maintenance record updated successfully',
            'data' => $maintenance->load(['asset'])
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
}