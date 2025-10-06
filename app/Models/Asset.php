<?php
// app/Models/Asset.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Asset extends Model
{
    use HasFactory;

    protected $fillable = [
        'asset_tag',
        'name',
        'category',
        'location',
        'value', // ✅ Pastikan ini 'value' bukan 'asset_value'
        'purchase_date',
        'useful_life',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'purchase_date' => 'date',
            'value' => 'decimal:2',
        ];
    }
    
    public function movements(): HasMany
    {
        return $this->hasMany(AssetMovement::class);
    }

    public function maintenances(): HasMany
    {
        return $this->hasMany(Maintenance::class);
    }

    public function incidentReports(): HasMany
    {
        return $this->hasMany(IncidentReport::class);
    }

    // Tambahkan relasi ke depresiasi
    public function depreciations(): HasMany
    {
        return $this->hasMany(AssetDepreciation::class)->orderBy('month_sequence');
    }

    // Method untuk menghitung depresiasi bulanan
    public function calculateMonthlyDepreciation(): float
    {
        if ($this->useful_life <= 0) {
            return 0;
        }
        return $this->value / $this->useful_life;
    }

    // Method untuk mendapatkan nilai buku terkini
    public function getCurrentBookValue(): float
    {
        $latestDepreciation = $this->depreciations()
            ->orderBy('depreciation_date', 'desc')
            ->first();
        
        return $latestDepreciation ? $latestDepreciation->current_value : $this->value;
    }

    // Method untuk mendapatkan total akumulasi depresiasi
    public function getAccumulatedDepreciation(): float
    {
        $latestDepreciation = $this->depreciations()
            ->orderBy('depreciation_date', 'desc')
            ->first();
        
        return $latestDepreciation ? $latestDepreciation->accumulated_depreciation : 0;
    }

    // Method untuk mendapatkan bulan depresiasi terakhir
    public function getLastDepreciationMonth(): int
    {
        $latestDepreciation = $this->depreciations()
            ->orderBy('month_sequence', 'desc')
            ->first();
        
        return $latestDepreciation ? $latestDepreciation->month_sequence : 0;
    }

    // Method untuk cek status aktif
    public function isActive(): bool
    {
        return !in_array($this->status, ['Disposed', 'Lost']);
    }

    // ✅ METHOD BARU: Cek apakah masih bisa didepresiasi
    public function canDepreciate(): bool
    {
        if (!$this->isActive()) {
            return false;
        }

        $lastSequence = $this->getLastDepreciationMonth();
        if ($lastSequence >= $this->useful_life) {
            return false;
        }

        $currentValue = $this->getCurrentBookValue();
        $monthlyDepreciation = $this->calculateMonthlyDepreciation();

        return $currentValue > $monthlyDepreciation;
    }
}