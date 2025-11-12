// AssetForm.tsx - DENGAN KALKULASI DEPRESIASI DINAMIS DAN SATU TOMBOL CLOSE
import React, { useState, useEffect, useMemo } from 'react';
import { addAsset, updateAsset, getUnits, getCurrentUser } from '../services/api';
import { Asset, AssetStatus, Unit, User } from '../types';
import { useTranslation } from '../hooks/useTranslation';

interface AssetFormProps {
  asset?: Asset & { accumulated_depreciation?: number };
  onSuccess: () => void;
  onClose?: () => void;
}

interface ValidationErrors {
  purchase_date?: string;
  value?: string;
  useful_life?: string;
  general?: string;
}

const AssetForm: React.FC<AssetFormProps> = ({ asset, onSuccess, onClose }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    unit_id: null as number | null,
    value: 0,
    purchase_date: '',
    useful_life: 12,
    status: AssetStatus.AVAILABLE,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [valueInput, setValueInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isUnitLocked, setIsUnitLocked] = useState(false);

  useEffect(() => {
    // Fetch units and current user
    const fetchData = async () => {
      try {
        const [fetchedUnits, user] = await Promise.all([
          getUnits(),
          getCurrentUser()
        ]);
        setUnits(fetchedUnits);
        setCurrentUser(user);

        // Check if user is Admin Unit - auto-fill and lock unit field
        const isAdminUnit = user && user.role === 'unit' && user.unit_id;
        if (isAdminUnit) {
          setIsUnitLocked(true);
        }

        // Set form data after knowing user role
        if (asset) {
          setFormData({
            name: asset.name,
            category: asset.category,
            unit_id: asset.unit_id || null,
            value: asset.value,
            purchase_date: asset.purchase_date.split(' ')[0],
            useful_life: asset.useful_life,
            status: asset.status as AssetStatus,
          });
          setValueInput(formatNumberToRupiahInput(asset.value));
        } else {
          const today = new Date().toISOString().split('T')[0];
          setFormData({
            name: '',
            category: '',
            unit_id: isAdminUnit ? (user.unit_id as number) : null,
            value: 0,
            purchase_date: today,
            useful_life: 12,
            status: AssetStatus.AVAILABLE,
          });
          setValueInput('');
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      }
    };
    fetchData();
  }, [asset]);

  // ✅ KALKULASI DEPRESIASI DINAMIS
  const calculatedDepreciation = useMemo(() => {
    const { value, useful_life, purchase_date } = formData;

    if (!purchase_date || useful_life <= 0 || value <= 0) {
      return { monthly: 0, accumulated: 0 };
    }

    const monthly = value / useful_life;
    const purchaseDate = new Date(purchase_date);
    const now = new Date();

    if (purchaseDate > now) {
      return { monthly, accumulated: 0 };
    }

    let elapsedMonths = (now.getFullYear() - purchaseDate.getFullYear()) * 12;
    elapsedMonths -= purchaseDate.getMonth();
    elapsedMonths += now.getMonth();
    
    const depreciatedMonths = Math.max(0, Math.min(elapsedMonths, useful_life));
    const accumulated = monthly * depreciatedMonths;

    return { monthly, accumulated };
  }, [formData.value, formData.useful_life, formData.purchase_date]);

  const formatNumberToRupiahInput = (number: number): string => {
    if (number === 0) return '';
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const validatePurchaseDate = (dateString: string): boolean => {
    const selectedDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate <= today;
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const cleanValue = inputValue.replace(/[^\d]/g, '');
    
    if (cleanValue === '') {
      setValueInput('');
      setFormData(prev => ({ ...prev, value: 0 }));
      clearValidationError('value');
    } else {
      const numberValue = parseInt(cleanValue, 10);
      if (numberValue > 100000000000) {
        setValidationErrors(prev => ({ ...prev, value: 'Value cannot exceed 100 billion' }));
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
    clearValidationError(name as keyof ValidationErrors);

    if (name === 'purchase_date') {
      if (!validatePurchaseDate(value)) {
        setValidationErrors(prev => ({ ...prev, purchase_date: 'Purchase date cannot be in the future' }));
      } else {
        clearValidationError('purchase_date');
      }
    }

    if (type === 'number') {
      const numValue = value === '' ? 0 : Number(value);
      if (name === 'useful_life' && (numValue < 1 || numValue > 600)) {
        setValidationErrors(prev => ({ ...prev, useful_life: 'Useful life must be between 1 and 600 months' }));
      } else {
        clearValidationError('useful_life');
      }
      setFormData(prev => ({ ...prev, [name]: numValue }));
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

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    if (!formData.name.trim()) errors.general = 'Asset Name is required';
    if (!formData.category.trim()) errors.general = 'Category is required';
    if (!formData.unit_id) errors.general = 'Unit is required';

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

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError('');

  try {
    const isValid = validateForm();
    if (!isValid) {
      setLoading(false);
      return;
    }

    const dataToSubmit = { ...formData };

    // ✅ PERBAIKAN: Handle waktu dengan benar untuk timezone Asia/Jakarta
    if (!asset) {
      // Untuk asset baru, gunakan waktu 19:30 WIB
      const purchaseDate = new Date(dataToSubmit.purchase_date);
      
      // Set waktu ke 19:30 WIB (12:30 UTC)
      const jakartaTime = new Date(purchaseDate.getTime() + (7 * 60 * 60 * 1000)); // Convert to UTC+7
      jakartaTime.setHours(19, 30, 0, 0);
      
      // Convert back to ISO string dengan timezone
      const utcTime = new Date(jakartaTime.getTime() - (7 * 60 * 60 * 1000));
      dataToSubmit.purchase_date = utcTime.toISOString().replace('Z', '');
      
      console.log('Purchase date with time:', dataToSubmit.purchase_date);
    } else {
      // Jika edit dan tanggal tidak berubah, pertahankan waktu asli
      if (dataToSubmit.purchase_date === asset.purchase_date.split(' ')[0]) {
        dataToSubmit.purchase_date = asset.purchase_date;
      } else {
        // Jika tanggal diubah, gunakan waktu 19:30 untuk tanggal baru
        const purchaseDate = new Date(dataToSubmit.purchase_date);
        const jakartaTime = new Date(purchaseDate.getTime() + (7 * 60 * 60 * 1000));
        jakartaTime.setHours(19, 30, 0, 0);
        const utcTime = new Date(jakartaTime.getTime() - (7 * 60 * 60 * 1000));
        dataToSubmit.purchase_date = utcTime.toISOString().replace('Z', '');
      }
    }

    if (asset) {
      await updateAsset(asset.id.toString(), dataToSubmit);
    } else {
      await addAsset(dataToSubmit);
    }
    
    onSuccess();
    if (onClose) onClose();
  } catch (err: any) {
    console.error('Error saving asset:', err);
    if (err.message?.includes('purchase date')) {
      setValidationErrors(prev => ({ ...prev, purchase_date: err.message }));
    } else {
      setError(err.message || 'Failed to save asset');
    }
  } finally {
    setLoading(false);
  }
};

  const getFieldError = (field: keyof ValidationErrors): string | undefined => validationErrors[field];
  const hasErrors = (): boolean => Object.keys(validationErrors).length > 0 || !!error;

  const availableStatuses = asset
    ? [AssetStatus.AVAILABLE, AssetStatus.TERPINJAM, AssetStatus.TERJUAL, AssetStatus.LOST]
    : [AssetStatus.AVAILABLE, AssetStatus.TERPINJAM];

  const predefinedCategories = ['Electronics', 'Furniture', 'Vehicle', 'Equipment', 'Building', 'Software', 'Other'];

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center border-b pb-4 sticky top-0 bg-white z-10">
        <h2 className="text-2xl font-bold text-dark-text">
          {asset ? t('asset_form.edit_title') : t('asset_form.add_title')}
        </h2>
        {onClose && (
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl font-bold" disabled={loading}>✕</button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {validationErrors.general && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            <span>{validationErrors.general}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {asset && (
            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Kode Aset</label>
                <input type="text" value={asset.asset_tag} disabled className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100" />
            </div>
        )}

        <div className="md:col-span-2">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nama Aset *</label>
          <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required disabled={loading} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-gray-50" placeholder="e.g., Laptop Dell XPS 13" />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Kategori *</label>
          <div className="relative">
            <input type="text" name="category" id="category" value={formData.category} onChange={handleChange} required disabled={loading} list="category-options" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-gray-50" placeholder="e.g., Electronics" />
            <datalist id="category-options">
              {predefinedCategories.map(category => <option key={category} value={category} />)}
            </datalist>
          </div>
        </div>

        <div>
          <label htmlFor="unit_id" className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
          {isUnitLocked && currentUser?.unit_id ? (
            <>
              <input
                type="text"
                value={units.find(u => u.id === currentUser.unit_id)?.name || ''}
                disabled
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-blue-600">
                Unit diatur secara otomatis sesuai dengan unit Anda.
              </p>
            </>
          ) : (
            <select
              name="unit_id"
              id="unit_id"
              value={formData.unit_id || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, unit_id: e.target.value ? Number(e.target.value) : null }))}
              required
              disabled={loading}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-gray-50"
            >
              <option value="">-- Pilih Unit --</option>
              {units.map(unit => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} ({unit.code})
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label htmlFor="value" className="block text-sm font-medium text-gray-700 mb-1">Nilai Aset (IDR) *</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">Rp</span>
            <input type="text" name="value" id="value" value={valueInput} onChange={handleValueChange} required disabled={loading} className={`mt-1 block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-gray-50 ${getFieldError('value') ? 'border-red-300' : 'border-gray-300'}`} placeholder="0" />
          </div>
          {getFieldError('value') ? <p className="mt-1 text-sm text-red-600">{getFieldError('value')}</p> : <p className="mt-1 text-sm text-gray-500">Actual value: {formData.value === 0 ? 'Rp 0' : `Rp ${formData.value.toLocaleString('id-ID')}`}</p>}
        </div>

        <div>
          <label htmlFor="purchase_date" className="block text-sm font-medium text-gray-700 mb-1">Tanggal Pembelian *</label>
          <input type="date" name="purchase_date" id="purchase_date" value={formData.purchase_date} onChange={handleChange} required disabled={loading} max={new Date().toISOString().split('T')[0]} className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-gray-50 ${getFieldError('purchase_date') ? 'border-red-300' : 'border-gray-300'}`} />
          {getFieldError('purchase_date') && <p className="mt-1 text-sm text-red-600">{getFieldError('purchase_date')}</p>}
          <p className="mt-1 text-xs text-gray-500">Tidak boleh tanggal di masa depan</p>
        </div>

        <div>
          <label htmlFor="useful_life" className="block text-sm font-medium text-gray-700 mb-1">Umur Manfaat (bulan) *</label>
          <input type="number" name="useful_life" id="useful_life" value={formData.useful_life} onChange={handleChange} required min="1" max="600" disabled={loading} className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-gray-50 ${getFieldError('useful_life') ? 'border-red-300' : 'border-gray-300'}`} placeholder="12" />
          {getFieldError('useful_life') && <p className="mt-1 text-sm text-red-600">{getFieldError('useful_life')}</p>}
          <p className="mt-1 text-xs text-gray-500">{formData.useful_life} bulan ≈ {Math.round(formData.useful_life / 12 * 10) / 10} tahun</p>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
          <select name="status" id="status" value={formData.status} onChange={handleChange} required disabled={loading} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-gray-50">
            {availableStatuses.map(status => <option key={status} value={status}>{status}</option>)}
          </select>
          {!asset && <p className="mt-1 text-sm text-gray-500">Untuk aset baru, status "Available" dan "Terpinjam" tersedia</p>}
        </div>
      </div>

      <div className="border-t pt-4">
        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center text-sm text-gray-600 hover:text-gray-800">
          <svg className={`w-4 h-4 mr-1 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          Perhitungan Depresiasi
        </button>
        {showAdvanced && (
          <div className="mt-3 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Informasi Depresiasi (Estimasi)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Depresiasi Bulanan</span>
                <span className="ml-2 font-medium">
                  Rp {Math.round(calculatedDepreciation.monthly).toLocaleString('id-ID')}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Akumulasi Depresiasi Saat Ini</span>
                <span className="ml-2 font-medium">
                  Rp {Math.round(calculatedDepreciation.accumulated).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t sticky bottom-0 bg-white pb-2">
        <button type="submit" disabled={loading || hasErrors()} className="px-6 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center min-w-[120px] justify-center">
          {loading ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Menyimpan...</> : (asset ? 'Perbarui Aset' : 'Buat Aset')}
        </button>
      </div>

      {hasErrors() && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</h4>
          <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
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