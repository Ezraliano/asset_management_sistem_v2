# IMPLEMENTATION PLAN - Role-Based Access Control & Dashboard Improvements

## Overview
Implement role-based access control restrictions and dashboard improvements for `user` and `admin` roles to meet business requirements.

---

## REQUIREMENT SUMMARY

### Role: USER
1. **Access Control**: Can ONLY access Asset Management system (NOT Jaminan/Guarantee)
2. **Dashboard**: Simple welcome message without charts
3. **Operations**: Can only borrow and return assets from their assigned unit

### Role: ADMIN
1. **Access Control**: Can ONLY access Asset Management system (NOT Jaminan/Guarantee)
2. **Dashboard**: See only data from their assigned unit
3. **Operations**: Can:
   - Input assets (in their unit)
   - Edit/repair assets (in their unit)
   - Perform maintenance (in their unit)
   - Report damage (in their unit)
   - Report loss (in their unit)
   - Validate asset loans (in their unit)

---

## IMPLEMENTATION TASKS

### PHASE 1: Frontend Route & Navigation Control

#### Task 1.1: Restrict USER role from accessing Asset Management features
**File**: `frontend/components/Header.tsx` (line 97-123)
**Changes**:
- Modify Restricted components to show only DASHBOARD and ASSET_LENDING for user role
- Remove: ASSET_LIST, BULK_TRANSACTION, QR_SCANNER (shown only for super-admin, admin, unit)
- Remove: INVENTORY_AUDIT, REPORTS (shown only for super-admin, admin, auditor)
- Keep: DASHBOARD, ASSET_LENDING for users

**Current**:
```tsx
<Restricted user={user} allowedRoles={['super-admin', 'admin', 'unit']}>
```

**Updated**:
```tsx
<Restricted user={user} allowedRoles={['super-admin', 'admin', 'unit']}>
  {/* Assets menu - EXCLUDE user */}
</Restricted>

<Restricted user={user} allowedRoles={['user', 'super-admin', 'admin', 'unit']}>
  {/* Lending menu - INCLUDE user */}
</Restricted>
```

#### Task 1.2: Completely hide Jaminan tab for USER and ADMIN roles
**File**: `frontend/components/Header.tsx` (line 63-89)
**Changes**:
- Modify condition to exclude 'user' and 'admin' roles
- Current condition: `user.role !== 'admin-kredit' && user.role !== 'auditor'`
- Updated condition: `!['user', 'admin', 'admin-kredit', 'auditor'].includes(user.role)`

**Result**: Only super-admin and unit roles can see Asset/Jaminan switch button

#### Task 1.3: Prevent navigation to Jaminan app mode for restricted roles
**File**: `frontend/App.tsx` (line 84-90)
**Changes**:
- When user logs in, check if they can access Jaminan
- If role is 'user' or 'admin', force appMode to 'asset' only

```typescript
const handleLoginSuccess = (loggedInUser: User) => {
  setUser(loggedInUser);

  if (loggedInUser.role === 'admin-kredit') {
    setAppMode('guarantee');
    setView({ type: 'GUARANTEE_DASHBOARD' });
  } else if (loggedInUser.role === 'user' || loggedInUser.role === 'admin') {
    // Force asset mode only for user and admin
    setAppMode('asset');
    setView({ type: 'DASHBOARD' });
  } else {
    setView({ type: 'DASHBOARD' });
  }
};
```

#### Task 1.4: Add guard in Header to prevent mode switching for restricted roles
**File**: `frontend/components/Header.tsx` (line 64)
**Changes**:
- Update condition to prevent 'user' and 'admin' from switching mode
- Current: `user.role !== 'admin-kredit' && user.role !== 'auditor'`
- Updated: `!['user', 'admin', 'admin-kredit', 'auditor'].includes(user.role)`

---

### PHASE 2: Dashboard Customization

#### Task 2.1: Create simplified dashboard for USER role
**File**: `frontend/components/Dashboard.tsx`
**Changes**:
- Add role check at component level
- If user role is 'user', render only simple welcome message
- Keep charts/stats for super-admin, admin, unit, auditor roles

```typescript
if (currentUser?.role === 'user') {
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold text-dark-text">
        Selamat Datang di Aset Management Sistem
      </h1>
      <p className="text-lg text-gray-600">
        Anda dapat meminjam dan mengembalikan aset dari unit Anda
      </p>
    </div>
  );
}
```

#### Task 2.2: Apply unit filter to ADMIN dashboard
**File**: `frontend/components/Dashboard.tsx` (line 81-82)
**Changes**:
- Admin role should ONLY see their unit's data
- Similar to how 'unit' role currently works
- Current logic: `const canFilterByUnit = currentUser && ['super-admin', 'admin'].includes(currentUser.role);`
- Updated logic:
  - ADMIN: Force unit filter to their assigned unit, hide dropdown
  - SUPER-ADMIN: Can filter across all units with dropdown
  - UNIT: Force unit filter, already working correctly

```typescript
const canFilterByUnit = currentUser && currentUser.role === 'super-admin';

// For admin and unit roles, force their unit
useEffect(() => {
  if (currentUser?.role === 'admin' && currentUser?.unit_name) {
    setSelectedUnitName(currentUser.unit_name);
  } else if (currentUser?.role === 'unit' && currentUser?.unit_name) {
    setSelectedUnitName(currentUser.unit_name);
  }
}, [currentUser]);
```

---

### PHASE 3: Backend API Authorization

#### Task 3.1: Add explicit authorization check in AssetController
**File**: `app/Http/Controllers/Api/AssetController.php`
**Changes**:
- In `index()` method: Ensure ADMIN role can only see assets from their unit
- Current logic: Super-admin/admin can see all (or filtered if provided)
- Updated logic: Admin role should be treated like 'unit' role (force their unit filter)

**Pattern**:
```php
if ($user->role === 'admin' && $user->unit_name) {
    $query->where('unit_name', $user->unit_name);
} elseif ($user->role === 'unit' && $user->unit_name) {
    $query->where('unit_name', $user->unit_name);
}
```

#### Task 3.2: Verify AssetLoanController enforces unit validation for ADMIN
**File**: `app/Http/Controllers/Api/AssetLoanController.php`
**Changes**:
- Ensure ADMIN role respects unit_name filter when viewing loans
- Current logic: Admin can see all loans (no unit filter)
- Updated logic: Admin should only see loans for their unit's assets (like 'unit' role)

**Pattern**:
```php
if ($user->role === 'admin' && $user->unit_name) {
    $loans->where(function ($query) use ($user) {
        $query->whereHas('asset', function($q) use ($user) {
            $q->where('unit_name', $user->unit_name);
        })->orWhere('borrower_id', $user->id);
    });
}
```

#### Task 3.3: Verify DashboardController enforces unit validation for ADMIN
**File**: `app/Http/Controllers/Api/DashboardController.php`
**Changes**:
- Ensure ADMIN role only sees stats for their unit
- Current logic: Line 25-29 only checks 'unit' role
- Updated logic: Also check 'admin' role and force unit filter

```php
if (($user->role === 'unit' || $user->role === 'admin') && $user->unit_name) {
    $unitName = $user->unit_name;
} elseif ($user->role === 'super-admin' && $requestedUnitId && $requestedUnitId !== 'all') {
    $unitName = $requestedUnitId;
}
```

#### Task 3.4: Ensure MaintenanceController enforces unit for ADMIN
**File**: `app/Http/Controllers/Api/MaintenanceController.php`
**Changes**:
- Add role check to enforce unit_name validation
- ADMIN can only create maintenance for assets in their unit
- Pattern: Similar to AssetController

#### Task 3.5: Ensure IncidentReportController enforces unit for ADMIN
**File**: `app/Http/Controllers/Api/IncidentReportController.php`
**Changes**:
- Add role check to enforce unit_name validation
- ADMIN can only report incidents for assets in their unit

#### Task 3.6: Add USER role authorization validation
**File**: All controllers accessed by users
**Changes**:
- Add check to reject 'user' role from accessing restricted endpoints:
  - POST /assets (create)
  - PUT /assets/{id} (update)
  - DELETE /assets/{id} (delete)
  - POST /maintenances (create)
  - POST /incident-reports (create)
  - PUT /asset-loans/{id}/approve (approve)
- USER can only:
  - GET /assets (view their unit's assets)
  - POST /asset-loans (request)
  - POST /asset-loans/{id}/return (return their own loans)

**Pattern**:
```php
if ($user->role === 'user') {
    return response()->json(['error' => 'Unauthorized'], 403);
}
```

---

### PHASE 4: Role-Based Middleware Enhancements

#### Task 4.1: Create or update RoleMiddleware for finer control
**File**: `app/Http/Middleware/RoleMiddleware.php`
**Changes**:
- Add exception handling for routes that should be completely denied to 'user'/'admin'
- Consider adding separate middleware for admin-only operations vs user-allowed operations

#### Task 4.2: Add route-level middleware for Jaminan endpoints
**File**: `routes/api.php`
**Changes**:
- Ensure all Jaminan routes reject 'user' and 'admin' roles
- Current: Some routes may have `role:admin` which would match both 'admin' (asset) and 'admin-kredit'
- Issue: Line with hardcoded role names (e.g., `'role:Super Admin,Admin Holding'`)

---

### PHASE 5: Data Validation & Constraints

#### Task 5.1: Add validation for cross-unit operations
**File**: Various controllers
**Changes**:
- AssetLoanController: When ADMIN approves a loan, verify the asset is in their unit
- MaintenanceController: When ADMIN reports maintenance, verify asset is in their unit
- IncidentReportController: When ADMIN reports incident, verify asset is in their unit

**Validation Pattern**:
```php
$asset = Asset::findOrFail($assetId);
if ($user->role === 'admin' && $asset->unit_name !== $user->unit_name) {
    return response()->json(['error' => 'Cannot manage assets outside your unit'], 403);
}
```

#### Task 5.2: Prevent USER from viewing other units' assets
**File**: `app/Http/Controllers/Api/AssetController.php`
**Changes**:
- Add role-based filtering in the `show()` method
- USER can only view assets from their unit

---

## IMPLEMENTATION PRIORITY

1. **HIGH**: Phase 1 (Frontend Navigation) - Prevents USER/ADMIN from even accessing restricted UI
2. **HIGH**: Phase 2.2 (Admin Dashboard Unit Filter) - Critical business requirement
3. **HIGH**: Phase 3.2 & 3.3 (Backend Loan & Dashboard Unit Validation) - Critical
4. **MEDIUM**: Phase 2.1 (User Dashboard Simplification) - UX improvement
5. **MEDIUM**: Phase 3.1, 3.4, 3.5 (Asset/Maintenance/Incident Unit Validation)
6. **MEDIUM**: Phase 3.6 (User authorization in specific endpoints)
7. **LOW**: Phase 4 (Middleware improvements) - Refinement
8. **LOW**: Phase 5 (Additional validations) - Security hardening

---

## TESTING CHECKLIST

### USER Role Tests
- [ ] User sees only DASHBOARD and ASSET_LENDING in navigation
- [ ] User sees simple welcome message on dashboard (no charts)
- [ ] User cannot navigate to Asset List, Reports, Inventory Audit
- [ ] User cannot switch to Jaminan mode
- [ ] User can see only assets from their unit
- [ ] User can borrow assets from their unit
- [ ] User can return their own loans
- [ ] User cannot create/edit/delete assets
- [ ] User cannot approve loans
- [ ] User cannot access maintenance or incident report features

### ADMIN Role Tests
- [ ] Admin sees navigation without Jaminan tab
- [ ] Admin cannot switch to Jaminan mode
- [ ] Admin dashboard shows only their unit's data
- [ ] Admin cannot filter dashboard by other units
- [ ] Admin can create/edit assets in their unit
- [ ] Admin cannot create/edit assets in other units
- [ ] Admin can validate loans for their unit's assets
- [ ] Admin cannot validate loans for other units' assets
- [ ] Admin can report maintenance for their unit
- [ ] Admin can report incidents for their unit
- [ ] Admin sees only their unit's data in all views

### SUPER-ADMIN Role Tests
- [ ] Super-admin still has full access to all features
- [ ] Super-admin can switch between Asset and Jaminan modes
- [ ] Super-admin can filter dashboard by all units
- [ ] Super-admin can access all administrative functions

---

## ROLLBACK PLAN

If issues arise, revert changes in this order:
1. Revert Phase 1 changes (Frontend navigation)
2. Revert Phase 2 changes (Dashboard)
3. Revert Phase 3 changes (Backend API)
4. Revert Phase 4 changes (Middleware)
5. Revert Phase 5 changes (Validation)

---

## NOTES

- All changes preserve backward compatibility with existing super-admin functionality
- Unit filtering relies on `user.unit_name` field being properly set
- Tests should be run with various unit assignments to ensure proper filtering
- Consider adding audit logs for ADMIN operations (create/edit/delete)
