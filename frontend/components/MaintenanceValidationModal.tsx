import React, { useState } from 'react';
import { Maintenance, User } from '../types';

interface MaintenanceValidationModalProps {
  maintenance: Maintenance;
  currentUser: User;
  onClose: () => void;
  onSuccess: () => void;
}

const MaintenanceValidationModal: React.FC<MaintenanceValidationModalProps> = ({
  maintenance,
  currentUser,
  onClose,
  onSuccess
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showApproveForm, setShowApproveForm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [validationNotes, setValidationNotes] = useState('');

  // Check if user can validate (Super Admin, Admin Holding, or Admin Unit)
  const canValidate = ['Super Admin', 'Admin Holding', 'Admin Unit'].includes(currentUser.role) &&
                      maintenance.validation_status === 'PENDING';

  // Check if user can complete (Super Admin, Admin Holding, or Admin Unit)
  const canComplete = ['Super Admin', 'Admin Holding', 'Admin Unit'].includes(currentUser.role) &&
                      maintenance.validation_status === 'APPROVED' &&
                      maintenance.status !== 'COMPLETED';

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
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:8000/api/maintenances/${maintenance.id}/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          validation_status: 'APPROVED',
          validation_notes: validationNotes || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal menyetujui');
      }

      alert('Laporan perbaikan/pemeliharaan telah disetujui');
      onSuccess();
    } catch (error: any) {
      console.error('Failed to approve maintenance:', error);
      alert(error.message || 'Gagal menyetujui laporan perbaikan/pemeliharaan');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!validationNotes.trim()) {
      alert('Mohon isi alasan penolakan');
      return;
    }

    setIsProcessing(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:8000/api/maintenances/${maintenance.id}/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          validation_status: 'REJECTED',
          validation_notes: validationNotes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal menolak');
      }

      alert('Laporan perbaikan/pemeliharaan telah ditolak');
      onSuccess();
    } catch (error: any) {
      console.error('Failed to reject maintenance:', error);
      alert(error.message || 'Gagal menolak laporan perbaikan/pemeliharaan');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComplete = async () => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:8000/api/maintenances/${maintenance.id}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal menyelesaikan perbaikan');
      }

      alert('Perbaikan berhasil diselesaikan. Status aset telah diubah menjadi Available.');
      onSuccess();
    } catch (error: any) {
      console.error('Failed to complete maintenance:', error);
      alert(error.message || 'Gagal menyelesaikan perbaikan');
    } finally {
      setIsProcessing(false);
    }
  };

  const getValidationStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      'PENDING': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Menunggu Validasi' },
      'APPROVED': { bg: 'bg-green-100', text: 'text-green-800', label: 'Disetujui' },
      'REJECTED': { bg: 'bg-red-100', text: 'text-red-800', label: 'Ditolak' }
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
        <h2 className="text-2xl font-bold text-gray-900">
          Detail {maintenance.type}
        </h2>
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
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-600">Tipe:</span>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
            maintenance.type === 'Perbaikan' ? 'bg-red-600 text-white' : 'bg-yellow-600 text-white'
          }`}>
            {maintenance.type}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-600">Status Validasi:</span>
          {getValidationStatusBadge(maintenance.validation_status)}
        </div>
      </div>

      {/* Asset Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Informasi Aset</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-blue-700 font-medium">Nama Aset:</span>
            <p className="text-blue-900">{maintenance.asset?.name || 'N/A'}</p>
          </div>
          <div>
            <span className="text-blue-700 font-medium">Asset Tag:</span>
            <p className="text-blue-900">{maintenance.asset?.asset_tag || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Maintenance Details */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
            <p className="text-gray-900">{formatDate(maintenance.date)}</p>
          </div>
          {maintenance.unit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <p className="text-gray-900">{maintenance.unit.name}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pihak yang Menangani</label>
            <p className="text-gray-900">{maintenance.party_type}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Instansi</label>
            <p className="text-gray-900">{maintenance.instansi}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">No Telepon</label>
          <p className="text-gray-900">{maintenance.phone_number}</p>
        </div>

        {maintenance.description && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
            <p className="text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-200">
              {maintenance.description}
            </p>
          </div>
        )}

        {/* Photo Proof */}
        {maintenance.photo_proof && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Foto Bukti</label>
            <img
              src={`http://localhost:8000/storage/${maintenance.photo_proof}`}
              alt="Bukti Perbaikan/Pemeliharaan"
              className="w-full max-w-md h-auto rounded-lg border border-gray-300 shadow-sm cursor-pointer"
              onClick={() => window.open(`http://localhost:8000/storage/${maintenance.photo_proof}`, '_blank')}
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EGambar tidak tersedia%3C/text%3E%3C/svg%3E';
              }}
            />
          </div>
        )}

        {/* Validation Information */}
        {maintenance.validated_by && maintenance.validator && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Informasi Validasi</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-700 font-medium">Divalidasi Oleh:</span>
                <p className="text-gray-900">{maintenance.validator.name}</p>
              </div>
              {maintenance.validation_date && (
                <div>
                  <span className="text-gray-700 font-medium">Tanggal Validasi:</span>
                  <p className="text-gray-900">{formatDateTime(maintenance.validation_date)}</p>
                </div>
              )}
              {maintenance.validation_notes && (
                <div>
                  <span className="text-gray-700 font-medium">Catatan Validasi:</span>
                  <p className="text-gray-900">{maintenance.validation_notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Completion Information */}
        {maintenance.completed_by && maintenance.completedBy && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-green-900 mb-2">Informasi Penyelesaian</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-green-700 font-medium">Diselesaikan Oleh:</span>
                <p className="text-green-900">{maintenance.completedBy.name}</p>
              </div>
              {maintenance.completion_date && (
                <div>
                  <span className="text-green-700 font-medium">Tanggal Penyelesaian:</span>
                  <p className="text-green-900">{formatDateTime(maintenance.completion_date)}</p>
                </div>
              )}
              <div className="mt-2 pt-2 border-t border-green-200">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-600 text-white">
                  ✓ Perbaikan Selesai
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons for Validation */}
      {canValidate && !showApproveForm && !showRejectForm && (
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            onClick={() => setShowRejectForm(true)}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
          >
            Tolak
          </button>
          <button
            onClick={() => setShowApproveForm(true)}
            className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
          >
            Setujui
          </button>
        </div>
      )}

      {/* Action Button for Completing Maintenance */}
      {canComplete && !showCompleteForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-900 mb-1">Perbaikan Sudah Selesai?</h4>
              <p className="text-sm text-blue-700 mb-3">
                Jika perbaikan aset sudah selesai dilakukan, klik tombol di bawah untuk menyelesaikan proses perbaikan.
                Status aset akan otomatis berubah menjadi <span className="font-semibold">Available</span>.
              </p>
              <button
                onClick={() => setShowCompleteForm(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Selesaikan Perbaikan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Form */}
      {showApproveForm && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
          <h3 className="text-lg font-semibold text-green-900">Setujui Laporan {maintenance.type}</h3>

          <div>
            <label htmlFor="validation_notes" className="block text-sm font-medium text-gray-700 mb-1">
              Catatan Validasi (Opsional)
            </label>
            <textarea
              id="validation_notes"
              rows={3}
              value={validationNotes}
              onChange={(e) => setValidationNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Masukkan catatan validasi (jika ada)..."
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowApproveForm(false);
                setValidationNotes('');
              }}
              disabled={isProcessing}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={handleApprove}
              disabled={isProcessing}
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
          <h3 className="text-lg font-semibold text-red-900">Tolak Laporan {maintenance.type}</h3>

          <div>
            <label htmlFor="rejection_notes" className="block text-sm font-medium text-gray-700 mb-1">
              Alasan Penolakan *
            </label>
            <textarea
              id="rejection_notes"
              rows={3}
              value={validationNotes}
              onChange={(e) => setValidationNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Masukkan alasan penolakan..."
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowRejectForm(false);
                setValidationNotes('');
              }}
              disabled={isProcessing}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={handleReject}
              disabled={isProcessing || !validationNotes.trim()}
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {isProcessing ? 'Memproses...' : 'Konfirmasi Tolak'}
            </button>
          </div>
        </div>
      )}

      {/* Complete Confirmation Form */}
      {showCompleteForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4 mt-4">
          <h3 className="text-lg font-semibold text-blue-900">Konfirmasi Penyelesaian Perbaikan</h3>

          <div className="bg-white border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              Dengan menyelesaikan perbaikan ini, sistem akan:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-gray-700">
              <li>Mengubah status maintenance menjadi <span className="font-semibold text-blue-700">COMPLETED</span></li>
              <li>Mengubah status aset menjadi <span className="font-semibold text-green-700">Available</span></li>
              <li>Mencatat tanggal penyelesaian dan user yang menyelesaikan</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowCompleteForm(false)}
              disabled={isProcessing}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={handleComplete}
              disabled={isProcessing}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {isProcessing ? 'Memproses...' : 'Konfirmasi Selesaikan Perbaikan'}
            </button>
          </div>
        </div>
      )}

      {/* Close Button (if not validating and not completing) */}
      {!canValidate && !canComplete && (
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

export default MaintenanceValidationModal;
