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
        if (in_array($userRole, ['super admin', 'administrator'])) {
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
        // Hanya perlu validasi unit untuk Admin Unit dan User
        if (!in_array($user->role, ['Admin Unit', 'User'])) {
            return $next($request);
        }

        // Untuk Admin Unit dan User, pastikan mereka memiliki unit_id
        if (!$user->unit_id) {
            return response()->json([
                'success' => false,
                'message' => 'User is not assigned to any unit.'
            ], 403);
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
            if ($loan->asset->unit_id !== $user->unit_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to manage loans for assets from another unit.'
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

        if ($request->has('unit_id')) {
            return \App\Models\Unit::find($request->unit_id);
        }

        return null;
    }
}