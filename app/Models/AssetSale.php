<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetSale extends Model
{
    use HasFactory;

    protected $fillable = [
        'asset_id',
        'sold_by_id',
        'sale_price',
        'sale_date',
        'buyer_name',
        'buyer_contact',
        'sale_proof_path',
        'reason',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'sale_date' => 'datetime',
            'sale_price' => 'decimal:2',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    protected $appends = ['sale_proof_url'];

    /**
     * Relasi ke Asset
     */
    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    /**
     * Relasi ke User (penjual)
     */
    public function soldBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sold_by_id');
    }

    /**
     * Get full URL for sale proof file
     * Generate full accessible URL yang respects APP_URL from .env
     * Works di local dan production without hardcoding domain
     */
    public function getSaleProofUrlAttribute(): ?string
    {
        if (!$this->sale_proof_path) {
            return null;
        }

        // Use Storage::disk() to respect APP_URL from .env
        return \Illuminate\Support\Facades\Storage::disk('public')->url($this->sale_proof_path);
    }

    /**
     * Check if this sale has proof document
     */
    public function hasProof(): bool
    {
        return !empty($this->sale_proof_path);
    }

    /**
     * Calculate profit/loss from sale
     * (Harga Jual - Nilai Buku Saat Ini)
     */
    public function calculateProfitLoss(): float
    {
        if (!$this->asset) {
            return 0;
        }

        $currentBookValue = $this->asset->getCurrentBookValue();
        return $this->sale_price - $currentBookValue;
    }

    /**
     * Check if sale resulted in profit
     */
    public function isProfit(): bool
    {
        return $this->calculateProfitLoss() > 0;
    }
}
