# Dokumentasi Perbaikan Unit Dropdown - Jaminan Module

## 📋 Ringkasan Masalah

Dropdown unit tidak muncul di dua tempat:
1. **Halaman Input Jaminan** (GuaranteeInputForm.tsx)
2. **Halaman Dashboard Jaminan** (GuaranteeDashboard.tsx)

## 🔍 Analisis Penyebab

### Masalah #1: Route Access Control Terlalu Ketat
**File:** `routes/api.php` (Baris 255)

**Masalah:**
```php
// ❌ SEBELUM: Route hanya bisa diakses oleh user dengan role spesifik
Route::middleware('role:super-admin,admin,unit')->group(function () {
    Route::get('/guarantees/units', [GuaranteeController::class, 'getUnits']);
    // ...
});
```

**Penyebab:**
- Endpoint `/guarantees/units` berada di dalam middleware group yang memerlukan role tertentu
- User yang tidak memiliki role `super-admin`, `admin`, atau `unit` tidak bisa akses
- Frontend tidak bisa load data unit saat form dibuka

---

## ✅ Solusi yang Diterapkan

### Solusi #1: Pindahkan Route ke Area Public Access

**File:** `routes/api.php`

**Perubahan:**

#### Langkah 1: Hapus dari Role-Protected Group
```php
// ❌ DIHAPUS dari group ini
Route::middleware('role:super-admin,admin,unit')->group(function () {
    // ...
    // Route::get('/guarantees/units', [GuaranteeController::class, 'getUnits']);
    // ...
});
```

#### Langkah 2: Tambahkan ke Public Authenticated Routes
```php
// ✅ DITAMBAH ke sini (baris 164)
Route::middleware(['auth:sanctum'])->group(function () {
    // Guarantee units route - accessible by all authenticated users
    Route::get('/guarantees/units', [GuaranteeController::class, 'getUnits']);

    // Unit routes - accessible by all authenticated users
    Route::get('/units', [UnitController::class, 'index']);
    // ...
});
```

**Keuntungan:**
- Semua user yang authenticated bisa akses endpoint ini
- Tidak memandang role user
- Form dan dashboard bisa load unit data dengan normal

---

### Solusi #2: Improve Response Handling di Frontend

**File:** `frontend/services/api.ts` (Baris 2227-2246)

**Perubahan:**

#### Sebelum:
```typescript
export const getGuaranteeUnits = async (): Promise<Unit[]> => {
  try {
    const response = await apiRequest('/guarantees/units');
    const result = handleApiResponse<{data: Unit[]}>(response);
    return result?.data || [];  // ❌ Hanya handle satu format
  } catch (error) {
    console.error('Error fetching guarantee units:', error);
    return [];
  }
};
```

#### Sesudah:
```typescript
export const getGuaranteeUnits = async (): Promise<Unit[]> => {
  try {
    const response = await apiRequest('/guarantees/units');
    const result = handleApiResponse<any>(response);

    // Handle both direct array and {data: [...]} structure
    if (Array.isArray(result)) {
      return result;
    }

    if (result && Array.isArray(result.data)) {
      return result.data;
    }

    return [];
  } catch (error) {
    console.error('Error fetching guarantee units:', error);
    return [];
  }
};
```

**Keuntungan:**
- More flexible response handling
- Bisa handle berbagai format response dari backend
- Lebih robust terhadap perubahan response structure

---

## 📊 File yang Dimodifikasi

| No | File | Baris | Perubahan |
|----|------|-------|-----------|
| 1 | `routes/api.php` | 255 | Dihapus route dari role-protected group |
| 2 | `routes/api.php` | 164 | Ditambah route ke public authenticated area |
| 3 | `frontend/services/api.ts` | 2227-2246 | Improved response handling |

---

## 🧪 Cara Testing

### Test 1: Verifikasi Endpoint Accessible
```bash
# Dengan token auth yang valid
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://127.0.0.1:8000/api/guarantees/units
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Daftar unit berhasil diambil",
  "data": [
    {
      "id": 1,
      "code": "HOLDING",
      "name": "Unit Holding",
      "description": "Unit Kantor Pusat / Holding",
      "location": "Jl. Raya Holding No. 123, Jakarta",
      "is_active": true
    },
    // ... unit lainnya
  ]
}
```

### Test 2: Verifikasi Frontend Rendering
1. Buka halaman **Input Jaminan**
2. Perhatikan field **"Unit"** - seharusnya ada dropdown dengan daftar unit
3. Buka halaman **Dashboard Jaminan**
4. Perhatikan filter **"Filter Unit"** - seharusnya ada dropdown dengan daftar unit

---

## 📝 Catatan Penting

### Database Connection
- Unit data tersimpan di database `mysql_jaminan`
- Model `Unit` menggunakan `protected $connection = 'mysql_jaminan';`
- Seeder `JaminanUnitSeeder.php` sudah menyediakan data awal:
  - Unit Holding
  - Unit Kajoetangan
  - Unit Batu

### Role-Based Authorization
- Endpoint `/guarantees/units` sekarang **bisa diakses oleh semua authenticated user**
- Tidak ada pembatasan role karena user hanya membaca data (bukan write operation)
- Keamanan tetap terjaga karena endpoint tetap memerlukan token auth

### Related Components
- **GuaranteeInputForm.tsx** - Menggunakan `getGuaranteeUnits()` untuk populate dropdown
- **GuaranteeDashboard.tsx** - Menggunakan `getGuaranteeUnits()` untuk populate filter

---

## 🚀 Hasil Akhir

Setelah perbaikan ini, kedua halaman seharusnya menampilkan dropdown unit dengan normal:

✅ Input Jaminan Form - Unit dropdown muncul
✅ Dashboard Jaminan - Unit filter dropdown muncul
✅ Data unit terload dengan benar dari API
✅ User bisa select unit untuk input/filter

---

**Tanggal Perbaikan:** 27 November 2025
**Status:** ✅ Selesai
