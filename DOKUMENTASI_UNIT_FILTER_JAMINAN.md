# Dokumentasi: Implementasi Unit Filter pada Sistem Jaminan Aset

**Tanggal**: 27 November 2025
**Status**: Selesai
**Versi**: 1.0

---

## 📋 Daftar Isi
1. [Ringkasan Perubahan](#ringkasan-perubahan)
2. [Detail Implementasi](#detail-implementasi)
3. [File-File yang Diubah](#file-file-yang-diubah)
4. [Fitur Baru](#fitur-baru)
5. [API Endpoints](#api-endpoints)
6. [Cara Penggunaan](#cara-penggunaan)
7. [Data Seeder](#data-seeder)
8. [Testing & Deployment](#testing--deployment)

---

## 📝 Ringkasan Perubahan

Implementasi ini menambahkan kemampuan untuk mengelola dan memfilter data jaminan berdasarkan **Unit/Cabang**. Sistem sekarang memungkinkan pengguna untuk:

- ✅ Menyimpan informasi unit untuk setiap jaminan
- ✅ Memfilter data jaminan berdasarkan unit tertentu di dashboard
- ✅ Menampilkan statistik jaminan per unit
- ✅ Memilih unit saat input/edit data jaminan

---

## 🔧 Detail Implementasi

### 1. **Database Migration - Penambahan Kolom Unit**

**File**: `database/migrations_jaminan/2024_11_19_000000_create_guarantees_table.php`

**Perubahan**:
- Menambahkan kolom `unit` bertipe STRING dengan sifat NULLABLE
- Menambahkan index pada kolom `unit` untuk optimasi performa query

```php
$table->string('unit')->nullable()->comment('Unit/Branch identifier');
$table->index('unit');
```

**Alasan**:
- Field nullable memungkinkan data lama (tanpa unit) tetap dapat digunakan
- Index meningkatkan performa query filtering berdasarkan unit
- Dapat menyimpan berbagai format unit name (contoh: "Unit Holding", "Unit Kajoetangan", dll)

---

### 2. **Model - Tambahan Unit Field dan Scope**

**File**: `app/Models_jaminan/Guarantee.php`

**Perubahan**:
- Menambahkan `'unit'` ke dalam `$fillable` array
- Menambahkan scope method `scopeByUnit()` untuk filtering

```php
// Dalam $fillable
'unit',

// Scope untuk filter
public function scopeByUnit($query, $unit)
{
    return $query->where('unit', $unit);
}
```

**Manfaat**:
- Memudahkan mass assignment data unit
- Menyediakan query scope untuk filtering yang konsisten

---

### 3. **API Controller - Unit Filtering Support**

**File**: `app/Http/Controllers/Api_jaminan/GuaranteeController.php`

**Perubahan**:

#### a. Index Method (List Guarantees)
- Menambahkan filter unit pada query filtering
- Mendukung parameter `?unit=nama_unit` dalam request

```php
if ($request->has('unit') && $request->unit !== '') {
    $query->byUnit($request->unit);
}
```

#### b. Store Method (Create)
- Menambahkan validasi unit field (nullable)

```php
'unit' => 'nullable|string|max:255',
```

#### c. Update Method (Edit)
- Menambahkan validasi unit field untuk update

#### d. GetStats Method (Enhancements)
- Modified untuk mendukung filtering statistik berdasarkan unit
- Query cloning untuk perhitungan akurat per filter

```php
public function getStats(Request $request)
{
    $query = Guarantee::query();
    if ($request->has('unit') && $request->unit !== '') {
        $query->byUnit($request->unit);
    }
    // Statistik dihitung berdasarkan query yang sudah difilter
}
```

#### e. GetUnits Method (NEW)
- Endpoint baru untuk mendapatkan daftar unit yang tersedia
- Route: `GET /api/guarantees/units`

```php
public function getUnits()
{
    $units = Guarantee::whereNotNull('unit')
        ->distinct('unit')
        ->pluck('unit')
        ->sort()
        ->values();

    return response()->json([
        'success' => true,
        'data' => $units
    ]);
}
```

---

### 4. **Frontend API Service - Function Updates**

**File**: `frontend/services/api.ts`

**Perubahan**:

#### a. getGuaranteeStats() - Enhanced
- Sekarang menerima parameter `unit` opsional
- Mengirimkan unit ke backend untuk statistik filtered

```typescript
export const getGuaranteeStats = async (unit?: string): Promise<GuaranteeStats | null> => {
  const url = unit ? `/guarantees/stats?unit=${encodeURIComponent(unit)}` : '/guarantees/stats';
  // ...
}
```

#### b. getGuaranteeUnits() - NEW
- Mengambil daftar unit yang tersedia dari backend

```typescript
export const getGuaranteeUnits = async (): Promise<string[]> => {
  const response = await apiRequest('/guarantees/units');
  return result?.data || [];
}
```

---

### 5. **Frontend Component - Dashboard dengan Unit Filter**

**File**: `frontend/components/GuaranteeDashboard.tsx`

**Perubahan**:

#### a. State Management
- Menambahkan state untuk `selectedUnit` dan `units` list

```typescript
const [selectedUnit, setSelectedUnit] = useState<string>('');
const [units, setUnits] = useState<string[]>([]);
```

#### b. Effect Hooks
- Menambahkan useEffect untuk fetch unit list
- Modifikasi useEffect stats fetching untuk support unit filtering

#### c. UI Components
- Menambahkan dropdown filter unit di header dashboard
- Dropdown hanya tampil jika ada unit data tersedia

```jsx
{units.length > 0 && (
  <div className="ml-4">
    <label className="block text-sm font-medium text-gray-700 mb-2">Filter Unit</label>
    <select
      value={selectedUnit}
      onChange={(e) => setSelectedUnit(e.target.value)}
      className="px-3 py-2 border border-gray-300 rounded-lg..."
    >
      <option value="">Semua Unit</option>
      {units.map((unit) => (
        <option key={unit} value={unit}>{unit}</option>
      ))}
    </select>
  </div>
)}
```

**Fitur Dashboard**:
- Real-time unit selection
- Auto-refresh stats setiap 5 menit (tetap berfungsi dengan filter)
- Statistik cards, bar chart, dan donut chart semua responsive terhadap unit filter
- Dropdown "Semua Unit" untuk menampilkan data keseluruhan

---

### 6. **Frontend Component - Form Input dengan Unit Field**

**File**: `frontend/components/GuaranteeInputForm.tsx`

**Perubahan**:

#### a. Form Data Interface
- Menambahkan `unit` field ke `GuaranteeFormData`

```typescript
interface GuaranteeFormData {
  // ... fields lain
  unit?: string;
}
```

#### b. Form State
- Initialize unit dalam form data setup

#### c. Form UI
- Menambahkan input field untuk unit setelah Lokasi Berkas
- Field bersifat optional (tidak required)
- Placeholder: "e.g., Unit Holding 1, Unit Kredit 2"

```jsx
{/* Unit */}
<div>
  <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">
    Unit <span className="text-gray-500 text-xs">(Opsional)</span>
  </label>
  <input
    type="text"
    id="unit"
    name="unit"
    value={formData.unit || ''}
    onChange={handleChange}
    disabled={loading}
    className="block w-full px-3 py-2 border border-gray-300 rounded-md..."
    placeholder="e.g., Unit Holding 1, Unit Kredit 2"
  />
</div>
```

**Fitur**:
- Input text biasa (flexible, tidak strict dropdown)
- Optional field - user bisa tidak mengisi
- Data unit dikirim ke backend saat save/update

---

### 7. **Database Seeder - GuaranteeUnitSeeder**

**File**: `database/seeders/GuaranteeUnitSeeder.php` (NEW)

**Fungsi**:
- Mengisi data unit untuk semua guarantee yang sudah ada
- Menggunakan round-robin assignment dari 3 unit

```php
$units = [
    'Unit Holding',
    'Unit Kajoetangan',
    'Unit Batu',
];

// Assign units dengan round-robin
foreach ($guarantees as $index => $guarantee) {
    $unitIndex = $index % count($units);
    $guarantee->update(['unit' => $units[$unitIndex]]);
}
```

**Cara Jalankan**:
```bash
php artisan db:seed --class=GuaranteeUnitSeeder
```

---

## 📂 File-File yang Diubah

| No | File | Tipe Perubahan | Status |
|---|---|---|---|
| 1 | `database/migrations_jaminan/2024_11_19_000000_create_guarantees_table.php` | Modified | ✅ |
| 2 | `app/Models_jaminan/Guarantee.php` | Modified | ✅ |
| 3 | `app/Http/Controllers/Api_jaminan/GuaranteeController.php` | Modified | ✅ |
| 4 | `frontend/services/api.ts` | Modified | ✅ |
| 5 | `frontend/components/GuaranteeDashboard.tsx` | Modified | ✅ |
| 6 | `frontend/components/GuaranteeInputForm.tsx` | Modified | ✅ |
| 7 | `database/seeders/GuaranteeUnitSeeder.php` | Created | ✅ |

---

## ✨ Fitur Baru

### 1. Unit Field pada Tabel Guarantees
- **Kolom**: `unit` (VARCHAR, NULL)
- **Indexed**: Ya (untuk optimasi filtering)
- **Editable**: Ya (bisa diisi saat create/update)

### 2. Unit Filtering pada Dashboard
- **Dropdown**: Menampilkan semua unit yang ada di data
- **Real-time**: Stats update otomatis saat unit dipilih
- **Opsi**: "Semua Unit" untuk reset filter

### 3. Unit Field pada Form Input/Edit
- **Input Type**: Text field
- **Required**: No (Optional)
- **Placeholder**: "e.g., Unit Holding 1, Unit Kredit 2"
- **Validasi**: Max 255 characters

### 4. API Endpoint Baru
- **GET `/api/guarantees/units`**: Mendapatkan daftar unit yang tersedia

### 5. Enhanced Statistics
- Stats endpoint sekarang support parameter `?unit=nama_unit`
- Perhitungan by_status dan by_type filtered per unit

---

## 🔌 API Endpoints

### Existing Endpoints (Enhanced)

#### 1. List Guarantees with Unit Filter
```http
GET /api/guarantees?unit=Unit%20Holding
```

**Query Parameters**:
- `unit`: (optional) Filter by specific unit
- Combine dengan filter lain: `?unit=Unit%20Holding&status=available`

**Response**:
```json
{
  "success": true,
  "data": [...guarantees with unit field...],
  "pagination": {...}
}
```

#### 2. Get Statistics (Enhanced)
```http
GET /api/guarantees/stats?unit=Unit%20Kajoetangan
```

**Response**:
```json
{
  "success": true,
  "data": {
    "total": 5,
    "by_status": {
      "available": 3,
      "dipinjam": 1,
      "lunas": 1
    },
    "by_type": {
      "BPKB": 2,
      "SHM": 1,
      "SHGB": 1,
      "E-SHM": 1
    },
    "total_spk": 4,
    "latest_input": "2025-11-27"
  }
}
```

### New Endpoints

#### 3. Get Available Units
```http
GET /api/guarantees/units
```

**Response**:
```json
{
  "success": true,
  "data": ["Unit Holding", "Unit Kajoetangan", "Unit Batu"]
}
```

---

## 🎯 Cara Penggunaan

### Untuk Admin/User

#### 1. Input Data Jaminan dengan Unit
1. Buka halaman Input Jaminan
2. Isi semua field yang required
3. Pada field "Unit" (optional), masukkan unit masing-masing
4. Klik "Simpan Jaminan"

#### 2. Filter Dashboard berdasarkan Unit
1. Buka Dashboard Jaminan
2. Lihat dropdown "Filter Unit" di bagian kanan header
3. Pilih unit yang ingin dilihat
4. Statistik, chart, dan kartu akan otomatis update
5. Pilih "Semua Unit" untuk kembali ke view keseluruhan

#### 3. Edit Unit pada Data Lama
1. Buka halaman List Jaminan
2. Klik Edit pada jaminan yang ingin diubah unit-nya
3. Ubah field Unit
4. Klik "Perbarui Jaminan"

### Untuk Developers

#### 1. Query Filtering di Backend
```php
// Filter by unit
$guarantees = Guarantee::byUnit('Unit Holding')->get();

// Combine filters
$guarantees = Guarantee::byUnit('Unit Holding')
    ->byStatus('available')
    ->get();
```

#### 2. Frontend API Call
```typescript
// Dengan unit filter
const stats = await getGuaranteeStats('Unit Kajoetangan');

// Tanpa filter
const stats = await getGuaranteeStats();

// Get available units
const units = await getGuaranteeUnits();
```

#### 3. Dashboard Component Usage
```tsx
<GuaranteeDashboard navigateTo={handleNavigation} />
```
Unit filter dropdown akan otomatis tampil jika ada data unit.

---

## 🗂️ Data Seeder

### GuaranteeUnitSeeder

**Lokasi**: `database/seeders/GuaranteeUnitSeeder.php`

**Fungsi**:
- Assign unit ke semua guarantee yang sudah ada
- Menggunakan 3 unit: Holding, Kajoetangan, Batu
- Round-robin distribution untuk balance

**Jalankan**:
```bash
# Run specific seeder
php artisan db:seed --class=GuaranteeUnitSeeder

# Run all seeders
php artisan migrate:fresh --seed
```

**Output**:
```
Guarantee units seeded successfully!
Total guarantees updated: 25
Units assigned: Unit Holding, Unit Kajoetangan, Unit Batu
```

---

## 🧪 Testing & Deployment

### Pre-Deployment Checklist

- [x] Database migration ready
- [x] Model updated with unit field
- [x] API controller enhanced
- [x] Frontend components updated
- [x] Seeder created
- [x] API response validation

### Testing Scenarios

#### 1. Backend Testing

**Test 1: Create Guarantee dengan Unit**
```bash
curl -X POST http://127.0.0.1:8000/api/guarantees \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "spk_number": "SPK001",
    "cif_number": "123456",
    "spk_name": "John Doe",
    "credit_period": "24 bulan",
    "guarantee_name": "BPKB Mobil",
    "guarantee_type": "BPKB",
    "guarantee_number": "ABC123456",
    "file_location": "Lemari A",
    "input_date": "2025-11-27",
    "unit": "Unit Holding"
  }'
```

**Test 2: Filter by Unit**
```bash
curl http://127.0.0.1:8000/api/guarantees?unit=Unit%20Holding
```

**Test 3: Get Statistics by Unit**
```bash
curl http://127.0.0.1:8000/api/guarantees/stats?unit=Unit%20Holding
```

**Test 4: Get Available Units**
```bash
curl http://127.0.0.1:8000/api/guarantees/units
```

#### 2. Frontend Testing

**Test 1: Dashboard Unit Filter**
- Buka dashboard
- Verify dropdown unit muncul
- Select different units
- Verify stats update
- Verify charts update

**Test 2: Form Input Unit**
- Buka form input
- Fill all required fields
- Enter unit name
- Submit and verify saved with unit

**Test 3: Form Edit Unit**
- Open existing guarantee
- Modify unit field
- Save and verify update

### Deployment Steps

1. **Backup Database**
   ```bash
   # Backup data sebelum migration
   mysqldump -u user -p jaminan > backup_jaminan.sql
   ```

2. **Run Migration**
   ```bash
   php artisan migrate --database=mysql_jaminan
   ```

3. **Run Seeder (Optional)**
   ```bash
   php artisan db:seed --class=GuaranteeUnitSeeder --database=mysql_jaminan
   ```

4. **Clear Cache**
   ```bash
   php artisan cache:clear
   php artisan config:clear
   ```

5. **Restart Services**
   - Restart Laravel server
   - Restart Node/Vite dev server (jika ada)

---

## 📊 Database Schema

### Guarantees Table Changes

```sql
ALTER TABLE guarantees ADD COLUMN unit VARCHAR(255) NULL DEFAULT NULL AFTER status;
ALTER TABLE guarantees ADD INDEX idx_unit (unit);
```

**Kolom Baru**:
- `unit`: VARCHAR(255) NULL
- Indexed untuk optimasi filtering
- No foreign key (flexible untuk berbagai unit format)

---

## 🔄 Backward Compatibility

✅ **Fully Compatible**
- Existing data tetap bekerja (unit = NULL)
- Nullable field memastikan no breaking changes
- Filter unit optional, bisa ditinggalkan
- Dashboard tetap berfungsi tanpa unit data

---

## 📝 Summary

Implementasi Unit Filter pada sistem Jaminan Aset telah selesai dengan:

| Item | Status | Detail |
|---|---|---|
| Database | ✅ Done | Kolom unit added, indexed |
| Backend API | ✅ Done | Filter, stats, units endpoint |
| Frontend | ✅ Done | Dashboard filter, form field |
| Seeder | ✅ Done | Auto-populate unit data |
| Documentation | ✅ Done | Ini file |

Semua komponen telah diimplementasikan dan siap untuk production deployment.

---

**Untuk pertanyaan atau issues, silakan hubungi tim development.**

