import React, { useState } from 'react';
import { Guarantee } from '../types';

interface GuaranteeReturnProps {
  guarantee: Guarantee;
  loanId: number;
  borrowerName?: string;
  loanDate?: string;
  onSuccess: () => void;
  onClose: () => void;
}

const GuaranteeReturn: React.FC<GuaranteeReturnProps> = ({
  guarantee,
  loanId,
  borrowerName,
  loanDate,
  onSuccess,
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    actual_return_date: new Date().toISOString().split('T')[0],
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error untuk field ini
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setValidationErrors({});

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('Token tidak ditemukan. Silakan login kembali.');
        setLoading(false);
        return;
      }

      const response = await fetch(`http://127.0.0.1:8000/api/guarantee-loans/${loanId}/return`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      // Handle response text terlebih dahulu
      const responseText = await response.text();

      let data: any = {};
      try {
        // Cek apakah response text kosong atau bukan JSON
        if (!responseText || responseText.trim() === '') {
          if (response.ok) {
            data = { success: true, message: 'Success' };
          } else {
            throw new Error('Server returned empty response');
          }
        } else {
          data = JSON.parse(responseText);
        }
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.error('Response Text:', responseText);
        console.error('Response Status:', response.status);
        console.error('Response Headers:', Object.fromEntries(response.headers));
        setError('Server mengembalikan respons yang tidak valid. Silakan cek console untuk detail error.');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        if (data?.errors) {
          setValidationErrors(data.errors);
        }
        setError(data?.message || `Gagal mengembalikan jaminan (${response.status})`);
        setLoading(false);
        return;
      }

      setSuccessMessage('Jaminan berhasil dikembalikan');
      setTimeout(() => {
        onSuccess();
      }, 1000);
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Terjadi kesalahan saat mengembalikan jaminan');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 max-h-screen overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 bg-white z-10 pb-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">Form Pengembalian Jaminan</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-xl md:text-2xl flex-shrink-0"
        >
          ×
        </button>
      </div>

      {/* Info Jaminan */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4">
        <p className="text-xs md:text-sm text-blue-600 font-medium mb-3">Data Jaminan (Otomatis)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          <div>
            <label className="block text-sm text-gray-600 font-medium">No SPK</label>
            <p className="text-gray-900 font-semibold mt-1">{guarantee.spk_number}</p>
          </div>
          <div>
            <label className="block text-sm text-gray-600 font-medium">No CIF</label>
            <p className="text-gray-900 font-semibold mt-1">{guarantee.cif_number}</p>
          </div>
          <div>
            <label className="block text-sm text-gray-600 font-medium">Nama Jaminan</label>
            <p className="text-gray-900 font-semibold mt-1">{guarantee.guarantee_name}</p>
          </div>
          <div>
            <label className="block text-sm text-gray-600 font-medium">Tipe Jaminan</label>
            <p className="text-gray-900 font-semibold mt-1">{guarantee.guarantee_type}</p>
          </div>
          <div>
            <label className="block text-sm text-gray-600 font-medium">Nama Peminjam</label>
            <p className="text-gray-900 font-semibold mt-1">{borrowerName || '(Belum diisi)'}</p>
          </div>
          <div>
            <label className="block text-sm text-gray-600 font-medium">Tanggal Peminjaman</label>
            <p className="text-gray-900 font-semibold mt-1">
              {loanDate ? new Date(loanDate).toLocaleDateString('id-ID', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }) : '(Belum diisi)'}
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 md:p-4 text-xs md:text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 md:p-4 text-xs md:text-sm text-green-800">
          {successMessage}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
        {/* Tanggal Pengembalian */}
        <div>
          <label htmlFor="actual_return_date" className="block text-sm font-medium text-gray-700 mb-1">
            Tanggal Pengembalian <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="actual_return_date"
            name="actual_return_date"
            value={formData.actual_return_date}
            onChange={handleInputChange}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
              validationErrors.actual_return_date ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={loading}
          />
          {validationErrors.actual_return_date && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.actual_return_date[0]}</p>
          )}
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4">
          <p className="text-xs md:text-sm text-blue-700">
            <strong>Catatan:</strong> Jaminan akan langsung berubah status menjadi "Lunas" setelah dikembalikan.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 md:gap-3 pt-4 md:pt-6 border-t">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:flex-1 bg-primary text-white px-4 md:px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors font-medium text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Memproses...' : 'Kembalikan Jaminan'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:flex-1 bg-gray-300 text-gray-700 px-4 md:px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors font-medium text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  );
};

export default GuaranteeReturn;
