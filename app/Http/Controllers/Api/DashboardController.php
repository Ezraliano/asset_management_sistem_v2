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

        // Determine if we should filter by unit
        // Admin Unit: always filtered by their unit
        // Super Admin & Admin Holding: can filter by unit if unit_id is provided
        $shouldFilterByUnit = false;
        $unitId = null;

        if ($user->role === 'Admin Unit' && $user->unit_id) {
            // Admin Unit: always filter by their own unit
            $shouldFilterByUnit = true;
            $unitId = $user->unit_id;
        } elseif (in_array($user->role, ['Super Admin', 'Admin Holding'])) {
            // Super Admin & Admin Holding: can optionally filter by unit_id parameter
            $requestedUnitId = $request->query('unit_id');
            if ($requestedUnitId && $requestedUnitId !== 'all') {
                $shouldFilterByUnit = true;
                $unitId = (int) $requestedUnitId;
            }
        }

        // Build base queries with unit filter if applicable
        $assetQuery = Asset::query();
        $maintenanceQuery = Maintenance::query();
        $incidentQuery = IncidentReport::query();
        $loanQuery = AssetLoan::query();

        if ($shouldFilterByUnit) {
            // Filter assets by unit
            $assetQuery->where('unit_id', $unitId);

            // Filter maintenances by asset's unit
            $maintenanceQuery->whereHas('asset', function ($q) use ($unitId) {
                $q->where('unit_id', $unitId);
            });

            // Filter incidents by asset's unit
            $incidentQuery->whereHas('asset', function ($q) use ($unitId) {
                $q->where('unit_id', $unitId);
            });

            // Filter loans by asset's unit
            $loanQuery->whereHas('asset', function ($q) use ($unitId) {
                $q->where('unit_id', $unitId);
            });
        }

        $totalAssets = $assetQuery->count();
        $totalValue = $assetQuery->sum('value');
        $assetsInUse = (clone $assetQuery)->where('status', 'Available')->count();
        $assetsInRepair = (clone $assetQuery)->where('status', 'Dalam Perbaikan')->count();
        $assetsInMaintenance = (clone $assetQuery)->where('status', 'Dalam Pemeliharaan')->count();
        $assetsSold = (clone $assetQuery)->where('status', 'Terjual')->count();
        $assetsLost = (clone $assetQuery)->where('status', 'Lost')->count();
        $activeIncidents = (clone $incidentQuery)->whereNotIn('status', ['RESOLVED', 'CLOSED'])->count();

        // Hitung asset yang sedang dipinjam (status APPROVED)
        $approvedLoans = (clone $loanQuery)->where('status', 'APPROVED')->count();

        // Data untuk chart berdasarkan kategori
        $assetsByCategory = (clone $assetQuery)->selectRaw('category, COUNT(*) as count')
            ->groupBy('category')
            ->get()
            ->map(function ($item) {
                return [
                    'name' => $item->category,
                    'count' => $item->count
                ];
            });

        // Data untuk chart berdasarkan unit/lokasi
        if ($shouldFilterByUnit) {
            // For Admin Unit, only show their unit
            $assetsByLocation = collect([[
                'name' => $user->unit->name ?? 'Unknown Unit',
                'count' => $totalAssets
            ]]);
        } else {
            // For Super Admin and Admin Holding, show all units
            $assetsByLocation = Asset::selectRaw('unit_id, COUNT(*) as count')
                ->with('unit:id,name')
                ->groupBy('unit_id')
                ->get()
                ->map(function ($item) {
                    return [
                        'name' => $item->unit ? $item->unit->name : 'No Unit',
                        'count' => $item->count
                    ];
                });
        }

        return response()->json([
            'success' => true,
            'data' => [
                'total_assets' => $totalAssets,
                'total_value' => (float) $totalValue,
                'assets_in_use' => $assetsInUse,
                'assets_in_repair' => $assetsInRepair,
                'approved_loans' => $approvedLoans,
                'scheduled_maintenances' => $assetsInMaintenance,
                'active_incidents' => $activeIncidents,
                'assets_sold' => $assetsSold,
                'assets_lost' => $assetsLost,
                'assets_by_category' => $assetsByCategory,
                'assets_by_location' => $assetsByLocation,
            ]
        ]);
    }
}