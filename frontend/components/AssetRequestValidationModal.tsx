import React, { useState } from 'react';
import { AssetRequest } from '../types';

interface AssetRequestValidationModalProps {
  request: AssetRequest;
  onSuccess: () => void;
  onCancel: () => void;
}

const AssetRequestValidationModal: React.FC<AssetRequestValidationModalProps> = ({
  request,
  onSuccess,
  onCancel,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showApproveForm, setShowApproveForm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:8000/api/asset-requests/${request.id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approval_notes: approvalNotes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal menyetujui request');
      }

      alert('Request berhasil disetujui. Peminjaman asset telah dibuat secara otomatis.');
      onSuccess();
    } catch (error: any) {
      console.error('Failed to approve request:', error);
      alert(error.message || 'Gagal menyetujui request');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Mohon isi alasan penolakan');
      return;
    }

    setIsProcessing(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:8000/api/asset-requests/${request.id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rejection_reason: rejectionReason,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal menolak request');
      }

      alert('Request berhasil ditolak.');
      onSuccess();
    } catch (error: any) {
      console.error('Failed to reject request:', error);
      alert(error.message || 'Gagal menolak request');
    } finally {
      setIsProcessing(false);
    }
  };

  const canValidate = request.status === 'PENDING';

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-3xl mx-auto max-h-[90vh] overflow-y-auto">
      <h3 className="text-xl font-bold mb-6 text-gray-800">Detail Request Peminjaman Asset</h3>

      {/* Request Info */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="font-semibold text-gray-700 mb-3">Informasi Request</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-600">Unit Pemohon:</span>
            <p className="text-gray-900 mt-1">{request.requesterUnit?.name || 'N/A'}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Nama Pemohon:</span>
            <p className="text-gray-900 mt-1">{request.requester?.name || 'N/A'}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Tanggal Request:</span>
            <p className="text-gray-900 mt-1">
              {new Date(request.request_date).toLocaleDateString('id-ID')}
            </p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Status:</span>
            <p className="mt-1">
              <span
                className={`px-2 py-1 rounded text-xs font-semibold ${
                  request.status === 'PENDING'
                    ? 'bg-yellow-100 text-yellow-800'
                    : request.status === 'APPROVED'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {request.status}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Asset Info */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-gray-700 mb-3">Asset yang Diminta</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-600">Nama Asset:</span>
            <p className="text-gray-900 mt-1">{request.asset?.name || 'N/A'}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Kode Asset:</span>
            <p className="text-gray-900 mt-1 font-mono">{request.asset?.asset_tag || 'N/A'}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Kategori:</span>
            <p className="text-gray-900 mt-1">{request.asset?.category || 'N/A'}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Unit Pemilik:</span>
            <p className="text-gray-900 mt-1">{request.asset?.unit?.name || 'N/A'}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Status Asset:</span>
            <p className="text-gray-900 mt-1">{request.asset?.status || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Loan Details */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="font-semibold text-gray-700 mb-3">Detail Peminjaman</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-600">Tanggal Peminjaman:</span>
            <p className="text-gray-900 mt-1">
              {new Date(request.needed_date).toLocaleDateString('id-ID')}
            </p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Waktu:</span>
            <p className="text-gray-900 mt-1">
              {request.start_time && request.end_time
                ? `${request.start_time} - ${request.end_time} WIB`
                : '-'}
            </p>
          </div>
          <div className="col-span-2">
            <span className="font-medium text-gray-600">Tanggal Pengembalian:</span>
            <p className="text-gray-900 mt-1">
              {new Date(request.expected_return_date).toLocaleDateString('id-ID')}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <span className="font-medium text-gray-600">Tujuan Peminjaman:</span>
          <div className="text-gray-900 mt-1 bg-white p-3 rounded border">
            <p className="text-sm whitespace-pre-wrap">{request.purpose}</p>
          </div>
        </div>

        <div className="mt-4">
          <span className="font-medium text-gray-600">Alasan Request:</span>
          <div className="text-gray-900 mt-1 bg-white p-3 rounded border">
            <p className="text-sm whitespace-pre-wrap">{request.reason}</p>
          </div>
        </div>
      </div>

      {/* Review Info */}
      {request.status !== 'PENDING' && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-700 mb-3">Informasi Validasi</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Divalidasi oleh:</span>
              <p className="text-gray-900 mt-1">{request.reviewer?.name || '-'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Tanggal Validasi:</span>
              <p className="text-gray-900 mt-1">
                {request.review_date
                  ? new Date(request.review_date).toLocaleDateString('id-ID')
                  : '-'}
              </p>
            </div>
          </div>

          {request.status === 'APPROVED' && request.approval_notes && (
            <div className="mt-4">
              <span className="font-medium text-gray-600">Catatan Persetujuan:</span>
              <div className="text-gray-900 mt-1 bg-white p-3 rounded border">
                <p className="text-sm">{request.approval_notes}</p>
              </div>
            </div>
          )}

          {request.status === 'REJECTED' && request.rejection_reason && (
            <div className="mt-4">
              <span className="font-medium text-gray-600">Alasan Penolakan:</span>
              <div className="text-red-900 mt-1 bg-red-50 p-3 rounded border border-red-200">
                <p className="text-sm">{request.rejection_reason}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons - Only show if PENDING */}
      {canValidate && !showApproveForm && !showRejectForm && (
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
            disabled={isProcessing}
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={() => setShowRejectForm(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            disabled={isProcessing}
          >
            Tolak Request
          </button>
          <button
            type="button"
            onClick={() => setShowApproveForm(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            disabled={isProcessing}
          >
            Setujui Request
          </button>
        </div>
      )}

      {/* Approve Form */}
      {showApproveForm && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-semibold text-green-800 mb-3">Setujui Request</h4>
          <p className="text-sm text-green-700 mb-4">
            Jika disetujui, peminjaman asset akan dibuat secara otomatis dan status asset akan berubah menjadi "Terpinjam".
          </p>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Catatan Persetujuan (Opsional)
            </label>
            <textarea
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Tambahkan catatan jika diperlukan..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowApproveForm(false);
                setApprovalNotes('');
              }}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
              disabled={isProcessing}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleApprove}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              disabled={isProcessing}
            >
              {isProcessing ? 'Memproses...' : 'Konfirmasi Setujui'}
            </button>
          </div>
        </div>
      )}

      {/* Reject Form */}
      {showRejectForm && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="font-semibold text-red-800 mb-3">Tolak Request</h4>
          <p className="text-sm text-red-700 mb-4">
            Mohon berikan alasan penolakan yang jelas untuk unit pemohon.
          </p>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alasan Penolakan *
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Jelaskan alasan penolakan..."
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowRejectForm(false);
                setRejectionReason('');
              }}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
              disabled={isProcessing}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleReject}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              disabled={isProcessing}
            >
              {isProcessing ? 'Memproses...' : 'Konfirmasi Tolak'}
            </button>
          </div>
        </div>
      )}

      {/* Close button if already processed */}
      {!canValidate && (
        <div className="flex justify-end pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
          >
            Tutup
          </button>
        </div>
      )}
    </div>
  );
};

export default AssetRequestValidationModal;
