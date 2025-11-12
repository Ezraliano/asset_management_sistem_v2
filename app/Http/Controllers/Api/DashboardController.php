<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\Maintenance;
use App\Models\IncidentReport;
use App\Models\AssetLoan;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function stats(Request $request)
    {
        $user = $request->user();

        // 1. GET FILTERS
        $requestedUnitId = $request->query('unit_id');
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        // 2. DETERMINE UNIT FILTER
        $unitId = null;
        if ($user->role === 'unit' && $user->unit_id) {
            $unitId = $user->unit_id;
        } elseif (in_array($user->role, ['super-admin', 'admin']) && $requestedUnitId && $requestedUnitId !== 'all') {
            $unitId = (int) $requestedUnitId;
        }

        // 3. BUILD BASE QUERIES
        $assetQuery = Asset::query();
        $maintenanceQuery = Maintenance::query();
        $incidentQuery = IncidentReport::query();
        $loanQuery = AssetLoan::query();

        // 4. APPLY UNIT FILTER (IF APPLICABLE)
        if ($unitId) {
            $assetQuery->where('unit_id', $unitId);
            $maintenanceQuery->whereHas('asset', fn($q) => $q->where('unit_id', $unitId));
            $incidentQuery->whereHas('asset', fn($q) => $q->where('unit_id', $unitId));
            $loanQuery->whereHas('asset', fn($q) => $q->where('unit_id', $unitId));
        }

        // 5. CLONE QUERIES FOR DATE FILTERING
        $assetQueryForDate = (clone $assetQuery);
        $maintenanceQueryForDate = (clone $maintenanceQuery);
        $incidentQueryForDate = (clone $incidentQuery);
        $loanQueryForDate = (clone $loanQuery);

        // 6. APPLY DATE FILTER (to event-based queries only)
        if ($startDate && $endDate) {
            $assetQueryForDate->whereBetween('created_at', [$startDate, $endDate]);
            $maintenanceQueryForDate->whereBetween('date', [$startDate, $endDate]);
            $incidentQueryForDate->whereBetween('date', [$startDate, $endDate]);
            $loanQueryForDate->whereBetween('loan_date', [$startDate, $endDate]);
        }

        // 7. CALCULATE STATS
        // CURRENT STATE STATS (filtered by unit and date)
        $totalAssets = (clone $assetQueryForDate)->count();
        $totalValue = (clone $assetQueryForDate)->sum('value');
        $assetsInUse = (clone $assetQueryForDate)->where('status', 'Available')->count();
        $assetsInRepair = (clone $assetQueryForDate)->where('status', 'Dalam Perbaikan')->count();
        $assetsSold = (clone $assetQueryForDate)->where('status', 'Terjual')->count();
        $assetsLost = (clone $assetQueryForDate)->where('status', 'Lost')->count();

        // EVENT-BASED STATS (filtered by unit AND date)
        $scheduledMaintenances = $maintenanceQueryForDate->count();
        $activeIncidents = (clone $incidentQueryForDate)->whereNotIn('status', ['RESOLVED', 'CLOSED'])->count();
        $approvedLoans = (clone $loanQueryForDate)->where('status', 'APPROVED')->count();

        // 8. CALCULATE CHART DATA (based on current state)
        $assetsByCategory = (clone $assetQueryForDate)->selectRaw('category, COUNT(*) as count')
            ->groupBy('category')
            ->get()
            ->map(fn($item) => ['name' => $item->category, 'count' => $item->count]);

        if ($unitId) {
            $unitName = \App\Models\Unit::find($unitId)->name ?? 'Unknown Unit';
            $assetsByLocation = collect([['name' => $unitName, 'count' => $totalAssets]]);
        } else {
            $assetsByLocation = (clone $assetQueryForDate)->selectRaw('unit_id, COUNT(*) as count')
                ->with('unit:id,name')
                ->groupBy('unit_id')
                ->get()
                ->map(fn($item) => ['name' => $item->unit ? $item->unit->name : 'No Unit', 'count' => $item->count]);
        }

        // 9. RETURN RESPONSE
        return response()->json([
            'success' => true,
            'data' => [
                'total_assets' => $totalAssets,
                'total_value' => (float) $totalValue,
                'assets_in_use' => $assetsInUse,
                'assets_in_repair' => $assetsInRepair,
                'approved_loans' => $approvedLoans, // Date filtered
                'scheduled_maintenances' => $scheduledMaintenances, // Date filtered
                'active_incidents' => $activeIncidents, // Date filtered
                'assets_sold' => $assetsSold,
                'assets_lost' => $assetsLost,
                'assets_by_category' => $assetsByCategory,
                'assets_by_location' => $assetsByLocation,
            ]
        ]);
    }
}