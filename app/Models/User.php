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
        'unit_name',
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
        // Super Admin and Admin can manage all units
        if (in_array($this->role, ['super-admin', 'admin'])) {
            return true;
        }

        // Unit admin can only manage their own unit
        if ($this->role === 'unit' && $unit && $this->unit_name === $unit->name) {
            return true;
        }

        return false;
    }

    /**
     * Check if user can approve loans for a specific asset.
     */
    public function canApproveLoansForAsset(Asset $asset): bool
    {
        // Super Admin and Admin can approve all loans
        if (in_array($this->role, ['super-admin', 'admin'])) {
            return true;
        }

        // Unit admin can only approve loans for assets in their unit
        if ($this->role === 'unit' && $this->unit_name && $asset->unit_name === $this->unit_name) {
            return true;
        }

        return false;
    }

    /**
     * Check if user can view assets from a specific unit.
     */
    public function canViewUnitAssets(?Unit $unit): bool
    {
        // Super Admin and Admin can view all units
        if (in_array($this->role, ['super-admin', 'admin'])) {
            return true;
        }

        // Unit admin and User can only view their own unit
        if (in_array($this->role, ['unit', 'user']) && $unit && $this->unit_name === $unit->name) {
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
        if ($this->role === 'user' && $this->unit_name && $asset->unit_name === $this->unit_name) {
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
        // Super Admin and Admin can create assets in any unit
        if (in_array($this->role, ['super-admin', 'admin'])) {
            return true;
        }

        // Unit admin can only create assets in their own unit
        if ($this->role === 'unit' && $unit && $this->unit_name === $unit->name) {
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
        // Super Admin and Admin can update all assets
        if (in_array($this->role, ['super-admin', 'admin'])) {
            return true;
        }

        // Unit admin can only update assets in their unit
        if ($this->role === 'unit' && $this->unit_name && $asset->unit_name === $this->unit_name) {
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
        // Super Admin and Admin can delete all assets
        if (in_array($this->role, ['super-admin', 'admin'])) {
            return true;
        }

        // Unit admin can only delete assets in their unit
        if ($this->role === 'unit' && $this->unit_name && $asset->unit_name === $this->unit_name) {
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
        // Super Admin and Admin can view all loans
        if (in_array($this->role, ['super-admin', 'admin'])) {
            return true;
        }

        // Unit admin can only view loans for assets in their unit
        if ($this->role === 'unit' && $this->unit_name && $loan->asset->unit_name === $this->unit_name) {
            return true;
        }

        // User can only view their own loans
        if ($this->role === 'user' && $loan->borrower_id === $this->id) {
            return true;
        }

        return false;
    }

    /**
     * Check if user can process loan returns.
     */
    public function canProcessLoanReturn(AssetLoan $loan): bool
    {
        // Super Admin and Admin can process all returns
        if (in_array($this->role, ['super-admin', 'admin'])) {
            return true;
        }

        // ✅ VALIDASI UNTUK UNIT ADMIN
        // Unit admin HANYA BOLEH process return untuk:
        // 1. Asset ada di unit mereka (asset milik unit mereka)
        // 2. DAN borrower juga dari unit mereka (peminjaman internal dalam unit yang sama)
        if ($this->role === 'unit' && $this->unit_name) {
            $assetBelongsToUserUnit = $loan->asset->unit_name === $this->unit_name;
            $borrowerFromSameUnit = $loan->borrower &&
                                    $loan->borrower->unit_name === $this->unit_name;

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
        // Super Admin, Admin, and Admin Holding can validate all maintenance records
        if (in_array($this->role, ['super-admin', 'admin', 'admin-holding'])) {
            return true;
        }

        // Unit admin can only validate maintenance for assets in their unit
        if ($this->role === 'unit' && $this->unit_name && $maintenance->asset && $maintenance->asset->unit_name === $this->unit_name) {
            return true;
        }

        return false;
    }

    /**
     * Check if user can complete maintenance records.
     */
    public function canCompleteMaintenance(Maintenance $maintenance): bool
    {
        // Super Admin, Admin, and Admin Holding can complete all maintenance records
        if (in_array($this->role, ['super-admin', 'admin', 'admin-holding'])) {
            return true;
        }

        // Unit admin can only complete maintenance for assets in their unit
        if ($this->role === 'unit' && $this->unit_name && $maintenance->asset && $maintenance->asset->unit_name === $this->unit_name) {
            return true;
        }

        return false;
    }

    /**
     * Check if user can create maintenance records.
     */
    public function canCreateMaintenance(Asset $asset): bool
    {
        // Super Admin, Admin, and Admin Holding can create maintenance for all assets
        if (in_array($this->role, ['super-admin', 'admin', 'admin-holding'])) {
            return true;
        }

        // Unit admin can only create maintenance for assets in their unit
        if ($this->role === 'unit' && $this->unit_name && $asset->unit_name === $this->unit_name) {
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

        return $this->role === 'super-admin' || $this->role === 'admin'
            ? 'Semua Unit'
            : 'Unit tidak ditentukan';
    }

    /**
     * Check if user is super admin.
     */
    public function isSuperAdmin(): bool
    {
        return $this->role === 'super-admin';
    }

    /**
     * Check if user is admin holding.
     */
    public function isAdminHolding(): bool
    {
        return $this->role === 'admin';
    }

    /**
     * Check if user is admin unit.
     */
    public function isAdminUnit(): bool
    {
        return $this->role === 'unit';
    }

    /**
     * Check if user is regular user.
     */
    public function isRegularUser(): bool
    {
        return $this->role === 'user';
    }

    /**
     * Check if user is auditor.
     */
    public function isAuditor(): bool
    {
        return $this->role === 'auditor';
    }

    /**
     * Check if user has admin privileges.
     */
    public function isAdmin(): bool
    {
        return in_array($this->role, ['super-admin', 'admin', 'unit']);
    }

    /**
     * Scope a query to only include users from a specific unit.
     */
    public function scopeFromUnit($query, $unitName)
    {
        return $query->where('unit_name', $unitName);
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
        return $query->whereIn('role', ['super-admin', 'admin', 'unit']);
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
            'can_view_all_assets' => in_array($this->role, ['super-admin', 'admin']),
            'can_manage_assets' => in_array($this->role, ['super-admin', 'admin', 'unit']),
            'can_borrow_assets' => $this->role === 'user',
            'can_approve_loans' => in_array($this->role, ['super-admin', 'admin', 'unit']),
            'can_view_reports' => in_array($this->role, ['super-admin', 'admin']),
            'unit_restricted' => in_array($this->role, ['unit', 'user']),
            'unit_name' => $this->unit_name,
            'unit_display_name' => $this->getUnitName(),
        ];
    }
}