<?php

namespace App\Events;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DepreciationScheduleExecuted
{
    use Dispatchable, SerializesModels;

    public $triggeredBy;
    public $scheduleName;

    /**
     * Create a new event instance.
     */
    public function __construct(string $triggeredBy = 'scheduler', string $scheduleName = 'auto_depreciation')
    {
        $this->triggeredBy = $triggeredBy;
        $this->scheduleName = $scheduleName;
    }
}
