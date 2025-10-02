<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AssetController;
use App\Http\Controllers\Api\AssetMovementController;
use App\Http\Controllers\Api\MaintenanceController;
use App\Http\Controllers\Api\IncidentReportController;
use App\Http\Controllers\Api\DashboardController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public routes
Route::post('/login', [AuthController::class, 'login']);

// Protected routes
Route::middleware(['auth:sanctum'])->group(function () {
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    
    // Dashboard
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    
    // Assets
    Route::apiResource('assets', AssetController::class);
    
    // Asset Movements
    Route::apiResource('asset-movements', AssetMovementController::class);
    Route::get('/assets/{assetId}/movements', [AssetMovementController::class, 'getAssetMovements']);
    
    // Maintenances
    Route::apiResource('maintenances', MaintenanceController::class);
    Route::get('/assets/{assetId}/maintenances', [MaintenanceController::class, 'getAssetMaintenances']);
    
    // Incident Reports
    Route::apiResource('incident-reports', IncidentReportController::class);
    Route::get('/assets/{assetId}/incident-reports', [IncidentReportController::class, 'getAssetIncidentReports']);
});

// Fallback for undefined API routes
Route::fallback(function () {
    return response()->json([
        'success' => false,
        'message' => 'API endpoint not found'
    ], 404);
});