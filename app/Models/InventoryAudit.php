<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryAudit extends Model
{
    use HasFactory;

    protected $fillable = [
        'unit_id',
        'auditor_id',
        'audit_code',
        'scan_mode',
        'status',
        'started_at',
        'completed_at',
        'expected_asset_ids',
        'found_asset_ids',
        'misplaced_assets',
        'notes',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'expected_asset_ids' => 'array',
        'found_asset_ids' => 'array',
        'misplaced_assets' => 'array',
    ];

    /**
     * Get the unit being audited.
     */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    /**
     * Get the user who is conducting the audit.
     */
    public function auditor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'auditor_id');
    }

    /**
     * Get missing assets (expected but not found).
     */
    public function getMissingAssetsAttribute(): array
    {
        $expected = $this->expected_asset_ids ?? [];
        $found = $this->found_asset_ids ?? [];

        return array_values(array_diff($expected, $found));
    }

    /**
     * Get found assets count.
     */
    public function getFoundCountAttribute(): int
    {
        return count($this->found_asset_ids ?? []);
    }

    /**
     * Get missing assets count.
     */
    public function getMissingCountAttribute(): int
    {
        return count($this->missing_assets);
    }

    /**
     * Get misplaced assets count.
     */
    public function getMisplacedCountAttribute(): int
    {
        return count($this->misplaced_assets ?? []);
    }

    /**
     * Get completion percentage.
     */
    public function getCompletionPercentageAttribute(): float
    {
        $expected = count($this->expected_asset_ids ?? []);
        if ($expected === 0) {
            return 0;
        }

        $found = count($this->found_asset_ids ?? []);
        return round(($found / $expected) * 100, 2);
    }
}
