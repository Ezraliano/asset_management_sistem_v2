<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\User;

class Maintenance extends Model
{
    use HasFactory;

    protected $fillable = [
        'asset_id',
        'type',
        'date',
        'unit_id',
        'party_type',
        'instansi',
        'phone_number',
        'photo_proof',
        'description',
        'status',
        'validation_status',
        'validated_by',
        'validation_date',
        'validation_notes',
        'completed_by',
        'completion_date',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'validation_date' => 'datetime',
            'completion_date' => 'datetime',
        ];
    }

    protected $appends = ['photo_proof_url'];

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    /**
     * Accessor untuk photo proof URL
     * Generate full accessible URL yang respects APP_URL from .env
     * Works di local dan production without hardcoding domain
     */
    public function getPhotoProofUrlAttribute(): ?string
    {
        if (!$this->photo_proof) {
            return null;
        }

        // Use Storage::disk() to respect APP_URL from .env
        return \Illuminate\Support\Facades\Storage::disk('public')->url($this->photo_proof);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function validator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validated_by');
    }

    public function completedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'completed_by');
    }

    /**
     * Scope untuk filter berdasarkan unit (untuk Admin Unit)
     */
    public function scopeForUnit($query, $unitId)
    {
        return $query->whereHas('asset', function ($q) use ($unitId) {
            $q->where('unit_id', $unitId);
        });
    }

    /**
     * Scope untuk maintenance yang pending validation
     */
    public function scopePendingValidation($query)
    {
        return $query->where('validation_status', 'PENDING');
    }

    /**
     * Scope untuk maintenance yang approved
     */
    public function scopeApproved($query)
    {
        return $query->where('validation_status', 'APPROVED');
    }

    /**
     * Check if maintenance is approved
     */
    public function isApproved(): bool
    {
        return $this->validation_status === 'APPROVED';
    }

    /**
     * Check if maintenance is completed
     */
    public function isCompleted(): bool
    {
        return $this->status === 'COMPLETED';
    }

    /**
     * Check if maintenance is in progress
     */
    public function isInProgress(): bool
    {
        return $this->status === 'IN_PROGRESS';
    }
}