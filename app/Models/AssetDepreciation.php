<?php
// app/Models/AssetDepreciation.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AssetDepreciation extends Model
{
    use HasFactory;

    protected $fillable = [
        'asset_id',
        'depreciation_amount',
        'accumulated_depreciation',
        'current_value',
        'depreciation_date',
        'month_sequence'
    ];

    protected $casts = [
        'depreciation_amount' => 'decimal:2',
        'accumulated_depreciation' => 'decimal:2',
        'current_value' => 'decimal:2',
        'depreciation_date' => 'date'
    ];

    public function asset()
    {
        return $this->belongsTo(Asset::class);
    }
}