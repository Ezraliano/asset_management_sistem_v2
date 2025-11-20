<?php

namespace App\Models_jaminan;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GuaranteeSettlement extends Model
{
    use HasFactory;

    // Set connection ke mysql_jaminan
    protected $connection = 'mysql_jaminan';

    protected $table = 'guarantee_settlements';

    protected $fillable = [
        'guarantee_id',
        'loan_id',
        'spk_number',
        'cif_number',
        'guarantee_name',
        'guarantee_type',
        'borrower_name',
        'borrower_contact',
        'loan_date',
        'expected_return_date',
        'settlement_date',
        'settlement_notes',
        'settlement_status',
        'settled_by',
        'settlement_remarks',
    ];

    protected function casts(): array
    {
        return [
            'loan_date' => 'date',
            'expected_return_date' => 'date',
            'settlement_date' => 'date',
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
     * Relationship ke GuaranteeLoan
     */
    public function loan()
    {
        return $this->belongsTo(GuaranteeLoan::class, 'loan_id');
    }

    /**
     * Scope untuk filter berdasarkan status
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('settlement_status', $status);
    }

    /**
     * Scope untuk filter berdasarkan guarantee_id
     */
    public function scopeByGuaranteeId($query, $guaranteeId)
    {
        return $query->where('guarantee_id', $guaranteeId);
    }

    /**
     * Scope untuk filter berdasarkan loan_id
     */
    public function scopeByLoanId($query, $loanId)
    {
        return $query->where('loan_id', $loanId);
    }

    /**
     * Scope untuk filter berdasarkan SPK number
     */
    public function scopeBySpkNumber($query, $spkNumber)
    {
        return $query->where('spk_number', $spkNumber);
    }

    /**
     * Scope untuk filter berdasarkan range tanggal pelunasan
     */
    public function scopeBySettlementDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('settlement_date', [$startDate, $endDate]);
    }

    /**
     * Scope untuk sorting terbaru
     */
    public function scopeLatest($query)
    {
        return $query->orderBy('settlement_date', 'desc');
    }

    /**
     * Scope untuk pending settlements
     */
    public function scopePending($query)
    {
        return $query->where('settlement_status', 'pending');
    }

    /**
     * Scope untuk approved settlements
     */
    public function scopeApproved($query)
    {
        return $query->where('settlement_status', 'approved');
    }
}
