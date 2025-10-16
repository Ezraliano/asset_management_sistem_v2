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
        'technician_name',
        'phone_number',
        'photo_proof',
        'description',
        'status',
        'validation_status',
        'validated_by',
        'validation_date',
        'validation_notes',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'validation_date' => 'datetime',
        ];
    }

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function validator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validated_by');
    }
}