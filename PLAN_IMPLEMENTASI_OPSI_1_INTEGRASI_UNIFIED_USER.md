# 🔗 PLAN IMPLEMENTASI OPSI 1 - UNIFIED USER SYSTEM (INTEGRASI PENUH)
**Tanggal**: 28 November 2024
**Status**: Ready for Implementation
**Kompleksitas**: HIGH
**Estimasi Waktu**: 10-12 Jam
**Impact**: MAJOR - Merubah fundamental architecture

---

## 📌 DAFTAR ISI
1. [Ringkasan Opsi 1](#ringkasan-opsi-1)
2. [Analisis Perbandingan](#analisis-perbandingan)
3. [Database Architecture](#database-architecture)
4. [Implementation Plan](#implementation-plan)
5. [Migration Strategy](#migration-strategy)
6. [Code Changes](#code-changes)
7. [Testing Plan](#testing-plan)
8. [Rollback Plan](#rollback-plan)

---

## 📋 RINGKASAN OPSI 1

### Konsep Utama
**Mengintegrasikan sistem User Asset Management dan User Jaminan menjadi SATU user table dengan role yang comprehensive.**

```
SEBELUM (Separated):
┌──────────────────────┐      ┌──────────────────────┐
│ Database Asset       │      │ Database Jaminan     │
│ users table          │      │ jaminan_users table  │
├──────────────────────┤      ├──────────────────────┤
│ super-admin          │      │ super-admin          │
│ admin (holding)      │      │ admin-holding        │
│ unit                 │      │ admin-kredit         │
│ user                 │      │ (no unit concept)    │
│ auditor              │      └──────────────────────┘
└──────────────────────┘
  Tidak terhubung!

SESUDAH (Integrated):
┌──────────────────────────────────────────┐
│ Database Asset (Master)                  │
│ users table (satu-satunya)               │
├──────────────────────────────────────────┤
│ super-admin                              │
│ admin-holding                            │
│ admin-kredit (+ unit_id)                 │
│ admin-unit                               │
│ user-regular                             │
│ auditor                                  │
└──────────────────────────────────────────┘
   Terkoneksi ke semua sistem!
```

### Keuntungan Opsi 1
✅ **One Login, Multiple Systems** - User login 1x, akses aset + jaminan
✅ **One User Database** - Master source of truth
✅ **Consistent Roles** - Role sama di semua sistem
✅ **Easy Permission Management** - Sentralisasi kontrol
✅ **Single Token** - Tidak perlu manage multiple tokens
✅ **Better UX** - User tidak perlu login berkali-kali
✅ **Scalable** - Mudah tambah sistem baru

### Kerugian Opsi 1
❌ **Database Migration Required** - Merge 2 database
❌ **Data Cleanup Needed** - Handle duplicate emails, dll
❌ **Downtime Risk** - Selama migration
❌ **Complex Implementation** - Refactoring besar
❌ **Testing Extensive** - QA memerlukan waktu lebih

---

## 📊 ANALISIS PERBANDINGAN

### Saat Ini (Current State)

```
Asset Management System:
├── Database: asset_management_db
├── User Table: users (id, name, email, password, role, unit_id)
├── Roles: super-admin, admin, unit, user, auditor
├── Auth: POST /api/auth/login → Token A
└── Guards: auth:sanctum (default connection)

Jaminan System:
├── Database: asset_jaminan
├── User Table: jaminan_users (id, name, email, password, role)
├── Roles: super-admin, admin-holding, admin-kredit
├── Auth: POST /api/jaminan/auth/login → Token B
└── Guards: auth:sanctum (mysql_jaminan connection)

❌ Problem: 2 users dengan email sama = confusion!
❌ Problem: Super-admin asset ≠ Super-admin jaminan
❌ Problem: Harus manage 2 tokens, 2 logins
```

### Setelah Opsi 1 (Integrated State)

```
Unified Asset & Guarantee System:
├── Database: asset_management_db (master)
├── User Table: users (id, name, email, password, role, unit_id)
├── Roles:
│   ├── super-admin (akses: asset + jaminan + user management)
│   ├── admin-holding (akses: asset + jaminan, no input jaminan)
│   ├── admin-kredit (akses: jaminan only, with unit_id)
│   ├── admin-unit (akses: asset own unit only)
│   ├── user-regular (akses: borrow asset own unit)
│   └── auditor (view-only semua sistem)
├── Auth: POST /api/auth/login → Token (untuk semua sistem)
└── Guards: auth:sanctum (default connection)

✅ 1 User table
✅ 1 Login
✅ 1 Token
✅ Consistent roles
✅ Jaminan_users table DEPRECATED (archived)
```

---

## 🏗️ DATABASE ARCHITECTURE

### Phase 1: New Schema (During Migration)

```sql
-- Tabel users baru dengan role yang comprehensive
ALTER TABLE users MODIFY COLUMN role VARCHAR(50) NOT NULL;

-- Add new columns
ALTER TABLE users ADD COLUMN can_access_jaminan BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN is_deprecated_user BOOLEAN DEFAULT false;

-- Mapping dari jaminan_users ke users
CREATE TABLE user_migration_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  jaminan_user_id BIGINT,
  new_user_id BIGINT,
  jaminan_email VARCHAR(255),
  asset_email VARCHAR(255),
  status ENUM('merged', 'created', 'skipped', 'conflict'),
  notes TEXT,
  created_at TIMESTAMP
);
```

### New Role Structure

```
┌──────────────────────────────────────────────────────────────┐
│                    ROLE HIERARCHY (NEW)                      │
├──────────────────────────────────────────────────────────────┤
│ super-admin                                                  │
│ ├── Access: ALL (asset + jaminan + user management)         │
│ ├── Unit Restriction: None (akses semua unit)               │
│ └── CRUD: Create, Read, Update, Delete - ALL                │
│                                                              │
│ admin-holding                                                │
│ ├── Access: Asset Management + Jaminan (view only)          │
│ ├── Unit Restriction: None (akses semua unit)               │
│ └── CRUD: Asset (C/R/U/D), Jaminan (R only), Loan (R)      │
│                                                              │
│ admin-kredit                                                 │
│ ├── Access: Jaminan only (+ unit restriction)               │
│ ├── Unit Restriction: YES (unit_id required)                │
│ └── CRUD: Jaminan (C/R/U/D) own unit, Loan (C/R/U)          │
│                                                              │
│ admin-unit                                                   │
│ ├── Access: Asset Management only (+ unit restriction)      │
│ ├── Unit Restriction: YES (unit_id required)                │
│ └── CRUD: Asset (C/R/U/D) own unit, Loan approve             │
│                                                              │
│ user-regular                                                 │
│ ├── Access: Asset only (borrow, view own)                   │
│ ├── Unit Restriction: YES (unit_id required)                │
│ └── CRUD: AssetLoan (C - borrow), Read own                  │
│                                                              │
│ auditor                                                      │
│ ├── Access: View ALL (asset + jaminan + reports)            │
│ ├── Unit Restriction: None (view semua unit)                │
│ └── CRUD: Read only (no Create/Update/Delete)               │
└──────────────────────────────────────────────────────────────┘
```

### User Model dengan Role Mapping

```php
// Mapping dari old roles ke new roles
const ROLE_MAPPING = [
    // Old Asset System
    'super-admin' => 'super-admin',      // tetap sama
    'admin' => 'admin-holding',          // rename
    'unit' => 'admin-unit',              // rename
    'user' => 'user-regular',            // rename
    'auditor' => 'auditor',              // tetap sama

    // Old Jaminan System
    'super-admin' (jaminan) => 'super-admin',           // merge
    'admin-holding' (jaminan) => 'admin-holding',       // merge
    'admin-kredit' (jaminan) => 'admin-kredit',         // tetap sama
];
```

---

## 🔧 IMPLEMENTATION PLAN

### Step 1: Preparation (1 Hour)

#### 1.1 Backup Database
```bash
# Backup asset_management_db
mysqldump -u root asset_management_db > backup_asset_$(date +%Y%m%d_%H%M%S).sql

# Backup asset_jaminan
mysqldump -u root asset_jaminan > backup_jaminan_$(date +%Y%m%d_%H%M%S).sql

# Save these backups safely!
```

#### 1.2 Create Migration Script
**File:** `database/migrations/2025_11_28_integrate_jaminan_users_to_users.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Step 1: Create migration log table (untuk tracking)
        Schema::create('user_migration_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('jaminan_user_id')->nullable();
            $table->unsignedBigInteger('new_user_id')->nullable();
            $table->string('jaminan_email')->nullable();
            $table->string('asset_email')->nullable();
            $table->enum('status', ['merged', 'created', 'skipped', 'conflict']);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // Step 2: Add columns ke users table untuk accommodate jaminan data
        Schema::table('users', function (Blueprint $table) {
            // Ensure role is VARCHAR not ENUM
            if (!DB::select("SHOW COLUMNS FROM users WHERE Field = 'role' AND Column_type LIKE 'varchar%'")[0] ?? false) {
                $table->string('role', 50)->change();
            }

            // New columns untuk track access
            if (!Schema::hasColumn('users', 'can_access_jaminan')) {
                $table->boolean('can_access_jaminan')->default(false)->after('role');
            }

            if (!Schema::hasColumn('users', 'jaminan_user_id')) {
                $table->unsignedBigInteger('jaminan_user_id')->nullable()->after('can_access_jaminan');
            }
        });

        // Step 3: Update role values di users table untuk consistency
        // super-admin tetap sama
        // admin → admin-holding
        DB::table('users')
            ->where('role', 'admin')
            ->update(['role' => 'admin-holding']);

        // unit → admin-unit
        DB::table('users')
            ->where('role', 'unit')
            ->update(['role' => 'admin-unit']);

        // user → user-regular
        DB::table('users')
            ->where('role', 'user')
            ->update(['role' => 'user-regular']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_migration_logs');

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'can_access_jaminan')) {
                $table->dropColumn('can_access_jaminan');
            }
            if (Schema::hasColumn('users', 'jaminan_user_id')) {
                $table->dropColumn('jaminan_user_id');
            }
        });

        // Revert role names
        DB::table('users')
            ->where('role', 'admin-holding')
            ->update(['role' => 'admin']);

        DB::table('users')
            ->where('role', 'admin-unit')
            ->update(['role' => 'unit']);

        DB::table('users')
            ->where('role', 'user-regular')
            ->update(['role' => 'user']);
    }
};
```

### Step 2: Data Migration (2-3 Hours)

#### 2.1 Create Seeder untuk Merge Data
**File:** `database/seeders/MigrateJaminanUsersToUsers.php`

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class MigrateJaminanUsersToUsers extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get all jaminan_users dari database jaminan
        $jaminanUsers = DB::connection('mysql_jaminan')
            ->table('jaminan_users')
            ->get();

        $logData = [];
        $mergedCount = 0;
        $createdCount = 0;
        $conflictCount = 0;

        foreach ($jaminanUsers as $jaminanUser) {
            // Check apakah email sudah exist di users table asset
            $existingUser = DB::table('users')
                ->where('email', $jaminanUser->email)
                ->first();

            if ($existingUser) {
                // Case 1: Email sudah ada = MERGE
                $this->mergeUser($existingUser, $jaminanUser);

                $logData[] = [
                    'jaminan_user_id' => $jaminanUser->id,
                    'new_user_id' => $existingUser->id,
                    'jaminan_email' => $jaminanUser->email,
                    'asset_email' => $existingUser->email,
                    'status' => 'merged',
                    'notes' => "User sudah ada, di-merge dengan jaminan role",
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
                $mergedCount++;
            } else {
                // Case 2: Email baru = CREATE
                $newUserId = $this->createNewUser($jaminanUser);

                $logData[] = [
                    'jaminan_user_id' => $jaminanUser->id,
                    'new_user_id' => $newUserId,
                    'jaminan_email' => $jaminanUser->email,
                    'asset_email' => $jaminanUser->email,
                    'status' => 'created',
                    'notes' => "User baru created dari jaminan_users",
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
                $createdCount++;
            }
        }

        // Insert migration logs
        DB::table('user_migration_logs')->insert($logData);

        echo "\n=== MIGRATION SUMMARY ===\n";
        echo "Total Jaminan Users: " . count($jaminanUsers) . "\n";
        echo "Merged: $mergedCount\n";
        echo "Created: $createdCount\n";
        echo "Conflicts: $conflictCount\n";
        echo "========================\n\n";
    }

    /**
     * Merge jaminan user data ke existing asset user
     */
    private function mergeUser($assetUser, $jaminanUser): void
    {
        DB::table('users')
            ->where('id', $assetUser->id)
            ->update([
                'can_access_jaminan' => true,
                'jaminan_user_id' => $jaminanUser->id,
                'updated_at' => now(),
            ]);

        // If asset user is super-admin, tetap super-admin
        // If asset user is admin, tetap admin-holding
        // If jaminan user adalah admin-kredit, tetap ada? (logic perlu clarify)
    }

    /**
     * Create new user dari jaminan_users data
     */
    private function createNewUser($jaminanUser): int
    {
        $newRole = match ($jaminanUser->role) {
            'super-admin' => 'super-admin',
            'admin-holding' => 'admin-holding',
            'admin-kredit' => 'admin-kredit',
            default => 'user-regular',
        };

        $userId = DB::table('users')->insertGetId([
            'name' => $jaminanUser->name,
            'email' => $jaminanUser->email,
            'password' => $jaminanUser->password, // Password sudah hashed
            'role' => $newRole,
            'unit_id' => null, // Default, bisa di-update manual
            'can_access_jaminan' => true,
            'jaminan_user_id' => $jaminanUser->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $userId;
    }
}
```

#### 2.2 Run Migration & Seeder
```bash
# Run migration
php artisan migrate

# Run seeder untuk merge data
php artisan db:seed --class=MigrateJaminanUsersToUsers

# Verify data
php artisan tinker
>>> DB::table('user_migration_logs')->get();
>>> DB::table('users')->count();
```

### Step 3: Code Updates (3-4 Hours)

#### 3.1 Update User Model
**File:** `app/Models/User.php`

```php
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

    protected $fillable = [
        'name',
        'username',
        'email',
        'password',
        'role',
        'unit_id',
        'can_access_jaminan',
        'jaminan_user_id',
    ];

    // === SUPER-ADMIN CHECKS ===

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super-admin';
    }

    // === ADMIN HOLDING CHECKS ===

    public function isAdminHolding(): bool
    {
        return $this->role === 'admin-holding';
    }

    public function canAccessAsset(): bool
    {
        return in_array($this->role, ['super-admin', 'admin-holding', 'admin-unit']);
    }

    public function canAccessJaminan(): bool
    {
        return in_array($this->role, ['super-admin', 'admin-holding', 'admin-kredit'])
            || $this->can_access_jaminan;
    }

    // === ADMIN-KREDIT CHECKS ===

    public function isAdminKredit(): bool
    {
        return $this->role === 'admin-kredit';
    }

    public function isAdminUnit(): bool
    {
        return $this->role === 'admin-unit';
    }

    // === PERMISSION CHECKS ===

    public function canCreateJaminan(): bool
    {
        return in_array($this->role, ['super-admin', 'admin-kredit']);
    }

    public function canUpdateJaminan(): bool
    {
        return in_array($this->role, ['super-admin', 'admin-kredit']);
    }

    public function canDeleteJaminan(): bool
    {
        return in_array($this->role, ['super-admin', 'admin-kredit']);
    }

    public function canViewJaminan(): bool
    {
        return in_array($this->role, ['super-admin', 'admin-holding', 'admin-kredit']);
    }

    public function canDownloadReport(): bool
    {
        return in_array($this->role, ['super-admin', 'admin-holding', 'admin-kredit', 'auditor']);
    }

    // === EXISTING ASSET MANAGEMENT CHECKS (Preserved) ===

    public function canManageUnit(?Unit $unit): bool
    {
        if (in_array($this->role, ['super-admin', 'admin-holding'])) {
            return true;
        }

        if ($this->role === 'admin-unit' && $unit && $this->unit_id === $unit->id) {
            return true;
        }

        return false;
    }

    // ... (preserve semua existing methods dari User.php)
}
```

#### 3.2 Remove JaminanUser Model Alias
**File:** `app/Models_jaminan/JaminanUser.php`

Ubah menjadi alias ke User model:

```php
<?php

namespace App\Models_jaminan;

/**
 * DEPRECATED: Use App\Models\User instead
 *
 * JaminanUser is now an alias for User model
 * This class is maintained for backward compatibility only
 */
class JaminanUser extends \App\Models\User
{
    // Backward compatibility - all functionality moved to User model
    protected $connection = 'mysql'; // use default connection
    protected $table = 'users';
}
```

#### 3.3 Update Auth Controllers

**File:** `app/Http/Controllers/Api/AuthSSOController.php`

```php
<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthSSOController extends Controller
{
    /**
     * Login user (supports both asset & jaminan access)
     */
    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        // Try SSO first
        if ($ssoUser = $this->loginViaSSO($validated['email'])) {
            return response()->json([
                'message' => 'Login successful via SSO',
                'user' => $ssoUser,
                'token' => $ssoUser->createToken('api-token')->plainTextToken,
                'access' => [
                    'asset' => $ssoUser->canAccessAsset(),
                    'jaminan' => $ssoUser->canAccessJaminan(),
                ],
            ]);
        }

        // Fallback to local login
        if (!Auth::attempt($validated)) {
            return response()->json(['error' => 'Invalid credentials'], 401);
        }

        $user = Auth::user();

        return response()->json([
            'message' => 'Login successful',
            'user' => $user,
            'token' => $user->createToken('api-token')->plainTextToken,
            'access' => [
                'asset' => $user->canAccessAsset(),
                'jaminan' => $user->canAccessJaminan(),
            ],
        ]);
    }

    /**
     * Get current user with both system access info
     */
    public function user(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'data' => $user,
            'access' => [
                'asset' => $user->canAccessAsset(),
                'jaminan' => $user->canAccessJaminan(),
            ],
            'permissions' => $user->getPermissionsSummary(),
        ]);
    }
}
```

**File:** `app/Http/Controllers/Api_jaminan/JaminanAuthController.php`

```php
<?php

namespace App\Http\Controllers\Api_jaminan;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class JaminanAuthController extends Controller
{
    /**
     * Login untuk jaminan system (sekarang use users table)
     */
    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        // Cek apakah user ada dan punya akses jaminan
        $user = User::where('email', $validated['email'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            return response()->json(['error' => 'Invalid credentials'], 401);
        }

        // Verify user punya akses jaminan
        if (!$user->canAccessJaminan()) {
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'User tidak memiliki akses ke sistem jaminan'
            ], 403);
        }

        return response()->json([
            'message' => 'Login successful',
            'user' => $user,
            'token' => $user->createToken('jaminan-api-token')->plainTextToken,
            'access' => [
                'asset' => $user->canAccessAsset(),
                'jaminan' => $user->canAccessJaminan(),
            ],
        ]);
    }

    /**
     * User management - only for super-admin
     */
    public function store(Request $request)
    {
        $currentUser = Auth::user();

        if (!$currentUser->isSuperAdmin()) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'role' => 'required|in:super-admin,admin-holding,admin-kredit',
            'unit_id' => 'nullable|exists:units,id',
        ]);

        // Validate: admin-kredit harus punya unit_id
        if ($validated['role'] === 'admin-kredit' && !isset($validated['unit_id'])) {
            return response()->json([
                'error' => 'Validation Error',
                'message' => 'Admin-kredit harus memiliki unit_id'
            ], 422);
        }

        $validated['password'] = Hash::make($validated['password']);
        $validated['can_access_jaminan'] = in_array($validated['role'],
            ['super-admin', 'admin-holding', 'admin-kredit']
        );

        $user = User::create($validated);

        return response()->json($user, 201);
    }
}
```

#### 3.4 Update Routes

**File:** `routes/api.php`

```php
<?php

use App\Http\Controllers\Api\AuthSSOController;
use App\Http\Controllers\Api_jaminan\JaminanAuthController;
use App\Http\Controllers\Api_jaminan\GuaranteeController;
use App\Http\Controllers\Api_jaminan\GuaranteeLoanController;
use App\Http\Controllers\Api_jaminan\GuaranteeSettlementController;

// ===== UNIFIED AUTH ROUTES =====
Route::post('/auth/login', [AuthSSOController::class, 'login']);
Route::post('/auth/logout', [AuthSSOController::class, 'logout'])->middleware('auth:sanctum');
Route::get('/auth/user', [AuthSSOController::class, 'user'])->middleware('auth:sanctum');
Route::get('/auth/verify-token', [AuthSSOController::class, 'verifyToken'])->middleware('auth:sanctum');

// ===== ASSET MANAGEMENT ROUTES (Protected) =====
Route::middleware(['auth:sanctum'])->group(function () {
    Route::middleware('asset_access')->group(function () {
        Route::apiResource('assets', AssetController::class);
        // ... other asset routes
    });
});

// ===== JAMINAN ROUTES (Integrated) =====
Route::prefix('jaminan')->middleware(['auth:sanctum'])->group(function () {
    // Auth (Redirect ke main auth)
    Route::post('/auth/login', [JaminanAuthController::class, 'login']); // alternative endpoint

    // Guarantee management
    Route::middleware('jaminan_access')->group(function () {
        Route::get('/guarantees', [GuaranteeController::class, 'index']);
        Route::get('/guarantees/{id}', [GuaranteeController::class, 'show']);

        Route::middleware('jaminan_write')->group(function () {
            Route::post('/guarantees', [GuaranteeController::class, 'store']);
            Route::put('/guarantees/{id}', [GuaranteeController::class, 'update']);
            Route::delete('/guarantees/{id}', [GuaranteeController::class, 'destroy']);
        });
    });

    // User management - super admin only
    Route::middleware('super_admin_only')->group(function () {
        Route::get('/users', [JaminanAuthController::class, 'index']);
        Route::post('/users', [JaminanAuthController::class, 'store']);
        Route::put('/users/{id}', [JaminanAuthController::class, 'update']);
        Route::delete('/users/{id}', [JaminanAuthController::class, 'destroy']);
    });
});
```

#### 3.5 Create New Middleware

**File:** `app/Http/Middleware/AssetAccessMiddleware.php`

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class AssetAccessMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if (!$user || !$user->canAccessAsset()) {
            return response()->json(['error' => 'Access denied to asset management'], 403);
        }

        return $next($request);
    }
}
```

**File:** `app/Http/Middleware/JaminanAccessMiddleware.php`

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class JaminanAccessMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if (!$user || !$user->canAccessJaminan()) {
            return response()->json(['error' => 'Access denied to guarantee system'], 403);
        }

        return $next($request);
    }
}
```

**File:** `app/Http/Middleware/JaminanWriteMiddleware.php`

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class JaminanWriteMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        // Only admin-kredit & super-admin can write
        if (!$user || !in_array($user->role, ['super-admin', 'admin-kredit'])) {
            return response()->json(['error' => 'Permission denied'], 403);
        }

        return $next($request);
    }
}
```

### Step 4: Controller Updates (2-3 Hours)

#### 4.1 Update GuaranteeController.php

```php
<?php

namespace App\Http\Controllers\Api_jaminan;

use App\Models\User;
use App\Models\Guarantee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class GuaranteeController extends Controller
{
    /**
     * Now using App\Models\User instead of JaminanUser
     * All authorization logic moved to User model
     */

    public function index(Request $request)
    {
        $user = Auth::user(); // Returns User model

        // User sudah verified via middleware
        // Query based on role & unit
        $query = Guarantee::with('unit');

        // Apply unit filtering untuk admin-kredit
        if ($user->role === 'admin-kredit' && $user->unit_id) {
            $query->where('unit_id', $user->unit_id);
        }

        return response()->json([
            'data' => $query->paginate(15),
            'permissions' => [
                'can_create' => $user->canCreateJaminan(),
                'can_edit' => $user->canUpdateJaminan(),
                'can_delete' => $user->canDeleteJaminan(),
            ]
        ]);
    }

    public function store(Request $request)
    {
        $user = Auth::user();

        if (!$user->canCreateJaminan()) {
            return response()->json(['error' => 'Permission denied'], 403);
        }

        // ... rest of implementation
    }

    // ... other methods
}
```

### Step 5: Frontend Updates (1-2 Hours)

Update navigation to show/hide based on unified user.access:

```jsx
// navigation component
const getAccessibleMenus = (user) => {
    const menus = [];

    if (user.access.asset) {
        menus.push({
            id: 'asset',
            label: 'Asset Management',
            path: '/asset'
        });
    }

    if (user.access.jaminan) {
        menus.push({
            id: 'guarantee',
            label: 'Jaminan',
            path: '/jaminan'
        });
    }

    return menus;
};
```

### Step 6: Testing (2-3 Hours)

#### 6.1 Test Migration Data
```bash
# Verify migration completed
php artisan tinker
>>> DB::table('user_migration_logs')->count();
>>> DB::table('users')->count();
>>> DB::table('users')->where('can_access_jaminan', true)->count();

# Check for conflicts
>>> DB::table('user_migration_logs')->where('status', 'conflict')->get();
```

#### 6.2 Test Login
```bash
# Test super-admin login
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Response should include:
{
  "access": {
    "asset": true,
    "jaminan": true
  }
}
```

#### 6.3 Test Access Control
```bash
# Test admin-kredit access jaminan
curl -X GET http://localhost/api/jaminan/guarantees \
  -H "Authorization: Bearer {token}"
# Expected: 200 OK

# Test admin-kredit access asset
curl -X GET http://localhost/api/assets \
  -H "Authorization: Bearer {token}"
# Expected: 403 Forbidden
```

---

## 🔄 MIGRATION STRATEGY

### Timeline

| Phase | Duration | Activity | Risk |
|-------|----------|----------|------|
| Preparation | 1 hour | Backup, setup | LOW |
| Migration | 2-3 hours | Data merge, role conversion | MEDIUM |
| Code Update | 3-4 hours | Models, controllers, routes | HIGH |
| Frontend | 1-2 hours | Navigation, login logic | LOW |
| Testing | 2-3 hours | Functional, regression testing | MEDIUM |
| **Total** | **10-12 hours** | | |

### Rollback Plan

Jika ada error, rollback ke backup:

```bash
# Restore asset database
mysql -u root < backup_asset_YYYYMMDD_HHMMSS.sql

# Restore jaminan database
mysql -u root < backup_jaminan_YYYYMMDD_HHMMSS.sql

# Revert code changes (git)
git revert {migration-commit-hash}
```

---

## 📝 CHECKLIST IMPLEMENTASI

### Phase 1: Preparation
- [ ] Backup kedua database
- [ ] Create migration script
- [ ] Create seeder script
- [ ] Verify script di development environment

### Phase 2: Data Migration
- [ ] Run migration untuk alter users table
- [ ] Run seeder untuk merge data
- [ ] Verify migration logs
- [ ] Identify & resolve conflicts

### Phase 3: Code Changes
- [ ] Update User.php model
- [ ] Deprecate JaminanUser.php
- [ ] Update Auth controllers (both asset & jaminan)
- [ ] Create new middleware (access control)
- [ ] Update GuaranteeController.php
- [ ] Update all jaminan controllers
- [ ] Update routes/api.php

### Phase 4: Frontend
- [ ] Update navigation logic
- [ ] Update login flow
- [ ] Update access checking
- [ ] Test in all browsers

### Phase 5: Testing
- [ ] Migration data verification
- [ ] Authentication tests
- [ ] Authorization tests
- [ ] Role-based access tests
- [ ] Unit-based filtering tests
- [ ] Regression testing (asset management)

### Phase 6: Deployment
- [ ] Create deployment checklist
- [ ] Schedule maintenance window
- [ ] Execute migration
- [ ] Verify in production
- [ ] Monitor error logs
- [ ] Communicate to users

---

## 🎯 KEY BENEFITS

| Benefit | Impact | Timeline |
|---------|--------|----------|
| One Login | Better UX, less confusion | Immediate |
| One Token | Simplified frontend logic | Immediate |
| Consistent Roles | Easier permission management | Immediate |
| Master User DB | Single source of truth | Immediate |
| Scalable | Easy add new systems | Long-term |
| Maintainable | Less code duplication | Long-term |

---

## ⚠️ RISKS & MITIGATION

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Data loss during migration | Low | Critical | Backup + test migrate script |
| Duplicate email conflicts | Medium | High | Manual review + seeder logic |
| Role mapping errors | Medium | High | Verify mapping, test each role |
| Breaking existing asset system | Low | Critical | Branch strategy, thorough testing |
| Frontend incompatibility | Low | Medium | Cross-browser testing |

---

## 📊 ESTIMATED EFFORT BREAKDOWN

```
Preparation:        1 hour   ████████░░░░░░░░░░░░░░░░░░░░░░░░░░
Migration:          3 hours  ██████████████████░░░░░░░░░░░░░░░░
Code Update:        4 hours  ████████████████████████░░░░░░░░░░
Frontend:           2 hours  ██████████░░░░░░░░░░░░░░░░░░░░░░░░
Testing:            2 hours  ██████████░░░░░░░░░░░░░░░░░░░░░░░░
────────────────────────────────────────────────────────────
TOTAL:              12 hours
```

---

**Status**: Ready for Implementation
**Last Updated**: 28 November 2024

