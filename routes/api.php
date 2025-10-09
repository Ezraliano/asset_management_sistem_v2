<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AssetController;
use App\Http\Controllers\Api\AssetDepreciationController;
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
    // Routes for ALL authenticated users
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    
    // Group for Laporan & Audit (Admin Holding)
    Route::middleware('role:Admin Holding')->group(function () {
        // Future report routes can be placed here
    });

    // Group for Aset menu (Admin Holding, Unit)
    Route::middleware('role:Admin Holding,Unit')->group(function () {
        Route::apiResource('assets', AssetController::class);
        Route::get('/assets/{id}/depreciation', [AssetDepreciationController::class, 'show']);
        Route::get('/assets/{id}/depreciation-preview', [AssetDepreciationController::class, 'preview']);
        Route::get('/assets/{id}/depreciation-status', [AssetDepreciationController::class, 'getStatus']);
        Route::post('/assets/{id}/generate-depreciation', [AssetDepreciationController::class, 'generateForAsset']);
        Route::post('/assets/{id}/generate-multiple-depreciation', [AssetDepreciationController::class, 'generateMultipleForAsset']);
        Route::post('/assets/{id}/generate-until-value', [AssetDepreciationController::class, 'generateUntilValue']);
        Route::post('/assets/{id}/reset-depreciation', [AssetDepreciationController::class, 'resetForAsset']);
        Route::post('/depreciation/generate-all', [AssetDepreciationController::class, 'generateAll']);
        Route::post('/assets/{id}/generate-until-zero', [AssetDepreciationController::class, 'generateUntilZero']);
        Route::post('/assets/{id}/generate-pending-depreciation', [AssetDepreciationController::class, 'generatePendingForAsset']);
        Route::apiResource('maintenances', MaintenanceController::class);
        Route::get('/assets/{assetId}/maintenances', [MaintenanceController::class, 'getAssetMaintenances']);
        Route::apiResource('incident-reports', IncidentReportController::class);
        Route::get('/assets/{assetId}/incident-reports', [IncidentReportController::class, 'getAssetIncidentReports']);
    });

    // Group for Peminjaman Aset menu (Admin Holding, Unit, User)
    Route::middleware('role:Admin Holding,Unit,User')->group(function () {
        Route::apiResource('asset-movements', AssetMovementController::class);
        Route::get('/assets/{assetId}/movements', [AssetMovementController::class, 'getAssetMovements']);
    });
});

// Fallback for undefined API routes
Route::fallback(function () {
    return response()->json([
        'success' => false,
        'message' => 'API endpoint not found'
    ], 404);
});