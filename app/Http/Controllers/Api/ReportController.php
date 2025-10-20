<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\Maintenance;
use App\Models\IncidentReport;
use App\Models\AssetLoan;
use App\Models\AssetSale;
use App\Models\User;
use App\Models\Unit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class ReportController extends Controller
{
    /**
     * Get laporan asset lengkap dengan depresiasi
     */
    public function getFullAssetReport(Request $request)
    {
        try {
            Log::info('Starting getFullAssetReport', ['user_id' => Auth::id()]);

            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User tidak terautentikasi',
                    'data' => []
                ], 401);
            }

            // Query builder untuk assets
            $query = Asset::with(['unit', 'depreciations'])
                ->select('assets.*');

            // Filter berdasarkan role
            if ($user->role === 'Admin Unit') {
                $query->where('unit_id', $user->unit_id);
                Log::info('Admin Unit filter applied', ['unit_id' => $user->unit_id]);
            } elseif ($request->has('unit_id') && $request->unit_id !== 'all') {
                $query->where('unit_id', $request->unit_id);
                Log::info('Unit filter applied', ['unit_id' => $request->unit_id]);
            }

            // Filter tambahan
            if ($request->has('category') && $request->category) {
                $query->where('category', $request->category);
            }
            if ($request->has('status') && $request->status) {
                $query->where('status', $request->status);
            }
            if ($request->has('search') && $request->search) {
                $query->where(function($q) use ($request) {
                    $q->where('name', 'like', '%' . $request->search . '%')
                      ->orWhere('asset_tag', 'like', '%' . $request->search . '%');
                });
            }
            if ($request->has('month') && $request->month) {
                $query->whereMonth('purchase_date', $request->month);
            }
            if ($request->has('year') && $request->year) {
                $query->whereYear('purchase_date', $request->year);
            }

            $assets = $query->get();
            Log::info('Assets retrieved', ['count' => $assets->count()]);

            // Format data dengan perhitungan depresiasi
            $reportData = $assets->map(function ($asset) {
                $accumulatedDepreciation = $asset->depreciations()->sum('depreciation_amount');
                $currentValue = $asset->value - $accumulatedDepreciation;

                // Calculate monthly depreciation
                $monthlyDepreciation = 0;
                if ($asset->useful_life > 0) {
                    $monthlyDepreciation = $asset->value / $asset->useful_life;
                }

                return [
                    'id' => $asset->id,
                    'asset_tag' => $asset->asset_tag,
                    'name' => $asset->name,
                    'category' => $asset->category,
                    'location' => $asset->location,
                    'unit_name' => $asset->unit ? $asset->unit->name : 'N/A',
                    'value' => (float) $asset->value,
                    'purchase_date' => $asset->purchase_date,
                    'useful_life' => (int) $asset->useful_life,
                    'status' => $asset->status,
                    'monthly_depreciation' => (float) $monthlyDepreciation,
                    'accumulated_depreciation' => (float) $accumulatedDepreciation,
                    'current_value' => max(0, (float) $currentValue),
                    'depreciation_progress' => $asset->useful_life > 0 && $asset->value > 0
                        ? min(100, ($accumulatedDepreciation / $asset->value) * 100)
                        : 0,
                ];
            });

            Log::info('Report data formatted', ['data_count' => $reportData->count()]);

            return response()->json([
                'success' => true,
                'message' => 'Laporan asset lengkap berhasil diambil',
                'data' => $reportData,
                'summary' => [
                    'total_assets' => $reportData->count(),
                    'total_value' => $reportData->sum('value'),
                    'total_current_value' => $reportData->sum('current_value'),
                    'total_depreciation' => $reportData->sum('accumulated_depreciation'),
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Error in getFullAssetReport', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil laporan asset lengkap: ' . $e->getMessage(),
                'error' => $e->getMessage(),
                'data' => []
            ], 500);
        }
    }

    /**
     * Get laporan pemeliharaan asset
     */
    public function getMaintenanceReport(Request $request)
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User tidak terautentikasi',
                    'data' => []
                ], 401);
            }

            $query = Maintenance::with(['asset', 'asset.unit', 'validator', 'completedBy'])
                ->select('maintenances.*');

            // Filter berdasarkan role
            if ($user->role === 'Admin Unit') {
                $query->whereHas('asset', function($q) use ($user) {
                    $q->where('unit_id', $user->unit_id);
                });
            } elseif ($request->has('unit_id') && $request->unit_id !== 'all') {
                $query->whereHas('asset', function($q) use ($request) {
                    $q->where('unit_id', $request->unit_id);
                });
            }

            // Filter by type
            if ($request->has('type') && $request->type) {
                $query->where('type', $request->type);
            }

            // Filter by status
            if ($request->has('status') && $request->status) {
                $query->where('status', $request->status);
            }

            // Filter by date range
            if ($request->has('start_date') && $request->start_date) {
                $query->where('date', '>=', $request->start_date);
            }
            if ($request->has('end_date') && $request->end_date) {
                $query->where('date', '<=', $request->end_date);
            }

            // Filter by month and year
            if ($request->has('month') && $request->month) {
                $query->whereMonth('date', $request->month);
            }
            if ($request->has('year') && $request->year) {
                $query->whereYear('date', $request->year);
            }

            $query->where('type', 'Pemeliharaan');

            $maintenances = $query->orderBy('date', 'desc')->get();

            $reportData = $maintenances->map(function ($maintenance) {
                return [
                    'id' => $maintenance->id,
                    'asset_tag' => $maintenance->asset ? $maintenance->asset->asset_tag : 'N/A',
                    'asset_name' => $maintenance->asset ? $maintenance->asset->name : 'N/A',
                    'unit_name' => $maintenance->asset && $maintenance->asset->unit
                        ? $maintenance->asset->unit->name
                        : 'N/A',
                    'type' => $maintenance->type,
                    'date' => $maintenance->date,
                    'description' => $maintenance->description,
                    'party_type' => $maintenance->party_type,
                    'instansi' => $maintenance->instansi,
                    'status' => $maintenance->status,
                    'validation_status' => $maintenance->validation_status,
                    'validated_by' => $maintenance->validator ? $maintenance->validator->name : null,
                    'validation_date' => $maintenance->validation_date,
                    'completion_date' => $maintenance->completion_date,
                    'completed_by' => $maintenance->completedBy ? $maintenance->completedBy->name : null,
                ];
            });

            return response()->json([
                'success' => true,
                'message' => 'Laporan pemeliharaan asset berhasil diambil',
                'data' => $reportData,
                'summary' => [
                    'total_maintenances' => $reportData->count(),
                    'pending' => $reportData->where('status', 'PENDING')->count(),
                    'in_progress' => $reportData->where('status', 'IN_PROGRESS')->count(),
                    'completed' => $reportData->where('status', 'COMPLETED')->count(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error in getMaintenanceReport', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil laporan pemeliharaan: ' . $e->getMessage(),
                'error' => $e->getMessage(),
                'data' => []
            ], 500);
        }
    }

    /**
     * Get laporan perbaikan asset
     */
    public function getRepairReport(Request $request)
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User tidak terautentikasi',
                    'data' => []
                ], 401);
            }

            // PERBAIKAN: Inisialisasi query yang benar
            $query = Maintenance::with(['asset', 'asset.unit', 'validator', 'completedBy'])
                ->select('maintenances.*');

            // Filter berdasarkan role
            if ($user->role === 'Admin Unit') {
                $query->whereHas('asset', function($q) use ($user) {
                    $q->where('unit_id', $user->unit_id);
                });
            } elseif ($request->has('unit_id') && $request->unit_id !== 'all') {
                $query->whereHas('asset', function($q) use ($request) {
                    $q->where('unit_id', $request->unit_id);
                });
            }

            // Filter by status
            if ($request->has('status') && $request->status) {
                $query->where('status', $request->status);
            }

            // Filter by date range
            if ($request->has('start_date') && $request->start_date) {
                $query->where('date', '>=', $request->start_date);
            }
            if ($request->has('end_date') && $request->end_date) {
                $query->where('date', '<=', $request->end_date);
            }

            // Filter by month and year
            if ($request->has('month') && $request->month) {
                $query->whereMonth('date', $request->month);
            }
            if ($request->has('year') && $request->year) {
                $query->whereYear('date', $request->year);
            }

            // Only type Perbaikan
            $query->where('type', 'Perbaikan');

            $repairs = $query->orderBy('date', 'desc')->get();

            $reportData = $repairs->map(function ($repair) {
                return [
                    'id' => $repair->id,
                    'asset_tag' => $repair->asset ? $repair->asset->asset_tag : 'N/A',
                    'asset_name' => $repair->asset ? $repair->asset->name : 'N/A',
                    'unit_name' => $repair->asset && $repair->asset->unit
                        ? $repair->asset->unit->name
                        : 'N/A',
                    'type' => $repair->type,
                    'date' => $repair->date,
                    'description' => $repair->description,
                    'party_type' => $repair->party_type,
                    'instansi' => $repair->instansi,
                    'status' => $repair->status,
                    'validation_status' => $repair->validation_status,
                    'validated_by' => $repair->validator ? $repair->validator->name : null,
                    'validation_date' => $repair->validation_date,
                    'completion_date' => $repair->completion_date,
                    'completed_by' => $repair->completedBy ? $repair->completedBy->name : null,
                ];
            });

            return response()->json([
                'success' => true,
                'message' => 'Laporan perbaikan asset berhasil diambil',
                'data' => $reportData,
                'summary' => [
                    'total_repairs' => $reportData->count(),
                    'pending' => $reportData->where('status', 'PENDING')->count(),
                    'in_progress' => $reportData->where('status', 'IN_PROGRESS')->count(),
                    'completed' => $reportData->where('status', 'COMPLETED')->count(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error in getRepairReport', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil laporan perbaikan: ' . $e->getMessage(),
                'error' => $e->getMessage(),
                'data' => []
            ], 500);
        }
    }

    /**
     * Get laporan peminjaman asset
     */
    public function getLoanReport(Request $request)
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User tidak terautentikasi',
                    'data' => []
                ], 401);
            }

            $query = AssetLoan::with(['asset', 'asset.unit', 'borrower', 'approver', 'returnVerifier'])
                ->select('asset_loans.*');

            // Filter berdasarkan role - cek unit dari asset
            if ($user->role === 'Admin Unit') {
                $query->whereHas('asset', function($q) use ($user) {
                    $q->where('unit_id', $user->unit_id);
                });
            } elseif ($request->has('unit_id') && $request->unit_id !== 'all') {
                $query->whereHas('asset', function($q) use ($request) {
                    $q->where('unit_id', $request->unit_id);
                });
            }

            // Filter by status
            if ($request->has('status') && $request->status) {
                $query->where('status', $request->status);
            }

            // Filter by date range
            if ($request->has('start_date') && $request->start_date) {
                $query->where('request_date', '>=', $request->start_date);
            }
            if ($request->has('end_date') && $request->end_date) {
                $query->where('request_date', '<=', $request->end_date);
            }

            // Filter by month and year
            if ($request->has('month') && $request->month) {
                $query->whereMonth('request_date', $request->month);
            }
            if ($request->has('year') && $request->year) {
                $query->whereYear('request_date', $request->year);
            }

            $loans = $query->orderBy('request_date', 'desc')->get();

            $reportData = $loans->map(function ($loan) {
                return [
                    'id' => $loan->id,
                    'asset_tag' => $loan->asset ? $loan->asset->asset_tag : 'N/A',
                    'asset_name' => $loan->asset ? $loan->asset->name : 'N/A',
                    'unit_name' => $loan->asset && $loan->asset->unit
                        ? $loan->asset->unit->name
                        : 'N/A',
                    'borrower_name' => $loan->borrower ? $loan->borrower->name : 'N/A',
                    'request_date' => $loan->request_date,
                    'loan_date' => $loan->loan_date,
                    'start_time' => $loan->start_time,
                    'end_time' => $loan->end_time,
                    'expected_return_date' => $loan->expected_return_date,
                    'actual_return_date' => $loan->actual_return_date,
                    'purpose' => $loan->purpose,
                    'status' => $loan->status,
                    'approved_by' => $loan->approver ? $loan->approver->name : null,
                    'approval_date' => $loan->approval_date,
                    'return_condition' => $loan->return_condition,
                    'return_verified_by' => $loan->returnVerifier ? $loan->returnVerifier->name : null,
                    'return_verification_date' => $loan->return_verification_date,
                    'is_overdue' => $loan->status === 'APPROVED' &&
                        $loan->expected_return_date &&
                        now()->toDateString() > $loan->expected_return_date,
                ];
            });

            return response()->json([
                'success' => true,
                'message' => 'Laporan peminjaman asset berhasil diambil',
                'data' => $reportData,
                'summary' => [
                    'total_loans' => $reportData->count(),
                    'pending' => $reportData->where('status', 'PENDING')->count(),
                    'approved' => $reportData->where('status', 'APPROVED')->count(),
                    'returned' => $reportData->where('status', 'RETURNED')->count(),
                    'rejected' => $reportData->where('status', 'REJECTED')->count(),
                    'lost' => $reportData->where('status', 'LOST')->count(),
                    'overdue' => $reportData->where('is_overdue', true)->count(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error in getLoanReport', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil laporan peminjaman: ' . $e->getMessage(),
                'error' => $e->getMessage(),
                'data' => []
            ], 500);
        }
    }

    /**
     * Get laporan kerusakan asset
     */
    public function getDamageReport(Request $request)
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User tidak terautentikasi',
                    'data' => []
                ], 401);
            }

            $query = IncidentReport::with(['asset', 'asset.unit', 'reporter', 'reviewer'])
                ->where('type', 'Damage')
                ->select('incident_reports.*');

            // Filter berdasarkan role
            if ($user->role === 'Admin Unit') {
                $query->whereHas('asset', function($q) use ($user) {
                    $q->where('unit_id', $user->unit_id);
                });
            } elseif ($request->has('unit_id') && $request->unit_id !== 'all') {
                $query->whereHas('asset', function($q) use ($request) {
                    $q->where('unit_id', $request->unit_id);
                });
            }

            // Filter by status
            if ($request->has('status') && $request->status) {
                $query->where('status', $request->status);
            }

            // Filter by date range
            if ($request->has('start_date') && $request->start_date) {
                $query->where('date', '>=', $request->start_date);
            }
            if ($request->has('end_date') && $request->end_date) {
                $query->where('date', '<=', $request->end_date);
            }

            // Filter by month and year
            if ($request->has('month') && $request->month) {
                $query->whereMonth('date', $request->month);
            }
            if ($request->has('year') && $request->year) {
                $query->whereYear('date', $request->year);
            }

            $damages = $query->orderBy('date', 'desc')->get();

            $reportData = $damages->map(function ($damage) {
                return [
                    'id' => $damage->id,
                    'asset_tag' => $damage->asset ? $damage->asset->asset_tag : 'N/A',
                    'asset_name' => $damage->asset ? $damage->asset->name : 'N/A',
                    'unit_name' => $damage->asset && $damage->asset->unit
                        ? $damage->asset->unit->name
                        : 'N/A',
                    'type' => $damage->type,
                    'reporter_name' => $damage->reporter ? $damage->reporter->name : 'N/A',
                    'date' => $damage->date,
                    'description' => $damage->description,
                    'status' => $damage->status,
                    'reviewed_by' => $damage->reviewer ? $damage->reviewer->name : null,
                    'review_date' => $damage->review_date,
                    'resolution_notes' => $damage->resolution_notes,
                    'responsible_party' => $damage->responsible_party,
                ];
            });

            return response()->json([
                'success' => true,
                'message' => 'Laporan kerusakan asset berhasil diambil',
                'data' => $reportData,
                'summary' => [
                    'total_damages' => $reportData->count(),
                    'pending' => $reportData->where('status', 'PENDING')->count(),
                    'under_review' => $reportData->where('status', 'UNDER_REVIEW')->count(),
                    'resolved' => $reportData->where('status', 'RESOLVED')->count(),
                    'closed' => $reportData->where('status', 'CLOSED')->count(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error in getDamageReport', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil laporan kerusakan: ' . $e->getMessage(),
                'error' => $e->getMessage(),
                'data' => []
            ], 500);
        }
    }

    /**
     * Get laporan penjualan asset
     */
    public function getSaleReport(Request $request)
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User tidak terautentikasi',
                    'data' => []
                ], 401);
            }

            $query = AssetSale::with(['asset', 'asset.unit', 'soldBy'])
                ->select('asset_sales.*');

            // Filter berdasarkan role
            if ($user->role === 'Admin Unit') {
                $query->whereHas('asset', function($q) use ($user) {
                    $q->where('unit_id', $user->unit_id);
                });
            } elseif ($request->has('unit_id') && $request->unit_id !== 'all') {
                $query->whereHas('asset', function($q) use ($request) {
                    $q->where('unit_id', $request->unit_id);
                });
            }

            // Filter by date range
            if ($request->has('start_date') && $request->start_date) {
                $query->where('sale_date', '>=', $request->start_date);
            }
            if ($request->has('end_date') && $request->end_date) {
                $query->where('sale_date', '<=', $request->end_date);
            }

            // Filter by month and year
            if ($request->has('month') && $request->month) {
                $query->whereMonth('sale_date', $request->month);
            }
            if ($request->has('year') && $request->year) {
                $query->whereYear('sale_date', $request->year);
            }

            $sales = $query->orderBy('sale_date', 'desc')->get();

            $reportData = $sales->map(function ($sale) {
                // Get asset book value at sale date
                $assetValue = $sale->asset ? $sale->asset->value : 0;
                $accumulatedDepreciation = $sale->asset
                    ? $sale->asset->depreciations()->sum('depreciation_amount')
                    : 0;
                $bookValue = $assetValue - $accumulatedDepreciation;
                $profitLoss = $sale->sale_price - $bookValue;

                return [
                    'id' => $sale->id,
                    'asset_tag' => $sale->asset ? $sale->asset->asset_tag : 'N/A',
                    'asset_name' => $sale->asset ? $sale->asset->name : 'N/A',
                    'unit_name' => $sale->asset && $sale->asset->unit
                        ? $sale->asset->unit->name
                        : 'N/A',
                    'original_value' => (float) $assetValue,
                    'book_value' => max(0, (float) $bookValue),
                    'sale_price' => (float) $sale->sale_price,
                    'profit_loss' => (float) $profitLoss,
                    'sale_date' => $sale->sale_date,
                    'buyer_name' => $sale->buyer_name,
                    'buyer_contact' => $sale->buyer_contact,
                    'reason' => $sale->reason,
                    'notes' => $sale->notes,
                    'sold_by' => $sale->soldBy ? $sale->soldBy->name : 'N/A',
                ];
            });

            return response()->json([
                'success' => true,
                'message' => 'Laporan penjualan asset berhasil diambil',
                'data' => $reportData,
                'summary' => [
                    'total_sales' => $reportData->count(),
                    'total_revenue' => $reportData->sum('sale_price'),
                    'total_profit' => $reportData->where('profit_loss', '>', 0)->sum('profit_loss'),
                    'total_loss' => abs($reportData->where('profit_loss', '<', 0)->sum('profit_loss')),
                    'net_profit_loss' => $reportData->sum('profit_loss'),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error in getSaleReport', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil laporan penjualan: ' . $e->getMessage(),
                'error' => $e->getMessage(),
                'data' => []
            ], 500);
        }
    }

    /**
     * Get laporan kehilangan asset
     */
    public function getLossReport(Request $request)
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User tidak terautentikasi',
                    'data' => []
                ], 401);
            }

            $query = IncidentReport::with(['asset', 'asset.unit', 'reporter', 'reviewer'])
                ->where('type', 'Loss')
                ->select('incident_reports.*');

            // Filter berdasarkan role
            if ($user->role === 'Admin Unit') {
                $query->whereHas('asset', function($q) use ($user) {
                    $q->where('unit_id', $user->unit_id);
                });
            } elseif ($request->has('unit_id') && $request->unit_id !== 'all') {
                $query->whereHas('asset', function($q) use ($request) {
                    $q->where('unit_id', $request->unit_id);
                });
            }

            // Filter by status
            if ($request->has('status') && $request->status) {
                $query->where('status', $request->status);
            }

            // Filter by date range
            if ($request->has('start_date') && $request->start_date) {
                $query->where('date', '>=', $request->start_date);
            }
            if ($request->has('end_date') && $request->end_date) {
                $query->where('date', '<=', $request->end_date);
            }

            // Filter by month and year
            if ($request->has('month') && $request->month) {
                $query->whereMonth('date', $request->month);
            }
            if ($request->has('year') && $request->year) {
                $query->whereYear('date', $request->year);
            }

            $losses = $query->orderBy('date', 'desc')->get();

            $reportData = $losses->map(function ($loss) {
                // Calculate asset value at loss date
                $assetValue = $loss->asset ? $loss->asset->value : 0;
                $accumulatedDepreciation = $loss->asset
                    ? $loss->asset->depreciations()->sum('depreciation_amount')
                    : 0;
                $currentValue = $assetValue - $accumulatedDepreciation;

                return [
                    'id' => $loss->id,
                    'asset_tag' => $loss->asset ? $loss->asset->asset_tag : 'N/A',
                    'asset_name' => $loss->asset ? $loss->asset->name : 'N/A',
                    'unit_name' => $loss->asset && $loss->asset->unit
                        ? $loss->asset->unit->name
                        : 'N/A',
                    'original_value' => (float) $assetValue,
                    'value_at_loss' => max(0, (float) $currentValue),
                    'type' => $loss->type,
                    'reporter_name' => $loss->reporter ? $loss->reporter->name : 'N/A',
                    'date' => $loss->date,
                    'description' => $loss->description,
                    'status' => $loss->status,
                    'reviewed_by' => $loss->reviewer ? $loss->reviewer->name : null,
                    'review_date' => $loss->review_date,
                    'resolution_notes' => $loss->resolution_notes,
                    'responsible_party' => $loss->responsible_party,
                ];
            });

            return response()->json([
                'success' => true,
                'message' => 'Laporan kehilangan asset berhasil diambil',
                'data' => $reportData,
                'summary' => [
                    'total_losses' => $reportData->count(),
                    'total_value_lost' => $reportData->sum('value_at_loss'),
                    'pending' => $reportData->where('status', 'PENDING')->count(),
                    'under_review' => $reportData->where('status', 'UNDER_REVIEW')->count(),
                    'resolved' => $reportData->where('status', 'RESOLVED')->count(),
                    'closed' => $reportData->where('status', 'CLOSED')->count(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error in getLossReport', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil laporan kehilangan: ' . $e->getMessage(),
                'error' => $e->getMessage(),
                'data' => []
            ], 500);
        }
    }

    /**
     * Get laporan semua jenis report (untuk testing)
     */
    public function getAllReports(Request $request)
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User tidak terautentikasi'
                ], 401);
            }

            $reports = [
                'assets' => $this->getFullAssetReport($request)->getData(true),
                'maintenance' => $this->getMaintenanceReport($request)->getData(true),
                'repair' => $this->getRepairReport($request)->getData(true),
                'loan' => $this->getLoanReport($request)->getData(true),
                'damage' => $this->getDamageReport($request)->getData(true),
                'sale' => $this->getSaleReport($request)->getData(true),
                'loss' => $this->getLossReport($request)->getData(true),
            ];

            return response()->json([
                'success' => true,
                'message' => 'Semua laporan berhasil diambil',
                'data' => $reports
            ]);

        } catch (\Exception $e) {
            Log::error('Error in getAllReports', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil semua laporan: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }
}