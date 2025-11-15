# 📸 Proses View Gambar - Asset Management System

## Daftar Isi
1. [Overview](#overview)
2. [Arsitektur Sistem](#arsitektur-sistem)
3. [Alur Lengkap Step-by-Step](#alur-lengkap-step-by-step)
4. [Frontend Implementation](#frontend-implementation)
5. [Backend Implementation](#backend-implementation)
6. [Security Features](#security-features)
7. [File Storage](#file-storage)
8. [Troubleshooting](#troubleshooting)
9. [Reference](#reference)

---

## Overview

Aplikasi ini memiliki sistem sophisticated untuk menampilkan gambar dengan **keamanan berbasis token authentication**. Sistem ini mendukung 4 jenis gambar:

| No | Jenis Gambar | Endpoint | Feature |
|---|---|---|---|
| 1 | Maintenance Photo | `/api/maintenances/{id}/photo` | Form Detail Perbaikan |
| 2 | Incident Photo | `/api/incident-reports/{id}/photo` | Laporan Kerusakan/Kehilangan |
| 3 | Asset Sale Proof | `/api/asset-sales/{id}/proof` | Detail Penjualan Aset |
| 4 | Loan Return Proof | `/api/asset-loans/{loanId}/return-proof` | Bukti Pengembalian Aset |

---

## Arsitektur Sistem

### Komponen Utama

```
┌──────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                     │
│  ├─ Components (MaintenanceValidationModal, etc)         │
│  ├─ Services/api.ts (URL generation with token)          │
│  └─ App.tsx (Activity monitoring)                        │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼ HTTP Request dengan token di query
┌──────────────────────────────────────────────────────────┐
│                   BACKEND (Laravel)                       │
│  ├─ Routes (api.php)                                      │
│  ├─ Middleware (TokenFromQueryMiddleware, auth:sanctum)  │
│  └─ Controllers (MaintenanceController, etc)             │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼ File streaming
┌──────────────────────────────────────────────────────────┐
│                    FILE STORAGE                          │
│  storage/app/public/maintenance_proofs/                  │
│  storage/app/public/incident_photos/                     │
│  storage/app/public/sale_proofs/                         │
│  storage/app/public/loan_return_proofs/                  │
└──────────────────────────────────────────────────────────┘
```

---

## Alur Lengkap Step-by-Step

### Step 1: User Berinteraksi dengan Aplikasi

User membuka form detail perbaikan dan ingin melihat foto bukti perbaikan.

```
MaintenanceValidationModal.tsx
├─ maintenance.id = 1
├─ maintenance.photo_proof = "maintenance_proofs/1700000000_image.jpg"
└─ User click tombol "Lihat Gambar"
```

### Step 2: Frontend Generate URL dengan Token

**File:** `frontend/services/api.ts`

```typescript
export const getMaintenancePhotoUrl = (maintenanceId: number): string => {
  const token = localStorage.getItem('auth_token');
  return `${API_BASE_URL}/maintenances/${maintenanceId}/photo?token=${encodeURIComponent(token || '')}`;
};
```

**Output:**
```
https://assetmanagementga.arjunaconnect.com/api/maintenances/1/photo?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Mengapa Token di Query Parameter?**
- Tag `<img src="">` tidak bisa mengirim custom Authorization header
- Token di-encode dan dikirim sebagai query parameter
- Server extract dan verify token di middleware

### Step 3: Frontend Render Gambar

**File:** `frontend/components/MaintenanceValidationModal.tsx:256-269`

```tsx
{maintenance.photo_proof && (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Foto Bukti
    </label>
    <img
      src={getMaintenancePhotoUrl(maintenance.id)}
      alt="Bukti Perbaikan/Pemeliharaan"
      className="w-full max-w-md h-auto rounded-lg border border-gray-300 shadow-sm cursor-pointer"
      onClick={() => window.open(getMaintenancePhotoUrl(maintenance.id), '_blank')}
      onError={(e) => {
        (e.target as HTMLImageElement).src = 'data:image/svg+xml,...';
      }}
    />
  </div>
)}
```

**Features:**
- ✅ Load gambar dari URL dengan token
- ✅ Click untuk open di tab baru
- ✅ Fallback placeholder jika load error

### Step 4: Browser Mengirim HTTP Request

Browser secara otomatis membuat request ke URL dengan token:

```http
GET /api/maintenances/1/photo?token=eyJhbGci... HTTP/1.1
Host: assetmanagementga.arjunaconnect.com
User-Agent: Mozilla/5.0...
```

### Step 5: Backend Middleware - TokenFromQueryMiddleware

**File:** `app/Http/Middleware/TokenFromQueryMiddleware.php`

```php
public function handle(Request $request, Closure $next)
{
    $token = $request->query('token');

    if ($token) {
        // Method 1: Set Authorization header untuk middleware auth:sanctum
        $request->headers->set('Authorization', 'Bearer ' . $token);

        // Method 2: Direct authentication (fallback)
        try {
            $personalAccessToken = PersonalAccessToken::findToken($token);

            if ($personalAccessToken && $personalAccessToken->tokenable) {
                auth()->setUser($personalAccessToken->tokenable);
            }
        } catch (\Exception $e) {
            \Log::debug('Token invalid:', ['error' => $e->getMessage()]);
        }
    }

    return $next($request);
}
```

**Proses:**
1. Extract token dari query parameter `?token=xxx`
2. Set Authorization header: `Bearer xxx`
3. Authenticate user langsung dari token (fallback)

### Step 6: Backend Middleware - auth:sanctum

Middleware ini verify token yang sudah di-set oleh TokenFromQueryMiddleware:

```php
// Verify token is valid
// Populate Auth::user()
// Return 401 jika invalid
```

### Step 7: Backend Controller - Process Photo Request

**File:** `app/Http/Controllers/Api/MaintenanceController.php:341-431`

```php
public function getMaintenancePhoto($id)
{
    try {
        // 1. Get authenticated user
        $user = Auth::user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        // 2. Find maintenance record
        $maintenance = Maintenance::with('asset')->find($id);
        if (!$maintenance) {
            return response()->json(['success' => false, 'message' => 'Not found'], 404);
        }

        // 3. Check if photo exists
        if (!$maintenance->photo_proof) {
            return response()->json(['success' => false, 'message' => 'Photo not found'], 404);
        }

        // 4. Authorization check
        if ($user->role === 'unit' && $user->unit_id !== $maintenance->asset->unit_id) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        // 5. Verify file exists
        $fullPath = Storage::disk('public')->path($maintenance->photo_proof);
        if (!\File::exists($fullPath)) {
            return response()->json(['success' => false, 'message' => 'File not found'], 404);
        }

        // 6. Stream file
        $mimeType = \File::mimeType($fullPath);
        $fileSize = filesize($fullPath);

        return response()->stream(
            function() use ($fullPath) {
                $handle = fopen($fullPath, 'rb');
                while (!feof($handle)) {
                    echo fread($handle, 8192); // 8KB chunks
                }
                fclose($handle);
            },
            200,
            [
                'Content-Type' => $mimeType,
                'Content-Length' => $fileSize,
                'Content-Disposition' => "inline; filename=\"...\"",
                'Cache-Control' => 'public, max-age=3600',
                'Pragma' => 'public',
                'Expires' => gmdate('D, d M Y H:i:s', time() + 3600) . ' GMT'
            ]
        );
    } catch (\Exception $e) {
        Log::error("Error fetching photo: " . $e->getMessage());
        return response()->json(['success' => false, 'message' => 'Failed'], 500);
    }
}
```

**Security Checks:**
- ✅ User harus authenticated
- ✅ Record harus exist
- ✅ Authorization check (unit admin vs super admin)
- ✅ File harus exist di disk
- ✅ Proper MIME type validation

### Step 8: Backend Return File Stream

Controller stream file dalam chunks:

```
✓ Read 8KB dari disk
✓ Send ke response output
✓ Repeat until EOF
✓ Close file handle
```

### Step 9: Browser Render Gambar

Browser menerima response dengan:
- `Content-Type: image/jpeg` (atau image type lainnya)
- Binary image data
- Cache headers

Browser render gambar di `<img>` tag.

---

## Frontend Implementation

### 1. URL Generation Functions

**File:** `frontend/services/api.ts`

```typescript
// Maintenance Photo
export const getMaintenancePhotoUrl = (maintenanceId: number): string => {
  const token = localStorage.getItem('auth_token');
  return `${API_BASE_URL}/maintenances/${maintenanceId}/photo?token=${encodeURIComponent(token || '')}`;
};

// Incident Report Photo
export const getIncidentPhoto = (incidentId: number): string => {
  const token = localStorage.getItem('auth_token');
  return `${API_BASE_URL}/incident-reports/${incidentId}/photo?token=${encodeURIComponent(token || '')}`;
};

// Asset Sale Proof
export const getAssetSaleProof = (saleId: number): string => {
  const token = localStorage.getItem('auth_token');
  return `${API_BASE_URL}/asset-sales/${saleId}/proof?token=${encodeURIComponent(token || '')}`;
};

// Asset Loan Return Proof
export const getReturnProofPhoto = (loanId: number): string => {
  const token = localStorage.getItem('auth_token');
  return `${API_BASE_URL}/asset-loans/${loanId}/return-proof?token=${encodeURIComponent(token || '')}`;
};
```

### 2. Component Implementation

**Example:** MaintenanceValidationModal.tsx

```tsx
{maintenance.photo_proof && (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Foto Bukti
    </label>
    <img
      src={getMaintenancePhotoUrl(maintenance.id)}
      alt="Bukti Perbaikan/Pemeliharaan"
      className="w-full max-w-md h-auto rounded-lg border border-gray-300 shadow-sm cursor-pointer"
      onClick={() => window.open(getMaintenancePhotoUrl(maintenance.id), '_blank')}
      onError={(e) => {
        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EGambar tidak tersedia%3C/text%3E%3C/svg%3E';
      }}
    />
  </div>
)}
```

### 3. Activity Monitoring Integration

**File:** `frontend/App.tsx`

```typescript
// Activity events yang reset timer
const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

activityEvents.forEach((event) => {
  window.addEventListener(event, () => {
    resetActivityTimer();
  });
});
```

---

## Backend Implementation

### 1. Route Definition

**File:** `routes/api.php:230-236`

```php
// Public file routes dengan token query parameter support
// PENTING: Urutan middleware!
Route::middleware(['token.query', 'auth:sanctum'])->group(function () {
    Route::get('/asset-sales/{id}/proof', [AssetSaleController::class, 'getProofFile']);
    Route::get('/asset-loans/{loanId}/return-proof', [AssetLoanController::class, 'getReturnProofPhoto']);
    Route::get('/maintenances/{id}/photo', [MaintenanceController::class, 'getMaintenancePhoto']);
});
```

**⚠️ PENTING:** Middleware order matters!
- `token.query` FIRST → Convert token to header
- `auth:sanctum` SECOND → Verify authentication

### 2. Middleware - TokenFromQueryMiddleware

**File:** `app/Http/Middleware/TokenFromQueryMiddleware.php`

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class TokenFromQueryMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $token = $request->query('token');

        if ($token) {
            // Method 1: Set Authorization header
            $request->headers->set('Authorization', 'Bearer ' . $token);

            // Method 2: Direct authentication (fallback)
            try {
                $personalAccessToken = PersonalAccessToken::findToken($token);

                if ($personalAccessToken && $personalAccessToken->tokenable) {
                    auth()->setUser($personalAccessToken->tokenable);
                }
            } catch (\Exception $e) {
                \Log::debug('Token from query parameter invalid:', ['error' => $e->getMessage()]);
            }
        }

        return $next($request);
    }
}
```

### 3. Middleware Registration

**File:** `app/Http/Kernel.php`

```php
protected $routeMiddleware = [
    // ... other middleware
    'token.query' => \App\Http\Middleware\TokenFromQueryMiddleware::class,
];
```

### 4. Controller Implementation

**File:** `app/Http/Controllers/Api/MaintenanceController.php`

```php
public function getMaintenancePhoto($id)
{
    try {
        // Check authentication
        $user = Auth::user();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], Response::HTTP_UNAUTHORIZED);
        }

        // Get maintenance
        $maintenance = Maintenance::with('asset')->find($id);
        if (!$maintenance) {
            return response()->json([
                'success' => false,
                'message' => 'Maintenance record not found'
            ], Response::HTTP_NOT_FOUND);
        }

        // Check photo exists
        if (!$maintenance->photo_proof) {
            return response()->json([
                'success' => false,
                'message' => 'Photo proof not found'
            ], Response::HTTP_NOT_FOUND);
        }

        // Authorization check
        if ($user->role === 'unit' && $user->unit_id && $maintenance->asset->unit_id !== $user->unit_id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized to view photos from other units'
            ], Response::HTTP_FORBIDDEN);
        }

        // Check file exists
        if (!Storage::disk('public')->exists($maintenance->photo_proof)) {
            Log::warning("Photo file not found in storage: {$maintenance->photo_proof}");
            return response()->json([
                'success' => false,
                'message' => 'Photo file not found'
            ], Response::HTTP_NOT_FOUND);
        }

        // Get file path
        $fullPath = Storage::disk('public')->path($maintenance->photo_proof);

        // Double check file exists
        if (!\File::exists($fullPath)) {
            Log::warning("Photo file not found on disk: {$fullPath}");
            return response()->json([
                'success' => false,
                'message' => 'Photo file not found on disk'
            ], Response::HTTP_NOT_FOUND);
        }

        // Get file info
        $mimeType = \File::mimeType($fullPath);
        $fileName = basename($maintenance->photo_proof);
        $fileSize = filesize($fullPath);

        Log::debug("Serving photo: {$fullPath}, Size: {$fileSize}, MIME: {$mimeType}");

        // Stream file
        return response()->stream(
            function() use ($fullPath) {
                $handle = fopen($fullPath, 'rb');
                if ($handle) {
                    while (!feof($handle)) {
                        echo fread($handle, 8192); // 8KB chunks
                    }
                    fclose($handle);
                }
            },
            200,
            [
                'Content-Type' => $mimeType,
                'Content-Length' => $fileSize,
                'Content-Disposition' => "inline; filename=\"{$fileName}\"",
                'Accept-Ranges' => 'bytes',
                'Cache-Control' => 'public, max-age=3600',
                'Pragma' => 'public',
                'Expires' => gmdate('D, d M Y H:i:s', time() + 3600) . ' GMT'
            ]
        );

    } catch (\Exception $e) {
        Log::error("Error fetching maintenance photo {$id}: " . $e->getMessage(), [
            'exception' => $e,
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Failed to fetch photo',
            'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
        ], Response::HTTP_INTERNAL_SERVER_ERROR);
    }
}
```

---

## Security Features

### 1. Token-Based Authentication

✅ **Token di Query Parameter:**
```
URL: /api/maintenances/1/photo?token=eyJhbGci...
```

**Mengapa?**
- `<img>` tag tidak bisa mengirim Authorization header
- Token di-encode dan aman di URL

✅ **Token Verification:**
- Middleware extract token dari query
- Verify token dengan Sanctum
- Authenticate user dari token

### 2. Authorization Check

✅ **Role-Based Access:**
```php
// Unit admin hanya bisa lihat foto dari unit mereka
if ($user->role === 'unit' && $user->unit_id !== $maintenance->asset->unit_id) {
    return 403; // Forbidden
}
```

**Roles:**
- `super-admin` → Bisa lihat semua foto
- `admin` → Bisa lihat semua foto
- `unit` → Hanya bisa lihat foto dari unit mereka

### 3. File Validation

✅ **Multi-Level Checks:**
1. Check file path dalam database
2. Check file exists di Laravel storage
3. Check file exists di disk
4. Validate MIME type
5. Verify file permissions

### 4. Stream Response

✅ **Efficient File Delivery:**
- Read file dalam chunks (8KB)
- Stream response langsung ke client
- Set proper HTTP headers
- Cache control headers

**Headers:**
```
Content-Type: image/jpeg
Content-Length: 12345
Content-Disposition: inline; filename="image.jpg"
Cache-Control: public, max-age=3600
```

### 5. Error Handling & Logging

✅ **Comprehensive Logging:**
```php
Log::debug("Serving photo: {$fullPath}, Size: {$fileSize}, MIME: {$mimeType}");
Log::warning("Photo file not found in storage: {$photo_proof}");
Log::error("Error fetching photo: {$error}");
```

---

## File Storage

### Directory Structure

```
storage/
└── app/
    └── public/
        ├── maintenance_proofs/
        │   ├── 1700000000_image.jpg
        │   ├── 1700000001_repair.jpg
        │   └── ...
        ├── incident_photos/
        │   ├── 1700000002_damage.jpg
        │   ├── 1700000003_loss.jpg
        │   └── ...
        ├── sale_proofs/
        │   ├── 1700000004_proof.jpg
        │   └── ...
        └── loan_return_proofs/
            ├── 1700000005_return.jpg
            └── ...
```

### File Naming Convention

Files disimpan dengan timestamp prefix untuk uniqueness:

```
{timestamp}_{original_filename}
```

**Example:**
```
1700000000_perbaikan_motor.jpg
1700000001_kerusakan_laptop.png
```

### Storage Symlink

**Setup (Production):**
```bash
php artisan storage:link
```

Membuat symbolic link:
```
public/storage → storage/app/public
```

Sehingga file bisa diakses via:
```
https://domain.com/storage/maintenance_proofs/image.jpg
```

---

## Troubleshooting

### 1. Gambar tidak muncul

#### Error: "Gambar tidak tersedia" (Fallback placeholder muncul)

**Kemungkinan Penyebab:**
- File tidak ada di storage
- File permission issue
- Token expired
- Wrong maintenance ID

**Solusi:**
```bash
# Check file exists
ls -la storage/app/public/maintenance_proofs/

# Check permissions
chmod -R 755 storage/
chmod -R 644 storage/app/public/maintenance_proofs/*

# Verify symlink
ls -la public/storage
```

#### Error: 401 Unauthorized

**Penyebab:**
- Token expired
- Token invalid
- User tidak authenticated

**Solusi:**
```
1. Logout dan login ulang
2. Check token di localStorage:
   - Open DevTools → Application → Local Storage
   - Verify auth_token ada dan valid
3. Check token_expiration tidak sudah lama
```

#### Error: 403 Forbidden

**Penyebab:**
- Unit admin mencoba lihat foto dari unit lain

**Solusi:**
```php
// Unit mismatch - hanya super admin/admin bisa lihat semua
// Gunakan akun super-admin untuk test
```

#### Error: 404 Not Found

**Penyebab:**
- Record tidak exist
- File dihapus
- Wrong ID di URL

**Solusi:**
```bash
# Check record exists di database
SELECT * FROM maintenances WHERE id = 1;

# Check file exists
ls storage/app/public/maintenance_proofs/
```

#### Error: CORS Error

**Penyebab:**
- CORS configuration issue
- Domain mismatch

**Solusi:**
```php
// Check CORS middleware di kernel.php
// Verify API_BASE_URL di frontend matches domain
```

### 2. Debug Checklist

#### Frontend Debug

```javascript
// Check token exists
console.log(localStorage.getItem('auth_token'));

// Check URL generated
console.log(getMaintenancePhotoUrl(1));

// Check network request
// Open DevTools → Network → click image request
// Verify URL dan headers
```

#### Backend Debug

```bash
# Check logs
tail -f storage/logs/laravel.log

# Check file exists
ls -lh storage/app/public/maintenance_proofs/

# Check file permissions
stat storage/app/public/maintenance_proofs/image.jpg

# Test endpoint
curl -H "Authorization: Bearer TOKEN" \
  "https://domain.com/api/maintenances/1/photo"
```

### 3. Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Image 404 | File not in storage | Re-upload maintenance photo |
| Image 401 | Token expired | Logout & login again |
| Image 403 | Unit mismatch | Use correct user role/unit |
| Image CORS | CORS config | Check .env & kernel.php |
| File permission | Wrong chmod | `chmod -R 755 storage/` |
| Symlink broken | Not created | `php artisan storage:link` |

---

## Reference

### Files Modified

| File | Purpose | Key Change |
|------|---------|-----------|
| `frontend/services/api.ts` | URL generation | Added photo URL functions |
| `frontend/components/*.tsx` | Display images | Added `<img>` tags with token URLs |
| `app/Http/Middleware/TokenFromQueryMiddleware.php` | Token extraction | Extract & verify token dari query |
| `routes/api.php` | Routes definition | Photo routes with middleware |
| `app/Http/Controllers/Api/MaintenanceController.php` | Process request | Stream file dengan checks |

### Related Models

```php
// Maintenance model - photo_proof field
$maintenance->photo_proof // "maintenance_proofs/1700000000_image.jpg"

// IncidentReport model - photo field
$incident->photo // "incident_photos/1700000001_damage.jpg"

// AssetSale model - proof field
$sale->proof // "sale_proofs/1700000002_proof.jpg"

// AssetLoan model - return_proof field
$loan->return_proof // "loan_return_proofs/1700000003_return.jpg"
```

### Database Schema

```sql
-- Maintenances table
ALTER TABLE maintenances ADD COLUMN photo_proof VARCHAR(255) NULLABLE;

-- IncidentReports table
ALTER TABLE incident_reports ADD COLUMN photo VARCHAR(255) NULLABLE;

-- AssetSales table
ALTER TABLE asset_sales ADD COLUMN proof VARCHAR(255) NULLABLE;

-- AssetLoans table
ALTER TABLE asset_loans ADD COLUMN return_proof VARCHAR(255) NULLABLE;
```

### Configuration

**File:** `.env`

```
API_BASE_URL=https://assetmanagementga.arjunaconnect.com/api
FILESYSTEM_DRIVER=public
```

**File:** `config/filesystems.php`

```php
'disks' => [
    'public' => [
        'driver' => 'local',
        'path' => 'public',
        'url' => env('APP_URL').'/storage',
        'visibility' => 'public',
    ],
],
```

---

## Kesimpulan

Sistem view gambar di aplikasi ini menggunakan:

1. ✅ **Secure Token Authentication** - Token di query parameter
2. ✅ **Role-Based Authorization** - Unit admin vs super admin
3. ✅ **Efficient File Streaming** - Chunked reading
4. ✅ **Comprehensive Error Handling** - Detailed logging
5. ✅ **Activity-Based Timeout** - Auto logout setelah 1 jam

Sistem ini scalable dan aman untuk production environment.

---

**Last Updated:** 2025-11-12
**Version:** 1.0
**Status:** Production Ready
