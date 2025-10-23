import React, { useState, useEffect } from 'react';
import { AssetMovement } from '../types';
import { getAssetHistory } from '../services/api';

interface AssetTransferHistoryProps {
  assetId: number;
}

const AssetTransferHistory: React.FC<AssetTransferHistoryProps> = ({ assetId }) => {
  const [movements, setMovements] = useState<AssetMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [assetId]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const history = await getAssetHistory(assetId.toString());
      setMovements(history);
    } catch (error) {
      console.error('Failed to fetch asset transfer history:', error);
    } finally {
      setIsLoading(false);
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

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string) => {
    const texts = {
      PENDING: 'Menunggu Validasi',
      APPROVED: 'Disetujui',
      REJECTED: 'Ditolak',
    };
    return texts[status as keyof typeof texts] || status;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Riwayat Perpindahan</h3>
        <div className="text-center py-4">
          <p className="text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Riwayat Perpindahan</h3>

      {movements.length === 0 ? (
        <p className="text-gray-600 text-center py-4">Belum ada riwayat perpindahan</p>
      ) : (
        <div className="space-y-3">
          {movements.map((movement) => (
            <div key={movement.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusBadge(movement.status)}`}>
                      {getStatusText(movement.status)}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700">
                    <strong>Dari:</strong> {movement.fromUnit?.name || '-'}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Ke:</strong> {movement.toUnit?.name || '-'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Diminta oleh: {movement.requestedBy?.name || '-'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Tanggal: {formatDate(movement.requested_at)}
                  </p>
                </div>
              </div>

              {movement.notes && (
                <div className="mt-2 p-2 bg-gray-50 rounded">
                  <p className="text-xs text-gray-600">
                    <strong>Catatan:</strong> {movement.notes}
                  </p>
                </div>
              )}

              {movement.status === 'APPROVED' && movement.validatedBy && (
                <div className="mt-2 p-2 bg-green-50 rounded">
                  <p className="text-xs text-green-700">
                    <strong>Disetujui oleh:</strong> {movement.validatedBy.name}
                  </p>
                  {movement.validated_at && (
                    <p className="text-xs text-green-700">
                      <strong>Tanggal Validasi:</strong> {formatDate(movement.validated_at)}
                    </p>
                  )}
                </div>
              )}

              {movement.status === 'REJECTED' && (
                <div className="mt-2 p-2 bg-red-50 rounded">
                  {movement.validatedBy && (
                    <p className="text-xs text-red-700">
                      <strong>Ditolak oleh:</strong> {movement.validatedBy.name}
                    </p>
                  )}
                  {movement.validated_at && (
                    <p className="text-xs text-red-700">
                      <strong>Tanggal Penolakan:</strong> {formatDate(movement.validated_at)}
                    </p>
                  )}
                  {movement.rejection_reason && (
                    <p className="text-xs text-red-700 mt-1">
                      <strong>Alasan:</strong> {movement.rejection_reason}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AssetTransferHistory;
