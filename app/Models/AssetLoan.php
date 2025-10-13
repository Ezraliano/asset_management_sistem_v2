<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetLoan extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'asset_id',
        'borrower_id',
        'request_date',
        'loan_date',
        'expected_return_date',
        'actual_return_date',
        'purpose',
        'status',
        'approved_by',
        'approval_date',
        'loan_proof_photo_path',
        'return_proof_photo_path',
        'return_condition',
        'return_notes',
        'rejection_reason',
    ];

    /**
     * Get the asset that was borrowed.
     */
    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    /**
     * Get the user who borrowed the asset.
     */
    public function borrower(): BelongsTo
    {
        return $this->belongsTo(User::class, 'borrower_id');
    }

    /**
     * Get the user who approved the loan.
     */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}