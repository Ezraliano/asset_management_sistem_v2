# Dokumentasi Perbaikan Fitur Input Jaminan (Guarantee)

## Daftar Isi
1. [Ringkasan Masalah](#ringkasan-masalah)
2. [Analisis Detail](#analisis-detail)
3. [Penyebab Root Cause](#penyebab-root-cause)
4. [Solusi yang Diterapkan](#solusi-yang-diterapkan)
5. [Struktur Arsitektur Multi-Database](#struktur-arsitektur-multi-database)
6. [Testing & Verifikasi](#testing--verifikasi)

---

## Ringkasan Masalah

### Status Masalah
**Status:** ✅ FIXED
**Tanggal Perbaikan:** 19 November 2024
**Deskripsi:** User tidak dapat menginput data jaminan (guarantee) melalui aplikasi, padahal database sudah terkoneksi dengan baik.

### Error Message
```
Gagal menyimpan jaminan: Database connection [asset_jaminan] not configured.
```

### Dampak
- Fitur input jaminan tidak berfungsi sama sekali
- User tidak bisa membuat data jaminan baru
- Fitur update dan list jaminan juga terpengaruh

---

## Analisis Detail

### Struktur Proyek
Proyek menggunakan **Multi-Database Architecture** dengan 2 database terpisah:

#### Database 1: Asset Management (Default)
- **Database Name:** `asset_management_db`
- **Connection Name:** `mysql`
- **Fungsi:** Menyimpan data asset, maintenance, loan, etc.

#### Database 2: Guarantee (Jaminan)
- **Database Name:** `asset_jaminan`
- **Connection Name:** `mysql_jaminan`
- **Fungsi:** Menyimpan data jaminan/guarantee khusus

### Struktur Folder untuk Jaminan

```
app/
├── Http/Controllers/
│   └── Api_jaminan/
│       └── GuaranteeController.php        ✅ DIPERBAIKI
│
└── Models_jaminan/
    └── Guarantee.php                       ✅ SUDAH BENAR

database/
└── migrations_jaminan/
    └── 2024_11_19_000000_create_guarantees_table.php

frontend/
└── components/
    ├── GuaranteeInputForm.tsx              ✅ SUDAH BENAR
    └── GuaranteeList.tsx                   ✅ SUDAH BENAR

routes/
└── api.php                                  ✅ SUDAH BENAR

config/
└── database.php                             ✅ SUDAH BENAR
```

---

## Penyebab Root Cause

### Lokasi File Bermasalah
**File:** `app/Http/Controllers/Api_jaminan/GuaranteeController.php`

### Masalah Spesifik

#### ❌ SEBELUM PERBAIKAN (Line 81)
```php
public function store(Request $request)
{
    try {
        // Validasi input
        $validated = $request->validate([
            'spk_number' => 'required|string|max:255|unique:asset_jaminan.guarantees,spk_number',
            //                                                    ^^^^^^^^^^^^^^
            //                                        SALAH! Menggunakan database name
            'cif_number' => 'required|string|max:255',
            'spk_name' => 'required|string|max:255',
            'credit_period' => 'required|string|max:255',
            'guarantee_name' => 'required|string|max:255',
            'guarantee_type' => 'required|in:BPKB,SHM,SHGB',
            'guarantee_number' => 'required|string|max:255',
            'file_location' => 'required|string|max:255',
            'input_date' => 'required|date',
        ]);

        // Create guarantee
        $guarantee = Guarantee::create($validated);
        ...
    }
}
```

#### ❌ SEBELUM PERBAIKAN (Line 161)
```php
public function update(Request $request, $id)
{
    try {
        $guarantee = Guarantee::find($id);

        if (!$guarantee) {
            return response()->json([
                'success' => false,
                'message' => 'Data jaminan tidak ditemukan'
            ], Response::HTTP_NOT_FOUND);
        }

        // Validasi input
        $validated = $request->validate([
            'spk_number' => 'sometimes|required|string|max:255|unique:asset_jaminan.guarantees,spk_number,' . $id,
            //                                                    ^^^^^^^^^^^^^^
            //                                        SALAH! Menggunakan database name
            'cif_number' => 'sometimes|required|string|max:255',
            ...
        ]);
        ...
    }
}
```

### Penjelasan Error

**Konfigurasi di `config/database.php` (BENAR):**
```php
'mysql_jaminan' => [
    'driver' => env('DB_CONNECTION_2', 'mysql'),
    'host' => env('DB_HOST_2', '127.0.0.1'),
    'port' => env('DB_PORT_2', '3306'),
    'database' => env('DB_DATABASE_2', 'asset_jaminan'),  // ← Database name
    'username' => env('DB_USERNAME_2', 'root'),
    'password' => env('DB_PASSWORD_2', ''),
    ...
]
```

**Perbedaan Konsep:**
- **Connection Name:** `mysql_jaminan` → Nama koneksi yang didaftarkan di Laravel
- **Database Name:** `asset_jaminan` → Nama database fisik di MySQL

**Error Terjadi Karena:**
1. Rule validasi `unique:asset_jaminan.guarantees,spk_number` mencoba mereferensikan connection `asset_jaminan`
2. Padahal connection yang terdaftar di config adalah `mysql_jaminan`, BUKAN `asset_jaminan`
3. Laravel throw exception: "Database connection [asset_jaminan] not configured"

**Analogi:**
```
// ❌ SALAH - Seperti mencari pintu bernama "kamar tidur" padahal nama pintu adalah "pintu-utara"
'unique:asset_jaminan.guarantees,spk_number'

// ✅ BENAR - Menggunakan nama koneksi yang sudah terdaftar
'unique:mysql_jaminan.guarantees,spk_number'
```

---

## Solusi yang Diterapkan

### Perubahan 1: Method `store()` - Line 81

**Sebelum:**
```php
'spk_number' => 'required|string|max:255|unique:asset_jaminan.guarantees,spk_number',
```

**Sesudah:**
```php
'spk_number' => 'required|string|max:255|unique:mysql_jaminan.guarantees,spk_number',
```

**Alasan:** Mengubah referensi dari database name (`asset_jaminan`) menjadi connection name (`mysql_jaminan`).

### Perubahan 2: Method `update()` - Line 161

**Sebelum:**
```php
'spk_number' => 'sometimes|required|string|max:255|unique:asset_jaminan.guarantees,spk_number,' . $id,
```

**Sesudah:**
```php
'spk_number' => 'sometimes|required|string|max:255|unique:mysql_jaminan.guarantees,spk_number,' . $id,
```

**Alasan:** Sama seperti perubahan di method `store()`, memastikan konsistensi penggunaan connection name.

### Verifikasi Konfigurasi Lain

✅ **Model Guarantee** (`app/Models_jaminan/Guarantee.php`):
```php
protected $connection = 'mysql_jaminan';  // ✅ BENAR
protected $table = 'guarantees';
```

✅ **Migration** (`database/migrations_jaminan/2024_11_19_000000_create_guarantees_table.php`):
```php
Schema::connection('mysql_jaminan')->create('guarantees', function (Blueprint $table) {
    // ✅ BENAR - Menggunakan connection name
    ...
});
```

✅ **Routes** (`routes/api.php:240-246`):
```php
Route::middleware('role:super-admin,admin,unit')->group(function () {
    Route::apiResource('guarantees', GuaranteeController::class);
    Route::get('/guarantees/stats', [GuaranteeController::class, 'getStats']);
    Route::get('/guarantees/by-type/{type}', [GuaranteeController::class, 'getByType']);
    Route::get('/guarantees/by-spk/{spkNumber}', [GuaranteeController::class, 'getBySpk']);
    // ✅ BENAR - Routes sudah terdaftar dengan baik
});
```

✅ **Frontend API** (`frontend/services/api.ts:2067-2079`):
```typescript
export const addGuarantee = async (data: GuaranteeFormData): Promise<Guarantee | null> => {
  try {
    const response = await apiRequest('/guarantees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const result = handleApiResponse<any>(response);
    return result.data || result;
  } catch (error: any) {
    console.error('Error adding guarantee:', error);
    throw error;
  }
};
// ✅ BENAR - Menggunakan endpoint yang tepat
```

✅ **Frontend Component** (`frontend/components/GuaranteeInputForm.tsx:158`):
```typescript
const response = await addGuarantee(submitData);
// ✅ BENAR - Mengimpor dan menggunakan function yang benar
```

---

## Struktur Arsitektur Multi-Database

### Diagram Arsitektur

```
┌─────────────────────────────────────────────────────────────────┐
│                    Laravel Application                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────┐   ┌──────────────────────────┐   │
│  │   Asset Management API   │   │   Guarantee API          │   │
│  │  (Api/AssetController)   │   │ (Api_jaminan/Guarantee)  │   │
│  └────────────┬─────────────┘   └────────────┬─────────────┘   │
│               │                                │                 │
│               v                                v                 │
│  ┌──────────────────────────┐   ┌──────────────────────────┐   │
│  │  Models/Asset            │   │  Models_jaminan/         │   │
│  │  connection: 'mysql'     │   │  Guarantee               │   │
│  │                          │   │  connection: mysql_jaminan   │
│  └────────────┬─────────────┘   └────────────┬─────────────┘   │
│               │                                │                 │
│               v                                v                 │
│  ┌──────────────────────────┐   ┌──────────────────────────┐   │
│  │   Config Database        │   │   Config Database        │   │
│  │   Connection: 'mysql'    │   │ Connection: mysql_jaminan    │
│  └────────────┬─────────────┘   └────────────┬─────────────┘   │
│               │                                │                 │
│               v                                v                 │
│  ┌──────────────────────────┐   ┌──────────────────────────┐   │
│  │   MySQL Database         │   │   MySQL Database         │   │
│  │   asset_management_db    │   │   asset_jaminan          │   │
│  │   (Default)              │   │   (Jaminan/Guarantee)    │   │
│  └──────────────────────────┘   └──────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Environment Variables (.env)

```env
# Database 1 - Asset Management (Default)
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=asset_management_db
DB_USERNAME=root
DB_PASSWORD=

# Database 2 - Guarantee/Jaminan
DB_CONNECTION_2=mysql
DB_HOST_2=127.0.0.1
DB_PORT_2=3306
DB_DATABASE_2=asset_jaminan
DB_USERNAME_2=root
DB_PASSWORD_2=
```

### Database Configuration (config/database.php)

```php
'connections' => [
    'mysql' => [
        // Connection untuk Asset Management (default)
        'driver' => 'mysql',
        'host' => env('DB_HOST', '127.0.0.1'),
        'database' => env('DB_DATABASE', 'asset_management_db'),
        ...
    ],

    'mysql_jaminan' => [
        // Connection khusus untuk Guarantee/Jaminan
        'driver' => env('DB_CONNECTION_2', 'mysql'),
        'host' => env('DB_HOST_2', '127.0.0.1'),
        'database' => env('DB_DATABASE_2', 'asset_jaminan'),
        ...
    ],
],
```

---

## Testing & Verifikasi

### Checklist Verifikasi

- [x] Database connection `mysql_jaminan` terdaftar di `config/database.php`
- [x] Model `Guarantee` menggunakan `protected $connection = 'mysql_jaminan'`
- [x] Migration menggunakan `Schema::connection('mysql_jaminan')`
- [x] GuaranteeController validasi menggunakan `unique:mysql_jaminan.guarantees,spk_number`
- [x] Routes API terdaftar dengan benar
- [x] Frontend API functions menggunakan endpoint yang tepat
- [x] Frontend components mengimpor functions yang benar

### Cara Testing

#### 1. Test Input Jaminan Baru

```bash
# Via API (Postman/cURL)
POST http://localhost:8000/api/guarantees
Content-Type: application/json
Authorization: Bearer {token}

{
  "spk_number": "112",
  "cif_number": "121",
  "spk_name": "PT Sekar Pundi",
  "credit_period": "24 Bulan",
  "guarantee_name": "Budi Santoso",
  "guarantee_type": "BPKB",
  "guarantee_number": "ABC123456",
  "file_location": "Lemari A, Rak 3",
  "input_date": "2024-11-19"
}
```

**Expected Response (Success):**
```json
{
  "success": true,
  "message": "Jaminan berhasil disimpan",
  "data": {
    "id": 1,
    "spk_number": "112",
    "cif_number": "121",
    "spk_name": "PT Sekar Pundi",
    "credit_period": "24 Bulan",
    "guarantee_name": "Budi Santoso",
    "guarantee_type": "BPKB",
    "guarantee_number": "ABC123456",
    "file_location": "Lemari A, Rak 3",
    "input_date": "2024-11-19",
    "created_at": "2024-11-19T10:00:00.000000Z",
    "updated_at": "2024-11-19T10:00:00.000000Z"
  }
}
```

#### 2. Test via Frontend UI

1. Buka aplikasi di `http://localhost:8080/jaminan`
2. Klik tombol "Input Jaminan" / "Tambah Jaminan Baru"
3. Isi form dengan data:
   - No SPK: 112
   - No CIF: 121
   - Atas Nama SPK: PT Sekar Pundi
   - Jangka Waktu Kredit: 24 Bulan
   - Atas Nama Jaminan: Budi Santoso
   - Tipe Jaminan: BPKB
   - No Jaminan: ABC123456
   - Lokasi Berkas: Lemari A, Rak 3
4. Klik "Simpan Jaminan"
5. Data seharusnya berhasil disimpan dan list jaminan terupdate

#### 3. Test Validasi Unique

```bash
# Coba input dengan spk_number yang sama
POST http://localhost:8000/api/guarantees

{
  "spk_number": "112",  # ← Sama dengan data sebelumnya
  ...
}
```

**Expected Response (Error):**
```json
{
  "success": false,
  "message": "Validasi gagal",
  "errors": {
    "spk_number": [
      "The spk number field must be unique."
    ]
  }
}
```

#### 4. Test Update Jaminan

```bash
PUT http://localhost:8000/api/guarantees/1
Content-Type: application/json
Authorization: Bearer {token}

{
  "guarantee_name": "Budi Santoso Updated",
  ...
}
```

#### 5. Test List Jaminan

```bash
GET http://localhost:8000/api/guarantees
Authorization: Bearer {token}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Data jaminan berhasil diambil",
  "data": [
    {
      "id": 1,
      "spk_number": "112",
      ...
    }
  ],
  "pagination": {
    "total": 1,
    "per_page": 15,
    "current_page": 1,
    "last_page": 1,
    "from": 1,
    "to": 1
  }
}
```

---

## File yang Dimodifikasi

### Summary of Changes

| File | Status | Perubahan |
|------|--------|-----------|
| `app/Http/Controllers/Api_jaminan/GuaranteeController.php` | ✅ MODIFIED | Line 81: `asset_jaminan` → `mysql_jaminan`<br/>Line 161: `asset_jaminan` → `mysql_jaminan` |
| `app/Models_jaminan/Guarantee.php` | ✅ OK | Tidak ada perubahan (sudah benar) |
| `database/migrations_jaminan/2024_11_19_000000_create_guarantees_table.php` | ✅ OK | Tidak ada perubahan (sudah benar) |
| `routes/api.php` | ✅ OK | Tidak ada perubahan (sudah benar) |
| `config/database.php` | ✅ OK | Tidak ada perubahan (sudah benar) |
| `frontend/services/api.ts` | ✅ OK | Tidak ada perubahan (sudah benar) |
| `frontend/components/GuaranteeInputForm.tsx` | ✅ OK | Tidak ada perubahan (sudah benar) |
| `frontend/components/GuaranteeList.tsx` | ✅ OK | Tidak ada perubahan (sudah benar) |

---

## Kesimpulan

### Masalah
Database connection error terjadi karena **mismatch antara connection name dan database name** pada validasi rule `unique` di GuaranteeController.

### Solusi
Mengubah referensi dari `asset_jaminan` (database name) menjadi `mysql_jaminan` (connection name) pada rule validasi, sehingga Laravel dapat menemukan dan menggunakan connection yang tepat.

### Hasil
✅ Fitur input jaminan sekarang berfungsi dengan normal
✅ Semua CRUD operation (Create, Read, Update, Delete) dapat dijalankan
✅ Validasi unique constraint berfungsi dengan baik
✅ Data tersimpan dengan aman di database `asset_jaminan`

### Best Practice untuk Multi-Database

1. **Selalu gunakan connection name** dalam validasi, bukan database name
   ```php
   // ✅ BENAR
   'unique:connection_name.table,column'

   // ❌ SALAH
   'unique:database_name.table,column'
   ```

2. **Pastikan Model menggunakan connection yang sesuai**
   ```php
   protected $connection = 'mysql_jaminan';
   ```

3. **Pastikan Migration menggunakan connection yang sesuai**
   ```php
   Schema::connection('mysql_jaminan')->create('table', ...);
   ```

4. **Dokumentasikan struktur multi-database** untuk referensi developer lain

---

**Dokumen ini dibuat untuk referensi dan arsip perbaikan masalah fitur Jaminan pada 19 November 2024.**
