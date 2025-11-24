# Dokumentasi: Dashboard Jaminan Asset dengan Statistik

## Ringkasan
Implementasi dashboard Jaminan Asset yang menampilkan statistik real-time jumlah jaminan berdasarkan status (Tersedia, Dipinjam, Lunas) dengan warna yang sesuai dengan label status.

---

## Masalah
Sebelumnya, dashboard Jaminan Asset hanya menampilkan angka dummy (0) tanpa data yang relevan. Tidak ada informasi real-time tentang jumlah jaminan yang tersedia, sedang dipinjam, atau sudah lunas.

---

## Solusi yang Diterapkan

### 1. **Backend Endpoint - Statistik Jaminan**
**File:** `app/Http/Controllers/Api_jaminan/GuaranteeController.php`

#### Method: `getStats()` (Line 294-317)
```php
public function getStats()
{
    try {
        $stats = [
            'total' => Guarantee::count(),
            'by_status' => [
                'available' => Guarantee::byStatus('available')->count(),
                'dipinjam' => Guarantee::byStatus('dipinjam')->count(),
                'lunas' => Guarantee::byStatus('lunas')->count(),
            ],
            // ... by_type dan other data
        ];

        return response()->json([
            'success' => true,
            'message' => 'Statistik jaminan berhasil diambil',
            'data' => $stats
        ]);
    }
}
```

**Endpoint:** `GET /api/guarantees/stats`

**Response Example:**
```json
{
  "success": true,
  "data": {
    "total": 10,
    "by_status": {
      "available": 5,
      "dipinjam": 3,
      "lunas": 2
    },
    "by_type": { ... },
    "total_spk": 8,
    "latest_input": "2025-11-24"
  }
}
```

---

### 2. **Frontend API Service**
**File:** `frontend/services/api.ts`

#### Function: `getGuaranteeStats()` (Line 2212-2221)
```typescript
export const getGuaranteeStats = async (): Promise<GuaranteeStats | null> => {
  try {
    const response = await apiRequest('/guarantees/stats');
    const result = handleApiResponse<any>(response);
    return result.data || null;
  } catch (error) {
    console.error('Error fetching guarantee stats:', error);
    return null;
  }
};
```

**Status:** Function sudah ada dan tidak perlu dimodifikasi.

---

### 3. **Frontend Component - Dashboard Jaminan**
**File:** `frontend/components/GuaranteeDashboard.tsx` ✨ **BARU**

#### Fitur Utama:

**A. State Management**
```typescript
const [stats, setStats] = useState({
  available: 0,      // Jaminan Tersedia
  dipinjam: 0,       // Jaminan Dipinjam
  lunas: 0,          // Jaminan Lunas
  total: 0,          // Total Jaminan
});
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');
```

**B. Data Fetching**
- Fetch data dari API saat component mount
- Auto-refresh setiap 5 menit
- Loading state dengan skeleton UI
- Error handling yang jelas

**C. Statistik Cards dengan Warna Sesuai Status**

| Status | Warna | Icon | Label |
|--------|-------|------|-------|
| **available** | 🟢 Green (#16a34a) | Checkmark | Jaminan Tersedia |
| **dipinjam** | 🟡 Yellow (#ca8a04) | Lightning | Jaminan Dipinjam |
| **lunas** | 🔵 Blue (#2563eb) | Document | Jaminan Lunas |

```typescript
{/* Jaminan Tersedia - Green */}
<div className="bg-white rounded-lg shadow p-6">
  <p className="text-4xl font-bold text-green-600">{stats.available}</p>
  <p className="text-gray-600 text-sm">Jaminan siap dipinjamkan</p>
</div>

{/* Jaminan Dipinjam - Yellow */}
<div className="bg-white rounded-lg shadow p-6">
  <p className="text-4xl font-bold text-yellow-600">{stats.dipinjam}</p>
  <p className="text-gray-600 text-sm">Jaminan sedang dalam peminjaman</p>
</div>

{/* Jaminan Lunas - Blue */}
<div className="bg-white rounded-lg shadow p-6">
  <p className="text-4xl font-bold text-blue-600">{stats.lunas}</p>
  <p className="text-gray-600 text-sm">Jaminan sudah dikembalikan/lunas</p>
</div>
```

**D. Summary Card**
- Menampilkan total jaminan
- Breakdown statistik (tersedia, dipinjam, lunas)
- Background gradient untuk visual appeal

---

### 4. **App.tsx - Routing Integration**
**File:** `frontend/App.tsx`

#### Import Component
```typescript
import GuaranteeDashboard from './components/GuaranteeDashboard';
```

#### Switch Case Update (Line 200-201)
```typescript
case 'GUARANTEE_DASHBOARD':
    return <GuaranteeDashboard navigateTo={navigateTo} />;
```

**Sebelumnya:** Hardcoded HTML dengan dummy data (0, 0, 0)
**Sesudah:** Dynamic component dengan real-time data dari API

---

## Alur Data

```
┌──────────────────────────────────┐
│   User buka Dashboard Jaminan    │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│  Component Mount (useEffect)     │
│  Call: getGuaranteeStats()       │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│   API Request                    │
│   GET /api/guarantees/stats      │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│   Backend Controller             │
│   GuaranteeController::getStats()│
│                                  │
│   Count by status:               │
│   - available: WHERE status=...  │
│   - dipinjam: WHERE status=...   │
│   - lunas: WHERE status=...      │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│   Response (JSON)                │
│   {                              │
│     by_status: {                 │
│       available: 5,              │
│       dipinjam: 3,               │
│       lunas: 2                   │
│     }                            │
│   }                              │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│   Update State                   │
│   setStats({...})                │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│   Render Cards                   │
│   - Green: 5 Tersedia           │
│   - Yellow: 3 Dipinjam          │
│   - Blue: 2 Lunas               │
└──────────────────────────────────┘
```

---

## Warna dan Styling

### Color Mapping (Konsisten dengan GuaranteeList)
```
Status          Background    Text         Tailwind Classes
────────────────────────────────────────────────────────────
available       Light Green   Dark Green   bg-green-100 text-green-800
dipinjam        Light Yellow  Dark Yellow  bg-yellow-100 text-yellow-800
lunas           Light Blue    Dark Blue    bg-blue-100 text-blue-800
```

### UI Components
- **Cards:** White background dengan shadow, hover effect
- **Icons:** Color-matched icons (checkmark, lightning, document)
- **Typography:** Bold numbers, secondary text dengan gray color
- **Summary Card:** Gradient background (blue-50 to indigo-50)

---

## Responsive Design

```
Desktop (md):
┌─────────────────┬─────────────────┬─────────────────┐
│   Tersedia      │    Dipinjam     │      Lunas      │
│       5         │        3        │        2        │
└─────────────────┴─────────────────┴─────────────────┘

Mobile (sm):
┌──────────────────────┐
│    Tersedia          │
│        5             │
├──────────────────────┤
│    Dipinjam          │
│        3             │
├──────────────────────┤
│      Lunas           │
│        2             │
└──────────────────────┘
```

Layout: `grid grid-cols-1 md:grid-cols-3 gap-6`

---

## Loading dan Error Handling

### Loading State
- Skeleton loading untuk 3 cards
- Pulse animation dengan `animate-pulse`
- Header dan summary tetap ditampilkan

### Error State
- Alert box merah dengan error message
- Fallback data (zeros) jika fetch gagal
- Console logging untuk debugging

---

## Auto-Refresh Feature

```typescript
// Refresh data setiap 5 menit
useEffect(() => {
  const fetchStats = async () => { /* ... */ };

  fetchStats();
  const interval = setInterval(fetchStats, 5 * 60 * 1000);
  return () => clearInterval(interval);
}, []);
```

**Benefit:**
- Data selalu up-to-date tanpa perlu refresh manual
- User melihat perubahan jumlah jaminan secara real-time
- Interval bisa disesuaikan sesuai kebutuhan

---

## File yang Diubah/Dibuat

### Dibuat:
- ✨ `frontend/components/GuaranteeDashboard.tsx` (BARU)

### Dimodifikasi:
- 📝 `app/Http/Controllers/Api_jaminan/GuaranteeController.php` (getStats method)
- 📝 `frontend/App.tsx` (import dan routing)

### Existing (No changes):
- ✅ `frontend/services/api.ts` (getGuaranteeStats function sudah ada)

---

## Testing Checklist

- [ ] Buka Dashboard Jaminan dari sidebar
- [ ] Verifikasi loading state muncul sebentar
- [ ] Verifikasi 3 cards dengan statistik muncul
  - [ ] Green card: Jaminan Tersedia
  - [ ] Yellow card: Jaminan Dipinjam
  - [ ] Blue card: Jaminan Lunas
- [ ] Verifikasi warna sesuai (green, yellow, blue)
- [ ] Verifikasi summary card menampilkan total
- [ ] Verifikasi angka sesuai dengan data di "Daftar Jaminan"
- [ ] Refresh halaman, data tetap sama (atau berubah jika ada perubahan)
- [ ] Tunggu 5 menit, verifikasi data refresh otomatis
- [ ] Ubah status jaminan (pinjam/kembalikan) dan verifikasi angka berubah

---

## Perbandingan: Sebelum vs Sesudah

### SEBELUM ❌
```
Dashboard Jaminan Asset
───────────────────────
┌─────────┬─────────┬─────────┐
│    0    │    0    │    0    │
│ Aktif   │Kadaluarsa│ Diklaim │
└─────────┴─────────┴─────────┘

• Data hardcoded (dummy)
• Tidak real-time
• Label tidak sesuai dengan sistem
• Warna tidak konsisten
```

### SESUDAH ✅
```
Dashboard Jaminan Asset
───────────────────────
┌─────────┬─────────┬─────────┐
│    5    │    3    │    2    │
│Tersedia │Dipinjam │ Lunas   │
│  🟢     │  🟡     │  🔵     │
└─────────┴─────────┴─────────┘

• Data real-time dari API
• Auto-refresh setiap 5 menit
• Label sesuai dengan status di sistem
• Warna konsisten dengan GuaranteeList
• Loading state dan error handling
• Responsive design
```

---

## Kesimpulan

Implementasi ini berhasil:
1. ✅ Menampilkan statistik real-time jaminan
2. ✅ Mengelompokkan berdasarkan status (available, dipinjam, lunas)
3. ✅ Menggunakan warna yang konsisten dengan GuaranteeList
4. ✅ Menyediakan loading state dan error handling
5. ✅ Auto-refresh data tanpa user interaction
6. ✅ Responsive design untuk semua ukuran layar
7. ✅ UX yang clean dan professional

**Dashboard Jaminan sekarang lebih informatif dan user-friendly!** 🎉
