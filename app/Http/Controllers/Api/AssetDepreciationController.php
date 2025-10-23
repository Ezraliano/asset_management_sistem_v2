<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Services\DepreciationService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class AssetDepreciationController extends Controller
{
    public function __construct(private DepreciationService $depreciationService)
    {
    }

    /**
     * Get depresiasi data untuk asset tertentu
     */
    public function show($assetId)
    {
        try {
            Log::info("🔄 Fetching depreciation for asset: {$assetId}");
            
            $asset = Asset::with(['depreciations' => function($query) {
                $query->orderBy('month_sequence', 'asc');
            }])->find($assetId);
            
            if (!$asset) {
                Log::warning("❌ Asset not found: {$assetId}");
                return response()->json([
                    'success' => false,
                    'message' => 'Asset not found'
                ], Response::HTTP_NOT_FOUND);
            }

            $depreciationSummary = $this->depreciationService->getDepreciationSummary($asset);

            Log::info("✅ Successfully fetched depreciation for asset: {$assetId}");
            return response()->json([
                'success' => true,
                'data' => $depreciationSummary
            ]);

        } catch (\Exception $e) {
            Log::error("❌ Error getting depreciation for asset {$assetId}: " . $e->getMessage());
            Log::error("📋 Stack trace: " . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to get depreciation data: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Generate depresiasi untuk asset tertentu (manual)
     */
    public function generateForAsset($assetId)
    {
        try {
            DB::beginTransaction();
            
            Log::info("🔄 Generating depreciation for asset: {$assetId}");
            
            $asset = Asset::with('depreciations')->find($assetId);
            
            if (!$asset) {
                Log::warning("❌ Asset not found: {$assetId}");
                return response()->json([
                    'success' => false,
                    'message' => 'Asset not found'
                ], Response::HTTP_NOT_FOUND);
            }

            // Cek status asset terlebih dahulu
            if (in_array($asset->status, ['Disposed', 'Lost'])) {
                Log::warning("⏸️ Asset {$assetId} is not active, status: {$asset->status}");
                return response()->json([
                    'success' => false,
                    'message' => "Cannot generate depreciation for asset with status: {$asset->status}"
                ], Response::HTTP_BAD_REQUEST);
            }

            // ✅ VALIDASI WAKTU: Cek apakah sudah waktunya untuk depresiasi
            if (!$this->depreciationService->canGenerateManualDepreciation($asset)) {
                $status = $this->depreciationService->getDepreciationStatus($asset);
                $pendingMonths = $asset->getPendingDepreciationMonths();

                Log::warning("⏸️ Asset {$assetId} cannot generate depreciation - pending months: {$pendingMonths}");

                return response()->json([
                    'success' => false,
                    'message' => $pendingMonths <= 0
                        ? "Cannot generate depreciation - next depreciation date has not arrived yet. Next date: {$status['status_details']['current_date']}"
                        : "Cannot generate depreciation - asset may be fully depreciated or reached useful life limit",
                    'data' => [
                        'pending_months' => $pendingMonths,
                        'next_depreciation_date' => $status['next_depreciation_date'] ?? null,
                        'current_date' => Carbon::now('Asia/Jakarta')->format('Y-m-d H:i:s'),
                        'can_generate' => false
                    ]
                ], Response::HTTP_BAD_REQUEST);
            }

            // Generate hanya 1 bulan depresiasi setiap klik
            $count = $this->depreciationService->generateSingleDepreciation($asset);
            
            $updatedSummary = $this->depreciationService->getDepreciationSummary($asset);
            
            DB::commit();

            if ($count > 0) {
                Log::info("✅ Successfully generated depreciation for asset: {$assetId}, new sequence: {$updatedSummary['depreciated_months']}");
                
                return response()->json([
                    'success' => true,
                    'message' => "Depreciation generated successfully for month " . $updatedSummary['depreciated_months'],
                    'data' => $updatedSummary
                ]);
            } else {
                Log::info("ℹ️ No depreciation generated for asset: {$assetId}");

                // Dapatkan status detail untuk informasi lebih lengkap
                $status = $this->depreciationService->getDepreciationStatus($asset);

                // ✅ PERBAIKAN: Return success=false karena tidak ada depresiasi yang dibuat
                return response()->json([
                    'success' => false,
                    'message' => "Asset belum waktunya terdepresiasi",
                    'data' => $updatedSummary,
                    'debug_info' => [
                        'next_sequence' => $status['next_sequence'],
                        'can_generate_manual' => $status['can_generate_manual'],
                        'remaining_months' => $status['remaining_months'],
                        'current_value' => $status['current_value'],
                        'is_fully_depreciated' => $this->depreciationService->isFullyDepreciated($asset),
                        'pending_months' => $status['pending_depreciation_months'] ?? 0
                    ]
                ], Response::HTTP_OK); // 200 OK tapi success=false
            }
            
        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error("❌ Error generating depreciation for asset {$assetId}: " . $e->getMessage());
            Log::error("📋 Stack trace: " . $e->getTraceAsString());
            
            // Handle specific error types
            $errorMessage = 'Failed to generate depreciation';
            $statusCode = Response::HTTP_INTERNAL_SERVER_ERROR;
            
            if (str_contains($e->getMessage(), 'unique') || str_contains($e->getMessage(), 'duplicate')) {
                $errorMessage = 'Depreciation record already exists for this period';
                $statusCode = Response::HTTP_CONFLICT;
            } elseif (str_contains($e->getMessage(), 'useful life') || str_contains($e->getMessage(), 'maximum')) {
                $errorMessage = 'Maximum depreciation period reached';
                $statusCode = Response::HTTP_BAD_REQUEST;
            }
            
            return response()->json([
                'success' => false,
                'message' => $errorMessage . ': ' . $e->getMessage()
            ], $statusCode);
        }
    }

    /**
     * ✅ METHOD BARU: Generate depresiasi yang tertunda berdasarkan purchase date
     */
    public function generatePendingForAsset($assetId)
    {
        try {
            DB::beginTransaction();
            
            Log::info("🔄 Generating PENDING depreciation for asset: {$assetId}");
            
            $asset = Asset::with('depreciations')->find($assetId);
            
            if (!$asset) {
                Log::warning("❌ Asset not found: {$assetId}");
                return response()->json([
                    'success' => false,
                    'message' => 'Asset not found'
                ], Response::HTTP_NOT_FOUND);
            }

            // Cek status asset
            if (in_array($asset->status, ['Disposed', 'Lost'])) {
                Log::warning("⏸️ Asset {$assetId} is not active, status: {$asset->status}");
                return response()->json([
                    'success' => false,
                    'message' => "Cannot generate depreciation for asset with status: {$asset->status}"
                ], Response::HTTP_BAD_REQUEST);
            }

            $pendingMonthsBefore = $asset->getPendingDepreciationMonths();
            $processed = $this->depreciationService->generatePendingDepreciation($asset);
            
            // Refresh data untuk mendapatkan summary terbaru
            $asset->refresh();
            $asset->load('depreciations');
            $updatedSummary = $this->depreciationService->getDepreciationSummary($asset);
            
            DB::commit();

            Log::info("✅ Successfully generated {$processed} PENDING depreciations for asset: {$assetId}");
            
            return response()->json([
                'success' => true,
                'message' => "Generated {$processed} pending depreciation(s) based on purchase date",
                'data' => $updatedSummary,
                'processed_count' => $processed,
                'pending_info' => [
                    'pending_months_before' => $pendingMonthsBefore,
                    'pending_months_after' => $asset->getPendingDepreciationMonths(),
                    'elapsed_months' => $asset->getElapsedMonths(),
                    'expected_months' => $asset->getExpectedDepreciationMonths(),
                    'is_up_to_date' => $asset->getPendingDepreciationMonths() === 0
                ]
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error("❌ Error generating pending depreciation for asset {$assetId}: " . $e->getMessage());
            Log::error("📋 Stack trace: " . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate pending depreciation: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Generate multiple depreciations sekaligus
     */
    public function generateMultipleForAsset($assetId, Request $request)
    {
        try {
            DB::beginTransaction();
            
            Log::info("🔄 Generating multiple depreciations for asset: {$assetId}");
            
            // Validasi input
            $validator = Validator::make($request->all(), [
                'count' => 'required|integer|min:1|max:60' // Maksimal 5 tahun
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], Response::HTTP_BAD_REQUEST);
            }

            $count = $request->input('count', 1);
            $asset = Asset::with('depreciations')->find($assetId);
            
            if (!$asset) {
                Log::warning("❌ Asset not found: {$assetId}");
                return response()->json([
                    'success' => false,
                    'message' => 'Asset not found'
                ], Response::HTTP_NOT_FOUND);
            }

            // Cek status asset
            if (in_array($asset->status, ['Disposed', 'Lost'])) {
                Log::warning("⏸️ Asset {$assetId} is not active, status: {$asset->status}");
                return response()->json([
                    'success' => false,
                    'message' => "Cannot generate depreciation for asset with status: {$asset->status}"
                ], Response::HTTP_BAD_REQUEST);
            }

            $processed = $this->depreciationService->generateMultipleDepreciations($asset, $count);
            $updatedSummary = $this->depreciationService->getDepreciationSummary($asset);
            
            DB::commit();

            if ($processed > 0) {
                Log::info("✅ Successfully generated {$processed} depreciations for asset: {$assetId}");
                
                return response()->json([
                    'success' => true,
                    'message' => "Successfully generated {$processed} depreciation(s)",
                    'data' => $updatedSummary,
                    'processed_count' => $processed,
                    'remaining_depreciable_amount' => $this->depreciationService->getRemainingDepreciableAmount($asset),
                    'is_fully_depreciated' => $this->depreciationService->isFullyDepreciated($asset)
                ]);
            } else {
                Log::info("ℹ️ No depreciations generated for asset: {$assetId}");
                
                $status = $this->depreciationService->getDepreciationStatus($asset);
                
                return response()->json([
                    'success' => true,
                    'message' => "No depreciations generated",
                    'data' => $updatedSummary,
                    'processed_count' => 0,
                    'debug_info' => [
                        'next_sequence' => $status['next_sequence'],
                        'can_generate_manual' => $status['can_generate_manual'],
                        'remaining_months' => $status['remaining_months'],
                        'current_value' => $status['current_value'],
                        'is_fully_depreciated' => $this->depreciationService->isFullyDepreciated($asset)
                    ]
                ]);
            }
            
        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error("❌ Error generating multiple depreciations for asset {$assetId}: " . $e->getMessage());
            Log::error("📋 Stack trace: " . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate depreciations: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Generate depresiasi sampai nilai asset 0
     */
    public function generateUntilZero($assetId)
    {
        try {
            DB::beginTransaction();
            
            Log::info("🔄 Generating depreciation until zero for asset: {$assetId}");
            
            $asset = Asset::with('depreciations')->find($assetId);
            
            if (!$asset) {
                Log::warning("❌ Asset not found: {$assetId}");
                return response()->json([
                    'success' => false,
                    'message' => 'Asset not found'
                ], Response::HTTP_NOT_FOUND);
            }

            // Cek status asset
            if (in_array($asset->status, ['Disposed', 'Lost'])) {
                Log::warning("⏸️ Asset {$assetId} is not active, status: {$asset->status}");
                return response()->json([
                    'success' => false,
                    'message' => "Cannot generate depreciation for asset with status: {$asset->status}"
                ], Response::HTTP_BAD_REQUEST);
            }

            $processed = $this->depreciationService->generateDepreciationUntilZero($asset);
            
            // Refresh asset data untuk mendapatkan summary terbaru
            $asset->refresh();
            $asset->load('depreciations');
            $updatedSummary = $this->depreciationService->getDepreciationSummary($asset);
            
            DB::commit();

            Log::info("✅ Successfully generated {$processed} depreciations until zero for asset: {$assetId}");
            
            return response()->json([
                'success' => true,
                'message' => "Generated {$processed} depreciation(s) until zero value",
                'data' => $updatedSummary,
                'processed_count' => $processed,
                'reached_zero' => $updatedSummary['current_value'] <= 0,
                'is_fully_depreciated' => $this->depreciationService->isFullyDepreciated($asset),
                'total_depreciated_amount' => $this->depreciationService->getTotalDepreciatedAmount($asset)
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error("❌ Error generating depreciation until zero for asset {$assetId}: " . $e->getMessage());
            Log::error("📋 Stack trace: " . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate depreciation until zero: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Generate depresiasi untuk semua asset (manual)
     */
    public function generateAll(Request $request)
    {
        try {
            Log::info("🔄 Generating depreciation for all assets");

            $result = $this->depreciationService->generateAllPendingDepreciation();

            Log::info("✅ Successfully generated depreciation for {$result['total_assets_processed']} asset(s) ({$result['total_months_processed']} months total)");

            return response()->json([
                'success' => true,
                'message' => "Depreciation generated for {$result['total_assets_processed']} asset(s)",
                'data' => [
                    'processed_count' => $result['total_assets_processed'],
                    'total_months_processed' => $result['total_months_processed'],
                    'total_assets_checked' => $result['total_assets_checked'],
                    'timestamp' => now()->toDateTimeString()
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("❌ Error generating all depreciation: " . $e->getMessage());
            Log::error("📋 Stack trace: " . $e->getTraceAsString());

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate depreciation: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * ✅ METHOD BARU: Generate batch pending depreciation untuk semua asset
     */
    public function generateBatchPending(Request $request)
    {
        try {
            Log::info("🔄 Generating BATCH pending depreciation for all assets");
            
            $results = $this->depreciationService->generateBatchPendingDepreciation();

            Log::info("✅ Batch pending depreciation completed. Total processed: {$results['total_processed']} months across {$results['assets_processed']} assets");
            
            return response()->json([
                'success' => true,
                'message' => "Batch depreciation completed. Processed {$results['total_processed']} months across {$results['assets_processed']} assets",
                'data' => $results
            ]);

        } catch (\Exception $e) {
            Log::error("❌ Error generating batch pending depreciation: " . $e->getMessage());
            Log::error("📋 Stack trace: " . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate batch depreciation: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get depresiasi preview (hitung tanpa save)
     */
    public function preview($assetId)
    {
        try {
            Log::info("🔄 Getting depreciation preview for asset: {$assetId}");
            
            $asset = Asset::find($assetId);
            
            if (!$asset) {
                Log::warning("❌ Asset not found: {$assetId}");
                return response()->json([
                    'success' => false,
                    'message' => 'Asset not found'
                ], Response::HTTP_NOT_FOUND);
            }

            $preview = $this->depreciationService->calculateDepreciationPreview($asset);

            Log::info("✅ Successfully generated depreciation preview for asset: {$assetId}");
            
            return response()->json([
                'success' => true,
                'data' => $preview
            ]);

        } catch (\Exception $e) {
            Log::error("❌ Error getting depreciation preview for asset {$assetId}: " . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to get depreciation preview: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get depresiasi status untuk asset
     */
    public function getStatus($assetId)
    {
        try {
            Log::info("🔄 Getting depreciation status for asset: {$assetId}");
            
            $asset = Asset::with('depreciations')->find($assetId);
            
            if (!$asset) {
                Log::warning("❌ Asset not found: {$assetId}");
                return response()->json([
                    'success' => false,
                    'message' => 'Asset not found'
                ], Response::HTTP_NOT_FOUND);
            }

            $status = $this->depreciationService->getDepreciationStatus($asset);
            $summary = $this->depreciationService->getDepreciationSummary($asset);
            
            $responseData = [
                'asset_id' => $asset->id,
                'asset_tag' => $asset->asset_tag,
                'asset_name' => $asset->name,
                'purchase_date' => $asset->purchase_date,
                'original_value' => (float) $asset->value,
                'useful_life' => $asset->useful_life,
                'current_book_value' => $summary['current_value'],
                'accumulated_depreciation' => $summary['accumulated_depreciation'],
                'monthly_depreciation' => $summary['monthly_depreciation'],
                'depreciated_months' => $summary['depreciated_months'],
                'remaining_months' => $summary['remaining_months'],
                'completion_percentage' => $summary['completion_percentage'],
                'is_depreciable' => $summary['is_depreciable'],
                'next_depreciation_date' => $summary['next_depreciation_date'],
                'can_generate_more' => $summary['is_depreciable'] && $summary['remaining_months'] > 0 && $summary['current_value'] > 0,
                'is_fully_depreciated' => $this->depreciationService->isFullyDepreciated($asset),
                'remaining_depreciable_amount' => $this->depreciationService->getRemainingDepreciableAmount($asset),
                'total_depreciated_amount' => $this->depreciationService->getTotalDepreciatedAmount($asset),
                'depreciation_schedule' => $this->depreciationService->getDepreciationSchedule($asset),
                // ✅ DATA BARU: Informasi bulan tertunda
                'elapsed_months_since_purchase' => $asset->getElapsedMonths(),
                'pending_depreciation_months' => $asset->getPendingDepreciationMonths(),
                'expected_depreciated_months' => $asset->getExpectedDepreciationMonths(),
                'is_up_to_date' => $asset->getPendingDepreciationMonths() === 0,
                'status_details' => $status
            ];

            Log::info("✅ Successfully fetched depreciation status for asset: {$assetId}");
            
            return response()->json([
                'success' => true,
                'data' => $responseData
            ]);

        } catch (\Exception $e) {
            Log::error("❌ Error getting depreciation status for asset {$assetId}: " . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to get depreciation status: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Reset depresiasi untuk asset tertentu
     */
    public function resetForAsset($assetId)
    {
        try {
            DB::beginTransaction();
            
            Log::info("🔄 Resetting depreciation for asset: {$assetId}");
            
            $asset = Asset::find($assetId);
            
            if (!$asset) {
                Log::warning("❌ Asset not found: {$assetId}");
                return response()->json([
                    'success' => false,
                    'message' => 'Asset not found'
                ], Response::HTTP_NOT_FOUND);
            }

            $success = $this->depreciationService->resetAssetDepreciation($asset);
            
            if ($success) {
                DB::commit();
                Log::info("✅ Successfully reset depreciation for asset: {$assetId}");
                
                return response()->json([
                    'success' => true,
                    'message' => 'Depreciation records reset successfully',
                    'data' => [
                        'asset_id' => $asset->id,
                        'asset_tag' => $asset->asset_tag,
                        'reset_at' => now()->toDateTimeString(),
                        'original_value' => (float) $asset->value,
                        'current_book_value' => (float) $asset->value,
                        'pending_depreciation_months' => $asset->getPendingDepreciationMonths()
                    ]
                ]);
            } else {
                DB::rollBack();
                Log::error("❌ Failed to reset depreciation for asset: {$assetId}");
                
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to reset depreciation records'
                ], Response::HTTP_INTERNAL_SERVER_ERROR);
            }

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error("❌ Error resetting depreciation for asset {$assetId}: " . $e->getMessage());
            Log::error("📋 Stack trace: " . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to reset depreciation: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Generate depresiasi hingga nilai tertentu
     */
    public function generateUntilValue($assetId, Request $request)
    {
        try {
            DB::beginTransaction();
            
            Log::info("🔄 Generating depreciation until target value for asset: {$assetId}");
            
            // Validasi input
            $validator = Validator::make($request->all(), [
                'target_value' => 'required|numeric|min:0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], Response::HTTP_BAD_REQUEST);
            }

            $targetValue = $request->input('target_value');
            $asset = Asset::with('depreciations')->find($assetId);
            
            if (!$asset) {
                Log::warning("❌ Asset not found: {$assetId}");
                return response()->json([
                    'success' => false,
                    'message' => 'Asset not found'
                ], Response::HTTP_NOT_FOUND);
            }

            // Cek status asset
            if (in_array($asset->status, ['Disposed', 'Lost'])) {
                Log::warning("⏸️ Asset {$assetId} is not active, status: {$asset->status}");
                return response()->json([
                    'success' => false,
                    'message' => "Cannot generate depreciation for asset with status: {$asset->status}"
                ], Response::HTTP_BAD_REQUEST);
            }

            // Validasi target value
            $currentValue = $this->depreciationService->calculateCurrentBookValue($asset);
            if ($targetValue >= $currentValue) {
                return response()->json([
                    'success' => false,
                    'message' => "Target value must be less than current book value ({$currentValue})"
                ], Response::HTTP_BAD_REQUEST);
            }

            $processed = $this->depreciationService->generateDepreciationUntilValue($asset, $targetValue);
            $finalSummary = $this->depreciationService->getDepreciationSummary($asset);
            
            DB::commit();

            if ($processed > 0) {
                Log::info("✅ Generated {$processed} depreciations for asset {$assetId}, current value: {$finalSummary['current_value']}");
                
                return response()->json([
                    'success' => true,
                    'message' => "Generated {$processed} depreciation(s). Current value: " . $finalSummary['current_value'],
                    'data' => $finalSummary,
                    'processed_count' => $processed,
                    'target_achieved' => $finalSummary['current_value'] <= $targetValue,
                    'remaining_depreciable_amount' => $this->depreciationService->getRemainingDepreciableAmount($asset)
                ]);
            } else {
                Log::info("ℹ️ No depreciations generated for asset {$assetId}, current value: {$finalSummary['current_value']}");
                
                return response()->json([
                    'success' => true,
                    'message' => "No depreciations needed. Current value: " . $finalSummary['current_value'],
                    'data' => $finalSummary,
                    'processed_count' => 0,
                    'target_achieved' => $finalSummary['current_value'] <= $targetValue,
                    'remaining_depreciable_amount' => $this->depreciationService->getRemainingDepreciableAmount($asset)
                ]);
            }
            
        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error("❌ Error generating depreciation until value for asset {$assetId}: " . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate depreciation: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get depresiasi schedule (jadwal masa depan)
     */
    public function getSchedule($assetId)
    {
        try {
            Log::info("🔄 Getting depreciation schedule for asset: {$assetId}");
            
            $asset = Asset::find($assetId);
            
            if (!$asset) {
                Log::warning("❌ Asset not found: {$assetId}");
                return response()->json([
                    'success' => false,
                    'message' => 'Asset not found'
                ], Response::HTTP_NOT_FOUND);
            }

            $schedule = $this->depreciationService->getDepreciationSchedule($asset);

            Log::info("✅ Successfully fetched depreciation schedule for asset: {$assetId}");
            
            return response()->json([
                'success' => true,
                'data' => [
                    'asset_id' => $asset->id,
                    'asset_tag' => $asset->asset_tag,
                    'asset_name' => $asset->name,
                    'purchase_date' => $asset->purchase_date,
                    'original_value' => (float) $asset->value,
                    'current_book_value' => $this->depreciationService->calculateCurrentBookValue($asset),
                    'monthly_depreciation' => $asset->calculateMonthlyDepreciation(),
                    'depreciation_schedule' => $schedule,
                    'total_future_depreciation' => array_sum(array_column($schedule, 'depreciation_amount')),
                    'remaining_useful_life' => $asset->useful_life - $asset->getLastDepreciationMonth()
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("❌ Error getting depreciation schedule for asset {$assetId}: " . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to get depreciation schedule: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get total depresiasi yang sudah dilakukan
     */
    public function getTotalDepreciated($assetId)
    {
        try {
            Log::info("🔄 Getting total depreciated amount for asset: {$assetId}");
            
            $asset = Asset::find($assetId);
            
            if (!$asset) {
                Log::warning("❌ Asset not found: {$assetId}");
                return response()->json([
                    'success' => false,
                    'message' => 'Asset not found'
                ], Response::HTTP_NOT_FOUND);
            }

            $totalDepreciated = $this->depreciationService->getTotalDepreciatedAmount($asset);
            $currentValue = $this->depreciationService->calculateCurrentBookValue($asset);

            Log::info("✅ Successfully fetched total depreciated amount for asset: {$assetId}");
            
            return response()->json([
                'success' => true,
                'data' => [
                    'asset_id' => $asset->id,
                    'asset_tag' => $asset->asset_tag,
                    'asset_name' => $asset->name,
                    'purchase_date' => $asset->purchase_date,
                    'original_value' => (float) $asset->value,
                    'current_book_value' => $currentValue,
                    'total_depreciated_amount' => $totalDepreciated,
                    'depreciation_percentage' => $asset->value > 0 ? ($totalDepreciated / $asset->value) * 100 : 0,
                    'is_fully_depreciated' => $this->depreciationService->isFullyDepreciated($asset),
                    'remaining_depreciable_amount' => $this->depreciationService->getRemainingDepreciableAmount($asset)
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("❌ Error getting total depreciated amount for asset {$assetId}: " . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to get total depreciated amount: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * ✅ METHOD BARU: Get system-wide depreciation summary
     */
    public function getSystemSummary()
    {
        try {
            Log::info("🔄 Getting system depreciation summary");
            
            $summary = $this->depreciationService->getSystemDepreciationSummary();

            Log::info("✅ Successfully fetched system depreciation summary");
            
            return response()->json([
                'success' => true,
                'data' => $summary
            ]);

        } catch (\Exception $e) {
            Log::error("❌ Error getting system depreciation summary: " . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to get system depreciation summary: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * ✅ METHOD BARU: Validate asset for depreciation
     */
    public function validateAsset($assetId)
    {
        try {
            Log::info("🔄 Validating asset for depreciation: {$assetId}");
            
            $asset = Asset::find($assetId);
            
            if (!$asset) {
                Log::warning("❌ Asset not found: {$assetId}");
                return response()->json([
                    'success' => false,
                    'message' => 'Asset not found'
                ], Response::HTTP_NOT_FOUND);
            }

            $validationResults = [];
            
            // Validasi status asset
            if (in_array($asset->status, ['Disposed', 'Lost'])) {
                $validationResults[] = [
                    'check' => 'asset_status',
                    'valid' => false,
                    'message' => "Asset status is '{$asset->status}' - cannot depreciate"
                ];
            } else {
                $validationResults[] = [
                    'check' => 'asset_status',
                    'valid' => true,
                    'message' => "Asset status is '{$asset->status}' - can depreciate"
                ];
            }

            // Validasi purchase date
            $purchaseDate = Carbon::parse($asset->purchase_date);
            $today = Carbon::today();
            
            if ($purchaseDate->greaterThan($today)) {
                $validationResults[] = [
                    'check' => 'purchase_date',
                    'valid' => false,
                    'message' => 'Purchase date is in the future - cannot depreciate'
                ];
            } else {
                $validationResults[] = [
                    'check' => 'purchase_date',
                    'valid' => true,
                    'message' => 'Purchase date is valid'
                ];
            }

            // Validasi useful life
            if ($asset->useful_life <= 0) {
                $validationResults[] = [
                    'check' => 'useful_life',
                    'valid' => false,
                    'message' => 'Useful life must be greater than 0'
                ];
            } else {
                $validationResults[] = [
                    'check' => 'useful_life',
                    'valid' => true,
                    'message' => 'Useful life is valid'
                ];
            }

            // Validasi value
            if ($asset->value <= 0) {
                $validationResults[] = [
                    'check' => 'asset_value',
                    'valid' => false,
                    'message' => 'Asset value must be greater than 0'
                ];
            } else {
                $validationResults[] = [
                    'check' => 'asset_value',
                    'valid' => true,
                    'message' => 'Asset value is valid'
                ];
            }

            // Validasi depresiasi status
            $canDepreciate = $this->depreciationService->canGenerateManualDepreciation($asset);
            $pendingMonths = $asset->getPendingDepreciationMonths();
            
            $validationResults[] = [
                'check' => 'depreciation_status',
                'valid' => $canDepreciate,
                'message' => $canDepreciate ? 
                    "Can generate depreciation ({$pendingMonths} months pending)" : 
                    "Cannot generate depreciation - fully depreciated or no pending months"
            ];

            $isValid = collect($validationResults)->every(fn($result) => $result['valid']);

            Log::info("✅ Asset validation completed for: {$assetId} - " . ($isValid ? 'VALID' : 'INVALID'));
            
            return response()->json([
                'success' => true,
                'valid' => $isValid,
                'validation_results' => $validationResults,
                'asset_info' => [
                    'asset_tag' => $asset->asset_tag,
                    'asset_name' => $asset->name,
                    'purchase_date' => $asset->purchase_date,
                    'original_value' => (float) $asset->value,
                    'useful_life' => $asset->useful_life,
                    'current_status' => $asset->status,
                    'pending_depreciation_months' => $pendingMonths,
                    'can_depreciate' => $canDepreciate
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("❌ Error validating asset {$assetId}: " . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to validate asset: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}