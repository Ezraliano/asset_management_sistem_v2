<?php

namespace App\Http\Controllers\Api_jaminan;

use App\Http\Controllers\Controller;
use App\Models_jaminan\JaminanUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class JaminanAuthController extends Controller
{
    /**
     * Login dengan email dan password
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = JaminanUser::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $token = $user->createToken('api-token')->plainTextToken;

        // Token timeout: 60 minutes (3600 seconds)
        $tokenTimeout = 60 * 60;

        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
            'token' => $token,
            'token_timeout' => $tokenTimeout,
        ]);
    }

    /**
     * Logout user
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully',
        ]);
    }

    /**
     * Get current user info
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function user(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
            'permissions' => $user->getPermissionsSummary(),
        ]);
    }

    /**
     * Verify token validity
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function verifyToken(Request $request)
    {
        if (!$request->user()) {
            return response()->json([
                'success' => false,
                'valid' => false,
                'message' => 'Token is invalid or expired',
            ], 401);
        }

        return response()->json([
            'success' => true,
            'valid' => true,
            'message' => 'Token is valid',
            'user_id' => $request->user()->id,
        ]);
    }

    /**
     * Get all users (untuk admin management)
     * Accessible by all authenticated users
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        $users = JaminanUser::all()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
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
     * Create new user (untuk admin management)
     * Accessible by all authenticated users
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:mysql_jaminan.jaminan_users',
            'password' => 'required|string|min:8',
            'role' => 'required|in:admin-kredit,admin-holding,super-admin',
            'unit_name' => 'nullable|string|max:255',
        ]);

        // ✅ Validasi: Jika role adalah admin-kredit, unit_name harus ada
        if ($request->role === 'admin-kredit' && !$request->unit_name) {
            return response()->json([
                'success' => false,
                'message' => 'Admin kredit harus memiliki unit yang ditentukan',
            ], 422);
        }

        $user = JaminanUser::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role,
            'unit_name' => $request->unit_name,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'User created successfully',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'unit_name' => $user->unit_name,
            ],
        ], 201);
    }

    /**
     * Update user (untuk admin management)
     * Accessible by all authenticated users
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id)
    {
        $user = JaminanUser::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:mysql_jaminan.jaminan_users,email,' . $id,
            'password' => 'sometimes|string|min:8',
            'role' => 'sometimes|in:admin-kredit,admin-holding,super-admin',
            'unit_name' => 'sometimes|nullable|string|max:255',
        ]);

        // ✅ Validasi: Jika role diubah menjadi admin-kredit, unit_name harus ada
        $newRole = $request->role ?? $user->role;
        $newUnitName = $request->unit_name ?? $user->unit_name;

        if ($newRole === 'admin-kredit' && !$newUnitName) {
            return response()->json([
                'success' => false,
                'message' => 'Admin kredit harus memiliki unit yang ditentukan',
            ], 422);
        }

        if ($request->has('name')) {
            $user->name = $request->name;
        }

        if ($request->has('email')) {
            $user->email = $request->email;
        }

        if ($request->has('password')) {
            $user->password = Hash::make($request->password);
        }

        if ($request->has('role')) {
            $user->role = $request->role;
        }

        if ($request->has('unit_name')) {
            $user->unit_name = $request->unit_name;
        }

        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'User updated successfully',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'unit_name' => $user->unit_name,
            ],
        ]);
    }

    /**
     * Delete user (untuk admin management)
     * Accessible by all authenticated users
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy(Request $request, $id)
    {
        $userToDelete = JaminanUser::findOrFail($id);
        $userToDelete->delete();

        return response()->json([
            'success' => true,
            'message' => 'User deleted successfully',
        ]);
    }
}
