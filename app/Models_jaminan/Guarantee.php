<?php

namespace App\Models_jaminan;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Guarantee extends Model
{
    use HasFactory;

    // Set connection ke mysql_jaminan
    protected $connection = 'mysql_jaminan';

    protected $table = 'guarantees';

    protected $fillable = [
        'spk_number',
        'cif_number',
        'spk_name',
        'credit_period',
        'guarantee_name',
        'guarantee_type',
        'guarantee_number',
        'file_location',
        'input_date',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'input_date' => 'date',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Scope untuk filter berdasarkan tipe jaminan
     */
    public function scopeByType($query, $type)
    {
        return $query->where('guarantee_type', $type);
    }

    /**
     * Scope untuk filter berdasarkan nomor SPK
     */
    public function scopeBySpkNumber($query, $spkNumber)
    {
        return $query->where('spk_number', $spkNumber);
    }

    /**
     * Scope untuk filter berdasarkan nomor CIF
     */
    public function scopeByCifNumber($query, $cifNumber)
    {
        return $query->where('cif_number', $cifNumber);
    }

    /**
     * Scope untuk filter berdasarkan range tanggal
     */
    public function scopeByDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('input_date', [$startDate, $endDate]);
    }

    /**
     * Scope untuk sorting terbaru
     */
    public function scopeLatest($query)
    {
        return $query->orderBy('input_date', 'desc');
    }

    /**
     * Scope untuk filter berdasarkan status
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }
}
