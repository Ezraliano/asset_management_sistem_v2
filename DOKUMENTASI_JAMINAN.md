# 📋 Dokumentasi Modul Jaminan (Guarantee Module)

## 📑 Daftar Isi
1. [Ringkasan Modul](#ringkasan-modul)
2. [Struktur File & Direktori](#struktur-file--direktori)
3. [Komponen Frontend](#komponen-frontend)
4. [API Services](#api-services)
5. [Database Models & Migrations](#database-models--migrations)
6. [Controller & Routes](#controller--routes)
7. [Build Script untuk Jaminan](#build-script-untuk-jaminan)
8. [Testing & Development](#testing--development)
9. [Deployment Guide](#deployment-guide)

---

## 📌 Ringkasan Modul

**Modul Jaminan** adalah bagian dari Sistem Manajemen Aset yang mengelola data jaminan untuk setiap kredit/peminjaman aset. Modul ini memungkinkan:

- ✅ Mencatat data jaminan (dokumen kepemilikan aset seperti BPKB, SHM, SHGB, E-SHM)
- ✅ Mengelola peminjaman jaminan
- ✅ Melacak pengembalian dan settlement jaminan
- ✅ Membuat laporan dan export data jaminan
- ✅ Filter dan pencarian berdasarkan unit organisasi

**Status:** Active Development
**Last Updated:** 2024-11-27

---

## 📁 Struktur File & Direktori

### Frontend Components

```
frontend/
├── components/                          # Komponen Aset (Legacy)
│   ├── GuaranteeDashboard.tsx          # Dashboard jaminan dengan statistik
│   ├── GuaranteeList.tsx               # Daftar jaminan dengan CRUD
│   ├── GuaranteeInputForm.tsx          # Form input/edit jaminan
│   ├── GuaranteeDetail.tsx             # Detail view jaminan
│   ├── GuaranteeLoaning.tsx            # Manajemen peminjaman jaminan
│   ├── GuaranteeReturn.tsx             # Form pengembalian jaminan
│   ├── GuaranteeSettlement.tsx         # Settlement/pelunasan jaminan
│   └── GuaranteeReportExport.tsx       # Export laporan jaminan
│
├── components_jaminan/                 # Komponen Jaminan (New - Responsive)
│   ├── GuaranteeDashboard.tsx          # Dashboard responsif
│   ├── GuaranteeList.tsx               # List responsif
│   ├── GuaranteeInputForm.tsx          # Form responsif
│   ├── GuaranteeDetail.tsx             # Detail responsif
│   ├── GuaranteeLoaning.tsx            # Loaning responsif
│   ├── GuaranteeReturn.tsx             # Return responsif
│   ├── GuaranteeSettlement.tsx         # Settlement responsif
│   └── GuaranteeReportExport.tsx       # Export responsif
│
├── services/
│   └── api.ts                          # API functions untuk jaminan
│
├── types.ts                            # TypeScript interfaces
└── utils/
    └── guaranteeExportUtils.ts         # Utility untuk export jaminan
```

### Backend Files

```
app/
├── Http/Controllers/Api_jaminan/
│   ├── GuaranteeController.php         # CRUD jaminan
│   ├── GuaranteeLoanController.php     # Manajemen peminjaman
│   └── GuaranteeSettlementController.php # Settlement jaminan
│
└── Models_jaminan/
    ├── Guarantee.php                   # Model jaminan
    ├── GuaranteeLoan.php              # Model peminjaman jaminan
    └── GuaranteeSettlement.php        # Model settlement

database/
└── migrations_jaminan/
    ├── 2024_11_19_000000_create_guarantees_table.php
    ├── 2024_11_19_000001_create_guarantee_loans_table.php
    ├── 2024_11_19_000002_create_guarantee_settlements_table.php
    └── 2024_11_25_000000_create_jaminan_users_table.php
```

---

## 🎨 Komponen Frontend

### 1. GuaranteeDashboard.tsx
**Lokasi:** `frontend/components/GuaranteeDashboard.tsx` & `frontend/components_jaminan/GuaranteeDashboard.tsx`

**Deskripsi:**
- Menampilkan statistik jaminan (tersedia, dipinjam, lunas)
- Visualisasi dengan Bar Chart (berdasarkan tipe jaminan) dan Pie Chart (berdasarkan status)
- Filter berdasarkan Unit organisasi

**Props:**
```typescript
interface GuaranteeDashboardProps {
  navigateTo?: (view: any) => void;
}
```

**Dependencies:**
- React Hooks (useState, useEffect)
- Recharts (BarChart, PieChart, Cell, Pie)
- API: `getGuaranteeStats()`, `getGuaranteeUnits()`

**State Management:**
```typescript
const [stats, setStats] = useState({
  available: 0,
  dipinjam: 0,
  lunas: 0,
  total: 0,
});
const [typeData, setTypeData] = useState<BarChartData[]>([]);
const [statusData, setStatusData] = useState<DonutChartData[]>([]);
const [selectedUnit, setSelectedUnit] = useState<number | ''>('');
const [units, setUnits] = useState<Unit[]>([]);
```

---

### 2. GuaranteeList.tsx
**Lokasi:** `frontend/components/GuaranteeList.tsx` & `frontend/components_jaminan/GuaranteeList.tsx`

**Deskripsi:**
- Menampilkan daftar jaminan dalam bentuk tabel
- Fitur: Search (No SPK, No CIF), Filter Unit, Sorting
- CRUD operations: Add, Edit, View Detail
- Integrasi dengan modal untuk input/edit

**Props:**
```typescript
interface GuaranteeListProps {
  navigateTo: (view: View) => void;
}
```

**Features:**
- ✅ Search real-time berdasarkan SPK Number dan CIF Number
- ✅ Filter berdasarkan Unit
- ✅ Sorting by SPK Number / CIF Number (Asc/Desc)
- ✅ Export laporan ke Excel/PDF
- ✅ Inline Edit dan Delete
- ✅ View detail dengan modal

**API Calls:**
- `getGuarantees()` - Fetch daftar jaminan
- `getAssets()` - Fetch data aset
- `getGuaranteeUnits()` - Fetch daftar unit

---

### 3. GuaranteeInputForm.tsx
**Lokasi:** `frontend/components/GuaranteeInputForm.tsx` & `frontend/components_jaminan/GuaranteeInputForm.tsx`

**Deskripsi:**
- Form untuk input/edit data jaminan
- Validasi client-side dan server-side
- Unit selection (opsional)

**Props:**
```typescript
interface GuaranteeInputFormProps {
  guarantee?: any;          // Data untuk edit mode
  assets: Asset[];          // Daftar aset
  onSuccess: () => void;    // Callback setelah submit berhasil
  onClose: () => void;      // Callback untuk close modal
}
```

**Form Fields:**
| Field | Type | Validasi | Keterangan |
|-------|------|----------|-----------|
| `spk_number` | string | Required, alphanumeric | No SPK (bisa sama dengan jaminan lain) |
| `cif_number` | string | Required, numeric only | No CIF customer |
| `spk_name` | string | Required | Atas nama SPK |
| `credit_period` | string | Required | Jangka waktu kredit (e.g., "24 bulan") |
| `guarantee_name` | string | Required | Nama dokumen jaminan |
| `guarantee_type` | enum | Required | BPKB, SHM, SHGB, E-SHM |
| `guarantee_number` | string | Required, unique | No identifikasi jaminan |
| `file_location` | string | Required | Lokasi penyimpanan berkas |
| `input_date` | date | Required | Tanggal input jaminan |
| `unit_id` | number | Optional | Pilihan unit organisasi |

**Validasi:**
```typescript
// Client-side validation rules:
- spk_number: tidak boleh kosong, hanya alphanumeric
- cif_number: tidak boleh kosong, hanya angka
- guarantee_number: unik, tidak boleh sama dengan jaminan lain
- Semua field required kecuali unit_id
```

---

### 4. GuaranteeDetail.tsx
**Lokasi:** `frontend/components/GuaranteeDetail.tsx` & `frontend/components_jaminan/GuaranteeDetail.tsx`

**Deskripsi:**
- Menampilkan detail lengkap satu jaminan
- Menampilkan history peminjaman dan settlement
- Tombol aksi: Edit, Pinjam, Kembalikan, Settlement

**Props:**
```typescript
interface GuaranteeDetailProps {
  guaranteeId: string;
  navigateTo: (view: View) => void;
}
```

**Data yang Ditampilkan:**
- Informasi dasar jaminan (SPK, CIF, Tipe, etc)
- History peminjaman dengan status
- History settlement dan pengembalian
- Audit trail (created_at, updated_at, created_by)

---

### 5. GuaranteeLoaning.tsx
**Lokasi:** `frontend/components/GuaranteeLoaning.tsx` & `frontend/components_jaminan/GuaranteeLoaning.tsx`

**Deskripsi:**
- Form untuk mencatat peminjaman jaminan
- Field: tanggal pinjam, penerima, tujuan, durasi
- Status tracking: active, returned

**API Calls:**
- `createGuaranteeLoan()` - Buat record peminjaman baru
- `getGuaranteeLoans()` - Fetch daftar peminjaman
- `updateGuaranteeLoan()` - Update status peminjaman

---

### 6. GuaranteeReturn.tsx
**Lokasi:** `frontend/components/GuaranteeReturn.tsx` & `frontend/components_jaminan/GuaranteeReturn.tsx`

**Deskripsi:**
- Form untuk pengembalian jaminan
- Field: tanggal kembali, kondisi jaminan, catatan
- Update status jaminan menjadi "available"

**API Calls:**
- `returnGuaranteeLoan()` - Process pengembalian jaminan

---

### 7. GuaranteeSettlement.tsx
**Lokasi:** `frontend/components/GuaranteeSettlement.tsx` & `frontend/components_jaminan/GuaranteeSettlement.tsx`

**Deskripsi:**
- Form untuk settlement/pelunasan jaminan
- Field: tanggal settlement, metode pelunasan, catatan
- Update status jaminan menjadi "lunas"

**API Calls:**
- `updateGuaranteeLoan()` - Update dengan settlement data

---

### 8. GuaranteeReportExport.tsx
**Lokasi:** `frontend/components/GuaranteeReportExport.tsx` & `frontend/components_jaminan/GuaranteeReportExport.tsx`

**Deskripsi:**
- Modal untuk export laporan jaminan
- Format: Excel (.xlsx), PDF
- Filter: Unit, Tipe Jaminan, Date Range

**Features:**
- ✅ Export to Excel dengan formatting
- ✅ Export to PDF dengan logo perusahaan
- ✅ Custom report dengan selected columns
- ✅ Filter data sebelum export

---

## 🔌 API Services

### Location
`frontend/services/api.ts`

### Guarantee Functions

#### 1. getGuarantees()
```typescript
export const getGuarantees = async (params?: {
  per_page?: number;
  sort_by?: 'spk_number' | 'cif_number';
  sort_order?: 'asc' | 'desc';
}): Promise<PaginatedResponse<Guarantee>>
```
**Deskripsi:** Fetch daftar jaminan dengan pagination dan sorting

---

#### 2. getGuaranteeById()
```typescript
export const getGuaranteeById = async (id: number): Promise<Guarantee | null>
```
**Deskripsi:** Fetch detail satu jaminan berdasarkan ID

---

#### 3. addGuarantee()
```typescript
export const addGuarantee = async (data: GuaranteeFormData): Promise<Guarantee | null>
```
**Deskripsi:** Tambah jaminan baru

---

#### 4. updateGuarantee()
```typescript
export const updateGuarantee = async (id: number, data: Partial<GuaranteeFormData>): Promise<Guarantee | null>
```
**Deskripsi:** Update data jaminan

---

#### 5. deleteGuarantee()
```typescript
export const deleteGuarantee = async (id: number): Promise<boolean>
```
**Deskripsi:** Delete jaminan (soft delete)

---

#### 6. getGuaranteeStats()
```typescript
export const getGuaranteeStats = async (unitId?: number | ''): Promise<GuaranteeStats | null>
```
**Deskripsi:** Fetch statistik jaminan (by status, by type)

---

#### 7. getGuaranteeUnits()
```typescript
export const getGuaranteeUnits = async (): Promise<Unit[]>
```
**Deskripsi:** Fetch daftar unit untuk filter/selection

---

#### 8. getGuaranteesByType()
```typescript
export const getGuaranteesByType = async (type: 'BPKB' | 'SHM' | 'SHGB'): Promise<Guarantee[]>
```
**Deskripsi:** Fetch jaminan berdasarkan tipe

---

#### 9. createGuaranteeLoan()
```typescript
export const createGuaranteeLoan = async (loanData: {
  guarantee_id: number;
  loan_date: string;
  borrower: string;
  purpose: string;
  return_date?: string;
}): Promise<any | null>
```
**Deskripsi:** Buat record peminjaman jaminan

---

#### 10. getGuaranteeLoans()
```typescript
export const getGuaranteeLoans = async (params?: {
  per_page?: number;
  status?: 'active' | 'returned';
}): Promise<PaginatedResponse<any>>
```
**Deskripsi:** Fetch daftar peminjaman jaminan

---

#### 11. returnGuaranteeLoan()
```typescript
export const returnGuaranteeLoan = async (id: number, returnData: {
  return_date: string;
  condition: string;
  notes?: string;
}): Promise<any | null>
```
**Deskripsi:** Process pengembalian jaminan

---

#### 12. getGuaranteeSettlementsForGuarantee()
```typescript
export const getGuaranteeSettlementsForGuarantee = async (guaranteeId: number): Promise<any[]>
```
**Deskripsi:** Fetch daftar settlement untuk satu jaminan

---

### TypeScript Interfaces

#### Guarantee
```typescript
interface Guarantee {
  id: number;
  spk_number: string;
  cif_number: string;
  spk_name: string;
  credit_period: string;
  guarantee_name: string;
  guarantee_type: 'BPKB' | 'SHM' | 'SHGB' | 'E-SHM';
  guarantee_number: string;
  file_location: string;
  input_date: string;
  status: 'available' | 'dipinjam' | 'lunas';
  unit_id?: number;
  unit?: Unit;
  created_at: string;
  updated_at: string;
  created_by?: string;
}
```

#### GuaranteeFormData
```typescript
interface GuaranteeFormData {
  spk_number: string;
  cif_number: string;
  spk_name: string;
  credit_period: string;
  guarantee_name: string;
  guarantee_type: string;
  guarantee_number: string;
  file_location: string;
  input_date: string;
  unit_id?: number | null;
}
```

#### GuaranteeStats
```typescript
interface GuaranteeStats {
  total: number;
  by_status: {
    available: number;
    dipinjam: number;
    lunas: number;
  };
  by_type: {
    BPKB: number;
    SHM: number;
    SHGB: number;
    'E-SHM': number;
  };
}
```

#### Unit
```typescript
interface Unit {
  id: number;
  code: string;
  name: string;
  description?: string;
  location?: string;
  is_active: boolean;
}
```

---

## 🗄️ Database Models & Migrations

### Models Location
`app/Models_jaminan/`

### 1. Guarantee Model
**File:** `app/Models_jaminan/Guarantee.php`

**Table:** `guarantees`

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint | Primary Key |
| `spk_number` | varchar | No SPK (bisa duplicate) |
| `cif_number` | varchar | No CIF customer |
| `spk_name` | varchar | Atas nama SPK |
| `credit_period` | varchar | Jangka waktu kredit |
| `guarantee_name` | varchar | Nama dokumen jaminan |
| `guarantee_type` | enum(BPKB,SHM,SHGB,E-SHM) | Tipe jaminan |
| `guarantee_number` | varchar | No identifikasi (UNIQUE) |
| `file_location` | varchar | Lokasi penyimpanan berkas |
| `status` | enum(available,dipinjam,lunas) | Status current |
| `input_date` | date | Tanggal input jaminan |
| `unit_id` | bigint (FK) | Relasi ke unit |
| `created_at` | timestamp | Created timestamp |
| `updated_at` | timestamp | Updated timestamp |
| `deleted_at` | timestamp | Soft delete |

**Relationships:**
```php
// Relasi ke Unit
public function unit() {
  return $this->belongsTo(Unit::class);
}

// Relasi ke GuaranteeLoan
public function loans() {
  return $this->hasMany(GuaranteeLoan::class);
}

// Relasi ke GuaranteeSettlement
public function settlements() {
  return $this->hasMany(GuaranteeSettlement::class);
}
```

---

### 2. GuaranteeLoan Model
**File:** `app/Models_jaminan/GuaranteeLoan.php`

**Table:** `guarantee_loans`

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint | Primary Key |
| `guarantee_id` | bigint (FK) | Relasi ke Guarantee |
| `loan_date` | date | Tanggal peminjaman |
| `borrower` | varchar | Nama peminjam |
| `purpose` | varchar | Tujuan peminjaman |
| `return_date` | date | Tanggal pengembalian |
| `condition` | varchar | Kondisi saat dikembalikan |
| `status` | enum(active,returned) | Status peminjaman |
| `notes` | text | Catatan tambahan |
| `created_at` | timestamp | Created timestamp |
| `updated_at` | timestamp | Updated timestamp |

**Relationships:**
```php
// Relasi ke Guarantee
public function guarantee() {
  return $this->belongsTo(Guarantee::class);
}
```

---

### 3. GuaranteeSettlement Model
**File:** `app/Models_jaminan/GuaranteeSettlement.php`

**Table:** `guarantee_settlements`

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint | Primary Key |
| `guarantee_id` | bigint (FK) | Relasi ke Guarantee |
| `settlement_date` | date | Tanggal settlement |
| `settlement_method` | varchar | Metode pelunasan |
| `settlement_amount` | decimal | Nominal pelunasan |
| `remarks` | text | Keterangan settlement |
| `status` | enum(pending,completed) | Status settlement |
| `created_at` | timestamp | Created timestamp |
| `updated_at` | timestamp | Updated timestamp |

---

### Migrations
**Location:** `database/migrations_jaminan/`

```
2024_11_19_000000_create_guarantees_table.php
2024_11_19_000001_create_guarantee_loans_table.php
2024_11_19_000002_create_guarantee_settlements_table.php
2024_11_25_000000_create_jaminan_users_table.php
```

**Cara Run Migrations:**
```bash
php artisan migrate --path=database/migrations_jaminan
```

---

## 🎮 Controller & Routes

### Controller Location
`app/Http/Controllers/Api_jaminan/`

### 1. GuaranteeController.php
**Endpoint Base:** `/api/guarantees`

**Methods:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/guarantees` | Get all guarantees (with pagination) |
| GET | `/api/guarantees/{id}` | Get guarantee detail |
| POST | `/api/guarantees` | Create new guarantee |
| PUT | `/api/guarantees/{id}` | Update guarantee |
| DELETE | `/api/guarantees/{id}` | Delete guarantee (soft) |
| GET | `/api/guarantees/stats` | Get guarantee statistics |
| GET | `/api/guarantees/units` | Get units list |
| GET | `/api/guarantees/type/{type}` | Get guarantees by type |

**Request/Response Examples:**

**POST /api/guarantees** (Create)
```json
{
  "spk_number": "SPK001",
  "cif_number": "12345",
  "spk_name": "PT ABC Indonesia",
  "credit_period": "24 bulan",
  "guarantee_name": "SHM Tanah Lot ABC",
  "guarantee_type": "SHM",
  "guarantee_number": "SHM-001-2024",
  "file_location": "Lemari A, Rak 3",
  "input_date": "2024-11-27",
  "unit_id": 1
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Guarantee created successfully",
  "data": {
    "id": 1,
    "spk_number": "SPK001",
    ...
  }
}
```

---

### 2. GuaranteeLoanController.php
**Endpoint Base:** `/api/guarantee-loans`

**Methods:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/guarantee-loans` | Get all loans |
| POST | `/api/guarantee-loans` | Create loan |
| GET | `/api/guarantee-loans/{id}` | Get loan detail |
| PUT | `/api/guarantee-loans/{id}` | Update loan |
| DELETE | `/api/guarantee-loans/{id}` | Delete loan |
| POST | `/api/guarantee-loans/{id}/return` | Return loan |

---

### 3. GuaranteeSettlementController.php
**Endpoint Base:** `/api/guarantee-settlements`

**Methods:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/guarantee-settlements` | Get all settlements |
| POST | `/api/guarantee-settlements` | Create settlement |
| GET | `/api/guarantee-settlements/{id}` | Get settlement detail |

---

## 🔨 Build Script untuk Jaminan

### Deskripsi
Script ini digunakan untuk mem-build **hanya komponen-komponen Jaminan** saja, tanpa seluruh aplikasi. Berguna untuk:
- Development iteratif hanya pada fitur jaminan
- Testing komponen jaminan secara isolated
- Faster build time untuk development
- Modular deployment

### Setup Awal

#### Step 1: Update package.json
Tambahkan script build di `frontend/package.json`:

```json
{
  "scripts": {
    "build": "vite build",
    "build:jaminan": "bash build-jaminan.sh",
    "dev": "vite"
  }
}
```

#### Step 2: Buat Build Script
Buat file `frontend/build-jaminan.sh`:

```bash
#!/bin/bash

# ============================================================================
# Build Script untuk Frontend Jaminan (Guarantee) Components Saja
# ============================================================================
#
# Script ini digunakan untuk mem-build hanya komponen-komponen yang
# berhubungan dengan fitur Jaminan, tidak termasuk seluruh aplikasi.
#
# Usage:
#   bash build-jaminan.sh
#   npm run build:jaminan (dari package.json)
#
# ============================================================================

echo "🔨 Memulai build untuk Jaminan Components..."
echo "=================================================="

# Set environment variables
export NODE_ENV=production

# Define colors untuk output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# 1. VALIDASI ENVIRONMENT
# ============================================================================

echo -e "${BLUE}[1/5]${NC} Validating environment..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules tidak ditemukan. Menjalankan npm install...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ npm install gagal${NC}"
        exit 1
    fi
fi

# Check if vite is installed
if ! npm list vite > /dev/null 2>&1; then
    echo -e "${RED}❌ Vite tidak terinstall. Jalankan npm install terlebih dahulu.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Environment valid${NC}"

# ============================================================================
# 2. CLEANUP DIST FOLDER
# ============================================================================

echo -e "${BLUE}[2/5]${NC} Cleaning up old builds..."

if [ -d "dist-jaminan" ]; then
    rm -rf dist-jaminan
    echo -e "${GREEN}✓ Removed old dist-jaminan folder${NC}"
else
    echo -e "${YELLOW}⚠️  dist-jaminan folder tidak ada${NC}"
fi

# ============================================================================
# 3. CREATE TEMPORARY BUILD ENTRY POINT
# ============================================================================

echo -e "${BLUE}[3/5]${NC} Creating temporary build entry point..."

# Buat file temporary index untuk guarantee components
cat > "index-jaminan.tsx" << 'ENTRYPOINT_EOF'
import React from 'react';

// ============================================================================
// Temporary Entry Point untuk Build Jaminan Components
// ============================================================================
//
// File ini hanya digunakan sebagai entry point untuk build guarantee
// components. File ini akan dihapus setelah build selesai.
//
// Components yang di-export:
// - GuaranteeDashboard
// - GuaranteeList
// - GuaranteeInputForm
// - GuaranteeDetail
// - GuaranteeLoaning
// - GuaranteeReturn
// - GuaranteeSettlement
// - GuaranteeReportExport
//

import GuaranteeDashboard from './components/GuaranteeDashboard';
import GuaranteeList from './components/GuaranteeList';
import GuaranteeInputForm from './components/GuaranteeInputForm';
import GuaranteeDetail from './components/GuaranteeDetail';
import GuaranteeLoaning from './components/GuaranteeLoaning';
import GuaranteeReturn from './components/GuaranteeReturn';
import GuaranteeSettlement from './components/GuaranteeSettlement';
import GuaranteeReportExport from './components/GuaranteeReportExport';

// Re-export semua guarantee components
export {
  GuaranteeDashboard,
  GuaranteeList,
  GuaranteeInputForm,
  GuaranteeDetail,
  GuaranteeLoaning,
  GuaranteeReturn,
  GuaranteeSettlement,
  GuaranteeReportExport,
};

// Root component untuk testing
const App = () => (
  <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
    <h1>✅ Guarantee Components Bundle</h1>
    <p>Build berhasil - Ini adalah bundel khusus untuk komponen-komponen Jaminan</p>
    <ul>
      <li>GuaranteeDashboard</li>
      <li>GuaranteeList</li>
      <li>GuaranteeInputForm</li>
      <li>GuaranteeDetail</li>
      <li>GuaranteeLoaning</li>
      <li>GuaranteeReturn</li>
      <li>GuaranteeSettlement</li>
      <li>GuaranteeReportExport</li>
    </ul>
  </div>
);

export default App;
ENTRYPOINT_EOF

echo -e "${GREEN}✓ Created temporary entry point: index-jaminan.tsx${NC}"

# ============================================================================
# 4. BUILD COMPONENTS
# ============================================================================

echo -e "${BLUE}[4/5]${NC} Building Jaminan components..."

# Jalankan vite build dengan custom config
npx vite build \
    --config vite.config.ts \
    --outDir dist-jaminan \
    index-jaminan.tsx \
    2>&1

BUILD_STATUS=$?

# Hapus temporary entry point file
rm -f index-jaminan.tsx

if [ $BUILD_STATUS -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build completed successfully${NC}"

# ============================================================================
# 5. CLEANUP & SUMMARY
# ============================================================================

echo -e "${BLUE}[5/5]${NC} Generating summary..."

# Generate build summary
BUILD_SIZE=$(du -sh dist-jaminan 2>/dev/null | cut -f1)
FILE_COUNT=$(find dist-jaminan -type f 2>/dev/null | wc -l)

echo ""
echo "=================================================="
echo -e "${GREEN}✅ BUILD BERHASIL!${NC}"
echo "=================================================="
echo ""
echo -e "${BLUE}Build Summary:${NC}"
echo "  • Output Directory: dist-jaminan/"
echo "  • Total Size: ${BUILD_SIZE}"
echo "  • Total Files: ${FILE_COUNT}"
echo ""
echo -e "${BLUE}Components Built:${NC}"
echo "  ✓ GuaranteeDashboard"
echo "  ✓ GuaranteeList"
echo "  ✓ GuaranteeInputForm"
echo "  ✓ GuaranteeDetail"
echo "  ✓ GuaranteeLoaning"
echo "  ✓ GuaranteeReturn"
echo "  ✓ GuaranteeSettlement"
echo "  ✓ GuaranteeReportExport"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Cek hasil build di folder: dist-jaminan/"
echo "  2. Files dapat diintegrasikan ke bagian Jaminan aplikasi"
echo "  3. Untuk deployment, copy isi dist-jaminan ke server"
echo ""

exit 0
```

### Cara Menjalankan Build

#### Option 1: Menggunakan NPM Script
```bash
cd frontend
npm run build:jaminan
```

#### Option 2: Menjalankan Script Langsung
```bash
cd frontend
bash build-jaminan.sh
```

#### Option 3: Menggunakan Windows Batch (build-jaminan.bat)
Buat file `frontend/build-jaminan.bat` untuk Windows:

```batch
@echo off
REM ============================================================================
REM Build Script untuk Frontend Jaminan (Guarantee) Components - Windows Version
REM ============================================================================

echo.
echo 🔨 Memulai build untuk Jaminan Components...
echo ==================================================

setlocal enabledelayedexpansion

set NODE_ENV=production

REM Check node_modules
if not exist "node_modules" (
    echo ⚠️  node_modules tidak ditemukan. Menjalankan npm install...
    call npm install
    if errorlevel 1 (
        echo ❌ npm install gagal
        exit /b 1
    )
)

REM Check vite
npm list vite >nul 2>&1
if errorlevel 1 (
    echo ❌ Vite tidak terinstall
    exit /b 1
)

echo ✓ Environment valid

REM Cleanup old dist
if exist "dist-jaminan" (
    echo [2/5] Cleaning up old builds...
    rmdir /s /q dist-jaminan
    echo ✓ Removed old dist-jaminan folder
)

REM Create temporary entry point
echo [3/5] Creating temporary build entry point...

(
    echo import React from 'react';
    echo.
    echo import GuaranteeDashboard from './components/GuaranteeDashboard';
    echo import GuaranteeList from './components/GuaranteeList';
    echo import GuaranteeInputForm from './components/GuaranteeInputForm';
    echo import GuaranteeDetail from './components/GuaranteeDetail';
    echo import GuaranteeLoaning from './components/GuaranteeLoaning';
    echo import GuaranteeReturn from './components/GuaranteeReturn';
    echo import GuaranteeSettlement from './components/GuaranteeSettlement';
    echo import GuaranteeReportExport from './components/GuaranteeReportExport';
    echo.
    echo export {
    echo   GuaranteeDashboard,
    echo   GuaranteeList,
    echo   GuaranteeInputForm,
    echo   GuaranteeDetail,
    echo   GuaranteeLoaning,
    echo   GuaranteeReturn,
    echo   GuaranteeSettlement,
    echo   GuaranteeReportExport,
    echo };
    echo.
    echo const App = ^(^) =^> ^(
    echo   ^<div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}^>
    echo     ^<h1^>✅ Guarantee Components Bundle^</h1^>
    echo     ^<p^>Build berhasil - Bundel komponen Jaminan^</p^>
    echo   ^</div^>
    echo ^);
    echo.
    echo export default App;
) > index-jaminan.tsx

echo ✓ Created temporary entry point

REM Build
echo [4/5] Building Jaminan components...

call npx vite build --config vite.config.ts --outDir dist-jaminan index-jaminan.tsx

if errorlevel 1 (
    echo ❌ Build failed
    del index-jaminan.tsx
    exit /b 1
)

del index-jaminan.tsx

echo ✓ Build completed

REM Summary
echo.
echo ==================================================
echo ✅ BUILD BERHASIL!
echo ==================================================
echo.
echo Build Summary:
echo   • Output Directory: dist-jaminan/
echo.
echo Components Built:
echo   ✓ GuaranteeDashboard
echo   ✓ GuaranteeList
echo   ✓ GuaranteeInputForm
echo   ✓ GuaranteeDetail
echo   ✓ GuaranteeLoaning
echo   ✓ GuaranteeReturn
echo   ✓ GuaranteeSettlement
echo   ✓ GuaranteeReportExport
echo.

endlocal
exit /b 0
```

### Output Build
Setelah build berhasil, struktur direktori:

```
frontend/
├── dist-jaminan/
│   ├── index.html
│   ├── assets/
│   │   ├── index-[hash].js    # Main bundle
│   │   └── index-[hash].css   # Styles
│   └── ...
```

### Menggunakan Build Output
Hasil build dapat diintegrasikan dengan:

```typescript
// Import compiled components
import * as GuaranteeComponents from './dist-jaminan/assets/index-[hash].js';

// Atau copy dist-jaminan ke folder public untuk serving
// dan reference via CDN
```

---

## 🧪 Testing & Development

### Development Setup

```bash
# Install dependencies
cd frontend
npm install

# Start development server
npm run dev

# Dev server akan berjalan di http://localhost:3000
```

### Testing Guarantee Components

#### 1. Unit Testing (Optional Setup)
```bash
# Install testing libraries
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest

# Create test file: GuaranteeList.test.tsx
# Run tests
npm run test
```

#### 2. Manual Testing Checklist

**Dashboard:**
- [ ] Statistik jaminan menampilkan dengan benar
- [ ] Filter unit berfungsi
- [ ] Chart tampil dengan baik
- [ ] Auto-refresh setiap 5 menit

**List:**
- [ ] Search SPK number berfungsi
- [ ] Search CIF number berfungsi
- [ ] Filter unit berfungsi
- [ ] Sorting asc/desc berfungsi
- [ ] Modal add/edit berfungsi
- [ ] Detail view berfungsi

**Input Form:**
- [ ] Validasi field berfungsi
- [ ] Alphanumeric validation untuk SPK
- [ ] Numeric validation untuk CIF
- [ ] Unit selection opsional

**API Integration:**
- [ ] Token authentication working
- [ ] Error handling berfungsi
- [ ] Pagination working
- [ ] Response mapping to TypeScript interfaces

---

## 📤 Deployment Guide

### Pre-deployment Checklist

- [ ] Build script berhasil dijalankan
- [ ] Tidak ada console errors
- [ ] Testing manual semua features
- [ ] Environment variables correct
- [ ] API endpoints production-ready

### Deployment Steps

#### 1. Production Build
```bash
cd frontend
npm run build:jaminan
```

#### 2. Copy Output
```bash
# Copy dist-jaminan ke server/CDN
cp -r dist-jaminan/* /var/www/html/guarantee-assets/
```

#### 3. Update Routes
Jika menggunakan routing terpisah, update configuration:

```typescript
// routes.ts atau App.tsx
import GuaranteeList from './dist-jaminan/components/GuaranteeList';
import GuaranteeDashboard from './dist-jaminan/components/GuaranteeDashboard';
```

#### 4. Environment Variables
Pastikan API endpoints correct di production:

```env
VITE_API_BASE_URL=https://api.production.com
VITE_GUARANTEE_ENDPOINT=/api/v1/guarantees
```

---

## 📝 Summary File Structure

### File-file Jaminan yang Penting

**Frontend:**
1. ✅ `frontend/components/GuaranteeDashboard.tsx` - Dashboard view
2. ✅ `frontend/components/GuaranteeList.tsx` - List & CRUD
3. ✅ `frontend/components/GuaranteeInputForm.tsx` - Form
4. ✅ `frontend/components/GuaranteeDetail.tsx` - Detail view
5. ✅ `frontend/components/GuaranteeLoaning.tsx` - Loan management
6. ✅ `frontend/components/GuaranteeReturn.tsx` - Return form
7. ✅ `frontend/components/GuaranteeSettlement.tsx` - Settlement form
8. ✅ `frontend/components/GuaranteeReportExport.tsx` - Export
9. ✅ `frontend/components_jaminan/` - Responsive versions (same files)
10. ✅ `frontend/services/api.ts` - API functions
11. ✅ `frontend/utils/guaranteeExportUtils.ts` - Export utilities
12. ✅ `frontend/types.ts` - TypeScript interfaces

**Backend:**
1. ✅ `app/Http/Controllers/Api_jaminan/GuaranteeController.php`
2. ✅ `app/Http/Controllers/Api_jaminan/GuaranteeLoanController.php`
3. ✅ `app/Http/Controllers/Api_jaminan/GuaranteeSettlementController.php`
4. ✅ `app/Models_jaminan/Guarantee.php`
5. ✅ `app/Models_jaminan/GuaranteeLoan.php`
6. ✅ `app/Models_jaminan/GuaranteeSettlement.php`

**Database:**
1. ✅ `database/migrations_jaminan/` (4 migration files)

---

## 🎯 Kesimpulan

Dokumentasi ini mencakup:
- ✅ Struktur lengkap modul jaminan
- ✅ Dokumentasi setiap komponen
- ✅ API reference lengkap
- ✅ Database schema
- ✅ Build script untuk jaminan saja
- ✅ Testing & deployment guide

Untuk pertanyaan lebih lanjut atau update, silahkan update dokumentasi ini sesuai kebutuhan.

**Last Updated:** 2024-11-27
**Version:** 1.0

---

