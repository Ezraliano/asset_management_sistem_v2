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

        // Data untuk chart berdasarkan lokasi
        $assetsByLocation = Asset::selectRaw('location, COUNT(*) as count')
            ->groupBy('location')
            ->get()
            ->map(function ($item) {
                return [
                    'name' => $item->location,
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