<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Unit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class UnitController extends Controller
{
    /**
     * Display a listing of units.
     *
     * Rules:
     * - Super Admin & Admin Holding: See all units
     * - Admin Unit: Only see their own unit
     * - User: Only see their own unit
     */
    public function index()
    {
        $user = Auth::user();
        $query = Unit::withCount(['users', 'assets'])
            ->where('is_active', true);

        // ✅ Filter based on user role
        if (in_array($user->role, ['unit', 'user'])) {
            // Admin Unit & User hanya bisa lihat unit mereka sendiri
            if ($user->unit_name) {
                $query->where('name', $user->unit_name);
            } else {
                // User tanpa unit_name akan melihat empty list
                $query->whereRaw('1 = 0'); // Force empty result
            }
        }
        // Super Admin & Admin Holding bisa lihat semua unit (no filter)

        $units = $query->get();

        return response()->json([
            'success' => true,
            'data' => $units
        ]);
    }

    /**
     * Display the specified unit.
     */
    public function show(Unit $unit)
    {
        $unit->loadCount(['users', 'assets']);

        return response()->json([
            'success' => true,
            'data' => $unit
        ]);
    }

    /**
     * Get all assets belonging to a specific unit.
     */
    public function assets(Unit $unit)
    {
        $user = Auth::user();

        // Check if user can view this unit's assets
        if ($user->role === 'unit' && $user->unit_name !== $unit->name) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized to view assets from other units'
            ], 403);
        }

        $assets = $unit->assets()
            ->with(['unit'])
            ->get();

        return response()->json([
            'success' => true,
            'data' => $assets
        ]);
    }

    /**
     * Get all users belonging to a specific unit.
     */
    public function users(Unit $unit)
    {
        $user = Auth::user();

        // Only Super Admin and Admin Holding can view users from all units
        if (!in_array($user->role, ['super-admin', 'admin'])) {
            // Admin Unit can only view users from their own unit
            if ($user->role === 'unit' && $user->unit_name !== $unit->name) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to view users from other units'
                ], 403);
            }
        }

        $users = $unit->users()
            ->select(['id', 'name', 'username', 'email', 'role', 'unit_name'])
            ->get();

        return response()->json([
            'success' => true,
            'data' => $users
        ]);
    }
}
