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
use App\Http\Controllers\Api\AssetRequestController;
use App\Http\Controllers\Api\AuthSSOController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\DepreciationScheduleController;
use App\Http\Controllers\Api\InventoryAuditController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api_jaminan\GuaranteeController;
use App\Http\Controllers\Api_jaminan\GuaranteeLoanController;
use App\Http\Controllers\Api_jaminan\GuaranteeSettlementController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public routes
Route::prefix('auth')->group(function () {
    // SSO Login (POST credentials ke SSO server)
    Route::post('sso/login', [AuthSSOController::class, 'loginViaSSO']);
    
    // Fallback local login  
    Route::post('login', [AuthSSOController::class, 'login']);
    
    // Common routes
    Route::get('check', [AuthSSOController::class, 'checkAuth']);
    Route::get('user', [AuthSSOController::class, 'user'])->middleware('auth:sanctum');
});


// Protected routes
Route::middleware(['auth:sanctum'])->group(function () {
    // Routes for ALL authenticated users
    // Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('logout', [AuthSSOController::class, 'logout'])->middleware('auth:sanctum');
    Route::get('/user', [AuthController::class, 'user']);
    Route::get('/verify-token', [AuthController::class, 'verifyToken']);
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    
    // Group for Laporan & Reports
    // Admin Holding can access all reports
    // Auditor can only access audit report
    Route::middleware(['auth:sanctum'])->group(function () {
        // All reports - Admin Holding only
        Route::middleware('role:super-admin,admin')->group(function () {
            Route::get('/reports/all', [ReportController::class, 'getAllReports']);
            Route::get('/reports/full-asset', [ReportController::class, 'getFullAssetReport']);
            Route::get('/reports/maintenance', [ReportController::class, 'getMaintenanceReport']);
            Route::get('/reports/repair', [ReportController::class, 'getRepairReport']);
            Route::get('/reports/loan', [ReportController::class, 'getLoanReport']);
            Route::get('/reports/damage', [ReportController::class, 'getDamageReport']);
            Route::get('/reports/sale', [ReportController::class, 'getSaleReport']);
            Route::get('/reports/loss', [ReportController::class, 'getLossReport']);
        });

        // Audit report - Admin Holding and Auditor
        Route::middleware('role:super-admin,admin,auditor')->group(function () {
            Route::get('/reports/audit', [ReportController::class, 'getAuditReport']);
        });
    });

    // Group for Aset menu (Admin Holding, Admin Unit)
    Route::middleware('role:super-admin,admin,unit')->group(function () {
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

        // Depreciation Schedule Routes
        Route::get('/depreciation/schedule', [DepreciationScheduleController::class, 'index']);
        Route::put('/depreciation/schedule', [DepreciationScheduleController::class, 'update']);
        Route::post('/depreciation/schedule/toggle', [DepreciationScheduleController::class, 'toggleActive']);
        Route::post('/depreciation/schedule/trigger', [DepreciationScheduleController::class, 'trigger']);
        Route::get('/depreciation/schedule/status', [DepreciationScheduleController::class, 'status']);
        Route::get('/depreciation/schedule/frequencies', [DepreciationScheduleController::class, 'frequencies']);
        Route::get('/depreciation/schedule/timezones', [DepreciationScheduleController::class, 'timezones']);

        Route::apiResource('maintenances', MaintenanceController::class);
        Route::get('/assets/{assetId}/maintenances', [MaintenanceController::class, 'getAssetMaintenances']);
        Route::post('/maintenances/{id}/validate', [MaintenanceController::class, 'validate']);
        Route::post('/maintenances/{id}/complete', [MaintenanceController::class, 'complete']);
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
        Route::put('/incident-reports/{id}/status', [IncidentReportController::class, 'updateStatus']);

        // Delete - Super Admin & Admin Holding only
        Route::middleware('role:super-admin,admin')->group(function () {
            Route::delete('/incident-reports/{id}', [IncidentReportController::class, 'destroy']);
        });
    });

    // Asset Movement Routes - Base routes for all authenticated users (role-based filtering in controller)
    Route::middleware(['auth:sanctum'])->group(function () {
        Route::get('/asset-movements', [AssetMovementController::class, 'index']);
        Route::get('/asset-movements/{id}', [AssetMovementController::class, 'show']);
        Route::get('/assets/{assetId}/movements', [AssetMovementController::class, 'getAssetMovements']);
        Route::delete('/asset-movements/{id}', [AssetMovementController::class, 'destroy']);
    });

    // Asset Movement Management Routes (Admin only - Super Admin/Admin Holding/Admin Unit)
    Route::middleware('role:super-admin,admin,unit')->group(function () {
        Route::post('/asset-movements/request-transfer', [AssetMovementController::class, 'requestTransfer']);
        Route::get('/asset-movements-pending', [AssetMovementController::class, 'getPendingMovements']);
        Route::post('/asset-movements/{id}/approve', [AssetMovementController::class, 'approveTransfer']);
        Route::post('/asset-movements/{id}/reject', [AssetMovementController::class, 'rejectTransfer']);

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

        // ✅ NEW ROUTE: Get asset by asset_tag (untuk QR Scanner) - accessible by all authenticated users
        Route::get('/assets/tag/{assetTag}', [AssetController::class, 'getByAssetTag']);

        // Unit routes - accessible by all authenticated users
        Route::get('/units', [UnitController::class, 'index']);
        Route::get('/units/{unit}', [UnitController::class, 'show']);
        Route::get('/units/{unit}/assets', [UnitController::class, 'assets']);
        Route::get('/units/{unit}/users', [UnitController::class, 'users']);

        // Inventory Audit Routes - Admin Holding and Auditor
        Route::middleware('role:super-admin,admin,auditor')->group(function () {
            Route::get('/inventory-audits', [InventoryAuditController::class, 'index']);
            Route::post('/inventory-audits', [InventoryAuditController::class, 'store']);
            Route::get('/inventory-audits/{id}', [InventoryAuditController::class, 'show']);
            Route::post('/inventory-audits/{id}/scan', [InventoryAuditController::class, 'scanAsset']);
            Route::post('/inventory-audits/{id}/complete', [InventoryAuditController::class, 'complete']);
            Route::post('/inventory-audits/{id}/cancel', [InventoryAuditController::class, 'cancel']);

            // Delete audit - Only Super Admin & Admin Holding
            Route::middleware('role:super-admin,admin')->group(function () {
                Route::delete('/inventory-audits/{id}', [InventoryAuditController::class, 'destroy']);
            });
        });
    });

    // Asset Loan Management Routes (Super Admin/Admin Holding/Admin Unit Access)
    Route::middleware('role:super-admin,admin,unit')->group(function () {
        Route::post('asset-loans/{assetLoan}/approve', [AssetLoanController::class, 'approve'])->name('asset-loans.approve');
        Route::post('asset-loans/{assetLoan}/reject', [AssetLoanController::class, 'reject'])->name('asset-loans.reject');

        // Return Approval Routes (Admin only)
        Route::post('asset-loans/{assetLoan}/approve-return', [AssetLoanController::class, 'approveReturn'])->name('asset-loans.approve-return');
        Route::post('asset-loans/{assetLoan}/reject-return', [AssetLoanController::class, 'rejectReturn'])->name('asset-loans.reject-return');
        Route::get('asset-loans-pending-returns', [AssetLoanController::class, 'getPendingReturns'])->name('asset-loans.pending-returns');

        // Asset Request Routes - Admin Unit can create, Admin Holding & Super Admin can approve/reject
        Route::get('/asset-requests', [AssetRequestController::class, 'index']);
        Route::post('/asset-requests', [AssetRequestController::class, 'store']);
        Route::get('/asset-requests/{id}', [AssetRequestController::class, 'show']);
    });

    // Asset Request Approval Routes - Only Super Admin & Admin Holding
    Route::middleware('role:Super Admin,Admin Holding')->group(function () {
        Route::post('/asset-requests/{id}/approve', [AssetRequestController::class, 'approve']);
        Route::post('/asset-requests/{id}/reject', [AssetRequestController::class, 'reject']);

        // Asset Request Return Confirmation - Holding confirms return
        Route::post('/asset-requests/{id}/confirm-return', [AssetRequestController::class, 'confirmReturn']);
        Route::post('/asset-requests/{id}/reject-return', [AssetRequestController::class, 'rejectReturn']);
        Route::get('/asset-requests-pending-returns', [AssetRequestController::class, 'getPendingReturns']);

        // Get available assets for lending
        Route::get('/asset-requests-available-assets', [AssetRequestController::class, 'getAvailableAssets']);
    });

    // Asset Request Return Routes - Admin Unit can submit return
    Route::middleware('role:super-admin,admin,unit')->group(function () {
        Route::post('/asset-requests/{id}/return', [AssetRequestController::class, 'returnAsset']);
        Route::get('/asset-requests-active-loans', [AssetRequestController::class, 'getActiveLoans']);
    });

    // ✅ Asset return - accessible by users (for their own loans)
    // User submits return request, admin will approve/reject
    Route::post('asset-loans/{assetLoan}/return', [AssetLoanController::class, 'returnAsset'])->name('asset-loans.return');

    // Asset Sales Routes - Super Admin, Admin Holding, Admin Unit
    Route::middleware('role:super-admin,admin,unit')->group(function () {
        Route::get('/asset-sales', [AssetSaleController::class, 'index']);
        Route::post('/asset-sales', [AssetSaleController::class, 'store']);
        Route::get('/asset-sales/statistics', [AssetSaleController::class, 'statistics']);
        Route::get('/asset-sales/available-assets', [AssetSaleController::class, 'getAvailableAssets']);
        Route::get('/asset-sales/{id}', [AssetSaleController::class, 'show']);
        Route::get('/asset-sales/{id}/proof', [AssetSaleController::class, 'getProofFile']);

        // Update & Delete only for Super Admin & Admin Holding
        Route::middleware('role:super-admin,admin')->group(function () {
            Route::put('/asset-sales/{id}', [AssetSaleController::class, 'update']);
            Route::delete('/asset-sales/{id}', [AssetSaleController::class, 'destroy']);
        });
    });

    // User Management Routes - Only Super Admin & Admin Holding
    Route::middleware('role:super-admin,admin')->group(function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::get('/users/{id}', [UserController::class, 'show']);
        Route::put('/users/{id}', [UserController::class, 'update']);
        Route::delete('/users/{id}', [UserController::class, 'destroy']);
        Route::get('/available-units', [UserController::class, 'getAvailableUnits']);
    });

    // Guarantee Routes - Super Admin, Admin Holding, Admin Unit
    Route::middleware('role:super-admin,admin,unit')->group(function () {
        Route::apiResource('guarantees', GuaranteeController::class);
        Route::get('/guarantees/stats', [GuaranteeController::class, 'getStats']);
        Route::get('/guarantees/by-type/{type}', [GuaranteeController::class, 'getByType']);
        Route::get('/guarantees/by-spk/{spkNumber}', [GuaranteeController::class, 'getBySpk']);

        // Guarantee Loan Routes
        Route::apiResource('guarantee-loans', GuaranteeLoanController::class);
        Route::get('/guarantee-loans/stats', [GuaranteeLoanController::class, 'getStats']);
        Route::get('/guarantee-loans/by-guarantee/{guaranteeId}', [GuaranteeLoanController::class, 'getByGuaranteeId']);
        Route::get('/guarantee-loans/by-status/{status}', [GuaranteeLoanController::class, 'getByStatus']);
        Route::put('/guarantee-loans/{id}/return', [GuaranteeLoanController::class, 'returnLoan']);

        // Guarantee Settlement Routes
        Route::apiResource('guarantee-settlements', GuaranteeSettlementController::class);
        Route::get('/guarantee-settlements/stats', [GuaranteeSettlementController::class, 'getStats']);
        Route::get('/guarantee-settlements/by-guarantee/{guaranteeId}', [GuaranteeSettlementController::class, 'getByGuaranteeId']);
        Route::get('/guarantee-settlements/by-status/{status}', [GuaranteeSettlementController::class, 'getByStatus']);
        Route::put('/guarantee-settlements/{id}/approve', [GuaranteeSettlementController::class, 'approve']);
        Route::put('/guarantee-settlements/{id}/reject', [GuaranteeSettlementController::class, 'reject']);
    });
});

// Fallback for undefined API routes
Route::fallback(function () {
    return response()->json([
        'success' => false,
        'message' => 'API endpoint not found'
    ], 404);
});