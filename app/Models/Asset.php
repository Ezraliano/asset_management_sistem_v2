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
        'unit_name',
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
        return $this->belongsTo(Unit::class, 'unit_name', 'name');
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

    /**
     * Hitung bulan yang telah berlalu dengan mempertimbangkan waktu eksekusi scheduler
     *
     * Logika:
     * - Jika hari ini < purchase day: belum 1 bulan
     * - Jika hari ini = purchase day: cek waktu eksekusi scheduler
     * - Jika waktu sekarang < waktu eksekusi scheduler: belum waktunya depresiasi
     *
     * Contoh:
     * - Purchase: 20 Jan 2025
     * - Scheduler: Setiap hari jam 13:15
     * - Tanggal 20 Feb 2025 jam 10:00 -> Elapsed = 0 (belum jam 13:15)
     * - Tanggal 20 Feb 2025 jam 13:15 -> Elapsed = 1 (sudah waktunya)
     * - Tanggal 20 Feb 2025 jam 15:00 -> Elapsed = 1 (sudah lewat)
     */
    public function getElapsedMonths(): int
    {
        $purchaseDate = Carbon::parse($this->purchase_date);
        $currentDate = Carbon::now();

        if ($purchaseDate->greaterThan($currentDate)) {
            return 0;
        }

        // Dapatkan waktu eksekusi dari schedule settings
        $scheduleSetting = \App\Models\DepreciationScheduleSetting::getActiveSchedule();
        $executionTime = $scheduleSetting ? Carbon::parse($scheduleSetting->execution_time) : null;

        $yearDiff = $currentDate->year - $purchaseDate->year;
        $monthDiff = $currentDate->month - $purchaseDate->month;
        $elapsedMonths = $yearDiff * 12 + $monthDiff;

        $dayCorrection = 0;

        // Jika hari ini < hari purchase date
        if ($currentDate->day < $purchaseDate->day) {
            $dayCorrection = 1;
        }
        // Jika hari ini = hari purchase date
        elseif ($currentDate->day == $purchaseDate->day) {
            // Jika ada setting scheduler, bandingkan dengan execution time
            if ($executionTime) {
                // Jika waktu sekarang < waktu eksekusi scheduler, bulan ini belum dihitung
                if ($currentDate->format('H:i:s') < $executionTime->format('H:i:s')) {
                    $dayCorrection = 1;
                }
            } else {
                // Fallback: bandingkan dengan waktu purchase
                if ($currentDate->format('H:i:s') < $purchaseDate->format('H:i:s')) {
                    $dayCorrection = 1;
                }
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