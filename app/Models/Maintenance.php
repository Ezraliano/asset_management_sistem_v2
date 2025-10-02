<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Maintenance extends Model
{
    use HasFactory;

    protected $fillable = [
        'asset_id',
        'date',
        'description',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
        ];
    }
    
    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }
}