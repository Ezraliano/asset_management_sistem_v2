# 🔍 Troubleshooting - Gambar Tidak Muncul di Production

## ❗ Masalah
Gambar yang diupload tidak muncul di server production (assetmanagement.arjunaconnect.com)

## 🎯 Penyebab Utama

### 1. **Symlink Storage Belum Dibuat** (90% Kasus)
Laravel menyimpan file di `storage/app/public/` tetapi harus diakses melalui `public/storage/`.

**Solusi:**
```bash
# SSH ke server production Anda
ssh user@your-server

# Masuk ke folder project
cd /path/to/your/laravel/project

# Buat symlink
php artisan storage:link
```

**Verifikasi:**
Cek apakah folder `public/storage` ada dan berisi link ke `../storage/app/public`

```bash
ls -la public/storage
# Output seharusnya:
# lrwxrwxrwx 1 user user 20 Oct 24 12:00 storage -> ../storage/app/public
```

---

### 2. **File Permission Problem**
File yang diupload tidak bisa diakses karena permission salah.

**Solusi:**
```bash
# Set permission untuk storage
chmod -R 775 storage/
chmod -R 775 public/storage/

# Set ownership (sesuaikan dengan user web server Anda)
chown -R www-data:www-data storage/
chown -R www-data:www-data public/storage/
```

---

### 3. **Path di Database Salah**
Cek apakah path yang tersimpan di database sudah benar.

**Yang Benar:**
```
maintenance_proofs/1761278777_Screenshot.jpg
```

**Yang Salah:**
```
storage/maintenance_proofs/1761278777_Screenshot.jpg  ❌ (ada "storage/" di depan)
/maintenance_proofs/1761278777_Screenshot.jpg        ❌ (ada "/" di depan)
public/storage/maintenance_proofs/...                ❌ (ada "public/storage/")
```

**Cara Cek:**
1. Buka phpMyAdmin
2. Lihat table `maintenances`
3. Kolom `photo_proof` seharusnya: `maintenance_proofs/filename.jpg`

---

## 🧪 Testing URL

### Development (Localhost)
Gambar seharusnya bisa diakses di:
```
http://localhost:8000/storage/maintenance_proofs/1761278777_Screenshot.jpg
```

### Production
Gambar seharusnya bisa diakses di:
```
https://assetmanagement.arjunaconnect.com/storage/maintenance_proofs/1761278777_Screenshot.jpg
```

**Cara Test:**
1. Copy URL lengkap gambar dari database
2. Paste di browser: `https://assetmanagement.arjunaconnect.com/storage/[path-dari-database]`
3. Jika muncul 404 → masalah di symlink atau permission
4. Jika gambar muncul → masalah di frontend code

---

## 📁 Struktur Folder yang Benar

```
laravel-project/
├── public/
│   ├── index.php
│   └── storage/  ← SYMLINK ke ../storage/app/public
│
├── storage/
│   ├── app/
│   │   └── public/
│   │       ├── maintenance_proofs/     ← File disimpan di sini
│   │       │   ├── 1761278777_Screenshot.jpg
│   │       │   └── 1761279860_image_3.jpg
│   │       ├── loan_proofs/
│   │       ├── damage_reports/
│   │       └── sale_proofs/
│   └── logs/
```

---

## 🔧 Checklist Debugging

### ✅ 1. Cek Symlink
```bash
ls -la public/ | grep storage
```
Harus ada output seperti: `storage -> ../storage/app/public`

### ✅ 2. Cek File Ada
```bash
ls -la storage/app/public/maintenance_proofs/
```
Harus menampilkan file-file gambar Anda

### ✅ 3. Cek Permission
```bash
ls -la storage/app/public/
```
Harus ada permission `rwx` (readable, writable, executable)

### ✅ 4. Test Direct URL
Buka di browser:
```
https://assetmanagement.arjunaconnect.com/storage/maintenance_proofs/1761278777_Screenshot_20251024...jpg
```

### ✅ 5. Cek Web Server Config
Nginx/Apache harus mengizinkan akses ke folder public/storage

**Nginx:**
```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 365d;
    access_log off;
}
```

**Apache (.htaccess sudah default OK)**

---

## 🐛 Debugging Frontend

### Cek URL yang Di-generate
Buka browser console (F12) dan ketik:
```javascript
// Import helper
import { getStorageUrl } from './utils/storage';

// Test
console.log(getStorageUrl('maintenance_proofs/test.jpg'));

// Seharusnya output:
// Dev: "http://localhost:8000/storage/maintenance_proofs/test.jpg"
// Prod: "https://assetmanagement.arjunaconnect.com/storage/maintenance_proofs/test.jpg"
```

### Cek Network Tab
1. Buka browser DevTools (F12)
2. Tab "Network"
3. Reload halaman dengan detail perbaikan
4. Cari request gambar
5. Lihat URL yang di-request
6. Cek status code:
   - **404** → File tidak ada atau symlink salah
   - **403** → Permission problem
   - **200** → Success (gambar muncul)

---

## 🚀 Solusi Cepat (Quick Fix)

Jalankan command ini di server production:

```bash
# 1. Masuk ke folder project
cd /path/to/laravel/project

# 2. Hapus symlink lama (jika ada)
rm -rf public/storage

# 3. Buat symlink baru
php artisan storage:link

# 4. Set permission
chmod -R 775 storage
chmod -R 775 public/storage
chown -R www-data:www-data storage
chown -R www-data:www-data public/storage

# 5. Clear cache
php artisan cache:clear
php artisan config:clear
php artisan view:clear
```

---

## 📞 Jika Masih Belum Berhasil

### Cek Laravel Log
```bash
tail -f storage/logs/laravel.log
```

### Cek Web Server Error Log
**Nginx:**
```bash
tail -f /var/log/nginx/error.log
```

**Apache:**
```bash
tail -f /var/log/apache2/error.log
```

### Test Upload Baru
1. Upload gambar baru dari aplikasi
2. Cek langsung di server apakah file tersimpan:
   ```bash
   ls -la storage/app/public/maintenance_proofs/
   ```
3. Cek di database apakah path tersimpan dengan benar
4. Test akses langsung via URL

---

## 💡 Tips

1. **Selalu gunakan `php artisan storage:link` setelah deploy**
2. **Jangan commit folder `public/storage` ke git** (itu symlink, bukan folder asli)
3. **Pastikan `.gitignore` berisi:** `public/storage`
4. **Set permission yang benar** setelah deploy atau pull dari git

---

## ✅ Hasil Akhir yang Benar

Ketika semua sudah benar:
- ✅ File disimpan di: `storage/app/public/maintenance_proofs/filename.jpg`
- ✅ Symlink: `public/storage` → `../storage/app/public`
- ✅ Database: `maintenance_proofs/filename.jpg`
- ✅ URL: `https://domain.com/storage/maintenance_proofs/filename.jpg`
- ✅ Gambar muncul di frontend ✨
