<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryAudit;
use App\Models\Asset;
use App\Models\Unit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class InventoryAuditController extends Controller
{
    /**
     * Display a listing of audits.
     */
    public function index(Request $request)
    {
        try {
            $user = Auth::user();
            $query = InventoryAudit::with(['unit', 'auditor']);

            // Filter by user role
            if ($user->role === 'super-admin' || $user->role === 'admin' || $user->role === 'auditor') {
                // Can see all audits
            } else {
                // Can only see audits for their own unit
                $query->where('unit_name', $user->unit_name);
            }

            // Filter by status if provided
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            // Filter by unit_name if provided
            if ($request->has('unit_name')) {
                $query->where('unit_name', $request->unit_name);
            }

            $audits = $query->orderBy('created_at', 'desc')->get();

            // Add computed fields
            $audits = $audits->map(function ($audit) {
                return [
                    'id' => $audit->id,
                    'audit_code' => $audit->audit_code,
                    'unit' => $audit->unit,
                    'auditor' => $audit->auditor,
                    'scan_mode' => $audit->scan_mode,
                    'status' => $audit->status,
                    'started_at' => $audit->started_at,
                    'completed_at' => $audit->completed_at,
                    'found_count' => $audit->found_count,
                    'missing_count' => $audit->missing_count,
                    'misplaced_count' => $audit->misplaced_count,
                    'completion_percentage' => $audit->completion_percentage,
                    'notes' => $audit->notes,
                    'created_at' => $audit->created_at,
                    'updated_at' => $audit->updated_at,
                ];
            });

            return response()->json($audits);
        } catch (\Exception $e) {
            Log::error('Error fetching inventory audits: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch audits'], 500);
        }
    }

    /**
     * Start a new audit session.
     */
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'unit_name' => 'required|string|exists:units,name',
                'scan_mode' => 'required|in:camera,manual',
                'notes' => 'nullable|string',
            ]);

            // Get unit_id from unit_name for asset queries
            $unit = Unit::where('name', $validated['unit_name'])->first();
            if (!$unit) {
                return response()->json(['error' => 'Unit not found'], 404);
            }

            $user = Auth::user();

            // Check if user has permission to audit this unit
            // auditor, super-admin, and admin can audit any unit
            // Other roles can only audit their own unit
            if ($user->role !== 'super-admin' && $user->role !== 'admin' && $user->role !== 'auditor') {
                if ($user->unit_name != $validated['unit_name']) {
                    return response()->json(['error' => 'Unauthorized to audit this unit'], 403);
                }
            }

            // Get all active assets in the unit
            $expectedAssets = Asset::where('unit_name', $validated['unit_name'])
                ->where('status', '!=', 'disposed')
                ->where('status', '!=', 'sold')
                ->pluck('id')
                ->toArray();

            // Generate unique audit code
            $auditCode = 'AUD-' . date('Ymd') . '-' . str_pad(InventoryAudit::whereDate('created_at', today())->count() + 1, 3, '0', STR_PAD_LEFT);

            // Create audit session
            $audit = InventoryAudit::create([
                'unit_name' => $validated['unit_name'],
                'auditor_id' => $user->id,
                'audit_code' => $auditCode,
                'scan_mode' => $validated['scan_mode'],
                'status' => 'in_progress',
                'started_at' => now(),
                'expected_asset_ids' => $expectedAssets,
                'found_asset_ids' => [],
                'misplaced_assets' => [],
                'notes' => $validated['notes'] ?? null,
            ]);

            Log::info('Inventory audit started', [
                'audit_id' => $audit->id,
                'audit_code' => $audit->audit_code,
                'unit_name' => $audit->unit_name,
                'auditor_id' => $user->id,
            ]);

            return response()->json([
                'message' => 'Audit session started successfully',
                'audit' => $audit->load(['unit', 'auditor']),
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['error' => 'Validation failed', 'messages' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('Error starting inventory audit: ' . $e->getMessage() . '\n' . $e->getTraceAsString());
            return response()->json(['error' => 'Failed to start audit', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Display the specified audit.
     */
    public function show($id)
    {
        try {
            $user = Auth::user();
            $audit = InventoryAudit::with(['unit', 'auditor'])->findOrFail($id);

            // Check permission
            // auditor, super-admin, and admin can view any audit
            if ($user->role !== 'super-admin' && $user->role !== 'admin' && $user->role !== 'auditor') {
                if ($audit->unit_name != $user->unit_name) {
                    return response()->json(['error' => 'Unauthorized'], 403);
                }
            }

            // Get full asset details for missing, found, and misplaced
            $expectedAssets = Asset::whereIn('id', $audit->expected_asset_ids ?? [])
                ->get()
                ->map(function ($asset) {
                    return [
                        'id' => $asset->id,
                        'name' => $asset->name,
                        'asset_tag' => $asset->asset_tag,
                        'category' => $asset->category,
                    ];
                });

            $foundAssetIds = $audit->found_asset_ids ?? [];
            $foundAssets = $expectedAssets->filter(function ($asset) use ($foundAssetIds) {
                return in_array($asset['id'], $foundAssetIds);
            })->values();

            // Calculate missing assets (expected but not found)
            $expectedIds = $audit->expected_asset_ids ?? [];
            $missingAssetIds = array_diff($expectedIds, $foundAssetIds);
            $missingAssets = $expectedAssets->filter(function ($asset) use ($missingAssetIds) {
                return in_array($asset['id'], $missingAssetIds);
            })->values();

            return response()->json([
                'id' => $audit->id,
                'audit_code' => $audit->audit_code,
                'unit' => $audit->unit,
                'auditor' => $audit->auditor,
                'scan_mode' => $audit->scan_mode,
                'status' => $audit->status,
                'started_at' => $audit->started_at,
                'completed_at' => $audit->completed_at,
                'expected_assets' => $expectedAssets,
                'found_assets' => $foundAssets,
                'missing_assets' => $missingAssets,
                'misplaced_assets' => $audit->misplaced_assets ?? [],
                'found_count' => $audit->found_count,
                'missing_count' => $audit->missing_count,
                'misplaced_count' => $audit->misplaced_count,
                'completion_percentage' => $audit->completion_percentage,
                'notes' => $audit->notes,
                'created_at' => $audit->created_at,
                'updated_at' => $audit->updated_at,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['error' => 'Audit not found'], 404);
        } catch (\Exception $e) {
            Log::error('Error fetching inventory audit: ' . $e->getMessage() . '\n' . $e->getTraceAsString());
            return response()->json(['error' => 'Failed to fetch audit', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Scan an asset during audit.
     */
    public function scanAsset(Request $request, $id)
    {
        try {
            $validated = $request->validate([
                'asset_id' => 'required|string',
            ]);

            $user = Auth::user();
            $audit = InventoryAudit::findOrFail($id);

            // Check permission
            // auditor, super-admin, and admin can scan assets in any audit
            if ($user->role !== 'super-admin' && $user->role !== 'admin' && $user->role !== 'auditor') {
                if ($audit->unit_name != $user->unit_name) {
                    return response()->json(['error' => 'Unauthorized'], 403);
                }
            }

            // Check if audit is still in progress
            if ($audit->status !== 'in_progress') {
                return response()->json(['error' => 'Audit session is not active'], 400);
            }

            $assetIdentifier = $validated['asset_id'];
            $foundAssetIds = $audit->found_asset_ids ?? [];
            $misplacedAssets = $audit->misplaced_assets ?? [];

            // Check if asset exists - search by ID (numeric) or asset_tag (string)
            $asset = null;
            if (is_numeric($assetIdentifier)) {
                // Search by ID
                $asset = Asset::with('unit')->find($assetIdentifier);
            } else {
                // Search by asset_tag (for QR code scans)
                $asset = Asset::with('unit')->where('asset_tag', $assetIdentifier)->first();
            }

            if (!$asset) {
                return response()->json([
                    'type' => 'error',
                    'message' => 'Asset not found in system',
                ], 404);
            }

            // Use asset ID for consistency
            $assetId = $asset->id;

            // Check if asset is expected in this unit
            $isExpected = in_array($assetId, $audit->expected_asset_ids ?? []);

            if ($isExpected) {
                // Asset found in correct unit
                if (!in_array($assetId, $foundAssetIds)) {
                    $foundAssetIds[] = $assetId;
                    $audit->found_asset_ids = $foundAssetIds;
                    $audit->save();
                }

                return response()->json([
                    'type' => 'success',
                    'message' => "Asset {$asset->name} (ID: {$asset->id}, Tag: {$asset->asset_tag}) found successfully",
                    'asset' => $asset,
                ]);
            } else {
                // Asset is misplaced
                $misplacedAsset = [
                    'id' => $asset->id,
                    'name' => $asset->name,
                    'asset_tag' => $asset->asset_tag,
                    'expected_unit_name' => $asset->unit_name,
                    'current_unit_display_name' => $asset->unit ? $asset->unit->name : 'Unknown',
                    'scanned_at' => now()->toDateTimeString(),
                ];

                // Check if not already in misplaced list
                $alreadyMisplaced = collect($misplacedAssets)->contains('id', $asset->id);
                if (!$alreadyMisplaced) {
                    $misplacedAssets[] = $misplacedAsset;
                    $audit->misplaced_assets = $misplacedAssets;
                    $audit->save();
                }

                return response()->json([
                    'type' => 'info',
                    'message' => "Asset {$asset->name} (ID: {$asset->id}, Tag: {$asset->asset_tag}) is misplaced. Should be in " . ($asset->unit ? $asset->unit->name : 'Unknown'),
                    'asset' => $asset,
                ]);
            }
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['error' => 'Validation failed', 'messages' => $e->errors()], 422);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['error' => 'Audit not found'], 404);
        } catch (\Exception $e) {
            Log::error('Error scanning asset in audit: ' . $e->getMessage() . '\n' . $e->getTraceAsString());
            return response()->json(['error' => 'Failed to scan asset', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Complete an audit session.
     */
    public function complete(Request $request, $id)
    {
        try {
            $validated = $request->validate([
                'notes' => 'nullable|string',
            ]);

            $user = Auth::user();
            $audit = InventoryAudit::findOrFail($id);

            // Check permission
            // auditor, super-admin, and admin can complete any audit
            if ($user->role !== 'super-admin' && $user->role !== 'admin' && $user->role !== 'auditor') {
                if ($audit->unit_name != $user->unit_name) {
                    return response()->json(['error' => 'Unauthorized'], 403);
                }
            }

            // Check if audit is in progress
            if ($audit->status !== 'in_progress') {
                return response()->json(['error' => 'Audit session is not active'], 400);
            }

            $audit->status = 'completed';
            $audit->completed_at = now();
            if (isset($validated['notes'])) {
                $audit->notes = $validated['notes'];
            }
            $audit->save();

            Log::info('Inventory audit completed', [
                'audit_id' => $audit->id,
                'audit_code' => $audit->audit_code,
                'unit_name' => $audit->unit_name,
                'found_count' => $audit->found_count,
                'missing_count' => $audit->missing_count,
                'misplaced_count' => $audit->misplaced_count,
            ]);

            return response()->json([
                'message' => 'Audit completed successfully',
                'audit' => $audit->load(['unit', 'auditor']),
            ]);
        } catch (\Exception $e) {
            Log::error('Error completing inventory audit: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to complete audit'], 500);
        }
    }

    /**
     * Cancel an audit session.
     */
    public function cancel($id)
    {
        try {
            $user = Auth::user();
            $audit = InventoryAudit::findOrFail($id);

            // Check permission
            // auditor, super-admin, and admin can cancel any audit
            if ($user->role !== 'super-admin' && $user->role !== 'admin' && $user->role !== 'auditor') {
                if ($audit->unit_name != $user->unit_name) {
                    return response()->json(['error' => 'Unauthorized'], 403);
                }
            }

            // Check if audit is in progress
            if ($audit->status !== 'in_progress') {
                return response()->json(['error' => 'Audit session is not active'], 400);
            }

            $audit->status = 'cancelled';
            $audit->save();

            Log::info('Inventory audit cancelled', [
                'audit_id' => $audit->id,
                'audit_code' => $audit->audit_code,
                'unit_name' => $audit->unit_name,
            ]);

            return response()->json([
                'message' => 'Audit cancelled successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('Error cancelling inventory audit: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to cancel audit'], 500);
        }
    }

    /**
     * Delete an audit.
     */
    public function destroy($id)
    {
        try {
            $user = Auth::user();

            // Only super-admin and admin can delete audits
            if ($user->role !== 'super-admin' && $user->role !== 'admin') {
                return response()->json(['error' => 'Unauthorized'], 403);
            }

            $audit = InventoryAudit::findOrFail($id);
            $audit->delete();

            Log::info('Inventory audit deleted', [
                'audit_id' => $id,
                'deleted_by' => $user->id,
            ]);

            return response()->json([
                'message' => 'Audit deleted successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting inventory audit: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to delete audit'], 500);
        }
    }
}
