<?php

namespace App\Models_jaminan;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GuaranteeLoan extends Model
{
    use HasFactory;

    // Set connection ke mysql_jaminan
    protected $connection = 'mysql_jaminan';

    protected $table = 'guarantee_loans';

    protected $fillable = [
        'guarantee_id',
        'spk_number',
        'cif_number',
        'guarantee_type',
        'file_location',
        'borrower_name',
        'borrower_contact',
        'reason',
        'loan_date',
        'expected_return_date',
        'actual_return_date',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'loan_date' => 'date',
            'expected_return_date' => 'date',
            'actual_return_date' => 'date',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Relationship ke Guarantee
     */
    public function guarantee()
    {
        return $this->belongsTo(Guarantee::class, 'guarantee_id');
    }

    /**
     * Scope untuk filter berdasarkan status
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope untuk filter berdasarkan guarantee_id
     */
    public function scopeByGuaranteeId($query, $guaranteeId)
    {
        return $query->where('guarantee_id', $guaranteeId);
    }

    /**
     * Scope untuk filter berdasarkan SPK number
     */
    public function scopeBySpkNumber($query, $spkNumber)
    {
        return $query->where('spk_number', $spkNumber);
    }

    /**
     * Scope untuk filter berdasarkan range tanggal peminjaman
     */
    public function scopeByLoanDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('loan_date', [$startDate, $endDate]);
    }

    /**
     * Scope untuk sorting terbaru
     */
    public function scopeLatest($query)
    {
        return $query->orderBy('loan_date', 'desc');
    }
}
