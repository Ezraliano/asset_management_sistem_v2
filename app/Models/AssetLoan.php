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
        'start_time',
        'end_time',
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
        'return_verified_by',
        'return_verification_date',
        'return_rejection_reason',
    ];

    protected $appends = ['loan_proof_photo_url', 'return_proof_photo_url'];

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

    /**
     * Get the user who verified the return.
     */
    public function returnVerifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'return_verified_by');
    }

    /**
     * Accessor untuk loan proof photo URL
     * Generate full accessible URL yang respects APP_URL from .env
     * Works di local dan production without hardcoding domain
     */
    public function getLoanProofPhotoUrlAttribute(): ?string
    {
        if (!$this->loan_proof_photo_path) {
            return null;
        }

        // Use Storage::disk() to respect APP_URL from .env
        return \Illuminate\Support\Facades\Storage::disk('public')->url($this->loan_proof_photo_path);
    }

    /**
     * Accessor untuk return proof photo URL
     * Generate full accessible URL yang respects APP_URL from .env
     * Works di local dan production without hardcoding domain
     */
    public function getReturnProofPhotoUrlAttribute(): ?string
    {
        if (!$this->return_proof_photo_path) {
            return null;
        }

        // Use Storage::disk() to respect APP_URL from .env
        return \Illuminate\Support\Facades\Storage::disk('public')->url($this->return_proof_photo_path);
    }
}