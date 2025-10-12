import React, { useState } from 'react';
import { AssetLoan } from '../types';
import { rejectAssetLoan } from '../services/api';

interface LoanRejectionFormProps {
  loan: AssetLoan;
  onReject: (rejectedLoan: AssetLoan) => void;
  onCancel: () => void;
  loading?: boolean;
}

const LoanRejectionForm: React.FC<LoanRejectionFormProps> = ({
  loan,
  onReject,
  onCancel,
  loading = false
}) => {
  const [rejectionDate, setRejectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ rejectionReason?: string }>({});

  const validateForm = (): boolean => {
    const newErrors: { rejectionReason?: string } = {};

    if (!rejectionReason.trim()) {
      newErrors.rejectionReason = 'Alasan penolakan wajib diisi';
    } else if (rejectionReason.trim().length < 10) {
      newErrors.rejectionReason = 'Alasan penolakan minimal 10 karakter';
    } else if (rejectionReason.trim().length > 500) {
      newErrors.rejectionReason = 'Alasan penolakan maksimal 500 karakter';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!rejectionDate) {
      alert('Please select rejection date');
      return;
    }

    setIsSubmitting(true);
    try {
      const rejectedLoan = await rejectAssetLoan(loan.id, {
        approval_date: rejectionDate,
        rejection_reason: rejectionReason.trim()
      });
      
      onReject(rejectedLoan);
      
    } catch (error: any) {
      console.error('Rejection failed:', error);
      alert(`Penolakan gagal: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
      <h3 className="text-xl font-bold mb-6 text-gray-800">Form Penolakan Peminjaman Asset</h3>
      
      {/* Loan Details */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-700 mb-2">Detail Peminjaman</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Asset:</span>
            <p className="text-gray-600">{loan.asset.name}</p>
          </div>
          <div>
            <span className="font-medium">Tag Asset:</span>
            <p className="text-gray-600">{loan.asset.asset_tag}</p>
          </div>
          <div>
            <span className="font-medium">Peminjam:</span>
            <p className="text-gray-600">{loan.borrower.name}</p>
          </div>
          <div>
            <span className="font-medium">Tanggal Permintaan:</span>
            <p className="text-gray-600">{new Date(loan.request_date).toLocaleDateString('id-ID')}</p>
          </div>
          <div className="col-span-2">
            <span className="font-medium">Tanggal Pengembalian Diharapkan:</span>
            <p className="text-gray-600">{new Date(loan.expected_return_date).toLocaleDateString('id-ID')}</p>
          </div>
        </div>
        <div className="mt-3">
          <span className="font-medium">Tujuan Peminjaman:</span>
          <p className="text-gray-600 mt-1 bg-white p-2 rounded border">{loan.purpose}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rejection Date */}
        <div>
          <label htmlFor="rejection_date" className="block text-sm font-medium text-gray-700 mb-2">
            Tanggal Penolakan *
          </label>
          <input
            type="date"
            id="rejection_date"
            value={rejectionDate}
            onChange={(e) => setRejectionDate(e.target.value)}
            max={today}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Tanggal tidak boleh melebihi hari ini</p>
        </div>

        {/* Rejection Reason */}
        <div>
          <label htmlFor="rejection_reason" className="block text-sm font-medium text-gray-700 mb-2">
            Alasan Penolakan *
          </label>
          <textarea
            id="rejection_reason"
            rows={4}
            value={rejectionReason}
            onChange={(e) => {
              setRejectionReason(e.target.value);
              if (errors.rejectionReason) {
                setErrors({ ...errors, rejectionReason: undefined });
              }
            }}
            placeholder="Berikan alasan jelas mengapa peminjaman ditolak..."
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
              errors.rejectionReason ? 'border-red-300' : 'border-gray-300'
            }`}
            required
          />
          {errors.rejectionReason && (
            <p className="text-xs text-red-600 mt-1">{errors.rejectionReason}</p>
          )}
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Minimal 10 karakter</span>
            <span>{rejectionReason.length}/500 karakter</span>
          </div>
        </div>

        {/* Common Rejection Reasons */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Alasan Penolakan Umum (Opsional - Klik untuk pilih)
          </label>
          <div className="grid grid-cols-1 gap-2">
            {[
              "Asset sedang dalam perbaikan dan tidak tersedia untuk dipinjam",
              "Jadwal peminjaman bertabrakan dengan kebutuhan operasional lain",
              "Peminjam tidak memenuhi persyaratan yang ditetapkan",
              "Tujuan peminjaman tidak sesuai dengan kebijakan perusahaan",
              "Asset sedang digunakan untuk keperluan prioritas",
              "Permintaan melebihi batas waktu peminjaman yang diizinkan"
            ].map((reason, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setRejectionReason(reason)}
                className="text-left p-2 text-sm text-gray-600 bg-gray-50 rounded border hover:bg-gray-100 transition-colors"
              >
                {reason}
              </button>
            ))}
          </div>
        </div>

        {/* Warning Message */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Konfirmasi Penolakan
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Penolakan ini akan dikirimkan kepada peminjam. Pastikan alasan penolakan 
                  jelas dan dapat dipahami. Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            disabled={isSubmitting}
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !rejectionDate || !rejectionReason.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Memproses...' : 'Tolak Peminjaman'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoanRejectionForm;