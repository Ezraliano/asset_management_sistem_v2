# Panduan Event Scheduler untuk Depresiasi Otomatis

## Konsep Dasar

Sistem ini menggunakan **Event-Driven Scheduler** yang mempertimbangkan **waktu eksekusi** yang Anda tentukan. Depresiasi hanya akan terjadi **SETELAH** waktu eksekusi yang ditentukan tercapai.

---

## Contoh Skenario Ferrari

### Setting Scheduler
- **Waktu Eksekusi**: Setiap hari jam **13:15**
- **Timezone**: Asia/Jakarta

### Data Asset Ferrari
- **Nama**: Ferrari F40
- **Tanggal Pembelian**: 20 Januari 2025
- **Nilai**: Rp 10,000,000,000
- **Masa Manfaat**: 120 bulan (10 tahun)
- **Depresiasi Bulanan**: Rp 83,333,333

---

## Timeline Depresiasi Ferrari

### 📅 20 Januari 2025 (Hari Pembelian)

#### Jam 10:00 (Sebelum Input)
```
Status: Asset belum ada di sistem
Depresiasi: Belum ada
```

#### Jam 11:00 (Setelah Input Asset)
```
✅ Asset Ferrari berhasil diinput
📊 Status Depresiasi:
   - Elapsed Months: 0 bulan
   - Pending Months: 0 bulan
   - Accumulated Depreciation: Rp 0

💡 Kenapa 0? Karena belum jam 13:15 hari ini!
```

#### Jam 13:15 (Waktu Eksekusi Scheduler) ⏰
```
🔄 Scheduler berjalan otomatis
✅ Depresiasi bulan ke-1 TERGENERASI
📊 Status Depresiasi:
   - Elapsed Months: 1 bulan
   - Pending Months: 0 bulan (sudah diproses)
   - Accumulated Depreciation: Rp 83,333,333
   - Current Value: Rp 9,916,666,667
   - Depreciation Date: 20 Februari 2025
```

#### Jam 15:00 (Setelah Eksekusi)
```
📊 Status tetap sama seperti jam 13:15
   - Elapsed Months: 1 bulan
   - Depresiasi sudah tergenerasi
```

---

### 📅 20 Februari 2025

#### Jam 10:00 (Sebelum Waktu Eksekusi)
```
📊 Status Depresiasi:
   - Elapsed Months: 1 bulan (masih!)
   - Pending Months: 0 bulan
   - Accumulated Depreciation: Rp 83,333,333

💡 Kenapa masih 1 bulan?
   Karena hari ini tanggal 20 (sama dengan purchase date)
   TAPI belum jam 13:15, jadi bulan ke-2 BELUM dihitung!
```

#### Jam 13:15 (Waktu Eksekusi Scheduler) ⏰
```
🔄 Scheduler berjalan otomatis
✅ Depresiasi bulan ke-2 TERGENERASI
📊 Status Depresiasi:
   - Elapsed Months: 2 bulan (sekarang!)
   - Pending Months: 0 bulan
   - Accumulated Depreciation: Rp 166,666,666
   - Current Value: Rp 9,833,333,334
   - Depreciation Date: 20 Maret 2025
```

---

### 📅 21 Februari 2025

#### Jam 08:00
```
📊 Status Depresiasi:
   - Elapsed Months: 2 bulan
   - Pending Months: 0 bulan
   - Accumulated Depreciation: Rp 166,666,666

💡 Sudah 2 bulan karena:
   - Hari ini (21) > Purchase day (20)
   - Sudah lewat tanggal 20 jam 13:15
```

---

### 📅 20 Oktober 2025

#### Jam 10:00 (Sebelum Waktu Eksekusi)
```
📊 Status Depresiasi:
   - Elapsed Months: 9 bulan
   - Pending Months: 0 bulan (jika sudah auto-generated)
   - Accumulated Depreciation: Rp 750,000,000

Rincian:
   ✅ Jan -> Feb: 20 Feb jam 13:15
   ✅ Feb -> Mar: 20 Mar jam 13:15
   ✅ Mar -> Apr: 20 Apr jam 13:15
   ✅ Apr -> May: 20 May jam 13:15
   ✅ May -> Jun: 20 Jun jam 13:15
   ✅ Jun -> Jul: 20 Jul jam 13:15
   ✅ Jul -> Aug: 20 Aug jam 13:15
   ✅ Aug -> Sep: 20 Sep jam 13:15
   ✅ Sep -> Oct: 20 Sep jam 13:15
   ⏳ Oct -> Nov: BELUM! (harus tunggu 20 Okt jam 13:15)
```

#### Jam 13:15 (Waktu Eksekusi Scheduler) ⏰
```
🔄 Scheduler berjalan otomatis
✅ Depresiasi bulan ke-10 TERGENERASI
📊 Status Depresiasi:
   - Elapsed Months: 10 bulan
   - Pending Months: 0 bulan
   - Accumulated Depreciation: Rp 833,333,330
   - Current Value: Rp 9,166,666,670
   - Depreciation Date: 20 November 2025
```

---

## Logika Perhitungan Elapsed Months

```php
// Pseudocode
function getElapsedMonths() {
    purchaseDate = "20 Januari 2025"
    currentDate = "Sekarang"
    schedulerTime = "13:15:00"

    // Hitung selisih bulan kasar
    monthDiff = calculateMonthDifference(purchaseDate, currentDate)

    // Koreksi berdasarkan hari dan waktu
    if (currentDate.day < purchaseDate.day) {
        // Contoh: Purchase 20 Jan, Sekarang 19 Feb
        // Belum 1 bulan penuh
        monthDiff = monthDiff - 1
    }
    else if (currentDate.day == purchaseDate.day) {
        // Contoh: Purchase 20 Jan jam berapa saja, Sekarang 20 Feb
        // Cek apakah sudah waktunya scheduler

        if (currentTime < schedulerTime) {
            // Jam 10:00 < Jam 13:15
            // BELUM waktunya depresiasi bulan ini!
            monthDiff = monthDiff - 1
        }
        // Jika sudah lewat jam 13:15, bulan ini dihitung
    }

    return monthDiff
}
```

---

## Cara Setup

### 1. Jalankan Migration
```bash
php artisan migrate
```

Ini akan membuat tabel `depreciation_schedule_settings` dengan default:
- Frequency: `daily`
- Execution Time: `13:15:00`
- Timezone: `Asia/Jakarta`

### 2. Ubah Waktu Eksekusi (Opsional)

**Via API:**
```bash
curl -X PUT http://localhost/api/depreciation/schedule \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "execution_time": "00:00:00"
  }'
```

**Via Database Langsung:**
```sql
UPDATE depreciation_schedule_settings
SET execution_time = '23:30:00'
WHERE name = 'auto_depreciation';
```

### 3. Setup Cron Job di Server

Tambahkan ke crontab:
```bash
* * * * * cd /path-to-project && php artisan schedule:run >> /dev/null 2>&1
```

### 4. Test Manual

```bash
# Lihat konfigurasi saat ini
php artisan depreciation:test-schedule

# Atau trigger manual via API
curl -X POST http://localhost/api/depreciation/schedule/trigger \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## API Endpoints

### 1. Lihat Setting Saat Ini
```http
GET /api/depreciation/schedule
Authorization: Bearer {token}
```

Response:
```json
{
  "success": true,
  "data": {
    "is_active": true,
    "frequency": "daily",
    "execution_time": "13:15:00",
    "timezone": "Asia/Jakarta",
    "schedule_description": "Every day at 13:15 (Asia/Jakarta)",
    "last_run_at": "2025-10-20 13:15:00",
    "next_run_at": "2025-10-21 13:15:00"
  }
}
```

### 2. Update Setting
```http
PUT /api/depreciation/schedule
Authorization: Bearer {token}
Content-Type: application/json

{
  "frequency": "daily",
  "execution_time": "23:00:00",
  "timezone": "Asia/Jakarta"
}
```

### 3. Cek Status
```http
GET /api/depreciation/schedule/status
Authorization: Bearer {token}
```

Response:
```json
{
  "success": true,
  "data": {
    "is_active": true,
    "schedule_description": "Every day at 13:15 (Asia/Jakarta)",
    "current_time": "2025-10-20 10:00:00",
    "last_run_at": "2025-10-19 13:15:00",
    "next_run_at": "2025-10-20 13:15:00",
    "should_run_now": false,
    "time_until_next_run": "3 hours"
  }
}
```

### 4. Trigger Manual
```http
POST /api/depreciation/schedule/trigger
Authorization: Bearer {token}
```

### 5. Toggle Aktif/Nonaktif
```http
POST /api/depreciation/schedule/toggle
Authorization: Bearer {token}
```

---

## Frequency Options

### Daily (Harian)
```json
{
  "frequency": "daily",
  "execution_time": "13:15:00",
  "timezone": "Asia/Jakarta"
}
```
✅ Jalan setiap hari jam 13:15

### Weekly (Mingguan)
```json
{
  "frequency": "weekly",
  "execution_time": "01:00:00",
  "day_of_week": 1,
  "timezone": "Asia/Jakarta"
}
```
✅ Jalan setiap **Senin** jam 01:00

Day of Week:
- 0 = Minggu
- 1 = Senin
- 2 = Selasa
- 3 = Rabu
- 4 = Kamis
- 5 = Jumat
- 6 = Sabtu

### Monthly (Bulanan)
```json
{
  "frequency": "monthly",
  "execution_time": "00:00:00",
  "day_of_month": 1,
  "timezone": "Asia/Jakarta"
}
```
✅ Jalan setiap **tanggal 1** jam 00:00

---

## Troubleshooting

### Depresiasi tidak jalan otomatis?

1. **Cek apakah scheduler aktif:**
```bash
php artisan depreciation:test-schedule
```

2. **Cek cron job:**
```bash
crontab -l
```
Pastikan ada:
```
* * * * * cd /path-to-project && php artisan schedule:run >> /dev/null 2>&1
```

3. **Cek log:**
```bash
tail -f storage/logs/laravel.log
```

### Depresiasi sudah muncul padahal belum waktunya?

Pastikan migration sudah dijalankan dan logika `getElapsedMonths()` sudah terupdate.

---

## Perbedaan dengan Sistem Lama

| Aspek | Sistem Lama | Sistem Baru (Event Scheduler) |
|-------|-------------|------------------------------|
| **Waktu eksekusi** | Hardcoded di code | Disimpan di database |
| **Ubah jadwal** | Edit code + redeploy | Update via API |
| **Aktif/nonaktif** | Hapus code | Toggle via API |
| **Monitoring** | Harus cek log | API status endpoint |
| **Flexibilitas** | Rendah | Tinggi |
| **Perhitungan elapsed** | Tidak presisi | Presisi sampai jam:menit |

---

## Kesimpulan

Dengan sistem baru ini:

✅ **Depresiasi hanya terjadi SETELAH waktu eksekusi yang ditentukan**
✅ **Jika Anda input asset Ferrari jam 11:00, depresiasi baru muncul jam 13:15**
✅ **Waktu bisa diubah kapan saja tanpa edit code**
✅ **Lebih presisi dan mudah di-monitoring**

Semua tergantung setting di tabel `depreciation_schedule_settings`!
