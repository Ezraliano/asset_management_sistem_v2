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
     * Generate depresiasi untuk bulan berjalan (auto)
     */
    public function generateCurrentMonthDepreciation(): int
    {
        $assets = Asset::whereNotIn('status', ['Disposed', 'Lost'])->get();
        $processedCount = 0;
        
        Log::info("Starting depreciation generation for {$assets->count()} assets");
        
        foreach ($assets as $asset) {
            try {
                if ($this->shouldGenerateAutoDepreciation($asset)) {
                    $this->generateNextDepreciation($asset);
                    $processedCount++;
                    Log::info("Generated depreciation for asset {$asset->asset_tag}");
                }
            } catch (\Exception $e) {
                Log::error("Failed to generate depreciation for asset {$asset->asset_tag}: " . $e->getMessage());
            }
        }
        
        Log::info("Depreciation generation completed. Processed: {$processedCount} assets");
        return $processedCount;
    }

    /**
     * Cek apakah asset perlu generate depresiasi OTOMATIS (berdasarkan tanggal)
     */
    private function shouldGenerateAutoDepreciation(Asset $asset): bool
    {
        // Cek status asset
        if (in_array($asset->status, ['Disposed', 'Lost'])) {
            return false;
        }

        // Hitung sequence berikutnya dengan benar
        $nextSequence = $this->getNextSequenceNumber($asset);
        
        // Cek apakah masih dalam masa useful life
        if ($nextSequence > $asset->useful_life) {
            Log::info("Asset {$asset->asset_tag} has reached maximum useful life ({$asset->useful_life} months)");
            return false;
        }

        // Hitung nilai buku dengan benar
        $currentBookValue = $this->calculateCurrentBookValue($asset);
        
        // Hanya stop jika nilai buku sudah 0
        if ($currentBookValue <= 0) {
            Log::info("Asset {$asset->asset_tag} has zero book value: {$currentBookValue}");
            return false;
        }

        // Untuk auto depreciation, cek tanggal dengan logika yang benar
        $today = Carbon::now();
        $lastDepreciation = $asset->depreciations()->orderBy('month_sequence', 'desc')->first();
        $nextDepreciationDate = $this->calculateNextDepreciationDate($asset, $lastDepreciation);
        
        Log::info("Asset {$asset->asset_tag} - Today: {$today->format('Y-m-d')}, Next Date: {$nextDepreciationDate->format('Y-m-d')}, Sequence: {$nextSequence}, Book Value: {$currentBookValue}");
        
        return $today->greaterThanOrEqualTo($nextDepreciationDate);
    }

    /**
     * Cek apakah asset bisa didepresiasi MANUAL (tanpa cek tanggal)
     */
    public function canGenerateManualDepreciation(Asset $asset): bool
    {
        // Cek status asset
        if (in_array($asset->status, ['Disposed', 'Lost'])) {
            Log::info("Asset {$asset->asset_tag} is not active, status: {$asset->status}");
            return false;
        }

        // Hitung sequence berikutnya dengan benar
        $nextSequence = $this->getNextSequenceNumber($asset);
        
        // Cek apakah masih dalam masa useful life
        if ($nextSequence > $asset->useful_life) {
            Log::info("Asset {$asset->asset_tag} cannot generate manual - max useful life reached: {$asset->useful_life}");
            return false;
        }

        // Hitung nilai buku dengan benar
        $currentBookValue = $this->calculateCurrentBookValue($asset);
        
        // Hanya stop jika nilai buku sudah 0
        if ($currentBookValue <= 0) {
            Log::info("Asset {$asset->asset_tag} cannot generate manual - zero book value: {$currentBookValue}");
            return false;
        }

        Log::info("Asset {$asset->asset_tag} CAN generate manual - sequence: {$nextSequence}, book value: {$currentBookValue}");
        return true;
    }

    /**
     * ✅ METHOD BARU: Hitung next sequence number dengan benar
     */
    private function getNextSequenceNumber(Asset $asset): int
    {
        // Selalu query langsung ke database untuk menghindari stale data
        $lastSequence = AssetDepreciation::where('asset_id', $asset->id)
            ->max('month_sequence');
            
        return $lastSequence ? $lastSequence + 1 : 1;
    }

    /**
     * Generate depresiasi berikutnya untuk asset
     */
    private function generateNextDepreciation(Asset $asset): bool
    {
        try {
            DB::beginTransaction();

            // Hitung sequence berikutnya dengan benar (selalu dari database)
            $nextSequence = $this->getNextSequenceNumber($asset);

            Log::info("🔄 Attempting to generate depreciation for asset {$asset->asset_tag}, sequence: {$nextSequence}");

            // Pastikan sequence belum ada untuk prevent duplicate
            $existingDepreciation = AssetDepreciation::where('asset_id', $asset->id)
                ->where('month_sequence', $nextSequence)
                ->first();
                
            if ($existingDepreciation) {
                Log::warning("❌ Depreciation record already exists for asset {$asset->asset_tag}, sequence: {$nextSequence}");
                DB::rollBack();
                return false;
            }

            // Dapatkan depresiasi terakhir untuk perhitungan
            $lastDepreciation = AssetDepreciation::where('asset_id', $asset->id)
                ->orderBy('month_sequence', 'desc')
                ->first();

            // Hitung depresiasi bulanan standar
            $standardMonthlyDepreciation = $asset->calculateMonthlyDepreciation();
            
            // Hitung nilai buku saat ini
            $currentBookValue = $lastDepreciation ? $lastDepreciation->current_value : $asset->value;
            
            Log::info("📊 Asset {$asset->asset_tag} - Current book value: {$currentBookValue}, Monthly depreciation: {$standardMonthlyDepreciation}");

            // Tentukan depresiasi aktual (bisa lebih kecil dari standar jika nilai tersisa < depresiasi standar)
            $actualDepreciation = min($standardMonthlyDepreciation, $currentBookValue);
            
            // Hitung accumulated depreciation
            $accumulatedDepreciation = $lastDepreciation 
                ? $lastDepreciation->accumulated_depreciation + $actualDepreciation
                : $actualDepreciation;

            // Hitung nilai buku baru
            $newBookValue = max(0, $currentBookValue - $actualDepreciation);

            // Tentukan tanggal depresiasi
            $depreciationDate = $this->calculateDepreciationDate($asset, $nextSequence);

            // Buat record depresiasi
            AssetDepreciation::create([
                'asset_id' => $asset->id,
                'depreciation_amount' => $actualDepreciation,
                'accumulated_depreciation' => $accumulatedDepreciation,
                'current_value' => $newBookValue,
                'depreciation_date' => $depreciationDate,
                'month_sequence' => $nextSequence,
            ]);

            DB::commit();

            Log::info("✅ SUCCESS: Created depreciation record for asset {$asset->asset_tag}, sequence: {$nextSequence}, amount: {$actualDepreciation}, accumulated: {$accumulatedDepreciation}, current value: {$newBookValue}");
            return true;

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("❌ FAILED: Failed to generate depreciation for asset {$asset->asset_tag}: " . $e->getMessage());
            Log::error("Stack trace: " . $e->getTraceAsString());
            return false;
        }
    }

    /**
     * Hitung tanggal depresiasi
     */
    private function calculateDepreciationDate(Asset $asset, int $monthSequence): Carbon
    {
        $purchaseDate = Carbon::parse($asset->purchase_date);
        
        // Hitung tanggal berdasarkan bulan dari purchase date
        $depreciationDate = $purchaseDate->copy()->addMonths($monthSequence);
        
        // Handle akhir bulan - jika tanggal purchase melebihi hari dalam bulan target
        $purchaseDay = $purchaseDate->day;
        $lastDayOfMonth = $depreciationDate->daysInMonth;
        
        if ($purchaseDay > $lastDayOfMonth) {
            $depreciationDate->lastOfMonth();
        } else {
            $depreciationDate->day($purchaseDay);
        }
        
        Log::info("Calculated depreciation date for asset {$asset->asset_tag}, sequence {$monthSequence}: {$depreciationDate->format('Y-m-d')}");
        
        return $depreciationDate;
    }

    /**
     * Hitung tanggal depresiasi berikutnya
     */
    private function calculateNextDepreciationDate(Asset $asset, ?AssetDepreciation $lastDepreciation): Carbon
    {
        if ($lastDepreciation) {
            // Jika sudah ada depresiasi sebelumnya, tambah 1 bulan dari tanggal terakhir
            $nextDate = Carbon::parse($lastDepreciation->depreciation_date)->addMonth();
            Log::info("Next depreciation date from last record: {$nextDate->format('Y-m-d')}");
        } else {
            // Jika belum ada depresiasi, gunakan purchase date + 1 bulan
            $purchaseDate = Carbon::parse($asset->purchase_date);
            $nextDate = $purchaseDate->copy()->addMonth();
            Log::info("Next depreciation date from purchase date: {$nextDate->format('Y-m-d')}");
        }
        
        return $nextDate;
    }

    /**
     * Generate semua depresiasi yang tertunda (auto)
     */
    public function generateAllPendingDepreciation(): int
    {
        $assets = Asset::whereNotIn('status', ['Disposed', 'Lost'])->get();
        $totalProcessed = 0;
        
        Log::info("Starting generation of all pending depreciation for {$assets->count()} assets");
        
        foreach ($assets as $asset) {
            $assetProcessed = 0;
            
            // Generate sampai useful life habis atau nilai 0
            while ($this->shouldGenerateAutoDepreciation($asset)) {
                $success = $this->generateNextDepreciation($asset);
                if ($success) {
                    $assetProcessed++;
                    $totalProcessed++;
                    Log::info("Generated depreciation {$assetProcessed} for asset {$asset->asset_tag}");
                } else {
                    Log::info("Stopping depreciation generation for asset {$asset->asset_tag} - generation failed");
                    break;
                }
                
                // Safety limit
                if ($assetProcessed >= $asset->useful_life) {
                    Log::info("Safety limit reached for asset {$asset->asset_tag}");
                    break;
                }
            }
            
            if ($assetProcessed > 0) {
                Log::info("Generated {$assetProcessed} depreciation records for asset {$asset->asset_tag}");
            }
        }
        
        Log::info("Completed generation of all pending depreciation. Total processed: {$totalProcessed}");
        return $totalProcessed;
    }

    /**
     * Get depresiasi summary untuk asset
     */
    public function getDepreciationSummary(Asset $asset): array
    {
        // Selalu query langsung ke database untuk data terbaru
        $latestDepreciation = AssetDepreciation::where('asset_id', $asset->id)
            ->orderBy('month_sequence', 'desc')
            ->first();

        $monthlyDepreciation = $asset->calculateMonthlyDepreciation();
        $accumulatedDepreciation = $latestDepreciation ? $latestDepreciation->accumulated_depreciation : 0;
        
        // Hitung current value yang akurat
        $currentValue = $latestDepreciation ? $latestDepreciation->current_value : $asset->value;
        $depreciatedMonths = $latestDepreciation ? $latestDepreciation->month_sequence : 0;
        $remainingMonths = max(0, $asset->useful_life - $depreciatedMonths);

        // Hitung next depreciation date
        $nextDepreciationDate = $latestDepreciation 
            ? $this->calculateNextDepreciationDate($asset, $latestDepreciation)
            : $this->calculateNextDepreciationDate($asset, null);

        // Cek apakah masih bisa didepresiasi (gunakan manual check)
        $isDepreciable = $this->canGenerateManualDepreciation($asset);

        // Get history
        $depreciationHistory = AssetDepreciation::where('asset_id', $asset->id)
            ->orderBy('month_sequence', 'asc')
            ->get();

        return [
            'monthly_depreciation' => (float) $monthlyDepreciation,
            'accumulated_depreciation' => (float) $accumulatedDepreciation,
            'current_value' => (float) $currentValue,
            'remaining_months' => $remainingMonths,
            'depreciated_months' => $depreciatedMonths,
            'next_depreciation_date' => $nextDepreciationDate->format('Y-m-d'),
            'depreciation_history' => $depreciationHistory,
            'is_depreciable' => $isDepreciable,
            'completion_percentage' => min(100, ($depreciatedMonths / $asset->useful_life) * 100)
        ];
    }

    /**
     * Generate depresiasi untuk asset tertentu (manual trigger)
     */
    public function generateDepreciationForAsset(Asset $asset): int
    {
        if (in_array($asset->status, ['Disposed', 'Lost'])) {
            Log::info("Cannot generate depreciation for inactive asset {$asset->asset_tag}");
            return 0;
        }

        // Gunakan manual check
        if ($this->canGenerateManualDepreciation($asset)) {
            $success = $this->generateNextDepreciation($asset);
            return $success ? 1 : 0;
        }
        
        Log::info("Asset {$asset->asset_tag} cannot generate depreciation at this time");
        return 0;
    }

    /**
     * Generate single depreciation (untuk manual click)
     */
    public function generateSingleDepreciation(Asset $asset): int
    {
        Log::info("🔄 Generating single depreciation for asset {$asset->asset_tag}");
        return $this->generateDepreciationForAsset($asset);
    }

    /**
     * Hitung current book value
     */
    public function calculateCurrentBookValue(Asset $asset): float
    {
        // Selalu query langsung ke database untuk data terbaru
        $latestDepreciation = AssetDepreciation::where('asset_id', $asset->id)
            ->orderBy('month_sequence', 'desc')
            ->first();
            
        $currentValue = $latestDepreciation ? $latestDepreciation->current_value : $asset->value;
        
        Log::info("Current book value for asset {$asset->asset_tag}: {$currentValue}");
        return $currentValue;
    }

    /**
     * Hitung depresiasi preview (hitung tanpa save)
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
     * Reset depresiasi asset
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

    /**
     * Generate multiple depreciations sekaligus
     */
    public function generateMultipleDepreciations(Asset $asset, int $count): int
    {
        if (in_array($asset->status, ['Disposed', 'Lost'])) {
            return 0;
        }

        $processed = 0;
        Log::info("🔄 Generating multiple ({$count}) depreciations for asset {$asset->asset_tag}");
        
        for ($i = 0; $i < $count; $i++) {
            if ($this->canGenerateManualDepreciation($asset)) {
                $success = $this->generateNextDepreciation($asset);
                if ($success) {
                    $processed++;
                    Log::info("✅ Successfully generated depreciation {$processed} for asset {$asset->asset_tag}");
                } else {
                    Log::info("❌ Stopping multiple generation for asset {$asset->asset_tag} - generation failed");
                    break;
                }
            } else {
                Log::info("⏸️ Stopping multiple generation for asset {$asset->asset_tag} - cannot generate more");
                break;
            }
        }
        
        Log::info("🏁 Completed multiple depreciation generation for asset {$asset->asset_tag}: {$processed} processed");
        return $processed;
    }

    /**
     * Generate depresiasi sampai nilai asset 0
     */
    public function generateDepreciationUntilZero(Asset $asset): int
    {
        if (in_array($asset->status, ['Disposed', 'Lost'])) {
            Log::info("Cannot generate depreciation for inactive asset {$asset->asset_tag}");
            return 0;
        }

        $processed = 0;
        $maxIterations = $asset->useful_life; // Safety limit
        
        Log::info("🔄 Generating depreciation until zero for asset {$asset->asset_tag}");
        
        while ($processed < $maxIterations && $this->canGenerateManualDepreciation($asset)) {
            $success = $this->generateNextDepreciation($asset);
            if ($success) {
                $processed++;
                
                // Cek jika nilai sudah 0
                $currentValue = $this->calculateCurrentBookValue($asset);
                if ($currentValue <= 0) {
                    Log::info("🎯 Asset {$asset->asset_tag} reached zero value after {$processed} depreciations");
                    break;
                }
            } else {
                Log::info("❌ Stopping depreciation generation for asset {$asset->asset_tag} - generation failed");
                break;
            }
        }
        
        Log::info("🏁 Completed depreciation until zero for asset {$asset->asset_tag}: {$processed} processed");
        return $processed;
    }

    /**
     * Generate depresiasi hingga nilai tertentu
     */
    public function generateDepreciationUntilValue(Asset $asset, float $targetValue): int
    {
        if (in_array($asset->status, ['Disposed', 'Lost'])) {
            Log::info("Cannot generate depreciation for inactive asset {$asset->asset_tag}");
            return 0;
        }

        if ($targetValue < 0) {
            Log::warning("Target value cannot be negative: {$targetValue}");
            return 0;
        }

        $processed = 0;
        $maxIterations = $asset->useful_life;
        
        Log::info("🔄 Generating depreciation until value {$targetValue} for asset {$asset->asset_tag}");
        
        while ($processed < $maxIterations && $this->canGenerateManualDepreciation($asset)) {
            $currentValue = $this->calculateCurrentBookValue($asset);
            
            // Stop jika current value sudah <= target value
            if ($currentValue <= $targetValue) {
                Log::info("🎯 Asset {$asset->asset_tag} reached target value {$targetValue}, current: {$currentValue}");
                break;
            }
            
            $success = $this->generateNextDepreciation($asset);
            if ($success) {
                $processed++;
            } else {
                Log::info("❌ Stopping depreciation generation for asset {$asset->asset_tag} - generation failed");
                break;
            }
        }
        
        Log::info("🏁 Completed depreciation until value for asset {$asset->asset_tag}: {$processed} processed");
        return $processed;
    }

    /**
     * Cek status depresiasi detail
     */
    public function getDepreciationStatus(Asset $asset): array
    {
        $summary = $this->getDepreciationSummary($asset);
        
        // Hitung next sequence dengan benar
        $nextSequence = $this->getNextSequenceNumber($asset);

        return [
            'can_generate_manual' => $this->canGenerateManualDepreciation($asset),
            'can_generate_auto' => $this->shouldGenerateAutoDepreciation($asset),
            'next_sequence' => $nextSequence,
            'monthly_depreciation_amount' => $asset->calculateMonthlyDepreciation(),
            'total_useful_life' => $asset->useful_life,
            'original_value' => (float) $asset->value,
            'current_status' => $asset->status,
            'current_value' => $summary['current_value'],
            'remaining_months' => $summary['remaining_months'],
            'depreciated_months' => $summary['depreciated_months']
        ];
    }

    /**
     * Get total depresiasi yang sudah dilakukan
     */
    public function getTotalDepreciatedAmount(Asset $asset): float
    {
        return AssetDepreciation::where('asset_id', $asset->id)->sum('depreciation_amount');
    }

    /**
     * Cek apakah asset sudah fully depreciated
     */
    public function isFullyDepreciated(Asset $asset): bool
    {
        $currentValue = $this->calculateCurrentBookValue($asset);
        return $currentValue <= 0;
    }

    /**
     * Get remaining depreciable amount
     */
    public function getRemainingDepreciableAmount(Asset $asset): float
    {
        $currentValue = $this->calculateCurrentBookValue($asset);
        return max(0, $currentValue);
    }

    /**
     * Get depresiasi schedule (jadwal depresiasi masa depan)
     */
    public function getDepreciationSchedule(Asset $asset): array
    {
        $schedule = [];
        $currentValue = $this->calculateCurrentBookValue($asset);
        $monthlyDepreciation = $asset->calculateMonthlyDepreciation();
        
        // Hitung next sequence dengan benar
        $nextSequence = $this->getNextSequenceNumber($asset);

        for ($i = $nextSequence; $i <= $asset->useful_life && $currentValue > 0; $i++) {
            $depreciationAmount = min($monthlyDepreciation, $currentValue);
            $currentValue -= $depreciationAmount;
            
            $depreciationDate = $this->calculateDepreciationDate($asset, $i);
            
            $schedule[] = [
                'month_sequence' => $i,
                'depreciation_date' => $depreciationDate->format('Y-m-d'),
                'depreciation_amount' => $depreciationAmount,
                'remaining_value' => max(0, $currentValue),
            ];
            
            // Stop jika sudah mencapai 0
            if ($currentValue == 0) {
                break;
            }
        }

        return $schedule;
    }
}