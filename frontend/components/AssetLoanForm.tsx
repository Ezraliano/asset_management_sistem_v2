import React, { useState } from 'react';
import { Asset } from '../types';

interface AssetLoanFormProps {
  asset: Asset;
  onSubmit: (loanData: any) => void;
  onCancel: () => void;
  loading?: boolean;
}

const AssetLoanForm: React.FC<AssetLoanFormProps> = ({ asset, onSubmit, onCancel, loading = false }) => {
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [purpose, setPurpose] = useState('');
  const [error, setError] = useState<string | null>(null);

  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!expectedReturnDate || !purpose) {
      setError('Mohon isi semua field.');
      return;
    }

    // Call parent's onSubmit with loan data
    onSubmit({
      asset_id: asset.id,
      expected_return_date: expectedReturnDate,
      purpose: purpose,
    });
  };

  return (
    <div className="bg-white p-6 rounded-lg">
      <h3 className="text-xl font-bold mb-6 text-gray-800">Form Peminjaman Asset</h3>

      {/* Asset Information */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="font-semibold text-gray-700 mb-3">Detail Asset yang Dipinjam</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="font-medium text-gray-600">Nama Asset:</span>
            <p className="text-gray-900 mt-1">{asset.name}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Kode Asset:</span>
            <p className="text-gray-900 mt-1 font-mono">{asset.asset_tag}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Kategori:</span>
            <p className="text-gray-900 mt-1">{asset.category}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Unit:</span>
            <p className="text-gray-900 mt-1">{asset.unit?.name || 'N/A'}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="expectedReturnDate" className="block text-sm font-medium text-gray-700 mb-2">
            Tanggal Pengembalian yang Diharapkan *
          </label>
          <input
            type="date"
            id="expectedReturnDate"
            min={getTodayString()}
            value={expectedReturnDate}
            onChange={(e) => setExpectedReturnDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Pilih tanggal ketika Anda berencana mengembalikan asset</p>
        </div>

        <div>
          <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 mb-2">
            Tujuan Peminjaman *
          </label>
          <textarea
            id="purpose"
            rows={4}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Jelaskan tujuan peminjaman asset ini..."
            required
          />
          <p className="text-xs text-gray-500 mt-1">Berikan alasan yang jelas untuk peminjaman ini</p>
        </div>
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        <div className="flex justify-end gap-2">
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
            disabled={loading}
          >
            {loading ? 'Mengirim...' : 'Ajukan Peminjaman'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AssetLoanForm;
