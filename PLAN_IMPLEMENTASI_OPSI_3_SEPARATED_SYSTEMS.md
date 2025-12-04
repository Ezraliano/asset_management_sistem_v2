# ⚡ PLAN IMPLEMENTASI OPSI 3 - SEPARATED SYSTEMS (DUAL SYSTEMS)
**Tanggal**: 28 November 2024
**Status**: Ready for Implementation
**Kompleksitas**: MEDIUM
**Estimasi Waktu**: 6-7 Jam
**Impact**: LOW - Minimal architecture changes

---

## 📌 DAFTAR ISI
1. [Ringkasan Opsi 3](#ringkasan-opsi-3)
2. [Architecture Overview](#architecture-overview)
3. [Implementation Plan](#implementation-plan)
4. [Code Changes Required](#code-changes-required)
5. [Frontend Integration](#frontend-integration)
6. [Testing Plan](#testing-plan)
7. [Deployment Guide](#deployment-guide)

---

## 📋 RINGKASAN OPSI 3

### Konsep Utama
**Membiarkan asset management dan jaminan sebagai 2 sistem yang TERPISAH tapi TERINTEGRASI di frontend.**

```
ARCHITECTURE:
┌─────────────────────────────────┐    ┌──────────────────────────────┐
│  Asset Management System        │    │  Jaminan System              │
├─────────────────────────────────┤    ├──────────────────────────────┤
│ Database: asset_management_db   │    │ Database: asset_jaminan      │
│ Table: users                    │    │ Table: jaminan_users         │
│ Auth: /api/auth/login           │    │ Auth: /api/jaminan/auth/login│
│ Token: auth_token_asset         │    │ Token: auth_token_jaminan    │
│                                 │    │                              │
│ Roles:                          │    │ Roles:                       │
│  - super-admin                  │    │  - super-admin               │
│  - admin-holding                │    │  - admin-holding             │
│  - admin-unit                   │    │  - admin-kredit              │
│  - user-regular                 │    │                              │
│  - auditor                      │    │ Access: Jaminan only         │
│                                 │    │                              │
│ Access: Asset Management        │    │                              │
└─────────────────────────────────┘    └──────────────────────────────┘
         ↓                                      ↓
         └──────────────────┬──────────────────┘
                            ↓
              ┌──────────────────────────┐
              │   Frontend Application   │
              │  (Single App, 2 Logins)  │
              │                          │
              │ Navigation:              │
              │ - Asset (if token_asset) │
              │ - Jaminan (if token_jan) │
              └──────────────────────────┘
```

### Keuntungan Opsi 3
✅ **No Database Migration** - Tetap terpisah, zero migration risk
✅ **Minimal Code Changes** - Hanya logic & navigation
✅ **Quick Implementation** - Cepat deploy
✅ **Low Risk** - Tidak touch existing data
✅ **Easy Rollback** - Revert routing changes saja
✅ **Independence** - Kedua sistem bisa develop independently
✅ **Current Path** - Jalan dari where we are now

### Kerugian Opsi 3
❌ **Multiple Logins** - User harus login 2x (atau SSO)
❌ **Two Tokens** - Frontend harus manage 2 tokens
❌ **Separate Databases** - Data scattered di 2 tempat
❌ **Different Roles** - Role naming berbeda per sistem
❌ **More Complex Frontend** - Double check untuk access
❌ **Limited Scalability** - Sulit add sistem baru

---

## 🏗️ ARCHITECTURE OVERVIEW

### System Separation

```
┌──────────────────────────────────────────────────────────┐
│                    FRONTEND (Vue/React)                  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────┐         │
│  │ Token Management                           │         │
│  │ ┌─────────────────┬──────────────────────┐ │         │
│  │ │ Asset Token     │ Jaminan Token        │ │         │
│  │ │ (localStorage)  │ (localStorage)       │ │         │
│  │ └─────────────────┴──────────────────────┘ │         │
│  │                                            │         │
│  │ Navigation & Routes                        │         │
│  │ - if (assetToken) → show Asset menu        │         │
│  │ - if (jaminanToken) → show Jaminan menu    │         │
│  │                                            │         │
│  │ API Interceptors                           │         │
│  │ - asset requests → add assetToken          │         │
│  │ - jaminan requests → add jaminanToken      │         │
│  └────────────────────────────────────────────┘         │
│                                                          │
└──────────────────────────────────────────────────────────┘
         │                                    │
         ↓                                    ↓
┌─────────────────────────┐        ┌──────────────────────┐
│   ASSET BACKEND         │        │  JAMINAN BACKEND     │
├─────────────────────────┤        ├──────────────────────┤
│ POST /api/auth/login    │        │ POST /api/jaminan/   │
│                         │        │   auth/login         │
│ GET /api/assets         │        │                      │
│ GET /api/loans          │        │ GET /api/jaminan/    │
│ GET /api/maintenances   │        │   guarantees         │
│ ...                     │        │ GET /api/jaminan/    │
│                         │        │   guarantee-loans    │
└─────────────────────────┘        └──────────────────────┘
         │                                    │
         ↓                                    ↓
┌─────────────────────────┐        ┌──────────────────────┐
│ asset_management_db     │        │   asset_jaminan      │
├─────────────────────────┤        ├──────────────────────┤
│ users (super-admin,     │        │ jaminan_users        │
│         admin-holding,  │        │ (super-admin,        │
│         admin-unit,     │        │  admin-holding,      │
│         user-regular,   │        │  admin-kredit)       │
│         auditor)        │        │                      │
│ assets                  │        │ guarantees           │
│ loans                   │        │ guarantee-loans      │
│ ...                     │        │ ...                  │
└─────────────────────────┘        └──────────────────────┘
```

### Data Flow

```
USER JOURNEY - OPSI 3:

1. User Opens App
   ↓
2. Check localStorage
   ├─ Have assetToken? → Can access Asset
   └─ Have jaminanToken? → Can access Jaminan

3. Show Login Options
   ├─ "Login Asset Management" → POST /api/auth/login
   └─ "Login Jaminan" → POST /api/jaminan/auth/login

4. User Login Asset Management
   ↓
   Email/Password → /api/auth/login
   ↓
   Backend verify (users table)
   ↓
   Return token → localStorage.setItem('assetToken')
   ↓
   Frontend: Show Asset menu, hide Jaminan menu

5. User Login Jaminan
   ↓
   Email/Password → /api/jaminan/auth/login
   ↓
   Backend verify (jaminan_users table)
   ↓
   Return token → localStorage.setItem('jaminanToken')
   ↓
   Frontend: Show Jaminan menu, keep showing Asset menu

6. API Calls
   ├─ GET /api/assets
   │  └─ Header: Authorization: Bearer {assetToken}
   │
   └─ GET /api/jaminan/guarantees
      └─ Header: Authorization: Bearer {jaminanToken}
```

---

## 🔧 IMPLEMENTATION PLAN

### Phase 1: Role Alignment (1-2 Hours)

#### 1.1 Standardize Role Names

**Current State:**
```
Asset System:       Jaminan System:
- super-admin       - super-admin
- admin             - admin-holding
- unit              - admin-kredit
- user
- auditor
```

**Target State:**
```
Asset System:       Jaminan System:
- super-admin       - super-admin
- admin-holding     - admin-holding
- admin-unit        - admin-kredit
- user-regular
- auditor
```

**Migration:** Update role values saja (no data loss)

**File:** `database/migrations/2025_11_28_standardize_role_names.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Standardize asset system roles
        DB::table('users')->where('role', 'admin')->update(['role' => 'admin-holding']);
        DB::table('users')->where('role', 'unit')->update(['role' => 'admin-unit']);
        DB::table('users')->where('role', 'user')->update(['role' => 'user-regular']);
    }

    public function down(): void
    {
        DB::table('users')->where('role', 'admin-holding')->update(['role' => 'admin']);
        DB::table('users')->where('role', 'admin-unit')->update(['role' => 'unit']);
        DB::table('users')->where('role', 'user-regular')->update(['role' => 'user']);
    }
};
```

#### 1.2 Update Asset User Model

**File:** `app/Models/User.php`

```php
<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens;

    protected $fillable = [
        'name', 'username', 'email', 'password', 'role', 'unit_id'
    ];

    // === ROLE CHECKS ===

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super-admin';
    }

    public function isAdminHolding(): bool
    {
        return $this->role === 'admin-holding';
    }

    public function isAdminUnit(): bool
    {
        return $this->role === 'admin-unit';
    }

    public function isRegularUser(): bool
    {
        return $this->role === 'user-regular';
    }

    public function isAuditor(): bool
    {
        return $this->role === 'auditor';
    }

    // === PERMISSION CHECKS ===

    public function canAccessAsset(): bool
    {
        return in_array($this->role, ['super-admin', 'admin-holding', 'admin-unit']);
    }

    // ... preserve existing methods
}
```

#### 1.3 Update Jaminan User Model

**File:** `app/Models_jaminan/JaminanUser.php`

```php
<?php

namespace App\Models_jaminan;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class JaminanUser extends Authenticatable
{
    use HasApiTokens;

    protected $connection = 'mysql_jaminan';
    protected $table = 'jaminan_users';

    protected $fillable = ['name', 'email', 'password', 'role'];

    // === ROLE CHECKS ===

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super-admin';
    }

    public function isAdminHolding(): bool
    {
        return $this->role === 'admin-holding';
    }

    public function isAdminKredit(): bool
    {
        return $this->role === 'admin-kredit';
    }

    public function isAdmin(): bool
    {
        return in_array($this->role, ['super-admin', 'admin-holding', 'admin-kredit']);
    }

    // === PERMISSION CHECKS ===

    public function canAccessJaminan(): bool
    {
        return $this->isAdmin();
    }

    public function canCreateJaminan(): bool
    {
        return in_array($this->role, ['super-admin', 'admin-kredit']);
    }

    public function canUpdateJaminan(): bool
    {
        return in_array($this->role, ['super-admin', 'admin-kredit']);
    }

    public function canDeleteJaminan(): bool
    {
        return in_array($this->role, ['super-admin', 'admin-kredit']);
    }

    public function canViewJaminan(): bool
    {
        return $this->isAdmin();
    }

    // ... other methods
}
```

### Phase 2: Controller Updates (1-2 Hours)

#### 2.1 Update Auth Controllers (Keep As-Is)

Existing auth controllers sudah OK:
- `AuthSSOController.php` - untuk asset login
- `JaminanAuthController.php` - untuk jaminan login

**Hanya perlu ensure mereka return correct token info:**

```php
// app/Http/Controllers/Api/AuthSSOController.php
public function login(Request $request)
{
    // ... existing logic

    return response()->json([
        'user' => $user,
        'token' => $token,
        'system' => 'asset-management', // Identify which system
        'permissions' => [
            'can_access_asset' => true,
            'can_access_jaminan' => false, // Asset system ≠ Jaminan
        ]
    ]);
}

// app/Http/Controllers/Api_jaminan/JaminanAuthController.php
public function login(Request $request)
{
    // ... existing logic

    return response()->json([
        'user' => $user,
        'token' => $token,
        'system' => 'jaminan', // Identify which system
        'permissions' => [
            'can_access_asset' => false, // Jaminan system ≠ Asset
            'can_access_jaminan' => true,
        ]
    ]);
}
```

#### 2.2 Update GuaranteeController

Ensure `canCreateJaminan()` & `canUpdateJaminan()` checks untuk admin-holding:

```php
// app/Http/Controllers/Api_jaminan/GuaranteeController.php

public function store(Request $request)
{
    $user = Auth::user(); // JaminanUser

    // Check admin-holding tidak boleh create
    if ($user->isAdminHolding()) {
        return response()->json([
            'error' => 'Permission Denied',
            'message' => 'Admin-holding tidak dapat membuat jaminan'
        ], 403);
    }

    // Super-admin & admin-kredit OK
    if (!in_array($user->role, ['super-admin', 'admin-kredit'])) {
        return response()->json(['error' => 'Forbidden'], 403);
    }

    // ... create logic
}

public function update(Request $request, $id)
{
    $user = Auth::user();

    if ($user->isAdminHolding()) {
        return response()->json([
            'error' => 'Permission Denied',
            'message' => 'Admin-holding tidak dapat mengubah jaminan'
        ], 403);
    }

    // ... update logic
}

public function destroy($id)
{
    $user = Auth::user();

    if ($user->isAdminHolding()) {
        return response()->json([
            'error' => 'Permission Denied',
            'message' => 'Admin-holding tidak dapat menghapus jaminan'
        ], 403);
    }

    // ... delete logic
}
```

### Phase 3: Frontend Implementation (3-4 Hours)

#### 3.1 Setup Token Management

**File:** `frontend/utils/tokenManager.ts` (atau sesuai struktur)

```typescript
// Token Manager - manage 2 tokens separately
export class TokenManager {
    private readonly ASSET_TOKEN_KEY = 'auth_token_asset';
    private readonly JAMINAN_TOKEN_KEY = 'auth_token_jaminan';
    private readonly ASSET_USER_KEY = 'auth_user_asset';
    private readonly JAMINAN_USER_KEY = 'auth_user_jaminan';

    // ===== ASSET TOKENS =====

    setAssetToken(token: string, user: User): void {
        localStorage.setItem(this.ASSET_TOKEN_KEY, token);
        localStorage.setItem(this.ASSET_USER_KEY, JSON.stringify(user));
    }

    getAssetToken(): string | null {
        return localStorage.getItem(this.ASSET_TOKEN_KEY);
    }

    getAssetUser(): User | null {
        const data = localStorage.getItem(this.ASSET_USER_KEY);
        return data ? JSON.parse(data) : null;
    }

    clearAssetToken(): void {
        localStorage.removeItem(this.ASSET_TOKEN_KEY);
        localStorage.removeItem(this.ASSET_USER_KEY);
    }

    // ===== JAMINAN TOKENS =====

    setJaminanToken(token: string, user: JaminanUser): void {
        localStorage.setItem(this.JAMINAN_TOKEN_KEY, token);
        localStorage.setItem(this.JAMINAN_USER_KEY, JSON.stringify(user));
    }

    getJaminanToken(): string | null {
        return localStorage.getItem(this.JAMINAN_TOKEN_KEY);
    }

    getJaminanUser(): JaminanUser | null {
        const data = localStorage.getItem(this.JAMINAN_USER_KEY);
        return data ? JSON.parse(data) : null;
    }

    clearJaminanToken(): void {
        localStorage.removeItem(this.JAMINAN_TOKEN_KEY);
        localStorage.removeItem(this.JAMINAN_USER_KEY);
    }

    // ===== UTILITY =====

    hasAssetToken(): boolean {
        return !!this.getAssetToken();
    }

    hasJaminanToken(): boolean {
        return !!this.getJaminanToken();
    }

    isLoggedInToEitherSystem(): boolean {
        return this.hasAssetToken() || this.hasJaminanToken();
    }

    logoutAll(): void {
        this.clearAssetToken();
        this.clearJaminanToken();
    }

    getSummary() {
        return {
            assetLoggedIn: this.hasAssetToken(),
            jaminanLoggedIn: this.hasJaminanToken(),
            assetUser: this.getAssetUser(),
            jaminanUser: this.getJaminanUser(),
        };
    }
}

export const tokenManager = new TokenManager();
```

#### 3.2 Setup API Interceptor

**File:** `frontend/services/apiClient.ts` (atau axios setup)

```typescript
import axios from 'axios';
import { tokenManager } from './tokenManager';

// Create separate axios instances untuk setiap system
export const assetApi = axios.create({
    baseURL: process.env.REACT_APP_ASSET_API_URL || 'http://localhost/api',
    timeout: 10000,
});

export const jaminanApi = axios.create({
    baseURL: process.env.REACT_APP_JAMINAN_API_URL || 'http://localhost/api/jaminan',
    timeout: 10000,
});

// ===== REQUEST INTERCEPTORS =====

// Asset API - tambah asset token ke header
assetApi.interceptors.request.use((config) => {
    const token = tokenManager.getAssetToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Jaminan API - tambah jaminan token ke header
jaminanApi.interceptors.request.use((config) => {
    const token = tokenManager.getJaminanToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ===== RESPONSE INTERCEPTORS =====

// Handle 401 Unauthorized - clear respective token
assetApi.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            tokenManager.clearAssetToken();
            window.location.href = '/login?system=asset';
        }
        return Promise.reject(error);
    }
);

jaminanApi.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            tokenManager.clearJaminanToken();
            window.location.href = '/login?system=jaminan';
        }
        return Promise.reject(error);
    }
);
```

#### 3.3 Login Page Component

**File:** `frontend/pages/Login.tsx` (atau sesuai struktur)

```jsx
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { assetApi, jaminanApi } from '../services/apiClient';
import { tokenManager } from '../services/tokenManager';

export const LoginPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const system = searchParams.get('system'); // 'asset' atau 'jaminan'

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState(system || 'asset');

    const handleAssetLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await assetApi.post('/auth/login', {
                email,
                password,
            });

            const { user, token } = response.data;

            // Save token
            tokenManager.setAssetToken(token, user);

            // Redirect ke asset dashboard
            window.location.href = '/asset/dashboard';
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleJaminanLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await jaminanApi.post('/auth/login', {
                email,
                password,
            });

            const { user, token } = response.data;

            // Save token
            tokenManager.setJaminanToken(token, user);

            // Redirect ke jaminan dashboard
            window.location.href = '/jaminan/guarantees';
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <h1>System Login</h1>

                {/* Tab Navigation */}
                <div className="tabs">
                    <button
                        className={`tab ${activeTab === 'asset' ? 'active' : ''}`}
                        onClick={() => setActiveTab('asset')}
                    >
                        Asset Management
                    </button>
                    <button
                        className={`tab ${activeTab === 'jaminan' ? 'active' : ''}`}
                        onClick={() => setActiveTab('jaminan')}
                    >
                        Jaminan
                    </button>
                </div>

                {error && <div className="error-message">{error}</div>}

                {/* Asset Login Form */}
                {activeTab === 'asset' && (
                    <form onSubmit={handleAssetLogin}>
                        <h2>Asset Management Login</h2>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button type="submit" disabled={loading}>
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                    </form>
                )}

                {/* Jaminan Login Form */}
                {activeTab === 'jaminan' && (
                    <form onSubmit={handleJaminanLogin}>
                        <h2>Jaminan Login</h2>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button type="submit" disabled={loading}>
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};
```

#### 3.4 Navigation Component

**File:** `frontend/components/Navigation.tsx`

```jsx
import React from 'react';
import { tokenManager } from '../services/tokenManager';

export const Navigation: React.FC = () => {
    const summary = tokenManager.getSummary();
    const assetUser = summary.assetUser;
    const jaminanUser = summary.jaminanUser;

    const handleLogout = (system: 'asset' | 'jaminan') => {
        if (system === 'asset') {
            tokenManager.clearAssetToken();
            // API call to logout
            assetApi.post('/logout').catch(() => {});
        } else {
            tokenManager.clearJaminanToken();
            // API call to logout
            jaminanApi.post('/jaminan/auth/logout').catch(() => {});
        }

        // If user logged out from both, redirect to login
        if (!summary.assetLoggedIn && !summary.jaminanLoggedIn) {
            window.location.href = '/login';
        } else {
            window.location.reload();
        }
    };

    return (
        <nav className="navigation">
            <div className="nav-brand">System Manajemen Aset & Jaminan</div>

            <div className="nav-menu">
                {/* Asset Menu - only if logged in to asset system */}
                {summary.assetLoggedIn && (
                    <div className="menu-section">
                        <span className="menu-title">Asset Management</span>
                        <ul>
                            <li><a href="/asset/dashboard">Dashboard</a></li>
                            <li><a href="/asset/assets">Aset</a></li>
                            <li><a href="/asset/loans">Pinjaman</a></li>
                            <li><a href="/asset/maintenance">Perawatan</a></li>
                        </ul>
                        <div className="user-info">
                            {assetUser?.name}
                            <button onClick={() => handleLogout('asset')} className="logout-btn">
                                Logout
                            </button>
                        </div>
                    </div>
                )}

                {/* Jaminan Menu - only if logged in to jaminan system */}
                {summary.jaminanLoggedIn && (
                    <div className="menu-section">
                        <span className="menu-title">Jaminan</span>
                        <ul>
                            <li><a href="/jaminan/guarantees">Jaminan</a></li>
                            <li><a href="/jaminan/guarantee-loans">Pinjaman Jaminan</a></li>
                            <li><a href="/jaminan/settlements">Pelunasan</a></li>
                            {jaminanUser?.role === 'super-admin' && (
                                <li><a href="/jaminan/users">Manajemen User</a></li>
                            )}
                        </ul>
                        <div className="user-info">
                            {jaminanUser?.name}
                            <button onClick={() => handleLogout('jaminan')} className="logout-btn">
                                Logout
                            </button>
                        </div>
                    </div>
                )}

                {/* Login Prompt - if not logged in to either system */}
                {!summary.assetLoggedIn && !summary.jaminanLoggedIn && (
                    <div className="login-prompt">
                        <a href="/login">Login Required</a>
                    </div>
                )}
            </div>

            {/* Login Links - show if not logged in to that system */}
            <div className="nav-links">
                {!summary.assetLoggedIn && (
                    <a href="/login?system=asset" className="login-link">
                        Login Asset
                    </a>
                )}
                {!summary.jaminanLoggedIn && (
                    <a href="/login?system=jaminan" className="login-link">
                        Login Jaminan
                    </a>
                )}
            </div>
        </nav>
    );
};
```

#### 3.5 Protected Route Wrapper

**File:** `frontend/components/ProtectedRoute.tsx`

```jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { tokenManager } from '../services/tokenManager';

interface ProtectedRouteProps {
    system: 'asset' | 'jaminan';
    children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    system,
    children,
}) => {
    const hasToken = system === 'asset'
        ? tokenManager.hasAssetToken()
        : tokenManager.hasJaminanToken();

    if (!hasToken) {
        return <Navigate to={`/login?system=${system}`} replace />;
    }

    return <>{children}</>;
};

// Usage dalam router:
/*
<Routes>
    <Route
        path="/asset/*"
        element={
            <ProtectedRoute system="asset">
                <AssetLayout />
            </ProtectedRoute>
        }
    />
    <Route
        path="/jaminan/*"
        element={
            <ProtectedRoute system="jaminan">
                <JaminanLayout />
            </ProtectedRoute>
        }
    />
</Routes>
*/
```

### Phase 4: Routes Configuration (1 Hour)

**File:** `routes/api.php` (No major changes, just ensure proper organization)

```php
<?php

use App\Http\Controllers\Api\AuthSSOController;
use App\Http\Controllers\Api_jaminan\JaminanAuthController;
use App\Http\Controllers\Api_jaminan\GuaranteeController;

// ===== ASSET MANAGEMENT ROUTES =====
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthSSOController::class, 'login']);
    Route::post('/logout', [AuthSSOController::class, 'logout'])->middleware('auth:sanctum');
    Route::get('/user', [AuthSSOController::class, 'user'])->middleware('auth:sanctum');
    Route::get('/verify-token', [AuthSSOController::class, 'verifyToken'])->middleware('auth:sanctum');
});

Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('assets', AssetController::class);
    Route::apiResource('asset-loans', AssetLoanController::class);
    // ... other asset routes
});

// ===== JAMINAN ROUTES (Terpisah) =====
Route::prefix('jaminan')->group(function () {
    Route::prefix('auth')->group(function () {
        Route::post('/login', [JaminanAuthController::class, 'login']);
    });

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/auth/logout', [JaminanAuthController::class, 'logout']);
        Route::get('/auth/user', [JaminanAuthController::class, 'user']);
        Route::get('/auth/verify-token', [JaminanAuthController::class, 'verifyToken']);

        // Guarantee management
        Route::get('/guarantees', [GuaranteeController::class, 'index']);
        Route::get('/guarantees/{id}', [GuaranteeController::class, 'show']);
        Route::post('/guarantees', [GuaranteeController::class, 'store'])
            ->middleware('jaminan_write');
        Route::put('/guarantees/{id}', [GuaranteeController::class, 'update'])
            ->middleware('jaminan_write');
        Route::delete('/guarantees/{id}', [GuaranteeController::class, 'destroy'])
            ->middleware('jaminan_write');

        // ... other jaminan routes
    });
});
```

---

## 🧪 TESTING PLAN

### Test Case 1: Dual Login
```bash
# Test 1: Login Asset System
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@asset.com","password":"password"}'
# Response: token_A

# Test 2: Login Jaminan System
curl -X POST http://localhost/api/jaminan/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@jaminan.com","password":"password"}'
# Response: token_B

# Test 3: Use asset token on jaminan endpoint
curl -X GET http://localhost/api/jaminan/guarantees \
  -H "Authorization: Bearer token_A"
# Expected: 401 Unauthorized (different token)

# Test 4: Use jaminan token on asset endpoint
curl -X GET http://localhost/api/assets \
  -H "Authorization: Bearer token_B"
# Expected: 401 Unauthorized (different token)
```

### Test Case 2: Super-Admin Access
```bash
# Login as super-admin (asset system)
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@company.com","password":"password"}'
# Get token_asset

# Login as super-admin (jaminan system)
curl -X POST http://localhost/api/jaminan/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@company.com","password":"password"}'
# Get token_jaminan

# Note: Different tokens, different databases
# But same email allowed (not integrated)
```

### Test Case 3: Admin-Holding Restrictions
```bash
# Login as admin-holding to jaminan
curl -X POST http://localhost/api/jaminan/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"adminholding@company.com","password":"password"}'
# Get token

# Try to create guarantee (should fail)
curl -X POST http://localhost/api/jaminan/guarantees \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{...guarantee data...}'
# Expected: 403 Permission Denied

# Try to view guarantee (should work)
curl -X GET http://localhost/api/jaminan/guarantees \
  -H "Authorization: Bearer {token}"
# Expected: 200 OK
```

### Test Case 4: Frontend Token Management
```javascript
// Test localStorage
localStorage.setItem('auth_token_asset', 'token_A');
localStorage.setItem('auth_token_jaminan', 'token_B');

tokenManager.hasAssetToken(); // true
tokenManager.hasJaminanToken(); // true
tokenManager.getAssetToken(); // 'token_A'
tokenManager.getJaminanToken(); // 'token_B'

// Logout from asset only
tokenManager.clearAssetToken();
tokenManager.hasAssetToken(); // false
tokenManager.hasJaminanToken(); // true (still logged in)
```

---

## 📊 IMPLEMENTATION SUMMARY

| Phase | Duration | Changes | Risk |
|-------|----------|---------|------|
| Role Alignment | 1 hour | Rename roles (data update only) | LOW |
| Controllers | 1 hour | Add permission checks | LOW |
| Frontend Setup | 3 hours | Token management, login, nav | MEDIUM |
| Routes | 1 hour | Organize routes (minimal changes) | LOW |
| Testing | 1-2 hours | Functional & regression testing | LOW |
| **Total** | **6-7 hours** | | |

### Key Differences from Current State

| Aspect | Current | Opsi 3 |
|--------|---------|--------|
| User Tables | 2 separate | 2 separate (same) |
| Tokens | Need separate | Manage in frontend |
| Login | 2 systems separate | 2 logins, 1 app |
| Navigation | N/A | Show/hide based on token |
| Roles | Different naming | Standardized names |
| API | 2 separate | 2 separate (same) |

---

## 📋 CHECKLIST IMPLEMENTASI

### Phase 1: Preparation
- [ ] Backup databases
- [ ] Create migration untuk standardize role names
- [ ] Run migration

### Phase 2: Backend Code
- [ ] Update User model dengan new role checks
- [ ] Update JaminanUser model dengan permission checks
- [ ] Update GuaranteeController dengan admin-holding restrictions
- [ ] Verify auth controllers return system identifier
- [ ] Update routes structure (organize better)

### Phase 3: Frontend
- [ ] Create TokenManager utility
- [ ] Setup API client dengan interceptors
- [ ] Create Login page dengan dual tabs
- [ ] Create Navigation component
- [ ] Create ProtectedRoute wrapper
- [ ] Update router configuration

### Phase 4: Testing
- [ ] Test dual login flow
- [ ] Test token isolation
- [ ] Test admin-holding restrictions
- [ ] Test super-admin access (both systems)
- [ ] Test navigation menu show/hide
- [ ] Browser localStorage testing
- [ ] Regression testing (existing asset features)

### Phase 5: Deployment
- [ ] Create deployment checklist
- [ ] Update documentation
- [ ] Communicate changes to users
- [ ] Deploy to production
- [ ] Monitor error logs
- [ ] Provide user training

---

## ✅ ADVANTAGES OF OPSI 3

| Advantage | Benefit |
|-----------|---------|
| No Database Migration | Zero risk of data loss |
| Quick Implementation | Can launch in 1 day |
| Low Complexity | Straightforward code changes |
| Easy Rollback | Just revert code changes |
| Independent Systems | Can develop separately |
| Familiar Pattern | Similar to current setup |
| No Data Cleanup | No need to merge/handle conflicts |

---

## ⚠️ LIMITATIONS OF OPSI 3

| Limitation | Workaround |
|------------|-----------|
| Multiple Logins | Use SSO if available |
| Two Tokens | Frontend manages both |
| Separate DBs | Use federation/replication if needed |
| Not True Integration | Frontend creates illusion of integration |

---

**Status**: Ready for Implementation
**Recommendation**: Start here if you want quick deployment
**Next Step**: Choose this if frontend-level integration is acceptable

**Last Updated**: 28 November 2024

