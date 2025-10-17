<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetRequest extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'requester_unit_id',
        'requester_id',
        'asset_name',
        'request_date',
        'needed_date',
        'expected_return_date',
        'start_time',
        'end_time',
        'purpose',
        'reason',
        'status',
        'reviewed_by',
        'review_date',
        'rejection_reason',
        'approval_notes',
    ];

    /**
     * Get the unit that requested the asset.
     */
    public function requesterUnit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'requester_unit_id');
    }

    /**
     * Get the user who made the request.
     */
    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_id');
    }

    /**
     * Get the user who reviewed the request.
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
