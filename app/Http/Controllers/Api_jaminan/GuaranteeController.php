<?php

namespace App\Http\Controllers\Api_jaminan;

use App\Http\Controllers\Controller;
use App\Models_jaminan\Guarantee;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

class GuaranteeController extends Controller
{
    /**
     * Display a listing of all guarantees
     * GET /api/guarantees
     */
    public function index(Request $request)
    {
        try {
            $query = Guarantee::query();

            // Filter berdasarkan tipe jaminan
            if ($request->has('guarantee_type') && $request->guarantee_type !== '') {
                $query->byType($request->guarantee_type);
            }

            // Filter berdasarkan nomor SPK
            if ($request->has('spk_number') && $request->spk_number !== '') {
                $query->bySpkNumber($request->spk_number);
            }

            // Filter berdasarkan nomor CIF
            if ($request->has('cif_number') && $request->cif_number !== '') {
                $query->byCifNumber($request->cif_number);
            }

            // Filter berdasarkan status
            if ($request->has('status') && $request->status !== '') {
                $query->byStatus($request->status);
            }

            // Filter berdasarkan range tanggal
            if ($request->has('start_date') && $request->has('end_date')) {
                $query->byDateRange($request->start_date, $request->end_date);
            }

            // Sorting
            $sortBy = $request->get('sort_by', 'input_date');
            $sortOrder = $request->get('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            // Pagination
            $perPage = $request->get('per_page', 15);
            $guarantees = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'message' => 'Data jaminan berhasil diambil',
                'data' => $guarantees->items(),
                'pagination' => [
                    'total' => $guarantees->total(),
                    'per_page' => $guarantees->perPage(),
                    'current_page' => $guarantees->currentPage(),
                    'last_page' => $guarantees->lastPage(),
                    'from' => $guarantees->firstItem(),
                    'to' => $guarantees->lastItem(),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil data jaminan: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Store a newly created guarantee in database
     * POST /api/guarantees
     */
    public function store(Request $request)
    {
        try {
            // Validasi input
            $validated = $request->validate([
                'spk_number' => 'required|string|max:255|unique:mysql_jaminan.guarantees,spk_number',
                'cif_number' => 'required|string|max:255',
                'spk_name' => 'required|string|max:255',
                'credit_period' => 'required|string|max:255',
                'guarantee_name' => 'required|string|max:255',
                'guarantee_type' => 'required|in:BPKB,SHM,SHGB',
                'guarantee_number' => 'required|string|max:255',
                'file_location' => 'required|string|max:255',
                'input_date' => 'required|date',
                'status' => 'sometimes|in:available,dipinjam,lunas',
            ]);

            // Set status default ke 'available' jika tidak ada
            if (!isset($validated['status'])) {
                $validated['status'] = 'available';
            }

            // Create guarantee
            $guarantee = Guarantee::create($validated);

            return response()->json([
                'success' => true,
                'message' => 'Jaminan berhasil disimpan',
                'data' => $guarantee
            ], Response::HTTP_CREATED);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $e->errors()
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menyimpan jaminan: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Display the specified guarantee
     * GET /api/guarantees/{id}
     */
    public function show($id)
    {
        try {
            $guarantee = Guarantee::find($id);

            if (!$guarantee) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data jaminan tidak ditemukan'
                ], Response::HTTP_NOT_FOUND);
            }

            return response()->json([
                'success' => true,
                'message' => 'Data jaminan berhasil diambil',
                'data' => $guarantee
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil data jaminan: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Update the specified guarantee
     * PUT /api/guarantees/{id}
     */
    public function update(Request $request, $id)
    {
        try {
            $guarantee = Guarantee::find($id);

            if (!$guarantee) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data jaminan tidak ditemukan'
                ], Response::HTTP_NOT_FOUND);
            }

            // Validasi input
            $validated = $request->validate([
                'spk_number' => 'sometimes|required|string|max:255|unique:mysql_jaminan.guarantees,spk_number,' . $id,
                'cif_number' => 'sometimes|required|string|max:255',
                'spk_name' => 'sometimes|required|string|max:255',
                'credit_period' => 'sometimes|required|string|max:255',
                'guarantee_name' => 'sometimes|required|string|max:255',
                'guarantee_type' => 'sometimes|required|in:BPKB,SHM,SHGB',
                'guarantee_number' => 'sometimes|required|string|max:255',
                'file_location' => 'sometimes|required|string|max:255',
                'input_date' => 'sometimes|required|date',
                'status' => 'sometimes|in:available,dipinjam,lunas',
            ]);

            // Update guarantee
            $guarantee->update($validated);

            return response()->json([
                'success' => true,
                'message' => 'Jaminan berhasil diperbarui',
                'data' => $guarantee
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
                'message' => 'Gagal memperbarui jaminan: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Remove the specified guarantee
     * DELETE /api/guarantees/{id}
     */
    public function destroy($id)
    {
        try {
            $guarantee = Guarantee::find($id);

            if (!$guarantee) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data jaminan tidak ditemukan'
                ], Response::HTTP_NOT_FOUND);
            }

            $guarantee->delete();

            return response()->json([
                'success' => true,
                'message' => 'Jaminan berhasil dihapus'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menghapus jaminan: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get guarantees by guarantee type
     * GET /api/guarantees/by-type/{type}
     */
    public function getByType($type)
    {
        try {
            $guarantees = Guarantee::byType($type)
                ->orderBy('input_date', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'message' => "Data jaminan tipe {$type} berhasil diambil",
                'data' => $guarantees
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil data jaminan: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get guarantees by SPK number
     * GET /api/guarantees/by-spk/{spkNumber}
     */
    public function getBySpk($spkNumber)
    {
        try {
            $guarantees = Guarantee::bySpkNumber($spkNumber)
                ->get();

            if ($guarantees->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => "Data jaminan dengan nomor SPK {$spkNumber} tidak ditemukan"
                ], Response::HTTP_NOT_FOUND);
            }

            return response()->json([
                'success' => true,
                'message' => "Data jaminan SPK {$spkNumber} berhasil diambil",
                'data' => $guarantees
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil data jaminan: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get statistics about guarantees
     * GET /api/guarantees/stats
     */
    public function getStats()
    {
        try {
            $stats = [
                'total' => Guarantee::count(),
                'by_status' => [
                    'available' => Guarantee::byStatus('available')->count(),
                    'dipinjam' => Guarantee::byStatus('dipinjam')->count(),
                    'lunas' => Guarantee::byStatus('lunas')->count(),
                ],
                'by_type' => [
                    'BPKB' => Guarantee::byType('BPKB')->count(),
                    'SHM' => Guarantee::byType('SHM')->count(),
                    'SHGB' => Guarantee::byType('SHGB')->count(),
                ],
                'total_spk' => Guarantee::distinct('spk_number')->count('spk_number'),
                'latest_input' => Guarantee::latest()->first()?->input_date,
            ];

            return response()->json([
                'success' => true,
                'message' => 'Statistik jaminan berhasil diambil',
                'data' => $stats
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil statistik jaminan: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
