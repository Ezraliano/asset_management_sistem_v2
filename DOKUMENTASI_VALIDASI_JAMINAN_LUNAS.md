# Dokumentasi: Pencegahan Peminjaman Jaminan Berstatus Lunas

## Ringkasan
Implementasi fitur untuk mencegah proses peminjaman jaminan yang sudah berstatus "Lunas". Jaminan dengan status lunas tidak dapat dipinjamkan karena dianggap sudah keluar/dikembalikan dari sistem.

---

## Masalah
Sebelumnya, sistem memungkinkan user untuk melakukan peminjaman jaminan yang sudah berstatus "Lunas", padahal jaminan dengan status tersebut seharusnya tidak dapat dipinjamkan lagi karena sudah keluar dari sistem.

---

## Solusi yang Diterapkan

### 1. **Validasi Backend (Server-Side)**
**File:** `app/Http/Controllers/Api_jaminan/GuaranteeLoanController.php`

#### Perubahan pada Method `store()` (Line 101-123):
```php
// Validasi: Cek apakah jaminan sudah berstatus 'lunas'
$guarantee = Guarantee::find($validated['guarantee_id']);
if (!$guarantee) {
    return response()->json([
        'success' => false,
        'message' => 'Jaminan tidak ditemukan'
    ], Response::HTTP_NOT_FOUND);
}

// REJECT: Jaminan dengan status LUNAS
if ($guarantee->status === 'lunas') {
    return response()->json([
        'success' => false,
        'message' => 'Jaminan dengan status "Lunas" tidak dapat dipinjamkan. Jaminan sudah keluar/dikembalikan.'
    ], Response::HTTP_BAD_REQUEST);
}

// REJECT: Jaminan yang sedang DIPINJAM
if ($guarantee->status === 'dipinjam') {
    return response()->json([
        'success' => false,
        'message' => 'Jaminan sedang dipinjam. Kembalikan terlebih dahulu sebelum melakukan peminjaman baru.'
    ], Response::HTTP_BAD_REQUEST);
}
```

**Fungsi:**
- Mengecek status jaminan sebelum membuat record peminjaman baru
- Menolak (reject) dengan HTTP status `400 Bad Request` jika:
  - Status jaminan adalah `lunas` → Jaminan sudah keluar, tidak bisa dipinjam
  - Status jaminan adalah `dipinjam` → Jaminan sedang dipinjam, harus dikembalikan dulu
- Hanya mengizinkan peminjaman jika status jaminan adalah `available` (tersedia)

---

### 2. **Validasi Frontend (Client-Side)**
**File:** `frontend/components/GuaranteeLoaning.tsx`

#### A. Deteksi Status Jaminan (Line 15-17):
```typescript
// Cek apakah jaminan sudah berstatus lunas
const isGuaranteeSettled = guarantee.status === 'lunas';
const isGuaranteeBorrowed = guarantee.status === 'dipinjam';
```

#### B. Tampilkan Alert Warning (Line 131-149):
```typescript
{/* Alert - Jaminan sudah lunas */}
{isGuaranteeSettled && (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
    <p className="text-red-700 font-semibold mb-2">⚠️ Jaminan Tidak Dapat Dipinjamkan</p>
    <p className="text-red-600 text-sm">
      Jaminan ini sudah berstatus "Lunas" dan telah keluar dari sistem.
      Jaminan yang sudah lunas tidak dapat dipinjamkan kembali.
    </p>
  </div>
)}

{/* Alert - Jaminan sedang dipinjam */}
{isGuaranteeBorrowed && (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
    <p className="text-yellow-700 font-semibold mb-2">⚠️ Jaminan Sedang Dipinjam</p>
    <p className="text-yellow-600 text-sm">
      Jaminan ini sedang dipinjam. Harap mengembalikan jaminan terlebih dahulu
      sebelum melakukan peminjaman baru.
    </p>
  </div>
)}
```

#### C. Disable Submit Button (Line 302-304):
```typescript
<button
  type="submit"
  disabled={loading || isGuaranteeSettled || isGuaranteeBorrowed}
  className="flex-1 bg-primary text-white px-6 py-2 rounded-lg ..."
  title={isGuaranteeSettled ? 'Jaminan sudah lunas, tidak dapat dipinjamkan' : ...}
>
  {loading ? 'Menyimpan...' : 'Simpan Peminjaman'}
</button>
```

**Fungsi:**
- Menampilkan alert merah jika jaminan sudah lunas (UX feedback)
- Menampilkan alert kuning jika jaminan sedang dipinjam
- Disable tombol "Simpan Peminjaman" untuk mencegah pengiriman form
- Tampilkan tooltip saat hover di tombol yang disabled

---

## Alur Kerja

### Skenario 1: Jaminan Status "LUNAS"
```
User klik "Pinjam" pada jaminan dengan status Lunas
        ↓
Frontend tampilkan alert merah: "Jaminan Tidak Dapat Dipinjamkan"
        ↓
Button "Simpan Peminjaman" disabled (tidak bisa diklik)
        ↓
User tidak bisa melanjutkan proses peminjaman
```

### Skenario 2: Jaminan Status "DIPINJAM"
```
User klik "Pinjam" pada jaminan dengan status Dipinjam
        ↓
Frontend tampilkan alert kuning: "Jaminan Sedang Dipinjam"
        ↓
Button "Simpan Peminjaman" disabled (tidak bisa diklik)
        ↓
User diminta untuk mengembalikan jaminan terlebih dahulu
```

### Skenario 3: Jaminan Status "AVAILABLE" (Normal)
```
User klik "Pinjam" pada jaminan dengan status Available
        ↓
Tidak ada alert warning
        ↓
Button "Simpan Peminjaman" aktif (bisa diklik)
        ↓
User bisa mengisi form dan melakukan peminjaman
        ↓
Backend menerima request dan membuat record baru
        ↓
Status jaminan berubah menjadi "DIPINJAM"
```

---

## Status Jaminan dalam Sistem

| Status | Makna | Bisa Dipinjam? |
|--------|-------|---|
| `available` | Jaminan tersedia/siap dipinjam | ✅ Ya |
| `dipinjam` | Jaminan sedang dipinjam | ❌ Tidak |
| `lunas` | Jaminan sudah lunas/keluar | ❌ Tidak |

---

## Testing Checklist

- [ ] Buka form peminjaman untuk jaminan status "Lunas"
- [ ] Verifikasi alert merah "Jaminan Tidak Dapat Dipinjamkan" muncul
- [ ] Verifikasi button "Simpan Peminjaman" disable/tidak aktif
- [ ] Buka form peminjaman untuk jaminan status "Dipinjam"
- [ ] Verifikasi alert kuning "Jaminan Sedang Dipinjam" muncul
- [ ] Verifikasi button "Simpan Peminjaman" disable/tidak aktif
- [ ] Buka form peminjaman untuk jaminan status "Available"
- [ ] Verifikasi tidak ada alert warning
- [ ] Verifikasi button "Simpan Peminjaman" aktif
- [ ] Isi form dan submit, verifikasi berhasil
- [ ] Ubah status jaminan ke "Lunas" dan refresh halaman
- [ ] Buka form peminjaman, verifikasi alert dan button disable

---

## File yang Diubah

1. **Backend:**
   - `app/Http/Controllers/Api_jaminan/GuaranteeLoanController.php` → Menambah validasi di method `store()`

2. **Frontend:**
   - `frontend/components/GuaranteeLoaning.tsx` → Menambah validasi UI dan disable button

---

## Keamanan

✅ **Double Layer Validation:**
- Frontend: Mencegah user mensubmit form (UX layer)
- Backend: Menolak request jika status jaminan tidak valid (Security layer)

✅ **Backend sebagai Single Source of Truth:**
- Validasi backend tidak bisa di-bypass oleh frontend manipulation
- API akan selalu menolak request invalid meskipun frontend disable/delete

---

## Error Message yang Ditampilkan

### Jaminan Lunas (Backend Response):
```
"Jaminan dengan status "Lunas" tidak dapat dipinjamkan.
Jaminan sudah keluar/dikembalikan."
```

### Jaminan Sedang Dipinjam (Backend Response):
```
"Jaminan sedang dipinjam. Kembalikan terlebih dahulu
sebelum melakukan peminjaman baru."
```

---

## Kesimpulan

Implementasi ini memastikan bahwa:
1. ✅ Jaminan yang sudah **lunas** tidak dapat dipinjamkan kembali
2. ✅ Jaminan yang **sedang dipinjam** tidak dapat dipinjam lagi sampai dikembalikan
3. ✅ User mendapat feedback yang jelas melalui alert di UI
4. ✅ Backend memberikan validasi tambahan untuk keamanan data
5. ✅ Sistem tetap konsisten dan data integrity terjaga
