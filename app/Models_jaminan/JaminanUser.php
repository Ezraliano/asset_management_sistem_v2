<?php

namespace App\Models_jaminan;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class JaminanUser extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Connection name for this model
     */
    protected $connection = 'mysql_jaminan';

    /**
     * The table associated with the model.
     */
    protected $table = 'jaminan_users';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
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
     * Check if user is Super Admin
     */
    public function isSuperAdmin(): bool
    {
        return $this->role === 'super-admin';
    }

    /**
     * Check if user is Admin Holding
     */
    public function isAdminHolding(): bool
    {
        return $this->role === 'admin-holding';
    }

    /**
     * Check if user is Admin Kredit
     */
    public function isAdminKredit(): bool
    {
        return $this->role === 'admin-kredit';
    }

    /**
     * Check if user is admin (any admin role)
     */
    public function isAdmin(): bool
    {
        return in_array($this->role, ['super-admin', 'admin-holding', 'admin-kredit']);
    }

    /**
     * Check if user can manage all guarantees (all roles have access)
     */
    public function canManageAllGuarantees(): bool
    {
        return $this->isAdmin();
    }

    /**
     * Check if user can view all guarantees (all roles have access)
     */
    public function canViewAllGuarantees(): bool
    {
        return $this->isAdmin();
    }

    /**
     * Check if user can approve guarantee settlements (all roles have access)
     */
    public function canApproveSettlements(): bool
    {
        return $this->isAdmin();
    }

    /**
     * Check if user can create guarantee loan (all roles have access)
     */
    public function canCreateGuaranteeLoan(): bool
    {
        return $this->isAdmin();
    }

    /**
     * Check if user can return guarantee loan (all roles have access)
     */
    public function canReturnGuaranteeLoan(): bool
    {
        return $this->isAdmin();
    }

    /**
     * Get user's permissions summary
     */
    public function getPermissionsSummary(): array
    {
        return [
            'can_view_all_guarantees' => $this->canViewAllGuarantees(),
            'can_manage_all_guarantees' => $this->canManageAllGuarantees(),
            'can_approve_settlements' => $this->canApproveSettlements(),
            'can_create_guarantee_loan' => $this->canCreateGuaranteeLoan(),
            'can_return_guarantee_loan' => $this->canReturnGuaranteeLoan(),
            'role' => $this->role,
        ];
    }

    /**
     * Scope a query to only include users with specific roles
     */
    public function scopeWithRoles($query, array $roles)
    {
        return $query->whereIn('role', $roles);
    }

    /**
     * Get all admin users (for settlement approvals)
     */
    public function scopeAdmins($query)
    {
        return $query->whereIn('role', ['super-admin', 'admin-holding', 'admin-kredit']);
    }

    /**
     * Get super admin users
     */
    public function scopeSuperAdmins($query)
    {
        return $query->where('role', 'super-admin');
    }
}
