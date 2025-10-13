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
     */
    public function index()
    {
        $units = Unit::withCount(['users', 'assets'])
            ->where('is_active', true)
            ->get();

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
        if ($user->role === 'Admin Unit' && $user->unit_id !== $unit->id) {
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
        if (!in_array($user->role, ['Super Admin', 'Admin Holding'])) {
            // Admin Unit can only view users from their own unit
            if ($user->role === 'Admin Unit' && $user->unit_id !== $unit->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to view users from other units'
                ], 403);
            }
        }

        $users = $unit->users()
            ->select(['id', 'name', 'username', 'email', 'role', 'unit_id'])
            ->get();

        return response()->json([
            'success' => true,
            'data' => $users
        ]);
    }
}
