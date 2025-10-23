import React, { useState, useEffect } from 'react';
import { Asset, Unit } from '../types';
import { requestAssetTransfer, getUnits } from '../services/api';

interface MoveAssetFormProps {
  asset: Asset;
  onSuccess: () => void;
  onClose: () => void;
}

const MoveAssetForm: React.FC<MoveAssetFormProps> = ({ asset, onSuccess, onClose }) => {
  const [toUnitId, setToUnitId] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [units, setUnits] = useState<Unit[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    setIsLoading(true);
    try {
      const unitsData = await getUnits();
      // Filter out current unit
      const filteredUnits = unitsData.filter((unit: Unit) =>
        unit.id !== asset.unit_id && unit.is_active
      );
      setUnits(filteredUnits);
    } catch (error) {
      console.error('Failed to fetch units:', error);
      alert('Gagal memuat daftar unit');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!toUnitId || toUnitId === 0) {
      alert('Silakan pilih unit tujuan');
      return;
    }

    setIsSubmitting(true);
    try {
      await requestAssetTransfer({
        asset_id: asset.id,
        to_unit_id: toUnitId,
        notes: notes || undefined,
      });

      alert('Request perpindahan asset berhasil dibuat. Menunggu validasi dari unit penerima.');
      onSuccess();
    } catch (error: any) {
      console.error('Failed to request asset transfer:', error);
      alert(error.message || 'Gagal membuat request perpindahan asset');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold">Request Perpindahan Asset</h2>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Asset:</strong> {asset.name} ({asset.asset_tag})
        </p>
        <p className="text-sm text-blue-800">
          <strong>Unit Saat Ini:</strong> {asset.unit?.name || '-'}
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-4">
          <p className="text-gray-600">Memuat daftar unit...</p>
        </div>
      ) : (
        <>
          <div>
            <label htmlFor="toUnitId" className="block text-sm font-medium text-gray-700 mb-2">
              Unit Tujuan <span className="text-red-500">*</span>
            </label>
            <select
              id="toUnitId"
              value={toUnitId}
              onChange={(e) => setToUnitId(Number(e.target.value))}
              required
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            >
              <option value={0}>-- Pilih Unit Tujuan --</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Catatan (Opsional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              placeholder="Alasan perpindahan, kondisi asset, dll..."
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>Perhatian:</strong> Request ini akan menunggu validasi dari unit penerima.
              Asset akan berpindah setelah disetujui.
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || units.length === 0}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors disabled:bg-gray-400"
            >
              {isSubmitting ? 'Mengirim Request...' : 'Kirim Request'}
            </button>
          </div>
        </>
      )}
    </form>
  );
};

export default MoveAssetForm;