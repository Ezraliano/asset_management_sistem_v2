<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Unit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    /**
     * Display a listing of users
     * Only Super Admin and Admin Holding can access
     */
    public function index(Request $request)
    {
        // Authorization check
        $currentUser = $request->user();
        if (!$currentUser->isSuperAdmin() && !$currentUser->isAdminHolding()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Only Super Admin and Admin Holding can view users.',
            ], 403);
        }

        // Get all users with their unit information
        $users = User::with('unit:id,name,code')
            ->orderBy('role', 'asc')
            ->orderBy('name', 'asc')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'username' => $user->username,
                    'email' => $user->email,
                    'role' => $user->role,
                    'unit_name' => $user->unit_name,
                    'unit' => $user->unit ? [
                        'id' => $user->unit->id,
                        'name' => $user->unit->name,
                        'code' => $user->unit->code,
                    ] : null,
                    'created_at' => $user->created_at,
                    'updated_at' => $user->updated_at,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $users,
        ]);
    }

    /**
     * Display the specified user
     */
    public function show(Request $request, $id)
    {
        // Authorization check
        $currentUser = $request->user();
        if (!$currentUser->isSuperAdmin() && !$currentUser->isAdminHolding()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Only Super Admin and Admin Holding can view user details.',
            ], 403);
        }

        $user = User::with('unit:id,name,code')->find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role,
                'unit_name' => $user->unit_name,
                'unit' => $user->unit ? [
                    'id' => $user->unit->id,
                    'name' => $user->unit->name,
                    'code' => $user->unit->code,
                ] : null,
                'created_at' => $user->created_at,
                'updated_at' => $user->updated_at,
            ],
        ]);
    }

    /**
     * Store a newly created user
     * Only Super Admin and Admin Holding can create Admin Unit or User
     */
    public function store(Request $request)
    {
        // Authorization check
        $currentUser = $request->user();
        if (!$currentUser->isSuperAdmin() && !$currentUser->isAdminHolding()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Only Super Admin and Admin Holding can create users.',
            ], 403);
        }

        // Validate request
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:users,username',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:3',
            'role' => ['required', Rule::in(['unit', 'user', 'auditor'])],
            'unit_name' => 'nullable|exists:units,id',
        ]);

        // super-admin and admin can only create unit, user, or auditor
        if (!in_array($validated['role'], ['unit', 'user', 'auditor'])) {
            return response()->json([
                'success' => false,
                'message' => 'You can only create users with role unit, user, or auditor.',
            ], 403);
        }

        // Auditor tidak memerlukan unit_name
        if ($validated['role'] === 'auditor') {
            $validated['unit_name'] = null;
        } elseif (empty($validated['unit_name'])) {
            // unit dan user harus memiliki unit_name
            return response()->json([
                'success' => false,
                'message' => 'Unit and User must be assigned to a unit.',
            ], 422);
        }

        // Create user
        $user = User::create([
            'name' => $validated['name'],
            'username' => $validated['username'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'unit_name' => $validated['unit_name'],
        ]);

        // Load unit relationship
        $user->load('unit:id,name,code');

        return response()->json([
            'success' => true,
            'message' => 'User created successfully.',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role,
                'unit_name' => $user->unit_name,
                'unit' => $user->unit ? [
                    'id' => $user->unit->id,
                    'name' => $user->unit->name,
                    'code' => $user->unit->code,
                ] : null,
            ],
        ], 201);
    }

    /**
     * Update the specified user
     * Super Admin and Admin Holding can update name and role
     * Cannot update Super Admin or Admin Holding accounts
     */
    public function update(Request $request, $id)
    {
        // Authorization check
        $currentUser = $request->user();
        if (!$currentUser->isSuperAdmin() && !$currentUser->isAdminHolding()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Only Super Admin and Admin Holding can update users.',
            ], 403);
        }

        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found.',
            ], 404);
        }

        // Cannot update Super Admin or Admin Holding accounts
        if ($user->isSuperAdmin() || $user->isAdminHolding()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot update Super Admin or Admin Holding accounts.',
            ], 403);
        }

        // Validate request
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'username' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('users', 'username')->ignore($user->id),
            ],
            'email' => [
                'sometimes',
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'role' => ['sometimes', 'required', Rule::in(['unit', 'user', 'auditor'])],
            'unit_name' => 'sometimes|nullable|exists:units,id',
            'password' => 'sometimes|nullable|string|min:3',
        ]);

        // Only allow updating to unit, user, or auditor
        if (isset($validated['role']) && !in_array($validated['role'], ['unit', 'user', 'auditor'])) {
            return response()->json([
                'success' => false,
                'message' => 'You can only set role to unit, user, or auditor.',
            ], 403);
        }

        // Jika role diubah menjadi Auditor, set unit_name menjadi null
        if (isset($validated['role']) && $validated['role'] === 'auditor') {
            $validated['unit_name'] = null;
        }

        // Update user
        if (isset($validated['name'])) {
            $user->name = $validated['name'];
        }
        if (isset($validated['username'])) {
            $user->username = $validated['username'];
        }
        if (isset($validated['email'])) {
            $user->email = $validated['email'];
        }
        if (isset($validated['role'])) {
            $user->role = $validated['role'];
        }
        if (isset($validated['unit_name'])) {
            $user->unit_name = $validated['unit_name'];
        }
        if (isset($validated['password']) && !empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }

        $user->save();

        // Load unit relationship
        $user->load('unit:id,name,code');

        return response()->json([
            'success' => true,
            'message' => 'User updated successfully.',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role,
                'unit_name' => $user->unit_name,
                'unit' => $user->unit ? [
                    'id' => $user->unit->id,
                    'name' => $user->unit->name,
                    'code' => $user->unit->code,
                ] : null,
            ],
        ]);
    }

    /**
     * Remove the specified user
     * super-admin and admin can delete unit or user
     * Cannot delete super-admin or admin accounts
     */
    public function destroy(Request $request, $id)
    {
        // Authorization check
        $currentUser = $request->user();
        if (!$currentUser->isSuperAdmin() && !$currentUser->isAdminHolding()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Only Super Admin and Admin Holding can delete users.',
            ], 403);
        }

        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found.',
            ], 404);
        }

        // Cannot delete super-admin, admin, or auditor accounts
        if ($user->isSuperAdmin() || $user->isAdminHolding() || $user->isAuditor()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete super-admin, admin, or auditor accounts.',
            ], 403);
        }

        // Cannot delete self
        if ($user->id === $currentUser->id) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot delete your own account.',
            ], 403);
        }

        // Check if user has active loans
        if ($user->hasActiveLoans()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete user with active asset loans. Please complete or cancel their loans first.',
            ], 403);
        }

        // Delete user
        $userName = $user->name;
        $user->delete();

        return response()->json([
            'success' => true,
            'message' => "User '{$userName}' deleted successfully.",
        ]);
    }

    /**
     * Get available units for user assignment
     */
    public function getAvailableUnits(Request $request)
    {
        // Authorization check
        $currentUser = $request->user();
        if (!$currentUser->isSuperAdmin() && !$currentUser->isAdminHolding()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Only Super Admin and Admin Holding can view units.',
            ], 403);
        }

        $units = Unit::where('is_active', true)
            ->orderBy('name', 'asc')
            ->get(['id', 'name', 'code', 'description']);

        return response()->json([
            'success' => true,
            'data' => $units,
        ]);
    }
}
