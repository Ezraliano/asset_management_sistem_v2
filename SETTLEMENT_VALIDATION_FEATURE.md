# Fitur Validasi Proses Pelunasan Jaminan

## Deskripsi Fitur

Fitur ini memungkinkan admin atau supervisor untuk memvalidasi (menyetujui atau menolak) proses pelunasan jaminan aset yang telah diajukan oleh pengguna. Dengan fitur ini:

1. **Pelunasan bersifat Pending**: Ketika pelunasan jaminan diajukan, statusnya menjadi "Menunggu Persetujuan" (pending) bukan langsung "Lunas" (approved)
2. **Validasi Approval**: Admin dapat menyetujui pelunasan dengan memasukkan nama validator dan catatan opsional
3. **Validasi Rejection**: Admin dapat menolak pelunasan dengan memberikan alasan penolakan
4. **Status Update Otomatis**:
   - Jika disetujui → Status jaminan berubah menjadi "Lunas", status loan menjadi "returned"
   - Jika ditolak → Status tetap "pending" dan dapat diajukan ulang

## Alur Proses

### 1. Proses Pengajuan Pelunasan (User)
```
User → Buat Pelunasan → Status: "Pending" (Menunggu Persetujuan)
```

### 2. Proses Validasi (Admin/Supervisor)
```
Admin → Lihat Settlement Pending → Klik "Validasi" →
  Pilih: Setujui atau Tolak →
    Setujui: Masukkan nama validator + catatan (opsional)
    Tolak: Masukkan alasan penolakan
  → Status berubah menjadi "Approved" atau "Rejected"
```

## Struktur File

### Backend (Laravel/PHP)
1. **Model**: [GuaranteeSettlement.php](app/Models_jaminan/GuaranteeSettlement.php)
   - Field: `settlement_status` (pending/approved/rejected)
   - Field: `settled_by` (nama validator)
   - Field: `settlement_remarks` (catatan/alasan)

2. **Controller**: [GuaranteeSettlementController.php](app/Http/Controllers/Api_jaminan/GuaranteeSettlementController.php)
   - `store()` - Create settlement dengan status "pending"
   - `approve()` - Approve settlement (PUT /api/guarantee-settlements/{id}/approve)
   - `reject()` - Reject settlement (PUT /api/guarantee-settlements/{id}/reject)

3. **Routes**: Automatic API routes via Laravel routing

### Frontend (React/TypeScript)
1. **Komponen**:
   - [SettlementValidation.tsx](frontend/components/SettlementValidation.tsx) - Modal validasi
   - [GuaranteeDetail.tsx](frontend/components/GuaranteeDetail.tsx) - Integrasi modal

2. **Service**:
   - API calls menggunakan endpoint `/api/guarantee-settlements/{id}/approve` dan `/api/guarantee-settlements/{id}/reject`

## Database Schema

Field yang relevan di tabel `guarantee_settlements`:
```
settlement_status: enum('pending', 'approved', 'rejected') - default 'pending'
settled_by: string nullable - nama yang menyetujui
settlement_remarks: text nullable - catatan atau alasan
```

## Cara Menggunakan

### Untuk User (Pengajuan Pelunasan)

1. Buka detail jaminan yang sedang dipinjam
2. Klik tab "Pelunasan"
3. Isi form pelunasan dengan data yang tepat
4. Klik "Simpan Pelunasan"
5. **Pelunasan disimpan dengan status "Menunggu Persetujuan"**
6. Tunggu admin memvalidasi pelunasan

### Untuk Admin (Validasi Pelunasan)

1. Buka detail jaminan
2. Lihat tab "Riwayat Pelunasan"
3. Cari pelunasan dengan status "Menunggu Persetujuan"
4. Klik tombol **"Validasi"** di sebelah kanan entri pelunasan
5. Modal validasi akan terbuka

#### Untuk Menyetujui Pelunasan:
1. Pilih radio button "Setujui Pelunasan"
2. Masukkan **Nama Validator** (required)
3. Masukkan **Catatan** (optional) - contoh: "Jaminan diterima dalam kondisi baik"
4. Klik tombol "Setujui Pelunasan"
5. **Hasil**:
   - Status Settlement → "Disetujui"
   - Status Jaminan → "Lunas"
   - Status Loan → "returned"
   - Tidak dapat dikembalikan ke status dipinjam

#### Untuk Menolak Pelunasan:
1. Pilih radio button "Tolak Pelunasan"
2. Masukkan **Alasan Penolakan** (required) - contoh: "Jaminan masih dalam proses perbaikan"
3. Klik tombol "Tolak Pelunasan"
4. **Hasil**:
   - Status Settlement → "Ditolak"
   - Status Jaminan → Tetap "Dipinjam"
   - User dapat mengajukan ulang pelunasan

## API Endpoints

### 1. Create Settlement (User)
```http
POST /api/guarantee-settlements
Content-Type: application/json
Authorization: Bearer {token}

{
  "guarantee_id": 1,
  "loan_id": 1,
  "spk_number": "SPK-001",
  "cif_number": "CIF-001",
  "guarantee_name": "Jaminan A",
  "guarantee_type": "BPKB",
  "borrower_name": "John Doe",
  "borrower_contact": "081234567890",
  "loan_date": "2024-11-01",
  "expected_return_date": "2024-11-30",
  "settlement_date": "2024-11-28",
  "settlement_notes": "Jaminan dikembalikan"
}

Response: HTTP 201 Created
{
  "success": true,
  "message": "Pelunasan jaminan berhasil disimpan, menunggu persetujuan",
  "data": {
    "id": 1,
    "settlement_status": "pending",
    ...
  }
}
```

### 2. Approve Settlement (Admin)
```http
PUT /api/guarantee-settlements/{id}/approve
Content-Type: application/json
Authorization: Bearer {token}

{
  "settled_by": "Admin Name",
  "settlement_remarks": "Approved - Jaminan diterima dalam kondisi baik"
}

Response: HTTP 200 OK
{
  "success": true,
  "message": "Pelunasan jaminan berhasil disetujui",
  "data": {
    "settlement_status": "approved",
    "settled_by": "Admin Name",
    "settlement_remarks": "..."
  }
}
```

### 3. Reject Settlement (Admin)
```http
PUT /api/guarantee-settlements/{id}/reject
Content-Type: application/json
Authorization: Bearer {token}

{
  "settlement_remarks": "Rejected - Jaminan masih dalam proses perbaikan"
}

Response: HTTP 200 OK
{
  "success": true,
  "message": "Pelunasan jaminan berhasil ditolak",
  "data": {
    "settlement_status": "rejected",
    "settlement_remarks": "..."
  }
}
```

## Status Transitions

```
Settlement Lifecycle:

1. CREATE (User) → PENDING ────┐
                               │
                        (Admin validates)
                               │
                ┌──────────────┼──────────────┐
                │                            │
             APPROVE                      REJECT
                │                            │
         (Status: Approved)           (Status: Rejected)
      Jaminan → Lunas              Jaminan → tetap Dipinjam
      Loan → returned              dapat diajukan ulang
                │                            │
         (Final Status)            (dapat dibuat baru)
```

## Tampilan UI

### Di GuaranteeDetail - Settlement History Tab

Setiap entry settlement menampilkan:
- Nama Peminjam
- Status Pelunasan (dengan badge warna)
  - Kuning: "Menunggu Persetujuan" (Pending)
  - Hijau: "Disetujui" (Approved)
  - Merah: "Ditolak" (Rejected)
- Nama Jaminan
- Tanggal Peminjaman & Pelunasan
- Catatan Pelunasan (jika ada)
- Keterangan Validasi (jika ada)
- **Tombol "Validasi"** (hanya muncul untuk status pending)

### Modal Validasi

Menampilkan:
1. **Info Pelunasan** (read-only)
   - SPK Number, CIF, Nama Jaminan, Tipe Jaminan
   - Nama & Kontak Peminjam
   - Tanggal Peminjaman & Pelunasan
   - Catatan Pelunasan

2. **Section Approve** (dengan radio button)
   - Field: Nama Validator (required)
   - Field: Catatan (optional)
   - Button: "Setujui Pelunasan"

3. **Section Reject** (dengan radio button)
   - Field: Alasan Penolakan (required)
   - Button: "Tolak Pelunasan"

4. **Button Batal** untuk menutup modal

## Keamanan & Validasi

### Backend
- Token authentication required
- Settlement harus exist dan status pending untuk approve/reject
- Cannot approve/reject sudah approved settlements
- Input validation untuk nama validator dan remarks

### Frontend
- Confirm form validation
- Loading state untuk prevent double submission
- Error handling & user-friendly messages
- Success messages dengan auto-close

## Testing Checklist

- [ ] Create settlement → status pending
- [ ] View pending settlements dalam history
- [ ] Approve settlement dengan nama validator
  - [ ] Status berubah menjadi approved
  - [ ] Jaminan status berubah menjadi lunas
  - [ ] Loan status berubah menjadi returned
  - [ ] Tidak bisa approve lagi
- [ ] Reject settlement dengan alasan
  - [ ] Status berubah menjadi rejected
  - [ ] Jaminan status tetap dipinjam
  - [ ] Bisa buat settlement baru
- [ ] Modal validation close & save behavior
- [ ] Error handling (network error, validation error)
- [ ] Settlement history refresh after validation

## Future Enhancements

1. **Audit Log** - Track siapa yang approve/reject dan kapan
2. **Notification** - Notifikasi ke user ketika settlement di-approve/reject
3. **Bulk Approval** - Approve multiple settlements sekaligus
4. **Approval Workflow** - Multi-level approval (supervisor → manager)
5. **Settlement Queue** - Dashboard untuk pending settlements yang perlu divalidasi
6. **Reason Templates** - Template alasan reject yang sering digunakan
7. **Settlement Slip** - Generate slip/dokumen untuk approval

## Troubleshooting

### Settlement tidak berubah status setelah approve
- Pastikan network request sukses (check network tab di dev tools)
- Verify token authentication
- Refresh halaman untuk melihat perubahan terbaru

### Button Validasi tidak muncul
- Pastikan settlement status = "pending"
- Cek console untuk error messages
- Pastikan data settlement terupdate

### Cannot approve/reject settlement
- Pastikan Anda sudah login
- Verify token belum expired
- Check settlement status di backend

## Support

Untuk pertanyaan atau bug report, silakan hubungi tim development atau buat issue di repository.
