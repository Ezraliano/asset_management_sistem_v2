# Dokumentasi Update Fitur Jaminan Asset Management V2

## Overview
Dokumentasi ini menjelaskan tiga fitur utama yang telah diimplementasikan untuk meningkatkan sistem manajemen jaminan pada aplikasi Asset Management V2.

---

## 1. Validasi Unique Guarantee Number

### Deskripsi
Fitur ini mencegah pengguna dari menginput nomor jaminan yang sama dua kali dalam database. Setiap nomor jaminan harus unik untuk menghindari konflik data.

### Implementasi

#### Backend (Laravel)
**File:** `app/Http/Controllers/Api_jaminan/GuaranteeController.php`

- **Method `store()` (line 92)**
  - Menambahkan validasi `unique:mysql_jaminan.guarantees,guarantee_number`
  - Memastikan nomor jaminan baru tidak ada yang duplikat

- **Method `update()` (line 178)**
  - Menambahkan validasi `unique:mysql_jaminan.guarantees,guarantee_number,' . $id`
  - Memungkinkan nomor jaminan yang sama saat edit (tidak mengubah nomor), tetapi tetap mencegah duplikat dengan data lain

### Behavior
1. Ketika user mencoba menginput nomor jaminan yang sudah ada:
   - API akan mengembalikan error validation dengan pesan: "The guarantee number field must be unique"
   - Frontend menampilkan error message di form input

2. Database constraint:
   - Kolom `guarantee_number` pada tabel `guarantees` memiliki unique constraint
   - Operasi INSERT/UPDATE akan gagal jika nomor duplikat

### Testing
```bash
# Test: Coba input nomor jaminan yang sudah ada
POST /api/guarantees
{
  "spk_number": "SPK001",
  "cif_number": "CIF001",
  "spk_name": "PT Company",
  "guarantee_name": "Asset Name",
  "guarantee_type": "BPKB",
  "guarantee_number": "123456",  // Nomor yang sudah ada
  "file_location": "Path",
  "input_date": "2025-11-26",
  "status": "available"
}
# Response: 422 Unprocessable Entity dengan error validation
```

---

## 2. Fitur Sorting Ascending/Descending

### Deskripsi
Fitur ini memungkinkan pengguna mengurutkan daftar jaminan berdasarkan berbagai kriteria (No SPK, No CIF, Tanggal Input, Status, Tipe Jaminan) dengan urutan ascending (↑ dari kecil ke besar) atau descending (↓ dari besar ke kecil).

**Default:** Daftar jaminan ditampilkan secara ascending (↑) berdasarkan No SPK.

### Implementasi

#### Backend (Laravel)
**File:** `app/Http/Controllers/Api_jaminan/GuaranteeController.php`

- **Method `index()` (line 47-50)**
  ```php
  // Sorting - Default sorting by spk_number in ascending order
  $sortBy = $request->get('sort_by', 'spk_number');
  $sortOrder = $request->get('sort_order', 'asc');
  $query->orderBy($sortBy, $sortOrder);
  ```

  - Default: `sort_by` = 'spk_number'
  - Default: `sort_order` = 'asc'
  - Mendukung sorting by: `spk_number`, `cif_number`, `input_date`, `status`, `guarantee_type`

#### Frontend (React/TypeScript)
**File:** `frontend/components/GuaranteeList.tsx`

- **State Management (line 26-27)**
  ```typescript
  const [sortBy, setSortBy] = useState('spk_number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  ```

- **UI Components (line 248-272)**
  - Dropdown select untuk memilih kolom yang di-sort
  - Toggle button untuk switch antara Ascending (↑) dan Descending (↓)
  - Integrasi dengan fetch data untuk real-time update

- **API Parameters**
  ```typescript
  getGuarantees({
    per_page: 50,
    sort_by: sortBy,       // 'spk_number', 'cif_number', etc.
    sort_order: sortOrder  // 'asc' atau 'desc'
  })
  ```

### Opsi Sorting
1. **No SPK** (default) - Mengurutkan berdasarkan nomor SPK
2. **No CIF** - Mengurutkan berdasarkan nomor CIF
3. **Tgl Input** - Mengurutkan berdasarkan tanggal input jaminan
4. **Status** - Mengurutkan berdasarkan status (available, dipinjam, lunas)
5. **Tipe** - Mengurutkan berdasarkan tipe jaminan (BPKB, SHM, SHGB, E-SHM)

### User Interface
- **Sorting Control** terletak di sebelah kanan search filters
- **Dropdown:** Pilih kolom yang ingin di-sort
- **Button:** Toggle antara Ascending (↑ Asc) dan Descending (↓ Desc)
- Sorting berlaku instant ketika user mengubah pilihan

### API Endpoint
```
GET /api/guarantees?sort_by=spk_number&sort_order=asc&per_page=50

Query Parameters:
- sort_by: string (spk_number, cif_number, input_date, status, guarantee_type)
- sort_order: string ('asc' atau 'desc')
- per_page: integer (default: 15)
```

---

## 3. Real-Time Status Update untuk Peminjaman & Pelunasan

### Deskripsi
Fitur ini memastikan bahwa ketika pengguna melakukan operasi peminjaman (loan) atau pelunasan (settlement) jaminan, status jaminan di daftar jaminan **akan secara otomatis terupdate tanpa perlu manual refresh halaman**.

### Implementasi

#### Backend (Laravel)
**File:** `app/Http/Controllers/Api_jaminan/GuaranteeLoanController.php` dan `GuaranteeSettlementController.php`

- **Peminjaman (Loan)**
  - Line 126-131: Ketika jaminan dipinjam, status guarantee diubah menjadi 'dipinjam'
  ```php
  $loan = GuaranteeLoan::create($validated);
  if ($guarantee) {
    $guarantee->update(['status' => 'dipinjam']);
  }
  ```

- **Pengembalian (Return)**
  - Line 398-402: Ketika jaminan dikembalikan, status guarantee diubah kembali menjadi 'available'
  ```php
  $guarantee = Guarantee::find($loan->guarantee_id);
  if ($guarantee) {
    $guarantee->update(['status' => 'available']);
  }
  ```

- **Pelunasan (Settlement)**
  - Line 380-382: Ketika settlement disetujui, status guarantee diubah menjadi 'lunas'
  ```php
  $guarantee = Guarantee::find($settlement->guarantee_id);
  if ($guarantee) {
    $guarantee->update(['status' => 'lunas']);
  }
  ```

#### Frontend (React/TypeScript)
**File:** `frontend/components/GuaranteeList.tsx` dan `GuaranteeDetail.tsx`

1. **Refresh Otomatis saat Kembali dari Detail View**
   - Line 171-190: Ketika user klik "Kembali", list secara otomatis di-refresh
   ```typescript
   navigateTo={() => {
     setViewingGuaranteeId(null);
     // Refresh list when returning from detail view
     const refreshList = async () => {
       const response = await getGuarantees({
         per_page: 50,
         sort_by: sortBy,
         sort_order: sortOrder
       });
       if (response?.guarantees && Array.isArray(response.guarantees)) {
         setAllGuarantees(response.guarantees);
         setGuarantees(response.guarantees);
       }
     };
     refreshList();
   }}
   ```

2. **Refresh di Detail View**
   - `GuaranteeDetail.tsx` (line 136-162): Setelah aksi loan/settlement/return berhasil, data guarantee direfresh
   ```typescript
   const handleLoanSuccess = async () => {
     setLoanModalOpen(false);
     setSuccessMessage('Peminjaman jaminan berhasil disimpan');
     setTimeout(() => {
       setSuccessMessage('');
       fetchGuaranteeDetail();  // ← Refresh data
     }, 1000);
   };
   ```

### Flow Lengkap
1. **User membuka detail jaminan** → Lihat status current
2. **User mengisi form peminjaman** → Klik "Simpan Peminjaman"
3. **Backend proses** → Update status guarantee menjadi 'dipinjam'
4. **Frontend ditampilkan success message** → Setelah 1 detik, fetch ulang data detail
5. **User klik "Kembali ke Daftar Jaminan"** → List otomatis di-refresh dengan data terbaru
6. **Status di tabel list akan menunjukkan status terbaru** tanpa perlu F5/refresh manual

### Status Transitions
```
available
  ├─→ (Pinjam) → dipinjam
  │           ├─→ (Kembalikan) → available
  │           └─→ (Lunas) → lunas
  │
  └─→ (Lunas) → lunas
```

### Behavior Validasi
- **Jaminan status 'dipinjam'** tidak bisa dipinjam lagi sampai dikembalikan
- **Jaminan status 'lunas'** tidak bisa dipinjam atau dilunasi lagi
- **Jaminan status 'available'** bisa dipinjam atau dilunasi

---

## Integrasi & Dependencies

### Database Connection
- Semua operasi jaminan menggunakan connection `mysql_jaminan`
- Model: `App\Models_jaminan\Guarantee`, `GuaranteeLoan`, `GuaranteeSettlement`

### API Services
- **File:** `frontend/services/api.ts`
- Functions:
  - `getGuarantees(params)` - Fetch daftar jaminan dengan support sort & filter
  - `getGuaranteeById(id)` - Fetch detail jaminan
  - `getGuaranteeLoansForGuarantee(id)` - Fetch history peminjaman
  - `getGuaranteeSettlementsForGuarantee(id)` - Fetch history pelunasan

### UI Components
- `GuaranteeList.tsx` - Tampilan daftar jaminan dengan sort controls
- `GuaranteeDetail.tsx` - Detail jaminan dengan form loan/settlement/return
- `GuaranteeLoaning.tsx` - Form peminjaman jaminan
- `GuaranteeSettlement.tsx` - Form pelunasan jaminan
- `GuaranteeReturn.tsx` - Form pengembalian jaminan

---

## Testing Checklist

### Test 1: Unique Guarantee Number Validation
- [ ] Coba input jaminan dengan nomor yang sudah ada → Harus error
- [ ] Edit jaminan dengan nomor berbeda dari yang ada → Harus success
- [ ] Edit jaminan dengan nomor yang sama (tidak berubah) → Harus success

### Test 2: Sorting Functionality
- [ ] Default list tampil sorted by No SPK ascending → ✓
- [ ] Switch sort ke No CIF descending → List terupdate
- [ ] Switch sort ke Tgl Input ascending → List terupdate
- [ ] Verify semua sort options work: No SPK, No CIF, Tgl Input, Status, Tipe

### Test 3: Real-Time Status Update
- [ ] Buka detail jaminan → Lihat status current (misal: 'available')
- [ ] Lakukan peminjaman → Status harus berubah menjadi 'dipinjam'
- [ ] Klik "Kembali" → Cek list, status harus menunjukkan 'dipinjam'
- [ ] Lakukan pengembalian → Status harus berubah menjadi 'available'
- [ ] Lakukan pelunasan → Status harus berubah menjadi 'lunas'
- [ ] **Verifikasi:** Tidak perlu F5/refresh manual → Status update otomatis

---

## Notes & Best Practices

1. **Sorting Performance**
   - Default limit 50 items per page untuk performa optimal
   - Bisa disesuaikan via `per_page` parameter

2. **Data Consistency**
   - Status jaminan selalu diupdate di backend, bukan di frontend
   - Frontend hanya menampilkan dan merefresh data dari backend

3. **Error Handling**
   - Semua operasi memiliki error handling yang proper
   - User akan melihat pesan error yang jelas jika ada masalah

4. **UX Improvements**
   - Sort buttons terletak di area yang mudah diakses
   - Sorting instant tanpa delay
   - Status update otomatis meningkatkan user experience
   - Pesan success/error clear dan informatif

---

## Revision History
- **Version 1.0** (2025-11-26)
  - Initial implementation of 3 features
  - Unique guarantee number validation
  - Sorting ascending/descending by multiple fields
  - Real-time status update untuk loan & settlement operations

---

**Developed for:** Asset Management System V2
**Last Updated:** 2025-11-26
