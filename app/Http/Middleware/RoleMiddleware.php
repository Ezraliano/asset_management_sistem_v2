<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @param  ...$roles
     * @return mixed
     */
    public function handle(Request $request, Closure $next, ...$roles)
    {
        if (!Auth::check()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 401);
        }

        $user = Auth::user();

        // Ensure user and role exist to prevent errors
        if (!$user || !$user->role) {
            return response()->json([
                'success' => false,
                'message' => 'This action is unauthorized.'
            ], 403);
        }

        $userRole = strtolower($user->role);

        // Super Admin (or Administrator) has access to everything
        if (in_array($userRole, ['super-admin', 'administrator'])) {
            return $next($request);
        }

        // Check if user has one of the required roles
        $hasRole = false;
        foreach ($roles as $role) {
            if ($userRole === strtolower($role)) {
                $hasRole = true;
                break;
            }
        }

        if (!$hasRole) {
            return response()->json([
                'success' => false,
                'message' => 'This action is unauthorized.'
            ], 403);
        }

        // ✅ TAMBAHAN: Unit-based authorization untuk Admin Unit dan User
        return $this->checkUnitPermission($request, $next, $user);
    }

    /**
     * Check unit-based permissions for Admin Unit and User roles
     */
    private function checkUnitPermission(Request $request, Closure $next, $user)
    {
        // Hanya perlu validasi unit untuk unit admin dan user
        if (!in_array($user->role, ['unit', 'user'])) {
            return $next($request);
        }

        // ✅ PERBAIKAN: Allow read-only operations (GET) even without unit_id
        // User tanpa unit_id akan melihat empty list, bukan error 403
        if (!$user->unit_id && $request->isMethod('get')) {
            // For GET requests, let it pass - controller will handle empty results
            return $next($request);
        }

        // Untuk operasi write (POST, PUT, DELETE), pastikan mereka memiliki unit_id
        if (!$user->unit_id) {
            return response()->json([
                'success' => false,
                'message' => 'User is not assigned to any unit. Please contact administrator to assign you to a unit.'
            ], 403);
        }

        // ✅ EXCEPTION: Skip unit validation for asset-requests (they need to access assets from other units)
        if ($request->is('api/asset-requests') || $request->is('api/asset-requests/*')) {
            // Asset request feature specifically allows cross-unit asset access
            return $next($request);
        }

        // ✅ EXCEPTION: Skip unit validation for asset-movements (perpindahan asset antar unit)
        // Validasi untuk asset movements akan dilakukan di controller level
        if ($request->is('api/asset-movements/*') ||
            $request->is('api/asset-movements-pending') ||
            $request->is('api/asset-movements/request-transfer')) {
            // Let controller handle the authorization for cross-unit asset transfers
            return $next($request);
        }

        // ✅ EXCEPTION: Skip unit validation for return approval/rejection routes
        // Validasi untuk return approval akan dilakukan di controller level
        if ($request->is('api/asset-loans/*/approve-return') || $request->is('api/asset-loans/*/reject-return')) {
            // Let controller handle the authorization for cross-unit loan returns
            return $next($request);
        }

        // ✅ Validasi untuk routes yang berhubungan dengan assets
        $asset = $this->getAssetFromRequest($request);
        if ($asset) {
            if ($asset->unit_id !== $user->unit_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to access this asset from another unit.'
                ], 403);
            }
        }

        // ✅ Validasi untuk routes yang berhubungan dengan asset loans
        $loan = $this->getLoanFromRequest($request);
        if ($loan) {
            // Skip validation untuk approve/reject loan - akan dihandle di controller
            if (!$request->is('api/asset-loans/*/approve') && !$request->is('api/asset-loans/*/reject')) {
                if ($loan->asset->unit_id !== $user->unit_id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Unauthorized to manage loans for assets from another unit.'
                    ], 403);
                }
            }
        }

        // ✅ Validasi untuk routes yang berhubungan dengan asset sales
        $sale = $this->getSaleFromRequest($request);
        if ($sale) {
            if ($sale->asset->unit_id !== $user->unit_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to access sales for assets from another unit.'
                ], 403);
            }
        }

        // ✅ Validasi untuk routes yang berhubungan dengan units
        $unit = $this->getUnitFromRequest($request);
        if ($unit) {
            if ($unit->id !== $user->unit_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to access this unit.'
                ], 403);
            }
        }

        return $next($request);
    }

    /**
     * Extract asset from request parameters
     */
    private function getAssetFromRequest(Request $request)
    {
        // Cek dari route parameters
        if ($request->route('asset') || $request->route('id')) {
            $assetId = $request->route('asset') ?? $request->route('id');
            return \App\Models\Asset::find($assetId);
        }

        // Cek dari request body
        if ($request->has('asset_id')) {
            return \App\Models\Asset::find($request->asset_id);
        }

        return null;
    }

    /**
     * Extract asset loan from request parameters
     */
    private function getLoanFromRequest(Request $request)
    {
        if ($request->route('assetLoan')) {
            return $request->route('assetLoan');
        }

        if ($request->route('loan')) {
            return $request->route('loan');
        }

        if ($request->has('loan_id')) {
            return \App\Models\AssetLoan::find($request->loan_id);
        }

        return null;
    }

    /**
     * Extract asset sale from request parameters
     */
    private function getSaleFromRequest(Request $request)
    {
        // Only check for asset-sales routes
        if ($request->is('*/asset-sales/*')) {
            $saleId = $request->route('id');
            if ($saleId) {
                return \App\Models\AssetSale::with('asset')->find($saleId);
            }
        }

        return null;
    }

    /**
     * Extract unit from request parameters
     */
    private function getUnitFromRequest(Request $request)
    {
        if ($request->route('unit')) {
            return $request->route('unit');
        }

        if ($request->route('id') && $request->is('*/units/*')) {
            return \App\Models\Unit::find($request->route('id'));
        }

        // ✅ PERBAIKAN: Skip unit_id validation untuk POST /assets
        // Controller akan handle unit_id assignment untuk Admin Unit
        if ($request->is('api/assets') && $request->isMethod('post')) {
            return null; // Let controller handle it
        }

        if ($request->has('unit_id')) {
            return \App\Models\Unit::find($request->unit_id);
        }

        return null;
    }
}