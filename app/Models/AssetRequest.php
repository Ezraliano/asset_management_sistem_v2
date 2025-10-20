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
        'asset_id',
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
        'loan_photo_path',
        // Loan tracking fields
        'loan_status',
        'actual_loan_date',
        'actual_return_date',
        'return_notes',
        'return_proof_photo_path',
        'return_confirmed_by',
        'return_confirmation_date',
        'return_rejection_reason',
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

    /**
     * Get the user who confirmed the return.
     */
    public function returnConfirmer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'return_confirmed_by');
    }

    /**
     * Get the asset that was assigned/loaned.
     */
    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class, 'asset_id');
    }
}
