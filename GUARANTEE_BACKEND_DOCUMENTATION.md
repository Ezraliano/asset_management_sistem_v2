# Dokumentasi Backend Fitur Jaminan Asset

## Daftar Isi
1. [Overview](#overview)
2. [Struktur Database](#struktur-database)
3. [File-file yang Dibuat](#file-file-yang-dibuat)
4. [Instalasi dan Migrasi](#instalasi-dan-migrasi)
5. [API Endpoints](#api-endpoints)
6. [Contoh Request/Response](#contoh-requestresponse)
7. [Frontend Integration](#frontend-integration)

---

## Overview

Sistem Jaminan Asset adalah fitur untuk mengelola data jaminan aset (BPKB, SHM, SHGB) di database terpisah (`asset_jaminan`) untuk membedakan dengan sistem manajemen aset utama.

**Fitur Utama:**
- CRUD operations untuk data jaminan
- Filter berdasarkan tipe jaminan, nomor SPK, dan nomor CIF
- Statistik jaminan
- Database terpisah menggunakan multi-database connection

---

## Struktur Database

### Tabel: `guarantees`

```sql
CREATE TABLE guarantees (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    spk_number VARCHAR(255) UNIQUE NOT NULL,           -- Nomor SPK (unik)
    cif_number VARCHAR(255) NOT NULL,                  -- Nomor CIF
    spk_name VARCHAR(255) NOT NULL,                    -- Atas Nama SPK
    credit_period VARCHAR(255) NOT NULL,               -- Jangka Waktu Kredit
    guarantee_name VARCHAR(255) NOT NULL,              -- Atas Nama Jaminan
    guarantee_type ENUM('BPKB', 'SHM', 'SHGB') NOT NULL, -- Tipe Jaminan
    guarantee_number VARCHAR(255) NOT NULL,            -- No Jaminan
    file_location VARCHAR(255) NOT NULL,               -- Lokasi Berkas
    input_date DATE NOT NULL,                          -- Tanggal Input
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,

    -- Indexes
    INDEX idx_spk_number (spk_number),
    INDEX idx_cif_number (cif_number),
    INDEX idx_guarantee_type (guarantee_type),
    INDEX idx_input_date (input_date)
);
```

**Database Connection:** `mysql_jaminan` (terhubung ke database `asset_jaminan`)

---

## File-file yang Dibuat

### 1. Migration
**File:** `database/migrations_jaminan/2024_11_19_000000_create_guarantees_table.php`
- Membuat tabel `guarantees` di database `asset_jaminan`
- Menambahkan indexes untuk performa query

### 2. Model
**File:** `app/Models/Guarantee.php`
- Connection: `mysql_jaminan`
- Fillable fields: semua field jaminan
- Scopes untuk filtering:
  - `byType($type)` - Filter by guarantee type
  - `bySpkNumber($spkNumber)` - Filter by SPK number
  - `byCifNumber($cifNumber)` - Filter by CIF number
  - `byDateRange($startDate, $endDate)` - Filter by date range
  - `latest()` - Order by input_date DESC

### 3. Controller
**File:** `app/Http/Controllers/Api_jaminan/GuaranteeController.php`
- Methods:
  - `index()` - List all guarantees with filtering & pagination
  - `store()` - Create new guarantee
  - `show($id)` - Get specific guarantee
  - `update($id)` - Update guarantee
  - `destroy($id)` - Delete guarantee
  - `getByType($type)` - Get guarantees by type
  - `getBySpk($spkNumber)` - Get guarantees by SPK number
  - `getStats()` - Get statistics

### 4. Routes Configuration
**File:** `routes/api.php`
- Import: `use App\Http\Controllers\Api_jaminan\GuaranteeController;`
- Routes added ke protected routes dengan middleware `role:admin,unit`

### 5. Database Configuration
**File:** `config/database.php`
- Tambahan connection: `mysql_jaminan`
- Menggunakan environment variables: `DB_CONNECTION_2`, `DB_HOST_2`, `DB_PORT_2`, `DB_DATABASE_2`, `DB_USERNAME_2`, `DB_PASSWORD_2`

---

## Instalasi dan Migrasi

### Langkah 1: Verifikasi .env
Pastikan file `.env` sudah memiliki konfigurasi:

```env
DB_CONNECTION_2=mysql
DB_HOST_2=127.0.0.1
DB_PORT_2=3306
DB_DATABASE_2=asset_jaminan
DB_USERNAME_2=root
DB_PASSWORD_2=
```

### Langkah 2: Buat Database
Jika belum ada, buat database `asset_jaminan` via phpMyAdmin atau command:

```sql
CREATE DATABASE asset_jaminan CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Langkah 3: Jalankan Migration
```bash
php artisan migrate --path=database/migrations_jaminan --database=mysql_jaminan
```

### Langkah 4: Verifikasi
```bash
php artisan tinker
>>> DB::connection('mysql_jaminan')->table('guarantees')->count()
```

---

## API Endpoints

### Authentikasi
Semua endpoint memerlukan authentication token (Sanctum) dan role `admin` atau `unit`

Header yang diperlukan:
```
Authorization: Bearer {token}
Accept: application/json
```

---

### 1. List All Guarantees
**GET** `/api/guarantees`

**Query Parameters (opsional):**
```
guarantee_type=BPKB          // Filter by type
spk_number=12345             // Filter by SPK number
cif_number=67890             // Filter by CIF number
start_date=2024-01-01        // Filter from date
end_date=2024-12-31          // Filter to date
sort_by=input_date           // Sort field (default: input_date)
sort_order=desc              // Sort order: asc|desc (default: desc)
per_page=15                  // Pagination per page (default: 15)
page=1                       // Page number
```

**Response Success (200):**
```json
{
    "success": true,
    "message": "Data jaminan berhasil diambil",
    "data": [
        {
            "id": 1,
            "spk_number": "SPK2024001",
            "cif_number": "CIF123456",
            "spk_name": "PT ABC Jaya",
            "credit_period": "24 bulan",
            "guarantee_name": "Budi Santoso",
            "guarantee_type": "BPKB",
            "guarantee_number": "MH1234567890",
            "file_location": "Lemari A, Rak 3",
            "input_date": "2024-11-19",
            "created_at": "2024-11-19T10:30:00",
            "updated_at": "2024-11-19T10:30:00"
        }
    ],
    "pagination": {
        "total": 100,
        "per_page": 15,
        "current_page": 1,
        "last_page": 7,
        "from": 1,
        "to": 15
    }
}
```

---

### 2. Create New Guarantee
**POST** `/api/guarantees`

**Request Body:**
```json
{
    "spk_number": "SPK2024001",
    "cif_number": "CIF123456",
    "spk_name": "PT ABC Jaya",
    "credit_period": "24 bulan",
    "guarantee_name": "Budi Santoso",
    "guarantee_type": "BPKB",
    "guarantee_number": "MH1234567890",
    "file_location": "Lemari A, Rak 3",
    "input_date": "2024-11-19"
}
```

**Response Success (201):**
```json
{
    "success": true,
    "message": "Jaminan berhasil disimpan",
    "data": {
        "id": 1,
        "spk_number": "SPK2024001",
        "cif_number": "CIF123456",
        "spk_name": "PT ABC Jaya",
        "credit_period": "24 bulan",
        "guarantee_name": "Budi Santoso",
        "guarantee_type": "BPKB",
        "guarantee_number": "MH1234567890",
        "file_location": "Lemari A, Rak 3",
        "input_date": "2024-11-19",
        "created_at": "2024-11-19T10:30:00",
        "updated_at": "2024-11-19T10:30:00"
    }
}
```

**Response Error (422):**
```json
{
    "success": false,
    "message": "Validasi gagal",
    "errors": {
        "spk_number": ["No SPK harus unik"],
        "guarantee_type": ["Tipe Jaminan harus salah satu dari: BPKB, SHM, SHGB"]
    }
}
```

---

### 3. Get Single Guarantee
**GET** `/api/guarantees/{id}`

**Response Success (200):**
```json
{
    "success": true,
    "message": "Data jaminan berhasil diambil",
    "data": {
        "id": 1,
        "spk_number": "SPK2024001",
        ...
    }
}
```

---

### 4. Update Guarantee
**PUT/PATCH** `/api/guarantees/{id}`

**Request Body (semua field opsional):**
```json
{
    "guarantee_name": "Budi Santoso Updated",
    "file_location": "Lemari B, Rak 1"
}
```

**Response Success (200):**
```json
{
    "success": true,
    "message": "Jaminan berhasil diperbarui",
    "data": { ... }
}
```

---

### 5. Delete Guarantee
**DELETE** `/api/guarantees/{id}`

**Response Success (200):**
```json
{
    "success": true,
    "message": "Jaminan berhasil dihapus"
}
```

---

### 6. Get by Type
**GET** `/api/guarantees/by-type/{type}`

**Path Parameter:**
- `type`: `BPKB` | `SHM` | `SHGB`

**Response Success (200):**
```json
{
    "success": true,
    "message": "Data jaminan tipe BPKB berhasil diambil",
    "data": [ ... ]
}
```

---

### 7. Get by SPK Number
**GET** `/api/guarantees/by-spk/{spkNumber}`

**Response Success (200):**
```json
{
    "success": true,
    "message": "Data jaminan SPK SPK2024001 berhasil diambil",
    "data": [ ... ]
}
```

**Response Not Found (404):**
```json
{
    "success": false,
    "message": "Data jaminan dengan nomor SPK SPK2024001 tidak ditemukan"
}
```

---

### 8. Get Statistics
**GET** `/api/guarantees/stats`

**Response Success (200):**
```json
{
    "success": true,
    "message": "Statistik jaminan berhasil diambil",
    "data": {
        "total": 150,
        "by_type": {
            "BPKB": 80,
            "SHM": 50,
            "SHGB": 20
        },
        "total_spk": 120,
        "latest_input": "2024-11-19"
    }
}
```

---

## Contoh Request/Response

### cURL Example
```bash
# Get all guarantees
curl -X GET "http://localhost:8000/api/guarantees" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json"

# Create new guarantee
curl -X POST "http://localhost:8000/api/guarantees" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "spk_number": "SPK2024001",
    "cif_number": "CIF123456",
    "spk_name": "PT ABC Jaya",
    "credit_period": "24 bulan",
    "guarantee_name": "Budi Santoso",
    "guarantee_type": "BPKB",
    "guarantee_number": "MH1234567890",
    "file_location": "Lemari A, Rak 3",
    "input_date": "2024-11-19"
  }'

# Get guarantees by type
curl -X GET "http://localhost:8000/api/guarantees/by-type/BPKB" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json"
```

---

## Frontend Integration

### Mengintegrasikan dengan Frontend React

#### 1. Membuat API Service
```typescript
// services/guaranteeApi.ts
import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';

export const guaranteeApi = {
    // List all
    getAll: (params?: any) =>
        axios.get(`${API_BASE}/guarantees`, { params }),

    // Create
    create: (data: any) =>
        axios.post(`${API_BASE}/guarantees`, data),

    // Get single
    get: (id: number) =>
        axios.get(`${API_BASE}/guarantees/${id}`),

    // Update
    update: (id: number, data: any) =>
        axios.put(`${API_BASE}/guarantees/${id}`, data),

    // Delete
    delete: (id: number) =>
        axios.delete(`${API_BASE}/guarantees/${id}`),

    // Get by type
    getByType: (type: string) =>
        axios.get(`${API_BASE}/guarantees/by-type/${type}`),

    // Get by SPK
    getBySpk: (spkNumber: string) =>
        axios.get(`${API_BASE}/guarantees/by-spk/${spkNumber}`),

    // Get stats
    getStats: () =>
        axios.get(`${API_BASE}/guarantees/stats`)
};
```

#### 2. Update GuaranteeInputForm Component
```typescript
// components/GuaranteeInputForm.tsx
import { guaranteeApi } from '../services/guaranteeApi';

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
        setError('Mohon perbaiki kesalahan pada form');
        return;
    }

    try {
        setLoading(true);

        if (guarantee) {
            // Update
            await guaranteeApi.update(guarantee.id, formData);
        } else {
            // Create - set input_date otomatis ke hari ini
            const dataWithDate = {
                ...formData,
                input_date: new Date().toISOString().split('T')[0]
            };
            await guaranteeApi.create(dataWithDate);
        }

        onSuccess();
    } catch (err: any) {
        console.error('Error saving guarantee:', err);
        setError(err.response?.data?.message || 'Gagal menyimpan jaminan');
    } finally {
        setLoading(false);
    }
};
```

#### 3. Update GuaranteeList Component
```typescript
// components/GuaranteeList.tsx
import { guaranteeApi } from '../services/guaranteeApi';

const [guarantees, setGuarantees] = useState([]);

useEffect(() => {
    fetchGuarantees();
}, []);

const fetchGuarantees = async () => {
    try {
        const response = await guaranteeApi.getAll({ per_page: 15 });
        setGuarantees(response.data.data);
    } catch (err) {
        console.error('Error fetching guarantees:', err);
    }
};

const handleDelete = async (id: number) => {
    if (confirm('Apakah Anda yakin?')) {
        try {
            await guaranteeApi.delete(id);
            fetchGuarantees(); // Refresh list
        } catch (err) {
            console.error('Error deleting guarantee:', err);
        }
    }
};
```

---

## Troubleshooting

### Error: "Cannot find table guarantees"
**Solusi:** Pastikan migration sudah dijalankan:
```bash
php artisan migrate --path=database/migrations_jaminan --database=mysql_jaminan
```

### Error: "Connection 'mysql_jaminan' not configured"
**Solusi:** Verifikasi konfigurasi di `config/database.php` dan environment variables di `.env`

### Error: "SQLSTATE[HY000] [1045] Access denied"
**Solusi:** Verifikasi kredensial database di `.env`:
```env
DB_USERNAME_2=root
DB_PASSWORD_2=  # atau password jika ada
```

---

## Best Practices

1. **Selalu validasi input** di frontend sebelum submit
2. **Gunakan pagination** untuk list data yang besar
3. **Implement error handling** di frontend untuk user experience lebih baik
4. **Cache statistik** jika data jarang berubah
5. **Gunakan transactions** untuk operasi multi-step

---

## Versi
- **Dibuat:** 19 November 2024
- **Laravel Version:** 11.x
- **PHP Version:** 8.2+
- **Database:** MySQL 5.7+
