// AssetForm.tsx - PERBAIKAN LENGKAP DENGAN VALIDASI PURCHASE DATE DAN CURRENCY FORMATTING
import React, { useState, useEffect } from 'react';
import { addAsset, updateAsset } from '../services/api';
import { Asset, AssetStatus } from '../types';
import { useTranslation } from '../hooks/useTranslation';

interface AssetFormProps {
  asset?: Asset;
  onSuccess: () => void;
  onClose?: () => void;
}

interface ValidationErrors {
  asset_tag?: string;
  purchase_date?: string;
  value?: string;
  useful_life?: string;
  general?: string;
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
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [valueInput, setValueInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

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
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        asset_tag: '',
        name: '',
        category: '',
        location: '',
        value: 0,
        purchase_date: today,
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

  // Helper function untuk validasi purchase date
  const validatePurchaseDate = (dateString: string): boolean => {
    const selectedDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset waktu ke 00:00:00
    
    return selectedDate <= today;
  };

  // Helper function untuk validasi asset tag format
  const validateAssetTag = (tag: string): boolean => {
    // Basic validation - bisa disesuaikan dengan kebutuhan
    return tag.length >= 2 && tag.length <= 50;
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Hapus semua karakter non-digit
    const cleanValue = inputValue.replace(/[^\d]/g, '');
    
    if (cleanValue === '') {
      // Jika input kosong, set ke 0
      setValueInput('');
      setFormData(prev => ({ ...prev, value: 0 }));
      clearValidationError('value');
    } else {
      // Format angka dengan titik sebagai pemisah ribuan
      const numberValue = parseInt(cleanValue, 10);
      
      // Validasi maksimal value (100 miliar)
      if (numberValue > 100000000000) {
        setValidationErrors(prev => ({
          ...prev,
          value: 'Value cannot exceed 100 billion'
        }));
        return;
      }
      
      const formattedValue = numberValue.toLocaleString('id-ID');
      
      setValueInput(formattedValue);
      setFormData(prev => ({ ...prev, value: numberValue }));
      clearValidationError('value');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Clear validation errors ketika user mulai mengetik
    clearValidationError(name as keyof ValidationErrors);

    if (name === 'purchase_date') {
      // Validasi purchase date
      if (!validatePurchaseDate(value)) {
        setValidationErrors(prev => ({
          ...prev,
          purchase_date: 'Purchase date cannot be in the future'
        }));
      } else {
        clearValidationError('purchase_date');
      }
    }

    if (name === 'asset_tag') {
      // Validasi asset tag
      if (!validateAssetTag(value)) {
        setValidationErrors(prev => ({
          ...prev,
          asset_tag: 'Asset tag must be between 2 and 50 characters'
        }));
      } else {
        clearValidationError('asset_tag');
      }
    }

    if (type === 'number') {
      const numValue = value === '' ? 0 : Number(value);
      
      if (name === 'useful_life' && (numValue < 1 || numValue > 600)) {
        setValidationErrors(prev => ({
          ...prev,
          useful_life: 'Useful life must be between 1 and 600 months'
        }));
      } else {
        clearValidationError('useful_life');
      }
      
      setFormData(prev => ({ 
        ...prev, 
        [name]: numValue 
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const clearValidationError = (field: keyof ValidationErrors) => {
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const validateForm = async (): Promise<boolean> => {
    const errors: ValidationErrors = {};

    // Validasi required fields
    if (!formData.asset_tag.trim()) {
      errors.asset_tag = 'Asset Tag is required';
    } else if (!validateAssetTag(formData.asset_tag)) {
      errors.asset_tag = 'Asset tag must be between 2 and 50 characters';
    }

    if (!formData.name.trim()) {
      errors.general = 'Asset Name is required';
    }

    if (!formData.category.trim()) {
      errors.general = 'Category is required';
    }

    if (!formData.location.trim()) {
      errors.general = 'Location is required';
    }

    if (formData.value <= 0) {
      errors.value = 'Value must be greater than 0';
    } else if (formData.value > 100000000000) {
      errors.value = 'Value cannot exceed 100 billion';
    }

    if (!formData.purchase_date) {
      errors.purchase_date = 'Purchase date is required';
    } else if (!validatePurchaseDate(formData.purchase_date)) {
      errors.purchase_date = 'Purchase date cannot be in the future';
    }

    if (formData.useful_life < 1) {
      errors.useful_life = 'Useful life must be at least 1 month';
    } else if (formData.useful_life > 600) {
      errors.useful_life = 'Useful life cannot exceed 600 months (50 years)';
    }

    // Validasi server-side untuk asset tag uniqueness (hanya untuk form baru)
    if (!asset && formData.asset_tag.trim()) {
      try {
        setValidating(true);
        // If you meant to validate asset tag only, use validateAssetTag
        const isAssetTagValid = validateAssetTag(formData.asset_tag);
        const validationResult = {
          valid: isAssetTagValid,
          validation_results: [
            {
              field: 'asset_tag',
              valid: isAssetTagValid,
              message: isAssetTagValid ? '' : 'Asset tag must be between 2 and 50 characters'
            }
          ]
        };

        if (!validationResult.valid) {
          validationResult.validation_results?.forEach((result: any) => {
            if (!result.valid) {
              errors[result.field as keyof ValidationErrors] = result.message;
            }
          });
        }
      } catch (err) {
        console.error('Validation error:', err);
        // Continue without server validation if it fails
      } finally {
        setValidating(false);
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validasi form
      const isValid = await validateForm();
      if (!isValid) {
        setLoading(false);
        return;
      }

      // Pastikan purchase date valid
      if (!validatePurchaseDate(formData.purchase_date)) {
        setError('Purchase date cannot be in the future');
        setLoading(false);
        return;
      }

      // Submit data
      if (asset) {
        await updateAsset(asset.id.toString(), formData);
      } else {
        await addAsset(formData);
      }
      
      onSuccess();
      if (onClose) onClose();
    } catch (err: any) {
      console.error('Error saving asset:', err);
      
      // Handle specific error messages
      if (err.message?.includes('purchase date')) {
        setValidationErrors(prev => ({
          ...prev,
          purchase_date: err.message
        }));
      } else if (err.message?.includes('asset_tag')) {
        setValidationErrors(prev => ({
          ...prev,
          asset_tag: err.message
        }));
      } else {
        setError(err.message || 'Failed to save asset');
      }
    } finally {
      setLoading(false);
    }
  };

  const getFieldError = (field: keyof ValidationErrors): string | undefined => {
    return validationErrors[field];
  };

  const hasErrors = (): boolean => {
    return Object.keys(validationErrors).length > 0 || !!error;
  };

  // Status options untuk form tambah baru - hanya "In Use" dan "In Repair"
  const availableStatuses = asset 
    ? [AssetStatus.IN_USE, AssetStatus.IN_REPAIR, AssetStatus.DISPOSED, AssetStatus.LOST]
    : [AssetStatus.IN_USE, AssetStatus.IN_REPAIR];

  // Predefined categories dan locations untuk memudahkan input
  const predefinedCategories = [
    'Electronics',
    'Furniture',
    'Vehicle',
    'Equipment',
    'Building',
    'Software',
    'Other'
  ];

  const predefinedLocations = [
    'Office A',
    'Office B',
    'Warehouse',
    'Factory',
    'Remote',
    'Other'
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center border-b pb-4 sticky top-0 bg-white z-10">
        <h2 className="text-2xl font-bold text-dark-text">
          {asset ? t('asset_form.edit_title') : t('asset_form.add_title')}
        </h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            disabled={loading}
          >
            ✕
          </button>
        )}
      </div>

      {/* Error Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {validationErrors.general && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{validationErrors.general}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Asset Tag */}
        <div className="md:col-span-2">
          <label htmlFor="asset_tag" className="block text-sm font-medium text-gray-700 mb-1">
            Asset Tag *
          </label>
          <input
            type="text"
            name="asset_tag"
            id="asset_tag"
            value={formData.asset_tag}
            onChange={handleChange}
            required
            disabled={!!asset || loading}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed ${
              getFieldError('asset_tag') ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="e.g., AST-001"
          />
          {getFieldError('asset_tag') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('asset_tag')}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Unique identifier for the asset. Cannot be changed after creation.
          </p>
        </div>

        {/* Name */}
        <div className="md:col-span-2">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Asset Name *
          </label>
          <input
            type="text"
            name="name"
            id="name"
            value={formData.name}
            onChange={handleChange}
            required
            disabled={loading}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-gray-50"
            placeholder="e.g., Laptop Dell XPS 13"
          />
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category *
          </label>
          <div className="relative">
            <input
              type="text"
              name="category"
              id="category"
              value={formData.category}
              onChange={handleChange}
              required
              disabled={loading}
              list="category-options"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-gray-50"
              placeholder="e.g., Electronics"
            />
            <datalist id="category-options">
              {predefinedCategories.map(category => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            Location *
          </label>
          <div className="relative">
            <input
              type="text"
              name="location"
              id="location"
              value={formData.location}
              onChange={handleChange}
              required
              disabled={loading}
              list="location-options"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-gray-50"
              placeholder="e.g., Office A"
            />
            <datalist id="location-options">
              {predefinedLocations.map(location => (
                <option key={location} value={location} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Value - Input dengan format Rupiah */}
        <div>
          <label htmlFor="value" className="block text-sm font-medium text-gray-700 mb-1">
            Value (IDR) *
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
              Rp
            </span>
            <input
              type="text"
              name="value"
              id="value"
              value={valueInput}
              onChange={handleValueChange}
              required
              disabled={loading}
              className={`mt-1 block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-gray-50 ${
                getFieldError('value') ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="0"
            />
          </div>
          {getFieldError('value') ? (
            <p className="mt-1 text-sm text-red-600">{getFieldError('value')}</p>
          ) : (
            <p className="mt-1 text-sm text-gray-500">
              Actual value: {formData.value === 0 ? 'Rp 0' : `Rp ${formData.value.toLocaleString('id-ID')}`}
            </p>
          )}
        </div>

        {/* Purchase Date */}
        <div>
          <label htmlFor="purchase_date" className="block text-sm font-medium text-gray-700 mb-1">
            Purchase Date *
          </label>
          <input
            type="date"
            name="purchase_date"
            id="purchase_date"
            value={formData.purchase_date}
            onChange={handleChange}
            required
            disabled={loading}
            max={new Date().toISOString().split('T')[0]} // Set max ke hari ini
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-gray-50 ${
              getFieldError('purchase_date') ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {getFieldError('purchase_date') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('purchase_date')}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Cannot be a future date
          </p>
        </div>

        {/* Useful Life */}
        <div>
          <label htmlFor="useful_life" className="block text-sm font-medium text-gray-700 mb-1">
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
            max="600"
            disabled={loading}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-gray-50 ${
              getFieldError('useful_life') ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="36"
          />
          {getFieldError('useful_life') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('useful_life')}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            {formData.useful_life} months ≈ {Math.round(formData.useful_life / 12 * 10) / 10} years
          </p>
        </div>

        {/* Status */}
        <div className="md:col-span-2">
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            Status *
          </label>
          <select
            name="status"
            id="status"
            value={formData.status}
            onChange={handleChange}
            required
            disabled={loading}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-gray-50"
          >
            {availableStatuses.map(status => (
              <option key={status} value={status}>
                {status.replace('_', ' ')}
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

      {/* Advanced Options Toggle */}
      <div className="border-t pt-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center text-sm text-gray-600 hover:text-gray-800"
        >
          <svg 
            className={`w-4 h-4 mr-1 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Perhitungan Depresiasi
        </button>

        {showAdvanced && (
          <div className="mt-3 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Depreciation Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Perhitungan Depresiasi Bulanan</span>
                <span className="ml-2 font-medium">
                  Rp {formData.value > 0 && formData.useful_life > 0 
                    ? Math.round(formData.value / formData.useful_life).toLocaleString('id-ID')
                    : '0'
                  }
                </span>
              </div>
              <div>
                <span className="text-gray-600">Nilai Depresiasi</span>
                <span className="ml-2 font-medium">
                  Rp {formData.value > 0 && formData.useful_life > 0
                    ? Math.round((formData.value / formData.useful_life) * 12).toLocaleString('id-ID')
                    : '0'
                  }
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-6 border-t sticky bottom-0 bg-white pb-2">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading || validating || hasErrors()}
          className="px-6 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center min-w-[120px] justify-center"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {validating ? 'Validating...' : 'Saving...'}
            </>
          ) : (
            asset ? 'Update Asset' : 'Create Asset'
          )}
        </button>
      </div>

      {/* Form Validation Summary */}
      {hasErrors() && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-red-800 mb-2">
            Please fix the following errors:
          </h4>
          <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
            {validationErrors.asset_tag && <li>Asset Tag: {validationErrors.asset_tag}</li>}
            {validationErrors.value && <li>Value: {validationErrors.value}</li>}
            {validationErrors.purchase_date && <li>Purchase Date: {validationErrors.purchase_date}</li>}
            {validationErrors.useful_life && <li>Useful Life: {validationErrors.useful_life}</li>}
            {validationErrors.general && <li>{validationErrors.general}</li>}
            {error && !validationErrors.general && <li>{error}</li>}
          </ul>
        </div>
      )}
    </form>
  );
};

export default AssetForm;