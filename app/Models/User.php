<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'username',
        'email',
        'password',
        'role',
        'unit_id',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    /**
     * Get the loans this user has borrowed.
     */
    public function borrowedLoans(): HasMany
    {
        return $this->hasMany(AssetLoan::class, 'borrower_id');
    }

    /**
     * Get the loans this user has approved.
     */
    public function approvedLoans(): HasMany
    {
        return $this->hasMany(AssetLoan::class, 'approved_by');
    }

    /**
     * Get the unit this user belongs to.
     */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    /**
     * Check if user can manage a specific unit.
     */
    public function canManageUnit(?Unit $unit): bool
    {
        // Super Admin and Admin Holding can manage all units
        if (in_array($this->role, ['Super Admin', 'Admin Holding'])) {
            return true;
        }

        // Admin Unit can only manage their own unit
        if ($this->role === 'Admin Unit' && $unit && $this->unit_id === $unit->id) {
            return true;
        }

        return false;
    }

    /**
     * Check if user can approve loans for a specific asset.
     */
    public function canApproveLoansForAsset(Asset $asset): bool
    {
        // Super Admin and Admin Holding can approve all loans
        if (in_array($this->role, ['Super Admin', 'Admin Holding'])) {
            return true;
        }

        // Admin Unit can only approve loans for assets in their unit
        if ($this->role === 'Admin Unit' && $this->unit_id && $asset->unit_id === $this->unit_id) {
            return true;
        }

        return false;
    }

    /**
     * Check if user can view assets from a specific unit.
     */
    public function canViewUnitAssets(?Unit $unit): bool
    {
        // Super Admin and Admin Holding can view all units
        if (in_array($this->role, ['Super Admin', 'Admin Holding'])) {
            return true;
        }

        // Admin Unit and User can only view their own unit
        if (in_array($this->role, ['Admin Unit', 'User']) && $unit && $this->unit_id === $unit->id) {
            return true;
        }

        return false;
    }

    /**
     * Check if user can borrow from a specific asset.
     */
    public function canBorrowAsset(Asset $asset): bool
    {
        // User can only borrow assets from their own unit
        if ($this->role === 'User' && $this->unit_id && $asset->unit_id === $this->unit_id) {
            return true;
        }

        // Admin roles cannot borrow assets (based on your requirement)
        return false;
    }

    /**
     * Check if user can create assets in a specific unit.
     */
    public function canCreateAssetInUnit(?Unit $unit): bool
    {
        // Super Admin and Admin Holding can create assets in any unit
        if (in_array($this->role, ['Super Admin', 'Admin Holding'])) {
            return true;
        }

        // Admin Unit can only create assets in their own unit
        if ($this->role === 'Admin Unit' && $unit && $this->unit_id === $unit->id) {
            return true;
        }

        // User cannot create assets
        return false;
    }

    /**
     * Check if user can update a specific asset.
     */
    public function canUpdateAsset(Asset $asset): bool
    {
        // Super Admin and Admin Holding can update all assets
        if (in_array($this->role, ['Super Admin', 'Admin Holding'])) {
            return true;
        }

        // Admin Unit can only update assets in their unit
        if ($this->role === 'Admin Unit' && $this->unit_id && $asset->unit_id === $this->unit_id) {
            return true;
        }

        // User cannot update assets
        return false;
    }

    /**
     * Check if user can delete a specific asset.
     */
    public function canDeleteAsset(Asset $asset): bool
    {
        // Super Admin and Admin Holding can delete all assets
        if (in_array($this->role, ['Super Admin', 'Admin Holding'])) {
            return true;
        }

        // Admin Unit can only delete assets in their unit
        if ($this->role === 'Admin Unit' && $this->unit_id && $asset->unit_id === $this->unit_id) {
            return true;
        }

        // User cannot delete assets
        return false;
    }

    /**
     * Check if user can view loan details.
     */
    public function canViewLoan(AssetLoan $loan): bool
    {
        // Super Admin and Admin Holding can view all loans
        if (in_array($this->role, ['Super Admin', 'Admin Holding'])) {
            return true;
        }

        // Admin Unit can only view loans for assets in their unit
        if ($this->role === 'Admin Unit' && $this->unit_id && $loan->asset->unit_id === $this->unit_id) {
            return true;
        }

        // User can only view their own loans
        if ($this->role === 'User' && $loan->borrower_id === $this->id) {
            return true;
        }

        return false;
    }

    /**
     * Check if user can process loan returns.
     */
    public function canProcessLoanReturn(AssetLoan $loan): bool
    {
        // Super Admin and Admin Holding can process all returns
        if (in_array($this->role, ['Super Admin', 'Admin Holding'])) {
            return true;
        }

        // ✅ VALIDASI UNTUK ADMIN UNIT
        // Admin Unit HANYA BOLEH process return untuk:
        // 1. Asset ada di unit mereka (asset milik unit mereka)
        // 2. DAN borrower juga dari unit mereka (peminjaman internal dalam unit yang sama)
        if ($this->role === 'Admin Unit' && $this->unit_id) {
            $assetBelongsToUserUnit = $loan->asset->unit_id === $this->unit_id;
            $borrowerFromSameUnit = $loan->borrower &&
                                    $loan->borrower->unit_id === $this->unit_id;

            // Hanya boleh jika KEDUA kondisi terpenuhi
            return $assetBelongsToUserUnit && $borrowerFromSameUnit;
        }

        return false;
    }

    /**
     * Check if user can validate maintenance records.
     */
    public function canValidateMaintenance(Maintenance $maintenance): bool
    {
        // Super Admin and Admin Holding can validate all maintenance records
        if (in_array($this->role, ['Super Admin', 'Admin Holding'])) {
            return true;
        }

        // Admin Unit can only validate maintenance for assets in their unit
        if ($this->role === 'Admin Unit' && $this->unit_id && $maintenance->asset && $maintenance->asset->unit_id === $this->unit_id) {
            return true;
        }

        return false;
    }

    /**
     * Check if user can complete maintenance records.
     */
    public function canCompleteMaintenance(Maintenance $maintenance): bool
    {
        // Super Admin and Admin Holding can complete all maintenance records
        if (in_array($this->role, ['Super Admin', 'Admin Holding'])) {
            return true;
        }

        // Admin Unit can only complete maintenance for assets in their unit
        if ($this->role === 'Admin Unit' && $this->unit_id && $maintenance->asset && $maintenance->asset->unit_id === $this->unit_id) {
            return true;
        }

        return false;
    }

    /**
     * Check if user can create maintenance records.
     */
    public function canCreateMaintenance(Asset $asset): bool
    {
        // Super Admin and Admin Holding can create maintenance for all assets
        if (in_array($this->role, ['Super Admin', 'Admin Holding'])) {
            return true;
        }

        // Admin Unit can only create maintenance for assets in their unit
        if ($this->role === 'Admin Unit' && $this->unit_id && $asset->unit_id === $this->unit_id) {
            return true;
        }

        return false;
    }

    /**
     * Get user's unit name or default message.
     */
    public function getUnitName(): string
    {
        if ($this->unit) {
            return $this->unit->name;
        }

        return $this->role === 'Super Admin' || $this->role === 'Admin Holding' 
            ? 'Semua Unit' 
            : 'Unit tidak ditentukan';
    }

    /**
     * Check if user is super admin.
     */
    public function isSuperAdmin(): bool
    {
        return $this->role === 'Super Admin';
    }

    /**
     * Check if user is admin holding.
     */
    public function isAdminHolding(): bool
    {
        return $this->role === 'Admin Holding';
    }

    /**
     * Check if user is admin unit.
     */
    public function isAdminUnit(): bool
    {
        return $this->role === 'Admin Unit';
    }

    /**
     * Check if user is regular user.
     */
    public function isRegularUser(): bool
    {
        return $this->role === 'User';
    }

    /**
     * Check if user is auditor.
     */
    public function isAuditor(): bool
    {
        return $this->role === 'Auditor';
    }

    /**
     * Check if user has admin privileges.
     */
    public function isAdmin(): bool
    {
        return in_array($this->role, ['Super Admin', 'Admin Holding', 'Admin Unit']);
    }

    /**
     * Scope a query to only include users from a specific unit.
     */
    public function scopeFromUnit($query, $unitId)
    {
        return $query->where('unit_id', $unitId);
    }

    /**
     * Scope a query to only include users with specific roles.
     */
    public function scopeWithRoles($query, array $roles)
    {
        return $query->whereIn('role', $roles);
    }

    /**
     * Get users who can approve loans (admins).
     */
    public function scopeApprovers($query)
    {
        return $query->whereIn('role', ['Super Admin', 'Admin Holding', 'Admin Unit']);
    }

    /**
     * Get active loans for this user.
     */
    public function getActiveLoans()
    {
        return $this->borrowedLoans()
            ->where('status', 'APPROVED')
            ->with('asset.unit')
            ->get();
    }

    /**
     * Get pending loans for this user.
     */
    public function getPendingLoans()
    {
        return $this->borrowedLoans()
            ->where('status', 'PENDING')
            ->with('asset.unit')
            ->get();
    }

    /**
     * Check if user has any active loans.
     */
    public function hasActiveLoans(): bool
    {
        return $this->borrowedLoans()
            ->where('status', 'APPROVED')
            ->exists();
    }

    /**
     * Check if user has reached loan limit (optional business logic).
     */
    public function hasReachedLoanLimit(): bool
    {
        $activeLoanCount = $this->borrowedLoans()
            ->where('status', 'APPROVED')
            ->count();

        // Define your loan limit logic here
        $loanLimit = config('app.max_concurrent_loans', 3); // Default 3 loans

        return $activeLoanCount >= $loanLimit;
    }

    /**
     * Get user's permissions summary.
     */
    public function getPermissionsSummary(): array
    {
        return [
            'can_view_all_assets' => in_array($this->role, ['Super Admin', 'Admin Holding']),
            'can_manage_assets' => in_array($this->role, ['Super Admin', 'Admin Holding', 'Admin Unit']),
            'can_borrow_assets' => $this->role === 'User',
            'can_approve_loans' => in_array($this->role, ['Super Admin', 'Admin Holding', 'Admin Unit']),
            'can_view_reports' => in_array($this->role, ['Super Admin', 'Admin Holding']),
            'unit_restricted' => in_array($this->role, ['Admin Unit', 'User']),
            'unit_id' => $this->unit_id,
            'unit_name' => $this->getUnitName(),
        ];
    }
}