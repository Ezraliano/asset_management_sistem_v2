<?php
// app/Models/Asset.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;

class Asset extends Model
{
    use HasFactory;

    protected $fillable = [
        'asset_tag',
        'name',
        'category',
        'location',
        'value',
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
        // Dapatkan asset terakhir berdasarkan ID untuk mendapatkan nomor urut terakhir
        $lastAsset = self::orderBy('id', 'desc')->first();
        
        $number = 1;
        if ($lastAsset) {
            // Coba ekstrak nomor dari asset_tag terakhir
            if (preg_match('/(\d+)$/', $lastAsset->asset_tag, $matches)) {
                $number = (int)$matches[1] + 1;
            }
        }

        // Format nomor dengan padding nol di depan (misal: AST-00001)
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

    // ✅ METHOD BARU: Hitung bulan yang telah berlalu sejak purchase date
    public function getElapsedMonths(): int
    {
        $purchaseDate = Carbon::parse($this->purchase_date);
        $currentDate = Carbon::now();
        
        return $purchaseDate->diffInMonths($currentDate);
    }

    // ✅ METHOD BARU: Hitung bulan depresiasi yang harusnya sudah dilakukan
    public function getExpectedDepreciationMonths(): int
    {
        $elapsedMonths = $this->getElapsedMonths();
        return min($elapsedMonths, $this->useful_life);
    }

    // ✅ METHOD BARU: Cek apakah masih bisa didepresiasi (versi otomatis)
    public function canAutoDepreciate(): bool
    {
        if (!$this->isActive()) {
            return false;
        }

        $expectedMonths = $this->getExpectedDepreciationMonths();
        $actualMonths = $this->getLastDepreciationMonth();

        // Jika bulan yang diharapkan lebih besar dari yang sudah dilakukan
        if ($expectedMonths > $actualMonths) {
            $currentValue = $this->getCurrentBookValue();
            $monthlyDepreciation = $this->calculateMonthlyDepreciation();
            
            // Hanya depresiasi jika nilai buku masih cukup
            return $currentValue >= $monthlyDepreciation;
        }

        return false;
    }

    // ✅ METHOD BARU: Dapatkan jumlah bulan depresiasi yang tertunda
    public function getPendingDepreciationMonths(): int
    {
        $expectedMonths = $this->getExpectedDepreciationMonths();
        $actualMonths = $this->getLastDepreciationMonth();
        
        return max(0, $expectedMonths - $actualMonths);
    }
}