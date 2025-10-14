<?php
// app/Models/Asset.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;

class Asset extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'asset_tag',
        'name',
        'category',
        'value',
        'purchase_date',
        'useful_life',
        'status',
        'unit_id',
        'created_at',
        'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'purchase_date' => 'datetime', 
            'value' => 'decimal:2',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Asset $asset) {
            if (empty($asset->asset_tag)) {
                $asset->asset_tag = self::generateAssetTag();
            }
        });
    }

    private static function generateAssetTag(): string
    {
        $lastAsset = self::orderBy('id', 'desc')->first();
        $number = 1;
        if ($lastAsset && preg_match('/(\d+)$/', $lastAsset->asset_tag, $matches)) {
            $number = (int)$matches[1] + 1;
        }
        return 'AST-' . str_pad($number, 5, '0', STR_PAD_LEFT);
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

    public function loans(): HasMany
    {
        return $this->hasMany(AssetLoan::class);
    }

    public function depreciations(): HasMany
    {
        return $this->hasMany(AssetDepreciation::class)->orderBy('month_sequence');
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function sales(): HasMany
    {
        return $this->hasMany(AssetSale::class);
    }

    public function calculateMonthlyDepreciation(): float
    {
        if ($this->useful_life <= 0) {
            return 0;
        }
        return $this->value / $this->useful_life;
    }

    public function getCurrentBookValue(): float
    {
        $latestDepreciation = $this->depreciations()->orderBy('depreciation_date', 'desc')->first();
        return $latestDepreciation ? $latestDepreciation->current_value : $this->value;
    }

    public function getAccumulatedDepreciation(): float
    {
        $latestDepreciation = $this->depreciations()->orderBy('depreciation_date', 'desc')->first();
        return $latestDepreciation ? $latestDepreciation->accumulated_depreciation : 0;
    }

    public function getLastDepreciationMonth(): int
    {
        $latestDepreciation = $this->depreciations()->orderBy('month_sequence', 'desc')->first();
        return $latestDepreciation ? $latestDepreciation->month_sequence : 0;
    }

    public function isActive(): bool
    {
        return !in_array($this->status, ['Disposed', 'Lost', 'Terjual']);
    }

    public function isSold(): bool
    {
        return $this->status === 'Terjual';
    }

    public function getSaleRecord()
    {
        return $this->sales()->latest()->first();
    }

    public function getElapsedMonths(): int
    {
        $purchaseDate = Carbon::parse($this->purchase_date);
        $currentDate = Carbon::now();

        if ($purchaseDate->greaterThan($currentDate)) {
            return 0;
        }

        $yearDiff = $currentDate->year - $purchaseDate->year;
        $monthDiff = $currentDate->month - $purchaseDate->month;
        $elapsedMonths = $yearDiff * 12 + $monthDiff;

        $dayCorrection = 0;
        if ($currentDate->day < $purchaseDate->day) {
            $dayCorrection = 1;
        } elseif ($currentDate->day == $purchaseDate->day) {
            if ($currentDate->format('H:i:s') < $purchaseDate->format('H:i:s')) {
                $dayCorrection = 1;
            }
        }

        return max(0, $elapsedMonths - $dayCorrection);
    }

    public function getPendingDepreciationMonths(): int
    {
        $expectedMonths = min($this->getElapsedMonths(), $this->useful_life);
        $actualMonths = $this->getLastDepreciationMonth();
        return max(0, $expectedMonths - $actualMonths);
    }

    public function getExpectedDepreciationMonths(): int
    {
        $elapsedMonths = $this->getElapsedMonths();
        return min($elapsedMonths, $this->useful_life);
    }

}