<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DepreciationScheduleSetting;
use App\Events\DepreciationScheduleExecuted;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class DepreciationScheduleController extends Controller
{
    /**
     * Get current schedule settings
     */
    public function index()
    {
        $schedule = DepreciationScheduleSetting::where('name', 'auto_depreciation')->first();

        if (!$schedule) {
            return response()->json([
                'success' => false,
                'message' => 'Schedule not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $schedule->id,
                'name' => $schedule->name,
                'is_active' => $schedule->is_active,
                'frequency' => $schedule->frequency,
                'execution_time' => $schedule->execution_time,
                'timezone' => $schedule->timezone,
                'cron_expression' => $schedule->cron_expression,
                'day_of_week' => $schedule->day_of_week,
                'day_of_month' => $schedule->day_of_month,
                'last_run_at' => $schedule->last_run_at?->format('Y-m-d H:i:s'),
                'next_run_at' => $schedule->next_run_at?->format('Y-m-d H:i:s'),
                'last_run_result' => $schedule->last_run_result,
                'description' => $schedule->description,
                'schedule_description' => $schedule->getScheduleDescription(),
            ]
        ]);
    }

    /**
     * Update schedule settings
     */
    public function update(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'is_active' => 'sometimes|boolean',
            'frequency' => 'sometimes|in:daily,weekly,monthly,custom',
            'execution_time' => 'sometimes|date_format:H:i:s',
            'timezone' => 'sometimes|string',
            'cron_expression' => 'required_if:frequency,custom|nullable|string',
            'day_of_week' => 'required_if:frequency,weekly|nullable|integer|min:0|max:6',
            'day_of_month' => 'required_if:frequency,monthly|nullable|integer|min:1|max:31',
            'description' => 'sometimes|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $schedule = DepreciationScheduleSetting::where('name', 'auto_depreciation')->first();

        if (!$schedule) {
            return response()->json([
                'success' => false,
                'message' => 'Schedule not found'
            ], 404);
        }

        // Update schedule
        $schedule->update($request->only([
            'is_active',
            'frequency',
            'execution_time',
            'timezone',
            'cron_expression',
            'day_of_week',
            'day_of_month',
            'description',
        ]));

        // Calculate and update next run time
        $nextRun = $schedule->calculateNextRunTime();
        if ($nextRun) {
            $schedule->update(['next_run_at' => $nextRun]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Schedule updated successfully',
            'data' => [
                'id' => $schedule->id,
                'is_active' => $schedule->is_active,
                'frequency' => $schedule->frequency,
                'execution_time' => $schedule->execution_time,
                'timezone' => $schedule->timezone,
                'next_run_at' => $schedule->next_run_at?->format('Y-m-d H:i:s'),
                'schedule_description' => $schedule->getScheduleDescription(),
            ]
        ]);
    }

    /**
     * Toggle schedule active status
     */
    public function toggleActive()
    {
        $schedule = DepreciationScheduleSetting::where('name', 'auto_depreciation')->first();

        if (!$schedule) {
            return response()->json([
                'success' => false,
                'message' => 'Schedule not found'
            ], 404);
        }

        $schedule->update(['is_active' => !$schedule->is_active]);

        return response()->json([
            'success' => true,
            'message' => $schedule->is_active ? 'Schedule activated' : 'Schedule deactivated',
            'data' => [
                'is_active' => $schedule->is_active,
            ]
        ]);
    }

    /**
     * Manually trigger depreciation schedule
     */
    public function trigger()
    {
        $schedule = DepreciationScheduleSetting::where('name', 'auto_depreciation')->first();

        if (!$schedule) {
            return response()->json([
                'success' => false,
                'message' => 'Schedule not found'
            ], 404);
        }

        try {
            // Dispatch event to execute depreciation
            event(new DepreciationScheduleExecuted('manual_trigger', 'auto_depreciation'));

            return response()->json([
                'success' => true,
                'message' => 'Depreciation schedule triggered successfully',
                'triggered_at' => Carbon::now()->format('Y-m-d H:i:s')
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to trigger depreciation schedule',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get schedule status
     */
    public function status()
    {
        $schedule = DepreciationScheduleSetting::where('name', 'auto_depreciation')->first();

        if (!$schedule) {
            return response()->json([
                'success' => false,
                'message' => 'Schedule not found'
            ], 404);
        }

        $now = Carbon::now($schedule->timezone);
        $nextRun = $schedule->calculateNextRunTime();
        $shouldRunNow = $schedule->shouldRunNow();

        return response()->json([
            'success' => true,
            'data' => [
                'is_active' => $schedule->is_active,
                'schedule_description' => $schedule->getScheduleDescription(),
                'current_time' => $now->format('Y-m-d H:i:s'),
                'last_run_at' => $schedule->last_run_at?->format('Y-m-d H:i:s'),
                'next_run_at' => $nextRun?->format('Y-m-d H:i:s'),
                'should_run_now' => $shouldRunNow,
                'time_until_next_run' => $nextRun ? $now->diffForHumans($nextRun, true) : null,
                'last_run_result' => $schedule->last_run_result,
            ]
        ]);
    }

    /**
     * Get available frequency options
     */
    public function frequencies()
    {
        return response()->json([
            'success' => true,
            'data' => [
                'daily' => 'Every day at specified time',
                'weekly' => 'Every week on specified day and time',
                'monthly' => 'Every month on specified date and time',
                'custom' => 'Custom cron expression',
            ]
        ]);
    }

    /**
     * Get timezone options
     */
    public function timezones()
    {
        $timezones = [
            'Asia/Jakarta' => 'WIB (Jakarta)',
            'Asia/Makassar' => 'WITA (Makassar)',
            'Asia/Jayapura' => 'WIT (Jayapura)',
            'UTC' => 'UTC',
        ];

        return response()->json([
            'success' => true,
            'data' => $timezones
        ]);
    }
}
