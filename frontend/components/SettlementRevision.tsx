import React, { useState } from 'react';
import { Guarantee } from '../types';

interface SettlementRevisionProps {
  guarantee: Guarantee;
  previousSettlement: any;
  onSuccess: () => void;
  onClose: () => void;
}

const SettlementRevision: React.FC<SettlementRevisionProps> = ({
  guarantee,
  previousSettlement,
  onSuccess,
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    guarantee_id: guarantee.id.toString(),
    settlement_date: previousSettlement.settlement_date || new Date().toISOString().split('T')[0],
    settlement_notes: previousSettlement.settlement_notes || '',
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
        setError(data?.message || `Gagal menyimpan pengajuan ulang pelunasan jaminan (${response.status})`);
        setLoading(false);
        return;
      }

      setSuccessMessage('Pengajuan ulang pelunasan jaminan berhasil disimpan, menunggu persetujuan');
      setTimeout(() => {
        onSuccess();
      }, 1000);
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Terjadi kesalahan saat menyimpan pengajuan ulang pelunasan jaminan');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-h-screen overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 bg-white z-10 pb-4">
        <h2 className="text-2xl font-bold text-gray-800">Revisi Pelunasan Jaminan</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-2xl"
        >
          ×
        </button>
      </div>

      {/* Info Jaminan */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-600 font-medium mb-3">Data Jaminan (Otomatis dari Sistem)</p>
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
            <label className="block text-sm text-gray-600 font-medium">Nomor Jaminan</label>
            <p className="text-gray-900 font-semibold mt-1">{guarantee.guarantee_number || '-'}</p>
          </div>
          <div>
            <label className="block text-sm text-gray-600 font-medium">Status</label>
            <p className="text-gray-900 font-semibold mt-1">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                guarantee.status === 'available'
                  ? 'bg-green-100 text-green-800'
                  : guarantee.status === 'lunas'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {guarantee.status || '-'}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Info Pengajuan Sebelumnya */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <p className="text-sm text-orange-600 font-medium mb-3">Catatan Penolakan Sebelumnya</p>
        <div className="text-sm text-gray-700">
          <p><strong>Alasan Penolakan:</strong> {previousSettlement.settlement_remarks || '-'}</p>
          <p className="mt-2"><strong>Tanggal Pengajuan Sebelumnya:</strong> {new Date(previousSettlement.created_at).toLocaleDateString('id-ID')}</p>
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
            placeholder="Masukkan catatan atau keterangan pelunasan (opsional)"
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700">
            <strong>Catatan:</strong> Pengajuan ulang akan disimpan dengan status "Menunggu Persetujuan". Admin harus melakukan validasi untuk menyetujui atau menolak pengajuan ulang ini.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Menyimpan...' : 'Kirim Pengajuan Ulang'}
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

export default SettlementRevision;
