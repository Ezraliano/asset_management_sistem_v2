# 📚 Dokumentasi Asset Management System

## Dokumentasi Teknis

Dokumentasi lengkap untuk berbagai aspek sistem Asset Management:

### 1. 📸 Proses View Gambar
**File:** [`PROCESS_VIEW_GAMBAR.md`](PROCESS_VIEW_GAMBAR.md)

Dokumentasi lengkap tentang:
- Overview sistem view gambar (4 jenis gambar)
- Arsitektur sistem (Frontend, Backend, Storage)
- Alur lengkap step-by-step (9 tahap)
- Frontend implementation (URL generation, components)
- Backend implementation (Routes, Middleware, Controller)
- Security features (Token auth, Authorization, Validation)
- File storage (Directory structure, Naming convention)
- Troubleshooting (Common issues & solutions)
- Reference (Files, Models, Configuration)

**Isi Utama:**
```
✅ Overview (4 jenis gambar)
✅ Arsitektur sistem
✅ Alur lengkap 9 tahap
✅ Frontend: URL generation + Components
✅ Backend: Routes + Middleware + Controller
✅ Security: Token auth + Authorization + Validation
✅ File storage & Naming convention
✅ Troubleshooting & Common issues
✅ Reference & Configuration
```

**Gunakan untuk:**
- Memahami cara sistem menampilkan gambar
- Troubleshooting gambar tidak muncul
- Implementing feature gambar baru
- Security review
- Production deployment

---

## Quick Links

### Frontend Services
- **File:** `frontend/services/api.ts`
- **Functions:**
  - `getMaintenancePhotoUrl()` - Line 839
  - `getIncidentPhoto()` - Line 1510
  - `getAssetSaleProof()` - Line 1353
  - `getReturnProofPhoto()` - Line 1403

### Backend Controllers
- **MaintenanceController:** `app/Http/Controllers/Api/MaintenanceController.php:341`
- **IncidentReportController:** Similar implementation
- **AssetSaleController:** Similar implementation
- **AssetLoanController:** Similar implementation

### Backend Middleware
- **TokenFromQueryMiddleware:** `app/Http/Middleware/TokenFromQueryMiddleware.php`
  - Extract token dari query parameter
  - Set Authorization header
  - Direct authentication fallback

### Routes
- **File:** `routes/api.php:230-236`
- **Middleware Order:** `['token.query', 'auth:sanctum']`
- **Routes:**
  - `/maintenances/{id}/photo`
  - `/incident-reports/{id}/photo`
  - `/asset-sales/{id}/proof`
  - `/asset-loans/{loanId}/return-proof`

---

## Feature Documentation

### Inactivity Timeout (1 Jam)

**Status:** ✅ Implemented

**Fitur:**
- Auto logout setelah 1 jam tidak ada aktivitas
- Warning modal 5 menit sebelum logout
- Activity reset pada: click, type, scroll, touch
- Customizable timeout duration

**File:**
- Frontend: `frontend/services/api.ts:6-155`
- Frontend: `frontend/App.tsx:27-244`

---

## Development Guidelines

### Adding New Image Type

1. **Backend:**
   ```php
   // Add column ke table
   ALTER TABLE new_table ADD COLUMN photo_path VARCHAR(255);

   // Create controller method
   public function getPhoto($id) { ... }

   // Add route
   Route::middleware(['token.query', 'auth:sanctum'])->get('/path/{id}/photo', ...);
   ```

2. **Frontend:**
   ```typescript
   // Add URL function
   export const getNewPhotoUrl = (id: number): string => {
     const token = localStorage.getItem('auth_token');
     return `${API_BASE_URL}/path/${id}/photo?token=${encodeURIComponent(token || '')}`;
   };

   // Use in component
   <img src={getNewPhotoUrl(id)} />
   ```

### Testing

**Local Testing:**
```bash
# 1. Check file exists
ls storage/app/public/maintenance_proofs/

# 2. Check permissions
chmod -R 755 storage/

# 3. Create symlink
php artisan storage:link

# 4. Test endpoint
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/api/maintenances/1/photo?token=xxx
```

**Production Testing:**
```bash
# 1. SSH ke server
ssh user@domain.com

# 2. Check symlink
ls -la public/storage

# 3. Check logs
tail -f storage/logs/laravel.log

# 4. Test file access
php artisan tinker
>>> Maintenance::find(1)->photo_proof
```

---

## Security Checklist

- ✅ Token-based authentication
- ✅ Authorization check (role-based)
- ✅ File validation
- ✅ MIME type checking
- ✅ Secure file streaming
- ✅ Comprehensive logging
- ✅ Error handling
- ✅ Activity timeout
- ✅ Storage symlink configured
- ✅ File permissions set

---

## Performance Optimization

### Current Implementation
- ✅ Chunked file reading (8KB)
- ✅ Cache headers (3600 seconds)
- ✅ Efficient streaming
- ✅ Lazy loading di UI

### Recommended Optimizations
- [ ] Image resizing untuk thumbnail
- [ ] CDN integration
- [ ] Image compression
- [ ] Lazy loading intersection observer
- [ ] Service worker caching

---

## Monitoring & Maintenance

### Regular Checks

**Weekly:**
```bash
# Check file storage usage
du -sh storage/app/public/

# Check error logs
grep ERROR storage/logs/laravel.log | wc -l
```

**Monthly:**
```bash
# Cleanup old files (optional)
# Note: Backup first!

# Check database consistency
SELECT COUNT(*) FROM maintenances WHERE photo_proof IS NOT NULL;
```

### Alerts

Monitor untuk:
- 401 Unauthorized errors (token issue)
- 403 Forbidden errors (authorization issue)
- 404 Not Found errors (missing files)
- File permission errors (chmod issue)
- Storage quota exceeded

---

## Versioning

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-12 | Initial implementation |

---

## Support & Troubleshooting

Lihat detailed troubleshooting guide di:
📖 [`PROCESS_VIEW_GAMBAR.md#troubleshooting`](PROCESS_VIEW_GAMBAR.md#troubleshooting)

Atau hubungi development team untuk:
- Architecture questions
- Performance optimization
- Bug reporting
- Feature requests

---

## Document Map

```
Root
├── DOKUMENTASI.md (Index file - anda di sini)
├── PROCESS_VIEW_GAMBAR.md (Detailed image viewing process)
├── app/
│   └── Http/
│       ├── Controllers/Api/
│       │   ├── MaintenanceController.php
│       │   ├── IncidentReportController.php
│       │   ├── AssetSaleController.php
│       │   └── AssetLoanController.php
│       └── Middleware/
│           └── TokenFromQueryMiddleware.php
├── frontend/
│   ├── services/
│   │   └── api.ts
│   ├── App.tsx
│   └── components/
│       ├── MaintenanceValidationModal.tsx
│       └── ... (other components)
├── routes/
│   └── api.php
└── storage/
    └── app/
        └── public/
            ├── maintenance_proofs/
            ├── incident_photos/
            ├── sale_proofs/
            └── loan_return_proofs/
```

---

**Last Updated:** 2025-11-12
**Maintained By:** Development Team
**Status:** Active

Untuk informasi lebih detail, baca [`PROCESS_VIEW_GAMBAR.md`](PROCESS_VIEW_GAMBAR.md) 📖
