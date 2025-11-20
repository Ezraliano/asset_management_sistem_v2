# Dokumentasi Arsitektur Multi-Database untuk Fitur Jaminan

## Daftar Isi
1. [Pengenalan](#pengenalan)
2. [Kenapa Multi-Database?](#kenapa-multi-database)
3. [Arsitektur Sistem](#arsitektur-sistem)
4. [Konfigurasi Database](#konfigurasi-database)
5. [Implementasi Model](#implementasi-model)
6. [Implementasi Service](#implementasi-service)
7. [Migration dan Database Structure](#migration-dan-database-structure)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Pengenalan

Dokumen ini menjelaskan bagaimana mengimplementasikan **multi-database architecture non-integrated** dalam aplikasi Asset Management System V2 menggunakan Laravel.

**Fitur Jaminan akan menggunakan database yang SEPENUHNYA TERPISAH dari database utama** - tidak ada hubungan, relasi, atau dependency antara keduanya. Kedua database berfungsi sebagai sistem yang independen.

**Ya, Laravel dapat terkoneksi dengan 2 database atau lebih sekaligus tanpa masalah.**

### Tipe Arsitektur: Non-Integrated (Fully Independent)

Database Jaminan adalah **sistem standalone** yang:
- ❌ TIDAK memiliki foreign key constraints ke database primary
- ❌ TIDAK melakukan join data dengan database primary
- ❌ TIDAK berbagi user/role/permission dengan database primary
- ✅ Memiliki structure lengkap dan self-contained
- ✅ Bisa di-backup, restore, dan scale secara independen
- ✅ Bisa diakses oleh aplikasi berbeda jika diperlukan

---

## Kenapa Multi-Database?

### Keuntungan Multi-Database:

| Aspek | Manfaat |
|-------|---------|
| **Isolasi Data** | Data Jaminan terpisah dari data utama, mengurangi risiko |
| **Skalabilitas** | Database Jaminan dapat di-scale secara independen |
| **Performance** | Mengurangi beban query pada database utama |
| **Keamanan** | Akses terpisah dan kontrol yang lebih granular |
| **Maintenance** | Backup dan maintenance lebih mudah dilakukan terpisah |
| **Audit Trail** | Lebih mudah untuk melakukan audit pada transaksi Jaminan |

### Kasus Penggunaan:

- **Database 1 (Primary)**: Asset, User, Peminjaman, Penjualan, Depreciation, dll
- **Database 2 (Jaminan)**: HANYA Collateral/Jaminan, Guarantor, History, Transaction

---

## Comparison: Integrated vs Non-Integrated Architecture

### Model 1: Integrated (Shared Reference)
```
Asset Table (DB Primary)
├─ id
├─ asset_id (FK) → Database Jaminan
├─ name
└─ ...

Guarantee Table (DB Jaminan)
├─ id
├─ asset_id (Reference ke primary DB)  ← Foreign key ke database lain
├─ amount
└─ ...
```

**Masalah:**
- ❌ Dependency mutual
- ❌ Sulit scale terpisah
- ❌ Recovery lebih rumit

### Model 2: Non-Integrated (Fully Separate) ✅ YANG ANDA GUNAKAN
```
Database Primary:
├─ Asset Table
│  ├─ id
│  ├─ name
│  └─ ...
└─ (TIDAK ada referensi ke Jaminan DB)

Database Jaminan (STANDALONE):
├─ Guarantor Table
│  ├─ id
│  ├─ name
│  └─ ...
├─ Guarantee Table
│  ├─ id
│  ├─ guarantor_id (FK) → Local (same DB)
│  ├─ reference_number (unique identifier)
│  ├─ description (lengkap, self-contained)
│  └─ ...
└─ (INDEPENDEN, bisa berdiri sendiri)
```

**Keuntungan:**
- ✅ Sepenuhnya independent
- ✅ Mudah scale terpisah
- ✅ Recovery/backup simple
- ✅ Bisa diakses sistem lain jika perlu
- ✅ Zero dependency

---

## Arsitektur Sistem

### Tipe Database: Non-Integrated (Terpisah Penuh)

Database Jaminan adalah **database standalone** yang **TIDAK tergantung** pada database utama. Keduanya berjalan independen tanpa relasi atau referensi cross-database.

### Diagram Arsitektur

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (React/Vite)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ Module Asset Management    │    Module Jaminan (Collateral)      │
│                            │                                      │
└────────────┬───────────────┴────────────┬───────────────────────┘
             │                            │
             ▼                            ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│   Laravel API Backend        │ │   Jaminan Service Backend     │
│   (AssetController, etc)     │ │   (GuaranteeController)      │
└──────────────────────────────┘ └──────────────────────────────┘
             │                            │
             │ (Database Layer)           │ (Database Layer)
             │                            │
             ▼                            ▼
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
│ • roles                      │ │ • collateral_types           │
│ • permissions                │ │ • insurance_companies        │
│                              │ │                              │
│ Connection: mysql (primary)  │ │ Connection: mysql_jaminan    │
│ Server: 127.0.0.1:3306       │ │ Server: 127.0.0.1:3306       │
│ Database: asset_management   │ │ Database: asset_jaminan      │
│                              │ │                              │
└──────────────────────────────┘ └──────────────────────────────┘

        ❌ TANPA RELASI LANGSUNG (NO FOREIGN KEY CONSTRAINTS)
        ❌ TANPA CROSS-REFERENCE
        ❌ SEPENUHNYA INDEPENDEN
```

### Karakteristik Non-Integrated Architecture:

| Aspek | Detail |
|-------|--------|
| **Independensi** | Kedua database berjalan terpisah |
| **Data Sync** | Jika ada kebutuhan sync, lakukan di aplikasi layer |
| **Foreign Keys** | TIDAK ADA foreign key antar database |
| **Referensi** | Hanya via ID (primary key) di aplikasi |
| **Recovery** | Masing-masing database bisa di-backup/restore terpisah |
| **Scaling** | Bisa scaled terpisah sesuai kebutuhan |
| **Maintenance** | Independen, tidak saling mempengaruhi |

---

## Konfigurasi Database

### Prinsip Non-Integrated Architecture

✅ **2 Database yang sepenuhnya independen**
- Database Primary (asset_management_db)
- Database Jaminan (asset_jaminan_db)

❌ **TIDAK ADA:**
- Foreign key constraints antar database
- Direct reference/join antar database
- Shared tables atau data dependency
- Automatic synchronization

### 1. File `.env` Configuration

**Setup untuk 2 Database yang Independen:**

```env
# Database 1 - Primary (Asset Management System)
# Digunakan untuk: Assets, Users, Loans, Sales, Depreciation, dll
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=asset_management_db
DB_USERNAME=root
DB_PASSWORD=

# Database 2 - Jaminan (Guarantee/Collateral System)
# INDEPENDEN dari database primary
# Digunakan HANYA untuk: Guarantors, Guarantees, History, Transactions
DB_CONNECTION_JAMINAN=mysql
DB_HOST_JAMINAN=127.0.0.1
DB_PORT_JAMINAN=3306
DB_DATABASE_JAMINAN=asset_jaminan_db
DB_USERNAME_JAMINAN=root
DB_PASSWORD_JAMINAN=

# ⚠️ Catatan: Host bisa berbeda jika database di server berbeda
# Contoh untuk server berbeda:
# DB_HOST_JAMINAN=192.168.1.100
# DB_PORT_JAMINAN=3306
```

### 2. File `config/database.php` Configuration

Tambahkan konfigurasi koneksi baru untuk database Jaminan:

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

    // Tambahan: Database Jaminan
    'mysql_jaminan' => [
        'driver' => 'mysql',
        'host' => env('DB_HOST_JAMINAN', '127.0.0.1'),
        'port' => env('DB_PORT_JAMINAN', '3306'),
        'database' => env('DB_DATABASE_JAMINAN', 'asset_jaminan_db'),
        'username' => env('DB_USERNAME_JAMINAN', 'root'),
        'password' => env('DB_PASSWORD_JAMINAN', ''),
        'charset' => env('DB_CHARSET', 'utf8mb4'),
        'collation' => env('DB_COLLATION', 'utf8mb4_unicode_ci'),
        'prefix' => 'jam_',
        'prefix_indexes' => true,
        'strict' => true,
        'engine' => null,
    ],
],
```

**Catatan:**
- Prefix `jam_` optional, digunakan untuk membedakan tabel dari database lain jika digabung
- Bisa menggunakan host yang berbeda untuk database yang berbeda server

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
     * Tentukan koneksi database yang digunakan
     *
     * @var string|null
     */
    protected $connection = 'mysql_jaminan';

    /**
     * Disable timestamps jika tidak diperlukan
     * atau enable jika diperlukan
     *
     * @var bool
     */
    public $timestamps = true;
}
```

### 2. Model Jaminan

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
        'reference_number',   // Nomor referensi jaminan (unique)
        'guarantor_id',       // ID dari tabel guarantor (LOKAL)
        'guarantee_type',     // Type: cash, collateral, letter
        'description',        // Deskripsi jaminan/collateral
        'amount',
        'currency',
        'status',             // active, released, expired
        'start_date',
        'end_date',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    /**
     * ⚠️ PENTING: Database ini INDEPENDEN
     * Tidak ada referensi/foreign key ke database primary (asset_management)
     * Semua data bersifat lokal/standalone
     */

    /**
     * Relasi ke tabel guarantor (LOKAL - sama database)
     */
    public function guarantor()
    {
        return $this->belongsTo(Guarantor::class, 'guarantor_id');
    }

    /**
     * Relasi ke tabel guarantee_items (LOKAL - sama database)
     */
    public function items()
    {
        return $this->hasMany(GuaranteeItem::class, 'guarantee_id');
    }

    /**
     * Relasi ke tabel guarantee_history (LOKAL - sama database)
     */
    public function history()
    {
        return $this->hasMany(GuaranteeHistory::class, 'guarantee_id');
    }

    /**
     * Relasi ke tabel guarantee_transactions (LOKAL - sama database)
     */
    public function transactions()
    {
        return $this->hasMany(GuaranteeTransaction::class, 'guarantee_id');
    }
}
```

### Catatan Penting: Non-Integrated Database

Database Jaminan **berdiri sendiri** dan **tidak memiliki hubungan** dengan database primary. Struktur tabel dirancang untuk:

- ✅ **Standalone**: Bisa berfungsi penuh tanpa bergantung database primary
- ✅ **Independent**: Data jaminan tidak perlu sinkronisasi otomatis dengan asset
- ✅ **Self-contained**: Semua informasi jaminan ada di database ini
- ✅ **Audit Trail**: History dan transactions tercatat lengkap di sini

### 3. Model Guarantor (Penjamin)

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
        'identity_type',      // KTP, NPWP, etc
        'identity_number',
        'address',
        'phone',
        'email',
        'status',
    ];

    /**
     * Relasi ke guarantees
     */
    public function guarantees()
    {
        return $this->hasMany(Guarantee::class, 'guarantor_id');
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
        'asset_id',           // Reference ke asset dari primary db
        'description',
        'value',
        'quantity',
    ];

    protected $casts = [
        'value' => 'decimal:2',
        'quantity' => 'integer',
    ];

    public function guarantee()
    {
        return $this->belongsTo(Guarantee::class);
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
        'action',              // created, updated, released, expired
        'old_status',
        'new_status',
        'user_id',            // Reference dari primary db
        'description',
    ];

    public function guarantee()
    {
        return $this->belongsTo(Guarantee::class);
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
        'transaction_type',   // release, return, convert
        'amount',
        'currency',
        'transaction_date',
        'user_id',           // Reference dari primary db
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'transaction_date' => 'datetime',
    ];

    public function guarantee()
    {
        return $this->belongsTo(Guarantee::class);
    }
}
```

---

## Implementasi Service

### 1. GuaranteeService

**File: `app/Services/GuaranteeService.php`**

```php
<?php

namespace App\Services;

use App\Models\Guarantee;
use App\Models\GuaranteeItem;
use App\Models\GuaranteeHistory;
use App\Models\GuaranteeTransaction;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\Paginator;

class GuaranteeService
{
    /**
     * Ambil semua jaminan
     */
    public function getAllGuarantees($paginate = true, $perPage = 15)
    {
        $query = Guarantee::with(['guarantor', 'items', 'transactions']);

        if ($paginate) {
            return $query->paginate($perPage);
        }

        return $query->get();
    }

    /**
     * Ambil jaminan berdasarkan ID
     */
    public function getGuaranteeById($id)
    {
        return Guarantee::with(['guarantor', 'items', 'history', 'transactions'])
            ->findOrFail($id);
    }

    /**
     * Buat jaminan baru
     */
    public function createGuarantee(array $data)
    {
        $guarantee = Guarantee::create([
            'asset_id' => $data['asset_id'],
            'guarantor_id' => $data['guarantor_id'],
            'guarantee_type' => $data['guarantee_type'],
            'amount' => $data['amount'],
            'currency' => $data['currency'] ?? 'IDR',
            'status' => 'active',
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'] ?? null,
            'notes' => $data['notes'] ?? null,
        ]);

        // Catat history
        $this->recordHistory($guarantee->id, 'created', null, 'active', auth()->id() ?? 1, 'Jaminan dibuat');

        return $guarantee;
    }

    /**
     * Update jaminan
     */
    public function updateGuarantee($id, array $data)
    {
        $guarantee = Guarantee::findOrFail($id);
        $oldStatus = $guarantee->status;

        $guarantee->update($data);

        // Catat history jika status berubah
        if (isset($data['status']) && $data['status'] !== $oldStatus) {
            $this->recordHistory(
                $id,
                'updated',
                $oldStatus,
                $data['status'],
                auth()->id() ?? 1,
                $data['notes'] ?? 'Status diperbarui'
            );
        }

        return $guarantee;
    }

    /**
     * Release/Lepaskan jaminan
     */
    public function releaseGuarantee($id, array $data = [])
    {
        $guarantee = Guarantee::findOrFail($id);

        $guarantee->update(['status' => 'released']);

        // Catat history
        $this->recordHistory($id, 'released', 'active', 'released', auth()->id() ?? 1, 'Jaminan dilepaskan');

        // Catat transaksi
        $this->recordTransaction(
            $id,
            'release',
            $guarantee->amount,
            $guarantee->currency,
            auth()->id() ?? 1,
            $data['notes'] ?? null
        );

        return $guarantee;
    }

    /**
     * Hapus jaminan (soft delete)
     */
    public function deleteGuarantee($id)
    {
        $guarantee = Guarantee::findOrFail($id);
        return $guarantee->delete();
    }

    /**
     * Catat history jaminan
     */
    public function recordHistory($guaranteeId, $action, $oldStatus, $newStatus, $userId, $description)
    {
        return GuaranteeHistory::create([
            'guarantee_id' => $guaranteeId,
            'action' => $action,
            'old_status' => $oldStatus,
            'new_status' => $newStatus,
            'user_id' => $userId,
            'description' => $description,
        ]);
    }

    /**
     * Catat transaksi jaminan
     */
    public function recordTransaction($guaranteeId, $type, $amount, $currency, $userId, $notes = null)
    {
        return GuaranteeTransaction::create([
            'guarantee_id' => $guaranteeId,
            'transaction_type' => $type,
            'amount' => $amount,
            'currency' => $currency,
            'transaction_date' => now(),
            'user_id' => $userId,
            'notes' => $notes,
        ]);
    }

    /**
     * Cari jaminan berdasarkan kriteria
     */
    public function searchGuarantees(array $filters)
    {
        $query = Guarantee::query();

        if (!empty($filters['guarantor_id'])) {
            $query->where('guarantor_id', $filters['guarantor_id']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['guarantee_type'])) {
            $query->where('guarantee_type', $filters['guarantee_type']);
        }

        if (!empty($filters['start_date'])) {
            $query->whereDate('start_date', '>=', $filters['start_date']);
        }

        if (!empty($filters['end_date'])) {
            $query->whereDate('end_date', '<=', $filters['end_date']);
        }

        return $query->paginate(15);
    }

    /**
     * Ambil statistik jaminan
     */
    public function getStatistics()
    {
        return [
            'total_active' => Guarantee::where('status', 'active')->count(),
            'total_released' => Guarantee::where('status', 'released')->count(),
            'total_amount' => Guarantee::where('status', 'active')->sum('amount'),
            'by_type' => Guarantee::selectRaw('guarantee_type, COUNT(*) as count, SUM(amount) as total_amount')
                ->groupBy('guarantee_type')
                ->get(),
        ];
    }
}
```

### 2. GuarantorService

**File: `app/Services/GuarantorService.php`**

```php
<?php

namespace App\Services;

use App\Models\Guarantor;

class GuarantorService
{
    /**
     * Ambil semua penjamin
     */
    public function getAllGuarantors($paginate = true)
    {
        $query = Guarantor::with('guarantees');

        return $paginate ? $query->paginate(15) : $query->get();
    }

    /**
     * Buat penjamin baru
     */
    public function createGuarantor(array $data)
    {
        return Guarantor::create([
            'name' => $data['name'],
            'identity_type' => $data['identity_type'],
            'identity_number' => $data['identity_number'],
            'address' => $data['address'] ?? null,
            'phone' => $data['phone'] ?? null,
            'email' => $data['email'] ?? null,
            'status' => 'active',
        ]);
    }

    /**
     * Update penjamin
     */
    public function updateGuarantor($id, array $data)
    {
        $guarantor = Guarantor::findOrFail($id);
        return $guarantor->update($data);
    }
}
```

---

## Migration dan Database Structure

### 1. Migration Membuat Tabel Guarantees

**File: `database/migrations/2024_11_19_000000_create_jaminan_tables.php`**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Set koneksi ke database jaminan
        Schema::connection('mysql_jaminan')->create('guarantors', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('identity_type'); // KTP, NPWP, Passport
            $table->string('identity_number')->unique();
            $table->text('address')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::connection('mysql_jaminan')->create('guarantees', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('asset_id');           // Reference ke primary db
            $table->unsignedBigInteger('guarantor_id');
            $table->enum('guarantee_type', ['cash', 'collateral', 'letter', 'insurance'])->default('cash');
            $table->decimal('amount', 15, 2);
            $table->string('currency', 3)->default('IDR');
            $table->enum('status', ['active', 'released', 'expired'])->default('active');
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->text('notes')->nullable();
            $table->softDeletes();
            $table->timestamps();

            // Foreign key
            $table->foreign('guarantor_id')
                ->references('id')
                ->on('guarantors')
                ->onDelete('restrict');

            // Index
            $table->index(['asset_id']);
            $table->index(['guarantor_id']);
            $table->index(['status']);
            $table->index(['start_date']);
        });

        Schema::connection('mysql_jaminan')->create('guarantee_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('guarantee_id');
            $table->unsignedBigInteger('asset_id');           // Reference ke primary db
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

        Schema::connection('mysql_jaminan')->create('guarantee_history', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('guarantee_id');
            $table->enum('action', ['created', 'updated', 'released', 'expired', 'returned'])->default('created');
            $table->string('old_status')->nullable();
            $table->string('new_status');
            $table->unsignedBigInteger('user_id');           // Reference ke primary db
            $table->text('description')->nullable();
            $table->timestamps();

            $table->foreign('guarantee_id')
                ->references('id')
                ->on('guarantees')
                ->onDelete('cascade');

            $table->index(['guarantee_id']);
            $table->index(['created_at']);
        });

        Schema::connection('mysql_jaminan')->create('guarantee_transactions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('guarantee_id');
            $table->enum('transaction_type', ['release', 'return', 'convert', 'adjustment'])->default('release');
            $table->decimal('amount', 15, 2);
            $table->string('currency', 3)->default('IDR');
            $table->dateTime('transaction_date');
            $table->unsignedBigInteger('user_id');           // Reference ke primary db
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('guarantee_id')
                ->references('id')
                ->on('guarantees')
                ->onDelete('cascade');

            $table->index(['guarantee_id']);
            $table->index(['transaction_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
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

### 2. Menjalankan Migration

```bash
# Untuk database jaminan spesifik
php artisan migrate --database=mysql_jaminan

# Untuk semua database
php artisan migrate
```

---

## Best Practices untuk Non-Integrated Database

### 1. Isolasi Koneksi Database

Selalu pastikan model menggunakan koneksi yang benar:

```php
class Guarantee extends BaseJaminanModel
{
    protected $connection = 'mysql_jaminan';
}
```

**Kenapa penting?** Database jaminan sepenuhnya terpisah, jadi model harus always menunjuk ke koneksi yang tepat.

### 2. NO Cross-Database References

Karena database ini **independen**, JANGAN menyimpan referensi ID dari database primary:

```php
// ❌ JANGAN PERNAH: Tidak ada referensi ke database primary
$table->unsignedBigInteger('asset_id');     // TIDAK!
$table->unsignedBigInteger('user_id');      // TIDAK!
$table->unsignedBigInteger('loan_id');      // TIDAK!

// ✅ BENAR: Semua data lokal dan self-contained
class Guarantee extends BaseJaminanModel
{
    protected $fillable = [
        'reference_number',   // Nomor unik jaminan
        'guarantor_id',       // Lokal (ke tabel guarantors di DB ini)
        'description',        // Deskripsi lengkap
        'amount',
        'currency',
        'status',
    ];
}
```

### 3. Data Structure: Complete & Self-Contained

Database jaminan harus menyimpan **SEMUA informasi yang dibutuhkan**:

```php
// Tabel guarantor harus complete dengan informasi lengkap
Schema::connection('mysql_jaminan')->create('guarantors', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('identity_type');        // KTP, NPWP, Paspor
    $table->string('identity_number');      // Nomor lengkap
    $table->text('address');                // Alamat lengkap
    $table->string('phone');
    $table->string('email');
    $table->string('position_title');       // Posisi/Jabatan
    $table->string('company_name');         // Perusahaan
    // ... informasi lengkap lainnya
});

// Tabel guarantee harus complete dengan deskripsi lengkap
Schema::connection('mysql_jaminan')->create('guarantees', function (Blueprint $table) {
    $table->id();
    $table->string('reference_number')->unique(); // Nomor referensi unik
    $table->unsignedBigInteger('guarantor_id');
    $table->string('guarantee_type');       // cash, collateral, letter, etc
    $table->text('description');            // Deskripsi detailed jaminan
    $table->decimal('amount', 15, 2);
    $table->string('currency', 3);
    $table->enum('status', ['active', 'released', 'expired']);
    // ... semua data yang diperlukan
});
```

### 4. NO Inter-Database Transactions

Jangan menggunakan transaction yang melibatkan 2 database:

```php
// ❌ JANGAN: Transaction multi-database
DB::transaction(function () {
    Guarantee::create([...]);           // DB: mysql_jaminan
    Asset::update([...]);               // DB: mysql (primary)
});

// ✅ BENAR: Transaction per-database
// Database Jaminan
DB::connection('mysql_jaminan')->transaction(function () {
    Guarantee::create([...]);
    GuaranteeHistory::create([...]);
});

// Jika perlu update di database lain, lakukan terpisah
DB::connection('mysql')->transaction(function () {
    Asset::update([...]);
});
```

### 5. Data Mapping & Manual Sync

Jika ada kebutuhan untuk "link" dengan data dari database primary, gunakan mapping table terpisah:

```php
// Buat tabel untuk menyimpan mapping (optional)
Schema::connection('mysql_jaminan')->create('asset_guarantee_mapping', function (Blueprint $table) {
    $table->id();
    $table->string('external_asset_id');    // ID dari database primary (string)
    $table->unsignedBigInteger('guarantee_id');
    $table->string('asset_description');    // Deskripsi asset (copied value)
    $table->timestamps();

    $table->foreign('guarantee_id')
        ->references('id')
        ->on('guarantees')
        ->onDelete('cascade');
});

// Atau gunakan query separate tanpa relasi
$guarantee = Guarantee::find($id);
// Gunakan guarantee->description yang sudah complete, jangan fetch dari database lain
```

### 6. Backup Strategy (Independent)

```bash
# Backup database jaminan TERPISAH dan MANDIRI
mysqldump -u root -p --single-transaction asset_jaminan_db > backup_jaminan_$(date +%Y%m%d_%H%M%S).sql

# Restore jika diperlukan (tanpa dependency)
mysql -u root -p asset_jaminan_db < backup_jaminan.sql

# Database primary dan jaminan bisa di-backup/restore secara terpisah
# Tidak ada dependency satu sama lain
```

### 7. Error Handling (Isolated)

```php
// Error di database jaminan tidak boleh affect database primary
try {
    $guarantee = Guarantee::create([...]);
} catch (\Exception $e) {
    Log::error('Guarantee creation failed', [
        'error' => $e->getMessage(),
        'database' => 'mysql_jaminan',
    ]);
    // Aplikasi tetap berjalan, database primary tidak terpengaruh
    throw $e;
}
```

### 8. Monitoring & Logging (Per-Database)

```php
// Log harus mencatat dengan jelas database mana yang digunakan
class GuaranteeService
{
    public function createGuarantee(array $data)
    {
        try {
            $guarantee = Guarantee::create([...]);

            Log::info('Guarantee created', [
                'database' => 'mysql_jaminan',      // Spesifik database
                'guarantee_id' => $guarantee->id,
                'reference_number' => $guarantee->reference_number,
                'amount' => $guarantee->amount,
                'timestamp' => now(),
            ]);

            return $guarantee;
        } catch (\Exception $e) {
            Log::error('Failed to create guarantee', [
                'database' => 'mysql_jaminan',
                'error' => $e->getMessage(),
                'data' => $data,
            ]);
            throw $e;
        }
    }
}
```

---

## Controller Implementation

### File: `app/Http/Controllers/GuaranteeController.php`

```php
<?php

namespace App\Http\Controllers;

use App\Services\GuaranteeService;
use App\Services\GuarantorService;
use Illuminate\Http\Request;

class GuaranteeController extends Controller
{
    public function __construct(
        private GuaranteeService $guaranteeService,
        private GuarantorService $guarantorService,
    ) {}

    /**
     * Display list of guarantees
     */
    public function index(Request $request)
    {
        $guarantees = $this->guaranteeService->getAllGuarantees(
            paginate: true,
            perPage: $request->input('per_page', 15)
        );

        return response()->json([
            'status' => 'success',
            'data' => $guarantees,
        ]);
    }

    /**
     * Show single guarantee
     */
    public function show($id)
    {
        $guarantee = $this->guaranteeService->getGuaranteeById($id);

        return response()->json([
            'status' => 'success',
            'data' => $guarantee,
        ]);
    }

    /**
     * Create guarantee
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'asset_id' => 'required|integer',
            'guarantor_id' => 'required|exists:mysql_jaminan.guarantors,id',
            'guarantee_type' => 'required|in:cash,collateral,letter,insurance',
            'amount' => 'required|numeric|min:0',
            'currency' => 'string|max:3',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after:start_date',
            'notes' => 'nullable|string',
        ]);

        $guarantee = $this->guaranteeService->createGuarantee($validated);

        return response()->json([
            'status' => 'success',
            'data' => $guarantee,
            'message' => 'Jaminan berhasil dibuat',
        ], 201);
    }

    /**
     * Update guarantee
     */
    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'guarantor_id' => 'sometimes|exists:mysql_jaminan.guarantors,id',
            'guarantee_type' => 'sometimes|in:cash,collateral,letter,insurance',
            'amount' => 'sometimes|numeric|min:0',
            'status' => 'sometimes|in:active,released,expired',
            'end_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $guarantee = $this->guaranteeService->updateGuarantee($id, $validated);

        return response()->json([
            'status' => 'success',
            'data' => $guarantee,
            'message' => 'Jaminan berhasil diperbarui',
        ]);
    }

    /**
     * Release guarantee
     */
    public function release(Request $request, $id)
    {
        $validated = $request->validate([
            'notes' => 'nullable|string',
        ]);

        $guarantee = $this->guaranteeService->releaseGuarantee($id, $validated);

        return response()->json([
            'status' => 'success',
            'data' => $guarantee,
            'message' => 'Jaminan berhasil dilepaskan',
        ]);
    }

    /**
     * Delete guarantee
     */
    public function destroy($id)
    {
        $this->guaranteeService->deleteGuarantee($id);

        return response()->json([
            'status' => 'success',
            'message' => 'Jaminan berhasil dihapus',
        ]);
    }

    /**
     * Get guarantee statistics
     */
    public function statistics()
    {
        $stats = $this->guaranteeService->getStatistics();

        return response()->json([
            'status' => 'success',
            'data' => $stats,
        ]);
    }
}
```

---

## Routes Configuration

### File: `routes/api.php`

```php
Route::middleware('auth:sanctum')->group(function () {
    // Guarantee Routes
    Route::prefix('guarantees')->group(function () {
        Route::get('/', [GuaranteeController::class, 'index']);
        Route::post('/', [GuaranteeController::class, 'store']);
        Route::get('/{id}', [GuaranteeController::class, 'show']);
        Route::put('/{id}', [GuaranteeController::class, 'update']);
        Route::post('/{id}/release', [GuaranteeController::class, 'release']);
        Route::delete('/{id}', [GuaranteeController::class, 'destroy']);
        Route::get('/statistics', [GuaranteeController::class, 'statistics']);
    });

    // Guarantor Routes
    Route::prefix('guarantors')->group(function () {
        Route::get('/', [GuarantorController::class, 'index']);
        Route::post('/', [GuarantorController::class, 'store']);
        Route::get('/{id}', [GuarantorController::class, 'show']);
        Route::put('/{id}', [GuarantorController::class, 'update']);
    });
});
```

---

## Practical Implementation Guide: Non-Integrated Database

### Scenario: Menghubungkan Jaminan dengan Asset (tanpa FK)

**Kebutuhan:**
User ingin membuat jaminan untuk sebuah asset, tapi database terpisah.

#### ❌ JANGAN LAKUKAN INI (Integrated approach):

```php
// Guarantee Table dengan asset_id reference
$table->unsignedBigInteger('asset_id');
$table->foreign('asset_id')
    ->references('id')
    ->on('mysql.assets')  // ← JANGAN! MySQL tidak support cross-DB FK
    ->onDelete('cascade');
```

**Masalah:** MySQL tidak support foreign key constraints antar database.

#### ✅ LAKUKAN INI (Non-Integrated approach):

**Step 1: Database Jaminan - Simpan deskripsi lengkap**

```php
// Migration di database jaminan
Schema::connection('mysql_jaminan')->create('guarantees', function (Blueprint $table) {
    $table->id();
    $table->string('reference_number')->unique();        // GRT-2024-001
    $table->unsignedBigInteger('guarantor_id');          // FK lokal

    // ✅ Informasi LENGKAP disimpan di database ini
    $table->string('asset_name');                         // Nama asset
    $table->string('asset_code');                         // Kode asset
    $table->decimal('asset_value', 15, 2);               // Nilai asset

    $table->string('guarantee_type');                     // cash, collateral, letter
    $table->decimal('amount', 15, 2);
    $table->text('description');                          // Deskripsi detail
    $table->enum('status', ['active', 'released']);
    $table->timestamps();

    $table->foreign('guarantor_id')->references('id')->on('guarantors');
});
```

**Step 2: Service - Fetch data dari database primary, simpan ke jaminan**

```php
// app/Services/GuaranteeService.php
class GuaranteeService
{
    /**
     * Create Guarantee dengan data dari Database Primary
     * Tapi SIMPAN data locally di Database Jaminan (no foreign key)
     */
    public function createGuaranteeForAsset($assetId, array $data)
    {
        // Step 1: Fetch asset dari database primary
        // Menggunakan connection 'mysql' (default)
        $asset = DB::connection('mysql')
            ->table('assets')
            ->find($assetId);

        if (!$asset) {
            throw new \Exception('Asset not found');
        }

        // Step 2: COPY data asset ke table guarantee (database jaminan)
        $guaranteeData = [
            'reference_number' => $this->generateReferenceNumber(),
            'guarantor_id' => $data['guarantor_id'],
            'asset_name' => $asset->name,                    // COPY
            'asset_code' => $asset->asset_code,             // COPY
            'asset_value' => $asset->current_value,         // COPY
            'guarantee_type' => $data['guarantee_type'],
            'amount' => $data['amount'],
            'description' => $data['description'],
            'status' => 'active',
        ];

        // Step 3: Simpan ke database jaminan
        $guarantee = Guarantee::create($guaranteeData);

        // Step 4: Log untuk tracking (opsional)
        GuaranteeHistory::create([
            'guarantee_id' => $guarantee->id,
            'action' => 'created',
            'old_status' => null,
            'new_status' => 'active',
            'description' => "Asset {$asset->name} dijadikan jaminan",
        ]);

        return $guarantee;
    }

    private function generateReferenceNumber()
    {
        $year = date('Y');
        $count = Guarantee::whereYear('created_at', $year)->count() + 1;
        return "GRT-{$year}-" . str_pad($count, 4, '0', STR_PAD_LEFT);
    }
}
```

**Step 3: Controller - Terima request, proses di service**

```php
// app/Http/Controllers/GuaranteeController.php
class GuaranteeController extends Controller
{
    public function createForAsset(Request $request)
    {
        $validated = $request->validate([
            'asset_id' => 'required|integer',              // Asset dari DB primary
            'guarantor_id' => 'required|exists:mysql_jaminan.guarantors,id',
            'guarantee_type' => 'required|in:cash,collateral,letter',
            'amount' => 'required|numeric|min:0',
            'description' => 'required|string',
        ]);

        try {
            // Service akan fetch asset, copy data, create guarantee
            $guarantee = $this->guaranteeService->createGuaranteeForAsset(
                $validated['asset_id'],
                $validated
            );

            return response()->json([
                'status' => 'success',
                'data' => $guarantee,
                'message' => "Jaminan {$guarantee->reference_number} berhasil dibuat",
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 400);
        }
    }
}
```

**Step 4: Frontend - Kirim request dengan asset_id**

```javascript
// Frontend React/Vite
async function createGuarantee(assetId, formData) {
    const response = await fetch('/api/guarantees/create-for-asset', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            asset_id: assetId,
            guarantor_id: formData.guarantorId,
            guarantee_type: formData.type,
            amount: formData.amount,
            description: formData.description,
        }),
    });

    return await response.json();
}
```

### Key Points Implementation:

| Aspek | Detail |
|-------|--------|
| **Data Source** | Asset diambil dari database primary |
| **Data Copy** | Asset info di-copy ke table guarantee (nilai snapshot) |
| **No Foreign Key** | Tidak ada foreign key antar database |
| **Self-Contained** | Guarantee table punya semua info yang dibutuhkan |
| **Independen** | Guarantee bisa berdiri sendiri tanpa query database lain |
| **Audit Trail** | Semua history tercatat di database jaminan |

### Keuntungan Approach Ini:

✅ **Zero Dependency** - Database jaminan tidak butuh database primary
✅ **Snapshot Data** - Asset info yang disimpan adalah snapshot saat pembuatan
✅ **Easy Scaling** - Database jaminan bisa scaled independently
✅ **Simple Recovery** - Backup/restore bisa independen
✅ **Future-proof** - Bisa diakses oleh aplikasi lain

---

## Troubleshooting

### Problem 1: Database Connection Error

**Error:** `SQLSTATE[HY000]: General error: 1030 Got error...`

**Solusi:**
```php
// Pastikan config database.php sudah benar
// Cek .env file untuk credential yang tepat
php artisan config:cache
php artisan config:clear
```

### Problem 2: Migration gagal pada database jaminan

**Error:** `Migration not found or incorrect path`

**Solusi:**
```bash
# Jalankan dengan database spesifik
php artisan migrate --database=mysql_jaminan --path=database/migrations
```

### Problem 3: Foreign Key Constraint Error

**Error:** `Integrity constraint violation: 1452 Cannot add or update a child row...`

**Solusi:**
```php
// Jangan gunakan foreign key untuk referensi cross-database
// Gunakan ID saja tanpa constraint:
$table->unsignedBigInteger('asset_id'); // Tanpa foreign()

// Validasi di aplikasi level
'asset_id' => 'required|exists:mysql.assets,id'
```

### Problem 4: Query Performance Lambat

**Solusi:**
```php
// Gunakan eager loading
Guarantee::with(['guarantor', 'items', 'transactions'])->get();

// Jangan gunakan N+1 queries
// ❌ JANGAN
foreach ($guarantees as $guarantee) {
    $guarantor = $guarantee->guarantor; // Query berulang
}

// ✅ BENAR
$guarantees = Guarantee::with('guarantor')->get();
foreach ($guarantees as $guarantee) {
    $guarantor = $guarantee->guarantor; // Sudah di-load
}
```

---

## Summary

| Aspek | Detail |
|-------|--------|
| **Database 1** | Primary (Assets, Users, Transactions) |
| **Database 2** | Jaminan (Guarantees, Guarantors, Transactions) |
| **Connection Name** | `mysql_jaminan` |
| **Prefix** | `jam_` (optional) |
| **Model Base** | `BaseJaminanModel extends Model` |
| **Key Strategy** | Store ID references, no cross-DB foreign keys |
| **Migration** | `php artisan migrate --database=mysql_jaminan` |
| **Performance** | Eager load relations, use indexes |

---

## Kesimpulan

Laravel dapat dengan mudah terhubung ke 2 database atau lebih. Dengan strategi yang benar:

1. ✅ **Isolasi data** yang lebih baik
2. ✅ **Performance** yang optimal
3. ✅ **Maintainability** yang lebih mudah
4. ✅ **Scalability** yang lebih baik
5. ✅ **Security** yang meningkat

Implementasi di atas sudah siap untuk production dan mengikuti best practices Laravel.

---

---

## Implementation Checklist

Gunakan checklist ini untuk implementasi database jaminan yang terpisah:

### Phase 1: Setup Infrastructure
- [ ] Configure `.env` dengan database jaminan credentials
- [ ] Update `config/database.php` dengan koneksi `mysql_jaminan`
- [ ] Test koneksi ke kedua database
- [ ] Verify kedua database berjalan terpisah

### Phase 2: Create Database & Tables
- [ ] Create database baru `asset_jaminan_db`
- [ ] Run migration untuk jaminan DB: `php artisan migrate --database=mysql_jaminan`
- [ ] Create tabel: guarantors, guarantees, guarantee_items, guarantee_history, guarantee_transactions
- [ ] Verify struktur tabel lengkap dan self-contained

### Phase 3: Model & Service Layer
- [ ] Create `BaseJaminanModel` dengan `protected $connection = 'mysql_jaminan'`
- [ ] Create Model: Guarantee, Guarantor, GuaranteeItem, GuaranteeHistory, GuaranteeTransaction
- [ ] Create Service: GuaranteeService, GuarantorService
- [ ] Setup relasi lokal (same database only)

### Phase 4: API Controller & Routes
- [ ] Create GuaranteeController dengan CRUD methods
- [ ] Create GuarantorController dengan CRUD methods
- [ ] Define routes di `routes/api.php`
- [ ] Test semua endpoint dengan Postman/Insomnia

### Phase 5: Frontend Integration
- [ ] Create React component untuk list guarantees
- [ ] Create form untuk create/edit guarantee
- [ ] Add API call untuk fetch guarantees
- [ ] Add API call untuk create guarantee

### Phase 6: Testing
- [ ] Unit test untuk GuaranteeService
- [ ] Integration test untuk GuaranteeController
- [ ] Test create guarantee untuk asset
- [ ] Test delete guarantee
- [ ] Test release guarantee

### Phase 7: Documentation & Monitoring
- [ ] Document API endpoints
- [ ] Setup logging untuk jaminan operations
- [ ] Create database backup strategy
- [ ] Setup monitoring untuk database jaminan

### Phase 8: Deployment
- [ ] Create database jaminan di production
- [ ] Run migration di production
- [ ] Test koneksi di production
- [ ] Monitor performance

---

## Summary Table

| Aspek | Detail |
|-------|--------|
| **Architecture** | Non-Integrated (Fully Independent) |
| **Database 1** | Primary (asset_management_db) |
| **Database 2** | Jaminan (asset_jaminan_db) |
| **Connection Name** | `mysql_jaminan` |
| **Foreign Keys** | HANYA lokal (same database) |
| **Cross-DB Reference** | NO (copy data via service) |
| **Backup Strategy** | Independent per database |
| **Scaling** | Independent per database |
| **Dependency** | ZERO - fully standalone |
| **Data Flow** | Fetch dari primary → Copy ke jaminan |

---

**Dokumen versi:** 2.0 (Non-Integrated Architecture)
**Tanggal:** November 2024
**Status:** Ready untuk implementasi
**Type:** Non-Integrated (Fully Independent Database)
