<?php

namespace App\Models_jaminan;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Unit extends Model
{
    use HasFactory;

    // Set connection ke mysql_jaminan
    protected $connection = 'mysql_jaminan';

    protected $table = 'units';

    protected $fillable = [
        'code',
        'name',
        'description',
        'location',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Relationship: Unit has many Guarantees
     */
    public function guarantees()
    {
        return $this->hasMany(Guarantee::class, 'unit_id');
    }

    /**
     * Scope untuk filter berdasarkan status active
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope untuk sorting by name
     */
    public function scopeOrderByName($query)
    {
        return $query->orderBy('name', 'asc');
    }
}
