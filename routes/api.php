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
use App\Http\Controllers\Api\AssetLoanController;
use App\Http\Controllers\Api\UnitController;
use App\Http\Controllers\Api\AssetSaleController;

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

    // Group for Aset menu (Admin Holding, Admin Unit)
    Route::middleware('role:Admin Holding,Admin Unit')->group(function () {
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
        Route::post('/maintenances/{id}/validate', [MaintenanceController::class, 'validate']);
    });

    // Incident Report Routes - All authenticated users can view/create, admin can update status
    Route::middleware(['auth:sanctum'])->group(function () {
        Route::get('/incident-reports', [IncidentReportController::class, 'index']);
        Route::post('/incident-reports', [IncidentReportController::class, 'store']);
        Route::get('/incident-reports/{id}', [IncidentReportController::class, 'show']);
        Route::get('/incident-reports/{id}/photo', [IncidentReportController::class, 'getIncidentPhoto']);
        Route::get('/assets/{assetId}/incident-reports', [IncidentReportController::class, 'getAssetIncidentReports']);
        Route::get('/incident-reports-statistics', [IncidentReportController::class, 'statistics']);

        // Update status - Admin only (authorization in controller)
        Route::post('/incident-reports/{id}/update-status', [IncidentReportController::class, 'updateStatus']);

        // Delete - Super Admin & Admin Holding only
        Route::middleware('role:Super Admin,Admin Holding')->group(function () {
            Route::delete('/incident-reports/{id}', [IncidentReportController::class, 'destroy']);
        });
    });

    // Asset Loan Routes - Base routes for all authenticated users (role-based filtering in controller)
    Route::middleware(['auth:sanctum'])->group(function () {
        Route::apiResource('asset-movements', AssetMovementController::class);
        Route::get('/assets/{assetId}/movements', [AssetMovementController::class, 'getAssetMovements']);

        // Asset Loan Routes - Role-based filtering handled in controller (NO ROLE MIDDLEWARE)
        Route::get('/asset-loans', [AssetLoanController::class, 'index']);
        Route::post('/asset-loans', [AssetLoanController::class, 'store']);
        Route::get('/asset-loans/{assetLoan}', [AssetLoanController::class, 'show']);
        Route::get('/assets/{assetId}/loan-history', [AssetLoanController::class, 'getAssetLoanHistory']);
    });

    // Additional routes for specific roles
    Route::middleware(['auth:sanctum'])->group(function () {
        // Users can view available assets for borrowing
        Route::get('/user-assets', [AssetController::class, 'getAvailableAssets']);

        // Unit routes - accessible by all authenticated users
        Route::get('/units', [UnitController::class, 'index']);
        Route::get('/units/{unit}', [UnitController::class, 'show']);
        Route::get('/units/{unit}/assets', [UnitController::class, 'assets']);
        Route::get('/units/{unit}/users', [UnitController::class, 'users']);
    });

    // Asset Loan Management Routes (Super Admin/Admin Holding/Admin Unit Access)
    Route::middleware('role:Super Admin,Admin Holding,Admin Unit')->group(function () {
        Route::post('asset-loans/{assetLoan}/approve', [AssetLoanController::class, 'approve'])->name('asset-loans.approve');
        Route::post('asset-loans/{assetLoan}/reject', [AssetLoanController::class, 'reject'])->name('asset-loans.reject');

        // Return Approval Routes (Admin only)
        Route::post('asset-loans/{assetLoan}/approve-return', [AssetLoanController::class, 'approveReturn'])->name('asset-loans.approve-return');
        Route::post('asset-loans/{assetLoan}/reject-return', [AssetLoanController::class, 'rejectReturn'])->name('asset-loans.reject-return');
        Route::get('asset-loans-pending-returns', [AssetLoanController::class, 'getPendingReturns'])->name('asset-loans.pending-returns');
    });

    // ✅ Asset return - accessible by users (for their own loans)
    // User submits return request, admin will approve/reject
    Route::post('asset-loans/{assetLoan}/return', [AssetLoanController::class, 'returnAsset'])->name('asset-loans.return');

    // Asset Sales Routes - Super Admin, Admin Holding, Admin Unit
    Route::middleware('role:Super Admin,Admin Holding,Admin Unit')->group(function () {
        Route::get('/asset-sales', [AssetSaleController::class, 'index']);
        Route::post('/asset-sales', [AssetSaleController::class, 'store']);
        Route::get('/asset-sales/statistics', [AssetSaleController::class, 'statistics']);
        Route::get('/asset-sales/available-assets', [AssetSaleController::class, 'getAvailableAssets']);
        Route::get('/asset-sales/{id}', [AssetSaleController::class, 'show']);
        Route::get('/asset-sales/{id}/proof', [AssetSaleController::class, 'getProofFile']);

        // Update & Delete only for Super Admin & Admin Holding
        Route::middleware('role:Super Admin,Admin Holding')->group(function () {
            Route::put('/asset-sales/{id}', [AssetSaleController::class, 'update']);
            Route::delete('/asset-sales/{id}', [AssetSaleController::class, 'destroy']);
        });
    });
});

// Fallback for undefined API routes
Route::fallback(function () {
    return response()->json([
        'success' => false,
        'message' => 'API endpoint not found'
    ], 404);
});