# Fitur Selesaikan Perbaikan Aset

## Overview
Fitur ini memungkinkan admin (Super Admin, Admin Holding, Admin Unit) untuk menyelesaikan perbaikan aset yang sudah disetujui dan sedang dalam proses perbaikan.

## Alur Lengkap Perbaikan Aset

```
┌─────────────────────────────────────────────────────────────────────┐
│                   ALUR LENGKAP PERBAIKAN ASET                       │
└─────────────────────────────────────────────────────────────────────┘

1. INPUT LAPORAN PERBAIKAN
   ├─ Admin mengisi form perbaikan aset
   ├─ Status Maintenance: PENDING
   ├─ Validation Status: PENDING
   └─ Status Aset: Tidak berubah

2. VALIDASI PERBAIKAN (Approve/Reject)
   │
   ├─ Jika APPROVED:
   │  ├─ Validation Status: APPROVED
   │  ├─ Status Maintenance: IN_PROGRESS
   │  ├─ Status Aset: Dalam Perbaikan / Dalam Pemeliharaan
   │  └─ ✅ Tombol "Selesaikan Perbaikan" muncul
   │
   └─ Jika REJECTED:
      ├─ Validation Status: REJECTED
      ├─ Status Maintenance: CANCELLED
      └─ Status Aset: Tidak berubah

3. PENYELESAIAN PERBAIKAN ⭐ (FITUR BARU)
   ├─ Admin klik tombol "Selesaikan Perbaikan"
   ├─ Konfirmasi penyelesaian
   ├─ Status Maintenance: COMPLETED
   ├─ Status Aset: Available
   ├─ Tercatat: completed_by, completion_date
   └─ Riwayat lengkap tersimpan
```

## Fitur yang Ditambahkan

### 1. **Tombol "Selesaikan Perbaikan"**
- Muncul di modal detail maintenance
- Hanya muncul jika:
  - User adalah Super Admin, Admin Holding, atau Admin Unit
  - Validation Status = APPROVED
  - Status Maintenance ≠ COMPLETED

### 2. **Konfirmasi Penyelesaian**
Sebelum menyelesaikan perbaikan, sistem menampilkan konfirmasi yang menjelaskan:
- Status maintenance akan berubah menjadi COMPLETED
- Status aset akan berubah menjadi Available
- Sistem akan mencatat user yang menyelesaikan dan tanggal penyelesaian

### 3. **Informasi Penyelesaian**
Setelah perbaikan diselesaikan, ditampilkan informasi:
- Nama user yang menyelesaikan
- Tanggal dan waktu penyelesaian
- Badge "Perbaikan Selesai"

## API Endpoint

### Selesaikan Perbaikan
```http
POST /api/maintenances/{id}/complete
```

**Headers:**
```
Authorization: Bearer {token}
```

**Response Success:**
```json
{
  "success": true,
  "message": "Perbaikan berhasil diselesaikan. Status aset telah diubah menjadi Available.",
  "data": {
    "id": 1,
    "status": "COMPLETED",
    "validation_status": "APPROVED",
    "completed_by": 1,
    "completion_date": "2025-10-16T14:00:00",
    "asset": {
      "id": 5,
      "status": "Available"
    },
    "completedBy": {
      "id": 1,
      "name": "Admin User"
    }
  }
}
```

**Response Error:**
```json
{
  "success": false,
  "message": "Perbaikan harus disetujui terlebih dahulu sebelum bisa diselesaikan"
}
```

## Validasi Backend

### Permission Check
```php
public function canCompleteMaintenance(Maintenance $maintenance): bool
{
    // Super Admin dan Admin Holding dapat complete semua maintenance
    if (in_array($this->role, ['Super Admin', 'Admin Holding'])) {
        return true;
    }

    // Admin Unit hanya dapat complete maintenance untuk aset di unit mereka
    if ($this->role === 'Admin Unit' && $this->unit_id &&
        $maintenance->asset && $maintenance->asset->unit_id === $this->unit_id) {
        return true;
    }

    return false;
}
```

### Business Logic Validation
1. ✅ Maintenance harus sudah APPROVED
2. ✅ Maintenance belum COMPLETED sebelumnya
3. ✅ User memiliki permission untuk complete
4. ✅ Transaction safety (database transaction)

## UI/UX Flow

### Step 1: Lihat Detail Maintenance
User membuka detail maintenance yang sudah disetujui (APPROVED).

### Step 2: Tombol "Selesaikan Perbaikan" Muncul
Jika perbaikan sudah selesai dilakukan secara fisik, user melihat:

```
┌─────────────────────────────────────────────────────────┐
│ 🔵 Perbaikan Sudah Selesai?                             │
│                                                          │
│ Jika perbaikan aset sudah selesai dilakukan, klik       │
│ tombol di bawah untuk menyelesaikan proses perbaikan.   │
│ Status aset akan otomatis berubah menjadi Available.    │
│                                                          │
│                    [Selesaikan Perbaikan]               │
└─────────────────────────────────────────────────────────┘
```

### Step 3: Konfirmasi
Setelah klik tombol, muncul konfirmasi:

```
┌─────────────────────────────────────────────────────────┐
│ Konfirmasi Penyelesaian Perbaikan                       │
│                                                          │
│ Dengan menyelesaikan perbaikan ini, sistem akan:        │
│ • Mengubah status maintenance menjadi COMPLETED         │
│ • Mengubah status aset menjadi Available                │
│ • Mencatat tanggal penyelesaian dan user yang           │
│   menyelesaikan                                         │
│                                                          │
│         [Batal]  [Konfirmasi Selesaikan Perbaikan]     │
└─────────────────────────────────────────────────────────┘
```

### Step 4: Success
Setelah berhasil:
```
✅ Alert: "Perbaikan berhasil diselesaikan. Status aset telah diubah menjadi Available."
```

Data di-refresh dan menampilkan informasi penyelesaian:

```
┌─────────────────────────────────────────────────────────┐
│ Informasi Penyelesaian                                  │
│                                                          │
│ Diselesaikan Oleh: Admin User                           │
│ Tanggal Penyelesaian: 16 Okt 2025, 14:00               │
│                                                          │
│ ✓ Perbaikan Selesai                                     │
└─────────────────────────────────────────────────────────┘
```

## Perubahan Database

### Tabel: maintenances

#### Field Tambahan:
- `completed_by`: Foreign key ke users (nullable)
- `completion_date`: Timestamp (nullable)

#### Status Values:
- `status`: PENDING, IN_PROGRESS, COMPLETED, CANCELLED
- `validation_status`: PENDING, APPROVED, REJECTED

## Frontend Changes

### 1. Types Update
**File:** `frontend/types.ts`
```typescript
export interface Maintenance {
  // ... existing fields
  completed_by?: number | null;
  completion_date?: string | null;
  completedBy?: User;
}

export enum MaintenanceStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}
```

### 2. Component Update
**File:** `frontend/components/MaintenanceValidationModal.tsx`

#### New State:
```typescript
const [showCompleteForm, setShowCompleteForm] = useState(false);
```

#### New Permission Check:
```typescript
const canComplete = ['Super Admin', 'Admin Holding', 'Admin Unit'].includes(currentUser.role) &&
                    maintenance.validation_status === 'APPROVED' &&
                    maintenance.status !== 'COMPLETED';
```

#### New Handler:
```typescript
const handleComplete = async () => {
  // Call API endpoint to complete maintenance
};
```

## Use Case Examples

### Skenario 1: Super Admin Menyelesaikan Perbaikan

1. **Kondisi Awal:**
   - Maintenance Status: IN_PROGRESS
   - Validation Status: APPROVED
   - Asset Status: Dalam Perbaikan

2. **Super Admin membuka detail maintenance**
   - Melihat tombol "Selesaikan Perbaikan"

3. **Klik tombol "Selesaikan Perbaikan"**
   - Muncul form konfirmasi

4. **Konfirmasi penyelesaian**
   ```bash
   POST /api/maintenances/1/complete
   ```

5. **Hasil:**
   - Maintenance Status: COMPLETED
   - Asset Status: Available
   - Tercatat: completed_by = 1, completion_date = "2025-10-16 14:00:00"

### Skenario 2: Admin Unit Menyelesaikan Perbaikan (Unit Sendiri)

1. **Kondisi:**
   - Admin Unit (unit_id = 2)
   - Asset (unit_id = 2)
   - Maintenance approved

2. **Admin Unit bisa complete**
   ✅ Permission granted (asset di unit yang sama)

3. **Process sama seperti skenario 1**

### Skenario 3: Admin Unit Mencoba Complete (Unit Lain)

1. **Kondisi:**
   - Admin Unit (unit_id = 2)
   - Asset (unit_id = 3)
   - Maintenance approved

2. **Admin Unit TIDAK bisa complete**
   ❌ Permission denied

3. **Response:**
   ```json
   {
     "success": false,
     "message": "Anda tidak memiliki izin untuk menyelesaikan perbaikan ini"
   }
   ```

## Error Handling

### 1. Maintenance Belum Approved
```json
{
  "success": false,
  "message": "Perbaikan harus disetujui terlebih dahulu sebelum bisa diselesaikan"
}
```

### 2. Maintenance Sudah Completed
```json
{
  "success": false,
  "message": "Perbaikan ini sudah diselesaikan sebelumnya"
}
```

### 3. Permission Denied
```json
{
  "success": false,
  "message": "Anda tidak memiliki izin untuk menyelesaikan perbaikan ini"
}
```

### 4. Maintenance Not Found
```json
{
  "success": false,
  "message": "Maintenance record not found"
}
```

## Testing Checklist

- [ ] Super Admin dapat complete maintenance semua unit
- [ ] Admin Holding dapat complete maintenance semua unit
- [ ] Admin Unit hanya dapat complete maintenance di unit mereka
- [ ] Admin Unit tidak dapat complete maintenance di unit lain
- [ ] User tidak dapat complete maintenance
- [ ] Tidak bisa complete jika belum approved
- [ ] Tidak bisa complete jika sudah completed
- [ ] Status aset berubah menjadi Available setelah complete
- [ ] Informasi completion tersimpan dengan benar
- [ ] Frontend menampilkan informasi completion
- [ ] Tombol "Selesaikan Perbaikan" hanya muncul saat appropriate
- [ ] Transaction rollback jika ada error

## Summary Permissions

| Role | Complete All Units | Complete Own Unit | Complete Other Units |
|------|-------------------|-------------------|---------------------|
| Super Admin | ✅ | ✅ | ✅ |
| Admin Holding | ✅ | ✅ | ✅ |
| Admin Unit | ❌ | ✅ | ❌ |
| User | ❌ | ❌ | ❌ |

## Catatan Penting

1. **Irreversible Action**: Setelah perbaikan diselesaikan, tidak bisa di-uncomplete. Pastikan perbaikan benar-benar sudah selesai.

2. **Asset Status**: Status aset otomatis berubah menjadi Available. Jika ada kondisi khusus, admin harus mengubah manual.

3. **Riwayat Lengkap**: Semua riwayat (input, validasi, completion) tersimpan lengkap untuk audit trail.

4. **Real-time Update**: Frontend langsung refresh setelah complete berhasil untuk menampilkan status terbaru.

5. **Database Transaction**: Semua operasi dibungkus dalam transaction untuk memastikan data consistency.
