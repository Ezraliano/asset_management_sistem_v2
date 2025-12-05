<?php

namespace App\Http\Controllers\Api_jaminan;

use App\Http\Controllers\Controller;
use App\Models_jaminan\GuaranteeLoan;
use App\Models_jaminan\Guarantee;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

class GuaranteeLoanController extends Controller
{
    /**
     * Display a listing of all guarantee loans
     * GET /api/guarantee-loans
     */
    public function index(Request $request)
    {
        try {
            $query = GuaranteeLoan::with('guarantee');

            // ✅ AUTHORIZATION: Admin-kredit hanya bisa lihat peminjaman jaminan unitnya sendiri
            $user = $request->user();
            if ($user && $user->role === 'admin-kredit' && $user->unit_name) {
                $query->whereHas('guarantee', function ($q) use ($user) {
                    $q->where('unit_name', $user->unit_name);
                });
            }

            // Filter untuk laporan export - hanya tampilkan jaminan yang masih dipinjam
            // Ini memastikan laporan "Jaminan Dipinjam" hanya menampilkan yang berstatus dipinjam
            if ($request->has('for_report') && $request->for_report === 'true') {
                $query->onlyActive()->withActiveLoan();
            } else {
                // Filter berdasarkan status loan (active/returned) jika tidak untuk laporan
                if ($request->has('status') && $request->status !== '') {
                    $query->byStatus($request->status);
                }
            }

            // Filter berdasarkan guarantee_id
            if ($request->has('guarantee_id') && $request->guarantee_id !== '') {
                $query->byGuaranteeId($request->guarantee_id);
            }

            // Filter berdasarkan nomor SPK
            if ($request->has('spk_number') && $request->spk_number !== '') {
                $query->bySpkNumber($request->spk_number);
            }

            // Filter berdasarkan range tanggal peminjaman
            if ($request->has('start_date') && $request->has('end_date')) {
                $query->byLoanDateRange($request->start_date, $request->end_date);
            }

            // Sorting
            $sortBy = $request->get('sort_by', 'loan_date');
            $sortOrder = $request->get('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            // Pagination
            $perPage = $request->get('per_page', 15);
            $loans = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'message' => 'Data peminjaman jaminan berhasil diambil',
                'data' => $loans->items(),
                'loans' => $loans->items(),
                'pagination' => [
                    'total' => $loans->total(),
                    'per_page' => $loans->perPage(),
                    'current_page' => $loans->currentPage(),
                    'last_page' => $loans->lastPage(),
                    'from' => $loans->firstItem(),
                    'to' => $loans->lastItem(),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil data peminjaman jaminan: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Store a newly created guarantee loan in database
     * POST /api/guarantee-loans
     */
    public function store(Request $request)
    {
        try {
            // Validasi input
            $validated = $request->validate([
                'guarantee_id' => 'required|exists:mysql_jaminan.guarantees,id',
                'spk_number' => 'required|string|max:255',
                'cif_number' => 'required|string|max:255',
                'guarantee_type' => 'required|in:BPKB,SHM,SHGB,E-SHM',
                'file_location' => 'required|string|max:255',
                'borrower_name' => 'required|string|max:255',
                'borrower_contact' => 'required|string|max:255',
                'reason' => 'required|string',
                'loan_date' => 'required|date',
                'expected_return_date' => 'nullable|date|after_or_equal:loan_date',
            ]);

            // Validasi: Cek apakah jaminan sudah berstatus 'lunas'
            $guarantee = Guarantee::find($validated['guarantee_id']);
            if (!$guarantee) {
                return response()->json([
                    'success' => false,
                    'message' => 'Jaminan tidak ditemukan'
                ], Response::HTTP_NOT_FOUND);
            }

            // ✅ AUTHORIZATION: Admin-kredit hanya bisa meminjamkan jaminan untuk unitnya sendiri
            $user = $request->user();
            if ($user && $user->role === 'admin-kredit' && $guarantee->unit_name !== $user->unit_name) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda hanya bisa meminjamkan jaminan untuk unit ' . $user->unit_name
                ], Response::HTTP_FORBIDDEN);
            }

            if ($guarantee->status === 'lunas') {
                return response()->json([
                    'success' => false,
                    'message' => 'Jaminan dengan status "Lunas" tidak dapat dipinjamkan. Jaminan sudah keluar/dikembalikan.'
                ], Response::HTTP_BAD_REQUEST);
            }

            // Jika sudah dipinjam sebelumnya, cek apakah sudah dikembalikan
            if ($guarantee->status === 'dipinjam') {
                return response()->json([
                    'success' => false,
                    'message' => 'Jaminan sedang dipinjam. Kembalikan terlebih dahulu sebelum melakukan peminjaman baru.'
                ], Response::HTTP_BAD_REQUEST);
            }

            // Create guarantee loan
            $loan = GuaranteeLoan::create($validated);

            // Update status jaminan menjadi 'dipinjam'
            if ($guarantee) {
                $guarantee->update(['status' => 'dipinjam']);
            }

            return response()->json([
                'success' => true,
                'message' => 'Peminjaman jaminan berhasil disimpan',
                'data' => $loan
            ], Response::HTTP_CREATED);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $e->errors()
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        } catch (\Exception $e) {
            \Log::error('GuaranteeLoan Store Error: ' . $e->getMessage(), ['exception' => $e]);
            return response()->json([
                'success' => false,
                'message' => 'Gagal menyimpan peminjaman jaminan: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Display the specified guarantee loan
     * GET /api/guarantee-loans/{id}
     */
    public function show($id)
    {
        try {
            $loan = GuaranteeLoan::find($id);

            if (!$loan) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data peminjaman jaminan tidak ditemukan'
                ], Response::HTTP_NOT_FOUND);
            }

            return response()->json([
                'success' => true,
                'message' => 'Data peminjaman jaminan berhasil diambil',
                'data' => $loan
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil data peminjaman jaminan: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Update the specified guarantee loan
     * PUT /api/guarantee-loans/{id}
     */
    public function update(Request $request, $id)
    {
        try {
            $loan = GuaranteeLoan::find($id);

            if (!$loan) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data peminjaman jaminan tidak ditemukan'
                ], Response::HTTP_NOT_FOUND);
            }

            // Validasi input
            $validated = $request->validate([
                'borrower_name' => 'sometimes|required|string|max:255',
                'borrower_contact' => 'sometimes|required|string|max:255',
                'reason' => 'sometimes|required|string',
                'loan_date' => 'sometimes|required|date',
                'expected_return_date' => 'sometimes|nullable|date|after_or_equal:loan_date',
                'actual_return_date' => 'sometimes|nullable|date',
                'status' => 'sometimes|in:active,returned',
            ]);

            // Update loan
            $loan->update($validated);

            // Jika status berubah menjadi 'returned' dan actual_return_date diisi
            if (isset($validated['status']) && $validated['status'] === 'returned' && isset($validated['actual_return_date'])) {
                // Update status jaminan kembali ke 'available' setelah dikembalikan
                // Status 'lunas' hanya diberikan ketika ada settlement yang disetujui
                $guarantee = Guarantee::find($loan->guarantee_id);
                if ($guarantee) {
                    $guarantee->update(['status' => 'available']);
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Peminjaman jaminan berhasil diperbarui',
                'data' => $loan
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
                'message' => 'Gagal memperbarui peminjaman jaminan: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Remove the specified guarantee loan
     * DELETE /api/guarantee-loans/{id}
     */
    public function destroy($id)
    {
        try {
            $loan = GuaranteeLoan::find($id);

            if (!$loan) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data peminjaman jaminan tidak ditemukan'
                ], Response::HTTP_NOT_FOUND);
            }

            // Jika loan aktif, kembalikan status jaminan ke 'available'
            if ($loan->status === 'active') {
                $guarantee = Guarantee::find($loan->guarantee_id);
                if ($guarantee) {
                    $guarantee->update(['status' => 'available']);
                }
            }

            $loan->delete();

            return response()->json([
                'success' => true,
                'message' => 'Peminjaman jaminan berhasil dihapus'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menghapus peminjaman jaminan: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get guarantee loans by guarantee ID
     * GET /api/guarantee-loans/by-guarantee/{guaranteeId}
     */
    public function getByGuaranteeId($guaranteeId)
    {
        try {
            $loans = GuaranteeLoan::byGuaranteeId($guaranteeId)
                ->latest()
                ->get();

            // Return empty array if no loans found (don't return 404)
            return response()->json([
                'success' => true,
                'message' => $loans->isEmpty()
                    ? 'Belum ada data peminjaman jaminan'
                    : 'Data peminjaman jaminan berhasil diambil',
                'data' => $loans
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil data peminjaman jaminan: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get guarantee loans by status
     * GET /api/guarantee-loans/by-status/{status}
     */
    public function getByStatus($status)
    {
        try {
            $loans = GuaranteeLoan::byStatus($status)
                ->latest()
                ->get();

            if ($loans->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => "Data peminjaman jaminan dengan status {$status} tidak ditemukan"
                ], Response::HTTP_NOT_FOUND);
            }

            return response()->json([
                'success' => true,
                'message' => "Data peminjaman jaminan status {$status} berhasil diambil",
                'data' => $loans
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil data peminjaman jaminan: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get statistics about guarantee loans
     * GET /api/guarantee-loans/stats
     */
    public function getStats()
    {
        try {
            $stats = [
                'total' => GuaranteeLoan::count(),
                'active' => GuaranteeLoan::byStatus('active')->count(),
                'returned' => GuaranteeLoan::byStatus('returned')->count(),
                'latest_loan' => GuaranteeLoan::latest()->first()?->loan_date,
            ];

            return response()->json([
                'success' => true,
                'message' => 'Statistik peminjaman jaminan berhasil diambil',
                'data' => $stats
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil statistik peminjaman jaminan: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Return guarantee loan
     * PUT /api/guarantee-loans/{id}/return
     */
    public function returnLoan(Request $request, $id)
    {
        try {
            $loan = GuaranteeLoan::find($id);

            if (!$loan) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data peminjaman jaminan tidak ditemukan'
                ], Response::HTTP_NOT_FOUND);
            }

            // ✅ AUTHORIZATION: Admin-kredit hanya bisa return jaminan untuk unitnya sendiri
            $guarantee = Guarantee::find($loan->guarantee_id);
            $user = $request->user();
            if ($user && $user->role === 'admin-kredit' && $guarantee && $guarantee->unit_name !== $user->unit_name) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda hanya bisa melunasi jaminan untuk unit ' . $user->unit_name
                ], Response::HTTP_FORBIDDEN);
            }

            if ($loan->status === 'returned') {
                return response()->json([
                    'success' => false,
                    'message' => 'Peminjaman jaminan sudah dikembalikan'
                ], Response::HTTP_BAD_REQUEST);
            }

            // Validasi input
            $validated = $request->validate([
                'actual_return_date' => 'required|date',
            ]);

            // Update loan status
            $loan->update([
                'status' => 'returned',
                'actual_return_date' => $validated['actual_return_date']
            ]);

            // Update status jaminan kembali ke 'available' setelah dikembalikan
            // Status 'lunas' hanya diberikan ketika ada settlement yang disetujui
            if ($guarantee) {
                $guarantee->update(['status' => 'available']);
            }

            return response()->json([
                'success' => true,
                'message' => 'Peminjaman jaminan berhasil dikembalikan',
                'data' => $loan
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
                'message' => 'Gagal mengembalikan peminjaman jaminan: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
