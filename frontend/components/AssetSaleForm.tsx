import React, { useState, useEffect } from 'react';
import { createAssetSale, getAvailableAssetsForSale } from '../services/api';
import { Asset, User } from '../types';
import { formatToRupiah, unformatRupiah } from '../utils/formatters';

interface AssetSaleFormProps {
  user: User;
  onSuccess: () => void;
  onCancel: () => void;
}

const AssetSaleForm: React.FC<AssetSaleFormProps> = ({ user, onSuccess, onCancel }) => {
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(true);

  // Form fields
  const [assetId, setAssetId] = useState<number | null>(null);
  const [salePrice, setSalePrice] = useState('');
  const [displaySalePrice, setDisplaySalePrice] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [buyerName, setBuyerName] = useState('');
  const [buyerContact, setBuyerContact] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [saleProof, setSaleProof] = useState<File | null>(null);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAvailableAssets();
  }, []);

  const fetchAvailableAssets = async () => {
    setLoadingAssets(true);
    try {
      const assets = await getAvailableAssetsForSale();
      setAvailableAssets(assets);
    } catch (error: any) {
      console.error('Error fetching available assets:', error);
      alert('Gagal memuat daftar aset yang tersedia');
    } finally {
      setLoadingAssets(false);
    }
  };

  const handleSalePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const numericValue = unformatRupiah(rawValue);
    
    setSalePrice(numericValue.toString());
    
    if (rawValue === '' || rawValue === 'Rp') {
      setDisplaySalePrice('');
    } else {
      setDisplaySalePrice(formatToRupiah(numericValue));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!assetId) {
      newErrors.assetId = 'Pilih aset yang akan dijual';
    }

    const price = parseFloat(salePrice);
    if (isNaN(price) || price <= 0) {
      newErrors.salePrice = 'Harga jual harus lebih dari 0';
    }

    if (!saleDate) {
      newErrors.saleDate = 'Tanggal jual harus diisi';
    } else {
      const selectedDate = new Date(saleDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate > today) {
        newErrors.saleDate = 'Tanggal jual tidak boleh di masa depan';
      }
    }

    if (!buyerName.trim()) {
      newErrors.buyerName = 'Nama pembeli harus diisi';
    }

    if (!reason.trim()) {
      newErrors.reason = 'Alasan penjualan harus diisi';
    } else if (reason.trim().length < 10) {
      newErrors.reason = 'Alasan penjualan minimal 10 karakter';
    }

    if (saleProof && saleProof.size > 5 * 1024 * 1024) {
      newErrors.saleProof = 'Ukuran file maksimal 5MB';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

      if (!validTypes.includes(file.type)) {
        setErrors({ ...errors, saleProof: 'Tipe file harus JPG, PNG, atau PDF' });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...errors, saleProof: 'Ukuran file maksimal 5MB' });
        return;
      }

      setSaleProof(file);
      setErrors({ ...errors, saleProof: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('asset_id', assetId!.toString());
      formData.append('sale_price', salePrice);
      formData.append('sale_date', saleDate);
      formData.append('buyer_name', buyerName.trim());
      if (buyerContact.trim()) {
        formData.append('buyer_contact', buyerContact.trim());
      }
      formData.append('reason', reason.trim());
      if (notes.trim()) {
        formData.append('notes', notes.trim());
      }
      if (saleProof) {
        formData.append('sale_proof', saleProof);
      }

      await createAssetSale(formData);
      alert('Aset berhasil dijual!');
      onSuccess();
    } catch (error: any) {
      console.error('Error creating asset sale:', error);
      alert(`Gagal menjual aset: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const selectedAsset = availableAssets.find(a => a.id === assetId);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Jual Aset</h2>

      {loadingAssets ? (
        <div className="text-center py-8 text-gray-500">Memuat daftar aset...</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Asset Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pilih Aset <span className="text-red-500">*</span>
            </label>
            <select
              value={assetId || ''}
              onChange={(e) => setAssetId(e.target.value ? Number(e.target.value) : null)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.assetId ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={loading}
            >
              <option value="">-- Pilih Aset --</option>
              {availableAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.asset_tag} - {asset.name} ({asset.category})
                  {asset.unit && ` - ${asset.unit.name}`}
                </option>
              ))}
            </select>
            {errors.assetId && (
              <p className="mt-1 text-sm text-red-500">{errors.assetId}</p>
            )}
            {availableAssets.length === 0 && (
              <p className="mt-1 text-sm text-yellow-600">
                Tidak ada aset yang tersedia untuk dijual
              </p>
            )}
          </div>

          {/* Asset Info (if selected) */}
          {selectedAsset && (
            <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
              <div className="text-sm">
                <div className="font-medium text-gray-800">Informasi Aset:</div>
                <div className="mt-1 text-gray-600">
                  <div>Nilai Perolehan: {formatToRupiah(selectedAsset.value)}</div>
                  <div>Status: {selectedAsset.status}</div>
                  {selectedAsset.unit && <div>Unit: {selectedAsset.unit.name}</div>}
                </div>
              </div>
            </div>
          )}

          {/* Sale Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Harga Jual <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={displaySalePrice}
              onChange={handleSalePriceChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.salePrice ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Contoh: Rp1.000.000"
              disabled={loading}
            />
            {errors.salePrice && (
              <p className="mt-1 text-sm text-red-500">{errors.salePrice}</p>
            )}
          </div>

          {/* Sale Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal Jual <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.saleDate ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={loading}
            />
            {errors.saleDate && (
              <p className="mt-1 text-sm text-red-500">{errors.saleDate}</p>
            )}
          </div>

          {/* Buyer Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Pembeli <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.buyerName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Masukkan nama pembeli"
              disabled={loading}
            />
            {errors.buyerName && (
              <p className="mt-1 text-sm text-red-500">{errors.buyerName}</p>
            )}
          </div>

          {/* Buyer Contact */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kontak Pembeli
            </label>
            <input
              type="text"
              value={buyerContact}
              onChange={(e) => setBuyerContact(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="No. HP / Email pembeli (opsional)"
              disabled={loading}
            />
          </div>

          {/* Sale Proof Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bukti Jual
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/jpg,application/pdf"
              onChange={handleFileChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.saleProof ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500">
              Format: JPG, PNG, PDF (Maks. 5MB)
            </p>
            {errors.saleProof && (
              <p className="mt-1 text-sm text-red-500">{errors.saleProof}</p>
            )}
            {saleProof && !errors.saleProof && (
              <p className="mt-1 text-sm text-green-600">
                File terpilih: {saleProof.name}
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alasan Penjualan <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.reason ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Jelaskan alasan penjualan aset ini (minimal 10 karakter)"
              disabled={loading}
            />
            {errors.reason && (
              <p className="mt-1 text-sm text-red-500">{errors.reason}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {reason.length} karakter
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catatan Tambahan
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Catatan tambahan (opsional)"
              disabled={loading}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition"
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition disabled:bg-gray-400"
              disabled={loading || availableAssets.length === 0}
            >
              {loading ? 'Memproses...' : 'Jual Aset'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AssetSaleForm;
