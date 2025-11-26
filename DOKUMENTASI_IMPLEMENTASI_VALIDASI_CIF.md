# Dokumentasi Implementasi: Validasi CIF + Atas Nama Jaminan

## 📋 Ringkasan

Telah diimplementasikan validasi tambahan untuk memastikan bahwa **satu Nomor CIF hanya dapat memiliki satu Atas Nama Jaminan**. Ini mencegah data ambigu dan menjaga integritas data.

---

## 🎯 Tujuan

Memastikan:
- ✅ Satu CIF hanya punya SATU Atas Nama Jaminan
- ✅ Satu CIF bisa punya MULTIPLE Nomor SPK (OK)
- ✅ Satu CIF bisa punya MULTIPLE Jaminan dengan nama SAMA (OK)
- ❌ Satu CIF TIDAK boleh punya Atas Nama Jaminan BERBEDA (Dicegah)

---

## 📝 Perubahan yang Dilakukan

### 1. Backend - GuaranteeController.php

#### Method `store()` - Tambah Validasi (Baris 119-130)

```php
// Validasi tambahan: Cek apakah CIF sudah terdaftar dengan nama berbeda
$existingGuarantee = Guarantee::where('cif_number', $validated['cif_number'])->first();
if ($existingGuarantee && strtolower(trim($existingGuarantee->guarantee_name)) !== strtolower(trim($validated['guarantee_name']))) {
    return response()->json([
        'success' => false,
        'message' => 'Validasi gagal',
        'errors' => [
            'cif_number' => 'Nomor CIF ' . $validated['cif_number'] . ' sudah terdaftar dengan nama "' . $existingGuarantee->guarantee_name . '". Atas Nama Jaminan harus sama.',
            'guarantee_name' => 'Atas Nama Jaminan harus "' . $existingGuarantee->guarantee_name . '" untuk Nomor CIF ini.'
        ]
    ], Response::HTTP_UNPROCESSABLE_ENTITY);
}
```

**Fungsi**: Sebelum menyimpan data baru, cek apakah CIF sudah ada. Jika ada, pastikan nama harus sama.

#### Method `update()` - Tambah Validasi (Baris 239-252)

```php
// Validasi tambahan: Cek apakah CIF sudah terdaftar dengan nama berbeda (untuk record lain)
$existingGuarantee = Guarantee::where('cif_number', $validated['cif_number'])
    ->where('id', '!=', $id)
    ->first();
if ($existingGuarantee && strtolower(trim($existingGuarantee->guarantee_name)) !== strtolower(trim($validated['guarantee_name']))) {
    // ... error response
}
```

**Fungsi**: Saat update, cek record LAIN (bukan yang sedang diupdate). Jika ada CIF sama tapi nama beda, tolak.

---

### 2. Frontend - GuaranteeInputForm.tsx

#### Update Label No CIF (Baris 295)

**Sebelum**:
```tsx
No CIF * (Boleh sama dengan jaminan lain)
```

**Sesudah**:
```tsx
No CIF * (Harus sama jika CIF sudah terdaftar)
```

#### Update Label Atas Nama Jaminan (Baris 365)

**Sebelum**:
```tsx
Atas Nama Jaminan *
```

**Sesudah**:
```tsx
Atas Nama Jaminan * (Harus sama jika CIF sudah terdaftar)
```

**Tujuan**: Memberikan panduan yang jelas kepada user tentang aturan input.

---

## 🧪 Contoh Skenario Penggunaan

### ✅ VALID - Data yang Diizinkan

```
Input 1:
  CIF: 900
  Nama: Budi Santoso
  SPK: SPK120
  No Jaminan: 0010103
  Status: ✅ SAVED

Input 2:
  CIF: 900
  Nama: Budi Santoso  ← SAMA dengan Input 1
  SPK: SPK121
  No Jaminan: 0010104
  Status: ✅ SAVED

Input 3:
  CIF: 900
  Nama: Budi Santoso  ← SAMA dengan Input 1
  SPK: SPK122
  No Jaminan: 0010105
  Status: ✅ SAVED
```

### ❌ INVALID - Data yang Ditolak

```
Input 1:
  CIF: 900
  Nama: Budi Santoso
  Status: ✅ SAVED

Input 2:
  CIF: 900
  Nama: Andi Wijaya  ← BERBEDA dengan Input 1
  Status: ❌ REJECTED
  Error: "Nomor CIF 900 sudah terdaftar dengan nama 'Budi Santoso'.
           Atas Nama Jaminan harus sama."
```

---

## 📌 Aturan Validasi

| Kondisi | Hasil | Alasan |
|---------|-------|--------|
| CIF baru + Nama apapun | ✅ OK | Tidak ada konflik |
| CIF ada + Nama SAMA | ✅ OK | Data konsisten |
| CIF ada + Nama BEDA | ❌ TOLAK | Data ambigu/error |
| Multiple SPK, same CIF & name | ✅ OK | SPK bisa banyak |

---

## 🔍 Penjelasan Teknis

### Fungsi Validasi

1. **Pencarian Data Existing**:
   - Query: `Guarantee::where('cif_number', $validated['cif_number'])->first()`
   - Mencari record dengan CIF yang sama

2. **Perbandingan Case-Insensitive**:
   - `strtolower(trim($existingGuarantee->guarantee_name))`
   - `strtolower(trim($validated['guarantee_name']))`
   - Menghindari error karena perbedaan huruf besar/kecil

3. **Exclude Current Record (Update)**:
   - `->where('id', '!=', $id)`
   - Saat update, jangan bandingkan dengan record yang sedang diupdate

4. **Error Response**:
   - Return HTTP 422 (Unprocessable Entity)
   - Memberikan pesan error pada 2 field (cif_number + guarantee_name)

---

## 💡 User Experience

### Saat User Input yang SALAH

**Tampilan Error di Frontend**:
```
❌ Nomor CIF 900 sudah terdaftar dengan nama "Budi Santoso".
   Atas Nama Jaminan harus sama.

❌ Atas Nama Jaminan harus "Budi Santoso" untuk Nomor CIF ini.
```

### Pesan Membantu User

Label di form sekarang menampilkan:
- "No CIF * (Harus sama jika CIF sudah terdaftar)"
- "Atas Nama Jaminan * (Harus sama jika CIF sudah terdaftar)"

---

## 🚀 Pengujian

### Test Case 1: Input Jaminan Pertama
```
POST /api/guarantees
{
  "cif_number": "900",
  "guarantee_name": "Budi Santoso",
  "spk_number": "SPK120",
  ...
}
Response: 201 Created ✅
```

### Test Case 2: Input Dengan CIF Sama + Nama Sama
```
POST /api/guarantees
{
  "cif_number": "900",
  "guarantee_name": "Budi Santoso",
  "spk_number": "SPK121",
  ...
}
Response: 201 Created ✅
```

### Test Case 3: Input Dengan CIF Sama + Nama Berbeda
```
POST /api/guarantees
{
  "cif_number": "900",
  "guarantee_name": "Andi Wijaya",  ← BERBEDA
  "spk_number": "SPK122",
  ...
}
Response: 422 Unprocessable Entity ❌
{
  "success": false,
  "errors": {
    "cif_number": "Nomor CIF 900 sudah terdaftar dengan nama 'Budi Santoso'. ...",
    "guarantee_name": "Atas Nama Jaminan harus 'Budi Santoso' untuk Nomor CIF ini."
  }
}
```

---

## 📊 Impact & Benefits

| Aspek | Sebelum | Sesudah |
|-------|---------|---------|
| **Data Integrity** | ❌ Bisa ambigu | ✅ Konsisten |
| **User Guidance** | ❌ Bingung | ✅ Jelas |
| **Error Prevention** | ❌ Bisa terjadi | ✅ Dicegah |
| **Database Reliability** | ⚠️ Perlu hati-hati | ✅ Terjamin |

---

## 📚 File yang Dimodifikasi

1. **[GuaranteeController.php](file:///c:\laragon\www\asset_management_sistem_V2\app\Http\Controllers\Api_jaminan\GuaranteeController.php)**
   - Method `store()` - Baris 119-130
   - Method `update()` - Baris 239-252

2. **[GuaranteeInputForm.tsx](file:///c:\laragon\www\asset_management_sistem_V2\frontend\components\GuaranteeInputForm.tsx)**
   - Label No CIF - Baris 295
   - Label Atas Nama Jaminan - Baris 365

---

## ✅ Checklist Implementasi

- ✅ Tambah validasi di method `store()`
- ✅ Tambah validasi di method `update()`
- ✅ Update label No CIF di frontend
- ✅ Update label Atas Nama Jaminan di frontend
- ✅ Implementasi menggunakan case-insensitive comparison
- ✅ Error message yang user-friendly
- ✅ Dokumentasi lengkap

---

## 🎓 Kesimpulan

Validasi ini memastikan data jaminan tetap konsisten dan mencegah user membuat kesalahan input. Dengan pesan error yang jelas, user dapat dengan mudah memahami aturan yang berlaku.

**Status**: Siap untuk Production ✅
