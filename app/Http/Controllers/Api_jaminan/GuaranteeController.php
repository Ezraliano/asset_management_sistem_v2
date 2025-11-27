<?php

namespace App\Http\Controllers\Api_jaminan;

use App\Http\Controllers\Controller;
use App\Models_jaminan\Guarantee;
use App\Models_jaminan\Unit;
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
            $query = Guarantee::query()->with('unit');

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

            // Filter berdasarkan unit_id
            if ($request->has('unit_id') && $request->unit_id !== '') {
                $query->byUnitId($request->unit_id);
            }

            // Filter berdasarkan range tanggal
            if ($request->has('start_date') && $request->has('end_date')) {
                $query->byDateRange($request->start_date, $request->end_date);
            }

            // Sorting - Default sorting by spk_number in ascending order
            $sortBy = $request->get('sort_by', 'spk_number');
            $sortOrder = $request->get('sort_order', 'asc');
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
            // Validasi input dengan custom messages dalam bahasa Indonesia
            $validated = $request->validate([
                'spk_number' => 'required|string|max:255',
                'cif_number' => 'required|string|max:255',
                'spk_name' => 'required|string|max:255',
                'credit_period' => 'required|string|max:255',
                'guarantee_name' => 'required|string|max:255',
                'guarantee_type' => 'required|in:BPKB,SHM,SHGB,E-SHM',
                'guarantee_number' => 'required|string|max:255|unique:mysql_jaminan.guarantees,guarantee_number',
                'file_location' => 'required|string|max:255',
                'input_date' => 'required|date',
                'status' => 'sometimes|in:available,dipinjam,lunas',
                'unit_id' => 'nullable|exists:mysql_jaminan.units,id',
            ], [
                'spk_number.required' => 'Nomor SPK tidak boleh kosong.',
                'spk_number.max' => 'Nomor SPK terlalu panjang (maksimal 255 karakter).',
                'cif_number.required' => 'Nomor CIF tidak boleh kosong.',
                'cif_number.max' => 'Nomor CIF terlalu panjang.',
                'spk_name.required' => 'Atas Nama SPK tidak boleh kosong.',
                'spk_name.max' => 'Atas Nama SPK terlalu panjang.',
                'credit_period.required' => 'Jangka Waktu Kredit tidak boleh kosong.',
                'credit_period.max' => 'Jangka Waktu Kredit terlalu panjang.',
                'guarantee_name.required' => 'Atas Nama Jaminan tidak boleh kosong.',
                'guarantee_name.max' => 'Atas Nama Jaminan terlalu panjang.',
                'guarantee_type.required' => 'Tipe Jaminan tidak boleh kosong.',
                'guarantee_type.in' => 'Tipe Jaminan harus salah satu dari: BPKB, SHM, SHGB, E-SHM.',
                'guarantee_number.required' => 'Nomor Jaminan tidak boleh kosong.',
                'guarantee_number.unique' => 'Nomor Jaminan ini sudah digunakan. Silakan gunakan nomor yang berbeda.',
                'guarantee_number.max' => 'Nomor Jaminan terlalu panjang.',
                'file_location.required' => 'Lokasi Berkas tidak boleh kosong.',
                'file_location.max' => 'Lokasi Berkas terlalu panjang.',
                'input_date.required' => 'Tanggal Input tidak boleh kosong.',
                'input_date.date' => 'Format tanggal tidak valid. Silakan gunakan format YYYY-MM-DD.',
                'status.in' => 'Status harus salah satu dari: available, dipinjam, lunas.',
            ]);

            // Validasi tambahan: Cek apakah CIF sudah terdaftar dengan Atas Nama SPK berbeda
            $existingGuarantee = Guarantee::where('cif_number', $validated['cif_number'])->first();
            if ($existingGuarantee && strtolower(trim($existingGuarantee->spk_name)) !== strtolower(trim($validated['spk_name']))) {
                return response()->json([
                    'success' => false,
                    'message' => 'Input gagal',
                    'errors' => [
                        'cif_number' => 'Nomor CIF ' . $validated['cif_number'] . ' sudah terdaftar dengan Atas Nama SPK "' . $existingGuarantee->spk_name . '". Atas Nama SPK harus sama.',
                        'spk_name' => 'Atas Nama SPK harus "' . $existingGuarantee->spk_name . '" untuk Nomor CIF ini.'
                    ]
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

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
            $guarantee = Guarantee::with('unit')->find($id);

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

            // Validasi input dengan custom messages dalam bahasa Indonesia
            $validated = $request->validate([
                'spk_number' => 'sometimes|required|string|max:255',
                'cif_number' => 'sometimes|required|string|max:255',
                'spk_name' => 'sometimes|required|string|max:255',
                'credit_period' => 'sometimes|required|string|max:255',
                'guarantee_name' => 'sometimes|required|string|max:255',
                'guarantee_type' => 'sometimes|required|in:BPKB,SHM,SHGB,E-SHM',
                'guarantee_number' => 'sometimes|required|string|max:255|unique:mysql_jaminan.guarantees,guarantee_number,' . $id,
                'file_location' => 'sometimes|required|string|max:255',
                'input_date' => 'sometimes|required|date',
                'status' => 'sometimes|in:available,dipinjam,lunas',
                'unit_id' => 'nullable|exists:mysql_jaminan.units,id',
            ], [
                'spk_number.required' => 'Nomor SPK tidak boleh kosong.',
                'spk_number.max' => 'Nomor SPK terlalu panjang (maksimal 255 karakter).',
                'cif_number.required' => 'Nomor CIF tidak boleh kosong.',
                'cif_number.max' => 'Nomor CIF terlalu panjang.',
                'spk_name.required' => 'Atas Nama SPK tidak boleh kosong.',
                'spk_name.max' => 'Atas Nama SPK terlalu panjang.',
                'credit_period.required' => 'Jangka Waktu Kredit tidak boleh kosong.',
                'credit_period.max' => 'Jangka Waktu Kredit terlalu panjang.',
                'guarantee_name.required' => 'Atas Nama Jaminan tidak boleh kosong.',
                'guarantee_name.max' => 'Atas Nama Jaminan terlalu panjang.',
                'guarantee_type.required' => 'Tipe Jaminan tidak boleh kosong.',
                'guarantee_type.in' => 'Tipe Jaminan harus salah satu dari: BPKB, SHM, SHGB, E-SHM.',
                'guarantee_number.required' => 'Nomor Jaminan tidak boleh kosong.',
                'guarantee_number.unique' => 'Nomor Jaminan ini sudah digunakan. Silakan gunakan nomor yang berbeda.',
                'guarantee_number.max' => 'Nomor Jaminan terlalu panjang.',
                'file_location.required' => 'Lokasi Berkas tidak boleh kosong.',
                'file_location.max' => 'Lokasi Berkas terlalu panjang.',
                'input_date.required' => 'Tanggal Input tidak boleh kosong.',
                'input_date.date' => 'Format tanggal tidak valid. Silakan gunakan format YYYY-MM-DD.',
                'status.in' => 'Status harus salah satu dari: available, dipinjam, lunas.',
                'unit_id.exists' => 'Unit yang dipilih tidak valid.',
            ]);

            // Validasi tambahan: Cek apakah CIF sudah terdaftar dengan Atas Nama SPK berbeda (untuk record lain)
            $existingGuarantee = Guarantee::where('cif_number', $validated['cif_number'])
                ->where('id', '!=', $id)
                ->first();
            if ($existingGuarantee && strtolower(trim($existingGuarantee->spk_name)) !== strtolower(trim($validated['spk_name']))) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validasi gagal',
                    'errors' => [
                        'cif_number' => 'Nomor CIF ' . $validated['cif_number'] . ' sudah terdaftar dengan Atas Nama SPK "' . $existingGuarantee->spk_name . '". Atas Nama SPK harus sama.',
                        'spk_name' => 'Atas Nama SPK harus "' . $existingGuarantee->spk_name . '" untuk Nomor CIF ini.'
                    ]
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

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
            $guarantees = Guarantee::with('unit')
                ->byType($type)
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
            $guarantees = Guarantee::with('unit')
                ->bySpkNumber($spkNumber)
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
    public function getStats(Request $request)
    {
        try {
            $query = Guarantee::query();

            // Filter by unit_id if provided
            if ($request->has('unit_id') && $request->unit_id !== '') {
                $query->byUnitId($request->unit_id);
            }

            $stats = [
                'total' => $query->count(),
                'by_status' => [
                    'available' => $query->clone()->byStatus('available')->count(),
                    'dipinjam' => $query->clone()->byStatus('dipinjam')->count(),
                    'lunas' => $query->clone()->byStatus('lunas')->count(),
                ],
                'by_type' => [
                    'BPKB' => $query->clone()->byType('BPKB')->count(),
                    'SHM' => $query->clone()->byType('SHM')->count(),
                    'SHGB' => $query->clone()->byType('SHGB')->count(),
                    'E-SHM' => $query->clone()->byType('E-SHM')->count(),
                ],
                'total_spk' => $query->clone()->distinct('spk_number')->count('spk_number'),
                'latest_input' => $query->clone()->latest()->first()?->input_date,
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

    /**
     * Get list of available units
     * GET /api/units/active
     */
    public function getUnits()
    {
        try {
            $units = Unit::active()->orderByName()->get();

            return response()->json([
                'success' => true,
                'message' => 'Daftar unit berhasil diambil',
                'data' => $units
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil daftar unit: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
