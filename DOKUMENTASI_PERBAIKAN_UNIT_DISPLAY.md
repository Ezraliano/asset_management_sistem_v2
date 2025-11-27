# Dokumentasi Perbaikan Unit Display - Jaminan Module

## 📋 Ringkasan Masalah

Pada halaman daftar jaminan (phpMyAdmin atau data table), field `unit_id` hanya menampilkan **nomor ID** (angka) saja, bukan menampilkan **nama unit** yang lebih informatif dan user-friendly.

**Sebelum:** `unit_id = 2` (tidak jelas unit apa)
**Sesudah:** `unit = { id: 2, name: "Unit Kajoetangan", ... }` (jelas dan informatif)

---

## 🔍 Analisis Penyebab

### Masalah: Eager Loading Relationship Belum Diterapkan

**File:** `app/Http/Controllers/Api_jaminan/GuaranteeController.php`

**Penyebab:**
Model `Guarantee` memiliki relationship ke `Unit`:
```php
public function unit()
{
    return $this->belongsTo(Unit::class, 'unit_id');
}
```

Tetapi saat query data guarantee, relationship ini **tidak di-load** (lazy loading):

```php
// ❌ SEBELUM: Hanya load guarantee, tidak load unit relationship
$guarantees = $query->paginate($perPage);
// Response hanya berisi: unit_id = 2, tidak termasuk unit object
```

Akibatnya:
- Frontend/phpMyAdmin hanya bisa menampilkan `unit_id` (angka)
- Data unit lengkap tidak tersedia
- User tidak tahu unit apa yang dihubungkan

---

## ✅ Solusi yang Diterapkan

### Solusi: Menggunakan Eager Loading dengan `->with('unit')`

**File:** `app/Http/Controllers/Api_jaminan/GuaranteeController.php`

#### Method 1: `index()` - Daftar Semua Jaminan

**Perubahan (Baris 21):**
```php
// ❌ SEBELUM
$query = Guarantee::query();

// ✅ SESUDAH
$query = Guarantee::query()->with('unit');
```

**Keuntungan:**
- Saat list jaminan, data unit langsung di-load bersamanya
- Hanya 1 query tambahan (eager loading, bukan N+1 queries)
- Response termasuk: `unit = { id, name, code, description, ... }`

#### Method 2: `show()` - Detail Single Jaminan

**Perubahan (Baris 173):**
```php
// ❌ SEBELUM
$guarantee = Guarantee::find($id);

// ✅ SESUDAH
$guarantee = Guarantee::with('unit')->find($id);
```

#### Method 3: `getByType()` - Jaminan Berdasarkan Tipe

**Perubahan (Baris 322-323):**
```php
// ❌ SEBELUM
$guarantees = Guarantee::byType($type)
    ->orderBy('input_date', 'desc')
    ->get();

// ✅ SESUDAH
$guarantees = Guarantee::with('unit')
    ->byType($type)
    ->orderBy('input_date', 'desc')
    ->get();
```

#### Method 4: `getBySpk()` - Jaminan Berdasarkan SPK Number

**Perubahan (Baris 347-348):**
```php
// ❌ SEBELUM
$guarantees = Guarantee::bySpkNumber($spkNumber)
    ->get();

// ✅ SESUDAH
$guarantees = Guarantee::with('unit')
    ->bySpkNumber($spkNumber)
    ->get();
```

---

## 📊 Contoh Response Sebelum & Sesudah

### Sebelum (❌ Tidak Ada Unit Data):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "spk_number": "SPK120",
      "cif_number": "900",
      "spk_name": "Agus Sutrisno",
      "guarantee_type": "BPKB",
      "guarantee_name": "BPKB Yamaha Atas Nama Dhika",
      "guarantee_number": "9010100",
      "unit_id": 2,
      "unit": null
    }
  ]
}
```

### Sesudah (✅ Ada Unit Data):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "spk_number": "SPK120",
      "cif_number": "900",
      "spk_name": "Agus Sutrisno",
      "guarantee_type": "BPKB",
      "guarantee_name": "BPKB Yamaha Atas Nama Dhika",
      "guarantee_number": "9010100",
      "unit_id": 2,
      "unit": {
        "id": 2,
        "code": "KAJOETANGAN",
        "name": "Unit Kajoetangan",
        "description": "Unit Cabang Kajoetangan",
        "location": "Jl. Raya Kajoetangan No. 456, Malang",
        "is_active": true
      }
    }
  ]
}
```

---

## 📊 File yang Dimodifikasi

| No | File | Method | Baris | Perubahan |
|----|------|--------|-------|-----------|
| 1 | GuaranteeController.php | `index()` | 21 | Tambah `.with('unit')` |
| 2 | GuaranteeController.php | `show()` | 173 | Tambah `.with('unit')` |
| 3 | GuaranteeController.php | `getByType()` | 322-323 | Tambah `.with('unit')` |
| 4 | GuaranteeController.php | `getBySpk()` | 347-348 | Tambah `.with('unit')` |

---

## 🧪 Cara Testing

### Test 1: Cek Response API
```bash
# Get all guarantees dengan unit data
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://127.0.0.1:8000/api/guarantees"
```

**Expected Output:**
Setiap guarantee harus memiliki object `unit` dengan data lengkap (id, name, code, location, dll)

### Test 2: Cek di Frontend/PhpMyAdmin
1. Buka halaman **Daftar Jaminan** atau phpMyAdmin
2. Lihat kolom **Unit** atau **unit_id**
3. Seharusnya menampilkan: **"Unit Kajoetangan"** (bukan hanya "2")

### Test 3: Cek Query Performance
```bash
# Check di Laravel Debug Bar atau database log
# Harus ada 2 queries saja (1 untuk guarantee, 1 untuk unit)
# Bukan N+1 queries!
```

---

## 📝 Catatan Teknis

### Eager Loading vs Lazy Loading
- **Lazy Loading** (❌ SEBELUM):
  - Query 1: `SELECT * FROM guarantees` → ambil 15 record
  - Query 2-16: Loop setiap guarantee untuk `$guarantee->unit` → 15 queries
  - **Total: 16 queries** (N+1 problem!)

- **Eager Loading** (✅ SESUDAH):
  - Query 1: `SELECT * FROM guarantees` → ambil 15 record
  - Query 2: `SELECT * FROM units WHERE id IN (...)` → ambil semua unit sekaligus
  - **Total: 2 queries** (jauh lebih efisien!)

### Model Relationship (Sudah Ada)
```php
// app/Models_jaminan/Guarantee.php
public function unit()
{
    return $this->belongsTo(Unit::class, 'unit_id');
}
```

Relationship ini **sudah defined**, tinggal di-eager load dengan `.with('unit')`

---

## 🚀 Hasil Akhir

Setelah perbaikan ini:

✅ API response berisi data unit lengkap (bukan hanya ID)
✅ Frontend bisa menampilkan nama unit (lebih user-friendly)
✅ Query performance lebih baik (eager loading)
✅ phpMyAdmin menampilkan: "Unit Kajoetangan" (bukan "2")
✅ Konsisten di semua endpoint (index, show, getByType, getBySpk)

---

## 🔗 Related Components

- **Backend API:** GuaranteeController.php
- **Frontend:** GuaranteeList, GuaranteeTable, GuaranteeDashboard
- **Database:** Guarantees table (unit_id foreign key)
- **Model Relationship:** Guarantee -> Unit (belongsTo)

---

**Tanggal Perbaikan:** 27 November 2025
**Status:** ✅ Selesai
**Impact:** Medium (Performance + UX Improvement)
