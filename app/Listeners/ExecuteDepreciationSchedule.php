<?php

namespace App\Listeners;

use App\Events\DepreciationScheduleExecuted;
use App\Services\DepreciationService;
use App\Models\DepreciationScheduleSetting;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class ExecuteDepreciationSchedule
{
    /**
     * Create the event listener.
     */
    public function __construct(
        private DepreciationService $depreciationService
    ) {}

    /**
     * Handle the event.
     */
    public function handle(DepreciationScheduleExecuted $event): void
    {
        Log::info("🎯 Depreciation schedule event triggered by: {$event->triggeredBy}");

        // Get the schedule setting
        $schedule = DepreciationScheduleSetting::where('name', $event->scheduleName)
            ->where('is_active', true)
            ->first();

        if (!$schedule) {
            Log::warning("❌ No active schedule found for: {$event->scheduleName}");
            return;
        }

        Log::info("📅 Executing depreciation schedule: {$schedule->getScheduleDescription()}");

        try {
            // Execute the depreciation service
            $results = $this->depreciationService->generateAutoDepreciation();

            // Update the schedule with last run information
            $schedule->updateLastRun($results);

            Log::info("✅ Depreciation schedule completed successfully");
            Log::info("📊 Processed {$results['total_processed']} months across {$results['assets_processed']} assets");

        } catch (\Exception $e) {
            Log::error("❌ Depreciation schedule execution failed: " . $e->getMessage());

            // Still update last run with error
            $schedule->updateLastRun([
                'success' => false,
                'error' => $e->getMessage(),
                'timestamp' => Carbon::now()->format('Y-m-d H:i:s')
            ]);
        }
    }
}
