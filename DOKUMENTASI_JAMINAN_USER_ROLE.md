# DOKUMENTASI IMPLEMENTASI USER ROLE UNTUK SISTEM JAMINAN

## Ringkasan Eksekusi

Implementasi sistem user role untuk bagian jaminan telah diselesaikan dengan struktur yang sama seperti aset management sistem. Sistem ini menggunakan **database terpisah** (`asset_jaminan`) untuk menjaga isolasi data, dengan 3 role utama: **Superadmin**, **Admin Holding**, dan **Admin Kredit**.

---

## 1. KOMPONEN YANG DIIMPLEMENTASIKAN

### A. Database Migration
**File:** `database/migrations_jaminan/2024_11_25_000000_create_jaminan_users_table.php`

**Struktur Tabel:**
```sql
CREATE TABLE jaminan_users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255),                          -- Nama lengkap user
    email VARCHAR(255) UNIQUE,                  -- Email (username)
    email_verified_at TIMESTAMP NULL,           -- Email verification timestamp
    password VARCHAR(255),                      -- Password (hashed)
    role ENUM('admin-kredit', 'admin-holding', 'superadmin'),
    remember_token VARCHAR(100) NULL,           -- Remember token
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    INDEX(email),
    INDEX(role)
);
```

**Penjelasan:**
- Username menggunakan `email` (sesuai requirement)
- Password disimpan dalam bentuk hash (menggunakan Laravel's hashing)
- Role menggunakan ENUM dengan 3 pilihan: `admin-kredit`, `admin-holding`, `superadmin`
- Tabel ini disimpan di database terpisah `asset_jaminan` (mysql_jaminan connection)

### B. Model: JaminanUser
**File:** `app/Models_jaminan/JaminanUser.php`

**Fitur Utama:**
```php
namespace App\Models_jaminan;

class JaminanUser extends Authenticatable
{
    // Connection ke database terpisah
    protected $connection = 'mysql_jaminan';
    protected $table = 'jaminan_users';

    // Fillable fields
    protected $fillable = ['name', 'email', 'password', 'role'];

    // Hidden fields (untuk JSON response)
    protected $hidden = ['password', 'remember_token'];

    // Casts
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];
}
```

**Methods untuk Role Checking:**
```php
// Role validation methods
isSuperadmin(): bool          // Check if user is superadmin
isAdminHolding(): bool        // Check if user is admin holding
isAdminKredit(): bool         // Check if user is admin kredit
isAdmin(): bool               // Check if user is any admin role

// Permission methods
canManageAllGuarantees(): bool       // Superadmin + Admin Holding
canViewAllGuarantees(): bool         // All admin roles
canApproveSettlements(): bool        // Superadmin only
canCreateGuaranteeLoan(): bool       // All admin roles
canReturnGuaranteeLoan(): bool       // All admin roles
```

**Scope Methods:**
```php
withRoles(array $roles)     // Filter users by roles
admins()                    // Get all admin users
superadmins()              // Get superadmin users
```

### C. Authentication Controller
**File:** `app/Http/Controllers/Api_jaminan/JaminanAuthController.php`

**Endpoints:**

#### Public Endpoints (Tidak memerlukan authentication)
```
POST /api/jaminan/auth/login
  Request:
  {
    "email": "superadmin@jaminan.local",
    "password": "password"
  }

  Response:
  {
    "success": true,
    "user": {
      "id": 1,
      "name": "Superadmin Jaminan",
      "email": "superadmin@jaminan.local",
      "role": "superadmin"
    },
    "token": "... API token ...",
    "token_timeout": 3600
  }
```

#### Protected Endpoints (Memerlukan authentication header)
```
Header: Authorization: Bearer {token}

GET /api/jaminan/auth/user
  Response:
  {
    "success": true,
    "user": { ... },
    "permissions": {
      "can_view_all_guarantees": true,
      "can_manage_all_guarantees": true,
      "can_approve_settlements": true,
      "can_create_guarantee_loan": true,
      "can_return_guarantee_loan": true,
      "role": "superadmin"
    }
  }

GET /api/jaminan/auth/verify-token
  Response:
  {
    "success": true,
    "valid": true,
    "message": "Token is valid",
    "user_id": 1
  }

POST /api/jaminan/auth/logout
  Response:
  {
    "success": true,
    "message": "Logged out successfully"
  }
```

#### Admin Management Endpoints (All authenticated users)
```
GET /api/jaminan/users
  Permission: All authenticated users
  Response: List of all jaminan users

POST /api/jaminan/users
  Permission: All authenticated users
  Request: {
    "name": "New User",
    "email": "newuser@jaminan.local",
    "password": "password",
    "role": "admin-kredit"
  }
  Response: Created user data

PUT /api/jaminan/users/{id}
  Permission: All authenticated users
  Request: Partial update fields
  Response: Updated user data

DELETE /api/jaminan/users/{id}
  Permission: All authenticated users
  Response: Success message
```

### D. Middleware
**File:** `app/Http/Middleware/JaminanRoleMiddleware.php`

**Fungsi:**
- Validasi user authentication
- Check role-based access control
- Superadmin memiliki akses ke semua fitur
- Reject request jika user tidak memiliki role yang diperlukan

**Contoh penggunaan:**
```php
Route::middleware('jaminan-role:admin-kredit,admin-holding')->group(function () {
    // Routes hanya untuk admin-kredit dan admin-holding
});
```

### E. Routes API
**File:** `routes/api.php`

**Routes Authentication Jaminan:**
```php
// Public routes (tanpa authentication)
Route::prefix('jaminan/auth')->group(function () {
    Route::post('login', [JaminanAuthController::class, 'login']);
    Route::post('logout', [JaminanAuthController::class, 'logout'])->middleware('auth:sanctum');
    Route::get('user', [JaminanAuthController::class, 'user'])->middleware('auth:sanctum');
    Route::get('verify-token', [JaminanAuthController::class, 'verifyToken'])->middleware('auth:sanctum');
});

// Protected routes (memerlukan authentication)
Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('jaminan/users')->group(function () {
        Route::get('', [JaminanAuthController::class, 'index']);           // Superadmin only
        Route::post('', [JaminanAuthController::class, 'store']);          // Superadmin only
        Route::put('{id}', [JaminanAuthController::class, 'update']);      // Superadmin only
        Route::delete('{id}', [JaminanAuthController::class, 'destroy']);  // Superadmin only
    });
});
```

### F. Database Seeder
**File:** `database/seeders/JaminanUserSeeder.php`

**Default Users yang dibuat:**

| Email | Role | Password | Deskripsi |
|-------|------|----------|-----------|
| superadmin@jaminan.local | super-admin | password | Super Administrator |
| admin.holding@jaminan.local | admin-holding | password | Admin Holding/Pusat |
| admin.kredit1@jaminan.local | admin-kredit | password | Admin Kredit #1 |
| admin.kredit2@jaminan.local | admin-kredit | password | Admin Kredit #2 |

---

## 2. ROLE DAN PERMISSIONS

### Super Admin
```
Akses:
✓ Melihat semua jaminan
✓ Mengelola semua jaminan
✓ Melihat semua peminjaman jaminan
✓ Membuat peminjaman jaminan
✓ Mengembalikan jaminan
✓ Menyetujui pelunasan jaminan
✓ Mengelola user sistem jaminan
✓ Full system administration
```

### Admin Holding
```
Akses:
✓ Melihat semua jaminan
✓ Mengelola semua jaminan
✓ Melihat semua peminjaman jaminan
✓ Membuat peminjaman jaminan
✓ Mengembalikan jaminan
✓ Menyetujui pelunasan jaminan
✓ Mengelola user sistem jaminan
```

### Admin Kredit
```
Akses:
✓ Melihat semua jaminan
✓ Membuat peminjaman jaminan
✓ Mengembalikan jaminan
✓ Menyetujui pelunasan jaminan
✓ Mengelola user sistem jaminan
✓ Full access ke semua fitur
```

---

## 3. CARA INSTALASI DAN SETUP

### Step 1: Run Migration
```bash
# Pastikan database asset_jaminan sudah ada
php artisan migrate --database=mysql_jaminan
```

Jika ingin run specific migration:
```bash
php artisan migrate --path=database/migrations_jaminan --database=mysql_jaminan
```

### Step 2: Run Seeder
```bash
php artisan db:seed --class=JaminanUserSeeder
```

Atau jika ingin run seeder dengan specific database:
```bash
php artisan db:seed --class=JaminanUserSeeder --database=mysql_jaminan
```

### Step 3: Verify Installation
```bash
# Check table structure
SELECT * FROM jaminan_users;

# Verify users
SELECT id, name, email, role FROM jaminan_users;
```

---

## 4. PENGGUNAAN API

### Login
```bash
curl -X POST http://localhost:8000/api/jaminan/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@jaminan.local",
    "password": "password"
  }'
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "name": "Superadmin Jaminan",
    "email": "superadmin@jaminan.local",
    "role": "superadmin"
  },
  "token": "7|rxC8K9xK...",
  "token_timeout": 3600
}
```

### Get Current User Info
```bash
curl -X GET http://localhost:8000/api/jaminan/auth/user \
  -H "Authorization: Bearer 7|rxC8K9xK..." \
  -H "Content-Type: application/json"
```

### Create New User (Superadmin only)
```bash
curl -X POST http://localhost:8000/api/jaminan/users \
  -H "Authorization: Bearer 7|rxC8K9xK..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin Kredit Baru",
    "email": "newadmin@jaminan.local",
    "password": "securepassword123",
    "role": "admin-kredit"
  }'
```

### Update User (Superadmin only)
```bash
curl -X PUT http://localhost:8000/api/jaminan/users/2 \
  -H "Authorization: Bearer 7|rxC8K9xK..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin Kredit Updated",
    "password": "newpassword123",
    "role": "admin-holding"
  }'
```

### Delete User (Superadmin only)
```bash
curl -X DELETE http://localhost:8000/api/jaminan/users/3 \
  -H "Authorization: Bearer 7|rxC8K9xK..."
```

---

## 5. STRUKTUR DATABASE

### Connection Configuration
**File:** `config/database.php`

```php
'mysql_jaminan' => [
    'driver' => env('DB_CONNECTION_2', 'mysql'),
    'host' => env('DB_HOST_2', '127.0.0.1'),
    'port' => env('DB_PORT_2', 3306),
    'database' => env('DB_DATABASE_2', 'asset_jaminan'),
    'username' => env('DB_USERNAME_2', 'root'),
    'password' => env('DB_PASSWORD_2', ''),
    'unix_socket' => env('DB_SOCKET_2', ''),
    'charset' => 'utf8mb4',
    'collation' => 'utf8mb4_unicode_ci',
    'prefix' => '',
    'prefix_indexes' => true,
    'strict' => true,
    'engine' => null,
],
```

### Environment Configuration
**File:** `.env`

```
# Primary Database (Asset Management)
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=asset_management_db
DB_USERNAME=root
DB_PASSWORD=

# Secondary Database (Jaminan)
DB_CONNECTION_2=mysql
DB_HOST_2=127.0.0.1
DB_PORT_2=3306
DB_DATABASE_2=asset_jaminan
DB_USERNAME_2=root
DB_PASSWORD_2=
```

---

## 6. INTEGRASI DENGAN SISTEM JAMINAN YANG ADA

Sistem user role jaminan terintegrasi dengan:

### A. Guarantee Management
- Tabel: `guarantees`
- Controllers: `GuaranteeController`

### B. Guarantee Loan Management
- Tabel: `guarantee_loans`
- Controllers: `GuaranteeLoanController`
- Methods: `create()`, `getByGuaranteeId()`, `getByStatus()`, `returnLoan()`

### C. Guarantee Settlement Management
- Tabel: `guarantee_settlements`
- Controllers: `GuaranteeSettlementController`
- Methods: `approve()`, `reject()`, `getByStatus()`

**Authorization Flow:**
```
User Login (jaminan/auth/login)
  ↓
JWT Token Created (Sanctum)
  ↓
Protected Routes (auth:sanctum middleware)
  ↓
Role Check (JaminanRoleMiddleware)
  ↓
Access Granted/Denied
  ↓
Database Query (with role-based filtering)
```

---

## 7. SECURITY IMPLEMENTATION

### Password Hashing
```php
// Passwords otomatis di-hash menggunakan Laravel's Hashing
protected $casts = [
    'password' => 'hashed',
];

// Manual hashing jika diperlukan
use Illuminate\Support\Facades\Hash;
$user->password = Hash::make('password');
```

### API Token (Sanctum)
- Token timeout: 60 menit (3600 detik)
- Token disimpan dalam `personal_access_tokens` table
- Token auto-deleted saat logout
- Token revoked saat user di-delete

### Authorization
- Role-based access control di middleware
- Permission checking di controller methods
- User tidak bisa modify role/permissions mereka sendiri
- Superadmin adalah satu-satunya yang bisa manage users

### SQL Injection Prevention
- Menggunakan Laravel's Query Builder (prepared statements)
- Validation di controller untuk semua inputs
- Mass assignment protection via `$fillable` property

---

## 8. FILE-FILE YANG DIBUAT

### Database
```
database/migrations_jaminan/2024_11_25_000000_create_jaminan_users_table.php
database/seeders/JaminanUserSeeder.php
```

### Models
```
app/Models_jaminan/JaminanUser.php
```

### Controllers
```
app/Http/Controllers/Api_jaminan/JaminanAuthController.php
```

### Middleware
```
app/Http/Middleware/JaminanRoleMiddleware.php
```

### Routes
```
routes/api.php (updated dengan jaminan auth routes)
```

---

## 9. TESTING ENDPOINTS

### 1. Test Login Superadmin
```bash
POST /api/jaminan/auth/login
{
  "email": "superadmin@jaminan.local",
  "password": "password"
}
```
Expected: HTTP 200 dengan token

### 2. Test Get User (authenticated)
```bash
GET /api/jaminan/auth/user
Header: Authorization: Bearer {token}
```
Expected: HTTP 200 dengan user info dan permissions

### 3. Test Verify Token
```bash
GET /api/jaminan/auth/verify-token
Header: Authorization: Bearer {token}
```
Expected: HTTP 200 dengan valid=true

### 4. Test Create User (Superadmin only)
```bash
POST /api/jaminan/users
Header: Authorization: Bearer {token}
{
  "name": "Test User",
  "email": "test@jaminan.local",
  "password": "password123",
  "role": "admin-kredit"
}
```
Expected: HTTP 201 dengan user data

### 5. Test Unauthorized Access (Admin Kredit)
```bash
POST /api/jaminan/users
Header: Authorization: Bearer {admin-kredit-token}
{...}
```
Expected: HTTP 403 Unauthorized

---

## 10. TROUBLESHOOTING

### Issue: "Migration not found"
**Solution:**
```bash
php artisan migrate:refresh --database=mysql_jaminan
```

### Issue: "Class JaminanUser not found"
**Solution:**
```bash
# Clear autoloader cache
php artisan clear-cache
composer dump-autoload
```

### Issue: "Connection not defined"
**Solution:**
```
1. Check config/database.php has mysql_jaminan configuration
2. Check .env file has DB_CONNECTION_2 settings
3. Verify jaminan_users table exists in asset_jaminan database
```

### Issue: "Seeder failed"
**Solution:**
```bash
# Drop and recreate the table
php artisan migrate:refresh --database=mysql_jaminan --path=database/migrations_jaminan
# Run seeder again
php artisan db:seed --class=JaminanUserSeeder
```

---

## 11. SUMMARY IMPLEMENTASI

✅ **Database Migration** - Tabel jaminan_users dengan 3 role
✅ **Model** - JaminanUser dengan methods untuk role checking
✅ **Controller** - JaminanAuthController untuk authentication & user management
✅ **Middleware** - JaminanRoleMiddleware untuk role-based access control
✅ **Routes** - API routes untuk login, logout, user management
✅ **Seeder** - Default users untuk testing
✅ **Security** - Password hashing, JWT tokens, authorization checks

**Alur Login:**
1. User melakukan POST ke `/api/jaminan/auth/login` dengan email dan password
2. System mengverifikasi credentials terhadap tabel `jaminan_users`
3. Jika berhasil, system generate JWT token (Sanctum)
4. User menggunakan token untuk akses protected routes
5. Setiap request di-validate oleh `auth:sanctum` middleware
6. Role di-check oleh controller methods dengan kondisional checks

---

## 12. NEXT STEPS (OPSIONAL)

Untuk enhancement lebih lanjut, dapat ditambahkan:

1. **Email Verification**
   - Verifikasi email saat registrasi
   - Resend email verification token

2. **Password Reset**
   - Forgot password functionality
   - Reset token via email

3. **Activity Logging**
   - Log semua user actions
   - Audit trail untuk settlement approvals

4. **Two-Factor Authentication (2FA)**
   - OTP via email/SMS
   - Authenticator app support

5. **Role-Based Permissions**
   - Granular permissions mapping
   - Permission assignments per user

---

**Dokumentasi dibuat pada:** November 25, 2024
**Versi:** 1.0
**Status:** Implementation Complete ✅
