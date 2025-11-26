# UPDATE IMPLEMENTASI JAMINAN USER ROLE

**Update Date:** November 25, 2024
**Status:** Implementation with Full Access (No Restrictions)

---

## PERUBAHAN UTAMA

### 1. Role Name Update
- `superadmin` → `super-admin` (dengan dash untuk konsistensi)

**Di mana diupdate:**
- ✅ Migration: `2024_11_25_000000_create_jaminan_users_table.php`
- ✅ Model: `JaminanUser.php` → method `isSuperAdmin()`
- ✅ Controller: `JaminanAuthController.php` → validation rules
- ✅ Seeder: `JaminanUserSeeder.php`
- ✅ Database: field enum role

### 2. Pembatasan Akses Dihilangkan (Full Access)

**Sebelumnya:**
- Super Admin: Full access
- Admin Holding: Limited (tidak bisa approve settlement, tidak bisa manage users)
- Admin Kredit: Most limited

**Sekarang:**
- Super Admin: Full access ✓
- Admin Holding: Full access ✓
- Admin Kredit: Full access ✓

**Endpoints yang dibuka akses:**
```
GET    /api/jaminan/users              → Semua authenticated users
POST   /api/jaminan/users              → Semua authenticated users
PUT    /api/jaminan/users/{id}         → Semua authenticated users
DELETE /api/jaminan/users/{id}         → Semua authenticated users
```

**Method permissions dalam controller yang dihapus:**
- Removed: `canApproveSettlements()` → sekarang semua role bisa
- Removed: User management authorization checks → sekarang semua role bisa manage users
- Removed: Admin-only validations → sekarang full access untuk semua role

---

## FILE YANG DIUPDATE

### 1. Database Migration
**File:** `database/migrations_jaminan/2024_11_25_000000_create_jaminan_users_table.php`

```php
// BEFORE:
$table->enum('role', ['admin-kredit', 'admin-holding', 'superadmin']);

// AFTER:
$table->enum('role', ['admin-kredit', 'admin-holding', 'super-admin']);
```

### 2. Model: JaminanUser
**File:** `app/Models_jaminan/JaminanUser.php`

```php
// BEFORE:
public function isSuperadmin(): bool
{
    return $this->role === 'superadmin';
}

// AFTER:
public function isSuperAdmin(): bool
{
    return $this->role === 'super-admin';
}

// BEFORE: Permissions were restricted
public function canApproveSettlements(): bool
{
    return $this->role === 'superadmin';
}

// AFTER: Full access untuk semua
public function canApproveSettlements(): bool
{
    return $this->isAdmin();
}

// Similar updates untuk methods lain
// All permission methods now check only isAdmin()
```

### 3. Controller: JaminanAuthController
**File:** `app/Http/Controllers/Api_jaminan/JaminanAuthController.php`

**Method `index()` - BEFORE:**
```php
public function index(Request $request)
{
    // Check if user is superadmin
    if (!$request->user()->isSuperadmin()) {
        return response()->json([
            'success' => false,
            'message' => 'Unauthorized',
        ], 403);
    }
    // ... rest of code
}
```

**Method `index()` - AFTER:**
```php
public function index(Request $request)
{
    // No authorization check - all authenticated users can access
    $users = JaminanUser::all()
        ->map(function ($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'created_at' => $user->created_at,
                'updated_at' => $user->updated_at,
            ];
        });

    return response()->json([
        'success' => true,
        'data' => $users,
    ]);
}
```

**Method `store()` - Updated:**
```php
// Removed: Authorization check
// Updated: role validation untuk super-admin
'role' => 'required|in:admin-kredit,admin-holding,super-admin',
```

**Method `update()` - Updated:**
```php
// Removed: Authorization check
// Updated: role validation
'role' => 'sometimes|in:admin-kredit,admin-holding,super-admin',
```

**Method `destroy()` - BEFORE:**
```php
public function destroy(Request $request, $id)
{
    // Check if user is superadmin
    if (!$request->user()->isSuperadmin()) {
        return response()->json([
            'success' => false,
            'message' => 'Unauthorized',
        ], 403);
    }

    // Prevent deleting the last superadmin
    $superadminCount = JaminanUser::where('role', 'superadmin')->count();
    $userToDelete = JaminanUser::findOrFail($id);

    if ($userToDelete->role === 'superadmin' && $superadminCount <= 1) {
        return response()->json([
            'success' => false,
            'message' => 'Cannot delete the last superadmin user',
        ], 422);
    }

    $userToDelete->delete();
    // ...
}
```

**Method `destroy()` - AFTER:**
```php
public function destroy(Request $request, $id)
{
    // Removed: Authorization check
    // Removed: Last superadmin protection
    $userToDelete = JaminanUser::findOrFail($id);
    $userToDelete->delete();

    return response()->json([
        'success' => true,
        'message' => 'User deleted successfully',
    ]);
}
```

### 4. Seeder: JaminanUserSeeder
**File:** `database/seeders/JaminanUserSeeder.php`

```php
// BEFORE:
JaminanUser::create([
    'name' => 'Superadmin Jaminan',
    'email' => 'superadmin@jaminan.local',
    'password' => Hash::make('password'),
    'role' => 'superadmin',
]);

// AFTER:
JaminanUser::create([
    'name' => 'Super Admin Jaminan',
    'email' => 'superadmin@jaminan.local',
    'password' => Hash::make('password'),
    'role' => 'super-admin',
]);
```

---

## DEFAULT TEST USERS

| Email | Role | Password |
|-------|------|----------|
| superadmin@jaminan.local | super-admin | password |
| admin.holding@jaminan.local | admin-holding | password |
| admin.kredit1@jaminan.local | admin-kredit | password |
| admin.kredit2@jaminan.local | admin-kredit | password |

---

## ROLE PERMISSIONS (UPDATED)

### Super Admin
```
✓ Melihat semua jaminan
✓ Mengelola semua jaminan
✓ Membuat peminjaman jaminan
✓ Mengembalikan jaminan
✓ Menyetujui pelunasan jaminan
✓ Mengelola user sistem jaminan (CREATE, READ, UPDATE, DELETE)
✓ Full system administration
```

### Admin Holding
```
✓ Melihat semua jaminan
✓ Mengelola semua jaminan
✓ Membuat peminjaman jaminan
✓ Mengembalikan jaminan
✓ Menyetujui pelunasan jaminan
✓ Mengelola user sistem jaminan (CREATE, READ, UPDATE, DELETE)
✓ Full system administration
```

### Admin Kredit
```
✓ Melihat semua jaminan
✓ Membuat peminjaman jaminan
✓ Mengembalikan jaminan
✓ Menyetujui pelunasan jaminan
✓ Mengelola user sistem jaminan (CREATE, READ, UPDATE, DELETE)
✓ Full system administration
```

**Summary:** Semua role sekarang memiliki akses penuh (no restrictions)

---

## API ENDPOINTS (UNCHANGED)

```
POST   /api/jaminan/auth/login                 (Public)
GET    /api/jaminan/auth/user                  (Authenticated)
GET    /api/jaminan/auth/verify-token          (Authenticated)
POST   /api/jaminan/auth/logout                (Authenticated)

GET    /api/jaminan/users                      (Authenticated - now full access)
POST   /api/jaminan/users                      (Authenticated - now full access)
PUT    /api/jaminan/users/{id}                 (Authenticated - now full access)
DELETE /api/jaminan/users/{id}                 (Authenticated - now full access)
```

---

## VALIDASI DATA (UPDATED)

Semua endpoints user management sekarang validate:

```php
'name' => 'required|string|max:255',
'email' => 'required|email|unique:mysql_jaminan.jaminan_users',
'password' => 'required|string|min:8',
'role' => 'required|in:admin-kredit,admin-holding,super-admin'  // ← Updated
```

---

## MIGRATION INSTRUCTIONS

Jika sudah pernah run migration sebelumnya dengan role `superadmin`:

### Option 1: Refresh (Drop & Recreate)
```bash
# Hapus semua data dan buat ulang
php artisan migrate:refresh --database=mysql_jaminan --path=database/migrations_jaminan

# Run seeder untuk insert default users
php artisan db:seed --class=JaminanUserSeeder
```

### Option 2: Manual Update (Keep existing data)
```sql
-- Update existing superadmin users to super-admin
UPDATE jaminan_users SET role = 'super-admin' WHERE role = 'superadmin';

-- Change enum definition (Laragon/phpMyAdmin)
ALTER TABLE jaminan_users MODIFY role ENUM('admin-kredit', 'admin-holding', 'super-admin');
```

---

## TESTING

### Login dengan semua role dan verify full access:

```bash
# Login as Super Admin
curl -X POST http://localhost:8000/api/jaminan/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@jaminan.local","password":"password"}'

# Create user dengan Admin Kredit token
curl -X POST http://localhost:8000/api/jaminan/users \
  -H "Authorization: Bearer {admin-kredit-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Test User",
    "email":"test@jaminan.local",
    "password":"password123",
    "role":"admin-holding"
  }'

# Delete user dengan Admin Holding token (seharusnya berhasil)
curl -X DELETE http://localhost:8000/api/jaminan/users/2 \
  -H "Authorization: Bearer {admin-holding-token}"
```

Semua request di atas seharusnya **berhasil** (HTTP 200/201) karena tidak ada authorization check.

---

## SUMMARY CHANGES

| Item | Before | After |
|------|--------|-------|
| Super Admin role name | `superadmin` | `super-admin` |
| Admin Holding access | Limited | Full |
| Admin Kredit access | Most Limited | Full |
| User management | Superadmin only | All authenticated users |
| Settlement approval | Superadmin only | All authenticated users |
| Last superadmin protection | Yes (constraint) | No |
| Authorization checks | Multiple locations | All removed |

---

## NEXT STEPS

1. ✅ Backup database (jika production)
2. ✅ Run migration atau update enum
3. ✅ Run seeder untuk reset default users
4. ✅ Test login dengan semua role
5. ✅ Verify CRUD operations untuk users
6. ✅ Update frontend (jika ada role-based UI)

---

**Implementation Status:** ✅ COMPLETE
**All roles now have full access - No restrictions applied**
