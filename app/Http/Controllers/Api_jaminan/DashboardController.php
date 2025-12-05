<?php

namespace App\Http\Controllers\Api_jaminan;

use App\Http\Controllers\Controller;
use App\Models_jaminan\Guarantee;
use App\Models_jaminan\GuaranteeLoan;
use App\Models_jaminan\GuaranteeSettlement;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class DashboardController extends Controller
{
    /**
     * Get dashboard statistics for jaminan system
     * GET /api/jaminan/dashboard/stats
     */
    public function getStats(Request $request)
    {
        try {
            $user = $request->user();
            $query = Guarantee::query();

            // ✅ AUTHORIZATION: Admin-kredit hanya lihat stats untuk unitnya sendiri
            if ($user && $user->role === 'admin-kredit' && $user->unit_name) {
                $query->byUnitName($user->unit_name);
            }

            // Get statistics
            $stats = [
                'total_guarantees' => $query->count(),
                'by_status' => [
                    'available' => $query->clone()->byStatus('available')->count(),
                    'dipinjam' => $query->clone()->byStatus('dipinjam')->count(),
                    'lunas' => $query->clone()->byStatus('lunas')->count(),
                ],
                'by_type' => [
                    'BPKB' => $query->clone()->byType('BPKB')->count(),
                    'SHM' => $query->clone()->byType('SHM')->count(),
                    'SHGB' => $query->clone()->byType('SHGB')->count(),
                    'E-SHM' => $query->clone()->byType('E-SHM')->count(),
                ],
                'total_spk' => $query->clone()->distinct('spk_number')->count('spk_number'),
            ];

            // Get loan statistics
            $loanQuery = GuaranteeLoan::query();
            if ($user && $user->role === 'admin-kredit' && $user->unit_name) {
                $loanQuery->whereHas('guarantee', function ($q) use ($user) {
                    $q->where('unit_name', $user->unit_name);
                });
            }

            $stats['loans'] = [
                'total_loans' => $loanQuery->count(),
                'active_loans' => $loanQuery->clone()->byStatus('active')->count(),
                'returned_loans' => $loanQuery->clone()->byStatus('returned')->count(),
            ];

            // Get settlement statistics
            $settlementQuery = GuaranteeSettlement::query();
            if ($user && $user->role === 'admin-kredit' && $user->unit_name) {
                $settlementQuery->whereHas('guarantee', function ($q) use ($user) {
                    $q->where('unit_name', $user->unit_name);
                });
            }

            $stats['settlements'] = [
                'total_settlements' => $settlementQuery->count(),
                'pending_settlements' => $settlementQuery->clone()->byStatus('pending')->count(),
                'approved_settlements' => $settlementQuery->clone()->byStatus('approved')->count(),
                'rejected_settlements' => $settlementQuery->clone()->byStatus('rejected')->count(),
            ];

            // Add user unit info if admin-kredit
            if ($user && $user->role === 'admin-kredit') {
                $stats['user_unit'] = $user->unit_name;
            }

            return response()->json([
                'success' => true,
                'message' => 'Dashboard statistics berhasil diambil',
                'data' => $stats
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil dashboard statistics: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get dashboard overview with recent activities
     * GET /api/jaminan/dashboard/overview
     */
    public function getOverview(Request $request)
    {
        try {
            $user = $request->user();

            // Get recent guarantees
            $guaranteesQuery = Guarantee::query()->with('unit')->orderBy('created_at', 'desc')->limit(10);
            if ($user && $user->role === 'admin-kredit' && $user->unit_name) {
                $guaranteesQuery->byUnitName($user->unit_name);
            }
            $recentGuarantees = $guaranteesQuery->get();

            // Get pending settlements
            $settlementsQuery = GuaranteeSettlement::with('guarantee')
                ->byStatus('pending')
                ->orderBy('created_at', 'desc')
                ->limit(10);
            if ($user && $user->role === 'admin-kredit' && $user->unit_name) {
                $settlementsQuery->whereHas('guarantee', function ($q) use ($user) {
                    $q->where('unit_name', $user->unit_name);
                });
            }
            $pendingSettlements = $settlementsQuery->get();

            // Get active loans
            $loansQuery = GuaranteeLoan::with('guarantee')
                ->byStatus('active')
                ->orderBy('created_at', 'desc')
                ->limit(10);
            if ($user && $user->role === 'admin-kredit' && $user->unit_name) {
                $loansQuery->whereHas('guarantee', function ($q) use ($user) {
                    $q->where('unit_name', $user->unit_name);
                });
            }
            $activeLoans = $loansQuery->get();

            return response()->json([
                'success' => true,
                'message' => 'Dashboard overview berhasil diambil',
                'data' => [
                    'recent_guarantees' => $recentGuarantees,
                    'pending_settlements' => $pendingSettlements,
                    'active_loans' => $activeLoans,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil dashboard overview: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
