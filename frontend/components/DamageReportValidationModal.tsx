import React, { useState } from 'react';
import { DamageReport, User } from '../types';

interface DamageReportValidationModalProps {
  report: DamageReport;
  currentUser: User;
  onClose: () => void;
  onSuccess: () => void;
}

const DamageReportValidationModal: React.FC<DamageReportValidationModalProps> = ({
  report,
  currentUser,
  onClose,
  onSuccess
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [responsibleParty, setResponsibleParty] = useState('');

  // Check if user can validate
  const canValidate = ['super-admin', 'admin', 'unit'].includes(currentUser.role) &&
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

  const handleResolve = async () => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`https://assetmanagementga.arjunaconnect.com/api/incident-reports/${report.id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'RESOLVED',
          resolution_notes: resolutionNotes,
          responsible_party: responsibleParty || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal memvalidasi laporan');
      }

      alert('Laporan kerusakan berhasil divalidasi. Status aset telah diubah menjadi Rusak.');
      onSuccess();
    } catch (error: any) {
      console.error('Failed to resolve damage report:', error);
      alert(error.message || 'Gagal memvalidasi laporan kerusakan');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = async () => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`https://assetmanagementga.arjunaconnect.com/api/incident-reports/${report.id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'CLOSED',
          resolution_notes: resolutionNotes,
          responsible_party: responsibleParty || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal menutup laporan');
      }

      alert('Laporan kerusakan ditolak/ditutup.');
      onSuccess();
    } catch (error: any) {
      console.error('Failed to close damage report:', error);
      alert(error.message || 'Gagal menutup laporan kerusakan');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      'PENDING': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Menunggu Validasi' },
      'UNDER_REVIEW': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Sedang Ditinjau' },
      'RESOLVED': { bg: 'bg-green-100', text: 'text-green-800', label: 'Disetujui' },
      'CLOSED': { bg: 'bg-red-100', text: 'text-red-800', label: 'Ditolak' },
    };

    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Detail Laporan Kerusakan</h2>
      </div>

      <div className="space-y-4">
        {/* Asset Info */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Informasi Aset</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-700 font-medium">Nama Aset:</span>
              <p className="text-gray-900">{report.asset?.name || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-700 font-medium">Asset Tag:</span>
              <p className="text-gray-900">{report.asset?.asset_tag || 'N/A'}</p>
            </div>
            {report.asset?.unit && (
              <div>
                <span className="text-gray-700 font-medium">Unit:</span>
                <p className="text-gray-900">{report.asset.unit.name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          {getStatusBadge(report.status)}
        </div>

        {/* Report Details */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Kejadian</label>
          <p className="text-gray-900">{formatDate(report.date)}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi Kerusakan</label>
          <p className="text-gray-900 whitespace-pre-wrap">{report.description}</p>
        </div>

        {/* Reported by */}
        {report.reporter && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dilaporkan Oleh</label>
            <p className="text-gray-900">{report.reporter.name}</p>
          </div>
        )}

        {/* Evidence Photo */}
        {report.evidence_photo_path && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Foto Bukti</label>
            <img
              src={`https://assetmanagementga.arjunaconnect.com/api/storage/${report.evidence_photo_path}`}
              alt="Bukti kerusakan"
              className="max-w-full h-auto rounded-lg border border-gray-300 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => window.open(`https://assetmanagementga.arjunaconnect.com/api/storage/${report.evidence_photo_path}`, '_blank')}
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EGambar tidak tersedia%3C/text%3E%3C/svg%3E';
              }}
            />
          </div>
        )}

        {/* Validation Information */}
        {report.reviewed_by && report.reviewer && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Informasi Validasi</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-700 font-medium">Divalidasi Oleh:</span>
                <p className="text-gray-900">{report.reviewer.name}</p>
              </div>
              {report.review_date && (
                <div>
                  <span className="text-gray-700 font-medium">Tanggal Validasi:</span>
                  <p className="text-gray-900">{formatDateTime(report.review_date)}</p>
                </div>
              )}
              {report.resolution_notes && (
                <div>
                  <span className="text-gray-700 font-medium">Catatan Validasi:</span>
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

      {/* Action Buttons for Validation */}
      {canValidate && !showResolveForm && !showCloseForm && (
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            onClick={() => setShowCloseForm(true)}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
          >
            Tolak
          </button>
          <button
            onClick={() => setShowResolveForm(true)}
            className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
          >
            Setujui
          </button>
        </div>
      )}

      {/* Resolve Form */}
      {showResolveForm && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
          <h3 className="text-lg font-semibold text-green-900">Setujui Laporan Kerusakan</h3>

          <div className="bg-white border border-green-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              Dengan menyetujui laporan ini, sistem akan:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-gray-700">
              <li>Mengubah status laporan menjadi <span className="font-semibold text-green-700">RESOLVED</span></li>
              <li>Mengubah status aset menjadi <span className="font-semibold text-red-700">Rusak</span></li>
            </ul>
          </div>

          <div>
            <label htmlFor="resolution_notes" className="block text-sm font-medium text-gray-700 mb-1">
              Catatan Validasi
            </label>
            <textarea
              id="resolution_notes"
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              rows={3}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              placeholder="Berikan catatan mengenai kerusakan yang dilaporkan..."
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
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              placeholder="Nama pihak yang bertanggung jawab..."
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowResolveForm(false)}
              disabled={isProcessing}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={handleResolve}
              disabled={isProcessing}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {isProcessing ? 'Memproses...' : 'Konfirmasi Setujui'}
            </button>
          </div>
        </div>
      )}

      {/* Close/Reject Form */}
      {showCloseForm && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-4">
          <h3 className="text-lg font-semibold text-red-900">Tolak Laporan Kerusakan</h3>

          <div>
            <label htmlFor="close_resolution_notes" className="block text-sm font-medium text-gray-700 mb-1">
              Alasan Penolakan <span className="text-red-500">*</span>
            </label>
            <textarea
              id="close_resolution_notes"
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              rows={3}
              required
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
              placeholder="Berikan alasan penolakan laporan ini..."
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowCloseForm(false)}
              disabled={isProcessing}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={handleClose}
              disabled={isProcessing || !resolutionNotes.trim()}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
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

export default DamageReportValidationModal;
