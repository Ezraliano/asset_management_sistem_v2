# 📋 PLAN IMPLEMENTASI - ROLE & PERMISSION MANAGEMENT JAMINAN SYSTEM
**Tanggal**: 28 November 2024
**Status**: Ready for Implementation
**Kompleksitas**: HIGH
**Estimasi Waktu**: 6-7 Jam

---

## 📌 DAFTAR ISI
1. [Ringkasan Kebutuhan](#ringkasan-kebutuhan)
2. [Analisis Sistem Saat Ini](#analisis-sistem-saat-ini)
3. [Tugas 1: Admin-Kredit - Akses Terbatas Jaminan](#tugas-1-admin-kredit---akses-terbatas-jaminan)
4. [Tugas 2: Super-Admin & Admin-Holding - Dual Access](#tugas-2-super-admin--admin-holding---dual-access)
5. [Tugas 3: Admin-Holding - View Only](#tugas-3-admin-holding---view-only)
6. [Tugas 4: Ubah Role ENUM ke VARCHAR](#tugas-4-ubah-role-enum-ke-varchar)
7. [Tugas 5: Unit-Based Access Control](#tugas-5-unit-based-access-control)
8. [Checklist Implementasi](#checklist-implementasi)
9. [Testing Plan](#testing-plan)

---

## 📊 RINGKASAN KEBUTUHAN

| No | Tugas | Deskripsi | Prioritas | Kompleksitas | Impact |
|----|-------|-----------|-----------|--------------|--------|
| 1 | Admin-Kredit Access | Admin-kredit hanya buka halaman jaminan & lakukan transaksi input/update | HIGH | Medium | Routing & Permission |
| 2 | Dual System Access | Super-admin & admin-holding buka BOTH aset + jaminan | HIGH | Low | Navigation & Auth |
| 3 | Admin-Holding Restriction | Admin-holding view & download only, TIDAK bisa input/update/delete | MEDIUM | Low | Controller Permission |
| 4 | Schema Change | Ubah tabel `jaminan_users` role dari ENUM ke VARCHAR (consistency) | HIGH | Low | Database Migration |
| 5 | Unit-Based Access | Admin-kredit dibedakan per unit (unit filtering) | HIGH | High | Database + Controllers |

---

## 🔍 ANALISIS SISTEM SAAT INI

### Database Architecture

**Dual Database Setup:**
```
┌─────────────────────────────┐
│   asset_management_db       │
├─────────────────────────────┤
│ users (5 roles)             │
│ - super-admin               │
│ - admin                      │
│ - unit                       │
│ - user                       │
│ - auditor                    │
│ FK: unit_id                 │
└─────────────────────────────┘

┌─────────────────────────────┐
│   asset_jaminan             │
├─────────────────────────────┤
│ jaminan_users (3 roles)     │
│ - super-admin               │
│ - admin-holding             │
│ - admin-kredit              │
│ CURRENT: role = ENUM        │
│ MISSING: unit_id            │
│                             │
│ guarantees                  │
│ - Jaminan data              │
│ - MISSING: unit_id          │
└─────────────────────────────┘
```

### Current Role System (Jaminan)

```
super-admin
  ├── Full access ke semua fitur jaminan
  ├── Manage users
  └── No unit restriction

admin-holding
  ├── Manage jaminan (semua unit)
  ├── View reports
  └── Approve settlements

admin-kredit
  ├── Input & manage jaminan
  ├── Create loans & settlements
  └── (Future: per-unit access)
```

### Current File Structure

**Database:**
- `database/migrations/` - Asset management migrations
- `database/migrations_jaminan/` - Jaminan migrations
  - `2024_11_25_000000_create_jaminan_users_table.php` ← **PERLU DIUBAH**
  - `2024_11_19_000000_create_guarantees_table.php` ← **PERLU TAMBAH unit_id**

**Models:**
- `app/Models_jaminan/JaminanUser.php` ← Update methods
- `app/Models_jaminan/Guarantee.php` ← Update relations & scopes
- `app/Models_jaminan/GuaranteeLoan.php` ← Update filtering
- `app/Models_jaminan/GuaranteeSettlement.php` ← Update filtering
- `app/Models_jaminan/Unit.php` ← Add relations

**Controllers:**
- `app/Http/Controllers/Api_jaminan/JaminanAuthController.php` ← Update user mgmt
- `app/Http/Controllers/Api_jaminan/GuaranteeController.php` ← Update filtering & permissions
- `app/Http/Controllers/Api_jaminan/GuaranteeLoanController.php` ← Update filtering
- `app/Http/Controllers/Api_jaminan/GuaranteeSettlementController.php` ← Update filtering

**Middleware:**
- `app/Http/Middleware/JaminanRoleMiddleware.php` ← Update role validation

**Frontend:**
- `frontend/components_jaminan/GuaranteeInputForm.tsx` ← Update unit selection
- `frontend/components_jaminan/GuaranteeList.tsx` ← Update filtering
- `frontend/components_jaminan/GuaranteeDetail.tsx` ← Add unit access check
- `frontend/components_jaminan/GuaranteeDashboard.tsx` ← Update navigation

---

## 🔧 TUGAS 1: ADMIN-KREDIT - AKSES TERBATAS JAMINAN

### Tujuan
Admin-kredit hanya bisa akses halaman jaminan dan melakukan transaksi input/update jaminan, TIDAK boleh akses asset management.

### Implementasi

#### 1.1 Update JaminanUser.php Model

**File:** `app/Models_jaminan/JaminanUser.php`

**Tambah Methods:**

```php
/**
 * Check apakah user adalah credit admin
 */
public function isCreditAdmin(): bool
{
    return $this->role === 'admin-kredit';
}

/**
 * Check apakah user adalah holding admin
 */
public function isHoldingAdmin(): bool
{
    return $this->role === 'admin-holding';
}

/**
 * Check apakah user adalah super admin
 */
public function isSuperAdmin(): bool
{
    return $this->role === 'super-admin';
}

/**
 * Check apakah user adalah admin (any type)
 */
public function isAdmin(): bool
{
    return in_array($this->role, ['super-admin', 'admin-holding', 'admin-kredit']);
}

/**
 * Check apakah user bisa manage jaminan
 * Super-admin & admin-kredit bisa manage
 */
public function canManageGuarantees(): bool
{
    return in_array($this->role, ['super-admin', 'admin-kredit']);
}

/**
 * Check apakah user bisa akses kedua sistem (asset + jaminan)
 * Super-admin & admin-holding bisa akses keduanya
 */
public function canAccessBothSystems(): bool
{
    return in_array($this->role, ['super-admin', 'admin-holding']);
}

/**
 * Check apakah user bisa akses jaminan system
 * Semua admin roles bisa akses jaminan
 */
public function canAccessGuaranteeSystem(): bool
{
    return $this->isAdmin();
}
```

#### 1.2 Update JaminanRoleMiddleware.php

**File:** `app/Http/Middleware/JaminanRoleMiddleware.php`

**Update Logic:**

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class JaminanRoleMiddleware
{
    public function handle(Request $request, Closure $next, ...$roles): mixed
    {
        $user = $request->user();

        // Jika user tidak authenticated
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Validate user memiliki required role
        if (!in_array($user->role, $roles)) {
            return response()->json([
                'error' => 'Forbidden',
                'message' => 'User tidak memiliki akses ke resource ini',
                'required_roles' => $roles,
                'user_role' => $user->role
            ], 403);
        }

        return $next($request);
    }
}
```

#### 1.3 Update Routes (routes/api.php)

**Configuration:**

```php
// Jaminan Routes - Akses berdasarkan role
Route::prefix('jaminan')->group(function () {

    // Auth routes (no authentication required)
    Route::post('/auth/login', [JaminanAuthController::class, 'login']);
    Route::post('/auth/logout', [JaminanAuthController::class, 'logout'])->middleware('auth:sanctum');
    Route::get('/auth/user', [JaminanAuthController::class, 'user'])->middleware('auth:sanctum');
    Route::get('/auth/verify-token', [JaminanAuthController::class, 'verifyToken'])->middleware('auth:sanctum');

    // Protected routes - Hanya admin roles
    Route::middleware(['auth:sanctum', 'jaminan_role:super-admin,admin-holding,admin-kredit'])->group(function () {

        // Guarantee CRUD - All roles bisa read
        Route::get('/guarantees', [GuaranteeController::class, 'index']);
        Route::get('/guarantees/{id}', [GuaranteeController::class, 'show']);
        Route::get('/guarantees/download/report', [GuaranteeController::class, 'downloadReport']);

        // Guarantee CREATE/UPDATE/DELETE - Only admin-kredit & super-admin
        Route::middleware('jaminan_role:admin-kredit,super-admin')->group(function () {
            Route::post('/guarantees', [GuaranteeController::class, 'store']);
            Route::put('/guarantees/{id}', [GuaranteeController::class, 'update']);
            Route::delete('/guarantees/{id}', [GuaranteeController::class, 'destroy']);
        });

        // Guarantee Loans
        Route::get('/guarantee-loans', [GuaranteeLoanController::class, 'index']);
        Route::get('/guarantee-loans/{id}', [GuaranteeLoanController::class, 'show']);
        Route::middleware('jaminan_role:admin-kredit,super-admin')->group(function () {
            Route::post('/guarantee-loans', [GuaranteeLoanController::class, 'store']);
            Route::post('/guarantee-loans/{id}/return', [GuaranteeLoanController::class, 'returnLoan']);
        });

        // Guarantee Settlements
        Route::get('/guarantee-settlements', [GuaranteeSettlementController::class, 'index']);
        Route::get('/guarantee-settlements/{id}', [GuaranteeSettlementController::class, 'show']);
        Route::middleware('jaminan_role:admin-kredit,super-admin')->group(function () {
            Route::post('/guarantee-settlements', [GuaranteeSettlementController::class, 'store']);
            Route::put('/guarantee-settlements/{id}', [GuaranteeSettlementController::class, 'update']);
        });
    });

    // User Management - Super admin only
    Route::middleware(['auth:sanctum', 'jaminan_role:super-admin'])->group(function () {
        Route::get('/users', [JaminanAuthController::class, 'index']);
        Route::post('/users', [JaminanAuthController::class, 'store']);
        Route::put('/users/{id}', [JaminanAuthController::class, 'update']);
        Route::delete('/users/{id}', [JaminanAuthController::class, 'destroy']);
    });
});

// Asset Management Routes - Separate dari jaminan
Route::middleware(['auth:sanctum', 'role:super-admin,admin,unit'])->group(function () {
    Route::apiResource('assets', AssetController::class);
    // ... asset routes
});
```

#### 1.4 Test Scenarios

```bash
# Test 1: Admin-kredit akses jaminan ✓
curl -X GET http://localhost/api/jaminan/guarantees \
  -H "Authorization: Bearer {admin-kredit-token}"
# Expected: 200 OK dengan list jaminan

# Test 2: Admin-kredit akses asset ✗
curl -X GET http://localhost/api/assets \
  -H "Authorization: Bearer {admin-kredit-token}"
# Expected: 403 Forbidden

# Test 3: Super-admin akses jaminan ✓
curl -X GET http://localhost/api/jaminan/guarantees \
  -H "Authorization: Bearer {super-admin-token}"
# Expected: 200 OK

# Test 4: Super-admin akses asset ✓
curl -X GET http://localhost/api/assets \
  -H "Authorization: Bearer {super-admin-token}"
# Expected: 200 OK
```

---

## 🔗 TUGAS 2: SUPER-ADMIN & ADMIN-HOLDING - DUAL ACCESS

### Tujuan
Super-admin dan admin-holding dapat membuka halaman BOTH aset management dan jaminan.

### Implementasi

#### 2.1 Update JaminanUser.php

**Tambah/Update Methods:**

```php
/**
 * Check apakah user bisa akses asset management system
 * Super-admin & admin-holding bisa akses
 */
public function canAccessAssetSystem(): bool
{
    return in_array($this->role, ['super-admin', 'admin-holding']);
}

/**
 * Check apakah user bisa akses jaminan system
 * Semua admin roles bisa akses
 */
public function canAccessGuaranteeSystem(): bool
{
    return $this->isAdmin();
}

/**
 * Get list sistem yang bisa diakses user
 */
public function getAccessibleSystems(): array
{
    $systems = [];

    if ($this->canAccessGuaranteeSystem()) {
        $systems[] = 'guarantee';
    }

    if ($this->canAccessAssetSystem()) {
        $systems[] = 'asset';
    }

    return $systems;
}
```

#### 2.2 Update JaminanRoleMiddleware.php

**Tambah Middleware untuk Asset Access:**

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class AssetAccessFromJaminanMiddleware
{
    /**
     * Middleware untuk allow super-admin & admin-holding
     * mengakses asset management dari jaminan system token
     */
    public function handle(Request $request, Closure $next): mixed
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Super-admin & admin-holding dari jaminan system bisa akses asset
        if (in_array($user->role, ['super-admin', 'admin-holding'])) {
            return $next($request);
        }

        return response()->json(['error' => 'Forbidden'], 403);
    }
}
```

#### 2.3 Update Routes untuk Dual Access

**File:** `routes/api.php`

```php
// Asset Routes - Allow super-admin & admin-holding dari jaminan system
Route::middleware(['auth:sanctum'])->group(function () {

    // Super-admin & admin-holding from both systems bisa akses asset
    Route::middleware('jaminan_asset_access:super-admin,admin-holding')->group(function () {
        Route::apiResource('assets', AssetController::class);
        Route::get('/assets/{id}/depreciation', [AssetDepreciationController::class, 'show']);
        // ... all asset routes
    });
});
```

#### 2.4 Frontend Navigation Update

**File:** `frontend/components_jaminan/GuaranteeDashboard.tsx` (atau main nav component)

```jsx
// Update navigation based on user role
const getAvailableMenus = (userRole: string): MenuItem[] => {
    const menus = [];

    // Jaminan menu - available untuk semua admin roles
    if (['super-admin', 'admin-holding', 'admin-kredit'].includes(userRole)) {
        menus.push({
            id: 'guarantee',
            label: 'Manajemen Jaminan',
            icon: 'document',
            path: '/jaminan/guarantees'
        });
    }

    // Asset menu - available untuk super-admin & admin-holding only
    if (['super-admin', 'admin-holding'].includes(userRole)) {
        menus.push({
            id: 'asset',
            label: 'Asset Management',
            icon: 'boxes',
            path: '/asset/assets'
        });
    }

    // User Management menu - super-admin only
    if (userRole === 'super-admin') {
        menus.push({
            id: 'user-management',
            label: 'Manajemen User',
            icon: 'users',
            path: '/jaminan/users'
        });
    }

    return menus;
};
```

#### 2.5 Test Scenarios

```bash
# Test 1: Super-admin akses jaminan ✓
curl -X GET http://localhost/api/jaminan/guarantees \
  -H "Authorization: Bearer {super-admin-token}"
# Expected: 200 OK

# Test 2: Super-admin akses asset ✓
curl -X GET http://localhost/api/assets \
  -H "Authorization: Bearer {super-admin-token}"
# Expected: 200 OK

# Test 3: Admin-holding akses jaminan ✓
curl -X GET http://localhost/api/jaminan/guarantees \
  -H "Authorization: Bearer {admin-holding-token}"
# Expected: 200 OK

# Test 4: Admin-holding akses asset ✓
curl -X GET http://localhost/api/assets \
  -H "Authorization: Bearer {admin-holding-token}"
# Expected: 200 OK

# Test 5: Admin-kredit akses asset ✗
curl -X GET http://localhost/api/assets \
  -H "Authorization: Bearer {admin-kredit-token}"
# Expected: 403 Forbidden
```

---

## 🔒 TUGAS 3: ADMIN-HOLDING - VIEW ONLY

### Tujuan
Admin-holding hanya bisa view & download jaminan, TIDAK bisa input/update/delete jaminan.

### Implementasi

#### 3.1 Update JaminanUser.php

**Tambah Methods:**

```php
/**
 * Check apakah user bisa create guarantee
 */
public function canCreateGuarantee(): bool
{
    // Only admin-kredit & super-admin
    return in_array($this->role, ['admin-kredit', 'super-admin']);
}

/**
 * Check apakah user bisa update guarantee
 */
public function canUpdateGuarantee(): bool
{
    // Only admin-kredit & super-admin
    return in_array($this->role, ['admin-kredit', 'super-admin']);
}

/**
 * Check apakah user bisa delete guarantee
 */
public function canDeleteGuarantee(): bool
{
    // Only admin-kredit & super-admin
    return in_array($this->role, ['admin-kredit', 'super-admin']);
}

/**
 * Check apakah user bisa view guarantee
 */
public function canViewGuarantee(): bool
{
    // All admin roles
    return $this->isAdmin();
}

/**
 * Check apakah user bisa download report
 */
public function canDownloadReport(): bool
{
    // All admin roles
    return $this->isAdmin();
}
```

#### 3.2 Update GuaranteeController.php

**File:** `app/Http/Controllers/Api_jaminan/GuaranteeController.php`

**Update Methods:**

```php
<?php

namespace App\Http\Controllers\Api_jaminan;

use App\Models_jaminan\Guarantee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class GuaranteeController extends Controller
{
    /**
     * Display list of guarantees (READ)
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        $query = Guarantee::query()
            ->with('unit')
            ->latest();

        // Apply filters from request
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('type')) {
            $query->where('guarantee_type', $request->type);
        }

        if ($request->has('unit_id')) {
            $query->where('unit_id', $request->unit_id);
        }

        return response()->json([
            'data' => $query->paginate(15),
            'can_create' => $user->canCreateGuarantee(),
            'can_edit' => $user->canUpdateGuarantee(),
            'can_delete' => $user->canDeleteGuarantee(),
        ]);
    }

    /**
     * Display guarantee details (READ)
     */
    public function show($id)
    {
        $guarantee = Guarantee::with('unit')->findOrFail($id);

        return response()->json($guarantee);
    }

    /**
     * Store a new guarantee (CREATE)
     * BLOCKED untuk admin-holding
     */
    public function store(Request $request)
    {
        $user = Auth::user();

        // Check permission
        if (!$user->canCreateGuarantee()) {
            return response()->json([
                'error' => 'Permission Denied',
                'message' => 'Admin holding tidak dapat membuat jaminan baru'
            ], 403);
        }

        $validated = $request->validate([
            'spk_number' => 'required|string|max:255',
            'cif_number' => 'required|string|max:255',
            'spk_name' => 'required|string|max:255',
            'credit_period' => 'required|string|max:255',
            'guarantee_name' => 'required|string|max:255',
            'guarantee_type' => 'required|in:BPKB,SHM,SHGB,E-SHM',
            'guarantee_number' => 'required|string|unique:guarantees,guarantee_number',
            'file_location' => 'nullable|string',
            'input_date' => 'required|date',
            'unit_id' => 'required|exists:units,id',
        ]);

        $guarantee = Guarantee::create($validated);

        return response()->json($guarantee, 201);
    }

    /**
     * Update guarantee (UPDATE)
     * BLOCKED untuk admin-holding
     */
    public function update(Request $request, $id)
    {
        $user = Auth::user();
        $guarantee = Guarantee::findOrFail($id);

        // Check permission
        if (!$user->canUpdateGuarantee()) {
            return response()->json([
                'error' => 'Permission Denied',
                'message' => 'Admin holding tidak dapat mengubah data jaminan'
            ], 403);
        }

        $validated = $request->validate([
            'spk_number' => 'sometimes|string|max:255',
            'cif_number' => 'sometimes|string|max:255',
            'spk_name' => 'sometimes|string|max:255',
            'credit_period' => 'sometimes|string|max:255',
            'guarantee_name' => 'sometimes|string|max:255',
            'guarantee_type' => 'sometimes|in:BPKB,SHM,SHGB,E-SHM',
            'guarantee_number' => 'sometimes|string|unique:guarantees,guarantee_number,' . $id,
            'file_location' => 'nullable|string',
            'input_date' => 'sometimes|date',
            'status' => 'sometimes|in:available,dipinjam,lunas',
            'unit_id' => 'sometimes|exists:units,id',
        ]);

        $guarantee->update($validated);

        return response()->json($guarantee);
    }

    /**
     * Delete guarantee (DELETE)
     * BLOCKED untuk admin-holding
     */
    public function destroy($id)
    {
        $user = Auth::user();
        $guarantee = Guarantee::findOrFail($id);

        // Check permission
        if (!$user->canDeleteGuarantee()) {
            return response()->json([
                'error' => 'Permission Denied',
                'message' => 'Admin holding tidak dapat menghapus jaminan'
            ], 403);
        }

        $guarantee->delete();

        return response()->json(null, 204);
    }

    /**
     * Download guarantee report (READ)
     * Allowed untuk semua admin roles
     */
    public function downloadReport(Request $request)
    {
        $user = Auth::user();

        // Check permission
        if (!$user->canDownloadReport()) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        // Generate & download report logic
        // ...

        return response()->json(['message' => 'Report generated successfully']);
    }
}
```

#### 3.3 Update Routes untuk Permission-Based Access

**File:** `routes/api.php`

```php
Route::prefix('jaminan')->middleware(['auth:sanctum'])->group(function () {

    // Read operations - Semua admin bisa akses
    Route::get('/guarantees', [GuaranteeController::class, 'index'])
        ->middleware('jaminan_role:super-admin,admin-holding,admin-kredit');

    Route::get('/guarantees/{id}', [GuaranteeController::class, 'show'])
        ->middleware('jaminan_role:super-admin,admin-holding,admin-kredit');

    Route::get('/guarantees/download/report', [GuaranteeController::class, 'downloadReport'])
        ->middleware('jaminan_role:super-admin,admin-holding,admin-kredit');

    // Write operations - Only admin-kredit & super-admin
    Route::post('/guarantees', [GuaranteeController::class, 'store'])
        ->middleware('jaminan_role:super-admin,admin-kredit');

    Route::put('/guarantees/{id}', [GuaranteeController::class, 'update'])
        ->middleware('jaminan_role:super-admin,admin-kredit');

    Route::delete('/guarantees/{id}', [GuaranteeController::class, 'destroy'])
        ->middleware('jaminan_role:super-admin,admin-kredit');
});
```

#### 3.4 Frontend Components Update

**File:** `frontend/components_jaminan/GuaranteeList.tsx`

```jsx
// Show/hide action buttons based on user permissions
const renderActions = (guarantee: Guarantee) => {
    if (!user) return null;

    return (
        <div className="actions">
            {/* View - always available */}
            <button onClick={() => viewDetail(guarantee.id)}>
                View
            </button>

            {/* Edit - only if canEdit */}
            {user.can_edit && (
                <button onClick={() => editGuarantee(guarantee.id)}>
                    Edit
                </button>
            )}

            {/* Delete - only if canDelete */}
            {user.can_delete && (
                <button onClick={() => deleteGuarantee(guarantee.id)}>
                    Delete
                </button>
            )}

            {/* Download - always available */}
            <button onClick={() => downloadReport(guarantee.id)}>
                Download Report
            </button>
        </div>
    );
};

// Disable form based on permissions
const GuaranteeInputForm = ({ guarantee, user }) => {
    const isReadOnly = !user.can_edit && !user.can_create;

    return (
        <form disabled={isReadOnly}>
            <input
                name="spk_number"
                disabled={isReadOnly}
                placeholder="SPK Number"
            />
            {/* other fields... */}

            <button
                type="submit"
                disabled={isReadOnly}
            >
                {isReadOnly ? 'View Only' : 'Save'}
            </button>
        </form>
    );
};
```

#### 3.5 Test Scenarios

```bash
# Test 1: Admin-holding view guarantees ✓
curl -X GET http://localhost/api/jaminan/guarantees \
  -H "Authorization: Bearer {admin-holding-token}"
# Expected: 200 OK dengan list

# Test 2: Admin-holding download report ✓
curl -X GET http://localhost/api/jaminan/guarantees/download/report \
  -H "Authorization: Bearer {admin-holding-token}"
# Expected: 200 OK

# Test 3: Admin-holding create guarantee ✗
curl -X POST http://localhost/api/jaminan/guarantees \
  -H "Authorization: Bearer {admin-holding-token}" \
  -H "Content-Type: application/json" \
  -d '{"spk_number":"SPK001",...}'
# Expected: 403 Permission Denied

# Test 4: Admin-holding update guarantee ✗
curl -X PUT http://localhost/api/jaminan/guarantees/1 \
  -H "Authorization: Bearer {admin-holding-token}" \
  -H "Content-Type: application/json" \
  -d '{"spk_number":"SPK002"}'
# Expected: 403 Permission Denied

# Test 5: Admin-holding delete guarantee ✗
curl -X DELETE http://localhost/api/jaminan/guarantees/1 \
  -H "Authorization: Bearer {admin-holding-token}"
# Expected: 403 Permission Denied

# Test 6: Admin-kredit create guarantee ✓
curl -X POST http://localhost/api/jaminan/guarantees \
  -H "Authorization: Bearer {admin-kredit-token}" \
  -H "Content-Type: application/json" \
  -d '{"spk_number":"SPK001",...}'
# Expected: 201 Created
```

---

## 📝 TUGAS 4: UBAH ROLE ENUM KE VARCHAR

### Tujuan
Ubah column `role` di tabel `jaminan_users` dari ENUM menjadi VARCHAR untuk consistency dengan tabel `users` di database asset management.

### Implementasi

#### 4.1 Buat Migration Baru

**File:** `database/migrations_jaminan/2025_11_28_change_jaminan_users_role_to_string.php`

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
        Schema::connection('mysql_jaminan')->table('jaminan_users', function (Blueprint $table) {
            // Change role column dari ENUM ke VARCHAR
            // Untuk MySQL, kita perlu modify langsung
            DB::connection('mysql_jaminan')->statement(
                "ALTER TABLE jaminan_users MODIFY role VARCHAR(50) NOT NULL"
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('mysql_jaminan')->table('jaminan_users', function (Blueprint $table) {
            // Revert back ke ENUM
            DB::connection('mysql_jaminan')->statement(
                "ALTER TABLE jaminan_users MODIFY role ENUM('super-admin', 'admin-holding', 'admin-kredit') NOT NULL"
            );
        });
    }
};
```

#### 4.2 Update Current Migration File

**File:** `database/migrations_jaminan/2024_11_25_000000_create_jaminan_users_table.php`

**Sebelum:**
```php
$table->enum('role', ['super-admin', 'admin-holding', 'admin-kredit'])->default('admin-kredit');
```

**Sesudah:**
```php
$table->string('role', 50)->default('admin-kredit');
```

#### 4.3 Update JaminanUser Model

**File:** `app/Models_jaminan/JaminanUser.php`

**Ensure:**
```php
<?php

namespace App\Models_jaminan;

use Illuminate\Database\Eloquent\Model;

class JaminanUser extends Model
{
    protected $connection = 'mysql_jaminan';
    protected $table = 'jaminan_users';

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'unit_id', // akan ditambah di tugas 5
        'created_at',
        'updated_at'
    ];

    // TIDAK perlu cast role, karena sudah string
    // protected $casts = [...]; // pastikan tidak ada 'role' cast ke enum

    // ... methods
}
```

#### 4.4 Update .env & Database Config

**Pastikan connection sudah setup:**

```php
// config/database.php
'mysql_jaminan' => [
    'driver' => 'mysql',
    'host' => env('DB_HOST_JAMINAN', '127.0.0.1'),
    'port' => env('DB_PORT_JAMINAN', 3306),
    'database' => env('DB_DATABASE_JAMINAN', 'asset_jaminan'),
    'username' => env('DB_USERNAME_JAMINAN', 'root'),
    'password' => env('DB_PASSWORD_JAMINAN', ''),
]
```

**Ensure di .env:**
```env
DB_HOST_JAMINAN=127.0.0.1
DB_PORT_JAMINAN=3306
DB_DATABASE_JAMINAN=asset_jaminan
DB_USERNAME_JAMINAN=root
DB_PASSWORD_JAMINAN=
```

#### 4.5 Run Migration

```bash
# Run the new migration untuk jaminan database
php artisan migrate --path=database/migrations_jaminan --database=mysql_jaminan

# Atau jika ingin run semua jaminan migrations
php artisan migrate --path=database/migrations_jaminan
```

#### 4.6 Verify Changes

```bash
# Check table structure
php artisan tinker
# Di tinker:
>>> DB::connection('mysql_jaminan')->table('jaminan_users')->get();
// Verify role column tipe VARCHAR bukan ENUM

# Atau via MySQL CLI
mysql> USE asset_jaminan;
mysql> DESC jaminan_users;
# Check 'role' column - harus VARCHAR(50) bukan ENUM
```

#### 4.7 Test Scenarios

```bash
# Test 1: Create user dengan role string
php artisan tinker
>>> $user = JaminanUser::create([
    'name' => 'Test User',
    'email' => 'test@example.com',
    'password' => bcrypt('password'),
    'role' => 'admin-kredit'
]);
>>> $user->role; // Expected: 'admin-kredit'

# Test 2: Query users by role
>>> JaminanUser::where('role', 'admin-kredit')->get();
// Expected: returns users dengan role admin-kredit

# Test 3: Update role
>>> $user->update(['role' => 'super-admin']);
>>> $user->role; // Expected: 'super-admin'
```

---

## 👥 TUGAS 5: UNIT-BASED ACCESS CONTROL

### Tujuan
Admin-kredit dibedakan per unit. Admin-kredit Kajoetangan hanya bisa lihat & input jaminan Kajoetangan. Admin-kredit Batu hanya bisa lihat & input jaminan Batu, dst.

### Implementasi - PALING KOMPLEKS

#### 5.1 Database Schema Updates

**Step 1: Buat Migration - Tambah unit_id ke jaminan_users**

**File:** `database/migrations_jaminan/2025_11_28_add_unit_id_to_jaminan_users.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('mysql_jaminan')->table('jaminan_users', function (Blueprint $table) {
            // Tambah unit_id column
            $table->unsignedBigInteger('unit_id')->nullable()->after('role');

            // Foreign key ke units table (di database jaminan)
            $table->foreign('unit_id')
                ->references('id')
                ->on('units')
                ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::connection('mysql_jaminan')->table('jaminan_users', function (Blueprint $table) {
            $table->dropForeign(['unit_id']);
            $table->dropColumn('unit_id');
        });
    }
};
```

**Step 2: Update Migration - Ensure guarantees punya unit_id**

**File:** `database/migrations_jaminan/2024_11_19_000000_create_guarantees_table.php`

**Pastikan ada:**
```php
Schema::connection('mysql_jaminan')->create('guarantees', function (Blueprint $table) {
    $table->id();

    // Tambah unit_id jika belum ada
    $table->unsignedBigInteger('unit_id')->nullable();
    $table->foreign('unit_id')
        ->references('id')
        ->on('units')
        ->onDelete('set null');

    // Other columns...
    $table->timestamps();
});
```

**Jika sudah ada, buat migration untuk tambahkan unit_id:**

**File:** `database/migrations_jaminan/2025_11_28_add_unit_id_to_guarantees.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('mysql_jaminan')->table('guarantees', function (Blueprint $table) {
            if (!Schema::connection('mysql_jaminan')->hasColumn('guarantees', 'unit_id')) {
                $table->unsignedBigInteger('unit_id')->nullable()->after('id');
                $table->foreign('unit_id')
                    ->references('id')
                    ->on('units')
                    ->onDelete('set null');
            }
        });
    }

    public function down(): void
    {
        Schema::connection('mysql_jaminan')->table('guarantees', function (Blueprint $table) {
            if (Schema::connection('mysql_jaminan')->hasColumn('guarantees', 'unit_id')) {
                $table->dropForeign(['unit_id']);
                $table->dropColumn('unit_id');
            }
        });
    }
};
```

#### 5.2 Update Models

**File:** `app/Models_jaminan/JaminanUser.php`

```php
<?php

namespace App\Models_jaminan;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JaminanUser extends Model
{
    protected $connection = 'mysql_jaminan';
    protected $table = 'jaminan_users';

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'unit_id',
    ];

    // === Relationships ===

    /**
     * Get unit that this user belongs to
     */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    // === Role Checking Methods ===

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super-admin';
    }

    public function isHoldingAdmin(): bool
    {
        return $this->role === 'admin-holding';
    }

    public function isCreditAdmin(): bool
    {
        return $this->role === 'admin-kredit';
    }

    public function isAdmin(): bool
    {
        return in_array($this->role, ['super-admin', 'admin-holding', 'admin-kredit']);
    }

    // === Permission Checking Methods ===

    /**
     * Get list unit IDs yang bisa diakses user
     * Super-admin & admin-holding: semua unit
     * Admin-kredit: hanya unit mereka sendiri
     */
    public function getAccessibleUnitIds(): array
    {
        // Super-admin & admin-holding - bisa akses semua unit
        if ($this->isSuperAdmin() || $this->isHoldingAdmin()) {
            return Unit::all()->pluck('id')->toArray();
        }

        // Admin-kredit - hanya unit mereka sendiri
        if ($this->isCreditAdmin() && $this->unit_id) {
            return [$this->unit_id];
        }

        // Jika tidak ada unit_id assigned, return empty array (no access)
        return [];
    }

    /**
     * Get nama unit yang bisa diakses
     */
    public function getAccessibleUnitNames(): array
    {
        $unitIds = $this->getAccessibleUnitIds();
        return Unit::whereIn('id', $unitIds)->pluck('name')->toArray();
    }

    /**
     * Check apakah user bisa akses guarantee di unit tertentu
     */
    public function canAccessGuaranteeInUnit($unitId): bool
    {
        $accessible = $this->getAccessibleUnitIds();
        return in_array($unitId, $accessible);
    }

    /**
     * Check apakah user bisa manage jaminan
     */
    public function canManageGuarantees(): bool
    {
        // Super-admin & admin-kredit bisa manage
        return in_array($this->role, ['super-admin', 'admin-kredit']);
    }

    /**
     * Check apakah user bisa create guarantee
     */
    public function canCreateGuarantee(): bool
    {
        return in_array($this->role, ['super-admin', 'admin-kredit']);
    }

    /**
     * Check apakah user bisa update guarantee
     */
    public function canUpdateGuarantee(): bool
    {
        return in_array($this->role, ['super-admin', 'admin-kredit']);
    }

    /**
     * Check apakah user bisa delete guarantee
     */
    public function canDeleteGuarantee(): bool
    {
        return in_array($this->role, ['super-admin', 'admin-kredit']);
    }

    /**
     * Check apakah user bisa view guarantee
     */
    public function canViewGuarantee(): bool
    {
        // Semua admin bisa view
        return $this->isAdmin();
    }

    /**
     * Check apakah user bisa download report
     */
    public function canDownloadReport(): bool
    {
        // Semua admin bisa download
        return $this->isAdmin();
    }

    /**
     * Check apakah user bisa manage loan
     */
    public function canManageLoan(): bool
    {
        return in_array($this->role, ['super-admin', 'admin-kredit']);
    }

    /**
     * Check apakah user bisa manage settlement
     */
    public function canManageSettlement(): bool
    {
        return in_array($this->role, ['super-admin', 'admin-kredit']);
    }

    /**
     * Get full name + unit info
     */
    public function getDisplayName(): string
    {
        if ($this->unit) {
            return "{$this->name} ({$this->unit->name})";
        }
        return $this->name;
    }
}
```

**File:** `app/Models_jaminan/Guarantee.php`

```php
<?php

namespace App\Models_jaminan;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Guarantee extends Model
{
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
        'unit_id',
    ];

    protected $casts = [
        'input_date' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // === Relationships ===

    /**
     * Get unit that this guarantee belongs to
     */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    // === Query Scopes ===

    /**
     * Filter guarantees accessible to a specific user
     * Super-admin & admin-holding: semua
     * Admin-kredit: hanya unit mereka
     */
    public function scopeAccessibleTo($query, JaminanUser $user)
    {
        // Super-admin & admin-holding: no filter (akses semua)
        if ($user->isSuperAdmin() || $user->isHoldingAdmin()) {
            return $query;
        }

        // Admin-kredit: filter by unit_id mereka
        if ($user->isCreditAdmin() && $user->unit_id) {
            return $query->where('unit_id', $user->unit_id);
        }

        // Default: no access (return empty result)
        return $query->whereRaw('1=0');
    }

    /**
     * Filter by status
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Filter by type
     */
    public function scopeByType($query, $type)
    {
        return $query->where('guarantee_type', $type);
    }

    /**
     * Filter by SPK number
     */
    public function scopeBySpkNumber($query, $spkNumber)
    {
        return $query->where('spk_number', $spkNumber);
    }

    /**
     * Filter by CIF number
     */
    public function scopeByCifNumber($query, $cifNumber)
    {
        return $query->where('cif_number', $cifNumber);
    }

    /**
     * Filter by date range
     */
    public function scopeByDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('input_date', [$startDate, $endDate]);
    }

    /**
     * Filter by unit
     */
    public function scopeByUnitId($query, $unitId)
    {
        return $query->where('unit_id', $unitId);
    }

    /**
     * Get all units dengan count
     */
    public function scopeCountByUnit($query)
    {
        return $query->groupBy('unit_id')
            ->selectRaw('unit_id, COUNT(*) as total')
            ->with('unit');
    }
}
```

**File:** `app/Models_jaminan/Unit.php`

```php
<?php

namespace App\Models_jaminan;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Unit extends Model
{
    protected $connection = 'mysql_jaminan';
    protected $table = 'units';

    protected $fillable = [
        'name',
        'code',
        'description',
    ];

    // === Relationships ===

    /**
     * Get all users dalam unit ini
     */
    public function users(): HasMany
    {
        return $this->hasMany(JaminanUser::class);
    }

    /**
     * Get semua guarantees dalam unit ini
     */
    public function guarantees(): HasMany
    {
        return $this->hasMany(Guarantee::class);
    }

    /**
     * Get admin-kredit users dalam unit ini
     */
    public function creditAdmins(): HasMany
    {
        return $this->hasMany(JaminanUser::class)
            ->where('role', 'admin-kredit');
    }
}
```

#### 5.3 Update Controllers

**File:** `app/Http/Controllers/Api_jaminan/GuaranteeController.php`

```php
<?php

namespace App\Http\Controllers\Api_jaminan;

use App\Models_jaminan\Guarantee;
use App\Models_jaminan\Unit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class GuaranteeController extends Controller
{
    /**
     * Display list of guarantees with unit-based filtering
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        // Base query dengan unit-based filtering
        $query = Guarantee::query()
            ->with('unit')
            ->accessibleTo($user); // Apply user's unit filter

        // Apply additional filters
        if ($request->has('status')) {
            $query->byStatus($request->status);
        }

        if ($request->has('type')) {
            $query->byType($request->type);
        }

        if ($request->has('unit_id') && $user->isSuperAdmin()) {
            // Only super-admin bisa filter by specific unit
            $query->byUnitId($request->unit_id);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('spk_number', 'like', "%{$search}%")
                  ->orWhere('cif_number', 'like', "%{$search}%")
                  ->orWhere('guarantee_name', 'like', "%{$search}%");
            });
        }

        $guarantees = $query->latest()->paginate(15);

        return response()->json([
            'data' => $guarantees,
            'meta' => [
                'can_create' => $user->canCreateGuarantee(),
                'can_edit' => $user->canUpdateGuarantee(),
                'can_delete' => $user->canDeleteGuarantee(),
                'accessible_units' => $user->getAccessibleUnitNames(),
            ]
        ]);
    }

    /**
     * Display a specific guarantee
     */
    public function show($id)
    {
        $user = Auth::user();
        $guarantee = Guarantee::with('unit')->findOrFail($id);

        // Check unit access
        if (!$user->canAccessGuaranteeInUnit($guarantee->unit_id)) {
            return response()->json([
                'error' => 'Forbidden',
                'message' => 'Anda tidak memiliki akses ke guarantee ini'
            ], 403);
        }

        return response()->json($guarantee);
    }

    /**
     * Create a new guarantee
     */
    public function store(Request $request)
    {
        $user = Auth::user();

        // Check permission
        if (!$user->canCreateGuarantee()) {
            return response()->json([
                'error' => 'Permission Denied',
                'message' => 'Anda tidak memiliki akses untuk membuat jaminan baru'
            ], 403);
        }

        $validated = $request->validate([
            'spk_number' => 'required|string|max:255',
            'cif_number' => 'required|string|max:255',
            'spk_name' => 'required|string|max:255',
            'credit_period' => 'required|string|max:255',
            'guarantee_name' => 'required|string|max:255',
            'guarantee_type' => 'required|in:BPKB,SHM,SHGB,E-SHM',
            'guarantee_number' => 'required|string|unique:guarantees,guarantee_number',
            'file_location' => 'nullable|string',
            'input_date' => 'required|date',
            'unit_id' => 'required|exists:units,id',
        ]);

        // Admin-kredit: auto-set unit_id to their unit
        if ($user->isCreditAdmin()) {
            $validated['unit_id'] = $user->unit_id;
        } else {
            // Super-admin: verifikasi mereka bisa akses unit yang dipilih
            if (!$user->canAccessGuaranteeInUnit($validated['unit_id'])) {
                return response()->json([
                    'error' => 'Forbidden',
                    'message' => 'Anda tidak memiliki akses ke unit ini'
                ], 403);
            }
        }

        $guarantee = Guarantee::create($validated);

        return response()->json($guarantee, 201);
    }

    /**
     * Update guarantee
     */
    public function update(Request $request, $id)
    {
        $user = Auth::user();
        $guarantee = Guarantee::findOrFail($id);

        // Check permission
        if (!$user->canUpdateGuarantee()) {
            return response()->json([
                'error' => 'Permission Denied',
                'message' => 'Anda tidak memiliki akses untuk mengubah jaminan'
            ], 403);
        }

        // Check unit access
        if (!$user->canAccessGuaranteeInUnit($guarantee->unit_id)) {
            return response()->json([
                'error' => 'Forbidden',
                'message' => 'Anda tidak memiliki akses ke jaminan ini'
            ], 403);
        }

        $validated = $request->validate([
            'spk_number' => 'sometimes|string|max:255',
            'cif_number' => 'sometimes|string|max:255',
            'spk_name' => 'sometimes|string|max:255',
            'credit_period' => 'sometimes|string|max:255',
            'guarantee_name' => 'sometimes|string|max:255',
            'guarantee_type' => 'sometimes|in:BPKB,SHM,SHGB,E-SHM',
            'guarantee_number' => 'sometimes|string|unique:guarantees,guarantee_number,' . $id,
            'file_location' => 'nullable|string',
            'input_date' => 'sometimes|date',
            'status' => 'sometimes|in:available,dipinjam,lunas',
            'unit_id' => 'sometimes|exists:units,id',
        ]);

        // Admin-kredit: tidak boleh ubah unit_id
        if ($user->isCreditAdmin()) {
            unset($validated['unit_id']);
        }

        // Super-admin: verifikasi akses ke unit baru (jika diubah)
        if (isset($validated['unit_id']) && !$user->canAccessGuaranteeInUnit($validated['unit_id'])) {
            return response()->json([
                'error' => 'Forbidden',
                'message' => 'Anda tidak memiliki akses ke unit tujuan'
            ], 403);
        }

        $guarantee->update($validated);

        return response()->json($guarantee);
    }

    /**
     * Delete guarantee
     */
    public function destroy($id)
    {
        $user = Auth::user();
        $guarantee = Guarantee::findOrFail($id);

        // Check permission
        if (!$user->canDeleteGuarantee()) {
            return response()->json([
                'error' => 'Permission Denied',
                'message' => 'Anda tidak memiliki akses untuk menghapus jaminan'
            ], 403);
        }

        // Check unit access
        if (!$user->canAccessGuaranteeInUnit($guarantee->unit_id)) {
            return response()->json([
                'error' => 'Forbidden',
                'message' => 'Anda tidak memiliki akses ke jaminan ini'
            ], 403);
        }

        $guarantee->delete();

        return response()->json(null, 204);
    }

    /**
     * Download guarantee report
     */
    public function downloadReport(Request $request)
    {
        $user = Auth::user();

        // Check permission
        if (!$user->canDownloadReport()) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        // Get data accessible to user
        $query = Guarantee::query()
            ->with('unit')
            ->accessibleTo($user);

        // Apply filters if provided
        if ($request->has('unit_id') && $user->isSuperAdmin()) {
            $query->byUnitId($request->unit_id);
        }

        if ($request->has('status')) {
            $query->byStatus($request->status);
        }

        $guarantees = $query->get();

        // Generate report (Excel/PDF)
        // Implementation depends on your reporting library

        return response()->json([
            'message' => 'Report generated successfully',
            'total' => $guarantees->count(),
            'units' => $guarantees->groupBy('unit_id')->map->count()
        ]);
    }
}
```

**File:** `app/Http/Controllers/Api_jaminan/JaminanAuthController.php`

Update user management methods:

```php
<?php

namespace App\Http\Controllers\Api_jaminan;

use App\Models_jaminan\JaminanUser;
use App\Models_jaminan\Unit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class JaminanAuthController extends Controller
{
    /**
     * Create a new user (Admin Management)
     */
    public function store(Request $request)
    {
        $currentUser = Auth::user();

        // Only super-admin can create users
        if (!$currentUser->isSuperAdmin()) {
            return response()->json([
                'error' => 'Permission Denied',
                'message' => 'Hanya super-admin yang dapat membuat user baru'
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:jaminan_users,email',
            'password' => 'required|string|min:8',
            'role' => 'required|in:super-admin,admin-holding,admin-kredit',
            'unit_id' => 'nullable|exists:units,id',
        ]);

        // Validation: admin-kredit HARUS punya unit_id
        if ($validated['role'] === 'admin-kredit' && !isset($validated['unit_id'])) {
            return response()->json([
                'error' => 'Validation Error',
                'message' => 'Admin-kredit harus memiliki unit_id'
            ], 422);
        }

        // Super-admin & admin-holding: unit_id harus null
        if (in_array($validated['role'], ['super-admin', 'admin-holding'])) {
            $validated['unit_id'] = null;
        }

        $validated['password'] = Hash::make($validated['password']);

        $user = JaminanUser::create($validated);

        return response()->json([
            'message' => 'User created successfully',
            'user' => $user
        ], 201);
    }

    /**
     * Update user
     */
    public function update(Request $request, $id)
    {
        $currentUser = Auth::user();
        $targetUser = JaminanUser::findOrFail($id);

        // Only super-admin can edit users
        if (!$currentUser->isSuperAdmin()) {
            return response()->json([
                'error' => 'Permission Denied',
                'message' => 'Hanya super-admin yang dapat mengubah user'
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:jaminan_users,email,' . $id,
            'password' => 'sometimes|string|min:8',
            'role' => 'sometimes|in:super-admin,admin-holding,admin-kredit',
            'unit_id' => 'nullable|exists:units,id',
        ]);

        // Validation: admin-kredit HARUS punya unit_id
        if (isset($validated['role'])) {
            if ($validated['role'] === 'admin-kredit' && !isset($validated['unit_id'])) {
                return response()->json([
                    'error' => 'Validation Error',
                    'message' => 'Admin-kredit harus memiliki unit_id'
                ], 422);
            }

            // Super-admin & admin-holding: unit_id harus null
            if (in_array($validated['role'], ['super-admin', 'admin-holding'])) {
                $validated['unit_id'] = null;
            }
        }

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        $targetUser->update($validated);

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $targetUser
        ]);
    }

    /**
     * Get all users with optional filtering
     */
    public function index(Request $request)
    {
        $currentUser = Auth::user();

        // Only super-admin can see user list
        if (!$currentUser->isSuperAdmin()) {
            return response()->json([
                'error' => 'Permission Denied',
                'message' => 'Hanya super-admin yang dapat melihat daftar user'
            ], 403);
        }

        $query = JaminanUser::with('unit');

        // Filter by role if provided
        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        // Filter by unit if provided
        if ($request->has('unit_id')) {
            $query->where('unit_id', $request->unit_id);
        }

        $users = $query->get();

        return response()->json([
            'data' => $users->map(fn($u) => [
                'id' => $u->id,
                'name' => $u->getDisplayName(),
                'email' => $u->email,
                'role' => $u->role,
                'unit_id' => $u->unit_id,
                'unit_name' => $u->unit?->name,
                'created_at' => $u->created_at,
                'updated_at' => $u->updated_at,
            ]),
            'total' => $users->count(),
            'available_units' => Unit::all()
        ]);
    }

    /**
     * Delete user
     */
    public function destroy($id)
    {
        $currentUser = Auth::user();
        $targetUser = JaminanUser::findOrFail($id);

        // Only super-admin can delete users
        if (!$currentUser->isSuperAdmin()) {
            return response()->json([
                'error' => 'Permission Denied',
                'message' => 'Hanya super-admin yang dapat menghapus user'
            ], 403);
        }

        // Prevent super-admin from deleting themselves
        if ($targetUser->id === $currentUser->id) {
            return response()->json([
                'error' => 'Validation Error',
                'message' => 'Anda tidak dapat menghapus akun sendiri'
            ], 422);
        }

        $targetUser->delete();

        return response()->json([
            'message' => 'User deleted successfully'
        ], 204);
    }
}
```

#### 5.4 Update Routes

**File:** `routes/api.php`

Update jaminan routes dengan proper middleware grouping:

```php
Route::prefix('jaminan')->group(function () {
    // ===== AUTH ROUTES (No Authentication Required) =====
    Route::post('/auth/login', [JaminanAuthController::class, 'login']);

    // ===== PROTECTED ROUTES (Require Authentication) =====
    Route::middleware(['auth:sanctum'])->group(function () {

        // Auth endpoints
        Route::post('/auth/logout', [JaminanAuthController::class, 'logout']);
        Route::get('/auth/user', [JaminanAuthController::class, 'user']);
        Route::get('/auth/verify-token', [JaminanAuthController::class, 'verifyToken']);

        // ===== GUARANTEE MANAGEMENT =====
        Route::middleware('jaminan_role:super-admin,admin-holding,admin-kredit')->group(function () {
            // Read operations - All admin roles
            Route::get('/guarantees', [GuaranteeController::class, 'index']);
            Route::get('/guarantees/{id}', [GuaranteeController::class, 'show']);
            Route::get('/guarantees/export/report', [GuaranteeController::class, 'downloadReport']);

            // Write operations - Only admin-kredit & super-admin
            Route::middleware('jaminan_role:super-admin,admin-kredit')->group(function () {
                Route::post('/guarantees', [GuaranteeController::class, 'store']);
                Route::put('/guarantees/{id}', [GuaranteeController::class, 'update']);
                Route::delete('/guarantees/{id}', [GuaranteeController::class, 'destroy']);
            });
        });

        // ===== GUARANTEE LOANS =====
        Route::middleware('jaminan_role:super-admin,admin-holding,admin-kredit')->group(function () {
            // Read operations
            Route::get('/guarantee-loans', [GuaranteeLoanController::class, 'index']);
            Route::get('/guarantee-loans/{id}', [GuaranteeLoanController::class, 'show']);

            // Write operations - Only admin-kredit & super-admin
            Route::middleware('jaminan_role:super-admin,admin-kredit')->group(function () {
                Route::post('/guarantee-loans', [GuaranteeLoanController::class, 'store']);
                Route::post('/guarantee-loans/{id}/return', [GuaranteeLoanController::class, 'returnLoan']);
                Route::put('/guarantee-loans/{id}', [GuaranteeLoanController::class, 'update']);
            });
        });

        // ===== GUARANTEE SETTLEMENTS =====
        Route::middleware('jaminan_role:super-admin,admin-holding,admin-kredit')->group(function () {
            // Read operations
            Route::get('/guarantee-settlements', [GuaranteeSettlementController::class, 'index']);
            Route::get('/guarantee-settlements/{id}', [GuaranteeSettlementController::class, 'show']);

            // Write operations - Only admin-kredit & super-admin
            Route::middleware('jaminan_role:super-admin,admin-kredit')->group(function () {
                Route::post('/guarantee-settlements', [GuaranteeSettlementController::class, 'store']);
                Route::put('/guarantee-settlements/{id}', [GuaranteeSettlementController::class, 'update']);
            });
        });

        // ===== USER MANAGEMENT - Super Admin Only =====
        Route::middleware('jaminan_role:super-admin')->group(function () {
            Route::get('/users', [JaminanAuthController::class, 'index']);
            Route::post('/users', [JaminanAuthController::class, 'store']);
            Route::put('/users/{id}', [JaminanAuthController::class, 'update']);
            Route::delete('/users/{id}', [JaminanAuthController::class, 'destroy']);
        });
    });
});
```

#### 5.5 Apply Similar Logic ke GuaranteeLoanController & GuaranteeSettlementController

Sama seperti GuaranteeController:
1. Tambah `.accessibleTo($user)` di setiap query
2. Check `$user->canAccessGuaranteeInUnit($guarantee->unit_id)` sebelum manipulate data
3. Update middleware di routes untuk proper role-checking

#### 5.6 Prepare Data - Update Existing Records

**Create seeder untuk populate unit_id:**

**File:** `database/seeders/UpdateJaminanUsersUnitSeeder.php`

```php
<?php

namespace Database\Seeders;

use App\Models_jaminan\JaminanUser;
use App\Models_jaminan\Unit;
use Illuminate\Database\Seeder;

class UpdateJaminanUsersUnitSeeder extends Seeder
{
    public function run(): void
    {
        // Update existing admin-kredit users dengan unit_id
        // Adjust logic sesuai requirement Anda

        // Contoh: Assign user email tertentu ke unit tertentu
        $mapping = [
            'admin.kajoetangan@example.com' => 1, // Unit Kajoetangan
            'admin.batu@example.com' => 2,         // Unit Batu
            // ... add more mappings
        ];

        foreach ($mapping as $email => $unitId) {
            JaminanUser::where('email', $email)
                ->update(['unit_id' => $unitId]);
        }

        // Or batch update all admin-kredit to default unit
        // JaminanUser::where('role', 'admin-kredit')
        //     ->whereNull('unit_id')
        //     ->update(['unit_id' => 1]); // Default unit
    }
}
```

Run seeder:
```bash
php artisan db:seed --class=UpdateJaminanUsersUnitSeeder --database=mysql_jaminan
```

#### 5.7 Frontend Components Update

**File:** `frontend/components_jaminan/GuaranteeInputForm.tsx`

```jsx
import React, { useState, useEffect } from 'react';

interface GuaranteeInputFormProps {
    guarantee?: Guarantee;
    user: JaminanUser;
    onSubmit: (data: Guarantee) => void;
}

export const GuaranteeInputForm: React.FC<GuaranteeInputFormProps> = ({
    guarantee,
    user,
    onSubmit
}) => {
    const [formData, setFormData] = useState<Guarantee>(guarantee || {});
    const [units, setUnits] = useState<Unit[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Fetch units based on user role
        if (user.role === 'super-admin') {
            // Super-admin bisa pilih semua unit
            fetchAllUnits();
        } else if (user.role === 'admin-kredit') {
            // Admin-kredit hanya bisa lihat unit mereka sendiri
            setFormData(prev => ({
                ...prev,
                unit_id: user.unit_id
            }));
        }
    }, [user]);

    const fetchAllUnits = async () => {
        try {
            const response = await fetch('/api/jaminan/units');
            const data = await response.json();
            setUnits(data.data || []);
        } catch (error) {
            console.error('Error fetching units:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            onSubmit(formData);
        } finally {
            setIsLoading(false);
        }
    };

    // Determine if form should be read-only
    const isReadOnly = user.role === 'admin-holding';

    return (
        <form onSubmit={handleSubmit} className="guarantee-form">
            <div className="form-group">
                <label>SPK Number</label>
                <input
                    type="text"
                    value={formData.spk_number || ''}
                    onChange={(e) => setFormData({...formData, spk_number: e.target.value})}
                    disabled={isReadOnly}
                    required
                />
            </div>

            <div className="form-group">
                <label>CIF Number</label>
                <input
                    type="text"
                    value={formData.cif_number || ''}
                    onChange={(e) => setFormData({...formData, cif_number: e.target.value})}
                    disabled={isReadOnly}
                    required
                />
            </div>

            <div className="form-group">
                <label>Unit</label>
                {user.role === 'super-admin' ? (
                    <select
                        value={formData.unit_id || ''}
                        onChange={(e) => setFormData({...formData, unit_id: parseInt(e.target.value)})}
                        disabled={isReadOnly}
                    >
                        <option value="">Select Unit</option>
                        {units.map(unit => (
                            <option key={unit.id} value={unit.id}>{unit.name}</option>
                        ))}
                    </select>
                ) : (
                    <input
                        type="text"
                        value={user.unit?.name || ''}
                        disabled
                        readOnly
                    />
                )}
            </div>

            {/* Other fields... */}

            <button
                type="submit"
                disabled={isReadOnly || isLoading}
            >
                {isReadOnly ? 'View Only' : isLoading ? 'Saving...' : 'Save'}
            </button>
        </form>
    );
};
```

**File:** `frontend/components_jaminan/GuaranteeList.tsx`

```jsx
import React, { useState, useEffect } from 'react';

interface GuaranteeListProps {
    user: JaminanUser;
}

export const GuaranteeList: React.FC<GuaranteeListProps> = ({ user }) => {
    const [guarantees, setGuarantees] = useState<Guarantee[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [selectedUnit, setSelectedUnit] = useState<number | null>(user.unit_id || null);
    const [permissions, setPermissions] = useState({
        can_create: false,
        can_edit: false,
        can_delete: false,
    });

    useEffect(() => {
        fetchGuarantees();
    }, [selectedUnit]);

    const fetchGuarantees = async () => {
        try {
            const url = new URL('/api/jaminan/guarantees', window.location.origin);
            if (selectedUnit && user.role === 'super-admin') {
                url.searchParams.append('unit_id', selectedUnit.toString());
            }

            const response = await fetch(url.toString(), {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const data = await response.json();
            setGuarantees(data.data?.data || []);
            setPermissions(data.meta);
            setUnits(data.meta?.available_units || []);
        } catch (error) {
            console.error('Error fetching guarantees:', error);
        }
    };

    const renderActions = (guarantee: Guarantee) => {
        return (
            <div className="actions">
                <button onClick={() => viewDetail(guarantee.id)}>
                    View
                </button>

                {permissions.can_edit && (
                    <button onClick={() => editGuarantee(guarantee.id)}>
                        Edit
                    </button>
                )}

                {permissions.can_delete && (
                    <button onClick={() => deleteGuarantee(guarantee.id)}>
                        Delete
                    </button>
                )}

                <button onClick={() => downloadReport(guarantee.id)}>
                    Download
                </button>
            </div>
        );
    };

    return (
        <div className="guarantee-list">
            {/* Unit filter - only for super-admin */}
            {user.role === 'super-admin' && (
                <div className="unit-filter">
                    <label>Filter by Unit:</label>
                    <select
                        value={selectedUnit || ''}
                        onChange={(e) => setSelectedUnit(e.target.value ? parseInt(e.target.value) : null)}
                    >
                        <option value="">All Units</option>
                        {units.map(unit => (
                            <option key={unit.id} value={unit.id}>{unit.name}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Add button - only if can_create */}
            {permissions.can_create && (
                <button onClick={() => createNew()} className="btn-primary">
                    Add New Guarantee
                </button>
            )}

            {/* Table */}
            <table>
                <thead>
                    <tr>
                        <th>SPK Number</th>
                        <th>CIF Number</th>
                        <th>Guarantee Name</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Unit</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {guarantees.map(guarantee => (
                        <tr key={guarantee.id}>
                            <td>{guarantee.spk_number}</td>
                            <td>{guarantee.cif_number}</td>
                            <td>{guarantee.guarantee_name}</td>
                            <td>{guarantee.guarantee_type}</td>
                            <td>{guarantee.status}</td>
                            <td>{guarantee.unit?.name}</td>
                            <td>{renderActions(guarantee)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
```

#### 5.8 Test Unit-Based Access

```bash
# Test 1: Admin-kredit Kajoetangan GET jaminan
curl -X GET "http://localhost/api/jaminan/guarantees" \
  -H "Authorization: Bearer {admin-kredit-kajoetangan-token}"
# Expected: 200 OK dengan hanya jaminan dari Kajoetangan

# Test 2: Admin-kredit Kajoetangan CREATE jaminan Kajoetangan
curl -X POST "http://localhost/api/jaminan/guarantees" \
  -H "Authorization: Bearer {admin-kredit-kajoetangan-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "spk_number": "SPK001",
    "cif_number": "CIF001",
    "spk_name": "Spk Name",
    "credit_period": "12",
    "guarantee_name": "Test Guarantee",
    "guarantee_type": "BPKB",
    "guarantee_number": "GBPKB001",
    "input_date": "2024-11-28"
  }'
# Expected: 201 Created dengan unit_id = Kajoetangan

# Test 3: Admin-kredit Kajoetangan akses jaminan Batu
curl -X GET "http://localhost/api/jaminan/guarantees/999" \
  -H "Authorization: Bearer {admin-kredit-kajoetangan-token}"
# Expected: 403 Forbidden (jika ID 999 adalah guarantee Batu)

# Test 4: Super-admin GET jaminan semua unit
curl -X GET "http://localhost/api/jaminan/guarantees" \
  -H "Authorization: Bearer {super-admin-token}"
# Expected: 200 OK dengan semua jaminan

# Test 5: Super-admin GET jaminan filter unit spesifik
curl -X GET "http://localhost/api/jaminan/guarantees?unit_id=1" \
  -H "Authorization: Bearer {super-admin-token}"
# Expected: 200 OK dengan jaminan dari unit 1 saja

# Test 6: Admin-holding GET jaminan
curl -X GET "http://localhost/api/jaminan/guarantees" \
  -H "Authorization: Bearer {admin-holding-token}"
# Expected: 200 OK dengan semua jaminan

# Test 7: Admin-holding CREATE jaminan
curl -X POST "http://localhost/api/jaminan/guarantees" \
  -H "Authorization: Bearer {admin-holding-token}" \
  -H "Content-Type: application/json" \
  -d '{...}'
# Expected: 403 Permission Denied
```

---

## ✅ CHECKLIST IMPLEMENTASI

### Phase 1: Database & Models (Jam 1-2)

- [ ] **Tugas 4: Schema Change**
  - [ ] Buat migration ubah role enum → varchar
  - [ ] Update existing migration create_jaminan_users_table.php
  - [ ] Run migrations jaminan database
  - [ ] Verify column type di database

- [ ] **Tugas 5: Unit Structure**
  - [ ] Buat migration tambah unit_id ke jaminan_users
  - [ ] Buat migration tambah unit_id ke guarantees
  - [ ] Run migrations
  - [ ] Create seeder untuk populate unit_id

### Phase 2: Models & Methods (Jam 2-3)

- [ ] **Update JaminanUser.php**
  - [ ] Tambah semua role checking methods
  - [ ] Tambah permission checking methods
  - [ ] Tambah unit access logic methods
  - [ ] Add unit relationship

- [ ] **Update Guarantee.php**
  - [ ] Tambah unit relationship
  - [ ] Tambah accessibleTo scope
  - [ ] Tambah filter scopes (status, type, unit, dll)

- [ ] **Update Unit.php**
  - [ ] Tambah relationships (users, guarantees, creditAdmins)

- [ ] **Update GuaranteeLoan.php & GuaranteeSettlement.php**
  - [ ] Tambah unit-based filtering logic

### Phase 3: Controllers & Authorization (Jam 3-5)

- [ ] **Update GuaranteeController.php**
  - [ ] Update index() dengan accessibleTo filtering
  - [ ] Update show() dengan unit access check
  - [ ] Update store() dengan admin-kredit auto unit_id
  - [ ] Update update() dengan admin-kredit restriction
  - [ ] Update destroy() dengan admin-holding restriction
  - [ ] Update downloadReport() dengan user filtering

- [ ] **Update JaminanAuthController.php**
  - [ ] Update store() user management dengan unit validation
  - [ ] Update update() user management
  - [ ] Update index() user listing untuk super-admin only
  - [ ] Update destroy() user deletion

- [ ] **Update GuaranteeLoanController.php**
  - [ ] Apply accessibleTo filtering
  - [ ] Apply unit access checks

- [ ] **Update GuaranteeSettlementController.php**
  - [ ] Apply accessibleTo filtering
  - [ ] Apply unit access checks

### Phase 4: Routes & Middleware (Jam 5-6)

- [ ] **Update routes/api.php**
  - [ ] Organize jaminan routes dengan proper middleware grouping
  - [ ] Ensure read/write operation separation
  - [ ] Add user management routes

- [ ] **Update JaminanRoleMiddleware.php**
  - [ ] Add AssetAccessFromJaminanMiddleware untuk dual access
  - [ ] Ensure role validation works correctly

### Phase 5: Frontend (Jam 6-7)

- [ ] **Update GuaranteeInputForm.tsx**
  - [ ] Implement unit selection for super-admin
  - [ ] Auto-fill unit for admin-kredit
  - [ ] Disable form for admin-holding

- [ ] **Update GuaranteeList.tsx**
  - [ ] Implement unit filtering for super-admin
  - [ ] Show/hide action buttons based on permissions
  - [ ] Apply data filtering from API

- [ ] **Update Navigation Component**
  - [ ] Show/hide menu items based on user role
  - [ ] Super-admin & admin-holding: show both asset & jaminan
  - [ ] Admin-kredit: show only jaminan
  - [ ] Admin-holding: hide input/edit/delete options

### Phase 6: Testing & Validation (Jam 7+)

- [ ] **Unit Tests**
  - [ ] Test role checking methods
  - [ ] Test permission methods
  - [ ] Test unit access logic

- [ ] **API Tests**
  - [ ] Test authentication & token generation
  - [ ] Test role-based access control
  - [ ] Test unit-based filtering
  - [ ] Test CRUD operations per role
  - [ ] Test edge cases

- [ ] **Integration Tests**
  - [ ] Test full flow: login → access data → perform actions
  - [ ] Test cross-unit access restrictions
  - [ ] Test admin-holding restrictions

- [ ] **Manual Testing**
  - [ ] Login sebagai setiap role
  - [ ] Verify menu & navigation
  - [ ] Verify data filtering per unit
  - [ ] Verify CRUD operations restrictions
  - [ ] Test error messages

---

## 🧪 TESTING PLAN

### Test Environment Setup

```bash
# Create test users untuk setiap role
php artisan tinker
>>> JaminanUser::create([
    'name' => 'Super Admin Test',
    'email' => 'superadmin@test.com',
    'password' => bcrypt('password'),
    'role' => 'super-admin'
]);

>>> JaminanUser::create([
    'name' => 'Admin Holding Test',
    'email' => 'adminholding@test.com',
    'password' => bcrypt('password'),
    'role' => 'admin-holding'
]);

>>> JaminanUser::create([
    'name' => 'Admin Kredit Kajoetangan',
    'email' => 'admin.kajoetangan@test.com',
    'password' => bcrypt('password'),
    'role' => 'admin-kredit',
    'unit_id' => 1  // Kajoetangan
]);

>>> JaminanUser::create([
    'name' => 'Admin Kredit Batu',
    'email' => 'admin.batu@test.com',
    'password' => bcrypt('password'),
    'role' => 'admin-kredit',
    'unit_id' => 2  // Batu
]);
```

### Test Cases

#### Test Case 1: Authentication

| Test | Input | Expected | Status |
|------|-------|----------|--------|
| Login dengan credential valid | email + password | Token generated | [ ] |
| Login dengan credential invalid | wrong email/password | 401 Unauthorized | [ ] |
| Verify token valid | token | User data returned | [ ] |
| Verify token invalid | invalid token | 401 Unauthorized | [ ] |

#### Test Case 2: Role-Based Access (System Level)

| Test | User | Action | Expected | Status |
|------|------|--------|----------|--------|
| Super-admin akses jaminan | super-admin | GET /api/jaminan/guarantees | 200 OK | [ ] |
| Super-admin akses asset | super-admin | GET /api/assets | 200 OK | [ ] |
| Admin-holding akses jaminan | admin-holding | GET /api/jaminan/guarantees | 200 OK | [ ] |
| Admin-holding akses asset | admin-holding | GET /api/assets | 200 OK | [ ] |
| Admin-kredit akses jaminan | admin-kredit | GET /api/jaminan/guarantees | 200 OK | [ ] |
| Admin-kredit akses asset | admin-kredit | GET /api/assets | 403 Forbidden | [ ] |

#### Test Case 3: Unit-Based Access (Admin-Kredit Level)

| Test | User | Unit | Action | Expected | Status |
|------|------|------|--------|----------|--------|
| Admin-kredit Kajoetangan GET jaminan | admin-kredit | Kajoetangan | GET /api/jaminan/guarantees | List Kajoetangan only | [ ] |
| Admin-kredit Kajoetangan GET jaminan Batu | admin-kredit | Kajoetangan | GET /api/jaminan/guarantees/1 (Batu) | 403 Forbidden | [ ] |
| Admin-kredit Kajoetangan CREATE jaminan | admin-kredit | Kajoetangan | POST /api/jaminan/guarantees | 201 Created, unit_id = Kajoetangan | [ ] |
| Admin-kredit Kajoetangan UPDATE jaminan Batu | admin-kredit | Kajoetangan | PUT /api/jaminan/guarantees/1 (Batu) | 403 Forbidden | [ ] |
| Super-admin GET semua unit | super-admin | All | GET /api/jaminan/guarantees | List all guarantees | [ ] |
| Super-admin GET filter unit | super-admin | All | GET /api/jaminan/guarantees?unit_id=1 | List Kajoetangan only | [ ] |

#### Test Case 4: Permission-Based Access (CRUD Operations)

| Test | User | Operation | Expected | Status |
|------|------|-----------|----------|--------|
| Admin-kredit CREATE | admin-kredit | POST /api/jaminan/guarantees | 201 Created | [ ] |
| Admin-kredit UPDATE | admin-kredit | PUT /api/jaminan/guarantees/{id} | 200 OK | [ ] |
| Admin-kredit DELETE | admin-kredit | DELETE /api/jaminan/guarantees/{id} | 204 No Content | [ ] |
| Admin-holding CREATE | admin-holding | POST /api/jaminan/guarantees | 403 Permission Denied | [ ] |
| Admin-holding UPDATE | admin-holding | PUT /api/jaminan/guarantees/{id} | 403 Permission Denied | [ ] |
| Admin-holding DELETE | admin-holding | DELETE /api/jaminan/guarantees/{id} | 403 Permission Denied | [ ] |
| Admin-holding VIEW | admin-holding | GET /api/jaminan/guarantees | 200 OK | [ ] |
| Admin-holding DOWNLOAD | admin-holding | GET /api/jaminan/guarantees/export/report | 200 OK | [ ] |
| Super-admin CRUD | super-admin | All operations | All 200/201/204 | [ ] |

#### Test Case 5: User Management (Super-Admin Only)

| Test | User | Action | Expected | Status |
|------|------|--------|----------|--------|
| Super-admin LIST users | super-admin | GET /api/jaminan/users | 200 OK, all users | [ ] |
| Super-admin CREATE user | super-admin | POST /api/jaminan/users | 201 Created | [ ] |
| Super-admin CREATE user invalid (admin-kredit tanpa unit) | super-admin | POST /api/jaminan/users role=admin-kredit | 422 Validation Error | [ ] |
| Super-admin UPDATE user | super-admin | PUT /api/jaminan/users/{id} | 200 OK | [ ] |
| Super-admin DELETE user | super-admin | DELETE /api/jaminan/users/{id} | 204 No Content | [ ] |
| Admin-holding LIST users | admin-holding | GET /api/jaminan/users | 403 Permission Denied | [ ] |
| Admin-kredit LIST users | admin-kredit | GET /api/jaminan/users | 403 Permission Denied | [ ] |

---

## 📋 FILE SUMMARY

### Database Files
- `database/migrations_jaminan/2024_11_25_000000_create_jaminan_users_table.php` - **MODIFY** role column
- `database/migrations_jaminan/2025_11_28_change_jaminan_users_role_to_string.php` - **CREATE** new
- `database/migrations_jaminan/2025_11_28_add_unit_id_to_jaminan_users.php` - **CREATE** new
- `database/migrations_jaminan/2025_11_28_add_unit_id_to_guarantees.php` - **CREATE** new

### Model Files
- `app/Models_jaminan/JaminanUser.php` - **MODIFY** add methods & relationships
- `app/Models_jaminan/Guarantee.php` - **MODIFY** add unit relationship & scopes
- `app/Models_jaminan/Unit.php` - **MODIFY** add relationships
- `app/Models_jaminan/GuaranteeLoan.php` - **MODIFY** add unit filtering
- `app/Models_jaminan/GuaranteeSettlement.php` - **MODIFY** add unit filtering

### Controller Files
- `app/Http/Controllers/Api_jaminan/GuaranteeController.php` - **MODIFY** add authorization & filtering
- `app/Http/Controllers/Api_jaminan/JaminanAuthController.php` - **MODIFY** user management
- `app/Http/Controllers/Api_jaminan/GuaranteeLoanController.php` - **MODIFY** add filtering
- `app/Http/Controllers/Api_jaminan/GuaranteeSettlementController.php` - **MODIFY** add filtering

### Middleware Files
- `app/Http/Middleware/JaminanRoleMiddleware.php` - **REVIEW** ensure proper implementation

### Route Files
- `routes/api.php` - **MODIFY** update jaminan routes grouping

### Frontend Files
- `frontend/components_jaminan/GuaranteeInputForm.tsx` - **MODIFY** unit selection logic
- `frontend/components_jaminan/GuaranteeList.tsx` - **MODIFY** filtering & permissions
- `frontend/components_jaminan/GuaranteeDetail.tsx` - **MODIFY** unit access check
- `frontend/components_jaminan/GuaranteeDashboard.tsx` - **MODIFY** navigation menu

---

## 🎯 KESIMPULAN

**Total Tugas**: 5
**Total File Perubahan**: 20+
**Kompleksitas Keseluruhan**: HIGH
**Estimasi Waktu**: 6-7 jam

### Key Implementation Order:
1. **Tugas 4** (30 min) - Schema changes
2. **Tugas 5** (3-4 jam) - Unit-based logic (most complex)
3. **Tugas 1-3** (1.5-2 jam) - Role-based permissions
4. **Testing** (1+ jam) - Comprehensive validation

### Key Dependencies:
- Tugas 4 (enum → varchar) adalah prerequisite untuk semua tugas lain
- Tugas 5 (unit structure) memerlukan tabel schema dari Tugas 4
- Tugas 1-3 bisa dikerjakan parallel atau sequential tergantung prioritas

Semua 5 tugas dirancang untuk terintegrasi dengan sempurna dan menciptakan sistem role & permission yang robust, scalable, dan mudah dipelihara.

---

**Last Updated**: 28 November 2024
**Status**: Ready for Development

