import React, { useState, useEffect } from 'react';
import { AssetMovement } from '../types';
import { getPendingMovements, approveAssetTransfer, rejectAssetTransfer } from '../services/api';

interface AssetTransferValidationProps {
  onRefresh?: () => void;
}

const AssetTransferValidation: React.FC<AssetTransferValidationProps> = ({ onRefresh }) => {
  const [pendingMovements, setPendingMovements] = useState<AssetMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMovement, setSelectedMovement] = useState<AssetMovement | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPendingMovements();
  }, []);

  const fetchPendingMovements = async () => {
    setIsLoading(true);
    try {
      const movements = await getPendingMovements();
      console.log('Pending movements:', movements); // Debug log
      if (movements.length > 0) {
        console.log('First movement data:', movements[0]); // Debug first item
      }
      setPendingMovements(movements);
    } catch (error) {
      console.error('Failed to fetch pending movements:', error);
      alert('Gagal memuat daftar request perpindahan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (movement: AssetMovement) => {
    console.log('Movement object:', movement); // Debug log

    // Coba akses dengan berbagai cara untuk debug
    const assetName = movement.asset?.name || 'asset ini';
    const fromUnitName = (movement as any).from_unit?.name || movement.fromUnit?.name || 'unit asal';
    const toUnitName = (movement as any).to_unit?.name || movement.toUnit?.name || 'unit tujuan';

    if (!confirm(`Setujui perpindahan asset ${assetName} dari ${fromUnitName} ke ${toUnitName}?`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      await approveAssetTransfer(movement.id);
      alert('Perpindahan asset berhasil disetujui');
      fetchPendingMovements();
      onRefresh?.();
    } catch (error: any) {
      console.error('Failed to approve transfer:', error);
      alert(error.message || 'Gagal menyetujui perpindahan asset');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = (movement: AssetMovement) => {
    setSelectedMovement(movement);
    setShowRejectModal(true);
    setRejectionReason('');
  };

  const submitRejection = async () => {
    if (!selectedMovement) return;

    if (!rejectionReason.trim()) {
      alert('Silakan masukkan alasan penolakan');
      return;
    }

    setIsSubmitting(true);
    try {
      await rejectAssetTransfer(selectedMovement.id, {
        rejection_reason: rejectionReason,
      });
      alert('Perpindahan asset berhasil ditolak');
      setShowRejectModal(false);
      setSelectedMovement(null);
      setRejectionReason('');
      fetchPendingMovements();
      onRefresh?.();
    } catch (error: any) {
      console.error('Failed to reject transfer:', error);
      alert(error.message || 'Gagal menolak perpindahan asset');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Validasi Perpindahan Asset</h2>
        <div className="text-center py-8">
          <p className="text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Validasi Perpindahan Asset</h2>
        <button
          onClick={fetchPendingMovements}
          className="text-primary hover:text-primary-dark"
        >
          Refresh
        </button>
      </div>

      {pendingMovements.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Tidak ada request perpindahan yang perlu divalidasi</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingMovements.map((movement) => (
            <div key={movement.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">{movement.asset?.name}</h3>
                  <p className="text-sm text-gray-600">
                    <strong>Asset Tag:</strong> {movement.asset?.asset_tag}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Kategori:</strong> {movement.asset?.category}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">
                    <strong>Dari Unit:</strong> {(movement as any).from_unit?.name || movement.fromUnit?.name || '-'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Ke Unit:</strong> {(movement as any).to_unit?.name || movement.toUnit?.name || '-'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Diminta oleh:</strong> {(movement as any).requested_by?.name || movement.requestedBy?.name || '-'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Tanggal Request:</strong> {formatDate(movement.requested_at)}
                  </p>
                </div>
              </div>

              {movement.notes && (
                <div className="mt-3 p-3 bg-gray-100 rounded">
                  <p className="text-sm text-gray-700">
                    <strong>Catatan:</strong> {movement.notes}
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-2 mt-4">
                <button
                  onClick={() => handleReject(movement)}
                  disabled={isSubmitting}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors disabled:bg-gray-400"
                >
                  Tolak
                </button>
                <button
                  onClick={() => handleApprove(movement)}
                  disabled={isSubmitting}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-400"
                >
                  Setujui
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedMovement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Tolak Perpindahan Asset</h3>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Asset:</strong> {selectedMovement.asset?.name}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Dari:</strong> {(selectedMovement as any).from_unit?.name || selectedMovement.fromUnit?.name || '-'}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Ke:</strong> {(selectedMovement as any).to_unit?.name || selectedMovement.toUnit?.name || '-'}
              </p>
            </div>

            <div className="mb-4">
              <label htmlFor="rejectionReason" className="block text-sm font-medium text-gray-700 mb-2">
                Alasan Penolakan <span className="text-red-500">*</span>
              </label>
              <textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                placeholder="Masukkan alasan penolakan..."
                required
              />
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedMovement(null);
                  setRejectionReason('');
                }}
                disabled={isSubmitting}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={submitRejection}
                disabled={isSubmitting || !rejectionReason.trim()}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors disabled:bg-gray-400"
              >
                {isSubmitting ? 'Menolak...' : 'Tolak Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetTransferValidation;
