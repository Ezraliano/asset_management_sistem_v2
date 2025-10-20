<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        // Dynamic depreciation schedule based on database settings
        $schedule->call(function () {
            $scheduleSetting = \App\Models\DepreciationScheduleSetting::getActiveSchedule();

            if ($scheduleSetting && $scheduleSetting->shouldRunNow()) {
                \Log::info('Scheduler triggering depreciation event');
                event(new \App\Events\DepreciationScheduleExecuted('scheduler'));
            }
        })->everyMinute()->name('depreciation-scheduler-check');
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}
