<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IncidentReport extends Model
{
    use HasFactory;

    protected $fillable = [
        'asset_id',
        'reporter_id',
        'type',
        'description',
        'date',
        'status',
        'evidence_photo_path',
        'reviewed_by',
        'review_date',
        'resolution_notes',
        'responsible_party',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'review_date' => 'datetime',
        ];
    }

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}