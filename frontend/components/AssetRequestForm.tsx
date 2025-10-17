import React, { useState } from 'react';
import { Unit } from '../types';

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
  const [assetName, setAssetName] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!assetName || !neededDate || !startTime || !endTime || !expectedReturnDate || !purpose || !reason) {
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
      asset_name: assetName,
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
        {/* Asset Name Input */}
        <div>
          <label htmlFor="assetName" className="block text-sm font-medium text-gray-700 mb-2">
            Masukkan Asset Yang Dibutuhkan *
          </label>
          <input
            type="text"
            id="assetName"
            value={assetName}
            onChange={(e) => setAssetName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Masukkan nama asset yang dibutuhkan..."
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Ketik nama asset yang Anda butuhkan
          </p>
        </div>

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
            Tujuan Peminjaman Asset *
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
            Alasan Request Peminjaman Asset *
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
            disabled={loading}
          >
            {loading ? 'Mengirim Request...' : 'Ajukan Request'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AssetRequestForm;
