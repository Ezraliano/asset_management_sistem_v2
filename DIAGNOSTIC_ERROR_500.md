# 🔍 DIAGNOSTIC: ERROR 500 - Failed to create/update user account

## 🔴 ERROR SUMMARY

```
HTTP 500: Failed to create/update user account
```

**Artinya:**
- SSO login berhasil (step 1 & 2 OK)
- Tapi gagal saat `User::updateOrCreate()` (step 3)
- Database query throw exception

---

## 🎯 KEMUNGKINAN PENYEBAB

### Kemungkinan 1: Duplicate Username (PALING MUNGKIN - 60%)

**Scenario:**
```php
$userData = [
    'username' => $userInfo['username'] ?? $userInfo['email'],  // ← Dari SSO
    // ...
];

User::updateOrCreate(
    ['email' => $userInfo['email']],  // Update by email
    $userData                           // Tapi username unique!
);
```

**Problem:**
- SSO mengirim `username` yang berbeda dari user lama
- Database punya constraint: `username` UNIQUE
- Saat update, username baru sudah ada user lain
- **Result: UNIQUE constraint failed**

**Example:**
```
User 1: email=john@test.com, username=john.doe  (existing)
SSO gives: email=john@test.com, username=john.smith  (baru)
           ↓
Try update: SET username='john.smith' WHERE email='john@test.com'
           ↓
UNIQUE constraint failed: users.username  (john.smith already exists for other user)
```

---

### Kemungkinan 2: Column Tidak Exist (20%)

**Scenario:**
- Migration belum dijalankan lengkap
- Column `unit_id` tidak ada di table `users`
- Saat insert `unit_id`, error column not found

**Check:**
```sql
SHOW COLUMNS FROM users;
-- Harus ada: unit_id column
```

---

### Kemungkinan 3: Invalid unit_id Foreign Key (15%)

**Scenario:**
```php
'unit_id' => $userInfo['unit_id'] ?? null,
```

- SSO mengirim `unit_id` yang tidak exist di table `units`
- Foreign key constraint failed

**Example:**
```sql
INSERT INTO users (..., unit_id=999, ...)
-- Tapi units table tidak punya id=999
-- Result: Foreign key constraint failed
```

---

### Kemungkinan 4: Field Length Mismatch (5%)

**Scenario:**
- SSO mengirim username/name yang terlalu panjang
- Database column terlalu pendek (e.g., varchar(50) tapi dapat 100 char)

---

## ✅ CARA MENGETAHUI ERROR SEBENARNYA

### STEP 1: Check Production Logs

**SSH ke production server:**
```bash
ssh user@bukujaminanbe.arjunaconnect.com
cd /path/to/app
```

**Cari error detail:**
```bash
# Cari last 50 lines dengan error
tail -50 storage/logs/laravel.log | grep -i "database error\|sso"

# Atau search untuk "Database error during SSO user sync"
grep "Database error during SSO user sync" storage/logs/laravel.log | tail -5

# Copy full entry lengkap dengan JSON data
tail -100 storage/logs/laravel.log
```

**Output akan terlihat seperti:**
```
[2025-11-27 14:30:45] production.ERROR: Database error during SSO user sync {"email":"john@test.com","error_message":"UNIQUE constraint failed: users.username","sql":"INSERT INTO users...","file":"/path/to/app.php","line":129}
```

---

### STEP 2: Check Database Structure

**SSH ke production:**
```bash
# Check table users structure
mysql -u u609918206_assets -p"Arema$123" u609918206_assets -e "DESCRIBE users;"

# Check unique keys
mysql -u u609918206_assets -p"Arema$123" u609918206_assets -e "SHOW KEYS FROM users WHERE Key_name='username';"

# List semua users (untuk check duplicate username)
mysql -u u609918206_assets -p"Arema$123" u609918206_assets -e "SELECT id, email, username FROM users;"
```

---

### STEP 3: Test Manual Insert

**Test insert dengan data SSO:**
```bash
mysql -u u609918206_assets -p"Arema$123" u609918206_assets -e "
INSERT INTO users (name, username, email, password, role, unit_id, created_at, updated_at)
VALUES ('Test User', 'testuser', 'test@example.com', 'hashed_pwd', 'user', NULL, NOW(), NOW());
"
```

**Jika error:**
- Akan langsung tahu apa constraint yang violated

---

## 🔧 SOLUSI UNTUK SETIAP KEMUNGKINAN

### FIX 1: Duplicate Username (Most Likely)

**Masalah:**
- Username tidak bisa di-update jika sudah ada user lain
- Atau SSO mengirim username yang conflict

**Solusi A: Buat username unique per email**
```php
// Alih-alih update username, gunakan email sebagai unique identifier
$userData = [
    'name' => $userInfo['name'] ?? 'User ' . uniqid(),
    'username' => $userInfo['username'] ?? $userInfo['email'],  // ← Keep it
    'role' => ...,
    'password' => ...,
    'unit_id' => ...,
];

$localUser = User::updateOrCreate(
    ['email' => $userInfo['email']],  // ← Update by email, jadi username bisa tetap sama
    $userData
);
```

**Solusi B: Gunakan email untuk updateOrCreate**
```php
// Kalau username tidak unik, gunakan email doang
$localUser = User::updateOrCreate(
    ['email' => $userInfo['email']],  // ← Key for update
    [
        'name' => $userInfo['name'] ?? 'User ' . uniqid(),
        'username' => $userInfo['email'],  // ← Gunakan email sebagai username juga
        'role' => ...,
        'password' => ...,
        'unit_id' => ...,
    ]
);
```

**Solusi C: Handle conflict dengan try-catch**
```php
try {
    $localUser = User::updateOrCreate(
        ['email' => $userInfo['email']],
        $userData
    );
} catch (\Illuminate\Database\QueryException $e) {
    if (strpos($e->getMessage(), 'username') !== false) {
        // Username conflict, gunakan email sebagai fallback
        $userData['username'] = $userInfo['email'];
        $localUser = User::updateOrCreate(
            ['email' => $userInfo['email']],
            $userData
        );
    } else {
        throw $e;  // Re-throw jika error lain
    }
}
```

---

### FIX 2: Missing Column

**Check:**
```bash
mysql -u u609918206_assets -p"Arema$123" u609918206_assets -e "DESCRIBE users;" | grep unit_id
```

**Jika tidak ada:**
```bash
# SSH ke production
cd /path/to/app

# Run migration
php artisan migrate

# Verify
mysql -u u609918206_assets -p"Arema$123" u609918206_assets -e "DESCRIBE users;" | grep unit_id
```

---

### FIX 3: Invalid Foreign Key

**Check:**
```bash
# Hitung unit yang available
mysql -u u609918206_jaminan -p"GunungArjuna123" u609918206_jaminan -e "SELECT id, name FROM units;"

# Hitung unit_id yang di-insert ke users
mysql -u u609918206_assets -p"Arema$123" u609918206_assets -e "SELECT DISTINCT unit_id FROM users WHERE unit_id IS NOT NULL;"
```

**Jika ada unit_id di users yang tidak exist di units:**
```bash
# Set unit_id = NULL sebagai fallback
mysql -u u609918206_assets -p"Arema$123" u609918206_assets -e "
UPDATE users SET unit_id = NULL WHERE unit_id NOT IN (
    SELECT id FROM units
);
"
```

**Atau di code:**
```php
$userData = [
    // ...
    'unit_id' => $userInfo['unit_id'] ?? null,  // Only if exists in units table
];

// Validate unit_id
if ($userData['unit_id']) {
    $unitExists = \App\Models\Unit::find($userData['unit_id'])->exists();
    if (!$unitExists) {
        $userData['unit_id'] = null;  // Fallback to null
        Log::warning('SSO unit_id not found in units table', [
            'unit_id' => $userInfo['unit_id']
        ]);
    }
}
```

---

## 📋 TROUBLESHOOTING CHECKLIST

Jalankan commands ini di production server:

### 1. Check Logs (PRIORITY 1)
```bash
tail -100 storage/logs/laravel.log | grep -A3 "Database error during SSO user sync"
```

### 2. Check Users Table
```bash
mysql -u u609918206_assets -p"Arema$123" u609918206_assets << 'EOF'
-- Check structure
DESCRIBE users;

-- Check unique keys
SHOW KEYS FROM users;

-- Check current users
SELECT id, email, username, unit_id FROM users LIMIT 10;

-- Check duplicate usernames
SELECT username, COUNT(*) FROM users GROUP BY username HAVING COUNT(*) > 1;

-- Check invalid unit_ids
SELECT DISTINCT unit_id FROM users WHERE unit_id IS NOT NULL;
EOF
```

### 3. Check Units Table
```bash
mysql -u u609918206_jaminan -p"GunungArjuna123" u609918206_jaminan -e "SELECT id, name FROM units;"
```

### 4. Test Manual Insert
```bash
mysql -u u609918206_assets -p"Arema$123" u609918206_assets -e "
INSERT INTO users (name, username, email, password, role, created_at, updated_at)
VALUES ('Test', 'test123', 'test123@test.com', 'pwd', 'user', NOW(), NOW());
"
```

---

## 🚀 REKOMENDASI PERBAIKAN

### Quick Fix: Handle Username Conflict
Edit `app/Http/Controllers/Api/AuthSSOController.php` di STEP 3:

Ganti:
```php
$userData = [
    'name' => $userInfo['name'] ?? 'User ' . uniqid(),
    'username' => $userInfo['username'] ?? $userInfo['email'],
    'role' => ...,
    'password' => ...,
    'unit_id' => $userInfo['unit_id'] ?? null,
];

$localUser = User::updateOrCreate(
    ['email' => $userInfo['email']],
    $userData
);
```

Menjadi:
```php
try {
    $userData = [
        'name' => $userInfo['name'] ?? 'User ' . uniqid(),
        'username' => $userInfo['username'] ?? $userInfo['email'],
        'role' => is_array($userInfo['role']) ? ($userInfo['role']['slug'] ?? 'user') : ($userInfo['role'] ?? 'user'),
        'password' => bcrypt('sso-' . $userInfo['email']),
        'unit_id' => $userInfo['unit_id'] ?? null,
    ];

    Log::info('Preparing user data for sync', [
        'email' => $userInfo['email'],
        'username' => $userData['username'],
        'unit_id' => $userData['unit_id'] ?? 'null'
    ]);

    $localUser = User::updateOrCreate(
        ['email' => $userInfo['email']],
        $userData
    );

    Log::info('User synced successfully', [
        'user_id' => $localUser->id,
        'email' => $localUser->email,
        'username' => $localUser->username,
        'unit_id' => $localUser->unit_id
    ]);
} catch (\Illuminate\Database\QueryException $e) {
    Log::error('Database error during SSO user sync', [
        'email' => $userInfo['email'],
        'error' => $e->getMessage(),
        'sql' => $e->getSql() ?? 'N/A',
        'file' => $e->getFile() . ':' . $e->getLine()
    ]);

    // Try fallback: use email as username
    if (strpos($e->getMessage(), 'username') !== false) {
        Log::info('Retrying with email as username', ['email' => $userInfo['email']]);
        $userData['username'] = $userInfo['email'];
        try {
            $localUser = User::updateOrCreate(
                ['email' => $userInfo['email']],
                $userData
            );
        } catch (\Exception $e2) {
            Log::error('Second attempt also failed', ['error' => $e2->getMessage()]);
            throw $e2;
        }
    } else {
        throw $e;
    }
}
```

---

## 📝 NEXT STEPS

1. **FIRST**: Run diagnostic commands di production
2. **SECOND**: Share output dari logs dan database checks
3. **THIRD**: Saya akan buat perbaikan yang spesifik
4. **FOURTH**: Deploy dan test login

---

Silakan jalankan diagnostic commands di atas dan share hasilnya. Maka saya bisa memberikan fix yang pasti sesuai dengan masalah sesungguhnya.
