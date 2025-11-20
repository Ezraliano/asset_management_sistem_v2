# Panduan Pemilihan Arsitektur Multi-Database

## Overview

Dokumen ini membantu Anda memilih antara **Integrated** atau **Non-Integrated** architecture untuk sistem Jaminan (Collateral) Anda.

---

## Quick Comparison

| Aspek | Non-Integrated | Integrated |
|-------|---|---|
| **Database Independensi** | ✅ Fully Independent | ❌ Tightly Coupled |
| **Foreign Keys** | ❌ Tidak ada antar DB | ✅ Ada (dengan workaround) |
| **Data Copying** | ✅ Copy dari primary | ❌ Direct reference |
| **Transactions** | Per-database | Multi-database atomic |
| **Query Joins** | ❌ Tidak bisa | ✅ Bisa JOIN antar DB |
| **Backup/Restore** | ✅ Simple independen | ❌ Kompleks coordinated |
| **Scalability** | ✅ Scale terpisah | ❌ Scale bersama |
| **Development** | ✅ Lebih mudah | ❌ Lebih kompleks |
| **When Asset Down** | ✅ Jaminan tetap jalan | ❌ Jaminan juga down |

---

## Detailed Comparison

### 1. Arsitektur & Structure

#### Non-Integrated (Fully Independent)
```
PRIMARY DB          JAMINAN DB
========            =========
assets              guarantors
users               guarantees (COPY data, no FK)
loans               guarantee_items
sales               guarantee_history
                    guarantee_transactions

❌ NO relasi langsung
❌ NO foreign keys
✅ ZERO dependency
```

#### Integrated (Tightly Coupled)
```
PRIMARY DB          JAMINAN DB
========            =========
assets              guarantors
users               guarantees (FK: asset_id, created_by)
loans               guarantee_items
sales               guarantee_history (FK: user_id)
                    guarantee_transactions (FK: user_id)

✅ Foreign key constraints
✅ Direct relationships
❌ Mutual dependency
```

---

### 2. Data Flow

#### Non-Integrated Data Flow
```
User creates Guarantee
         ↓
Service fetches Asset from PRIMARY DB
         ↓
Service copies Asset data to JAMINAN DB
         ↓
Guarantee created with copied data
         ↓
Result: Snapshot data di JAMINAN DB
```

**Example:**
```php
// Fetch dari primary
$asset = DB::connection('mysql')->table('assets')->find(123);

// Copy ke jaminan
$guarantee = Guarantee::create([
    'asset_name' => $asset->name,        // COPY
    'asset_code' => $asset->asset_code,  // COPY
    'amount' => 1000000,
]);
```

#### Integrated Data Flow
```
User creates Guarantee
         ↓
Validate Asset exists in PRIMARY DB
         ↓
Guarantee created with asset_id reference
         ↓
Result: Direct reference via FK
```

**Example:**
```php
// Langsung reference
$guarantee = Guarantee::create([
    'asset_id' => 123,                   // Direct FK
    'amount' => 1000000,
]);

// Query dengan JOIN
$guarantee->asset;  // Lazy load dari primary DB
```

---

### 3. Data Integrity

#### Non-Integrated
```
Asset dihapus dari PRIMARY DB
         ↓
Guarantee tetap ada (tidak ada FK)
         ↓
Hasil: Data snapshot terus tersimpan

✅ No orphan data issues
✅ Historical data preserved
❌ Bisa diverge dari reality
```

#### Integrated
```
Asset dihapus dari PRIMARY DB
         ↓
FK constraint prevent delete
         ↓
Hasil: Delete ditolak atau cascade delete

✅ Data consistency terjamin
✅ Relasi always valid
❌ Delete requirement harus careful
```

---

### 4. Query Performance

#### Non-Integrated
```php
// Harus query 2x terpisah
$guarantees = Guarantee::all();           // DB Jaminan
foreach ($guarantees as $g) {
    // Kalo butuh asset detail, harus query lagi
    // Tidak bisa auto-populate
}

// Result: Duplicate data di kedua DB, no JOIN overhead
```

**Performa:** ✅ Cepat (no JOIN overhead) tapi banyak data duplication

#### Integrated
```php
// Bisa JOIN langsung
$result = DB::connection('mysql_jaminan')
    ->table('guarantees as g')
    ->join(
        DB::connection('mysql')->raw('assets as a'),
        'g.asset_id', '=', 'a.id'
    )
    ->select('g.*', 'a.name as asset_name')
    ->get();

// Result: Single query, no duplication
```

**Performa:** ✅ Optimal (single query) tapi cross-DB join lebih lambat

---

### 5. Backup & Recovery

#### Non-Integrated Backup
```bash
# Backup 1
mysqldump -u root asset_management_db > backup_primary.sql

# Backup 2
mysqldump -u root asset_jaminan_db > backup_jaminan.sql

# Restore 1 (bisa independen!)
mysql -u root asset_management_db < backup_primary.sql

# Restore 2 (bisa independen!)
mysql -u root asset_jaminan_db < backup_jaminan.sql

✅ Simple, independen, bisa restore salah satu saja
```

#### Integrated Backup
```bash
# Backup PRIMARY dulu (jaminan reference ke sini)
mysqldump -u root asset_management_db > backup_primary.sql

# Backup JAMINAN
mysqldump -u root asset_jaminan_db > backup_jaminan.sql

# Restore PRIMARY dulu (FK requirement)
mysql -u root asset_management_db < backup_primary.sql

# Restore JAMINAN (FK harus primary exist dulu)
mysql -u root asset_jaminan_db < backup_jaminan.sql

❌ Order matters, koordinasi diperlukan
```

---

### 6. System Resilience

#### Non-Integrated Resilience
```
PRIMARY DB down
    ↓
Can still:
    - List existing guarantees ✅
    - Create new guarantees ✅
    - Modify guarantees ✅
    - Only cannot: validate against asset (❌ OK)

Result: System tetap operational
```

#### Integrated Resilience
```
PRIMARY DB down
    ↓
Cannot:
    - List guarantees (FK constraint) ❌
    - Create guarantees ❌
    - Modify guarantees ❌
    - Access guarantees data ❌

Result: Jaminan system DOWN
```

---

### 7. Development Complexity

#### Non-Integrated Development
```
Simple:
✅ Create model dengan connection
✅ Service handle fetching & copying
✅ Relasi hanya lokal (same DB)
✅ Transactions simple (per DB)
✅ Testing mudah (isolasi baik)

Code:
// Service
$asset = Asset::find($id);
$guarantee = Guarantee::create([
    'asset_name' => $asset->name,  // Copy
    'amount' => $amount,
]);
```

#### Integrated Development
```
Kompleks:
❌ Cross-database relations perlu explicit ->on('mysql')
❌ Transactions multi-database perlu atomic
❌ Queries perlu JOIN antar DB
❌ Validation perlu check kedua DB
❌ Testing lebih kompleks (dependencies)

Code:
// Model
public function asset()
{
    return $this->belongsTo(Asset::class, 'asset_id')
        ->on('mysql');  // Harus explicit!
}

// Service
DB::transaction(function () {
    Asset::create([...]);
    Guarantee::create([...]);
}, 3, 'mysql_jaminan');  // Koordinasi DB
```

---

### 8. Scalability

#### Non-Integrated Scalability
```
Scenario: Asset system perlu lebih banyak resources

Solusi:
✅ Upgrade PRIMARY DB (more CPU/RAM/Storage)
✅ JAMINAN DB tidak terdampak
✅ Bisa separate replicas
✅ Bisa sharding masing-masing

Result: Easy to scale independently
```

#### Integrated Scalability
```
Scenario: Asset system perlu lebih banyak resources

Solusi:
❌ Upgrade PRIMARY DB
❌ JAMINAN DB ikut dipengaruhi (linked)
❌ Sharding jadi lebih kompleks
❌ Replication harus coordinated

Result: Scale bersama (tidak optimal)
```

---

### 9. Use Case Examples

#### When to Use Non-Integrated:

1. **Jaminan sebagai fitur optional**
   - Asset system bisa jalan tanpa Jaminan
   - Jaminan cuma tambahan, bukan core

2. **Sistem akan dipisah di masa depan**
   - Jaminan mungkin jadi service terpisah
   - API tersendiri untuk Jaminan

3. **Different teams mengelola**
   - Team A manage Assets
   - Team B manage Jaminan
   - Minimal dependency

4. **High availability requirement**
   - Asset system down ≠ Jaminan down
   - Jaminan harus tetap operational

5. **Different growth rates**
   - Asset system scale 10x
   - Jaminan system scale 2x
   - Scale terpisah lebih efisien

#### When to Use Integrated:

1. **Jaminan core feature untuk Assets**
   - Setiap asset bisa punya guarantee
   - Relationship sangat kuat

2. **Strong data consistency needed**
   - Tidak boleh ada mismatch antara asset dan guarantee
   - Integritas data super penting

3. **ACID transaction requirement**
   - Create asset + guarantee harus atomic
   - Tidak boleh partial success

4. **Same team/organization**
   - Satu tim yang manage semuanya
   - Satu schema logical

5. **Unified reporting**
   - Report yang menggabung asset + guarantee
   - Query yang complex dengan JOIN

---

## Decision Matrix

Gunakan tabel ini untuk memilih:

### Scoring System
**3 = Sangat Penting**
**2 = Cukup Penting**
**1 = Kurang Penting**

### Criteria

| Kriteria | Non-Int | Int | Your Score | Weight |
|----------|---------|-----|-----------|--------|
| Independensi maksimal | 3 | 0 | ___ | 3 |
| Data consistency ketat | 0 | 3 | ___ | 3 |
| Easy backup/restore | 3 | 1 | ___ | 2 |
| Scalability terpisah | 3 | 1 | ___ | 2 |
| Query JOIN butuh | 0 | 3 | ___ | 2 |
| High availability | 3 | 1 | ___ | 3 |
| Easy development | 3 | 1 | ___ | 2 |
| Cross-DB atomic tx | 0 | 3 | ___ | 1 |
| Historical snapshot | 3 | 0 | ___ | 1 |
| Tight coupling OK | 0 | 3 | ___ | 1 |

**Total Score:**
- **Non-Integrated Score** = Sum of Non-Int column × Weight
- **Integrated Score** = Sum of Int column × Weight

**Winner** = Architecture dengan score tertinggi

---

## Quick Decision Tree

```
START
  │
  ├─ Apakah Jaminan adalah optional feature?
  │  ├─ YES → Non-Integrated ✅
  │  └─ NO → Lanjut ke Q2
  │
  ├─ Apakah Jaminan akan terpisah jadi service tersendiri?
  │  ├─ YES → Non-Integrated ✅
  │  └─ NO → Lanjut ke Q3
  │
  ├─ Apakah data consistency adalah prioritas tertinggi?
  │  ├─ YES → Integrated ✅
  │  └─ NO → Lanjut ke Q4
  │
  ├─ Apakah butuh atomic transactions multi-database?
  │  ├─ YES → Integrated ✅
  │  └─ NO → Non-Integrated ✅
  │
  └─ Apakah Jaminan harus tetap jalan saat Asset system down?
     ├─ YES → Non-Integrated ✅
     └─ NO → Integrated ✅
```

---

## Recommendation Summary

### Pilih Non-Integrated Jika:
```
☑️ Jaminan adalah fitur secondary/optional
☑️ Independensi dan scalability penting
☑️ High availability requirement
☑️ Akan di-split menjadi service terpisah
☑️ Tim terpisah mengelola
☑️ Backup/restore harus simple
☑️ Performa tidak critical untuk JOIN

👉 LEBIH AMAN DAN LEBIH FLEKSIBEL
```

### Pilih Integrated Jika:
```
☑️ Jaminan adalah core feature untuk Assets
☑️ Strong data consistency critical
☑️ ACID transactions harus atomic
☑️ Satu tim mengelola semuanya
☑️ Complex queries dengan JOIN
☑️ Reporting yang unified
☑️ Sistem sudah mature dan stable

👉 LEBIH POWERFUL DAN DATA-CENTRIC
```

---

## Migration Path

Jika mulai dengan Non-Integrated, bisa migrate ke Integrated:

### Step 1: Prepare
```
- Add foreign key columns ke jaminan_db
- Update models dengan relasi
- Add validation untuk FK constraint
```

### Step 2: Add Redundancy
```
- Simpan asset_id di guarantee (sudah ada)
- Mulai store asset info juga (duplication)
- Verify data consistency
```

### Step 3: Gradual Migration
```
- Update queries ke full JOIN
- Update transactions ke atomic
- Update service logic
```

### Step 4: Cleanup
```
- Remove copied columns (jika redundant)
- Verify relasi berjalan
- Remove legacy code
```

---

## Common Mistakes

### Non-Integrated Mistakes:

❌ **Forget to copy all needed data**
```php
// Jangan ini:
$guarantee = Guarantee::create([
    'amount' => $amount,
    // Forget: asset_name, asset_code, etc
]);
// Nanti tidak bisa display asset info
```

❌ **Store asset_id tapi tidak update saat asset berubah**
```php
// Asset name berubah, guarantee tetap lama
Asset::where('id', 123)->update(['name' => 'New Name']);
// Guarantee masih punya 'Old Name' di copy-nya

// Solusi: Event listener untuk sync
```

### Integrated Mistakes:

❌ **Forget ->on('mysql') di relasi**
```php
// Jangan ini:
public function asset()
{
    return $this->belongsTo(Asset::class);
}
// Error: Table not found!

// Benar:
public function asset()
{
    return $this->belongsTo(Asset::class)->on('mysql');
}
```

❌ **Tidak wrap dalam transaction**
```php
// Jangan ini:
Asset::create([...]);
Guarantee::create([...]);  // Bisa fail, asset sudah created

// Benar:
DB::transaction(function () {
    Asset::create([...]);
    Guarantee::create([...]);
});
```

---

## Final Recommendation for Your Project

Based on typical asset management requirements:

### 👉 **Rekomendasi: Non-Integrated Architecture**

**Alasan:**
1. ✅ Asset dan Jaminan adalah domain yang terpisah
2. ✅ Jaminan sering opsional (tidak semua asset perlu jaminan)
3. ✅ Kemungkinan Jaminan akan di-split jadi service terpisah
4. ✅ High availability untuk Jaminan penting
5. ✅ Scalability terpisah lebih fleksibel
6. ✅ Setup dan maintenance lebih mudah
7. ✅ Backup/restore lebih straightforward

**Kekurangan yang harus diterima:**
- ❌ Data akan di-copy (redundancy)
- ❌ Tidak ada automatic sync dengan asset changes
- ❌ Tidak bisa query JOIN langsung

**Mitigation:**
- Implement event listeners untuk notify jaminan saat asset changes
- Implement API untuk query asset info sesuai kebutuhan
- Regular data consistency checks

---

**Pilihan Final:**
- **Non-Integrated** → Default recommendation ✅
- **Integrated** → Hanya jika semua kriteria Integrated terpenuhi

Lihat file dokumentasi untuk implementasi detail:
- `MULTI_DATABASE_ARCHITECTURE.md` (Non-Integrated)
- `INTEGRATED_MULTI_DATABASE_ARCHITECTURE.md` (Integrated)

