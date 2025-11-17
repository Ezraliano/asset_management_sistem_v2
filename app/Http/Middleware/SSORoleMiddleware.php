<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SSORoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @param  string  ...$roles - Role yang diizinkan (comma separated)
     * @return mixed
     */
    public function handle(Request $request, Closure $next, ...$roles)
    {
        // Ambil SSO user dari session atau request
        $ssoUser = session('sso_user') ?? $request->get('sso_user');
        
        if (!$ssoUser) {
            Log::warning('SSO Role Check: No SSO user found');
            abort(403, 'Unauthorized - No SSO user data');
        }
        
        // Ambil role dari SSO user
        $userRole = $ssoUser['role']['slug'] ?? null;
        
        if (!$userRole) {
            Log::warning('SSO Role Check: User has no role', ['user' => $ssoUser]);
            abort(403, 'Unauthorized - No role assigned');
        }
        
        // Cek apakah role user ada dalam daftar role yang diizinkan
        if (!in_array($userRole, $roles)) {
            Log::warning('SSO Role Check: Access denied', [
                'user_role' => $userRole,
                'allowed_roles' => $roles,
                'user_id' => $ssoUser['id'] ?? 'unknown'
            ]);
            
            abort(403, 'Unauthorized - Insufficient permissions');
        }
        
        Log::debug('SSO Role Check: Access granted', [
            'user_role' => $userRole,
            'allowed_roles' => $roles
        ]);
        
        return $next($request);
    }
}