# Settlement Validation Fix - November 20, 2025

## Problem
Ketika user melakukan validasi pelunasan jaminan, terjadi error:
```
Uncaught TypeError: Cannot read properties of undefined (reading 'spk_number')
    at SettlementValidation (SettlementValidation.tsx:220:72)
```

## Root Cause
Komponen `SettlementValidation` memerlukan prop `guarantee` untuk menampilkan data jaminan (SPK, CIF, nama jaminan, dll), namun prop tersebut tidak dikirimkan dari parent component `GuaranteeDetail`.

## Solution

### 1. File: `frontend/components/GuaranteeDetail.tsx`

#### Change 1: Pass guarantee prop to SettlementValidation
**Line 704-707 (Before):**
```tsx
{selectedSettlementForValidation && (
  <SettlementValidation
    settlement={selectedSettlementForValidation}
    onSuccess={() => {
```

**Line 704-707 (After):**
```tsx
{selectedSettlementForValidation && guarantee && (
  <SettlementValidation
    settlement={selectedSettlementForValidation}
    guarantee={guarantee}  // ← ADDED
    onSuccess={() => {
```

#### Change 2: Simplify GuaranteeSettlement props
**Line 665-672 (Before):**
```tsx
<GuaranteeSettlement
  guarantee={guarantee}
  loanId={selectedLoanForSettlement?.id || null}
  borrowerName={selectedLoanForSettlement?.borrower_name || undefined}
  loanDate={selectedLoanForSettlement?.loan_date || undefined}
  expectedReturnDate={selectedLoanForSettlement?.expected_return_date || undefined}
  onSuccess={handleSettlementSuccess}
  onClose={closeSettlementModal}
/>
```

**Line 653-657 (After):**
```tsx
<GuaranteeSettlement
  guarantee={guarantee}
  onSuccess={handleSettlementSuccess}
  onClose={() => setSettlementModalOpen(false)}
/>
```

#### Change 3: Remove unused state and functions
- Removed state: `selectedLoanForSettlement`
- Removed function: `openSettlementModal()`
- Removed function: `closeSettlementModal()`
- Simplified: Direct state management using `setSettlementModalOpen()`

## Files Modified
1. `frontend/components/GuaranteeDetail.tsx`
   - Added `guarantee` prop to `SettlementValidation` component
   - Removed old loan-related props from `GuaranteeSettlement` component
   - Cleaned up unused state and functions

## Testing
✅ Settlement validation modal now displays guarantee information correctly
✅ No more "Cannot read properties of undefined" error
✅ Validation workflow works as expected

## Summary
Kesalahan terjadi karena komponen `SettlementValidation` tidak menerima data jaminan yang diperlukan untuk menampilkan informasi SPK, CIF, dan detail jaminan lainnya. Dengan menambahkan prop `guarantee`, komponen sekarang dapat mengakses semua data yang diperlukan dari object jaminan yang dikirimkan dari parent component.
