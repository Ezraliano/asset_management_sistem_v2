<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IncidentReport;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class IncidentReportController extends Controller
{
    public function index()
    {
        $incidents = IncidentReport::with(['asset', 'reporter'])->get();
        
        return response()->json([
            'success' => true,
            'data' => $incidents
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'asset_id' => 'required|exists:assets,id',
            'type' => 'required|in:Damage,Loss',
            'description' => 'required|string',
            'date' => 'required|date',
            'status' => 'required|string',
        ]);

        $validated['reporter_id'] = $request->user()->id;

        $incident = IncidentReport::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Incident report created successfully',
            'data' => $incident->load(['asset', 'reporter'])
        ], Response::HTTP_CREATED);
    }

    public function getAssetIncidentReports($assetId)
    {
        $incidents = IncidentReport::where('asset_id', $assetId)
            ->with(['reporter'])
            ->orderBy('date', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $incidents
        ]);
    }

    public function show($id)
    {
        $incident = IncidentReport::with(['asset', 'reporter'])->find($id);

        if (!$incident) {
            return response()->json([
                'success' => false,
                'message' => 'Incident report not found'
            ], Response::HTTP_NOT_FOUND);
        }

        return response()->json([
            'success' => true,
            'data' => $incident
        ]);
    }

    public function update(Request $request, $id)
    {
        $incident = IncidentReport::find($id);

        if (!$incident) {
            return response()->json([
                'success' => false,
                'message' => 'Incident report not found'
            ], Response::HTTP_NOT_FOUND);
        }

        $validated = $request->validate([
            'asset_id' => 'sometimes|required|exists:assets,id',
            'type' => 'sometimes|required|in:Damage,Loss',
            'description' => 'sometimes|required|string',
            'date' => 'sometimes|required|date',
            'status' => 'sometimes|required|string',
        ]);

        $incident->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Incident report updated successfully',
            'data' => $incident->load(['asset', 'reporter'])
        ]);
    }

    public function destroy($id)
    {
        $incident = IncidentReport::find($id);

        if (!$incident) {
            return response()->json([
                'success' => false,
                'message' => 'Incident report not found'
            ], Response::HTTP_NOT_FOUND);
        }

        $incident->delete();

        return response()->json([
            'success' => true,
            'message' => 'Incident report deleted successfully'
        ]);
    }
}