<?php
// CLIENT
// Backend React menggunakan SSO server untuk autentikasi
namespace App\Http\Controllers\Api;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class AuthSSOController extends Controller
{
    /**
     * Handle login via SSO server
     */
    public function loginViaSSO(Request $request)
    {
        Log::info('SSO Login attempt', [
            'email' => $request->email,
            'app_id' => config('sso.app_id')
        ]);

        $validator = Validator::make($request->all(), [
            'email' => 'required|string',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $ssoUrl = config('sso.server_url');

        try {
            $response = Http::timeout(10)
                ->post("{$ssoUrl}/api/sso/login", [
                    'email' => $request->email,
                    'password' => $request->password,
                    'app_id' => config('sso.app_id'),
                    'redirect_uri' => url('/') // Untuk internal use
                ]);

            if (!$response->successful()) {
                return response()->json([
                    'success' => false,
                    'message' => 'SSO server error'
                ], $response->status());
            }

            $ssoData = $response->json();

            if (!($ssoData['success'] ?? false)) {
                return response()->json([
                    'success' => false,
                    'message' => $ssoData['message'] ?? 'SSO authentication failed'
                ], 401);
            }

            $ssoSessionId = $ssoData['sso_session_id'] ?? null;

            if (!$ssoSessionId) {
                return response()->json([
                    'success' => false,
                    'message' => 'No SSO session ID received'
                ], 401);
            }

            // STEP 2 — Ambil USER INFO dari SSO (role, name, username, dsb)
            $infoResponse = Http::timeout(10)->post("{$ssoUrl}/api/sso/user-by-session", [
                'sso_session_id' => $ssoSessionId,
                'app_id' => config('sso.app_id')
            ]);

            if (!$infoResponse->successful()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to fetch user info from SSO'
                ], 500);
            }

            $infoData = $infoResponse->json();

            if (!($infoData['success'] ?? false)) {
                return response()->json([
                    'success' => false,
                    'message' => 'SSO user info retrieval failed'
                ], 500);
            }

            $userInfo = $infoData['data'];

            // STEP 3 — Sinkron ke user lokal lengkap dengan role
            $localUser = User::updateOrCreate(
                ['email' => $userInfo['email']],
                [
                    'name' => $userInfo['name'],
                    'username' => $userInfo['username'] ?? $userInfo['email'],
                    'role' => $userInfo['role']['slug'] ?? 'user',
                    'password' => bcrypt('sso-' . $userInfo['email']),
                ]
            );

            // STEP 4 — Generate token lokal
            $token = $localUser->createToken('api-token')->plainTextToken;

            return response()->json([
                'success' => true,
                'user' => [
                    'id' => $localUser->id,
                    'name' => $localUser->name,
                    'username' => $localUser->username,
                    'email' => $localUser->email,
                    'role' => $localUser->role,
                ],
                'token' => $token,
                'sso_session_id' => $ssoSessionId,
            ]);
        } catch (\Exception $e) {
            Log::error('SSO login error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'SSO service unavailable'
            ], 503);
        }
    }


    /**
     * Create or update local user berdasarkan email dari SSO
     */
    private function createOrUpdateLocalUser($email, $ssoSessionId): ?User
    {
        try {
            Log::info('Creating/updating local user from SSO', [
                'email' => $email,
                'session_id' => $ssoSessionId
            ]);

            // Cari user berdasarkan email
            $user = User::where('email', $email)->first();

            if (!$user) {
                Log::info('Creating new user from SSO', [
                    'email' => $email
                ]);

                // Buat user baru
                $user = new User();
                $user->email = $email;
                $user->username = $email; // Default username = email
                $user->name = $this->extractNameFromEmail($email);
                $user->password = bcrypt('sso-' . $email); // Random password
                $user->role = 'user'; // Default role
            } else {
                Log::info('Updating existing user from SSO', [
                    'user_id' => $user->id,
                    'email' => $user->email
                ]);
            }

            // Coba dapatkan role dari SSO session jika memungkinkan
            // Untuk sekarang kita gunakan default role
            // Di masa depan bisa enhance dengan mendapatkan role dari SSO

            $user->save();

            Log::info('User sync completed', [
                'user_id' => $user->id,
                'email' => $user->email
            ]);

            return $user;
        } catch (\Exception $e) {
            Log::error('Create/update local user error: ' . $e->getMessage(), [
                'exception' => $e
            ]);
            return null;
        }
    }

    /**
     * Extract name dari email
     */
    private function extractNameFromEmail($email): string
    {
        $emailPrefix = explode('@', $email)[0];
        $clean = preg_replace('/[^a-zA-Z._ ]/', '', $emailPrefix);
        $name = ucwords(str_replace(['.', '_'], ' ', $clean));

        if (empty(trim($name))) {
            $name = 'User ' . rand(1000, 9999);
        }

        return $name;
    }

    /**
     * Alternative approach: Gunakan OAuth flow dengan authorization code
     * Jika ingin mendapatkan user info lengkap dari SSO
     */
    public function loginViaSSOWithCode(Request $request)
    {
        // Ini adalah alternatif jika ingin menggunakan OAuth flow
        // Tapi untuk sekarang kita gunakan approach sederhana dulu
    }

    /**
     * Login lokal (tetap dipertahankan sebagai fallback)
     */
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

        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role,
                'unit_id' => $user->unit_id,
            ],
            'token' => $token,
        ]);
    }

    /**
     * Check auth status (untuk React)
     */
    public function checkAuth(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'authenticated' => false
            ]);
        }

        return response()->json([
            'success' => true,
            'authenticated' => true,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role,
                'unit_id' => $user->unit_id,
            ]
        ]);
    }

    /**
     * Logout dari SSO
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        
        $ssoSessionId = $request->input('sso_session_id');
        $logoutAll = $request->input('logout_all', false);

        // Logout dari SSO server jika ada session
        if ($ssoSessionId) {
            $this->logoutFromSSO($ssoSessionId, $logoutAll);
        }

        // Logout lokal
        if ($request->user()) {
            $request->user()->currentAccessToken()->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully',
        ]);
    }

    /**
     * Helper: Logout dari SSO server
     */
    private function logoutFromSSO($ssoSessionId, $logoutAll = false)
    {
        try {
            $ssoUrl = config('sso.server_url');

            $endpoint = $logoutAll ? '/api/sso/logout' : '/api/sso/logout-from-app';

            Log::info('Sending logout to SSO', [
                'session_id' => $ssoSessionId,
                'logout_all' => $logoutAll,
                'endpoint' => $endpoint
            ]);

            $response = Http::timeout(5)
                ->post($ssoUrl . $endpoint, [
                    'sso_session_id' => $ssoSessionId,
                    'app_id' => config('sso.app_id')
                ]);

            Log::info('SSO logout response', [
                'session_id' => $ssoSessionId,
                'logout_all' => $logoutAll,
                'status' => $response->status()
            ]);
        } catch (\Exception $e) {
            Log::warning('SSO logout error: ' . $e->getMessage());
        }
    }

    /**
     * Tetap pertahankan endpoint original
     */
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
                'unit_id' => $request->user()->unit_id,
            ],
        ]);
    }
}
