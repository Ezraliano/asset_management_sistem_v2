<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Log;
use App\Services\DepreciationService;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Register Depreciation Service
        $this->app->singleton(DepreciationService::class, function ($app) {
            return new DepreciationService();
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // ==================== AUTO DEPRECIATION EVENT HANDLING ====================
        // 📝 DISABLED: Auto depreciation on asset create/update
        // Depreciation sekarang dilakukan secara manual melalui button "Depresiasi Asset"
        // atau via scheduled command

        // ❌ COMMENTED OUT - Asset creation auto depreciation
        // \App\Models\Asset::created(function ($asset) {
        //     $this->handleAutoDepreciation($asset, 'created');
        // });

        // ❌ COMMENTED OUT - Asset update auto depreciation
        // \App\Models\Asset::updated(function ($asset) {
        //     if ($asset->isDirty(['purchase_date', 'value', 'useful_life', 'status'])) {
        //         $this->handleAutoDepreciation($asset, 'updated');
        //     }
        // });

        // ==================== SCHEDULED COMMANDS ====================
        
        $this->callAfterResolving(Schedule::class, function (Schedule $schedule) {
            // Auto depreciation daily at 00:05
            $schedule->command('depreciation:generate-auto')
                     ->dailyAt('00:05')
                     ->timezone('Asia/Jakarta')
                     ->appendOutputTo(storage_path('logs/auto-depreciation.log'));

            // Legacy command backup
            $schedule->command('depreciation:generate')
                     ->dailyAt('01:00')
                     ->timezone('Asia/Jakarta');
        });
    }

    /**
     * Handle auto depreciation untuk asset events
     * Simple, langsung execute tanpa queue untuk immediate response
     */
    protected function handleAutoDepreciation($asset, string $eventType): void
    {
        try {
            $depreciationService = app(DepreciationService::class);
            $result = $depreciationService->processAssetAutoDepreciation($asset);
            
            Log::info("Auto depreciation for {$eventType} asset {$asset->asset_tag}", [
                'processed_months' => $result['processed'],
                'pending_months' => $result['pending_months'],
                'message' => $result['message']
            ]);
            
        } catch (\Exception $e) {
            Log::error("Auto depreciation failed for {$eventType} asset {$asset->asset_tag}: " . $e->getMessage(), [
                'exception' => $e->getTraceAsString()
            ]);
        }
    }
}