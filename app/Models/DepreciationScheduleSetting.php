<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class DepreciationScheduleSetting extends Model
{
    protected $fillable = [
        'name',
        'is_active',
        'frequency',
        'execution_time',
        'timezone',
        'cron_expression',
        'day_of_week',
        'day_of_month',
        'last_run_at',
        'next_run_at',
        'last_run_result',
        'description',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'last_run_at' => 'datetime',
        'next_run_at' => 'datetime',
        'last_run_result' => 'array',
        'day_of_week' => 'integer',
        'day_of_month' => 'integer',
    ];

    /**
     * Get the active schedule setting
     */
    public static function getActiveSchedule()
    {
        return self::where('name', 'auto_depreciation')
            ->where('is_active', true)
            ->first();
    }

    /**
     * Calculate next run time based on frequency
     */
    public function calculateNextRunTime(): ?Carbon
    {
        $time = Carbon::parse($this->execution_time);
        $now = Carbon::now($this->timezone);

        switch ($this->frequency) {
            case 'daily':
                $nextRun = $now->copy()
                    ->setTime($time->hour, $time->minute, $time->second);

                // If time has passed today, schedule for tomorrow
                if ($nextRun->isPast()) {
                    $nextRun->addDay();
                }
                return $nextRun;

            case 'weekly':
                $nextRun = $now->copy()
                    ->setTime($time->hour, $time->minute, $time->second)
                    ->next($this->day_of_week);
                return $nextRun;

            case 'monthly':
                $nextRun = $now->copy()
                    ->setTime($time->hour, $time->minute, $time->second)
                    ->day($this->day_of_month);

                // If day has passed this month, schedule for next month
                if ($nextRun->isPast()) {
                    $nextRun->addMonth();
                }
                return $nextRun;

            case 'custom':
                // For custom cron, we can't easily calculate next run
                // This would require a cron expression parser
                return null;

            default:
                return null;
        }
    }

    /**
     * Check if schedule should run now
     */
    public function shouldRunNow(): bool
    {
        if (!$this->is_active) {
            return false;
        }

        $now = Carbon::now($this->timezone);
        $time = Carbon::parse($this->execution_time);

        switch ($this->frequency) {
            case 'daily':
                return $now->format('H:i') === $time->format('H:i');

            case 'weekly':
                return $now->dayOfWeek === $this->day_of_week
                    && $now->format('H:i') === $time->format('H:i');

            case 'monthly':
                return $now->day === $this->day_of_month
                    && $now->format('H:i') === $time->format('H:i');

            default:
                return false;
        }
    }

    /**
     * Update last run information
     */
    public function updateLastRun(array $result): void
    {
        $this->update([
            'last_run_at' => now($this->timezone),
            'next_run_at' => $this->calculateNextRunTime(),
            'last_run_result' => $result,
        ]);
    }

    /**
     * Get formatted schedule description
     */
    public function getScheduleDescription(): string
    {
        $time = Carbon::parse($this->execution_time)->format('H:i');

        switch ($this->frequency) {
            case 'daily':
                return "Every day at {$time} ({$this->timezone})";

            case 'weekly':
                $days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                $dayName = $days[$this->day_of_week] ?? 'Unknown';
                return "Every {$dayName} at {$time} ({$this->timezone})";

            case 'monthly':
                return "Every month on day {$this->day_of_month} at {$time} ({$this->timezone})";

            case 'custom':
                return "Custom: {$this->cron_expression}";

            default:
                return 'Not configured';
        }
    }
}
