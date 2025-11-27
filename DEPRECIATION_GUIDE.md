# 📊 Panduan Lengkap: Sistem Depresiasi Aset

**Dokumen ini menjelaskan secara detail proses perhitungan, implementasi, dan penggunaan sistem depresiasi dalam Aplikasi Asset Management System (AMS).**

---

## 📑 Daftar Isi

1. [Pengenalan Depresiasi](#pengenalan-depresiasi)
2. [Metode Depresiasi](#metode-depresiasi)
3. [Formula Perhitungan](#formula-perhitungan)
4. [Contoh Praktis](#contoh-praktis)
5. [Proses Depresiasi dalam Sistem](#proses-depresiasi-dalam-sistem)
6. [Arsitektur Teknis](#arsitektur-teknis)
7. [Penggunaan Manual](#penggunaan-manual)
8. [Depresiasi Otomatis (Scheduler)](#depresiasi-otomatis-scheduler)
9. [API Endpoints](#api-endpoints)
10. [Troubleshooting](#troubleshooting)

---

## Pengenalan Depresiasi

### Apa itu Depresiasi Aset?

**Depresiasi** adalah penurunan nilai suatu aset seiring waktu karena penggunaan, keausan, atau faktor lainnya. Dalam akuntansi, depresiasi mencerminkan alokasi biaya aset selama masa manfaatnya.

### Mengapa Depresiasi Penting?

✅ **Akuntansi yang Akurat** - Menunjukkan nilai aset yang sebenarnya di laporan keuangan
✅ **Perpajakan** - Memungkinkan pengurangkan depresiasi dari pajak penghasilan
✅ **Manajemen Aset** - Membantu keputusan kapan mengganti aset
✅ **Audit Trail** - Mencatat jejak perubahan nilai aset setiap periode

---

## Metode Depresiasi

### Metode yang Digunakan: Straight-Line Depreciation

AMS menggunakan **Straight-Line Depreciation (Depresiasi Garis Lurus)**, yaitu metode paling sederhana dan umum digunakan.

#### Karakteristik:
- 📈 Penurunan nilai **konsisten** setiap periode
- 📊 Mudah dipahami dan dihitung
- ✔️ Sesuai standar akuntansi PSAK (Pernyataan Standar Akuntansi Keuangan)
- 🔄 Tidak mempertimbangkan penggunaan intensif atau ringan

#### Visualisasi:

```
Nilai Aset
│
│ Rp 15.000.000 ────────────────────────
│              \
│               \  (Depresiasi setiap bulan)
│                \
│                 \
│                  \
│                   \
│                    \
│                     \
│                      \
│                       \
│                        \
│                         \
│                          \
│                           \
└─────────────────────────────────────── Waktu (36 bulan)
  0    4    8   12   16   20   24   28   32   36

Bulan 0: Rp 15.000.000
Bulan 12: Rp 10.000.000
Bulan 24: Rp 5.000.000
Bulan 36: Rp 0
```

---

## Formula Perhitungan

### 1. Depresiasi Bulanan (Monthly Depreciation)

```
📐 Monthly Depreciation = Asset Value ÷ Useful Life (bulan)
```

**Penjelasan:**
- `Asset Value` = Nilai pembelian aset (Rp)
- `Useful Life` = Masa manfaat aset dalam bulan (bulan)

**Contoh:**
```
Asset Value = Rp 15.000.000
Useful Life = 36 bulan

Monthly Depreciation = Rp 15.000.000 ÷ 36 = Rp 416.667 per bulan
```

### 2. Depresiasi Terkumulasi (Accumulated Depreciation)

```
📐 Accumulated Depreciation = Monthly Depreciation × N
   dimana N = Jumlah periode yang sudah didepresiasi
```

**Penjelasan:**
- Total depresiasi yang telah dilakukan dari awal hingga saat ini

**Contoh setelah 12 bulan:**
```
Accumulated Depreciation = Rp 416.667 × 12 = Rp 5.000.000
```

### 3. Nilai Buku Saat Ini (Current Book Value)

```
📐 Current Book Value = Original Value - Accumulated Depreciation
```

**Penjelasan:**
- Nilai aset yang sesungguhnya setelah dikurangi depresiasi
- Juga disebut "Net Book Value" atau "Book Value"

**Contoh setelah 12 bulan:**
```
Current Book Value = Rp 15.000.000 - Rp 5.000.000 = Rp 10.000.000
```

### 4. Perhitungan Bulan Tertunda (Pending Months)

```
📐 Pending Months = Expected Months - Already Depreciated Months

Dimana:
- Expected Months = min(Elapsed Months Since Purchase, Useful Life)
- Already Depreciated Months = Jumlah depresiasi yang sudah dilakukan
```

**Penjelasan:**
- Menghitung berapa bulan depresiasi yang belum dilakukan
- Sistem akan secara otomatis generate depresiasi untuk bulan-bulan pending ini

**Contoh:**
```
Asset dibeli: 1 Januari 2024
Hari ini: 15 September 2024 (≈ 8.5 bulan berlalu)
Depreciated months: 3 bulan (yang sudah dilakukan)
Expected months: 8 bulan (min dari 8.5 dan 36)

Pending Months = 8 - 3 = 5 bulan
(Sistem perlu generate 5 bulan depresiasi)
```

### 5. Progress Depresiasi (Completion Percentage)

```
📐 Completion % = (Months Depreciated ÷ Useful Life) × 100%
```

**Penjelasan:**
- Persentase berapa banyak depresiasi yang sudah selesai
- Ditampilkan sebagai progress bar di UI

**Contoh:**
```
Months Depreciated = 12 bulan
Useful Life = 36 bulan

Completion % = (12 ÷ 36) × 100% = 33%
```

---

## Contoh Praktis

### Skenario Lengkap: Pembelian Laptop

#### Data Aset:
```
Nama Aset          : Laptop Dell XPS 13
Harga Pembelian    : Rp 15.000.000
Tanggal Pembelian  : 1 Januari 2024
Masa Pakai         : 36 bulan (3 tahun)
Metode Depresiasi  : Straight-Line
```

#### Perhitungan:

**Depresiasi Bulanan:**
```
Monthly Depreciation = Rp 15.000.000 ÷ 36 = Rp 416.667 per bulan
```

#### Timeline Depresiasi:

| Bulan | Tanggal | Depreciation | Accumulated | Current Value | Progress |
|-------|---------|--------------|-------------|---------------|----------|
| 0 | 1 Jan 24 | - | Rp 0 | Rp 15.000.000 | 0% |
| 1 | 1 Feb 24 | Rp 416.667 | Rp 416.667 | Rp 14.583.333 | 2.8% |
| 2 | 1 Mar 24 | Rp 416.667 | Rp 833.333 | Rp 14.166.667 | 5.6% |
| 3 | 1 Apr 24 | Rp 416.667 | Rp 1.250.000 | Rp 13.750.000 | 8.3% |
| 6 | 1 Jul 24 | Rp 416.667 | Rp 2.500.000 | Rp 12.500.000 | 16.7% |
| 12 | 1 Jan 25 | Rp 416.667 | Rp 5.000.000 | Rp 10.000.000 | 33% |
| 18 | 1 Jul 25 | Rp 416.667 | Rp 7.500.000 | Rp 7.500.000 | 50% |
| 24 | 1 Jan 26 | Rp 416.667 | Rp 10.000.000 | Rp 5.000.000 | 66.7% |
| 30 | 1 Jul 26 | Rp 416.667 | Rp 12.500.000 | Rp 2.500.000 | 83.3% |
| 36 | 1 Jan 27 | Rp 416.667 | Rp 15.000.000 | Rp 0 | 100% |

#### Analisis:
- **Setelah 1 tahun (12 bulan):** Aset nilainya turun menjadi Rp 10.000.000 (33% sudah terdepresiasi)
- **Setelah 2 tahun (24 bulan):** Aset nilainya turun menjadi Rp 5.000.000 (67% sudah terdepresiasi)
- **Setelah 3 tahun (36 bulan):** Aset sudah habis didepresiasi (nilai 0)

---

## Proses Depresiasi dalam Sistem

### Alur Depresiasi Umum

```
┌─────────────────────┐
│   Aset Dibeli       │
│ Rp 15.000.000       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────┐
│  Cek Apakah Siap Didepresiasi?  │
│  ✓ Status = Available            │
│  ✓ Book Value > 0                │
│  ✓ Sudah melewati anniversary    │
│  ✓ Belum ada record bulan ini    │
└──────────┬──────────────────────┘
           │
      ┌────┴────┐
      │ TIDAK   │ YA
      │         │
      ▼         ▼
  Tunggu    Generate
  Waktu     Depresiasi
            │
            ▼
     ┌────────────────────┐
     │ Hitung Amount:     │
     │ Rp 15M ÷ 36 bln    │
     │ = Rp 416.667       │
     └────────┬───────────┘
              │
              ▼
     ┌────────────────────┐
     │ Update Database:   │
     │ - Depreciation     │
     │ - Accumulated      │
     │ - Current Value    │
     │ - Month Sequence   │
     └────────┬───────────┘
              │
              ▼
     ┌────────────────────┐
     │ Simpan Record      │
     │ Depreciation      │
     └────────┬───────────┘
              │
              ▼
     ┌────────────────────┐
     │ Aset Depresiasi    │
     │ Rp 14.583.333      │
     └────────────────────┘
```

### Validasi Sebelum Generate Depresiasi

Sistem melakukan validasi ketat sebelum menggenerate depresiasi:

#### 1️⃣ **Validasi Status Aset**
```javascript
Kondisi:
✅ Status aset = 'Available'
❌ Status ≠ 'Disposed', 'Lost', 'Terjual'

Alasan: Aset yang sudah disposed/hilang/terjual
tidak perlu didepresiasi lebih lanjut
```

#### 2️⃣ **Validasi Nilai Aset**
```javascript
Kondisi:
✅ Current Book Value > 0
❌ Current Book Value ≤ 0

Alasan: Aset tidak boleh didepresiasi di bawah 0
(Nilai tidak bisa negatif)
```

#### 3️⃣ **Validasi Masa Pakai**
```javascript
Kondisi:
✅ Month Sequence ≤ Useful Life
❌ Month Sequence > Useful Life

Alasan: Tidak boleh didepresiasi lebih dari masa pakai

Contoh:
Useful Life = 36 bulan
Month Sequence = 36 (boleh)
Month Sequence = 37 (tidak boleh)
```

#### 4️⃣ **Validasi Waktu**
```javascript
Kondisi:
✅ Current Time ≥ (Purchase Date + Anniversary + Scheduler Time)
❌ Current Time < Depreciation Time

Alasan: Depresiasi hanya dilakukan sesuai jadwal

Contoh:
Purchase Date = 1 Jan 2024
Anniversary untuk Bulan 2 = 1 Feb 2024
Scheduler Time = 10:00 AM
Dapat Didepresiasi = 1 Feb 2024 10:00 AM atau lebih
```

#### 5️⃣ **Validasi Record Depresiasi**
```javascript
Kondisi:
✅ Tidak ada record depresiasi untuk month sequence ini
❌ Sudah ada record depresiasi untuk month sequence ini

Alasan: Mencegah duplikasi depresiasi untuk bulan yang sama

Contoh:
Bulan 1 sudah di-generate → tidak bisa generate lagi
Bulan 2 belum di-generate → boleh generate
```

---

## Arsitektur Teknis

### 1. Model Layer (Database Structure)

#### **Asset Model**
File: `/app/Models/Asset.php`

**Properti Terkait Depresiasi:**
```php
- id: integer (Primary Key)
- name: string
- value: decimal (Nilai pembelian)
- purchase_date: date (Tanggal pembelian)
- useful_life: integer (Masa pakai dalam bulan)
- status: enum (Available, Terpinjam, Terjual, Lost, dll)
```

**Methods:**
```php
public function calculateMonthlyDepreciation(): float
    → Hitung depresiasi bulanan

public function getElapsedMonths(): int
    → Hitung bulan sejak pembelian

public function getExpectedDepreciationMonths(): int
    → Hitung bulan yang seharusnya sudah didepresiasi

public function getPendingDepreciationMonths(): int
    → Hitung bulan yang belum didepresiasi

public function depreciations(): HasMany
    → Relasi ke tabel asset_depreciations
```

#### **AssetDepreciation Model**
File: `/app/Models/AssetDepreciation.php`

**Struktur Tabel:**
```php
- id: integer (Primary Key)
- asset_id: foreign key
- depreciation_amount: decimal (Rp)
- accumulated_depreciation: decimal (Rp)
- current_value: decimal (Rp)
- depreciation_date: date
- month_sequence: integer (1, 2, 3, ..., 36)
- created_at: timestamp
- updated_at: timestamp
```

**Penjelasan Field:**
| Field | Contoh | Penjelasan |
|-------|--------|-----------|
| asset_id | 5 | ID aset yang didepresiasi |
| depreciation_amount | 416.667 | Jumlah depresiasi per bulan |
| accumulated_depreciation | 5.000.000 | Total depresiasi setelah 12 bulan |
| current_value | 10.000.000 | Nilai aset saat ini (15M - 5M) |
| depreciation_date | 2024-01-01 | Tanggal depresiasi dilakukan |
| month_sequence | 12 | Ini adalah depresiasi bulan ke-12 |

#### **DepreciationScheduleSetting Model**
File: `/app/Models/DepreciationScheduleSetting.php`

**Konfigurasi Scheduler:**
```php
- id: integer
- frequency: enum (daily, weekly, monthly, custom)
- execution_time: time (jam berapa dijalankan)
- timezone: string (WIB, WITA, WIT, UTC)
- is_active: boolean (aktif/tidak aktif)
- last_run_at: timestamp
- cron_expression: string (untuk custom schedule)
```

### 2. Service Layer

#### **DepreciationService**
File: `/app/Services/DepreciationService.php`

**Core Methods:**

```php
// 1. Generate depresiasi 1 bulan
public function generateNextDepreciation(Asset $asset): array

// 2. Generate depresiasi multiple bulan
public function generateMultipleDepreciation(Asset $asset, int $months): array

// 3. Generate sampai nilai 0
public function generateUntilZero(Asset $asset): array

// 4. Generate sampai nilai tertentu
public function generateUntilValue(Asset $asset, float $targetValue): array

// 5. Dapatkan preview tanpa save
public function previewDepreciation(Asset $asset): array

// 6. Dapatkan ringkasan depresiasi
public function getDepreciationSummary(Asset $asset): array

// 7. Dapatkan schedule depresiasi masa depan
public function getDepreciationSchedule(Asset $asset): array

// 8. Auto generate untuk semua aset
public function generateAutoDepreciation(): array

// 9. Reset depresiasi untuk re-do
public function resetDepreciation(Asset $asset): void
```

### 3. Controller Layer

#### **AssetDepreciationController**
File: `/app/Http/Controllers/Api/AssetDepreciationController.php`

**Endpoints:**

```
GET    /api/assets/{assetId}/depreciation
POST   /api/assets/{assetId}/generate-depreciation
POST   /api/assets/{assetId}/generate-multiple-depreciation
POST   /api/assets/{assetId}/depreciation-preview
GET    /api/assets/{assetId}/depreciation-status
DELETE /api/assets/{assetId}/reset-depreciation
GET    /api/assets/{assetId}/depreciation-schedule
POST   /api/depreciation/generate-all
```

### 4. Frontend Layer

#### **Depresiasi di Dashboard**
File: `/frontend/components/Dashboard.tsx`

**Card Depresiasi:**
```tsx
<div className="bg-white rounded-lg shadow p-6">
  <h3 className="text-lg font-semibold">Akumulasi Depresiasi Asset</h3>
  <p className="text-3xl font-bold text-purple-600">
    {formatToRupiah(stats.total_accumulated_depreciation)}
  </p>
  <p className="text-sm text-gray-500">Total penurunan nilai asset</p>
</div>
```

**Menampilkan:**
- Total akumulasi depresiasi semua aset
- Format Rupiah
- Icon visual

#### **Detail Depresiasi di Asset Detail**
File: `/frontend/components/AssetDetail.tsx`

**Informasi yang Ditampilkan:**
- Monthly Depreciation
- Accumulated Depreciation
- Current Value
- Progress (X / Y bulan)
- Next Depreciation Date
- Depreciation History (Tabel)

**Tombol Aksi:**
- Generate Depreciation (manual)
- Reset Depreciation
- Preview Depreciation

---

## Penggunaan Manual

### Cara Generate Depresiasi Manual

#### **Melalui UI (Asset Detail Page)**

1. **Buka Aset**
   - Navigasi ke menu "Aset" → "Daftar Aset"
   - Klik nama aset yang ingin didepresiasi
   - Arahkan ke Tab "Depreciation"

2. **Generate Depresiasi**
   - Tombol "Generate Depreciation" (untuk 1 bulan)
   - Atau tombol "Generate Pending Months" (untuk semua bulan tertunda)

3. **Verifikasi**
   - Cek riwayat depresiasi di tabel bawah
   - Verifikasi nilai accumulated dan current value

#### **Melalui API**

**Generate 1 Bulan:**
```bash
POST /api/assets/5/generate-depreciation

Response:
{
  "success": true,
  "message": "Depreciation generated successfully",
  "data": {
    "depreciation_amount": 416667,
    "accumulated_depreciation": 416667,
    "current_value": 14583333,
    "month_sequence": 1,
    "depreciation_date": "2024-01-01"
  }
}
```

**Generate Multiple Bulan:**
```bash
POST /api/assets/5/generate-multiple-depreciation

Body:
{
  "months": 3
}

Response:
{
  "success": true,
  "message": "3 months depreciation generated",
  "data": {
    "generated_count": 3,
    "total_depreciation": 1250000,
    "accumulated_depreciation": 1250000,
    "current_value": 13750000
  }
}
```

**Preview Depresiasi:**
```bash
GET /api/assets/5/depreciation-preview

Response:
{
  "success": true,
  "data": {
    "next_depreciation_amount": 416667,
    "projected_accumulated": 416667,
    "projected_current_value": 14583333,
    "months_available": 35
  }
}
```

---

## Depresiasi Otomatis (Scheduler)

### Cara Kerja Scheduler

#### **Setup Scheduler**

1. **Akses Konfigurasi**
   - Admin Dashboard → Settings → Depreciation Schedule

2. **Konfigurasi Jadwal**
   ```
   Frequency: Monthly
   Execution Time: 02:00 AM (pagi)
   Timezone: WIB (Asia/Jakarta)
   Status: Active
   ```

3. **Save Konfigurasi**

#### **Mekanisme Scheduler**

```
┌─────────────────────────────────────────────┐
│ Laravel Scheduler (config/app.php)          │
│ Berjalan setiap menit (cron job)            │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│ Cek Schedule Depreciation                   │
│ - Frequency: monthly                        │
│ - Execution Time: 02:00 AM                  │
│ - Timezone: WIB                             │
│ - Last Run: 3 hari lalu                     │
└────────────────┬────────────────────────────┘
                 │ (Jika sudah saatnya)
                 ▼
┌─────────────────────────────────────────────┐
│ Execute GenerateAutoDepreciation Command     │
│ php artisan depreciation:generate-auto      │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│ Loop setiap Aset                            │
│ - Cek pending months                        │
│ - Generate 1 bulan per aset                 │
│ - Update database                           │
│ - Log hasil                                 │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│ Update Last Run Timestamp                   │
│ - Simpan waktu eksekusi terakhir            │
│ - Siap untuk run berikutnya                 │
└─────────────────────────────────────────────┘
```

#### **Command untuk Manual Trigger**

```bash
# Jalankan auto depreciation manual
php artisan depreciation:generate-auto

# Output:
# ✓ Processing asset ID 1...
# ✓ Generated 1 month depreciation
# ✓ Processing asset ID 2...
# ✓ Already up to date
# ✓ Processing asset ID 3...
# ✓ Generated 2 months depreciation
# ✓ Completed: 3 assets processed, 3 months generated
```

---

## API Endpoints

### Depreciation Endpoints

#### **1. Get Depreciation Data**
```
GET /api/assets/{assetId}/depreciation

Response:
{
  "success": true,
  "data": {
    "asset_id": 5,
    "monthly_depreciation": 416667,
    "accumulated_depreciation": 1250000,
    "current_value": 13750000,
    "depreciated_months": 3,
    "remaining_months": 33,
    "completion_percentage": 8.3,
    "next_depreciation_date": "2024-04-01",
    "is_depreciable": true,
    "is_up_to_date": true,
    "pending_depreciation_months": 0
  }
}
```

#### **2. Generate Single Depreciation**
```
POST /api/assets/{assetId}/generate-depreciation

Request Body:
{} (empty)

Response:
{
  "success": true,
  "message": "Depreciation generated successfully",
  "data": {
    "depreciation_amount": 416667,
    "accumulated_depreciation": 416667,
    "current_value": 14583333,
    "month_sequence": 1
  }
}
```

#### **3. Generate Multiple Depreciation**
```
POST /api/assets/{assetId}/generate-multiple-depreciation

Request Body:
{
  "months": 3
}

Response:
{
  "success": true,
  "message": "3 months depreciation generated successfully",
  "data": [
    {
      "month_sequence": 1,
      "depreciation_amount": 416667
    },
    {
      "month_sequence": 2,
      "depreciation_amount": 416667
    },
    {
      "month_sequence": 3,
      "depreciation_amount": 416667
    }
  ]
}
```

#### **4. Preview Depreciation**
```
GET /api/assets/{assetId}/depreciation-preview

Response:
{
  "success": true,
  "data": {
    "next_depreciation_amount": 416667,
    "projected_accumulated": 1666667,
    "projected_current_value": 13333333,
    "preview_month_sequence": 4,
    "preview_depreciation_date": "2024-04-01"
  }
}
```

#### **5. Get Depreciation Status**
```
GET /api/assets/{assetId}/depreciation-status

Response:
{
  "success": true,
  "data": {
    "is_depreciable": true,
    "is_up_to_date": false,
    "pending_months": 5,
    "expected_months": 8,
    "months_depreciated": 3,
    "next_available_date": "2024-04-01T10:00:00",
    "can_generate_now": true,
    "reason": "Asset is ready for depreciation"
  }
}
```

#### **6. Get Depreciation Schedule**
```
GET /api/assets/{assetId}/depreciation-schedule

Response:
{
  "success": true,
  "data": {
    "total_months": 36,
    "months_depreciated": 3,
    "remaining_months": 33,
    "schedule": [
      {
        "month_sequence": 4,
        "expected_date": "2024-04-01",
        "monthly_amount": 416667,
        "projected_accumulated": 1666667,
        "projected_value": 13333333,
        "status": "pending"
      },
      ...
    ]
  }
}
```

#### **7. Reset Depreciation**
```
DELETE /api/assets/{assetId}/reset-depreciation

Request Body:
{
  "reason": "Koreksi nilai aset"
}

Response:
{
  "success": true,
  "message": "Depreciation reset successfully",
  "data": {
    "message": "All 3 depreciation records deleted",
    "accumulated_depreciation": 0,
    "current_value": 15000000
  }
}
```

#### **8. Generate All Assets**
```
POST /api/depreciation/generate-all

Request Body:
{} (empty)

Response:
{
  "success": true,
  "message": "Depreciation generated for pending assets",
  "data": {
    "processed_count": 5,
    "generated_count": 3,
    "already_updated": 2,
    "failed_count": 0,
    "total_depreciation_amount": 1250000
  }
}
```

### Schedule Endpoints

#### **1. Get Schedule Configuration**
```
GET /api/depreciation-schedule

Response:
{
  "success": true,
  "data": {
    "frequency": "monthly",
    "execution_time": "02:00:00",
    "timezone": "Asia/Jakarta",
    "is_active": true,
    "last_run_at": "2024-01-15 02:00:00",
    "next_run_at": "2024-02-01 02:00:00",
    "cron_expression": "0 2 1 * *"
  }
}
```

#### **2. Update Schedule Configuration**
```
PUT /api/depreciation-schedule

Request Body:
{
  "frequency": "weekly",
  "execution_time": "03:00:00",
  "timezone": "Asia/Jakarta",
  "is_active": true
}

Response:
{
  "success": true,
  "message": "Schedule updated successfully"
}
```

#### **3. Get Available Frequencies**
```
GET /api/depreciation-schedule/frequencies

Response:
{
  "success": true,
  "data": [
    {
      "value": "daily",
      "label": "Setiap Hari"
    },
    {
      "value": "weekly",
      "label": "Setiap Minggu"
    },
    {
      "value": "monthly",
      "label": "Setiap Bulan"
    },
    {
      "value": "custom",
      "label": "Custom (Cron)"
    }
  ]
}
```

#### **4. Get Available Timezones**
```
GET /api/depreciation-schedule/timezones

Response:
{
  "success": true,
  "data": [
    "UTC",
    "Asia/Jakarta",
    "Asia/Makassar",
    "Asia/Jayapura",
    ...
  ]
}
```

---

## Troubleshooting

### Error Messages dan Solusi

#### **Error: "Not yet time for depreciation"**
```
Message: "Next depreciation date has not arrived yet"
Status: 400 Bad Request

Penyebab:
- Aset belum melewati anniversary date + scheduler time
- Depresiasi tidak boleh dilakukan lebih dari 1x per bulan

Solusi:
1. Tunggu anniversary date berikutnya
2. Cek konfigurasi timezone dan execution time
3. Gunakan endpoint `/depreciation-status` untuk cek kapan bisa di-generate
```

#### **Error: "Maximum depreciation period reached"**
```
Message: "Asset has reached maximum depreciation period"
Status: 400 Bad Request

Penyebab:
- Aset sudah selesai didepresiasi (36 bulan)
- Current value sudah mencapai 0

Solusi:
1. Aset sudah sepenuhnya didepresiasi - ini normal
2. Jika ingin reset, gunakan endpoint DELETE /reset-depreciation
3. Aset siap untuk dijual atau dibuang
```

#### **Error: "Invalid asset status"**
```
Message: "Asset status is not suitable for depreciation"
Status: 400 Bad Request

Penyebab:
- Status aset = Disposed, Lost, atau Terjual
- Aset tidak dalam status Available

Solusi:
1. Cek status aset di detail page
2. Ubah status aset menjadi Available jika perlu
3. Aset yang sudah disposed tidak perlu didepresiasi
```

#### **Error: "Book value cannot be negative"**
```
Message: "Generated depreciation would result in negative book value"
Status: 400 Bad Request

Penyebab:
- Depreciation amount > current book value
- Sistem mencegah nilai aset menjadi negatif

Solusi:
1. Generate depreciation dengan jumlah bulan lebih sedikit
2. Gunakan endpoint `/depreciation-preview` untuk cek
3. Atau gunakan "Generate Until Zero" untuk depresiasi sempurna
```

#### **Error: "Duplicate depreciation record"**
```
Message: "Depreciation record already exists for this month"
Status: 409 Conflict

Penyebab:
- Sudah ada record depresiasi untuk bulan ini
- Mencegah duplikasi yang sama

Solusi:
1. Reset depreciation jika ingin retry
2. Cek tabel depreciation history
3. Generate bulan berikutnya atau pending months
```

### Debugging Tips

#### **1. Cek Pending Months**
```
GET /api/assets/{assetId}/depreciation-status

Lihat field:
- expected_months: Bulan yang seharusnya sudah didepresiasi
- months_depreciated: Bulan yang sudah didepresiasi
- pending_months: Perbedaannya
```

#### **2. Preview Sebelum Generate**
```
GET /api/assets/{assetId}/depreciation-preview

Selalu preview dulu untuk memastikan hasil yang benar
sebelum melakukan generate
```

#### **3. Cek Schedule Status**
```
GET /api/depreciation-schedule

Pastikan:
- is_active = true
- execution_time sudah tepat
- timezone sesuai dengan lokasi
- last_run_at ada dan recent
```

#### **4. Check Logs**
```
File: /storage/logs/laravel.log

Cari:
- GenerateAutoDepreciation executed
- Depreciation generated
- Error messages
```

#### **5. Test Manual Trigger**
```
Jalankan command secara manual:
php artisan depreciation:generate-auto

Lihat output dan error messages
```

---

## Best Practices

### ✅ Rekomendasi

1. **Schedule Configuration**
   - Atur waktu eksekusi di pagi hari (02:00 AM)
   - Gunakan timezone sesuai lokasi perusahaan
   - Set frequency ke "monthly" untuk kebanyakan kasus

2. **Manual Depreciation**
   - Selalu preview sebelum generate
   - Dokumentasikan alasan jika ada reset
   - Audit trail tersimpan otomatis

3. **Monitoring**
   - Monitor pending months secara berkala
   - Pastikan scheduler aktif dan berjalan
   - Check accumulated depreciation vs expected

4. **Error Handling**
   - Jangan abaikan error messages
   - Cek status sebelum generate
   - Gunakan reset hanya jika diperlukan

### ❌ Hal yang Harus Dihindari

1. Jangan generate depresiasi secara manual setiap hari
2. Jangan reset depreciation tanpa alasan jelas
3. Jangan mengubah useful_life setelah aset aktif
4. Jangan matikan scheduler tanpa notifikasi

---

## Kesimpulan

Sistem depresiasi AMS menggunakan metode **Straight-Line Depreciation** yang sederhana namun powerful. Dengan fitur:

✅ Depresiasi otomatis via scheduler
✅ Depresiasi manual dengan kontrol penuh
✅ Preview dan validasi sebelum generate
✅ Full audit trail dan history
✅ Timezone support untuk berbagai lokasi

Sistem ini memastikan perhitungan nilai aset yang akurat dan sesuai standar akuntansi.

---

**Dokumen ini dibuat pada: 26 November 2025**
**Versi: 1.0**
**Status: Ready for Use**
