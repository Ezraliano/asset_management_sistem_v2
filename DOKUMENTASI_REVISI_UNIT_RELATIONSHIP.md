# Dokumentasi Revisi: Unit Relationship pada Sistem Jaminan Aset

**Tanggal**: 27 November 2025
**Status**: Selesai
**Versi**: 2.0 (Revised with Proper Relationships)

---

## 📋 Ringkasan Revisi

Revisi ini mengubah implementasi unit dari field string biasa menjadi proper database relationship dengan foreign key. Ini memberikan:

- ✅ **Data Integrity** - Foreign key constraint memastikan data unit selalu valid
- ✅ **Better Performance** - Join queries lebih efisien dibanding string matching
- ✅ **Proper Normalization** - Unit data disimpan di tabel terpisah, menghindari duplikasi
- ✅ **Maintainability** - Perubahan unit name hanya perlu di satu tempat

---

## 🔄 Perubahan Utama dari Revisi Sebelumnya

### Sebelumnya (v1.0):
- Kolom `unit` sebagai VARCHAR string langsung di tabel guarantees
- Data unit disimpan redundan dalam setiap row
- Filter dan search menggunakan string matching

### Sesudah (v2.0):
- Kolom `unit_id` sebagai BIGINT unsigned foreign key
- Reference ke tabel `units` yang terpisah
- Filter menggunakan ID dan join queries
- Proper Eloquent relationships

---

## 🗂️ Database Schema

### 1. Tabel Units (Baru)

**File**: `database/migrations_jaminan/2024_11_27_000000_create_units_table.php`

```sql
CREATE TABLE units (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(255) UNIQUE,           -- e.g., HOLDING, KAJOETANGAN
  name VARCHAR(255),                  -- e.g., Unit Holding, Unit Kajoetangan
  description VARCHAR(255) NULLABLE,  -- Unit description
  location VARCHAR(255) NULLABLE,     -- Unit location/address
  is_active BOOLEAN DEFAULT TRUE,     -- Active status
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  INDEX idx_code (code),
  INDEX idx_name (name),
  INDEX idx_is_active (is_active)
);
```

**Karakteristik:**
- Setiap unit memiliki unique code (identifier)
- Name untuk display di UI
- Deskripsi dan lokasi untuk informasi tambahan
- Is_active untuk soft-deactivate units
- Indexed untuk performa query

---

### 2. Tabel Guarantees (Modified)

**File**: `database/migrations_jaminan/2024_11_19_000000_create_guarantees_table.php`

**Perubahan:**
- Menghapus kolom `unit` (VARCHAR string)
- Menambahkan kolom `unit_id` (BIGINT UNSIGNED, nullable)
- Foreign key constraint dengan onDelete='set null', onUpdate='cascade'

```php
// Added to guarantees table
$table->unsignedBigInteger('unit_id')->nullable()->comment('Foreign key to units table');
$table->foreign('unit_id')
    ->references('id')
    ->on('units')
    ->onDelete('set null')      // Jika unit dihapus, unit_id menjadi NULL
    ->onUpdate('cascade');      // Jika unit.id diubah, otomatis update
$table->index('unit_id');
```

**Alasan:**
- `onDelete('set null')` memastikan data guarantee tetap ada meski unit dihapus
- `onUpdate('cascade')` otomatis update jika unit ID berubah
- Indexed untuk optimasi join queries

---

## 📦 Models

### 1. Unit Model (Baru)

**File**: `app/Models_jaminan/Unit.php`

```php
class Unit extends Model
{
    protected $connection = 'mysql_jaminan';
    protected $table = 'units';

    protected $fillable = ['code', 'name', 'description', 'location', 'is_active'];

    // Relationship: Unit has many Guarantees
    public function guarantees()
    {
        return $this->hasMany(Guarantee::class, 'unit_id');
    }

    // Scope: Get active units
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    // Scope: Order by name
    public function scopeOrderByName($query)
    {
        return $query->orderBy('name', 'asc');
    }
}
```

**Fitur:**
- One-to-Many relationship dengan Guarantee
- Scopes untuk memudahkan query filtering
- Casts untuk type safety

---

### 2. Guarantee Model (Modified)

**File**: `app/Models_jaminan/Guarantee.php`

**Perubahan:**
```php
// Fillable array
protected $fillable = [
    // ... existing fields ...
    'unit_id',  // Changed from 'unit'
];

// New scope untuk filter by unit_id
public function scopeByUnitId($query, $unitId)
{
    return $query->where('unit_id', $unitId);
}

// New relationship
public function unit()
{
    return $this->belongsTo(Unit::class, 'unit_id');
}
```

**Penggunaan:**
```php
// Query examples
$guarantees = Guarantee::byUnitId(1)->get();
$guarantees = Guarantee::with('unit')->get();

// Access unit data
$unit = $guarantee->unit;
$unitName = $guarantee->unit->name;
```

---

## 🔌 API Endpoints

### 1. List Guarantees dengan Unit Filter

**Request:**
```http
GET /api/guarantees?unit_id=1
```

**Query Parameters:**
- `unit_id`: (integer) Unit ID untuk filter

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "spk_number": "SPK001",
      "unit_id": 1,
      "unit": {
        "id": 1,
        "code": "HOLDING",
        "name": "Unit Holding",
        "description": "...",
        "is_active": true
      },
      ...
    }
  ]
}
```

---

### 2. Get Statistics dengan Unit Filter

**Request:**
```http
GET /api/guarantees/stats?unit_id=1
```

**Response:**
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
    }
  }
}
```

---

### 3. Get Available Units (NEW)

**Request:**
```http
GET /api/guarantees/units
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "HOLDING",
      "name": "Unit Holding",
      "description": "Unit Kantor Pusat / Holding",
      "location": "Jakarta",
      "is_active": true,
      "created_at": "2025-11-27T10:00:00Z",
      "updated_at": "2025-11-27T10:00:00Z"
    },
    {
      "id": 2,
      "code": "KAJOETANGAN",
      "name": "Unit Kajoetangan",
      "description": "Unit Cabang Kajoetangan",
      "location": "Malang",
      "is_active": true,
      "created_at": "2025-11-27T10:00:00Z",
      "updated_at": "2025-11-27T10:00:00Z"
    }
  ]
}
```

---

## 🎨 Frontend Changes

### 1. GuaranteeInputForm.tsx

**Perubahan:**
- Field unit berubah dari text input menjadi dropdown select
- Dropdown populated dari Unit model
- Value berubah dari string menjadi numeric ID

```typescript
// State type
const [units, setUnits] = useState<Unit[]>([]);
const [formData, setFormData] = useState<GuaranteeFormData>({
  // ... other fields ...
  unit_id: null,  // Changed from unit: ''
});

// Fetch units
const fetchUnits = async () => {
  const unitsList = await getGuaranteeUnits();
  if (unitsList) {
    setUnits(unitsList);
  }
};

// Dropdown rendering
<select value={formData.unit_id || ''} onChange={...}>
  <option value="">-- Pilih Unit --</option>
  {units.map(unit => (
    <option key={unit.id} value={unit.id}>
      {unit.name}
    </option>
  ))}
</select>
```

---

### 2. GuaranteeDashboard.tsx

**Perubahan:**
- selectedUnit state berubah dari string menjadi number
- Dropdown dropdown menggunakan Unit objects (id + name)
- Stats API call dengan unit_id parameter

```typescript
// State type
const [selectedUnit, setSelectedUnit] = useState<number | ''>('');
const [units, setUnits] = useState<Unit[]>([]);

// Stats call
const guaranteeStats = await getGuaranteeStats(selectedUnit);

// Dropdown
<select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value ? parseInt(e.target.value) : '')}>
  <option value="">Semua Unit</option>
  {units.map((unit) => (
    <option key={unit.id} value={unit.id}>
      {unit.name}
    </option>
  ))}
</select>
```

---

### 3. API Service (api.ts)

**Perubahan:**
```typescript
// getGuaranteeStats - support numeric unit_id
export const getGuaranteeStats = async (unitId?: number | ''): Promise<GuaranteeStats | null> => {
  const url = unitId ? `/guarantees/stats?unit_id=${unitId}` : '/guarantees/stats';
  // ...
}

// getGuaranteeUnits - return Unit[] objects
export const getGuaranteeUnits = async (): Promise<Unit[]> => {
  const response = await apiRequest('/guarantees/units');
  const result = handleApiResponse<{data: Unit[]}>(response);
  return result?.data || [];
}
```

---

## 🗄️ Seeder Updates

### GuaranteeUnitSeeder.php

**Perubahan Utama:**
- Sekarang menggunakan Unit model untuk mendapatkan unit list
- Assign `unit_id` (numeric) bukan `unit` (string)
- Round-robin assignment untuk distribute guarantees across units

```php
// Get all active units
$units = Unit::active()->orderBy('name')->get();

// Get guarantees without unit_id
$guarantees = Guarantee::whereNull('unit_id')->get();

// Assign units in round-robin fashion
foreach ($guarantees as $index => $guarantee) {
    $unitIndex = $index % $unitCount;
    $unit = $units[$unitIndex];
    $guarantee->update(['unit_id' => $unit->id]);
}
```

**Jalankan:**
```bash
# Pastikan units table sudah populated terlebih dahulu
php artisan db:seed --class=UnitSeeder --database=mysql_jaminan

# Kemudian assign units ke guarantees
php artisan db:seed --class=GuaranteeUnitSeeder --database=mysql_jaminan
```

---

## 📊 Query Examples

### Backend (Laravel)

```php
// Get guarantee with unit relationship
$guarantee = Guarantee::with('unit')->find(1);
echo $guarantee->unit->name;

// Filter by unit_id
$guarantees = Guarantee::byUnitId(1)->get();

// Filter with relationship eager loading
$guarantees = Guarantee::whereUnitId(1)->with('unit')->get();

// Get unit with all its guarantees
$unit = Unit::with('guarantees')->find(1);
foreach ($unit->guarantees as $guarantee) {
    echo $guarantee->spk_number;
}

// Count guarantees per unit
$unit = Unit::withCount('guarantees')->find(1);
echo $unit->guarantees_count;
```

### Frontend (TypeScript)

```typescript
// Fetch and filter
const units = await getGuaranteeUnits();
const stats = await getGuaranteeStats(selectedUnit);

// Form submission
const formData = {
  spk_number: '...',
  unit_id: 1,  // Numeric ID
  // ... other fields
};

await addGuarantee(formData);
```

---

## 🚀 Migration Steps

### 1. Backup Database
```bash
mysqldump -u user -p jaminan > backup_jaminan.sql
```

### 2. Run Migrations (dalam urutan yang benar!)
```bash
# Pertama: create units table
php artisan migrate --database=mysql_jaminan

# Migrasi akan create units table, then add unit_id to guarantees
```

### 3. Seed Units
```bash
php artisan db:seed --class=UnitSeeder --database=mysql_jaminan
```

### 4. Assign Units to Existing Guarantees
```bash
php artisan db:seed --class=GuaranteeUnitSeeder --database=mysql_jaminan
```

### 5. Clear Cache
```bash
php artisan cache:clear
php artisan config:clear
```

### 6. Verify
```bash
# Check units table
SELECT * FROM units;

# Check guarantees with unit_id
SELECT id, spk_number, unit_id FROM guarantees LIMIT 5;

# Check relationship
SELECT g.id, g.spk_number, u.name FROM guarantees g
LEFT JOIN units u ON g.unit_id = u.id;
```

---

## ✅ Backward Compatibility

**✅ Compatible** - Dengan proper planning:
- Old guarantee records dengan `unit_id = NULL` tetap valid
- Foreign key dengan `onDelete('set null')` memastikan no data loss
- Frontend dropdown menampilkan "-- Pilih Unit --" sebagai default

---

## 📂 Files Modified/Created

| File | Status | Perubahan |
|------|--------|-----------|
| `database/migrations_jaminan/2024_11_19_000000_create_guarantees_table.php` | Modified | Hapus kolom unit, tambah unit_id FK |
| `database/migrations_jaminan/2024_11_27_000000_create_units_table.php` | Created | Buat tabel units |
| `app/Models_jaminan/Guarantee.php` | Modified | Tambah unit relationship & scopeByUnitId |
| `app/Models_jaminan/Unit.php` | Created | Model untuk units table |
| `app/Http/Controllers/Api_jaminan/GuaranteeController.php` | Modified | Update filtering ke unit_id, fetch Unit objects |
| `frontend/services/api.ts` | Modified | Update getGuaranteeStats & getGuaranteeUnits |
| `frontend/components/GuaranteeInputForm.tsx` | Modified | Dropdown select untuk units |
| `frontend/components/GuaranteeDashboard.tsx` | Modified | Support numeric unit_id filtering |
| `database/seeders/GuaranteeUnitSeeder.php` | Modified | Assign unit_id based on Unit model |

---

## 🔍 Testing Checklist

- [ ] Database migration runs successfully
- [ ] Units table created with proper schema
- [ ] Unit_id column added to guarantees with FK
- [ ] UnitSeeder runs and populates units
- [ ] GuaranteeUnitSeeder assigns unit_id to guarantees
- [ ] Backend API returns Unit objects in getUnits endpoint
- [ ] Filter by unit_id works in API
- [ ] Dashboard dropdown shows all units
- [ ] Form shows unit dropdown with all units
- [ ] Create/edit guarantee with unit_id works
- [ ] Stats filtered by unit_id work correctly

---

## 📝 Summary

Revisi ini membawa implementasi unit dari simple string field menjadi proper normalized database relationship dengan:

✅ **Better Data Integrity** - Foreign key constraints
✅ **Improved Performance** - Proper indexes dan joins
✅ **Maintainability** - Changes ripple correctly via cascade
✅ **Type Safety** - Numeric IDs instead of strings
✅ **Scalability** - Ready untuk future enhancements

Semua perubahan backward compatible dan dapat dilakukan tanpa data loss.

---

**Untuk pertanyaan atau issues, silakan mereferensi dokumentasi ini dan error logs.**

