<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AssetMovement;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class AssetMovementController extends Controller
{
    public function index()
    {
        $movements = AssetMovement::with(['asset', 'movedBy'])->get();
        
        return response()->json([
            'success' => true,
            'data' => $movements
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'asset_id' => 'required|exists:assets,id',
            'location' => 'required|string|max:255',
            'moved_at' => 'required|date',
        ]);

        $validated['moved_by_id'] = $request->user()->id;

        $movement = AssetMovement::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Asset movement recorded successfully',
            'data' => $movement->load(['asset', 'movedBy'])
        ], Response::HTTP_CREATED);
    }

    public function getAssetMovements($assetId)
    {
        $movements = AssetMovement::where('asset_id', $assetId)
            ->with(['movedBy'])
            ->orderBy('moved_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $movements
        ]);
    }

    public function show($id)
    {
        $movement = AssetMovement::with(['asset', 'movedBy'])->find($id);

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

    public function destroy($id)
    {
        $movement = AssetMovement::find($id);

        if (!$movement) {
            return response()->json([
                'success' => false,
                'message' => 'Asset movement not found'
            ], Response::HTTP_NOT_FOUND);
        }

        $movement->delete();

        return response()->json([
            'success' => true,
            'message' => 'Asset movement deleted successfully'
        ]);
    }
}