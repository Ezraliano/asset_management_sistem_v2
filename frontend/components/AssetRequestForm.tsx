import React, { useState, useEffect } from 'react';
import { Asset, Unit } from '../types';

interface AssetRequestFormProps {
  onSubmit: (requestData: any) => void;
  onCancel: () => void;
  loading?: boolean;
  userUnit: Unit | null;
}

const AssetRequestForm: React.FC<AssetRequestFormProps> = ({
  onSubmit,
  onCancel,
  loading = false,
  userUnit
}) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [neededDate, setNeededDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [purpose, setPurpose] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    fetchAvailableAssets();
  }, []);

  const fetchAvailableAssets = async () => {
    setLoadingAssets(true);
    try {
      const token = localStorage.getItem('auth_token');
      // Add for_request=true parameter to fetch assets from other units
      const response = await fetch('http://localhost:8000/api/assets?for_request=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch assets');

      const data = await response.json();

      // Handle paginated response
      let assetsList: Asset[] = [];

      if (data.success && data.data) {
        // Check if data.data is paginated (has 'data' property) or direct array
        if (data.data.data && Array.isArray(data.data.data)) {
          // Paginated response
          assetsList = data.data.data;
        } else if (Array.isArray(data.data)) {
          // Direct array response
          assetsList = data.data;
        }
      }

      // Backend already filters by unit_id != userUnit.id and status = Available
      // So we just set the assets directly
      setAssets(assetsList);

      if (assetsList.length === 0) {
        setError('Tidak ada asset Available dari unit lain yang dapat dipinjam saat ini.');
      }
    } catch (error: any) {
      console.error('Error fetching assets:', error);
      setError('Gagal memuat daftar asset. Pastikan Anda terhubung ke server.');
    } finally {
      setLoadingAssets(false);
    }
  };

  const handleAssetSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const assetId = parseInt(e.target.value);
    const asset = assets.find(a => a.id === assetId);
    setSelectedAsset(asset || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedAsset || !neededDate || !startTime || !endTime || !expectedReturnDate || !purpose || !reason) {
      setError('Mohon isi semua field yang wajib.');
      return;
    }

    // Validasi waktu
    if (startTime >= endTime) {
      setError('Jam selesai harus lebih besar dari jam mulai.');
      return;
    }

    // Validasi tanggal
    if (new Date(neededDate) > new Date(expectedReturnDate)) {
      setError('Tanggal pengembalian harus setelah tanggal peminjaman.');
      return;
    }

    // Call parent's onSubmit with request data
    onSubmit({
      asset_id: selectedAsset.id,
      needed_date: neededDate,
      expected_return_date: expectedReturnDate,
      start_time: startTime,
      end_time: endTime,
      purpose: purpose,
      reason: reason,
    });
  };

  return (
    <div className="bg-white p-6 rounded-lg">
      <h3 className="text-xl font-bold mb-6 text-gray-800">
        Request Peminjaman Asset Antar Unit
      </h3>

      {userUnit && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Unit Anda:</strong> {userUnit.name}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Anda dapat request peminjaman asset dari unit lain. Request akan divalidasi oleh Admin Holding atau Super Admin.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Asset Selection */}
        <div>
          <label htmlFor="asset" className="block text-sm font-medium text-gray-700 mb-2">
            Pilih Asset yang Dibutuhkan *
          </label>
          {loadingAssets ? (
            <div className="text-sm text-gray-500">Memuat daftar asset...</div>
          ) : (
            <>
              <select
                id="asset"
                value={selectedAsset?.id || ''}
                onChange={handleAssetSelect}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">-- Pilih Asset --</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name} ({asset.asset_tag}) - {asset.unit?.name || 'N/A'}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Menampilkan asset Available dari unit lain
              </p>
            </>
          )}
        </div>

        {/* Asset Info */}
        {selectedAsset && (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-700 mb-2">Detail Asset</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-gray-600">Nama:</span>
                <p className="text-gray-900">{selectedAsset.name}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Kode:</span>
                <p className="text-gray-900">{selectedAsset.asset_tag}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Kategori:</span>
                <p className="text-gray-900">{selectedAsset.category}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Unit Pemilik:</span>
                <p className="text-gray-900">{selectedAsset.unit?.name || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Needed Date */}
        <div>
          <label htmlFor="neededDate" className="block text-sm font-medium text-gray-700 mb-2">
            Tanggal Peminjaman yang Dibutuhkan *
          </label>
          <input
            type="date"
            id="neededDate"
            min={getTodayString()}
            value={neededDate}
            onChange={(e) => setNeededDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Kapan Anda membutuhkan asset ini</p>
        </div>

        {/* Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-2">
              Jam Mulai *
            </label>
            <input
              type="time"
              id="startTime"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Jam mulai penggunaan</p>
          </div>

          <div>
            <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-2">
              Jam Selesai *
            </label>
            <input
              type="time"
              id="endTime"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Jam selesai penggunaan</p>
          </div>
        </div>

        {/* Expected Return Date */}
        <div>
          <label htmlFor="expectedReturnDate" className="block text-sm font-medium text-gray-700 mb-2">
            Tanggal Pengembalian yang Diharapkan *
          </label>
          <input
            type="date"
            id="expectedReturnDate"
            min={neededDate || getTodayString()}
            value={expectedReturnDate}
            onChange={(e) => setExpectedReturnDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Kapan Anda akan mengembalikan asset</p>
        </div>

        {/* Purpose */}
        <div>
          <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 mb-2">
            Tujuan Peminjaman *
          </label>
          <textarea
            id="purpose"
            rows={3}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Jelaskan tujuan penggunaan asset ini..."
            required
          />
          <p className="text-xs text-gray-500 mt-1">Untuk apa asset ini akan digunakan</p>
        </div>

        {/* Reason */}
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
            Alasan Request *
          </label>
          <textarea
            id="reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Mengapa unit Anda membutuhkan asset dari unit lain..."
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Jelaskan mengapa unit Anda tidak memiliki asset ini atau kenapa perlu meminjam dari unit lain
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            disabled={loading}
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
            disabled={loading || loadingAssets}
          >
            {loading ? 'Mengirim Request...' : 'Ajukan Request'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AssetRequestForm;
