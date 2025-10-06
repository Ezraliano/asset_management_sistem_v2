<?php
// app/Services/DepreciationService.php

namespace App\Services;

use App\Models\Asset;
use App\Models\AssetDepreciation;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DepreciationService
{
    /**
     * Generate depresiasi untuk bulan berjalan dengan logika tanggal spesifik
     */
    public function generateCurrentMonthDepreciation(): int
    {
        $assets = Asset::whereNotIn('status', ['Disposed', 'Lost'])->get();
        $processedCount = 0;
        $today = Carbon::now();
        
        Log::info("Starting depreciation generation for {$assets->count()} assets");
        
        foreach ($assets as $asset) {
            try {
                if ($this->shouldGenerateDepreciationForAsset($asset, $today)) {
                    $this->generateNextDepreciation($asset, $today);
                    $processedCount++;
                    Log::info("Generated depreciation for asset {$asset->asset_tag}, sequence: " . ($asset->getLastDepreciationMonth()));
                }
            } catch (\Exception $e) {
                Log::error("Failed to generate depreciation for asset {$asset->asset_tag}: " . $e->getMessage());
                Log::error("Stack trace: " . $e->getTraceAsString());
            }
        }
        
        Log::info("Depreciation generation completed. Processed: {$processedCount} assets");
        return $processedCount;
    }

    /**
     * Cek apakah asset perlu generate depresiasi berdasarkan tanggal spesifik
     */
    private function shouldGenerateDepreciationForAsset(Asset $asset, Carbon $today): bool
    {
        // ✅ PERBAIKAN: Gunakan method yang aman
        if (in_array($asset->status, ['Disposed', 'Lost'])) {
            return false;
        }

        $purchaseDate = Carbon::parse($asset->purchase_date);
        $lastDepreciation = $asset->depreciations()->orderBy('month_sequence', 'desc')->first();
        
        $currentSequence = $lastDepreciation ? $lastDepreciation->month_sequence + 1 : 1;
        
        // Cek apakah masih dalam masa useful life
        if ($currentSequence > $asset->useful_life) {
            return false;
        }

        // Hitung tanggal depresiasi berikutnya
        $nextDepreciationDate = $this->calculateNextDepreciationDate($asset, $lastDepreciation);
        
        // Cek apakah hari ini sudah mencapai atau melewati tanggal depresiasi
        // DAN bulan+year sudah berbeda (untuk hindari double execution dalam bulan yang sama)
        $shouldGenerate = $today->greaterThanOrEqualTo($nextDepreciationDate) &&
               $today->format('Y-m') !== $nextDepreciationDate->format('Y-m');

        Log::debug("Asset {$asset->asset_tag}: today={$today->format('Y-m-d')}, nextDate={$nextDepreciationDate->format('Y-m-d')}, shouldGenerate=" . ($shouldGenerate ? 'true' : 'false'));
        
        return $shouldGenerate;
    }

    /**
     * Hitung tanggal depresiasi berikutnya berdasarkan purchase date
     */
    private function calculateNextDepreciationDate(Asset $asset, ?AssetDepreciation $lastDepreciation): Carbon
    {
        $purchaseDate = Carbon::parse($asset->purchase_date);
        
        if ($lastDepreciation) {
            // Jika sudah ada depresiasi sebelumnya, tambah 1 bulan dari tanggal terakhir
            $nextDate = Carbon::parse($lastDepreciation->depreciation_date)->addMonth();
        } else {
            // Jika belum ada depresiasi, gunakan purchase date + 1 bulan
            $nextDate = $purchaseDate->copy()->addMonth();
        }
        
        // Pertahankan hari yang sama dengan purchase date
        $dayOfMonth = $purchaseDate->day;
        $nextDate->day = min($dayOfMonth, $nextDate->daysInMonth);
        
        return $nextDate;
    }

    /**
     * Generate depresiasi berikutnya untuk asset - DIPERBAIKI
     */
    private function generateNextDepreciation(Asset $asset, Carbon $today): void
    {
        $lastDepreciation = $asset->depreciations()->orderBy('month_sequence', 'desc')->first();
        $nextSequence = $lastDepreciation ? $lastDepreciation->month_sequence + 1 : 1;

        // ✅ PERBAIKAN: Pastikan sequence belum ada
        $existingDepreciation = AssetDepreciation::where('asset_id', $asset->id)
            ->where('month_sequence', $nextSequence)
            ->first();
            
        if ($existingDepreciation) {
            Log::warning("Depreciation record already exists for asset {$asset->asset_tag}, sequence: {$nextSequence}");
            return;
        }

        $monthlyDepreciation = $asset->calculateMonthlyDepreciation();
        $accumulatedDepreciation = $lastDepreciation 
            ? $lastDepreciation->accumulated_depreciation + $monthlyDepreciation
            : $monthlyDepreciation;

        $currentValue = max(0, $asset->value - $accumulatedDepreciation);

        // Tentukan tanggal depresiasi (harus sesuai dengan hari purchase date)
        $depreciationDate = $this->calculateDepreciationDate($asset, $nextSequence);

        // ✅ PERBAIKAN: Gunakan create dengan pengecekan manual
        DB::transaction(function () use ($asset, $monthlyDepreciation, $accumulatedDepreciation, $currentValue, $depreciationDate, $nextSequence) {
            AssetDepreciation::create([
                'asset_id' => $asset->id,
                'depreciation_amount' => $monthlyDepreciation,
                'accumulated_depreciation' => $accumulatedDepreciation,
                'current_value' => $currentValue,
                'depreciation_date' => $depreciationDate,
                'month_sequence' => $nextSequence,
            ]);
        });

        Log::info("Created depreciation record for asset {$asset->asset_tag}, sequence: {$nextSequence}, date: {$depreciationDate->format('Y-m-d')}");
    }

    /**
     * Hitung tanggal depresiasi yang tepat berdasarkan hari purchase date
     */
    private function calculateDepreciationDate(Asset $asset, int $monthSequence): Carbon
    {
        $purchaseDate = Carbon::parse($asset->purchase_date);
        
        // Pertahankan hari yang sama dengan purchase date, tambah bulan
        $depreciationDate = $purchaseDate->copy()->addMonths($monthSequence);
        
        // Jika hari melebihi jumlah hari di bulan target, set ke hari terakhir bulan tersebut
        if ($purchaseDate->day > $depreciationDate->daysInMonth) {
            $depreciationDate->lastOfMonth();
        }
        
        return $depreciationDate;
    }

    /**
     * Generate semua depresiasi yang tertunda (untuk initial setup)
     */
    public function generateAllPendingDepreciation(): int
    {
        $assets = Asset::whereNotIn('status', ['Disposed', 'Lost'])->get();
        $totalProcessed = 0;
        $today = Carbon::now();
        
        foreach ($assets as $asset) {
            $assetProcessed = 0;
            while ($this->shouldGenerateDepreciationForAsset($asset, $today)) {
                $this->generateNextDepreciation($asset, $today);
                $assetProcessed++;
                $totalProcessed++;
                
                // Safety limit untuk menghindari infinite loop
                if ($assetProcessed > $asset->useful_life) {
                    break;
                }
            }
            
            if ($assetProcessed > 0) {
                Log::info("Generated {$assetProcessed} depreciation records for asset {$asset->asset_tag}");
            }
        }
        
        return $totalProcessed;
    }

    /**
     * Get depresiasi summary untuk asset
     */
    public function getDepreciationSummary(Asset $asset): array
    {
        $latestDepreciation = $asset->depreciations()->orderBy('depreciation_date', 'desc')->first();

        $monthlyDepreciation = $asset->calculateMonthlyDepreciation();
        $accumulatedDepreciation = $latestDepreciation ? $latestDepreciation->accumulated_depreciation : 0;
        $currentValue = $latestDepreciation ? $latestDepreciation->current_value : $asset->value;
        $remainingMonths = max(0, $asset->useful_life - ($latestDepreciation ? $latestDepreciation->month_sequence : 0));

        $nextDepreciationDate = $latestDepreciation 
            ? $this->calculateNextDepreciationDate($asset, $latestDepreciation)
            : $this->calculateNextDepreciationDate($asset, null);

        // ✅ PERBAIKAN: Gunakan pengecekan status yang aman
        $isDepreciable = !in_array($asset->status, ['Disposed', 'Lost']) && $remainingMonths > 0;

        return [
            'monthly_depreciation' => (float) $monthlyDepreciation,
            'accumulated_depreciation' => (float) $accumulatedDepreciation,
            'current_value' => (float) $currentValue,
            'remaining_months' => $remainingMonths,
            'next_depreciation_date' => $nextDepreciationDate->format('Y-m-d'),
            'depreciation_history' => $asset->depreciations()->orderBy('depreciation_date')->get(),
            'is_depreciable' => $isDepreciable
        ];
    }

    /**
     * Generate depresiasi untuk asset tertentu (manual trigger) - DIPERBAIKI
     */
    public function generateDepreciationForAsset(Asset $asset): int
    {
        // ✅ PERBAIKAN: Gunakan pengecekan status yang aman
        if (in_array($asset->status, ['Disposed', 'Lost'])) {
            return 0;
        }

        $processed = 0;
        $today = Carbon::now();
        
        // ✅ PERBAIKAN: Batasi hanya 1 bulan per execution untuk manual trigger
        if ($this->shouldGenerateSingleDepreciation($asset, $today)) {
            $this->generateNextDepreciation($asset, $today);
            $processed = 1;
        }
        
        return $processed;
    }

    /**
     * ✅ METHOD BARU: Generate hanya 1 bulan depresiasi (untuk manual click)
     */
    public function generateSingleDepreciation(Asset $asset): int
    {
        // ✅ PERBAIKAN: Gunakan pengecekan status yang aman
        if (in_array($asset->status, ['Disposed', 'Lost'])) {
            Log::info("Asset {$asset->asset_tag} is not active, skipping depreciation");
            return 0;
        }

        $today = Carbon::now();
        
        // Cek apakah perlu generate depresiasi
        if (!$this->shouldGenerateSingleDepreciation($asset, $today)) {
            Log::info("No depreciation needed for asset {$asset->asset_tag}");
            return 0;
        }

        // Generate 1 bulan depresiasi
        $this->generateNextDepreciation($asset, $today);
        
        Log::info("Successfully generated single depreciation for asset {$asset->asset_tag}");
        return 1;
    }

    /**
     * ✅ METHOD BARU: Cek apakah bisa generate 1 bulan depresiasi
     */
    private function shouldGenerateSingleDepreciation(Asset $asset, Carbon $today): bool
    {
        if (in_array($asset->status, ['Disposed', 'Lost'])) {
            return false;
        }

        $lastDepreciation = $asset->depreciations()->orderBy('month_sequence', 'desc')->first();
        $nextSequence = $lastDepreciation ? $lastDepreciation->month_sequence + 1 : 1;
        
        // Cek apakah masih dalam masa useful life
        if ($nextSequence > $asset->useful_life) {
            Log::info("Asset {$asset->asset_tag} has reached maximum useful life");
            return false;
        }

        // Untuk manual generation, kita selalu generate bulan berikutnya
        // tanpa memeriksa tanggal (karena ini manual trigger)
        return true;
    }

    /**
     * Hitung depresiasi tanpa menyimpan ke database (untuk preview)
     */
    public function calculateDepreciationPreview(Asset $asset): array
    {
        $monthlyDepreciation = $asset->calculateMonthlyDepreciation();
        $purchaseDate = Carbon::parse($asset->purchase_date);
        $currentDate = Carbon::now();
        
        $monthsPassed = $purchaseDate->diffInMonths($currentDate);
        $monthsToCalculate = min($monthsPassed, $asset->useful_life);
        
        $accumulatedDepreciation = $monthlyDepreciation * $monthsToCalculate;
        $currentValue = max(0, $asset->value - $accumulatedDepreciation);
        
        return [
            'monthly_depreciation' => (float) $monthlyDepreciation,
            'accumulated_depreciation' => (float) $accumulatedDepreciation,
            'current_value' => (float) $currentValue,
            'months_depreciated' => $monthsToCalculate,
            'remaining_months' => max(0, $asset->useful_life - $monthsToCalculate)
        ];
    }

    /**
     * ✅ METHOD BARU: Cek status depresiasi asset (untuk UI)
     */
    public function getAssetDepreciationStatus(Asset $asset): array
    {
        $lastDepreciation = $asset->depreciations()->orderBy('month_sequence', 'desc')->first();
        $nextSequence = $lastDepreciation ? $lastDepreciation->month_sequence + 1 : 1;
        $remainingMonths = max(0, $asset->useful_life - ($lastDepreciation ? $lastDepreciation->month_sequence : 0));
        
        $canGenerate = $this->shouldGenerateSingleDepreciation($asset, Carbon::now());
        
        return [
            'current_sequence' => $lastDepreciation ? $lastDepreciation->month_sequence : 0,
            'next_sequence' => $nextSequence,
            'remaining_months' => $remainingMonths,
            'can_generate' => $canGenerate,
            'max_reached' => $nextSequence > $asset->useful_life,
            'is_active' => !in_array($asset->status, ['Disposed', 'Lost'])
        ];
    }

    /**
     * ✅ METHOD BARU: Reset depresiasi asset (untuk testing/debugging)
     */
    public function resetAssetDepreciation(Asset $asset): bool
    {
        try {
            $deletedCount = AssetDepreciation::where('asset_id', $asset->id)->delete();
            Log::info("Reset depreciation for asset {$asset->asset_tag}, deleted {$deletedCount} records");
            return true;
        } catch (\Exception $e) {
            Log::error("Failed to reset depreciation for asset {$asset->asset_tag}: " . $e->getMessage());
            return false;
        }
    }
}