# Dokumentasi Error Handling Form Input Jaminan

## Overview
Dokumentasi ini menjelaskan sistem error handling yang telah ditingkatkan pada form input/edit jaminan untuk menampilkan pesan error validation yang lebih detail dan user-friendly ketika terjadi kesalahan input data.

---

## Fitur Error Handling yang Ditingkatkan

### 1. Validasi Client-Side (Frontend)

**File:** `frontend/components/GuaranteeInputForm.tsx`

#### Fungsi `validateForm()` (Line 77-118)
Melakukan validasi data sebelum dikirim ke server:

- **No SPK (spk_number)**
  - Tidak boleh kosong
  - Hanya boleh mengandung huruf dan angka (a-z, A-Z, 0-9)
  - Pesan error: "No SPK hanya boleh mengandung huruf dan angka, tanpa simbol khusus"

- **No CIF (cif_number)**
  - Tidak boleh kosong
  - Hanya boleh angka positif
  - Pesan error: "No CIF hanya boleh mengandung angka positif tanpa simbol"

- **Atas Nama SPK (spk_name)**
  - Tidak boleh kosong

- **Jangka Waktu Kredit (credit_period)**
  - Tidak boleh kosong

- **Atas Nama Jaminan (guarantee_name)**
  - Tidak boleh kosong

- **Tipe Jaminan (guarantee_type)**
  - Tidak boleh kosong
  - Harus memilih dari dropdown (BPKB, SHM, SHGB, E-SHM)

- **No Jaminan (guarantee_number)**
  - Tidak boleh kosong

- **Lokasi Berkas (file_location)**
  - Tidak boleh kosong

#### Auto-Formatting Input
- **spk_number:** Otomatis menghilangkan karakter non-alphanumeric saat user mengetik
- **cif_number:** Otomatis menghilangkan karakter non-numeric saat user mengetik

#### Clear Error on Focus
- Error message untuk field akan otomatis hilang saat user mulai mengetik kembali

---

### 2. Validasi Server-Side (Backend)

**File:** `app/Http/Controllers/Api_jaminan/GuaranteeController.php`

#### Validasi pada Method `store()` (Line 85-96)
```php
$validated = $request->validate([
    'spk_number' => 'required|string|max:255|unique:mysql_jaminan.guarantees,spk_number',
    'cif_number' => 'required|string|max:255',
    'spk_name' => 'required|string|max:255',
    'credit_period' => 'required|string|max:255',
    'guarantee_name' => 'required|string|max:255',
    'guarantee_type' => 'required|in:BPKB,SHM,SHGB,E-SHM',
    'guarantee_number' => 'required|string|max:255|unique:mysql_jaminan.guarantees,guarantee_number',
    'file_location' => 'required|string|max:255',
    'input_date' => 'required|date',
    'status' => 'sometimes|in:available,dipinjam,lunas',
]);
```

#### Validasi pada Method `update()` (Line 171-182)
```php
$validated = $request->validate([
    'spk_number' => 'sometimes|required|string|max:255|unique:mysql_jaminan.guarantees,spk_number,' . $id,
    'cif_number' => 'sometimes|required|string|max:255',
    'spk_name' => 'sometimes|required|string|max:255',
    'credit_period' => 'sometimes|required|string|max:255',
    'guarantee_name' => 'sometimes|required|string|max:255',
    'guarantee_type' => 'sometimes|required|in:BPKB,SHM,SHGB,E-SHM',
    'guarantee_number' => 'sometimes|required|string|max:255|unique:mysql_jaminan.guarantees,guarantee_number,' . $id,
    'file_location' => 'sometimes|required|string|max:255',
    'input_date' => 'sometimes|required|date',
    'status' => 'sometimes|in:available,dipinjam,lunas',
]);
```

#### Error-Error yang Mungkin Terjadi

1. **Nomor SPK Sudah Digunakan**
   - Backend Error: `"The spk number field must be unique"`
   - Trigger: User memasukkan No SPK yang sudah ada di database

2. **Nomor Jaminan (No SHM/BPKB/dll) Sudah Digunakan** ⭐ **NEW**
   - Backend Error: `"The guarantee number field must be unique"`
   - Trigger: User memasukkan No Jaminan yang sudah ada di database
   - Ini adalah fitur utama untuk mencegah duplikasi nomor jaminan

3. **Tipe Jaminan Tidak Valid**
   - Backend Error: `"The guarantee type field must be one of: BPKB, SHM, SHGB, E-SHM"`
   - Trigger: Data yang dikirim bukan salah satu dari 4 tipe yang valid

4. **Format Data Tidak Sesuai**
   - Backend Error: `"The [field] field must be a string"`
   - Trigger: Data type tidak sesuai dengan yang diharapkan

5. **Tanggal Input Tidak Valid**
   - Backend Error: `"The input date field must be a valid date"`
   - Trigger: Format tanggal tidak valid

---

### 3. Error Handling pada Frontend (Enhanced)

**File:** `frontend/components/GuaranteeInputForm.tsx`

#### Method `handleSubmit()` (Line 147-237)

**Langkah-langkah error handling:**

1. **Reset Error States**
   ```typescript
   setError('');
   setValidationErrors({});
   ```

2. **Client-Side Validation**
   ```typescript
   if (!validateForm()) {
     setError('Mohon perbaiki kesalahan pada form');
     return;
   }
   ```

3. **Token Check**
   ```typescript
   const token = localStorage.getItem('auth_token');
   if (!token) {
     setError('Token tidak ditemukan. Silakan login kembali.');
     return;
   }
   ```

4. **Send Request to Backend**
   ```typescript
   const response = await fetch(endpoint, {
     method,
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${token}`,
     },
     body: JSON.stringify(submitData),
   });
   ```

5. **Parse Response**
   ```typescript
   const responseText = await response.text();
   let data: any = {};

   try {
     if (responseText && responseText.trim() !== '') {
       data = JSON.parse(responseText);
     }
   } catch (parseError) {
     setError('Server mengembalikan respons yang tidak valid');
     return;
   }
   ```

6. **Handle Server Errors**
   ```typescript
   if (!response.ok) {
     // Handle validation errors from backend
     if (data?.errors && typeof data.errors === 'object') {
       const serverErrors: ValidationErrors = {};

       // Map server errors to form fields
       Object.entries(data.errors).forEach(([field, messages]: [string, any]) => {
         if (Array.isArray(messages)) {
           serverErrors[field as keyof ValidationErrors] = messages[0];
         } else {
           serverErrors[field as keyof ValidationErrors] = String(messages);
         }
       });

       setValidationErrors(serverErrors);
       setError('Validasi gagal. Mohon periksa kembali data yang anda masukkan.');
     }
   }
   ```

---

## User Interface Error Display

### 1. General Error Alert (Top of Form)
- **Lokasi:** Di bagian atas form (Line 197-210)
- **Tampilan:** Red alert box dengan icon
- **Konten:** Pesan error umum atau pesan dari server
- **Contoh:**
  ```
  ❌ Validasi gagal. Mohon periksa kembali data yang anda masukkan.
  ```

### 2. Field-Level Error Messages
- **Lokasi:** Di bawah setiap input field
- **Tampilan:** Red text dengan border merah pada input
- **Konten:** Pesan error spesifik untuk field tersebut
- **Contoh:**
  ```
  No Jaminan (No SHM) *
  [Input field dengan border merah]
  ❌ The guarantee number field must be unique
  ```

### 3. Error Summary Box
- **Lokasi:** Di atas tombol submit (Line 404-420)
- **Tampilan:** Red background box dengan list errors
- **Konten:** Summary semua error yang ada
- **Tampil jika:** Ada validation errors atau general error

---

## Flow Diagram Error Handling

```
User Input Data
    ↓
[Client-Side Validation]
    ↓
  Valid?
  / \
No   Yes
|     ↓
|  [Send to Server]
|     ↓
|  [Server Validation]
|     ↓
|  Valid?
|  / \
Yes   No
|     ↓
|  [Parse Error Response]
|     ↓
|  [Map errors to fields]
|     ↓
|  [Display field errors + general error]
↓
[Show Error Messages & Highlight Fields]
↓
[User Corrects Data]
↓
[Retry Submission]
```

---

## Contoh Skenario Error

### Skenario 1: No Jaminan Sudah Digunakan

**User Action:**
1. Click "Input Jaminan"
2. Isi semua field dengan data valid
3. Nomor Jaminan: "9010102" (sudah ada di database)
4. Click "Simpan Jaminan"

**Expected Result:**
- Form tetap terbuka
- Error message muncul di atas form:
  ```
  ❌ Validasi gagal. Mohon periksa kembali data yang anda masukkan.
  ```
- Field "No Jaminan" mendapat red border
- Di bawah field "No Jaminan" muncul error:
  ```
  ❌ The guarantee number field must be unique
  ```
- Error summary box menunjukkan:
  ```
  Mohon perbaiki kesalahan berikut:
  • The guarantee number field must be unique
  ```

**User Action (Lanjutan):**
1. Ubah No Jaminan ke "9010103" (yang belum ada)
2. Error message otomatis hilang
3. Click "Simpan Jaminan" lagi
4. ✅ Data berhasil disimpan

---

### Skenario 2: Format Data Tidak Valid

**User Action:**
1. Click "Input Jaminan"
2. No SPK: "SPK@#$123" (mengandung simbol)
3. Click "Simpan Jaminan"

**Expected Result:**
- Client-side validation menangkap error
- Error message muncul:
  ```
  ❌ Mohon perbaiki kesalahan pada form
  ```
- Field "No SPK" mendapat red border
- Di bawah field muncul error:
  ```
  ❌ No SPK hanya boleh mengandung huruf dan angka, tanpa simbol khusus
  ```
- Button "Simpan Jaminan" di-disable

**Auto-Correction:**
- Saat user mengetik ulang di field "No SPK", simbol otomatis dihilangkan
- Error message hilang saat user mulai mengetik

---

## Testing Checklist

### Test Case 1: Unique Guarantee Number Validation
- [ ] Coba input guarantee_number yang sudah ada
- [ ] Verifikasi error "The guarantee number field must be unique" muncul
- [ ] Field guarantee_number mendapat red border
- [ ] General error message menampilkan "Validasi gagal..."
- [ ] Ubah guarantee_number ke yang baru
- [ ] Error otomatis hilang saat user mengetik
- [ ] Submit ulang dengan data baru → berhasil

### Test Case 2: Format Validation
- [ ] Input spk_number dengan simbol khusus
- [ ] Verifikasi error message muncul
- [ ] Simbol otomatis dihilangkan saat mengetik
- [ ] Input cif_number dengan huruf
- [ ] Verifikasi error message muncul
- [ ] Huruf otomatis dihilangkan saat mengetik

### Test Case 3: Token Expiration
- [ ] Logout user sebelum submit form
- [ ] Coba submit form
- [ ] Verifikasi error "Token tidak ditemukan. Silakan login kembali."

### Test Case 4: Server Connection Error
- [ ] Matikan backend server
- [ ] Coba submit form
- [ ] Verifikasi error handling berkerja dengan baik

### Test Case 5: JSON Parse Error
- [ ] Mock server response dengan invalid JSON
- [ ] Verifikasi error "Server mengembalikan respons yang tidak valid"

---

## Pesan Error Backend (Laravel)

Berikut adalah pesan error standard yang mungkin dikembalikan oleh Laravel:

| Field | Validation Rule | Pesan Error |
|-------|-----------------|-------------|
| spk_number | unique | The spk number field must be unique |
| guarantee_number | unique | The guarantee number field must be unique |
| guarantee_type | in:... | The guarantee type field must be one of: BPKB, SHM, SHGB, E-SHM |
| input_date | date | The input date field must be a valid date |
| [any field] | required | The [field name] field is required |
| [any field] | max:255 | The [field name] field may not be greater than 255 characters |

---

## Best Practices

1. **Always validate on both sides**
   - Frontend untuk UX experience yang baik (instant feedback)
   - Backend untuk security (tidak bisa dibypass oleh user)

2. **Clear & Specific Error Messages**
   - Tunjukkan field mana yang error
   - Tunjukkan alasan error spesifik
   - Jangan generic message seperti "Error"

3. **Auto-clear errors on input**
   - Ketika user mulai mengetik, clear error untuk field tersebut
   - Ini membuat UX lebih smooth

4. **Disable submit button when there are errors**
   - Prevent user dari submit form dengan data yang salah
   - `disabled={loading || hasErrors()}`

5. **Show loading state**
   - Ketika sedang submit, show spinner dan disable form
   - User tahu bahwa sistem sedang memproses

---

## Customization

Jika ingin menambah validasi field baru:

1. **Add to ValidationErrors interface** (Line 12-23)
   ```typescript
   interface ValidationErrors {
     newField?: string;
   }
   ```

2. **Add to validateForm()** (Line 77-118)
   ```typescript
   if (!formData.newField.trim()) {
     errors.newField = 'New Field tidak boleh kosong';
   }
   ```

3. **Add error display in form** (Line 212-402)
   ```typescript
   {getFieldError('newField') && (
     <p className="mt-1 text-sm text-red-600">{getFieldError('newField')}</p>
   )}
   ```

4. **Add to error summary** (Line 408-419)
   ```typescript
   {validationErrors.newField && <li>{validationErrors.newField}</li>}
   ```

5. **Add backend validation** (GuaranteeController.php)
   ```php
   'new_field' => 'required|string|max:255',
   ```

---

## Revision History
- **Version 1.0** (2025-11-26)
  - Initial implementation of enhanced error handling
  - Client-side validation dengan auto-formatting
  - Server-side validation dengan detailed error messages
  - Field-level error display
  - Error summary box

---

**Developed for:** Asset Management System V2
**Last Updated:** 2025-11-26
