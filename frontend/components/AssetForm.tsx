// AssetForm.tsx - PERBAIKAN LENGKAP DENGAN CURRENCY FORMATTING
import React, { useState, useEffect } from 'react';
import { addAsset, updateAsset } from '../services/api';
import { Asset, AssetStatus } from '../types';
import { useTranslation } from '../hooks/useTranslation';

interface AssetFormProps {
  asset?: Asset;
  onSuccess: () => void;
  onClose?: () => void;
}

const AssetForm: React.FC<AssetFormProps> = ({ asset, onSuccess, onClose }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    asset_tag: '',
    name: '',
    category: '',
    location: '',
    value: 0,
    purchase_date: '',
    useful_life: 36, // Default 3 tahun
    status: AssetStatus.IN_USE,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [valueInput, setValueInput] = useState(''); // State terpisah untuk input value

  useEffect(() => {
    if (asset) {
      // Map data dari asset ke formData
      setFormData({
        asset_tag: asset.asset_tag,
        name: asset.name,
        category: asset.category,
        location: asset.location,
        value: asset.value,
        purchase_date: asset.purchase_date,
        useful_life: asset.useful_life,
        status: asset.status as AssetStatus,
      });
      // Set value input dengan format Rupiah
      setValueInput(formatNumberToRupiahInput(asset.value));
    } else {
      // Set default values untuk form baru
      setFormData({
        asset_tag: '',
        name: '',
        category: '',
        location: '',
        value: 0,
        purchase_date: new Date().toISOString().split('T')[0],
        useful_life: 36,
        status: AssetStatus.IN_USE,
      });
      setValueInput('');
    }
  }, [asset]);

  // Helper function untuk format Rupiah di input
  const formatNumberToRupiahInput = (number: number): string => {
    if (number === 0) return '';
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Helper function untuk parse Rupiah ke number
  const parseRupiahToNumber = (rupiahString: string): number => {
    // Hapus semua karakter non-digit kecuali titik
    const cleanString = rupiahString.replace(/[^\d]/g, '');
    return cleanString ? parseInt(cleanString, 10) : 0;
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Hapus semua karakter non-digit kecuali titik
    const cleanValue = inputValue.replace(/[^\d]/g, '');
    
    if (cleanValue === '') {
      // Jika input kosong, set ke 0
      setValueInput('');
      setFormData(prev => ({ ...prev, value: 0 }));
    } else {
      // Format angka dengan titik sebagai pemisah ribuan
      const numberValue = parseInt(cleanValue, 10);
      const formattedValue = numberValue.toLocaleString('id-ID');
      
      setValueInput(formattedValue);
      setFormData(prev => ({ ...prev, value: numberValue }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      setFormData(prev => ({ 
        ...prev, 
        [name]: value === '' ? 0 : Number(value) 
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validasi required fields
      if (!formData.asset_tag.trim()) {
        setError('Asset Tag is required');
        setLoading(false);
        return;
      }

      if (!formData.name.trim()) {
        setError('Asset Name is required');
        setLoading(false);
        return;
      }

      if (formData.value <= 0) {
        setError('Value must be greater than 0');
        setLoading(false);
        return;
      }

      if (asset) {
        // Update existing asset
        await updateAsset(asset.id.toString(), formData);
      } else {
        // Create new asset
        await addAsset(formData);
      }
      
      onSuccess();
      if (onClose) onClose();
    } catch (err: any) {
      console.error('Error saving asset:', err);
      setError(err.message || 'Failed to save asset');
    } finally {
      setLoading(false);
    }
  };

  // Status options untuk form tambah baru - hanya "In Use" dan "In Repair"
  const availableStatuses = asset 
    ? [AssetStatus.IN_USE, AssetStatus.IN_REPAIR, AssetStatus.DISPOSED, AssetStatus.LOST] // Edit: semua status
    : [AssetStatus.IN_USE, AssetStatus.IN_REPAIR]; // Tambah baru: hanya 2 status

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-2xl font-bold text-dark-text">
          {asset ? t('asset_form.edit_title') : t('asset_form.add_title')}
        </h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Asset Tag */}
        <div className="md:col-span-2">
          <label htmlFor="asset_tag" className="block text-sm font-medium text-gray-700">
            Asset Tag *
          </label>
          <input
            type="text"
            name="asset_tag"
            id="asset_tag"
            value={formData.asset_tag}
            onChange={handleChange}
            required
            disabled={!!asset} // Disable edit untuk existing asset
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-gray-100"
            placeholder="e.g., AST-001"
          />
        </div>

        {/* Name */}
        <div className="md:col-span-2">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Asset Name *
          </label>
          <input
            type="text"
            name="name"
            id="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            placeholder="e.g., Laptop Dell XPS 13"
          />
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
            Category *
          </label>
          <input
            type="text"
            name="category"
            id="category"
            value={formData.category}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            placeholder="e.g., Electronics"
          />
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700">
            Location *
          </label>
          <input
            type="text"
            name="location"
            id="location"
            value={formData.location}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            placeholder="e.g., Office A"
          />
        </div>

        {/* Value - PERBAIKAN BESAR: Input dengan format Rupiah */}
        <div>
          <label htmlFor="value" className="block text-sm font-medium text-gray-700">
            Value (IDR) *
          </label>
          <input
            type="text"
            name="value"
            id="value"
            value={valueInput}
            onChange={handleValueChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            placeholder="0"
          />
          <p className="mt-1 text-sm text-gray-500">
            Actual value: {formData.value === 0 ? 'Rp 0' : `Rp ${formData.value.toLocaleString('id-ID')}`}
          </p>
        </div>

        {/* Purchase Date */}
        <div>
          <label htmlFor="purchase_date" className="block text-sm font-medium text-gray-700">
            Purchase Date *
          </label>
          <input
            type="date"
            name="purchase_date"
            id="purchase_date"
            value={formData.purchase_date}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>

        {/* Useful Life */}
        <div>
          <label htmlFor="useful_life" className="block text-sm font-medium text-gray-700">
            Useful Life (months) *
          </label>
          <input
            type="number"
            name="useful_life"
            id="useful_life"
            value={formData.useful_life}
            onChange={handleChange}
            required
            min="1"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            placeholder="36"
          />
        </div>

        {/* Status */}
        <div className="md:col-span-2">
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
            Status *
          </label>
          <select
            name="status"
            id="status"
            value={formData.status}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          >
            {availableStatuses.map(status => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          {!asset && (
            <p className="mt-1 text-sm text-gray-500">
              For new assets, only "In Use" and "In Repair" status are available
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-6 border-t">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark disabled:opacity-50 flex items-center"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            asset ? 'Update Asset' : 'Create Asset'
          )}
        </button>
      </div>
    </form>
  );
};

export default AssetForm;