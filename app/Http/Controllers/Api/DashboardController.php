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
        $requestedUnitId = $request->query('unit_name');
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        // 2. DETERMINE UNIT FILTER
        $unitName = null;
        if ($user->role === 'unit' && $user->unit_name) {
            $unitName = $user->unit_name;
        } elseif (in_array($user->role, ['super-admin', 'admin']) && $requestedUnitId && $requestedUnitId !== 'all') {
            $unitName = $requestedUnitId;
        }

        // 3. BUILD BASE QUERIES
        $assetQuery = Asset::query();
        $maintenanceQuery = Maintenance::query();
        $incidentQuery = IncidentReport::query();
        $loanQuery = AssetLoan::query();

        // 4. APPLY UNIT FILTER (IF APPLICABLE)
        if ($unitName) {
            $assetQuery->where('unit_name', $unitName);
            $maintenanceQuery->whereHas('asset', fn($q) => $q->where('unit_name', $unitName));
            $incidentQuery->whereHas('asset', fn($q) => $q->where('unit_name', $unitName));
            $loanQuery->whereHas('asset', fn($q) => $q->where('unit_name', $unitName));
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
        $assetsInMaintenance = (clone $assetQueryForDate)->where('status', 'Dalam Pemeliharaan')->count();
        $assetsSold = (clone $assetQueryForDate)->where('status', 'Terjual')->count();
        $assetsLost = (clone $assetQueryForDate)->where('status', 'Lost')->count();

        // EVENT-BASED STATS (filtered by unit AND date)
        $scheduledMaintenances = $maintenanceQueryForDate->count();
        $activeIncidents = (clone $incidentQueryForDate)->whereNotIn('status', ['RESOLVED', 'CLOSED'])->count();
        $approvedLoans = (clone $loanQueryForDate)->where('status', 'APPROVED')->count();

        // 8. CALCULATE TOTAL ACCUMULATED DEPRECIATION
        $totalAccumulatedDepreciation = (clone $assetQueryForDate)
            ->with('depreciations')
            ->get()
            ->sum(function($asset) {
                return $asset->depreciations()->sum('depreciation_amount');
            });

        // 9. CALCULATE CHART DATA (based on current state)
        $assetsByCategory = (clone $assetQueryForDate)->selectRaw('category, COUNT(*) as count')
            ->groupBy('category')
            ->get()
            ->map(fn($item) => ['name' => $item->category, 'count' => $item->count]);

        if ($unitName) {
            $assetsByLocation = collect([['name' => $unitName, 'count' => $totalAssets]]);
        } else {
            $assetsByLocation = (clone $assetQueryForDate)->selectRaw('unit_name, COUNT(*) as count')
                ->with('unit:id,name')
                ->groupBy('unit_name')
                ->get()
                ->map(fn($item) => ['name' => $item->unit ? $item->unit->name : 'No Unit', 'count' => $item->count]);
        }

        // 10. RETURN RESPONSE
        return response()->json([
            'success' => true,
            'data' => [
                'total_assets' => $totalAssets,
                'total_value' => (float) $totalValue,
                'assets_in_use' => $assetsInUse,
                'assets_in_repair' => $assetsInRepair,
                'assets_in_maintenance' => $assetsInMaintenance,
                'approved_loans' => $approvedLoans, // Date filtered
                'scheduled_maintenances' => $scheduledMaintenances, // Date filtered
                'active_incidents' => $activeIncidents, // Date filtered
                'assets_sold' => $assetsSold,
                'assets_lost' => $assetsLost,
                'total_accumulated_depreciation' => (float) $totalAccumulatedDepreciation,
                'assets_by_category' => $assetsByCategory,
                'assets_by_location' => $assetsByLocation,
            ]
        ]);
    }
}