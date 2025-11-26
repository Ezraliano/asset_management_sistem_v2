import React, { useState, useEffect } from 'react';
import { Asset } from '../types';
import { addGuarantee, updateGuarantee } from '../services/api';

interface GuaranteeInputFormProps {
  guarantee?: any;
  assets: Asset[];
  onSuccess: () => void;
  onClose: () => void;
}

interface ValidationErrors {
  spk_number?: string;
  cif_number?: string;
  spk_name?: string;
  credit_period?: string;
  guarantee_name?: string;
  guarantee_type?: string;
  guarantee_number?: string;
  file_location?: string;
  input_date?: string;
  general?: string;
}

interface GuaranteeFormData {
  spk_number: string;
  cif_number: string;
  spk_name: string;
  credit_period: string;
  guarantee_name: string;
  guarantee_type: string;
  guarantee_number: string;
  file_location: string;
  input_date: string;
}

const GuaranteeInputForm: React.FC<GuaranteeInputFormProps> = ({ guarantee, assets, onSuccess, onClose }) => {
  const [formData, setFormData] = useState<GuaranteeFormData>({
    spk_number: '',
    cif_number: '',
    spk_name: '',
    credit_period: '',
    guarantee_name: '',
    guarantee_type: '',
    guarantee_number: '',
    file_location: '',
    input_date: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // Initialize form data if editing
  useEffect(() => {
    if (guarantee) {
      setFormData({
        spk_number: guarantee.spk_number || '',
        cif_number: guarantee.cif_number || '',
        spk_name: guarantee.spk_name || '',
        credit_period: guarantee.credit_period || '',
        guarantee_name: guarantee.guarantee_name || '',
        guarantee_type: guarantee.guarantee_type || '',
        guarantee_number: guarantee.guarantee_number || '',
        file_location: guarantee.file_location || '',
        input_date: guarantee.input_date || '',
      });
    } else {
      const today = new Date().toISOString().split('T')[0];
      setFormData(prev => ({
        ...prev,
        input_date: today,
      }));
    }
  }, [guarantee]);

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    if (!formData.spk_number.trim()) {
      errors.spk_number = 'No SPK tidak boleh kosong';
    } else if (!/^[a-zA-Z0-9]*$/.test(formData.spk_number)) {
      errors.spk_number = 'No SPK hanya boleh mengandung huruf dan angka, tanpa simbol khusus';
    }

    if (!formData.cif_number.trim()) {
      errors.cif_number = 'No CIF tidak boleh kosong';
    } else if (!/^\d+$/.test(formData.cif_number)) {
      errors.cif_number = 'No CIF hanya boleh mengandung angka positif tanpa simbol';
    }

    if (!formData.spk_name.trim()) {
      errors.spk_name = 'Atas Nama SPK tidak boleh kosong';
    }

    if (!formData.credit_period.trim()) {
      errors.credit_period = 'Jangka Waktu Kredit tidak boleh kosong';
    }

    if (!formData.guarantee_name.trim()) {
      errors.guarantee_name = 'Atas Nama Jaminan tidak boleh kosong';
    }

    if (!formData.guarantee_type) {
      errors.guarantee_type = 'Tipe Jaminan tidak boleh kosong';
    }

    if (!formData.guarantee_number.trim()) {
      errors.guarantee_number = 'No Jaminan tidak boleh kosong';
    }

    if (!formData.file_location.trim()) {
      errors.file_location = 'Lokasi Berkas tidak boleh kosong';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let processedValue = value;

    // Special handling for spk_number - only allow alphanumeric characters
    if (name === 'spk_number') {
      processedValue = value.replace(/[^a-zA-Z0-9]/g, '');
    }

    // Special handling for cif_number - only allow digits
    if (name === 'cif_number') {
      processedValue = value.replace(/[^\d]/g, '');
    }

    setFormData(prev => ({
      ...prev,
      [name]: processedValue,
    }));
    // Clear error for this field when user starts typing
    if (validationErrors[name as keyof ValidationErrors]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
      // Also clear general error if user is correcting their input
      if (error) {
        setError('');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setValidationErrors({});

    if (!validateForm()) {
      setError('Mohon perbaiki kesalahan pada form');
      return;
    }

    try {
      setLoading(true);

      // Type-safe form data
      const submitData = {
        ...formData,
        guarantee_type: formData.guarantee_type as 'BPKB' | 'SHM' | 'SHGB' | 'E-SHM'
      };

      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('Token tidak ditemukan. Silakan login kembali.');
        setLoading(false);
        return;
      }

      const endpoint = guarantee
        ? `http://127.0.0.1:8000/api/guarantees/${guarantee.id}`
        : 'http://127.0.0.1:8000/api/guarantees';

      const method = guarantee ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(submitData),
      });

      const responseText = await response.text();
      let data: any = {};

      try {
        if (responseText && responseText.trim() !== '') {
          data = JSON.parse(responseText);
        }
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        setError('Server mengembalikan respons yang tidak valid');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        // Handle validation errors from backend
        if (data?.errors && typeof data.errors === 'object') {
          const serverErrors: ValidationErrors = {};

          // Map server errors to form fields
          Object.entries(data.errors).forEach(([field, messages]: [string, any]) => {
            const errorMessage = Array.isArray(messages) ? messages[0] : String(messages);
            serverErrors[field as keyof ValidationErrors] = errorMessage;
          });

          setValidationErrors(serverErrors);
          setError('Input Jaminan gagal. Mohon periksa kembali data yang anda masukkan.');
        } else {
          // Handle general error
          setError(data?.message || `Gagal ${guarantee ? 'memperbarui' : 'menyimpan'} jaminan`);
        }
        setLoading(false);
        return;
      }

      if (data?.success !== false) {
        onSuccess();
      } else {
        setError(data?.message || `Gagal ${guarantee ? 'memperbarui' : 'menyimpan'} jaminan`);
      }
    } catch (err: any) {
      console.error('Error saving guarantee:', err);
      setError(err.message || `Gagal ${guarantee ? 'memperbarui' : 'menyimpan'} jaminan`);
    } finally {
      setLoading(false);
    }
  };

  const getFieldError = (field: keyof ValidationErrors): string | undefined => validationErrors[field];

  // Check if there are actual field errors (not just general error message)
  const hasFieldErrors = (): boolean => {
    return Object.values(validationErrors).some(error => error !== undefined && error !== '');
  };

  const hasErrors = (): boolean => hasFieldErrors();

  const guaranteeTypes = ['BPKB', 'SHM', 'SHGB', 'E-SHM'];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* No SPK */}
        <div>
          <label htmlFor="spk_number" className="block text-sm font-medium text-gray-700 mb-1">
            No SPK * <span className="text-gray-500 text-xs">(Boleh sama dengan jaminan lain)</span>
          </label>
          <input
            type="text"
            id="spk_number"
            name="spk_number"
            value={formData.spk_number}
            onChange={handleChange}
            required
            disabled={loading}
            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-gray-50 ${
              getFieldError('spk_number') ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="e.g., SPK12345 atau 12345"
          />
          {getFieldError('spk_number') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('spk_number')}</p>
          )}
        </div>

        {/* No CIF */}
        <div>
          <label htmlFor="cif_number" className="block text-sm font-medium text-gray-700 mb-1">
            No CIF * <span className="text-gray-500 text-xs">(Boleh sama dengan jaminan lain)</span>
          </label>
          <input
            type="text"
            id="cif_number"
            name="cif_number"
            value={formData.cif_number}
            onChange={handleChange}
            required
            disabled={loading}
            inputMode="numeric"
            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-gray-50 ${
              getFieldError('cif_number') ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="e.g., 67890"
          />
          {getFieldError('cif_number') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('cif_number')}</p>
          )}
        </div>

        {/* Atas Nama SPK */}
        <div>
          <label htmlFor="spk_name" className="block text-sm font-medium text-gray-700 mb-1">
            Atas Nama SPK *
          </label>
          <input
            type="text"
            id="spk_name"
            name="spk_name"
            value={formData.spk_name}
            onChange={handleChange}
            required
            disabled={loading}
            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-gray-50 ${
              getFieldError('spk_name') ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="e.g., PT ABC Jaya"
          />
          {getFieldError('spk_name') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('spk_name')}</p>
          )}
        </div>

        {/* Jangka Waktu Kredit */}
        <div>
          <label htmlFor="credit_period" className="block text-sm font-medium text-gray-700 mb-1">
            Jangka Waktu Kredit *
          </label>
          <input
            type="text"
            id="credit_period"
            name="credit_period"
            value={formData.credit_period}
            onChange={handleChange}
            required
            disabled={loading}
            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-gray-50 ${
              getFieldError('credit_period') ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="e.g., 24 bulan"
          />
          {getFieldError('credit_period') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('credit_period')}</p>
          )}
        </div>

        {/* Atas Nama Jaminan */}
        <div>
          <label htmlFor="guarantee_name" className="block text-sm font-medium text-gray-700 mb-1">
            Atas Nama Jaminan *
          </label>
          <input
            type="text"
            id="guarantee_name"
            name="guarantee_name"
            value={formData.guarantee_name}
            onChange={handleChange}
            required
            disabled={loading}
            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-gray-50 ${
              getFieldError('guarantee_name') ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="e.g., Budi Santoso"
          />
          {getFieldError('guarantee_name') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('guarantee_name')}</p>
          )}
        </div>

        {/* Tipe Jaminan */}
        <div>
          <label htmlFor="guarantee_type" className="block text-sm font-medium text-gray-700 mb-1">
            Tipe Jaminan *
          </label>
          <select
            id="guarantee_type"
            name="guarantee_type"
            value={formData.guarantee_type}
            onChange={handleChange}
            required
            disabled={loading}
            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-gray-50 ${
              getFieldError('guarantee_type') ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">-- Pilih Tipe Jaminan --</option>
            {guaranteeTypes.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {getFieldError('guarantee_type') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('guarantee_type')}</p>
          )}
        </div>

        {/* No Jaminan */}
        <div>
          <label htmlFor="guarantee_number" className="block text-sm font-medium text-gray-700 mb-1">
            No Jaminan {formData.guarantee_type && `(No ${formData.guarantee_type})`} * <span className="text-gray-500 text-xs">(Harus unik - tidak boleh sama)</span>
          </label>
          <input
            type="text"
            id="guarantee_number"
            name="guarantee_number"
            value={formData.guarantee_number}
            onChange={handleChange}
            required
            disabled={loading}
            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-gray-50 ${
              getFieldError('guarantee_number') ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder={`e.g., No ${formData.guarantee_type || 'Jaminan'}`}
          />
          {getFieldError('guarantee_number') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('guarantee_number')}</p>
          )}
        </div>

        {/* Lokasi Berkas */}
        <div>
          <label htmlFor="file_location" className="block text-sm font-medium text-gray-700 mb-1">
            Lokasi Berkas *
          </label>
          <input
            type="text"
            id="file_location"
            name="file_location"
            value={formData.file_location}
            onChange={handleChange}
            required
            disabled={loading}
            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-gray-50 ${
              getFieldError('file_location') ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="e.g., Lemari A, Rak 3"
          />
          {getFieldError('file_location') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('file_location')}</p>
          )}
        </div>
      </div>

      {/* Error Summary */}
      {hasErrors() && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-red-800 mb-2">Mohon perbaiki kesalahan berikut:</h4>
          <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
            {validationErrors.spk_number && <li>{validationErrors.spk_number}</li>}
            {validationErrors.cif_number && <li>{validationErrors.cif_number}</li>}
            {validationErrors.spk_name && <li>{validationErrors.spk_name}</li>}
            {validationErrors.credit_period && <li>{validationErrors.credit_period}</li>}
            {validationErrors.guarantee_name && <li>{validationErrors.guarantee_name}</li>}
            {validationErrors.guarantee_type && <li>{validationErrors.guarantee_type}</li>}
            {validationErrors.guarantee_number && <li>{validationErrors.guarantee_number}</li>}
            {validationErrors.file_location && <li>{validationErrors.file_location}</li>}
            {validationErrors.general && <li>{validationErrors.general}</li>}
          </ul>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={loading || hasErrors()}
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Menyimpan...
            </>
          ) : guarantee ? (
            'Perbarui Jaminan'
          ) : (
            'Simpan Jaminan'
          )}
        </button>
      </div>
    </form>
  );
};

export default GuaranteeInputForm;
