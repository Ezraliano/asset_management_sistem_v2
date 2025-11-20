# Fitur Export Laporan Jaminan

## Deskripsi Fitur

Fitur ini memungkinkan pengguna untuk mendownload laporan data jaminan aset dalam dua format:
- **PDF** - Format yang rapi untuk dicetak
- **Excel** - Format yang fleksibel untuk analisis data lebih lanjut

Terdapat 3 jenis laporan yang dapat diekspor:
1. **Jaminan Masuk** - Data semua jaminan aset yang sudah diinput dan tersedia
2. **Jaminan Dipinjam** - Data jaminan yang sedang dipinjamkan
3. **Jaminan Lunas** - Data jaminan yang sudah dikembalikan/lunas

## Struktur File

### Komponen React
- **[frontend/components/GuaranteeReportExport.tsx](frontend/components/GuaranteeReportExport.tsx)** - Modal untuk memilih jenis laporan dan format export

### Utility Functions
- **[frontend/utils/guaranteeExportUtils.ts](frontend/utils/guaranteeExportUtils.ts)** - Fungsi untuk export PDF dan Excel

### API Services
- **[frontend/services/api.ts](frontend/services/api.ts)** - Function `getGuaranteeSettlements()` ditambahkan untuk mendapatkan semua data settlements

## Fitur Utama

### 1. Modal Export Report
Komponen `GuaranteeReportExport` menyediakan UI untuk:
- Memilih jenis laporan (Jaminan Masuk, Dipinjam, atau Lunas)
- Memilih format export (PDF atau Excel)
- Menampilkan pesan loading dan success/error
- Integrasi otomatis dengan data API

### 2. Export Functions

#### Jaminan Masuk (Income)
```typescript
exportGuaranteeIncomeToPdf(filename, data)
exportGuaranteeIncomeToExcel(filename, data)
```
Kolom yang diekspor:
- No, No SPK, No CIF, Atas Nama SPK, Nama Jaminan
- Tipe Jaminan, No Jaminan, Tanggal Input, Status
- (Excel) Lokasi File

#### Jaminan Dipinjam (Loan)
```typescript
exportGuaranteeLoanToPdf(filename, data)
exportGuaranteeLoanToExcel(filename, data)
```
Kolom yang diekspor:
- No, No SPK, No CIF, Nama Jaminan, Nama Peminjam
- Kontak Peminjam, Alasan Peminjaman, Tanggal Peminjaman
- Tanggal Kembali Ekspektasi, (Excel) Tanggal Kembali Aktual, Status

#### Jaminan Lunas (Settlement)
```typescript
exportGuaranteeSettlementToPdf(filename, data)
exportGuaranteeSettlementToExcel(filename, data)
```
Kolom yang diekspor:
- No, No SPK, No CIF, Nama Jaminan, Nama Peminjam
- Tanggal Peminjaman, Tanggal Pelunasan, Status Pelunasan, Catatan

### 3. Fitur Format PDF
- **Orientasi**: Landscape untuk tabel yang lebar
- **Header**: Judul laporan dan tanggal generation
- **Styling**:
  - Header dengan background biru
  - Alternating row colors untuk readability
  - Page numbers di footer
  - Border untuk tampilan profesional
- **Multi-page support**: Otomatis membuat halaman baru jika data terlalu banyak

### 4. Fitur Format Excel
- **Column widths**: Lebar kolom otomatis menyesuaikan content
- **Frozen header**: Header row selalu terlihat saat scroll
- **Formatting**: Bold header dengan background warna
- **Large dataset support**: Bisa handle ribuan data tanpa issue

## Integrasi

### Di GuaranteeList.tsx
1. Import komponen:
```typescript
import GuaranteeReportExport from './GuaranteeReportExport';
```

2. State management:
```typescript
const [isReportExportOpen, setReportExportOpen] = useState(false);
```

3. Button di header:
```typescript
<button onClick={() => setReportExportOpen(true)}>
  Unduh Laporan
</button>
```

4. Render komponen:
```typescript
<GuaranteeReportExport
  isOpen={isReportExportOpen}
  onClose={() => setReportExportOpen(false)}
/>
```

## Cara Menggunakan

1. **Buka halaman Daftar Jaminan**
2. **Klik tombol "Unduh Laporan"** (berwarna hijau di sebelah tombol "Input Jaminan")
3. **Pilih jenis laporan**:
   - Jaminan Masuk (Tersedia)
   - Jaminan Dipinjam
   - Jaminan Lunas
4. **Pilih format**:
   - PDF - untuk dicetak/view
   - Excel - untuk analisis/edit
5. **Klik "Unduh Laporan"**
6. File otomatis diunduh dengan nama: `Laporan_[JenisJaminan]_[Tanggal].pdf/xlsx`

## Dependencies

- **jspdf** - Library untuk generate PDF
- **jspdf-autotable** - Plugin untuk tabel di PDF
- **xlsx** - Library untuk generate Excel

Semua library sudah terinstall dan konfigurasi sudah ada di package.json

## Fitur Lanjutan yang Dapat Ditambahkan

1. **Filter by date range** sebelum export
2. **Custom columns selection** - user bisa pilih kolom mana saja yang diekspor
3. **Export dengan logo/header perusahaan**
4. **Email export** - mengirim laporan langsung ke email
5. **Scheduled export** - otomatis generate laporan setiap periode
6. **Export format lain** (CSV, XML, dll)
7. **Chart/Summary** di awal laporan

## Troubleshooting

### Export tidak menampilkan data
- Pastikan API endpoint `/guarantee-settlements` sudah active
- Check console untuk error message
- Verify token authentication

### Format PDF tidak rapi
- Cek jumlah kolom, mungkin terlalu banyak untuk halaman
- Adjust column width di function `getColumnStyles()`

### File Excel tidak terbuka
- Pastikan file belum corrupt (cek ukuran file)
- Coba buka dengan versi Excel terbaru
- Download ulang file

## Support

Untuk pertanyaan atau bug report, silakan buat issue di repository atau hubungi tim development.
