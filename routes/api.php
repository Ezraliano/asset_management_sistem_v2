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
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    
    // Dashboard
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    
    // Assets
    Route::apiResource('assets', AssetController::class);

 // ✅ PERBAIKAN: Depreciation Routes dengan method baru
    Route::get('/assets/{id}/depreciation', [AssetDepreciationController::class, 'show']);
    Route::get('/assets/{id}/depreciation-preview', [AssetDepreciationController::class, 'preview']);
    Route::get('/assets/{id}/depreciation-status', [AssetDepreciationController::class, 'getStatus']); // ✅ BARU
    Route::post('/assets/{id}/generate-depreciation', [AssetDepreciationController::class, 'generateForAsset']);
    Route::post('/assets/{id}/generate-multiple-depreciation', [AssetDepreciationController::class, 'generateMultipleForAsset']); // ✅ BARU
    Route::post('/assets/{id}/generate-until-value', [AssetDepreciationController::class, 'generateUntilValue']); // ✅ BARU
    Route::post('/assets/{id}/reset-depreciation', [AssetDepreciationController::class, 'resetForAsset']); // ✅ BARU
    Route::post('/depreciation/generate-all', [AssetDepreciationController::class, 'generateAll']);
    Route::post('/assets/{id}/generate-until-zero', [AssetDepreciationController::class, 'generateUntilZero']);
    Route::post('/assets/{id}/generate-pending-depreciation', [AssetDepreciationController::class, 'generatePendingForAsset']);
    
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