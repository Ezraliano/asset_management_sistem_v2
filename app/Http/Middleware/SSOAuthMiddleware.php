<?php
//  Client Middleware untuk SSO Authentication
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use App\Models\User;

class SSOAuthMiddleware
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next)
    {
        $token = session('sso_token');
        $tokenExpires = session('sso_token_expires');
    
        // ✅ 1. Cek token ada dan belum expired
        if (!$token || ($tokenExpires && now()->gt($tokenExpires))) {
            Log::info('No SSO token or expired', [
                'url' => $request->fullUrl(),
                'has_token' => !empty($token),
                'expires' => $tokenExpires
            ]);
    
            session()->forget(['sso_token', 'sso_token_expires', 'sso_user']);
    
            if ($request->expectsJson() || $request->ajax()) {
                return response()->json(['authenticated' => false], 401);
            }
    
            return response()->view('auth.checking-sso', [
                'intended_url' => $request->fullUrl()
            ]);
        }
    
        // ✅ 2. Refresh token jika hampir expired (5 menit sebelum)
        if ($tokenExpires && now()->addMinutes(5)->gt($tokenExpires)) {
            Log::info('Token expiring soon, attempting refresh');
            
            $newToken = $this->tryRefreshToken($token);
            if ($newToken) {
                $token = $newToken;
                session([
                    'sso_token' => $newToken,
                    'sso_token_expires' => now()->addMinutes(config('jwt.ttl', 60))
                ]);
                
                // Clear old cache
                Cache::forget("sso_user:" . md5($token));
            }
        }
    
        // ✅ 3. Validasi token
        $user = $this->validateAndGetUser($token);
    
        if (!$user) {
            Log::warning('SSO token invalid');
            
            session()->forget(['sso_token', 'sso_token_expires', 'sso_user']);
    
            if ($request->expectsJson() || $request->ajax()) {
                return response()->json(['authenticated' => false], 401);
            }
    
            return response()->view('auth.checking-sso', [
                'intended_url' => $request->fullUrl()
            ]);
        }
    
        // ✅ 4. Setup user context
        $this->setupUserContext($user, $token, $request);
    
        return $next($request);
    }
    
    private function validateAndGetUser($token): ?array
    {
        $cacheKey = "sso_user:" . md5($token);
        $cachedUser = Cache::get($cacheKey);
    
        if ($cachedUser) {
            return $cachedUser;
        }
    
        $user = $this->fetchUserInfo($token);
    
        if ($user) {
            // ✅ Cache pendek untuk force revalidasi
            Cache::put($cacheKey, $user, now()->addMinutes(5));
            return $user;
        }
    
        return null;
    }
    
    private function tryRefreshToken($oldToken): ?string
    {
        try {
            $ssoUrl = config('sso.server_url');
    
            $response = Http::withToken($oldToken)
                ->timeout(5)
                ->post("{$ssoUrl}/api/sso/refresh");
    
            if ($response->successful()) {
                $data = $response->json();
                if (($data['success'] ?? false) && isset($data['access_token'])) {
                    Log::info('Token refreshed successfully');
                    return $data['access_token'];
                }
            }
    
            Log::warning('Token refresh failed', [
                'status' => $response->status()
            ]);
            
            return null;
        } catch (\Exception $e) {
            Log::error('Token refresh error: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Setup user context (session, auth, view share)
     */
    private function setupUserContext($userInfo, $token, $request)
    {
        // ✅ HANYA login jika user sudah ada di database
        $localUser = User::where('email', $userInfo['email'])->first();
        
        if ($localUser) {
            // Auto-login jika belum login atau user berbeda
            if (!Auth::check() || Auth::id() !== $localUser->id) {
                Auth::login($localUser);
                Log::debug('Auto-login user', ['user_id' => $localUser->id]);
            }
        } else {
            // User belum ada di database (seharusnya tidak terjadi)
            Log::warning('User not found in local database', [
                'email' => $userInfo['email']
            ]);
        }
    
        // Simpan di session
        session(['sso_user' => $userInfo]);
    
        // Attach ke request
        $request->merge([
            'sso_user' => $userInfo,
            'sso_token' => $token
        ]);
    
        // Share ke views
        view()->share('authUser', $userInfo);
    }

    /**
     * Redirect ke SSO login page
     */
    private function redirectToSSOLogin(Request $request)
    {
        $ssoUrl = config('sso.server_url');
        $appSlug = config('sso.app_slug');

        // Simpan intended URL untuk redirect setelah login
        $intendedUrl = $request->fullUrl();
        session()->put('url.intended', $intendedUrl);

        $loginUrl = "{$ssoUrl}/sso/login?" . http_build_query([
            'app_slug' => $appSlug,
            'redirect_uri' => route('sso.callback', [
                'return_url' => $intendedUrl
            ])
        ]);

        Log::info('Redirecting to SSO login', [
            'intended' => $intendedUrl,
            'login_url' => $loginUrl
        ]);

        return redirect($loginUrl);
    }

    /**
     * Exchange authorization code dengan access token
     */
    private function exchangeCodeForToken($code): ?array
    {
        try {
            $ssoUrl = config('sso.server_url');
            $appId = config('sso.app_id');

            $response = Http::timeout(10)
                ->retry(3, 100)
                ->post("{$ssoUrl}/api/sso/token", [
                    'code' => $code,
                    'app_id' => $appId,
                ]);

            if ($response->successful()) {
                $data = $response->json();
                if ($data['success'] ?? false) {
                    return $data;
                }
            }

            Log::error('Token exchange failed', [
                'status' => $response->status(),
                'body' => $response->body()
            ]);

            return null;
        } catch (\Exception $e) {
            Log::error('Token exchange error: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Fetch user info dari SSO server
     */
    private function fetchUserInfo($token): ?array
    {
        try {
            $ssoUrl = config('sso.server_url');

            $response = Http::withToken($token)
                ->timeout(5)
                ->retry(2, 100)
                ->get("{$ssoUrl}/api/sso/user");

            if ($response->successful()) {
                $data = $response->json();
                if (($data['success'] ?? false) && isset($data['data'])) {
                    return $data['data'];
                }
            }

            return null;
        } catch (\Exception $e) {
            Log::error('Fetch user info error: ' . $e->getMessage());
            return null;
        }
    }
}