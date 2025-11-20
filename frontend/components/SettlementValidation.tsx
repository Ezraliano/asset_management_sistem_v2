import React, { useState } from 'react';
import { Guarantee } from '../types';

interface SettlementData {
  id: number;
  guarantee_id: number;
  settlement_date: string;
  settlement_notes?: string;
  settlement_status: 'pending' | 'approved' | 'rejected';
  settled_by?: string;
  settlement_remarks?: string;
  created_at?: string;
}

interface SettlementValidationProps {
  settlement: SettlementData;
  guarantee: Guarantee;
  onSuccess: () => void;
  onClose: () => void;
}

type ValidationAction = 'approve' | 'reject' | null;

const SettlementValidation: React.FC<SettlementValidationProps> = ({
  settlement,
  guarantee,
  onSuccess,
  onClose,
}) => {
  const [action, setAction] = useState<ValidationAction>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    settled_by: '',
    settlement_remarks: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.settled_by.trim()) {
      setError('Nama yang menyetujui harus diisi');
      return;
    }

    await submitValidation('approve');
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.settlement_remarks.trim()) {
      setError('Catatan penolakan harus diisi');
      return;
    }

    await submitValidation('reject');
  };

  const submitValidation = async (validationAction: 'approve' | 'reject') => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('Token tidak ditemukan. Silakan login kembali.');
        setLoading(false);
        return;
      }

      const endpoint = `/api/guarantee-settlements/${settlement.id}/${validationAction}`;
      const payload = validationAction === 'approve'
        ? {
            settled_by: formData.settled_by,
            settlement_remarks: formData.settlement_remarks || undefined,
          }
        : {
            settlement_remarks: formData.settlement_remarks,
          };

      const response = await fetch(`http://127.0.0.1:8000${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let data: any = {};

      try {
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
        setError('Server mengembalikan respons yang tidak valid');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        setError(data?.message || `Gagal ${validationAction === 'approve' ? 'menyetujui' : 'menolak'} pelunasan (${response.status})`);
        setLoading(false);
        return;
      }

      const successMsg = validationAction === 'approve'
        ? 'Pelunasan jaminan berhasil disetujui. Status jaminan berubah menjadi "Lunas"'
        : 'Pelunasan jaminan berhasil ditolak';

      setSuccessMessage(successMsg);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Terjadi kesalahan saat memproses validasi pelunasan');
      setLoading(false);
    }
  };

  // If already validated, show read-only view
  if (settlement.settlement_status !== 'pending') {
    return (
      <div className="space-y-6 max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between sticky top-0 bg-white z-10 pb-4">
          <h2 className="text-2xl font-bold text-gray-800">Detail Validasi Pelunasan</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className={`border-l-4 p-4 rounded ${
          settlement.settlement_status === 'approved'
            ? 'bg-green-50 border-green-500'
            : 'bg-red-50 border-red-500'
        }`}>
          <p className={`text-sm font-semibold ${
            settlement.settlement_status === 'approved'
              ? 'text-green-800'
              : 'text-red-800'
          }`}>
            Status: {settlement.settlement_status === 'approved' ? 'DISETUJUI' : 'DITOLAK'}
          </p>
          {settlement.settled_by && (
            <p className={`text-sm mt-1 ${
              settlement.settlement_status === 'approved'
                ? 'text-green-700'
                : 'text-red-700'
            }`}>
              Divalidasi oleh: {settlement.settled_by}
            </p>
          )}
          {settlement.settlement_remarks && (
            <p className={`text-sm mt-1 ${
              settlement.settlement_status === 'approved'
                ? 'text-green-700'
                : 'text-red-700'
            }`}>
              Catatan: {settlement.settlement_remarks}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-h-screen overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 bg-white z-10 pb-4">
        <h2 className="text-2xl font-bold text-gray-800">Validasi Pelunasan Jaminan</h2>
        <button
          onClick={onClose}
          disabled={loading}
          className="text-gray-500 hover:text-gray-700 text-2xl disabled:opacity-50"
        >
          ×
        </button>
      </div>

      {/* Settlement Info */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-700 font-medium mb-3">Informasi Pelunasan (Menunggu Persetujuan)</p>
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
            <label className="block text-sm text-gray-600 font-medium">Status Jaminan</label>
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
          <div>
            <label className="block text-sm text-gray-600 font-medium">Tanggal Pelunasan</label>
            <p className="text-gray-900 font-semibold mt-1">{formatDate(settlement.settlement_date)}</p>
          </div>
        </div>
        {settlement.settlement_notes && (
          <div className="mt-4">
            <label className="block text-sm text-gray-600 font-medium">Catatan Pelunasan</label>
            <p className="text-gray-900 mt-1 p-2 bg-white rounded border border-gray-300">{settlement.settlement_notes}</p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 text-sm">
          {successMessage}
        </div>
      )}

      {/* Validation Form */}
      {!successMessage && (
        <div className="space-y-4">
          {/* Approve Section */}
          <form onSubmit={handleApprove} className="space-y-4">
            <div className="border-2 border-green-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <input
                  type="radio"
                  name="action"
                  value="approve"
                  checked={action === 'approve'}
                  onChange={() => setAction('approve')}
                  disabled={loading}
                  className="w-4 h-4"
                />
                <label className="ml-3 text-lg font-semibold text-green-800">
                  Setujui Pelunasan
                </label>
              </div>

              {action === 'approve' && (
                <div className="space-y-4 ml-7">
                  <div>
                    <label htmlFor="settled_by" className="block text-sm font-medium text-gray-700 mb-1">
                      Nama Validator <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="settled_by"
                      name="settled_by"
                      value={formData.settled_by}
                      onChange={handleInputChange}
                      placeholder="Masukkan nama Anda"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label htmlFor="settlement_remarks" className="block text-sm font-medium text-gray-700 mb-1">
                      Catatan (Opsional)
                    </label>
                    <textarea
                      id="settlement_remarks"
                      name="settlement_remarks"
                      value={formData.settlement_remarks}
                      onChange={handleInputChange}
                      placeholder="Masukkan catatan atau keterangan persetujuan"
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                      disabled={loading}
                    />
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded p-3">
                    <p className="text-sm text-green-800">
                      <strong>Jika disetujui:</strong> Status jaminan akan berubah menjadi "Lunas" dan tidak dapat dikembalikan ke status "Dipinjam"
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Memproses...' : 'Setujui Pelunasan'}
                  </button>
                </div>
              )}
            </div>
          </form>

          {/* Reject Section */}
          <form onSubmit={handleReject} className="space-y-4">
            <div className="border-2 border-red-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <input
                  type="radio"
                  name="action"
                  value="reject"
                  checked={action === 'reject'}
                  onChange={() => setAction('reject')}
                  disabled={loading}
                  className="w-4 h-4"
                />
                <label className="ml-3 text-lg font-semibold text-red-800">
                  Tolak Pelunasan
                </label>
              </div>

              {action === 'reject' && (
                <div className="space-y-4 ml-7">
                  <div>
                    <label htmlFor="reject_remarks" className="block text-sm font-medium text-gray-700 mb-1">
                      Alasan Penolakan <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="reject_remarks"
                      name="settlement_remarks"
                      value={formData.settlement_remarks}
                      onChange={handleInputChange}
                      placeholder="Masukkan alasan penolakan pelunasan jaminan"
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                      disabled={loading}
                    />
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-sm text-red-800">
                      <strong>Jika ditolak:</strong> Status pelunasan akan menjadi "Ditolak" dan dapat diajukan ulang kemudian
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Memproses...' : 'Tolak Pelunasan'}
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Close Button */}
      {!successMessage && (
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="w-full bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Batal
        </button>
      )}
    </div>
  );
};

export default SettlementValidation;
