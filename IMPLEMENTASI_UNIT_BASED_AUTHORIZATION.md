# Implementasi Unit-Based Authorization untuk Admin-Kredit

## 📋 Ringkasan
Implementasi lengkap unit-based access control untuk role admin-kredit di sistem jaminan (guarantee). Admin-kredit dapat **hanya menambahkan, meminjam, melunaskan, dan mengedit jaminan yang ada di unit mereka saja**.

---

## ✅ Fitur yang Diimplementasikan

### 1. **UnitAuthorizationTrait**
**File:** `app/Http/Traits/UnitAuthorizationTrait.php`

Helper trait yang menyediakan metode-metode untuk validasi akses unit:

#### Method yang Tersedia:

```php
// 1. Cek apakah user bisa akses unit tertentu
canAccessUnit(?int $unitId): bool

// 2. Cek akses dan return error response jika ditolak
checkUnitAccessOrFail(?int $unitId): bool|JsonResponse

// 3. Dapatkan list unit yang bisa diakses user
getAccessibleUnitIds(): array

// 4. Dapatkan unit_id dari authenticated user (admin-kredit)
getUserUnitId(): ?int

// 5. Validasi bahwa admin-kredit hanya bisa modify resources di unit mereka
validateUnitIdForAdminKredit(?int $requestUnitId): bool|JsonResponse
```

#### Logic Authorization:
- **Super-admin & Admin-holding:** Dapat akses SEMUA unit
- **Admin-kredit:** Hanya dapat akses unit mereka sendiri (berdasarkan `user->unit_id`)
- **Non-admin:** Tidak ada akses

---

## 🔐 Implementasi di Controllers

### 2. **GuaranteeController**

#### Method yang Diupdate:
- ✅ `show($id)` - Menampilkan detail jaminan
  - **Validasi:** Cek unit akses sebelum return data

#### Implementasi:
```php
public function show($id)
{
    $guarantee = Guarantee::with('unit')->find($id);

    if (!$guarantee) {
        return notFound();
    }

    // TUGAS 5: Check unit access untuk admin-kredit
    $accessCheck = $this->checkUnitAccessOrFail($guarantee->unit_id);
    if ($accessCheck !== true) {
        return $accessCheck;  // Return 403 Forbidden
    }

    return response with guarantee data;
}
```

---

### 3. **GuaranteeLoanController**

#### Method yang Diupdate:
- ✅ `show($id)` - Menampilkan detail peminjaman
- ✅ `update($request, $id)` - Update peminjaman
- ✅ `destroy($id)` - Hapus peminjaman

#### Validasi:
Semua method melakukan:
1. Load loan dengan `with('guarantee')` untuk akses unit_id
2. Check unit access via `checkUnitAccessOrFail($loan->guarantee->unit_id)`
3. Return 403 Forbidden jika akses ditolak

#### Contoh:
```php
public function update(Request $request, $id)
{
    $loan = GuaranteeLoan::with('guarantee')->find($id);

    if (!$loan) {
        return notFound();
    }

    // TUGAS 5: Check unit access untuk admin-kredit
    $accessCheck = $this->checkUnitAccessOrFail($loan->guarantee->unit_id);
    if ($accessCheck !== true) {
        return $accessCheck;
    }

    // Update loan...
}
```

---

### 4. **GuaranteeSettlementController**

#### Method yang Diupdate:
- ✅ `show($id)` - Menampilkan detail pelunasan
- ✅ `update($request, $id)` - Update pelunasan
- ✅ `destroy($id)` - Hapus pelunasan
- ✅ `approve($request, $id)` - **CRITICAL** Setujui pelunasan
- ✅ `reject($request, $id)` - **CRITICAL** Tolak pelunasan

#### Validasi Khusus:
Method `approve()` dan `reject()` adalah operasi kritis yang WAJIB memiliki validasi unit access.

#### Contoh:
```php
public function approve(Request $request, $id)
{
    $settlement = GuaranteeSettlement::with('guarantee')->find($id);

    if (!$settlement) {
        return notFound();
    }

    // TUGAS 5: Check unit access untuk admin-kredit
    $accessCheck = $this->checkUnitAccessOrFail($settlement->guarantee->unit_id);
    if ($accessCheck !== true) {
        return $accessCheck;
    }

    // Approve settlement...
}
```

---

## 🔄 Flow Authorization Lengkap

### Saat Admin-Kredit Ingin Melakukan Operasi:

```
1. Request datang ke API endpoint (e.g., PUT /api/jaminan/guarantees/{id})
                ↓
2. Controller method dijalankan (e.g., update())
                ↓
3. Load resource dengan relationship:
   GuaranteeSettlement::with('guarantee')->find($id)
                ↓
4. Cek resource exists (404 jika tidak ada)
                ↓
5. CALL: $accessCheck = $this->checkUnitAccessOrFail($resource->guarantee->unit_id)
                ↓
   ┌─────────────────────────────────────┐
   │  checkUnitAccessOrFail() Logic:      │
   ├─────────────────────────────────────┤
   │ 1. Get authenticated user            │
   │ 2. If super-admin/admin-holding:     │
   │    → return true (akses diterima)    │
   │ 3. If admin-kredit:                  │
   │    → call canAccessGuaranteeInUnit() │
   │    → cek user->unit_id == resource->unit_id │
   │    → jika match: return true         │
   │    → jika tidak: return 403 response │
   └─────────────────────────────────────┘
                ↓
6. If denied ($accessCheck !== true):
   return 403 JSON response with message:
   "Anda tidak memiliki akses ke unit ini"
                ↓
7. If allowed (continue dengan business logic):
   Update/Delete/Approve resource...
                ↓
8. Return 200 success response
```

---

## 📝 Response Format

### Success (Admin-Kredit Akses Diterima):
```json
{
    "success": true,
    "message": "Data jaminan berhasil diambil",
    "data": { /* resource data */ }
}
```

### Error: Unit Access Denied
```json
{
    "success": false,
    "message": "Anda tidak memiliki akses ke unit ini",
    "error_code": "UNIT_ACCESS_DENIED"
}
```

HTTP Status Code: **403 Forbidden**

---

## 🧪 Testing Scenarios

### Test Case 1: Admin-Kredit Unit A Akses Jaminan Unit A (Allowed)
```
1. Login as admin-kredit dengan unit_id = 1 (Unit Kajoetangan)
2. Request: GET /api/jaminan/guarantees/123
   (guarantee_id 123 punya unit_id = 1)
3. Expected: 200 OK dengan data guarantee
```

### Test Case 2: Admin-Kredit Unit A Akses Jaminan Unit B (Denied)
```
1. Login as admin-kredit dengan unit_id = 1 (Unit Kajoetangan)
2. Request: GET /api/jaminan/guarantees/456
   (guarantee_id 456 punya unit_id = 2, Unit Lain)
3. Expected: 403 Forbidden dengan message "Anda tidak memiliki akses ke unit ini"
```

### Test Case 3: Admin-Holding Akses Jaminan Semua Unit (Allowed)
```
1. Login as admin-holding (no unit restriction)
2. Request: GET /api/jaminan/guarantees/123
   (unit_id tidak penting)
3. Expected: 200 OK dengan data guarantee
```

### Test Case 4: Admin-Kredit Approve Pelunasan Unit Lain (Denied)
```
1. Login as admin-kredit dengan unit_id = 1
2. Request: PUT /api/jaminan/guarantee-settlements/789/approve
   (settlement berkaitan dengan guarantee unit_id = 2)
3. Expected: 403 Forbidden
```

---

## 🎯 Fitur yang Sudah Dilindungi

| Feature | Protected | Method |
|---------|-----------|--------|
| Lihat Detail Jaminan | ✅ | GuaranteeController@show |
| Edit Jaminan | ✅ | GuaranteeController@update |
| Hapus Jaminan | ✅ | GuaranteeController@destroy |
| Lihat Detail Peminjaman | ✅ | GuaranteeLoanController@show |
| Edit Peminjaman | ✅ | GuaranteeLoanController@update |
| Hapus Peminjaman | ✅ | GuaranteeLoanController@destroy |
| Lihat Detail Pelunasan | ✅ | GuaranteeSettlementController@show |
| Edit Pelunasan | ✅ | GuaranteeSettlementController@update |
| Hapus Pelunasan | ✅ | GuaranteeSettlementController@destroy |
| **Setujui Pelunasan** | ✅ | GuaranteeSettlementController@approve |
| **Tolak Pelunasan** | ✅ | GuaranteeSettlementController@reject |
| Daftar Jaminan (filter per unit) | ✅ | GuaranteeController@index |
| Daftar Peminjaman (filter per unit) | ✅ | GuaranteeLoanController@index |
| Daftar Pelunasan (filter per unit) | ✅ | GuaranteeSettlementController@index |

---

## 📦 File yang Dimodifikasi

### File Baru:
- `app/Http/Traits/UnitAuthorizationTrait.php`

### File yang Diupdate:
- `app/Http/Controllers/Api_jaminan/GuaranteeController.php`
  - Added trait: `UnitAuthorizationTrait`
  - Updated method: `show()`

- `app/Http/Controllers/Api_jaminan/GuaranteeLoanController.php`
  - Added trait: `UnitAuthorizationTrait`
  - Updated methods: `show()`, `update()`, `destroy()`

- `app/Http/Controllers/Api_jaminan/GuaranteeSettlementController.php`
  - Added trait: `UnitAuthorizationTrait`
  - Updated methods: `show()`, `update()`, `destroy()`, `approve()`, `reject()`

---

## 🚀 Cara Menggunakan di Controller Baru

Jika ada controller jaminan baru yang membutuhkan unit-based authorization:

```php
<?php

namespace App\Http\Controllers\Api_jaminan;

use App\Http\Controllers\Controller;
use App\Http\Traits\UnitAuthorizationTrait;  // ← Import trait

class NewController extends Controller
{
    use UnitAuthorizationTrait;  // ← Use trait

    public function show($id)
    {
        $resource = Resource::with('guarantee')->find($id);

        if (!$resource) {
            return notFound();
        }

        // ← Gunakan trait method
        $accessCheck = $this->checkUnitAccessOrFail($resource->guarantee->unit_id);
        if ($accessCheck !== true) {
            return $accessCheck;
        }

        // Lanjutkan business logic...
    }
}
```

---

## 📊 Database Relationships

```
User (JaminanUser)
├── unit_id (FK) ─┐
└─ getAccessibleUnitIds() ──→ [unit_ids]
                 │
                 ↓
            Unit (mysql_jaminan.units)
                 │
                 ↓
            Guarantee (unit_id)
                 │
        ┌────────┼────────┐
        ↓        ↓        ↓
    GuaranteeLoan    GuaranteeSettlement
    (via guarantee)   (via guarantee)
```

---

## ⚠️ Important Notes

1. **Admin-Kredit Restriction:**
   - Admin-kredit HANYA bisa akses unit mereka sendiri
   - Tidak bisa mengubah unit_id saat membuat/mengedit jaminan
   - Unit_id otomatis di-set dari `Auth::user()->unit_id`

2. **Super-Admin & Admin-Holding:**
   - Dapat akses semua unit tanpa batasan
   - Dapat membuat jaminan di unit manapun
   - Dapat menyetujui/menolak pelunasan dari semua unit

3. **Error Response:**
   - Jika unit access ditolak: **403 Forbidden**
   - Error code: `UNIT_ACCESS_DENIED` (untuk diferensiasi di frontend)

4. **Logging:**
   - Semua unit access check tercatat di controller logs
   - Use Laravel Log untuk audit trail jika diperlukan

---

## 🔍 Troubleshooting

### Issue: "Anda tidak memiliki akses ke unit ini" saat admin-kredit login
**Penyebab:** Admin-kredit user tidak memiliki unit_id yang terset

**Solusi:**
```php
// Di JaminanAuthController login method, pastikan:
$user->unit_id = config('app.default_unit_id'); // Set default jika perlu
$user->save();
```

### Issue: Super-admin tidak bisa akses semua unit
**Penyebab:** User tidak ter-setup dengan role yang benar

**Solusi:**
```php
// Pastikan role di jaminan_users table adalah:
// - 'super-admin' untuk super admin
// - 'admin-holding' untuk admin holding
// - 'admin-kredit' untuk admin kredit
```

---

## 📈 Future Enhancements

1. **Middleware-level Authorization:**
   - Create `UnitAuthorizationMiddleware` untuk centralized checking
   - Apply ke route groups

2. **Audit Logging:**
   - Log semua unit access attempts (allowed & denied)
   - Store di `access_logs` table untuk compliance

3. **Unit Transfer:**
   - Allow admin-holding untuk transfer admin-kredit ke unit lain
   - Update user->unit_id dan notify system

4. **Multi-Unit Access:**
   - Extend untuk admin-kredit bisa akses multiple units
   - Use pivot table `user_units` untuk many-to-many relationship

---

## 📚 Related Files

- Model: [app/Models_jaminan/JaminanUser.php](app/Models_jaminan/JaminanUser.php)
- Trait: [app/Http/Traits/UnitAuthorizationTrait.php](app/Http/Traits/UnitAuthorizationTrait.php)
- Controllers:
  - [GuaranteeController](app/Http/Controllers/Api_jaminan/GuaranteeController.php)
  - [GuaranteeLoanController](app/Http/Controllers/Api_jaminan/GuaranteeLoanController.php)
  - [GuaranteeSettlementController](app/Http/Controllers/Api_jaminan/GuaranteeSettlementController.php)

---

**Implementasi Selesai ✅**

Tanggal: 30 November 2025
Sistem: Asset Management & Guarantee Management (Jaminan)
