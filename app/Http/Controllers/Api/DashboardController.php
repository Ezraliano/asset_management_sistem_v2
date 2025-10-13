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
        $totalAssets = Asset::count();
        $totalValue = Asset::sum('value');
        $assetsInUse = Asset::where('status', 'In Use')->count();
        $assetsInRepair = Asset::where('status', 'In Repair')->count();
        $scheduledMaintenances = Maintenance::where('status', 'Scheduled')->count();
        $activeIncidents = IncidentReport::whereNotIn('status', ['Resolved', 'Closed'])->count();

        // Hitung asset yang sedang dipinjam (status APPROVED)
        $approvedLoans = AssetLoan::where('status', 'APPROVED')->count();

        // Data untuk chart berdasarkan kategori
        $assetsByCategory = Asset::selectRaw('category, COUNT(*) as count')
            ->groupBy('category')
            ->get()
            ->map(function ($item) {
                return [
                    'name' => $item->category,
                    'count' => $item->count
                ];
            });

        // Data untuk chart berdasarkan unit/lokasi
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

        return response()->json([
            'success' => true,
            'data' => [
                'total_assets' => $totalAssets,
                'total_value' => (float) $totalValue,
                'assets_in_use' => $assetsInUse,
                'assets_in_repair' => $assetsInRepair,
                'approved_loans' => $approvedLoans,
                'scheduled_maintenances' => $scheduledMaintenances,
                'active_incidents' => $activeIncidents,
                'assets_by_category' => $assetsByCategory,
                'assets_by_location' => $assetsByLocation,
            ]
        ]);
    }
}