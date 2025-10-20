<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\DepreciationScheduleSetting;
use App\Events\DepreciationScheduleExecuted;
use Carbon\Carbon;

class TestDepreciationSchedule extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'depreciation:test-schedule';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test depreciation schedule configuration and trigger manually';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Testing Depreciation Schedule Configuration');
        $this->line('');

        // Get schedule setting
        $schedule = DepreciationScheduleSetting::where('name', 'auto_depreciation')->first();

        if (!$schedule) {
            $this->error('Schedule setting not found!');
            $this->info('Please run: php artisan migrate');
            return Command::FAILURE;
        }

        // Display current configuration
        $this->info('Current Schedule Configuration:');
        $this->table(
            ['Setting', 'Value'],
            [
                ['Status', $schedule->is_active ? 'Active' : 'Inactive'],
                ['Frequency', $schedule->frequency],
                ['Execution Time', $schedule->execution_time],
                ['Timezone', $schedule->timezone],
                ['Schedule Description', $schedule->getScheduleDescription()],
                ['Last Run', $schedule->last_run_at ? $schedule->last_run_at->format('Y-m-d H:i:s') : 'Never'],
                ['Next Run', $schedule->next_run_at ? $schedule->next_run_at->format('Y-m-d H:i:s') : 'Not calculated'],
            ]
        );

        $this->line('');

        // Check if should run now
        $shouldRunNow = $schedule->shouldRunNow();
        $currentTime = Carbon::now($schedule->timezone)->format('Y-m-d H:i:s');

        $this->info("Current Time ({$schedule->timezone}): {$currentTime}");
        $this->info('Should Run Now: ' . ($shouldRunNow ? 'YES' : 'NO'));

        $this->line('');

        // Ask if user wants to trigger manually
        if ($this->confirm('Do you want to trigger depreciation manually now?', true)) {
            $this->info('Triggering depreciation schedule...');

            try {
                event(new DepreciationScheduleExecuted('manual_test'));

                $this->info('Depreciation schedule triggered successfully!');
                $this->info('Check the logs for details.');

                // Refresh and show last run result
                $schedule->refresh();

                if ($schedule->last_run_result) {
                    $this->line('');
                    $this->info('Last Run Result:');
                    $this->line(json_encode($schedule->last_run_result, JSON_PRETTY_PRINT));
                }

            } catch (\Exception $e) {
                $this->error('Failed to trigger schedule: ' . $e->getMessage());
                return Command::FAILURE;
            }
        }

        return Command::SUCCESS;
    }
}
