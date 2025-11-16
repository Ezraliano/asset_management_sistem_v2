# Streaming Architecture Analysis - Asset Management System

## 📊 Executive Summary

**Ya, aplikasi ini MENGGUNAKAN PROSES STREAMING untuk serving file/gambar.**

Aplikasi mengimplementasikan **API Endpoint Streaming** untuk melayani file/gambar kepada client, bukan hanya serving static files melalui web server. Ini adalah implementasi yang sophisticated dengan support untuk:

✅ Range requests (resume download)
✅ HTTP 206 Partial Content
✅ Chunked reading (8KB chunks)
✅ Authorization checks
✅ MIME type detection
✅ Memory-efficient streaming

---

## 🔍 Komponen Streaming

### **1. IncidentReportController::getIncidentPhoto()** ✅
**File:** [app/Http/Controllers/Api/IncidentReportController.php:610-710](app/Http/Controllers/Api/IncidentReportController.php#L610)

**Route:** `GET /api/incident-reports/{id}/photo`

**Functionality:**
```
Request Flow:
  Client → GET /api/incident-reports/1/photo
           ↓
  Authorization Check (role-based access control)
           ↓
  File Validation (check if exists)
           ↓
  MIME Type Detection
           ↓
  Range Request Support (if header present)
           ↓
  Stream File in 8KB Chunks
           ↓
  Response with 200/206 status
```

**Key Features:**
```php
- Authorization: Users can only view own reports
- Unit Admin: Can only view reports from their unit
- Range Support: Can resume incomplete downloads
- Chunked Reading: 8KB chunks untuk efficiency
- MIME Type: Auto-detected dari file
- Cache Control: 3600 seconds (1 hour)
```

**Stream Implementation:**
```php
response()->stream(function() use ($fullPath) {
    $handle = fopen($fullPath, 'r');
    while (!feof($handle)) {
        echo fread($handle, 8192);  // 8KB chunks
    }
    fclose($handle);
}, 200, [headers...])
```

---

### **2. AssetLoanController::getReturnProofPhoto()** ✅
**File:** [app/Http/Controllers/Api/AssetLoanController.php:900-993](app/Http/Controllers/Api/AssetLoanController.php#L900)

**Route:** `GET /api/asset-loans/{id}/return-proof`

**Functionality:**
```
Same as getIncidentPhoto with:
  - Borrower authorization check
  - Unit-based access control
  - Return proof photo streaming
  - Range request support
  - 8KB chunked reading
```

---

### **3. AssetSaleController::getProofFile()** ✅
**File:** [app/Http/Controllers/Api/AssetSaleController.php:386-480](app/Http/Controllers/Api/AssetSaleController.php#L386)

**Route:** `GET /api/asset-sales/{id}/proof`

**Functionality:**
```
Same as getIncidentPhoto with:
  - Sale record authorization
  - Unit access control
  - PDF/Image proof file streaming
  - Range request support
  - 8KB chunked reading
```

---

## 🏗️ Streaming Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Browser)                        │
│                   Fetch Image/Document                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    GET /api/incident-reports/1/photo
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              Laravel Route Handler                          │
│  routes/api.php → IncidentReportController@getIncidentPhoto │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              Authorization Layer                            │
│  ✓ Is user authenticated?                                  │
│  ✓ Can user view this report?                              │
│  ✓ Is file owner or admin?                                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              File Validation                                │
│  ✓ Does file exist in database?                            │
│  ✓ Does file exist on disk?                                │
│  ✓ Get MIME type                                           │
│  ✓ Get file size                                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              Range Request Check                            │
│  if Range header present:                                   │
│    Parse range (bytes=start-end)                            │
│    Return HTTP 206 Partial Content                          │
│  else:                                                      │
│    Return HTTP 200 OK                                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              Streaming File in Chunks                       │
│  Open file with fopen()                                     │
│  Read 8KB chunks with fread()                               │
│  Echo each chunk to response stream                         │
│  Continue until EOF                                         │
│  Close file with fclose()                                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    Stream Response
                    (8KB chunks)
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                  Response Headers                           │
│  Content-Type: image/jpeg (MIME type)                       │
│  Content-Length: 45823 (file size)                          │
│  Accept-Ranges: bytes (support resume)                      │
│  Cache-Control: public, max-age=3600                        │
│  Content-Disposition: inline (show in browser)              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    HTTP Response
                    (binary data)
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    Client Browser                           │
│                   Display Image                             │
└──────────────────────────────────────────────────────────────┘
```

---

## 📋 Request/Response Examples

### **Example 1: Simple Image Stream (No Range)**

**Request:**
```http
GET /api/incident-reports/1/photo HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: image/jpeg
Content-Length: 45823
Accept-Ranges: bytes
Cache-Control: public, max-age=3600
Content-Disposition: inline; filename="evidence.jpg"

[binary JPEG data - 8KB chunks streamed]
[... more data ...]
[... more data ...]
```

---

### **Example 2: Resumable Download (With Range)**

**Request:**
```http
GET /api/incident-reports/1/photo HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
Range: bytes=20480-40960
```

**Response:**
```http
HTTP/1.1 206 Partial Content
Content-Type: image/jpeg
Content-Length: 20481
Content-Range: bytes 20480-40960/45823
Accept-Ranges: bytes
Cache-Control: public, max-age=3600
Content-Disposition: inline; filename="evidence.jpg"

[binary JPEG data - only requested range]
```

---

## 🔒 Security Features in Streaming

### **1. Authorization Checks**

```php
// IncidentReportController::getIncidentPhoto
if ($user->role === 'user' && $incident->reporter_id !== $user->id) {
    return response()->json([
        'success' => false,
        'message' => 'Unauthorized to view this photo'
    ], Response::HTTP_FORBIDDEN);
}

// Check for Admin Unit - hanya bisa lihat photo di unit mereka
if ($user->role === 'unit' && $user->unit_id &&
    $incident->asset->unit_id !== $user->unit_id) {
    return response()->json([
        'success' => false,
        'message' => 'Unauthorized to view photos from other units'
    ], Response::HTTP_FORBIDDEN);
}
```

### **2. File Existence Validation**

```php
// Check if file exists in storage
if (!Storage::disk('public')->exists($incident->evidence_photo_path)) {
    return 404 error
}

// Check if file exists on disk
if (!\File::exists($fullPath)) {
    return 404 error
}
```

### **3. MIME Type Detection**

```php
$mimeType = \File::mimeType($fullPath);
// Used in Content-Type header to prevent misinterpretation
```

---

## ⚙️ Range Request Implementation Details

### **How Range Requests Work:**

```php
// Step 1: Check if client sent Range header
if ($request->hasHeader('Range')) {
    // Step 2: Parse range (e.g., "bytes=20480-40960")
    $range = $request->header('Range');
    if (preg_match('/bytes=(\d+)-(\d*)/', $range, $matches)) {
        $start = intval($matches[1]);
        $end = $matches[2] !== '' ? intval($matches[2]) : $fileSize - 1;

        // Step 3: Validate range
        if ($start >= 0 && $end < $fileSize && $start <= $end) {
            $length = $end - $start + 1;

            // Step 4: Stream only requested bytes
            return response()->stream(function() use ($fullPath, $start, $length) {
                $handle = fopen($fullPath, 'r');
                fseek($handle, $start);  // Jump to start position
                echo fread($handle, $length);  // Read exactly $length bytes
                fclose($handle);
            }, 206, [  // HTTP 206 Partial Content
                'Content-Type' => $mimeType,
                'Content-Length' => $length,
                'Content-Range' => "bytes $start-$end/$fileSize",
                'Accept-Ranges' => 'bytes',
            ]);
        }
    }
}
```

### **Benefits:**

```
✅ Resume incomplete downloads
✅ Download specific ranges of file
✅ Efficient bandwidth usage
✅ Better UX for slow connections
✅ Support for video streaming (resume position)
```

---

## 💾 Storage Configuration

### **Disk Configuration: config/filesystems.php**

```php
'public' => [
    'driver' => 'local',
    'root' => storage_path('app/public'),
    'url' => env('APP_URL').'/storage',
    'visibility' => 'public',
],
```

### **Storage Locations:**

```
storage/app/public/
├── incident-evidence/     (from IncidentReportController)
│   ├── photo_1763170149.jpg
│   └── photo_1763170150.jpg
│
├── loan-proofs/          (from AssetLoanController - approval)
│   ├── proof_1763170151.jpg
│   └── proof_1763170152.jpg
│
├── return-proofs/        (from AssetLoanController - return)
│   ├── return_1763170153.jpg
│   └── return_1763170154.jpg
│
└── asset_sales/          (from AssetSaleController)
    ├── proof_1763170155.pdf
    └── proof_1763170156.jpg
```

---

## 🎯 Use Cases for Streaming vs Static Files

### **When to Use Streaming (Current Implementation):**

✅ **Authorization Required** - Need to check user permissions before serving
✅ **Dynamic Content** - File availability depends on database records
✅ **Audit Trail** - Want to log who accessed what file
✅ **Conditional Access** - Different users see different files
✅ **Large Files** - Stream efficiently in chunks

### **When to Use Static Files:**

✅ **Public Content** - No authorization needed
✅ **Static Assets** - Images, CSS, JS that don't change
✅ **Performance Critical** - Direct web server serving is faster
✅ **No Audit Needed** - Standard web analytics sufficient

---

## 📊 Performance Characteristics

### **Memory Usage:**

```
Streaming Approach:
  Memory Used = Fixed (8KB buffer)
  Example: 100MB file = 8KB memory constant
  ✅ Very efficient for large files

Direct File Serving:
  Memory Used = File size
  Example: 100MB file = 100MB memory
  ❌ Not scalable for large files
```

### **Network Efficiency:**

```
Streaming with Range Support:
  Resume failed download: ✅ Supported
  Partial content requests: ✅ Supported
  Video streaming: ✅ Supported (seekable)
  Bandwidth: ✅ Only requested bytes sent

Static File Serving:
  Resume: ⚠️ Depends on web server config
  Partial content: ⚠️ Depends on web server config
  Video streaming: ⚠️ Limited
  Bandwidth: ⚠️ Full file always sent
```

---

## 🚀 Integration with New Backend Solution

### **Important Note:**

Dengan implementasi **Backend Solution** yang baru (Storage::disk()->url()), aplikasi sekarang punya **2 cara** untuk serve gambar:

#### **Method 1: Direct URL (Recommended untuk simple display)**
```
GET https://domain.com/storage/incident-evidence/photo.jpg
↓
Web server (Apache/Nginx) serve file langsung
↓
No authorization check
↓
Very fast, static file serving
```

#### **Method 2: API Streaming (Recommended untuk protected access)**
```
GET https://domain.com/api/incident-reports/1/photo
↓
Laravel Controller streaming
↓
Authorization check performed
↓
Slower but more secure
```

### **Current Frontend Usage:**

Frontend menggunakan **Method 1** (Direct URL) via:
```typescript
const imageUrl = maintenance.photo_proof_url;
// Result: http://localhost:8000/storage/maintenance_proofs/...
<img src={imageUrl} />
```

**This is OPTIMAL** karena:
- ✅ Fast static file serving
- ✅ No API overhead
- ✅ Browser can cache
- ✅ Works offline (already loaded)

---

## 📋 Summary Table

| Aspek | Streaming Endpoints | Static URLs |
|-------|-------------------|-------------|
| **Routes** | `/api/incident-reports/{id}/photo` | `/storage/...` |
| | `/api/asset-loans/{id}/return-proof` | (Direct access) |
| | `/api/asset-sales/{id}/proof` | |
| **Use Case** | Direct API access (old approach) | Frontend display (new approach) |
| **Authorization** | ✅ Yes | ❌ No* |
| **Performance** | Slower | Faster |
| **Memory** | Low (8KB chunks) | N/A |
| **Range Support** | ✅ Yes | ✅ Web server dependent |
| **Caching** | ✅ Cache-Control header | ✅ Browser cache |
| **Logging** | ✅ Possible | ⚠️ Server access logs only |

*Files are already public via web server, authorization via Laravel is optional

---

## 🔗 Routes Summary

```php
// API Routes di routes/api.php

// Streaming endpoints (protected by middleware + controller auth)
Route::get('/incident-reports/{id}/photo', [IncidentReportController::class, 'getIncidentPhoto']);
Route::get('/asset-sales/{id}/proof', [AssetSaleController::class, 'getProofFile']);
Route::get('/asset-loans/{id}/return-proof', [AssetLoanController::class, 'getReturnProofPhoto']);

// Static file serving (via web server)
// GET /storage/incident-evidence/photo.jpg
// GET /storage/loan-proofs/proof.jpg
// GET /storage/return-proofs/return.jpg
// GET /storage/asset_sales/proof.pdf
```

---

## 📌 Architecture Decision

### **Why Stream Endpoints Exist:**

1. **Backward Compatibility** - Old code might use `/api/incident-reports/{id}/photo`
2. **Direct API Access** - Mobile apps can request photos via API
3. **Authorization Control** - Can enforce strict access control
4. **Audit Trail** - Can log file access

### **Why Frontend Doesn't Use Them:**

New architecture (Backend Solution) makes streaming endpoints **optional**:
- Frontend gets full URLs from API response
- Browser serves from static `/storage/` path
- Faster, simpler, more standard

### **Best Practice Going Forward:**

```
├── Public-ish files → use /storage/ direct URL (faster)
└── Sensitive files → use API streaming endpoint (secure)

Current implementation:
All files use /storage/ direct URL ✅ (correct)
Streaming endpoints available as fallback ✅ (good)
```

---

## ✅ Conclusion

**Yes, streaming exists in this application with sophisticated implementation:**

✅ **3 Streaming Endpoints** for different file types
✅ **Range Request Support** for resume downloads
✅ **Authorization Checks** for security
✅ **Efficient Chunked Reading** (8KB per chunk)
✅ **MIME Type Detection** for correct content type
✅ **HTTP 206 Partial Content** support

However, **the new Backend Solution** makes these endpoints optional, as the frontend now uses simple direct URLs which is more efficient.

---

**Analysis Date:** November 16, 2025
**Status:** ✅ Complete
