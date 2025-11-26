<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class JaminanRoleMiddleware
{
    /**
     * Handle an incoming request untuk Jaminan (Guarantee) system
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @param  ...$roles
     * @return mixed
     */
    public function handle(Request $request, Closure $next, ...$roles)
    {
        // Check if user exists and is authenticated
        if (!$request->user()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 401);
        }

        $user = $request->user();

        // Ensure user and role exist to prevent errors
        if (!$user || !$user->role) {
            return response()->json([
                'success' => false,
                'message' => 'This action is unauthorized.'
            ], 403);
        }

        $userRole = strtolower($user->role);

        // Superadmin has access to everything
        if ($userRole === 'superadmin') {
            return $next($request);
        }

        // If no specific roles are required, allow access
        if (empty($roles)) {
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

        return $next($request);
    }
}
