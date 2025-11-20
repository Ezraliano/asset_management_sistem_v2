<?php

namespace App\Http\Controllers\Api_jaminan;

use App\Http\Controllers\Controller;
use App\Models_jaminan\GuaranteeSettlement;
use App\Models_jaminan\Guarantee;
use App\Models_jaminan\GuaranteeLoan;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

class GuaranteeSettlementController extends Controller
{
    /**
     * Display a listing of all guarantee settlements
     * GET /api/guarantee-settlements
     */
    public function index(Request $request)
    {
        try {
            $query = GuaranteeSettlement::with('guarantee');

            // Filter berdasarkan status
            if ($request->has('status') && $request->status !== '') {
                $query->byStatus($request->status);
            }

            // Filter berdasarkan guarantee_id
            if ($request->has('guarantee_id') && $request->guarantee_id !== '') {
                $query->byGuaranteeId($request->guarantee_id);
            }

            // Filter berdasarkan nomor SPK
            if ($request->has('spk_number') && $request->spk_number !== '') {
                $query->bySpkNumber($request->spk_number);
            }

            // Filter berdasarkan range tanggal pelunasan
            if ($request->has('start_date') && $request->has('end_date')) {
                $query->bySettlementDateRange($request->start_date, $request->end_date);
            }

            // Sorting
            $sortBy = $request->get('sort_by', 'settlement_date');
            $sortOrder = $request->get('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            // Pagination
            $perPage = $request->get('per_page', 15);
            $settlements = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'message' => 'Data pelunasan jaminan berhasil diambil',
                'data' => $settlements->items(),
                'pagination' => [
                    'total' => $settlements->total(),
                    'per_page' => $settlements->perPage(),
                    'current_page' => $settlements->currentPage(),
                    'last_page' => $settlements->lastPage(),
                    'from' => $settlements->firstItem(),
                    'to' => $settlements->lastItem(),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil data pelunasan jaminan: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Store a newly created guarantee settlement in database
     * POST /api/guarantee-settlements
     */
    public function store(Request $request)
    {
        try {
            // Validasi input - hanya settlement_date dan settlement_notes dari request
            $validated = $request->validate([
                'guarantee_id' => 'required|exists:mysql_jaminan.guarantees,id',
                'settlement_date' => 'required|date',
                'settlement_notes' => 'nullable|string',
            ]);

            // Create guarantee settlement with pending status (waiting for approval/validation)
            $settlement = GuaranteeSettlement::create(array_merge($validated, [
                'settlement_status' => 'pending',
            ]));

            return response()->json([
                'success' => true,
                'message' => 'Pelunasan jaminan berhasil disimpan, menunggu persetujuan',
                'data' => $settlement
            ], Response::HTTP_CREATED);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $e->errors()
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        } catch (\Exception $e) {
            \Log::error('GuaranteeSettlement Store Error: ' . $e->getMessage(), ['exception' => $e]);
            return response()->json([
                'success' => false,
                'message' => 'Gagal menyimpan pelunasan jaminan: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Display the specified guarantee settlement
     * GET /api/guarantee-settlements/{id}
     */
    public function show($id)
    {
        try {
            $settlement = GuaranteeSettlement::find($id);

            if (!$settlement) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data pelunasan jaminan tidak ditemukan'
                ], Response::HTTP_NOT_FOUND);
            }

            return response()->json([
                'success' => true,
                'message' => 'Data pelunasan jaminan berhasil diambil',
                'data' => $settlement
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil data pelunasan jaminan: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Update the specified guarantee settlement
     * PUT /api/guarantee-settlements/{id}
     */
    public function update(Request $request, $id)
    {
        try {
            $settlement = GuaranteeSettlement::find($id);

            if (!$settlement) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data pelunasan jaminan tidak ditemukan'
                ], Response::HTTP_NOT_FOUND);
            }

            // Validasi input
            $validated = $request->validate([
                'settlement_date' => 'sometimes|required|date',
                'settlement_notes' => 'sometimes|nullable|string',
                'settlement_status' => 'sometimes|in:pending,approved,rejected',
                'settled_by' => 'sometimes|nullable|string|max:255',
                'settlement_remarks' => 'sometimes|nullable|string',
            ]);

            // Update settlement
            $settlement->update($validated);

            // Jika settlement status approved, update status loan menjadi returned dan guarantee menjadi lunas
            if (isset($validated['settlement_status']) && $validated['settlement_status'] === 'approved') {
                // Update loan status
                $loan = GuaranteeLoan::find($settlement->loan_id);
                if ($loan) {
                    $loan->update(['status' => 'returned']);
                }

                // Update guarantee status
                $guarantee = Guarantee::find($settlement->guarantee_id);
                if ($guarantee) {
                    $guarantee->update(['status' => 'lunas']);
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Pelunasan jaminan berhasil diperbarui',
                'data' => $settlement
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $e->errors()
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal memperbarui pelunasan jaminan: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Remove the specified guarantee settlement
     * DELETE /api/guarantee-settlements/{id}
     */
    public function destroy($id)
    {
        try {
            $settlement = GuaranteeSettlement::find($id);

            if (!$settlement) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data pelunasan jaminan tidak ditemukan'
                ], Response::HTTP_NOT_FOUND);
            }

            // Jika settlement pending/rejected, bisa dihapus
            if ($settlement->settlement_status === 'approved') {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak dapat menghapus pelunasan yang sudah disetujui'
                ], Response::HTTP_BAD_REQUEST);
            }

            $settlement->delete();

            return response()->json([
                'success' => true,
                'message' => 'Pelunasan jaminan berhasil dihapus'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menghapus pelunasan jaminan: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get guarantee settlements by guarantee ID
     * GET /api/guarantee-settlements/by-guarantee/{guaranteeId}
     */
    public function getByGuaranteeId($guaranteeId)
    {
        try {
            $settlements = GuaranteeSettlement::byGuaranteeId($guaranteeId)
                ->latest()
                ->get();

            // Return empty array if no settlements found (don't return 404)
            return response()->json([
                'success' => true,
                'message' => $settlements->isEmpty()
                    ? 'Belum ada data pelunasan jaminan'
                    : 'Data pelunasan jaminan berhasil diambil',
                'data' => $settlements
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil data pelunasan jaminan: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get guarantee settlements by status
     * GET /api/guarantee-settlements/by-status/{status}
     */
    public function getByStatus($status)
    {
        try {
            $settlements = GuaranteeSettlement::byStatus($status)
                ->latest()
                ->get();

            if ($settlements->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => "Data pelunasan jaminan dengan status {$status} tidak ditemukan"
                ], Response::HTTP_NOT_FOUND);
            }

            return response()->json([
                'success' => true,
                'message' => "Data pelunasan jaminan status {$status} berhasil diambil",
                'data' => $settlements
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil data pelunasan jaminan: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Approve guarantee settlement
     * PUT /api/guarantee-settlements/{id}/approve
     */
    public function approve(Request $request, $id)
    {
        try {
            $settlement = GuaranteeSettlement::find($id);

            if (!$settlement) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data pelunasan jaminan tidak ditemukan'
                ], Response::HTTP_NOT_FOUND);
            }

            if ($settlement->settlement_status === 'approved') {
                return response()->json([
                    'success' => false,
                    'message' => 'Pelunasan jaminan sudah disetujui'
                ], Response::HTTP_BAD_REQUEST);
            }

            // Validasi input
            $validated = $request->validate([
                'settled_by' => 'required|string|max:255',
                'settlement_remarks' => 'nullable|string',
            ]);

            // Update settlement
            $settlement->update(array_merge($validated, [
                'settlement_status' => 'approved',
            ]));

            // Update loan status
            $loan = GuaranteeLoan::find($settlement->loan_id);
            if ($loan) {
                $loan->update(['status' => 'returned']);
            }

            // Update guarantee status
            $guarantee = Guarantee::find($settlement->guarantee_id);
            if ($guarantee) {
                $guarantee->update(['status' => 'lunas']);
            }

            return response()->json([
                'success' => true,
                'message' => 'Pelunasan jaminan berhasil disetujui',
                'data' => $settlement
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $e->errors()
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menyetujui pelunasan jaminan: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Reject guarantee settlement
     * PUT /api/guarantee-settlements/{id}/reject
     */
    public function reject(Request $request, $id)
    {
        try {
            $settlement = GuaranteeSettlement::find($id);

            if (!$settlement) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data pelunasan jaminan tidak ditemukan'
                ], Response::HTTP_NOT_FOUND);
            }

            if ($settlement->settlement_status === 'approved') {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak dapat menolak pelunasan yang sudah disetujui'
                ], Response::HTTP_BAD_REQUEST);
            }

            // Validasi input
            $validated = $request->validate([
                'settlement_remarks' => 'required|string',
            ]);

            // Update settlement
            $settlement->update(array_merge($validated, [
                'settlement_status' => 'rejected',
            ]));

            return response()->json([
                'success' => true,
                'message' => 'Pelunasan jaminan berhasil ditolak',
                'data' => $settlement
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $e->errors()
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menolak pelunasan jaminan: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get statistics about guarantee settlements
     * GET /api/guarantee-settlements/stats
     */
    public function getStats()
    {
        try {
            $stats = [
                'total' => GuaranteeSettlement::count(),
                'pending' => GuaranteeSettlement::byStatus('pending')->count(),
                'approved' => GuaranteeSettlement::byStatus('approved')->count(),
                'rejected' => GuaranteeSettlement::byStatus('rejected')->count(),
                'latest_settlement' => GuaranteeSettlement::latest()->first()?->settlement_date,
            ];

            return response()->json([
                'success' => true,
                'message' => 'Statistik pelunasan jaminan berhasil diambil',
                'data' => $stats
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil statistik pelunasan jaminan: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
