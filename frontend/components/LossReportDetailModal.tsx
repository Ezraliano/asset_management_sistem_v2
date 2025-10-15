import React, { useState } from 'react';
import { LossReport, User } from '../types';
import { updateIncidentStatus, getIncidentPhoto } from '../services/api';

interface LossReportDetailModalProps {
  report: LossReport;
  currentUser: User;
  onClose: () => void;
  onSuccess: () => void;
}

const LossReportDetailModal: React.FC<LossReportDetailModalProps> = ({
  report,
  currentUser,
  onClose,
  onSuccess
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showApproveForm, setShowApproveForm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [responsibleParty, setResponsibleParty] = useState('');

  // Check if user can validate (Super Admin or Admin Holding only)
  const canValidate = ['Super Admin', 'Admin Holding'].includes(currentUser.role) &&
                      report.status === 'PENDING';

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatDateTime = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const handleApprove = async () => {
    if (!resolutionNotes.trim()) {
      alert('Mohon isi catatan resolusi');
      return;
    }

    setIsProcessing(true);
    try {
      await updateIncidentStatus(report.id, {
        status: 'RESOLVED',
        resolution_notes: resolutionNotes,
        responsible_party: responsibleParty || undefined
      });

      alert('Laporan kehilangan telah disetujui. Status aset akan diubah menjadi Lost.');
      onSuccess();
    } catch (error: any) {
      console.error('Failed to approve loss report:', error);
      alert(error.message || 'Gagal menyetujui laporan kehilangan');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!resolutionNotes.trim()) {
      alert('Mohon isi alasan penolakan');
      return;
    }

    setIsProcessing(true);
    try {
      await updateIncidentStatus(report.id, {
        status: 'CLOSED',
        resolution_notes: resolutionNotes
      });

      alert('Laporan kehilangan telah ditolak.');
      onSuccess();
    } catch (error: any) {
      console.error('Failed to reject loss report:', error);
      alert(error.message || 'Gagal menolak laporan kehilangan');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      'PENDING': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Menunggu Validasi' },
      'UNDER_REVIEW': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Sedang Ditinjau' },
      'RESOLVED': { bg: 'bg-green-100', text: 'text-green-800', label: 'Disetujui' },
      'CLOSED': { bg: 'bg-red-100', text: 'text-red-800', label: 'Ditolak' }
    };

    const config = statusConfig[status] || statusConfig['PENDING'];
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <h2 className="text-2xl font-bold text-gray-900">Detail Laporan Kehilangan</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Status Badge */}
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-600">Status:</span>
        {getStatusBadge(report.status)}
      </div>

      {/* Asset Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Informasi Aset</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-blue-700 font-medium">Nama Aset:</span>
            <p className="text-blue-900">{report.asset?.name || 'N/A'}</p>
          </div>
          <div>
            <span className="text-blue-700 font-medium">Asset Tag:</span>
            <p className="text-blue-900">{report.asset?.asset_tag || 'N/A'}</p>
          </div>
          <div>
            <span className="text-blue-700 font-medium">Kategori:</span>
            <p className="text-blue-900">{report.asset?.category || 'N/A'}</p>
          </div>
          <div>
            <span className="text-blue-700 font-medium">Unit:</span>
            <p className="text-blue-900">{report.asset?.unit?.name || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Report Details */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Kejadian</label>
          <p className="text-gray-900">{formatDate(report.date)}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi Kehilangan</label>
          <p className="text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-200">
            {report.description}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dilaporkan Oleh</label>
          <p className="text-gray-900">{report.reporter?.name || 'N/A'}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Laporan</label>
          <p className="text-gray-900">{formatDateTime(report.created_at)}</p>
        </div>

        {/* Evidence Photo */}
        {report.evidence_photo_path && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bukti Foto</label>
            <img
              src={getIncidentPhoto(report.id)}
              alt="Bukti kehilangan"
              className="w-full max-w-md h-auto rounded-lg border border-gray-300 shadow-sm"
            />
          </div>
        )}

        {/* Review Information */}
        {report.reviewed_by && report.reviewer && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Informasi Review</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-700 font-medium">Direview Oleh:</span>
                <p className="text-gray-900">{report.reviewer.name}</p>
              </div>
              {report.review_date && (
                <div>
                  <span className="text-gray-700 font-medium">Tanggal Review:</span>
                  <p className="text-gray-900">{formatDateTime(report.review_date)}</p>
                </div>
              )}
              {report.resolution_notes && (
                <div>
                  <span className="text-gray-700 font-medium">Catatan Resolusi:</span>
                  <p className="text-gray-900">{report.resolution_notes}</p>
                </div>
              )}
              {report.responsible_party && (
                <div>
                  <span className="text-gray-700 font-medium">Pihak Bertanggung Jawab:</span>
                  <p className="text-gray-900">{report.responsible_party}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons for Super Admin and Admin Holding */}
      {canValidate && !showApproveForm && !showRejectForm && (
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            onClick={() => setShowRejectForm(true)}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
          >
            Tolak Laporan
          </button>
          <button
            onClick={() => setShowApproveForm(true)}
            className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
          >
            Setujui Laporan
          </button>
        </div>
      )}

      {/* Approve Form */}
      {showApproveForm && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
          <h3 className="text-lg font-semibold text-green-900">Setujui Laporan Kehilangan</h3>
          <p className="text-sm text-green-800">
            Dengan menyetujui laporan ini, status aset akan otomatis diubah menjadi <strong>Lost (Hilang)</strong>.
          </p>

          <div>
            <label htmlFor="resolution_notes" className="block text-sm font-medium text-gray-700 mb-1">
              Catatan Resolusi *
            </label>
            <textarea
              id="resolution_notes"
              rows={3}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Masukkan catatan resolusi..."
            />
          </div>

          <div>
            <label htmlFor="responsible_party" className="block text-sm font-medium text-gray-700 mb-1">
              Pihak Bertanggung Jawab (Opsional)
            </label>
            <input
              type="text"
              id="responsible_party"
              value={responsibleParty}
              onChange={(e) => setResponsibleParty(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Nama pihak yang bertanggung jawab..."
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowApproveForm(false);
                setResolutionNotes('');
                setResponsibleParty('');
              }}
              disabled={isProcessing}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={handleApprove}
              disabled={isProcessing || !resolutionNotes.trim()}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {isProcessing ? 'Memproses...' : 'Konfirmasi Setujui'}
            </button>
          </div>
        </div>
      )}

      {/* Reject Form */}
      {showRejectForm && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-4">
          <h3 className="text-lg font-semibold text-red-900">Tolak Laporan Kehilangan</h3>
          <p className="text-sm text-red-800">
            Dengan menolak laporan ini, status aset akan tetap seperti semula dan laporan akan ditandai sebagai ditolak.
          </p>

          <div>
            <label htmlFor="rejection_notes" className="block text-sm font-medium text-gray-700 mb-1">
              Alasan Penolakan *
            </label>
            <textarea
              id="rejection_notes"
              rows={3}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Masukkan alasan penolakan..."
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowRejectForm(false);
                setResolutionNotes('');
              }}
              disabled={isProcessing}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={handleReject}
              disabled={isProcessing || !resolutionNotes.trim()}
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {isProcessing ? 'Memproses...' : 'Konfirmasi Tolak'}
            </button>
          </div>
        </div>
      )}

      {/* Close Button (if not validating) */}
      {!canValidate && (
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Tutup
          </button>
        </div>
      )}
    </div>
  );
};

export default LossReportDetailModal;
