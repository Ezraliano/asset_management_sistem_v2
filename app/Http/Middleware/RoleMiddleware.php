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
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $user = Auth::user();

        // Ensure user and role exist to prevent errors
        if (!$user || !$user->role) {
            return response()->json(['message' => 'This action is unauthorized.'], 403);
        }

        $userRole = strtolower($user->role);

        // Super Admin (or Administrator) has access to everything
        if (in_array($userRole, ['super admin', 'administrator'])) {
            return $next($request);
        }

        foreach ($roles as $role) {
            if ($userRole === strtolower($role)) {
                return $next($request);
            }
        }

        return response()->json(['message' => 'This action is unauthorized.'], 403);
    }
}