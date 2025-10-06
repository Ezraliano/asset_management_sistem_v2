<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class AssetController extends Controller
{
    public function index(Request $request)
    {
        // Ambil parameter filter dari request
        $category = $request->query('category');
        $location = $request->query('location');
        $status = $request->query('status');

        // Mulai query
        $query = Asset::query();

        // Terapkan filter jika ada
        if (!empty($category)) {
            $query->where('category', $category);
        }

        if (!empty($location)) {
            $query->where('location', $location);
        }

        if (!empty($status)) {
            $query->where('status', $status);
        }

        // Dapatkan assets dengan filter
        $assets = $query->get();

        return response()->json([
            'success' => true,
            'data' => $assets
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'asset_tag' => 'required|string|unique:assets,asset_tag',
            'name' => 'required|string|max:255',
            'category' => 'required|string|max:255',
            'location' => 'required|string|max:255',
            'value' => 'required|numeric|min:0',
            'purchase_date' => 'required|date',
            'useful_life' => 'required|integer|min:1',
            'status' => 'required|in:In Use,In Repair,Disposed,Lost',
        ]);

        $asset = Asset::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Asset created successfully',
            'data' => $asset
        ], Response::HTTP_CREATED);
    }

    public function show($id)
    {
        // ✅ UPDATE: Include depresiasi data
        $asset = Asset::with(['depreciations' => function($query) {
            $query->orderBy('month_sequence', 'asc');
        }])->find($id);

        if (!$asset) {
            return response()->json([
                'success' => false,
                'message' => 'Asset not found'
            ], Response::HTTP_NOT_FOUND);
        }

        return response()->json([
            'success' => true,
            'data' => $asset
        ]);
    }

    public function update(Request $request, $id)
    {
        $asset = Asset::find($id);

        if (!$asset) {
            return response()->json([
                'success' => false,
                'message' => 'Asset not found'
            ], Response::HTTP_NOT_FOUND);
        }

        $validated = $request->validate([
            'asset_tag' => 'sometimes|required|string|unique:assets,asset_tag,' . $id,
            'name' => 'sometimes|required|string|max:255',
            'category' => 'sometimes|required|string|max:255',
            'location' => 'sometimes|required|string|max:255',
            'value' => 'sometimes|required|numeric|min:0',
            'purchase_date' => 'sometimes|required|date',
            'useful_life' => 'sometimes|required|integer|min:1',
            'status' => 'sometimes|required|in:In Use,In Repair,Disposed,Lost',
        ]);

        $asset->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Asset updated successfully',
            'data' => $asset
        ]);
    }

    public function destroy($id)
    {
        $asset = Asset::find($id);

        if (!$asset) {
            return response()->json([
                'success' => false,
                'message' => 'Asset not found'
            ], Response::HTTP_NOT_FOUND);
        }

        $asset->delete();

        return response()->json([
            'success' => true,
            'message' => 'Asset deleted successfully'
        ]);
    }
}