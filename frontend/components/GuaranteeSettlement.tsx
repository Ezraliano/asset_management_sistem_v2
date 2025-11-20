import React, { useState, useEffect } from 'react';
import { Guarantee } from '../types';

interface GuaranteeSettlementProps {
  guarantee: Guarantee;
  loanId?: number | null;
  borrowerName?: string;
  loanDate?: string;
  expectedReturnDate?: string;
  onSuccess: () => void;
  onClose: () => void;
}

const GuaranteeSettlement: React.FC<GuaranteeSettlementProps> = ({
  guarantee,
  loanId,
  borrowerName,
  loanDate,
  expectedReturnDate,
  onSuccess,
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    guarantee_id: guarantee.id.toString(),
    loan_id: loanId ? loanId.toString() : '',
    spk_number: guarantee.spk_number,
    cif_number: guarantee.cif_number,
    guarantee_name: guarantee.guarantee_name,
    guarantee_type: guarantee.guarantee_type,
    borrower_name: borrowerName || '',
    borrower_contact: '',
    loan_date: loanDate || '',
    expected_return_date: expectedReturnDate || '',
    settlement_date: new Date().toISOString().split('T')[0],
    settlement_notes: '',
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

      const response = await fetch('http://127.0.0.1:8000/api/guarantee-settlements', {
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
        setError(data?.message || `Gagal menyimpan pelunasan jaminan (${response.status})`);
        setLoading(false);
        return;
      }

      setSuccessMessage('Pelunasan jaminan berhasil disimpan');
      setTimeout(() => {
        onSuccess();
      }, 1000);
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Terjadi kesalahan saat menyimpan pelunasan jaminan');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-h-screen overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 bg-white z-10 pb-4">
        <h2 className="text-2xl font-bold text-gray-800">Form Pelunasan Jaminan</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-2xl"
        >
          ×
        </button>
      </div>

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
        {/* Loan ID - Hanya jika belum ada dari loan history */}
        {!loanId && (
          <div>
            <label htmlFor="loan_id" className="block text-sm font-medium text-gray-700 mb-1">
              ID Peminjaman <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="loan_id"
              name="loan_id"
              value={formData.loan_id}
              onChange={handleInputChange}
              placeholder="Masukkan ID peminjaman atau biarkan kosong"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                validationErrors.loan_id ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={loading}
            />
            {validationErrors.loan_id && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.loan_id[0]}</p>
            )}
          </div>
        )}

        {/* Nama Peminjam - Editable jika belum ada */}
        {!borrowerName && (
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
        )}

        {/* Tanggal Peminjaman - Editable jika belum ada */}
        {!loanDate && (
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
        )}

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

        {/* Tanggal Pelunasan */}
        <div>
          <label htmlFor="settlement_date" className="block text-sm font-medium text-gray-700 mb-1">
            Tanggal Pelunasan <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="settlement_date"
            name="settlement_date"
            value={formData.settlement_date}
            onChange={handleInputChange}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
              validationErrors.settlement_date ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={loading}
          />
          {validationErrors.settlement_date && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.settlement_date[0]}</p>
          )}
        </div>

        {/* Catatan Pelunasan */}
        <div>
          <label htmlFor="settlement_notes" className="block text-sm font-medium text-gray-700 mb-1">
            Catatan Pelunasan
          </label>
          <textarea
            id="settlement_notes"
            name="settlement_notes"
            value={formData.settlement_notes}
            onChange={handleInputChange}
            placeholder="Masukkan catatan atau keterangan pelunasan"
            rows={4}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none ${
              validationErrors.settlement_notes ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={loading}
          />
          {validationErrors.settlement_notes && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.settlement_notes[0]}</p>
          )}
        </div>

        {/* Info */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-700">
            <strong>Catatan:</strong> Pelunasan akan dikirim dengan status "Pending" dan memerlukan persetujuan dari admin sebelum dianggap selesai.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Menyimpan...' : 'Simpan Pelunasan'}
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

export default GuaranteeSettlement;
