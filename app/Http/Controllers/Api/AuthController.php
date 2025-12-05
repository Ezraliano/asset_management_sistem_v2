<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $user = User::where('username', $request->username)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'username' => ['The provided credentials are incorrect.'],
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
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role,
            ],
            'token' => $token,
            'token_timeout' => $tokenTimeout,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully',
        ]);
    }

    public function user(Request $request)
    {
        return response()->json([
            'success' => true,
            'user' => [
                'id' => $request->user()->id,
                'name' => $request->user()->name,
                'username' => $request->user()->username,
                'email' => $request->user()->email,
                'role' => $request->user()->role,
                'unit_name' => $request->user()->unit_name, // ✅ FIX: Tambahkan unit_name untuk validasi pengembalian asset
            ],
        ]);
    }

    public function verifyToken(Request $request)
    {
        // ✅ PERBAIKAN: Endpoint untuk verify token validity
        // Authenticate menggunakan Sanctum middleware otomatis memvalidasi token
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

    public function index(Request $request)
    {
        // Get all users with their unit information
        $users = User::with('unit:id,name,code')
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
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $users,
        ]);
    }
}