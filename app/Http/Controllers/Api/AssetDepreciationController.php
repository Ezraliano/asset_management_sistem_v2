<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Services\DepreciationService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

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
            Log::info("Fetching depreciation for asset: {$assetId}");
            
            $asset = Asset::with(['depreciations' => function($query) {
                $query->orderBy('month_sequence', 'asc');
            }])->find($assetId);
            
            if (!$asset) {
                return response()->json([
                    'success' => false,
                    'message' => 'Asset not found'
                ], Response::HTTP_NOT_FOUND);
            }

            $depreciationSummary = $this->depreciationService->getDepreciationSummary($asset);

            return response()->json([
                'success' => true,
                'data' => $depreciationSummary
            ]);
        } catch (\Exception $e) {
            Log::error("Error getting depreciation for asset {$assetId}: " . $e->getMessage());
            Log::error("Stack trace: " . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to get depreciation data: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Generate depresiasi untuk asset tertentu (manual) - DIPERBAIKI
     */
    public function generateForAsset($assetId)
    {
        try {
            DB::beginTransaction();
            
            Log::info("Generating depreciation for asset: {$assetId}");
            
            $asset = Asset::with('depreciations')->find($assetId);
            
            if (!$asset) {
                return response()->json([
                    'success' => false,
                    'message' => 'Asset not found'
                ], Response::HTTP_NOT_FOUND);
            }

            // ✅ PERBAIKAN: Generate hanya 1 bulan depresiasi setiap klik
            $count = $this->depreciationService->generateSingleDepreciation($asset);
            
            $updatedSummary = $this->depreciationService->getDepreciationSummary($asset);
            
            DB::commit();

            return response()->json([
                'success' => true,
                'message' => $count > 0 ? "Depreciation generated for 1 month" : "No depreciation needed or maximum reached",
                'data' => $updatedSummary
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error("Error generating depreciation for asset {$assetId}: " . $e->getMessage());
            Log::error("Stack trace: " . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate depreciation: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Generate depresiasi untuk semua asset (manual)
     */
    public function generateAll(Request $request)
    {
        try {
            $count = $this->depreciationService->generateAllPendingDepreciation();

            return response()->json([
                'success' => true,
                'message' => "Depreciation generated for {$count} asset month(s)",
                'data' => [
                    'processed_count' => $count,
                    'timestamp' => now()->toDateTimeString()
                ]
            ]);
        } catch (\Exception $e) {
            Log::error("Error generating all depreciation: " . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate depreciation: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get depresiasi preview (hitung tanpa save)
     */
    public function preview($assetId)
    {
        try {
            $asset = Asset::find($assetId);
            
            if (!$asset) {
                return response()->json([
                    'success' => false,
                    'message' => 'Asset not found'
                ], Response::HTTP_NOT_FOUND);
            }

            $preview = $this->depreciationService->calculateDepreciationPreview($asset);

            return response()->json([
                'success' => true,
                'data' => $preview
            ]);
        } catch (\Exception $e) {
            Log::error("Error getting depreciation preview for asset {$assetId}: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to get depreciation preview'
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}