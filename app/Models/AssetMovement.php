<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetMovement extends Model
{
    use HasFactory;

    protected $fillable = [
        'asset_id',
        'moved_by_id',
        'location',
        'moved_at',
    ];

    protected function casts(): array
    {
        return [
            'moved_at' => 'datetime',
        ];
    }
    
    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    public function movedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'moved_by_id');
    }
}