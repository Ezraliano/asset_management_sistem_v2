import React, { useState } from 'react';
import { AssetLoan } from '../types';

interface ReturnValidationModalProps {
  loan: AssetLoan;
  onApprove: (data: { verification_date: string; condition: 'good' | 'damaged' | 'lost'; assessment_notes?: string }) => void;
  onReject: (data: { verification_date: string; rejection_reason: string }) => void;
  onClose: () => void;
  loading?: boolean;
}

const ReturnValidationModal: React.FC<ReturnValidationModalProps> = ({
  loan,
  onApprove,
  onReject,
  onClose,
  loading = false
}) => {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [verificationDate, setVerificationDate] = useState(new Date().toISOString().split('T')[0]);
  const [condition, setCondition] = useState<'good' | 'damaged' | 'lost'>('good');
  const [assessmentNotes, setAssessmentNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verificationDate) {
      alert('Mohon pilih tanggal verifikasi');
      return;
    }

    if (action === 'approve') {
      if (!condition) {
        alert('Mohon pilih kondisi asset');
        return;
      }
      setIsSubmitting(true);
      try {
        await onApprove({
          verification_date: verificationDate,
          condition,
          assessment_notes: assessmentNotes.trim() || undefined
        });
      } catch (error: any) {
        console.error('Approve failed:', error);
        alert(`Validasi gagal: ${error.message || 'Error tidak diketahui'}`);
      } finally {
        setIsSubmitting(false);
      }
    } else if (action === 'reject') {
      if (!rejectionReason.trim() || rejectionReason.trim().length < 10) {
        alert('Mohon berikan alasan penolakan minimal 10 karakter');
        return;
      }
      setIsSubmitting(true);
      try {
        await onReject({
          verification_date: verificationDate,
          rejection_reason: rejectionReason.trim()
        });
      } catch (error: any) {
        console.error('Reject failed:', error);
        alert(`Penolakan gagal: ${error.message || 'Error tidak diketahui'}`);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const today = new Date().toISOString().split('T')[0];

  const getConditionColor = (cond: 'good' | 'damaged' | 'lost') => {
    switch (cond) {
      case 'good': return 'border-green-300 bg-green-50';
      case 'damaged': return 'border-yellow-300 bg-yellow-50';
      case 'lost': return 'border-red-300 bg-red-50';
    }
  };

  const getConditionIcon = (cond: 'good' | 'damaged' | 'lost') => {
    switch (cond) {
      case 'good':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'damaged':
        return (
          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'lost':
        return (
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800">Validasi Pengembalian Asset</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting || loading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Return Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-3">Detail Pengembalian</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-800">Asset:</span>
                <p className="text-blue-600">{loan.asset.name} ({loan.asset.asset_tag})</p>
              </div>
              <div>
                <span className="font-medium text-blue-800">Peminjam:</span>
                <p className="text-blue-600">{loan.borrower.name}</p>
              </div>
              <div>
                <span className="font-medium text-blue-800">Tanggal Peminjaman:</span>
                <p className="text-blue-600">
                  {loan.loan_date ? new Date(loan.loan_date).toLocaleDateString('id-ID') : '-'}
                </p>
              </div>
              <div>
                <span className="font-medium text-blue-800">Tanggal Pengembalian:</span>
                <p className="text-blue-600">
                  {loan.actual_return_date ? new Date(loan.actual_return_date).toLocaleDateString('id-ID') : '-'}
                </p>
              </div>
              <div>
                <span className="font-medium text-blue-800">Expected Return:</span>
                <p className="text-blue-600">
                  {new Date(loan.expected_return_date).toLocaleDateString('id-ID')}
                </p>
              </div>
              <div>
                <span className="font-medium text-blue-800">Tujuan Peminjaman:</span>
                <p className="text-blue-600">{loan.purpose}</p>
              </div>
              {loan.return_notes && (
                <div className="col-span-2">
                  <span className="font-medium text-blue-800">Catatan User:</span>
                  <p className="text-blue-600 whitespace-pre-wrap">{loan.return_notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Return Proof Photo */}
          {loan.return_proof_photo_path && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bukti Foto Pengembalian
              </label>
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <img
                  src={`http://localhost:8000/storage/${loan.return_proof_photo_path}`}
                  alt="Bukti pengembalian"
                  className="w-full h-auto max-h-96 object-contain bg-gray-50"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EGambar tidak tersedia%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>
            </div>
          )}

          {/* Validation Form */}
          <form onSubmit={handleSubmit} className="space-y-6 border-t pt-6">
            {/* Verification Date */}
            <div>
              <label htmlFor="verification_date" className="block text-sm font-medium text-gray-700 mb-2">
                Tanggal Verifikasi *
              </label>
              <input
                type="date"
                id="verification_date"
                value={verificationDate}
                onChange={(e) => setVerificationDate(e.target.value)}
                max={today}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={isSubmitting || loading}
              />
            </div>

            {/* Action Selection */}
            {!action && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Pilih Tindakan
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setAction('approve')}
                    className="p-4 border-2 border-green-300 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <div>
                        <p className="font-semibold text-green-900">Setujui Pengembalian</p>
                        <p className="text-xs text-green-700">Validasi dan terima pengembalian asset</p>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAction('reject')}
                    className="p-4 border-2 border-red-300 bg-red-50 rounded-lg hover:bg-red-100 transition-colors text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <div>
                        <p className="font-semibold text-red-900">Tolak Pengembalian</p>
                        <p className="text-xs text-red-700">Minta user untuk submit ulang</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Approve Form */}
            {action === 'approve' && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-green-800">Form Persetujuan</h4>
                  <button
                    type="button"
                    onClick={() => {
                      setAction(null);
                      setCondition('good');
                      setAssessmentNotes('');
                    }}
                    className="text-sm text-gray-600 hover:text-gray-800"
                    disabled={isSubmitting || loading}
                  >
                    Ganti tindakan
                  </button>
                </div>

                {/* Condition Assessment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Penilaian Kondisi Asset *
                  </label>
                  <div className="space-y-2">
                    <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${condition === 'good' ? getConditionColor('good') + ' ring-2 ring-green-400' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input
                        type="radio"
                        name="condition"
                        value="good"
                        checked={condition === 'good'}
                        onChange={(e) => setCondition(e.target.value as 'good' | 'damaged' | 'lost')}
                        className="mr-3 text-green-600 focus:ring-green-500"
                        disabled={isSubmitting || loading}
                      />
                      <div className="flex items-center space-x-2 flex-1">
                        {getConditionIcon('good')}
                        <div>
                          <span className="font-medium text-gray-900">Baik</span>
                          <p className="text-xs text-gray-600">Asset dikembalikan dalam kondisi baik, siap digunakan</p>
                        </div>
                      </div>
                    </label>

                    <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${condition === 'damaged' ? getConditionColor('damaged') + ' ring-2 ring-yellow-400' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input
                        type="radio"
                        name="condition"
                        value="damaged"
                        checked={condition === 'damaged'}
                        onChange={(e) => setCondition(e.target.value as 'good' | 'damaged' | 'lost')}
                        className="mr-3 text-yellow-600 focus:ring-yellow-500"
                        disabled={isSubmitting || loading}
                      />
                      <div className="flex items-center space-x-2 flex-1">
                        {getConditionIcon('damaged')}
                        <div>
                          <span className="font-medium text-gray-900">Rusak</span>
                          <p className="text-xs text-gray-600">Asset mengalami kerusakan, perlu perbaikan</p>
                        </div>
                      </div>
                    </label>

                    <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${condition === 'lost' ? getConditionColor('lost') + ' ring-2 ring-red-400' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input
                        type="radio"
                        name="condition"
                        value="lost"
                        checked={condition === 'lost'}
                        onChange={(e) => setCondition(e.target.value as 'good' | 'damaged' | 'lost')}
                        className="mr-3 text-red-600 focus:ring-red-500"
                        disabled={isSubmitting || loading}
                      />
                      <div className="flex items-center space-x-2 flex-1">
                        {getConditionIcon('lost')}
                        <div>
                          <span className="font-medium text-gray-900">Hilang</span>
                          <p className="text-xs text-gray-600">Asset hilang atau tidak dikembalikan</p>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Assessment Notes */}
                <div>
                  <label htmlFor="assessment_notes" className="block text-sm font-medium text-gray-700 mb-2">
                    Catatan Penilaian {condition !== 'good' && '*'}
                  </label>
                  <textarea
                    id="assessment_notes"
                    value={assessmentNotes}
                    onChange={(e) => setAssessmentNotes(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={
                      condition === 'good'
                        ? 'Catatan tambahan penilaian (opsional)...'
                        : condition === 'damaged'
                        ? 'Jelaskan kerusakan yang ditemukan...'
                        : 'Jelaskan kronologi atau informasi terkait kehilangan...'
                    }
                    required={condition !== 'good'}
                    disabled={isSubmitting || loading}
                  />
                  {condition !== 'good' && (
                    <p className="text-xs text-orange-600 mt-1">
                      Wajib diisi untuk kondisi asset yang tidak baik
                    </p>
                  )}
                </div>

                {/* Status Info */}
                <div className={`p-4 rounded-lg border-2 ${
                  condition === 'good' ? 'bg-green-50 border-green-200' :
                  condition === 'damaged' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-red-50 border-red-200'
                }`}>
                  <p className="text-sm font-medium mb-1">
                    {condition === 'good' && '✓ Asset akan berstatus: Available'}
                    {condition === 'damaged' && '⚠ Asset akan berstatus: Dalam Perbaikan'}
                    {condition === 'lost' && '✗ Asset akan berstatus: Lost'}
                  </p>
                  <p className="text-xs text-gray-600">
                    Status asset akan otomatis diupdate setelah validasi disetujui
                  </p>
                </div>
              </div>
            )}

            {/* Reject Form */}
            {action === 'reject' && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-red-800">Form Penolakan</h4>
                  <button
                    type="button"
                    onClick={() => {
                      setAction(null);
                      setRejectionReason('');
                    }}
                    className="text-sm text-gray-600 hover:text-gray-800"
                    disabled={isSubmitting || loading}
                  >
                    Ganti tindakan
                  </button>
                </div>

                <div>
                  <label htmlFor="rejection_reason" className="block text-sm font-medium text-gray-700 mb-2">
                    Alasan Penolakan *
                  </label>
                  <textarea
                    id="rejection_reason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-red-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Jelaskan alasan penolakan (minimal 10 karakter)..."
                    required
                    minLength={10}
                    disabled={isSubmitting || loading}
                  />
                  <p className="text-xs text-red-600 mt-1">
                    Alasan penolakan akan dikirimkan ke user agar dapat submit ulang pengembalian
                  </p>
                </div>

                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-800 mb-1">
                    ⚠ Status peminjaman akan kembali ke APPROVED
                  </p>
                  <p className="text-xs text-red-600">
                    User dapat mengajukan pengembalian kembali setelah memperbaiki kekurangan
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {action && (
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  disabled={isSubmitting || loading}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    loading ||
                    !verificationDate ||
                    (action === 'approve' && !condition) ||
                    (action === 'approve' && condition !== 'good' && !assessmentNotes.trim()) ||
                    (action === 'reject' && (!rejectionReason.trim() || rejectionReason.trim().length < 10))
                  }
                  className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed ${
                    action === 'approve'
                      ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                      : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  }`}
                >
                  {isSubmitting || loading ? 'Memproses...' : action === 'approve' ? 'Setujui Pengembalian' : 'Tolak Pengembalian'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReturnValidationModal;
