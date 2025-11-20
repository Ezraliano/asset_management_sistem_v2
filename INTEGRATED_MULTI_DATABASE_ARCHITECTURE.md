# Dokumentasi Arsitektur Multi-Database Terintegrasi (Integrated)

## Daftar Isi
1. [Pengenalan](#pengenalan)
2. [Tipe Arsitektur: Integrated](#tipe-arsitektur-integrated)
3. [Perbandingan: Integrated vs Non-Integrated](#perbandingan-integrated-vs-non-integrated)
4. [Keuntungan & Kekurangan](#keuntungan--kekurangan)
5. [Arsitektur Sistem](#arsitektur-sistem)
6. [Konfigurasi Database](#konfigurasi-database)
7. [Implementasi Model](#implementasi-model)
8. [Implementasi Service](#implementasi-service)
9. [Data Synchronization](#data-synchronization)
10. [Migration & Database Structure](#migration--database-structure)
11. [Best Practices](#best-practices)
12. [Troubleshooting](#troubleshooting)

---

## Pengenalan

Dokumen ini menjelaskan bagaimana mengimplementasikan **multi-database architecture TERINTEGRASI** dalam aplikasi Asset Management System V2 menggunakan Laravel.

**Arsitektur Terintegrasi** berarti kedua database memiliki **hubungan langsung** dan saling **tergantung** satu sama lain. Database Jaminan berhubungan dengan data-data di database Primary melalui foreign key constraints dan relasi data.

### Karakteristik Integrated Architecture:

✅ **Saling Terhubung**: Database jaminan memiliki referensi langsung ke database primary
✅ **Foreign Key Constraints**: Memiliki hubungan antar tabel di database berbeda
✅ **Data Integrity**: Integritas data dijaga melalui relationships
✅ **Atomic Transactions**: Operasi bisa melibatkan kedua database secara bersamaan
✅ **Centralized Schema**: Skema database terdefinisi dengan baik dan saling melengkapi

❌ **Tidak Independen**: Database jaminan bergantung pada database primary
❌ **Shared Responsibility**: Jika primary DB down, jaminan juga terdampak
❌ **Kompleks**: Backup/restore lebih rumit karena saling tergantung

---

## Tipe Arsitektur: Integrated

### Definisi

Database Jaminan **TERINTEGRASI** dengan Database Primary melalui:
- Foreign key constraints antar database (dengan tabel mapping/bridge)
- Direct references via primary keys
- Shared user/role/permission context
- Transactional consistency antara kedua database

### Diagram Arsitektur Integrated

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (React/Vite)                         │
└────────────┬──────────────────────────────┬──────────────────────┘
             │                              │
             ▼                              ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│   Laravel API Backend        │ │   Unified Service Layer      │
│   (Single Connection Point)  │ │                              │
└──────────┬───────────────────┴────────────┬────────────────────┘
           │                                │
           │ (Database Layer - INTEGRATED)  │
           │                                │
┌──────────┴──────────────────────────────┬─┴─────────────────────┐
│                                         │                       │
▼                                         ▼                       ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│  Database 1: Primary DB      │ │  Database 2: Jaminan DB      │
│  (Asset Management System)   │ │  (Guarantee/Collateral)      │
├──────────────────────────────┤ ├──────────────────────────────┤
│                              │ │                              │
│ Tables:                      │ │ Tables:                      │
│ • assets                     │ │ • guarantors                 │
│ • users                      │ │ • guarantees                 │
│ • loans                      │ │ • guarantee_items            │
│ • sales                      │ │ • guarantee_history          │
│ • depreciation               │ │ • guarantee_transactions     │
│ • depreciation_schedules     │ │ • guarantee_releases         │
│ • roles                      │ │                              │
│ • permissions                │ │                              │
│                              │ │                              │
│ Connection: mysql (primary)  │ │ Connection: mysql_jaminan    │
└──────────────────────────────┘ └──────────────────────────────┘
       ▲                                    ▲
       │           INTEGRATED              │
       │         (Foreign Keys)            │
       └────────────────────────────────────┘

        ✅ RELASI LANGSUNG
        ✅ CROSS-DB REFERENCES
        ✅ SHARED TRANSACTIONS
        ✅ ATOMIC OPERATIONS
```

---

## Perbandingan: Integrated vs Non-Integrated

| Aspek | Non-Integrated | Integrated |
|-------|---|---|
| **Independensi** | Sepenuhnya independen | Saling tergantung |
| **Foreign Keys** | HANYA lokal | Bisa cross-database |
| **Data Reference** | Copy via service | Direct reference |
| **Transactions** | Per database | Multi-database atomic |
| **Scalability** | Skala terpisah | Skala bersama |
| **Backup/Restore** | Independen mudah | Kompleks (tergantung) |
| **Recovery** | Simple | Memerlukan koordinasi |
| **Data Integrity** | Application level | Database constraints |
| **Performance** | No joins antar DB | Join bisa antar DB |
| **Kasus Penggunaan** | Sistem terpisah | Sistem terintegrasi |

---

## Keuntungan & Kekurangan

### Keuntungan Integrated Architecture

✅ **Data Integrity Terjaga**
- Foreign key constraints menjamin konsistensi data
- Tidak bisa ada data orphan (referensi tanpa data asli)
- MySQL engine mengelola relasi otomatis

```sql
-- Constraint menjamin relasi valid
FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE RESTRICT
```

✅ **Query Performance**
- Bisa melakukan JOIN langsung antar tabel di database berbeda
- Mengurangi aplikasi-level processing
- Database engine bisa optimize query

```sql
-- Query langsung dengan JOIN
SELECT g.*, a.name as asset_name
FROM jaminan_db.guarantees g
JOIN primary_db.assets a ON g.asset_id = a.id
```

✅ **Transaction Safety**
- Operasi bisa atomic melibatkan kedua database
- Rollback otomatis jika ada error di salah satu database
- ACID properties terjaga

```php
DB::transaction(function () {
    Asset::create([...]);           // DB Primary
    Guarantee::create([...]);       // DB Jaminan
    // Kedua-duanya succeed atau rollback bersama
});
```

✅ **Simpler Application Logic**
- Tidak perlu manual data copying
- Relasi Eloquent bisa langsung digunakan
- Less code, more maintainable

### Kekurangan Integrated Architecture

❌ **Kompleksitas Konfigurasi**
- Setup foreign keys antar database lebih rumit
- Backup/restore harus koordinasi
- Migration lebih complex

❌ **Tight Coupling**
- Database jaminan tidak bisa berdiri sendiri
- Jika primary DB error, jaminan juga terdampak
- Sulit untuk scale terpisah

❌ **MySQL Limitation**
- MySQL tidak native support foreign key constraints antar database
- Perlu workaround dengan triggers atau application logic
- Validation harus dilakukan di application layer

❌ **Maintenance Overhead**
- Update schema harus koordinasi di kedua DB
- Monitoring lebih kompleks
- Recovery procedure lebih rumit

---

## Arsitektur Sistem

### Konsep Integrated Database

Dalam integrated architecture, kita menggunakan **satu koneksi logical** yang mengelola kedua database physical:

```php
// Dalam aplikasi, akses kedua database via single service
$guaranteeService = new GuaranteeService();

// Service tahu cara mengakses kedua database
$guarantee = $guaranteeService->createGuaranteeForAsset(
    assetId: 123,          // From DB Primary
    guarantorId: 45,       // From DB Jaminan
    amount: 1000000
);
```

### Data Model Relationship

```
Database Primary (asset_management_db)
├─ assets (id, name, asset_code, current_value)
│  └─ HAS-MANY → guarantees (via FK: asset_id)
│
└─ users (id, name, email)
   └─ HAS-MANY → guarantees (via FK: created_by)

Database Jaminan (asset_jaminan_db)
├─ guarantors (id, name, identity_number)
│  └─ HAS-MANY → guarantees (via FK: guarantor_id)
│
├─ guarantees (id, asset_id, guarantor_id, amount)
│  └─ BELONGS-TO → assets (FK: asset_id) [CROSS-DB]
│  └─ BELONGS-TO → guarantors (FK: guarantor_id)
│  └─ BELONGS-TO → users (FK: created_by) [CROSS-DB]
│  └─ HAS-MANY → guarantee_items
│  └─ HAS-MANY → guarantee_history
│  └─ HAS-MANY → guarantee_transactions
│
├─ guarantee_items (id, guarantee_id, asset_id, value)
│  └─ BELONGS-TO → guarantees
│
├─ guarantee_history (id, guarantee_id, user_id)
│  └─ BELONGS-TO → guarantees
│
└─ guarantee_transactions (id, guarantee_id, user_id)
   └─ BELONGS-TO → guarantees
```

---

## Konfigurasi Database

### 1. File `.env` Configuration

```env
# Database 1 - Primary (Asset Management)
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=asset_management_db
DB_USERNAME=root
DB_PASSWORD=

# Database 2 - Jaminan (Guarantee/Collateral) - TERINTEGRASI
DB_CONNECTION_JAMINAN=mysql
DB_HOST_JAMINAN=127.0.0.1
DB_PORT_JAMINAN=3306
DB_DATABASE_JAMINAN=asset_jaminan_db
DB_USERNAME_JAMINAN=root
DB_PASSWORD_JAMINAN=

# Catatan: Bisa menggunakan host yang sama atau berbeda
# Kunci adalah: kedua database harus accessible dari satu Laravel app
```

### 2. File `config/database.php` Configuration

```php
'connections' => [
    'mysql' => [
        'driver' => 'mysql',
        'url' => env('DB_URL'),
        'host' => env('DB_HOST', '127.0.0.1'),
        'port' => env('DB_PORT', '3306'),
        'database' => env('DB_DATABASE', 'laravel'),
        'username' => env('DB_USERNAME', 'root'),
        'password' => env('DB_PASSWORD', ''),
        'unix_socket' => env('DB_SOCKET', ''),
        'charset' => env('DB_CHARSET', 'utf8mb4'),
        'collation' => env('DB_COLLATION', 'utf8mb4_unicode_ci'),
        'prefix' => '',
        'prefix_indexes' => true,
        'strict' => true,
        'engine' => null,
    ],

    // Database Jaminan - TERINTEGRASI
    'mysql_jaminan' => [
        'driver' => 'mysql',
        'host' => env('DB_HOST_JAMINAN', '127.0.0.1'),
        'port' => env('DB_PORT_JAMINAN', '3306'),
        'database' => env('DB_DATABASE_JAMINAN', 'asset_jaminan_db'),
        'username' => env('DB_USERNAME_JAMINAN', 'root'),
        'password' => env('DB_PASSWORD_JAMINAN', ''),
        'charset' => env('DB_CHARSET', 'utf8mb4'),
        'collation' => env('DB_COLLATION', 'utf8mb4_unicode_ci'),
        'prefix' => '',
        'prefix_indexes' => true,
        'strict' => true,
        'engine' => null,
        // Penting: Gunakan same credentials atau accessible connection
    ],
],
```

---

## Implementasi Model

### 1. Base Model untuk Database Jaminan

**File: `app/Models/BaseJaminanModel.php`**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BaseJaminanModel extends Model
{
    /**
     * Koneksi ke database jaminan
     */
    protected $connection = 'mysql_jaminan';

    public $timestamps = true;
}
```

### 2. Model Guarantee (dengan relasi cross-database)

**File: `app/Models/Guarantee.php`**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\SoftDeletes;

class Guarantee extends BaseJaminanModel
{
    use SoftDeletes;

    protected $table = 'guarantees';

    protected $fillable = [
        'asset_id',           // FK ke database primary
        'guarantor_id',       // FK lokal
        'guarantee_type',
        'amount',
        'currency',
        'status',
        'start_date',
        'end_date',
        'created_by',         // FK ke users (database primary)
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    /**
     * ✅ RELASI TERINTEGRASI - Cross-database relationships
     *
     * Relasi ini menghubungkan guarantee dengan asset dan user
     * di database primary secara langsung
     */

    /**
     * Relasi ke Asset (dari database primary)
     *
     * PENTING: Harus specify connection untuk relasi cross-database
     */
    public function asset()
    {
        return $this->belongsTo(Asset::class, 'asset_id')
            ->on('mysql'); // Specify connection eksplisit
    }

    /**
     * Relasi ke Guarantor (lokal, same database)
     */
    public function guarantor()
    {
        return $this->belongsTo(Guarantor::class, 'guarantor_id');
    }

    /**
     * Relasi ke User yang membuat guarantee (database primary)
     */
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by')
            ->on('mysql'); // Cross-database
    }

    /**
     * Relasi ke GuaranteeItems (lokal)
     */
    public function items()
    {
        return $this->hasMany(GuaranteeItem::class, 'guarantee_id');
    }

    /**
     * Relasi ke GuaranteeHistory (lokal)
     */
    public function history()
    {
        return $this->hasMany(GuaranteeHistory::class, 'guarantee_id');
    }

    /**
     * Relasi ke GuaranteeTransactions (lokal)
     */
    public function transactions()
    {
        return $this->hasMany(GuaranteeTransaction::class, 'guarantee_id');
    }

    /**
     * Scope untuk filter by status
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope untuk filter by type
     */
    public function scopeByType($query, $type)
    {
        return $query->where('guarantee_type', $type);
    }
}
```

### 3. Model Guarantor

**File: `app/Models/Guarantor.php`**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\SoftDeletes;

class Guarantor extends BaseJaminanModel
{
    use SoftDeletes;

    protected $table = 'guarantors';

    protected $fillable = [
        'name',
        'identity_type',
        'identity_number',
        'address',
        'phone',
        'email',
        'status',
    ];

    /**
     * Relasi ke guarantees (lokal)
     */
    public function guarantees()
    {
        return $this->hasMany(Guarantee::class, 'guarantor_id');
    }

    /**
     * Get active guarantees
     */
    public function activeGuarantees()
    {
        return $this->guarantees()->where('status', 'active');
    }

    /**
     * Get total guaranteed amount
     */
    public function getTotalGuaranteedAmountAttribute()
    {
        return $this->guarantees()
            ->where('status', 'active')
            ->sum('amount');
    }
}
```

### 4. Model GuaranteeItem

**File: `app/Models/GuaranteeItem.php`**

```php
<?php

namespace App\Models;

class GuaranteeItem extends BaseJaminanModel
{
    protected $table = 'guarantee_items';

    protected $fillable = [
        'guarantee_id',
        'asset_id',           // Reference (jika ada item terpisah)
        'description',
        'value',
        'quantity',
    ];

    protected $casts = [
        'value' => 'decimal:2',
        'quantity' => 'integer',
    ];

    /**
     * Relasi ke guarantee
     */
    public function guarantee()
    {
        return $this->belongsTo(Guarantee::class);
    }

    /**
     * Relasi ke asset (cross-database, opsional)
     */
    public function asset()
    {
        return $this->belongsTo(Asset::class, 'asset_id')
            ->on('mysql');
    }
}
```

### 5. Model GuaranteeHistory

**File: `app/Models/GuaranteeHistory.php`**

```php
<?php

namespace App\Models;

class GuaranteeHistory extends BaseJaminanModel
{
    protected $table = 'guarantee_history';

    protected $fillable = [
        'guarantee_id',
        'action',
        'old_status',
        'new_status',
        'user_id',            // FK ke users (database primary)
        'description',
    ];

    /**
     * Relasi ke guarantee
     */
    public function guarantee()
    {
        return $this->belongsTo(Guarantee::class);
    }

    /**
     * Relasi ke user yang melakukan action (cross-database)
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id')
            ->on('mysql');
    }
}
```

### 6. Model GuaranteeTransaction

**File: `app/Models/GuaranteeTransaction.php`**

```php
<?php

namespace App\Models;

class GuaranteeTransaction extends BaseJaminanModel
{
    protected $table = 'guarantee_transactions';

    protected $fillable = [
        'guarantee_id',
        'transaction_type',
        'amount',
        'currency',
        'transaction_date',
        'user_id',            // FK ke users (database primary)
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'transaction_date' => 'datetime',
    ];

    /**
     * Relasi ke guarantee
     */
    public function guarantee()
    {
        return $this->belongsTo(Guarantee::class);
    }

    /**
     * Relasi ke user (cross-database)
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id')
            ->on('mysql');
    }
}
```

---

## Implementasi Service

### GuaranteeService dengan Integrated Logic

**File: `app/Services/GuaranteeService.php`**

```php
<?php

namespace App\Services;

use App\Models\Guarantee;
use App\Models\GuaranteeItem;
use App\Models\GuaranteeHistory;
use App\Models\GuaranteeTransaction;
use App\Models\Asset;
use Illuminate\Support\Facades\DB;

class GuaranteeService
{
    /**
     * Get all guarantees with asset dan user info
     * INTEGRATED QUERY: Fetch dari kedua database
     */
    public function getAllGuarantees($paginate = true, $perPage = 15)
    {
        $query = Guarantee::with([
            'asset',              // Cross-database relation
            'guarantor',
            'createdBy',          // Cross-database relation
            'items',
            'transactions',
        ]);

        if ($paginate) {
            return $query->paginate($perPage);
        }

        return $query->get();
    }

    /**
     * Get guarantee by ID with all relations
     */
    public function getGuaranteeById($id)
    {
        return Guarantee::with([
            'asset',
            'guarantor',
            'createdBy',
            'items',
            'history',
            'transactions',
        ])->findOrFail($id);
    }

    /**
     * Create guarantee for asset - INTEGRATED APPROACH
     *
     * PERBEDAAN dari Non-Integrated:
     * - Cek langsung foreign key constraints
     * - Simpan asset_id directly (bukan copy)
     * - Gunakan atomic transactions
     */
    public function createGuaranteeForAsset($assetId, array $data)
    {
        // Atomic transaction melibatkan kedua database
        return DB::transaction(function () use ($assetId, $data) {
            // Step 1: Validasi asset ada di database primary
            $asset = Asset::findOrFail($assetId); // Will throw 404 jika tidak ada

            // Step 2: Create guarantee dengan direct asset_id reference
            $guarantee = Guarantee::create([
                'asset_id' => $assetId,                    // Direct reference
                'guarantor_id' => $data['guarantor_id'],
                'guarantee_type' => $data['guarantee_type'],
                'amount' => $data['amount'],
                'currency' => $data['currency'] ?? 'IDR',
                'status' => 'active',
                'start_date' => $data['start_date'],
                'end_date' => $data['end_date'] ?? null,
                'created_by' => auth()->id(),              // Direct user reference
                'notes' => $data['notes'] ?? null,
            ]);

            // Step 3: Record history
            $this->recordHistory(
                $guarantee->id,
                'created',
                null,
                'active',
                auth()->id(),
                "Guarantee dibuat untuk asset: {$asset->name}"
            );

            return $guarantee;
        });
    }

    /**
     * Update guarantee - INTEGRATED APPROACH
     */
    public function updateGuarantee($id, array $data)
    {
        return DB::transaction(function () use ($id, $data) {
            $guarantee = Guarantee::lockForUpdate()->findOrFail($id);
            $oldStatus = $guarantee->status;

            // Update dengan direct references
            $guarantee->update([
                'guarantor_id' => $data['guarantor_id'] ?? $guarantee->guarantor_id,
                'amount' => $data['amount'] ?? $guarantee->amount,
                'status' => $data['status'] ?? $guarantee->status,
                'end_date' => $data['end_date'] ?? $guarantee->end_date,
            ]);

            // Record history jika status berubah
            if (isset($data['status']) && $data['status'] !== $oldStatus) {
                $this->recordHistory(
                    $id,
                    'updated',
                    $oldStatus,
                    $data['status'],
                    auth()->id(),
                    'Status diperbarui'
                );
            }

            return $guarantee;
        });
    }

    /**
     * Release guarantee - INTEGRATED ATOMIC
     */
    public function releaseGuarantee($id, array $data = [])
    {
        return DB::transaction(function () use ($id, $data) {
            $guarantee = Guarantee::lockForUpdate()->findOrFail($id);

            // Update status
            $guarantee->update(['status' => 'released']);

            // Record history
            $this->recordHistory(
                $id,
                'released',
                'active',
                'released',
                auth()->id(),
                'Guarantee dilepaskan'
            );

            // Record transaction
            $this->recordTransaction(
                $id,
                'release',
                $guarantee->amount,
                $guarantee->currency,
                auth()->id(),
                $data['notes'] ?? null
            );

            return $guarantee;
        });
    }

    /**
     * Perform integrated query dengan JOIN
     *
     * ✅ Keuntungan integrated: Bisa query JOIN langsung di database layer
     */
    public function getGuaranteesWithAssetDetails()
    {
        // Query menggunakan raw SQL dengan explicit schema
        return DB::connection('mysql_jaminan')
            ->table('guarantees as g')
            ->join(
                DB::connection('mysql')->raw('asset_management_db.assets as a'),
                'g.asset_id',
                '=',
                'a.id'
            )
            ->select(
                'g.id',
                'g.guarantee_type',
                'g.amount',
                'g.status',
                'a.name as asset_name',
                'a.asset_code',
                'a.current_value'
            )
            ->get();
    }

    /**
     * Private methods
     */

    private function recordHistory($guaranteeId, $action, $oldStatus, $newStatus, $userId, $description)
    {
        return DB::connection('mysql_jaminan')->transaction(function () use ($guaranteeId, $action, $oldStatus, $newStatus, $userId, $description) {
            return GuaranteeHistory::create([
                'guarantee_id' => $guaranteeId,
                'action' => $action,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'user_id' => $userId,                      // Direct user reference
                'description' => $description,
            ]);
        });
    }

    private function recordTransaction($guaranteeId, $type, $amount, $currency, $userId, $notes = null)
    {
        return GuaranteeTransaction::create([
            'guarantee_id' => $guaranteeId,
            'transaction_type' => $type,
            'amount' => $amount,
            'currency' => $currency,
            'transaction_date' => now(),
            'user_id' => $userId,                          // Direct user reference
            'notes' => $notes,
        ]);
    }
}
```

---

## Data Synchronization

### Sinkronisasi Data antar Database

Dalam integrated architecture, sinkronisasi terjadi melalui relasi langsung, tapi ada beberapa skenario khusus:

#### Scenario 1: Asset di-update, Guarantee perlu notifikasi

**Menggunakan Events & Listeners:**

```php
// app/Events/AssetUpdated.php
namespace App\Events;

class AssetUpdated
{
    public function __construct(
        public Asset $asset,
        public array $changes
    ) {}
}

// app/Listeners/NotifyGuaranteeOnAssetUpdate.php
namespace App\Listeners;

use App\Events\AssetUpdated;
use Illuminate\Support\Facades\DB;

class NotifyGuaranteeOnAssetUpdate
{
    public function handle(AssetUpdated $event)
    {
        // Query guarantee yang reference asset ini
        $guarantees = DB::connection('mysql_jaminan')
            ->table('guarantees')
            ->where('asset_id', $event->asset->id)
            ->get();

        foreach ($guarantees as $guarantee) {
            // Lakukan aksi (update, notifikasi, logging)
            \Log::info("Asset {$event->asset->name} updated, affecting guarantee {$guarantee->id}");
        }
    }
}
```

#### Scenario 2: Foreign Key Validation

```php
// app/Http/Controllers/GuaranteeController.php
public function store(Request $request)
{
    $validated = $request->validate([
        'asset_id' => 'required|exists:mysql.assets,id',  // Validasi ke DB lain
        'guarantor_id' => 'required|exists:mysql_jaminan.guarantors,id',
        'amount' => 'required|numeric|min:0',
    ]);

    // Constraint dijaga di database level
    $guarantee = $this->guaranteeService->createGuaranteeForAsset(
        $validated['asset_id'],
        $validated
    );

    return response()->json(['status' => 'success', 'data' => $guarantee], 201);
}
```

---

## Migration & Database Structure

### Migration untuk Integrated Database

**File: `database/migrations/2024_11_19_000001_create_jaminan_integrated_tables.php`**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Guarantor table (lokal)
        Schema::connection('mysql_jaminan')->create('guarantors', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('identity_type');
            $table->string('identity_number')->unique();
            $table->text('address')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->softDeletes();
            $table->timestamps();
        });

        // Guarantee table dengan INTEGRATED references
        Schema::connection('mysql_jaminan')->create('guarantees', function (Blueprint $table) {
            $table->id();

            // ✅ INTEGRATED: Foreign key ke database primary
            $table->unsignedBigInteger('asset_id');        // Reference ke assets table
            $table->unsignedBigInteger('created_by');      // Reference ke users table

            // Lokal foreign keys
            $table->unsignedBigInteger('guarantor_id');

            // Data fields
            $table->enum('guarantee_type', ['cash', 'collateral', 'letter', 'insurance']);
            $table->decimal('amount', 15, 2);
            $table->string('currency', 3)->default('IDR');
            $table->enum('status', ['active', 'released', 'expired'])->default('active');
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->text('notes')->nullable();

            $table->softDeletes();
            $table->timestamps();

            // Lokal foreign key
            $table->foreign('guarantor_id')
                ->references('id')
                ->on('guarantors')
                ->onDelete('restrict');

            // Indexes untuk performa
            $table->index(['asset_id']);
            $table->index(['created_by']);
            $table->index(['guarantor_id']);
            $table->index(['status']);

            // ⚠️ CATATAN: Foreign key ke database lain tidak bisa langsung
            // Validation harus di application layer
            // Gunakan triggers atau application checks
        });

        // Guarantee items
        Schema::connection('mysql_jaminan')->create('guarantee_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('guarantee_id');
            $table->unsignedBigInteger('asset_id')->nullable();  // Reference lokal
            $table->string('description');
            $table->decimal('value', 15, 2);
            $table->integer('quantity')->default(1);
            $table->timestamps();

            $table->foreign('guarantee_id')
                ->references('id')
                ->on('guarantees')
                ->onDelete('cascade');

            $table->index(['guarantee_id']);
            $table->index(['asset_id']);
        });

        // Guarantee history
        Schema::connection('mysql_jaminan')->create('guarantee_history', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('guarantee_id');
            $table->enum('action', ['created', 'updated', 'released', 'expired']);
            $table->string('old_status')->nullable();
            $table->string('new_status');
            $table->unsignedBigInteger('user_id');          // Reference ke users table
            $table->text('description')->nullable();
            $table->timestamps();

            $table->foreign('guarantee_id')
                ->references('id')
                ->on('guarantees')
                ->onDelete('cascade');

            $table->index(['guarantee_id']);
            $table->index(['user_id']);
            $table->index(['created_at']);
        });

        // Guarantee transactions
        Schema::connection('mysql_jaminan')->create('guarantee_transactions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('guarantee_id');
            $table->enum('transaction_type', ['release', 'return', 'convert']);
            $table->decimal('amount', 15, 2);
            $table->string('currency', 3)->default('IDR');
            $table->dateTime('transaction_date');
            $table->unsignedBigInteger('user_id');          // Reference ke users table
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('guarantee_id')
                ->references('id')
                ->on('guarantees')
                ->onDelete('cascade');

            $table->index(['guarantee_id']);
            $table->index(['user_id']);
            $table->index(['transaction_date']);
        });
    }

    public function down(): void
    {
        Schema::connection('mysql_jaminan')->dropIfExists('guarantee_transactions');
        Schema::connection('mysql_jaminan')->dropIfExists('guarantee_history');
        Schema::connection('mysql_jaminan')->dropIfExists('guarantee_items');
        Schema::connection('mysql_jaminan')->dropIfExists('guarantees');
        Schema::connection('mysql_jaminan')->dropIfExists('guarantors');
    }
};
```

### Menjalankan Migration

```bash
# Jalankan migration untuk database jaminan
php artisan migrate --database=mysql_jaminan

# Verify struktur
mysql -u root -p asset_jaminan_db -e "SHOW TABLES;"
```

---

## Best Practices untuk Integrated Database

### 1. Explicit Connection pada Cross-Database Relations

```php
// ✅ BENAR: Specify connection untuk relasi cross-database
public function asset()
{
    return $this->belongsTo(Asset::class, 'asset_id')
        ->on('mysql');  // Explicit!
}

// ❌ JANGAN: Tidak specify connection
public function asset()
{
    return $this->belongsTo(Asset::class, 'asset_id');
    // Akan error: table not found
}
```

### 2. Atomic Transactions untuk Operasi Multi-Database

```php
// ✅ BENAR: Atomic transaction
DB::transaction(function () {
    Asset::create([...]);           // DB Primary
    Guarantee::create([...]);       // DB Jaminan
    GuaranteeHistory::create([...]); // DB Jaminan

    // Semua succeed atau rollback bersama
});

// ❌ JANGAN: Operasi separate tanpa transaction
Asset::create([...]);               // Success
Guarantee::create([...]);            // Fail! Asset sudah created
```

### 3. Application-Level Foreign Key Validation

```php
// MySQL tidak support FK antar database, jadi validasi di app
public function store(Request $request)
{
    $validated = $request->validate([
        'asset_id' => 'required|exists:mysql.assets,id',      // Validasi ke DB primary
        'created_by' => 'required|exists:mysql.users,id',     // Validasi ke DB primary
        'guarantor_id' => 'required|exists:mysql_jaminan.guarantors,id',
    ]);

    // ... create guarantee
}
```

### 4. Eager Loading untuk Performance

```php
// ✅ BENAR: Load relasi dari kedua database sekaligus
$guarantees = Guarantee::with([
    'asset',              // Cross-DB
    'guarantor',          // Lokal
    'createdBy',          // Cross-DB
])->paginate();

// ❌ JANGAN: N+1 queries
foreach ($guarantees as $guarantee) {
    $asset = $guarantee->asset;        // Query berulang!
    $user = $guarantee->createdBy;     // Query berulang!
}
```

### 5. Backup Strategy untuk Integrated Database

```bash
# Backup kedua database (urutan penting!)
# 1. Backup primary terlebih dahulu
mysqldump -u root -p asset_management_db > backup_primary.sql

# 2. Kemudian backup jaminan
mysqldump -u root -p asset_jaminan_db > backup_jaminan.sql

# Restore (URUTAN TERBALIK!)
# 1. Restore primary terlebih dahulu
mysql -u root -p asset_management_db < backup_primary.sql

# 2. Kemudian restore jaminan
mysql -u root -p asset_jaminan_db < backup_jaminan.sql

# Reason: Jaminan punya FK ke primary, jadi primary harus exist dulu
```

### 6. Monitoring Cross-Database Integrity

```php
// Command untuk check data integrity
// app/Console/Commands/ValidateGuaranteeIntegrity.php

class ValidateGuaranteeIntegrity extends Command
{
    public function handle()
    {
        // Check referential integrity
        $orphanGuarantees = DB::connection('mysql_jaminan')
            ->table('guarantees as g')
            ->leftJoin(
                DB::connection('mysql')->raw('asset_management_db.assets as a'),
                'g.asset_id',
                '=',
                'a.id'
            )
            ->whereNull('a.id')
            ->count();

        if ($orphanGuarantees > 0) {
            $this->error("Found {$orphanGuarantees} guarantee dengan asset yang tidak ada!");
        } else {
            $this->info("Integrity check passed!");
        }
    }
}
```

---

## Troubleshooting

### Problem 1: "Table not found" pada Cross-Database Relation

**Error:** `SQLSTATE[42S02]: Table not found: 1146 Table...`

**Penyebab:** Relasi tidak specify connection

**Solusi:**
```php
// ✅ BENAR
public function asset()
{
    return $this->belongsTo(Asset::class, 'asset_id')
        ->on('mysql');  // Add this!
}
```

### Problem 2: Foreign Key Constraint Error

**Error:** `Integrity constraint violation: 1452 Cannot add or update a child row`

**Penyebab:** Asset tidak exist ketika membuat guarantee

**Solusi:**
```php
// Validasi asset sebelum create guarantee
$request->validate([
    'asset_id' => 'required|exists:mysql.assets,id',
]);
```

### Problem 3: Transaction Rollback Tidak Konsisten

**Error:** Guarantee created tapi history tidak

**Penyebab:** Tidak menggunakan atomic transaction

**Solusi:**
```php
// Wrap dalam transaction
DB::transaction(function () {
    $guarantee = Guarantee::create([...]);
    GuaranteeHistory::create([...]);
    // Atomic!
});
```

### Problem 4: Performance Lambat pada Cross-Database Query

**Error:** Query timeout atau response lambat

**Solusi:**
```php
// Gunakan eager loading
$guarantees = Guarantee::with(['asset', 'createdBy'])->get();

// Bukan:
$guarantees = Guarantee::all();
foreach ($guarantees as $g) {
    $asset = $g->asset;  // N+1 queries!
}
```

---

## Implementation Checklist

### Phase 1: Setup Infrastructure
- [ ] Configure `.env` dengan database jaminan credentials
- [ ] Update `config/database.php`
- [ ] Test koneksi ke kedua database
- [ ] Verify connection status

### Phase 2: Create Database & Tables
- [ ] Create database `asset_jaminan_db`
- [ ] Run migration dengan relasi integrated
- [ ] Verify foreign key setup
- [ ] Create indexes untuk performa

### Phase 3: Model & Relations
- [ ] Create BaseJaminanModel
- [ ] Create model dengan cross-database relations
- [ ] Add explicit ->on('mysql') di relations
- [ ] Test relasi dengan tinker

### Phase 4: Service & Business Logic
- [ ] Create GuaranteeService
- [ ] Implement atomic transactions
- [ ] Add validation untuk FK
- [ ] Test create/update/delete operations

### Phase 5: API & Controllers
- [ ] Create GuaranteeController
- [ ] Implement CRUD endpoints
- [ ] Add validation rules
- [ ] Test dengan Postman

### Phase 6: Testing & Validation
- [ ] Unit test untuk services
- [ ] Integration test untuk controllers
- [ ] Data integrity tests
- [ ] Transaction rollback tests

### Phase 7: Documentation & Monitoring
- [ ] Document API endpoints
- [ ] Setup logging untuk operations
- [ ] Create integrity check scripts
- [ ] Setup alerts untuk FK violations

### Phase 8: Backup & Recovery
- [ ] Test backup strategy
- [ ] Test restore procedure
- [ ] Document recovery steps
- [ ] Create disaster recovery plan

---

## Comparison Table: Integrated vs Non-Integrated

| Fitur | Non-Integrated | Integrated |
|-------|---|---|
| **Setup Complexity** | Simple | Moderate |
| **Data Integrity** | Application-level | Database constraints |
| **Transactions** | Per-database | Multi-database atomic |
| **Queries** | Separate, no JOIN | JOIN antar database |
| **Backup/Restore** | Simple independen | Kompleks coordinated |
| **Scalability** | Independent scale | Scale bersama |
| **When to Use** | Sistem terpisah | Sistem terintegrasi |
| **Learning Curve** | Mudah | Lebih rumit |
| **Performance** | No cross-DB overhead | Perlu optimization |

---

## Summary

### Integrated Architecture Key Points:

✅ **Data Integrity**: Foreign key constraints menjamin konsistensi
✅ **Transactional Safety**: Atomic operations di kedua database
✅ **Query Performance**: Bisa JOIN langsung di database layer
✅ **Relational Logic**: Eloquent relations bekerja across databases

❌ **Tight Coupling**: Database saling tergantung
❌ **Backup Complexity**: Harus coordinated backup/restore
❌ **Scale Limitation**: Sulit scale database terpisah
❌ **MySQL Limitation**: Tidak support true foreign keys antar database

### Kapan Gunakan Integrated Architecture:

1. **Sistem terpadu** - Asset dan Jaminan saling tergantung
2. **Strong consistency** - Integritas data sangat penting
3. **ACID requirements** - Perlu atomic transactions
4. **Not distributed system** - Database di server yang sama
5. **Single organization** - Semua data satu ownership

---

**Dokumen versi:** 1.0 (Integrated Architecture)
**Tanggal:** November 2024
**Status:** Ready untuk implementasi
**Type:** Integrated (Tightly Coupled Databases)
