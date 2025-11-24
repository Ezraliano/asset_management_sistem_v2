import React, { useState } from 'react';
import { Guarantee } from '../types';

interface GuaranteeLoaningProps {
  guarantee: Guarantee;
  onSuccess: () => void;
  onClose: () => void;
}

const GuaranteeLoaning: React.FC<GuaranteeLoaningProps> = ({ guarantee, onSuccess, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Cek apakah jaminan sudah berstatus lunas
  const isGuaranteeSettled = guarantee.status === 'lunas';
  const isGuaranteeBorrowed = guarantee.status === 'dipinjam';

  const [formData, setFormData] = useState({
    guarantee_id: guarantee.id.toString(),
    spk_number: guarantee.spk_number,
    cif_number: guarantee.cif_number,
    guarantee_type: guarantee.guarantee_type,
    file_location: guarantee.file_location,
    borrower_name: '',
    borrower_contact: '',
    reason: '',
    loan_date: new Date().toISOString().split('T')[0],
    expected_return_date: '',
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

      const response = await fetch('http://127.0.0.1:8000/api/guarantee-loans', {
        method: 'POST',
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
        setError(data?.message || `Gagal menyimpan peminjaman jaminan (${response.status})`);
        setLoading(false);
        return;
      }

      setSuccessMessage('Peminjaman jaminan berhasil disimpan');
      setTimeout(() => {
        onSuccess();
      }, 1000);
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Terjadi kesalahan saat menyimpan peminjaman jaminan');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-h-screen overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 bg-white z-10 pb-4">
        <h2 className="text-2xl font-bold text-gray-800">Form Peminjaman Jaminan</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-2xl"
        >
          ×
        </button>
      </div>

      {/* Alert - Jaminan sudah lunas */}
      {isGuaranteeSettled && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-semibold mb-2">⚠️ Jaminan Tidak Dapat Dipinjamkan</p>
          <p className="text-red-600 text-sm">
            Jaminan ini sudah berstatus "Lunas" dan telah keluar dari sistem. Jaminan yang sudah lunas tidak dapat dipinjamkan kembali.
          </p>
        </div>
      )}

      {/* Alert - Jaminan sedang dipinjam */}
      {isGuaranteeBorrowed && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-700 font-semibold mb-2">⚠️ Jaminan Sedang Dipinjam</p>
          <p className="text-yellow-600 text-sm">
            Jaminan ini sedang dipinjam. Harap mengembalikan jaminan terlebih dahulu sebelum melakukan peminjaman baru.
          </p>
        </div>
      )}

      {/* Info Jaminan */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-600 font-medium mb-3">Data Jaminan (Otomatis)</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 font-medium">No SPK</label>
            <p className="text-gray-900 font-semibold mt-1">{guarantee.spk_number}</p>
          </div>
          <div>
            <label className="block text-sm text-gray-600 font-medium">No CIF</label>
            <p className="text-gray-900 font-semibold mt-1">{guarantee.cif_number}</p>
          </div>
          <div>
            <label className="block text-sm text-gray-600 font-medium">Tipe Jaminan</label>
            <p className="text-gray-900 font-semibold mt-1">{guarantee.guarantee_type}</p>
          </div>
          <div>
            <label className="block text-sm text-gray-600 font-medium">Lokasi File</label>
            <p className="text-gray-900 font-semibold mt-1">{guarantee.file_location}</p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
          {successMessage}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nama Peminjam */}
        <div>
          <label htmlFor="borrower_name" className="block text-sm font-medium text-gray-700 mb-1">
            Nama Peminjam <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="borrower_name"
            name="borrower_name"
            value={formData.borrower_name}
            onChange={handleInputChange}
            placeholder="Masukkan nama peminjam"
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
              validationErrors.borrower_name ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={loading}
          />
          {validationErrors.borrower_name && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.borrower_name[0]}</p>
          )}
        </div>

        {/* Kontak Peminjam */}
        <div>
          <label htmlFor="borrower_contact" className="block text-sm font-medium text-gray-700 mb-1">
            Kontak Peminjam <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="borrower_contact"
            name="borrower_contact"
            value={formData.borrower_contact}
            onChange={handleInputChange}
            placeholder="Masukkan nomor telepon atau email"
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
              validationErrors.borrower_contact ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={loading}
          />
          {validationErrors.borrower_contact && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.borrower_contact[0]}</p>
          )}
        </div>

        {/* Alasan Peminjaman */}
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
            Alasan Peminjaman <span className="text-red-500">*</span>
          </label>
          <textarea
            id="reason"
            name="reason"
            value={formData.reason}
            onChange={handleInputChange}
            placeholder="Masukkan alasan peminjaman"
            rows={4}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none ${
              validationErrors.reason ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={loading}
          />
          {validationErrors.reason && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.reason[0]}</p>
          )}
        </div>

        {/* Tanggal Peminjaman */}
        <div>
          <label htmlFor="loan_date" className="block text-sm font-medium text-gray-700 mb-1">
            Tanggal Peminjaman <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="loan_date"
            name="loan_date"
            value={formData.loan_date}
            onChange={handleInputChange}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
              validationErrors.loan_date ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={loading}
          />
          {validationErrors.loan_date && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.loan_date[0]}</p>
          )}
        </div>

        {/* Dikembalikan Kapan */}
        <div>
          <label htmlFor="expected_return_date" className="block text-sm font-medium text-gray-700 mb-1">
            Dikembalikan Kapan
          </label>
          <input
            type="date"
            id="expected_return_date"
            name="expected_return_date"
            value={formData.expected_return_date}
            onChange={handleInputChange}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
              validationErrors.expected_return_date ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={loading}
          />
          {validationErrors.expected_return_date && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.expected_return_date[0]}</p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            type="submit"
            disabled={loading || isGuaranteeSettled || isGuaranteeBorrowed}
            className="flex-1 bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            title={isGuaranteeSettled ? 'Jaminan sudah lunas, tidak dapat dipinjamkan' : isGuaranteeBorrowed ? 'Jaminan sedang dipinjam' : 'Simpan peminjaman'}
          >
            {loading ? 'Menyimpan...' : 'Simpan Peminjaman'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  );
};

export default GuaranteeLoaning;
