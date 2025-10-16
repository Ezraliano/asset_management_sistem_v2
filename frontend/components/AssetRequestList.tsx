import React, { useState, useEffect } from 'react';
import { AssetRequest, AssetRequestStatus } from '../types';
import Modal from './Modal';
import AssetRequestValidationModal from './AssetRequestValidationModal';

interface AssetRequestListProps {
  currentUser: any;
}

const AssetRequestList: React.FC<AssetRequestListProps> = ({ currentUser }) => {
  const [requests, setRequests] = useState<AssetRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedRequest, setSelectedRequest] = useState<AssetRequest | null>(null);
  const [isValidationModalOpen, setValidationModalOpen] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      let url = 'http://localhost:8000/api/asset-requests';

      if (statusFilter !== 'ALL') {
        url += `?status=${statusFilter}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch requests');

      const data = await response.json();
      setRequests(data.data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      alert('Gagal memuat daftar request');
    } finally {
      setLoading(false);
    }
  };

  const handleViewRequest = (request: AssetRequest) => {
    setSelectedRequest(request);
    setValidationModalOpen(true);
  };

  const handleValidationSuccess = () => {
    setValidationModalOpen(false);
    setSelectedRequest(null);
    fetchRequests(); // Refresh list
  };

  const handleCloseModal = () => {
    setValidationModalOpen(false);
    setSelectedRequest(null);
  };

  const getStatusBadge = (status: AssetRequestStatus) => {
    switch (status) {
      case AssetRequestStatus.PENDING:
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">PENDING</span>;
      case AssetRequestStatus.APPROVED:
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">APPROVED</span>;
      case AssetRequestStatus.REJECTED:
        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">REJECTED</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded">{status}</span>;
    }
  };

  const canValidate = currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin Holding';

  const handleCreateRequest = () => {
    // This will be passed from parent
    window.dispatchEvent(new CustomEvent('openRequestForm'));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">
          Request Peminjaman Asset Antar Unit
        </h3>

        <div className="flex gap-3 items-center">
          {/* Request Button for Admin Unit */}
          {currentUser?.role === 'Admin Unit' && (
            <button
              onClick={handleCreateRequest}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              + Request Asset Antar Unit
            </button>
          )}

          {/* Status Filter */}
          <div className="flex gap-2 items-center">
            <label className="text-sm font-medium text-gray-700">Filter:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Semua Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Info Badge */}
      {currentUser?.role === 'Admin Unit' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            Berikut adalah request peminjaman yang dibuat oleh unit Anda. Request akan divalidasi oleh Admin Holding atau Super Admin.
          </p>
        </div>
      )}

      {canValidate && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-sm text-purple-800">
            Anda dapat memvalidasi request peminjaman asset antar unit. Klik "Lihat Detail" untuk approve atau reject request.
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Memuat data...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500">Belum ada request peminjaman asset</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Asset
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Unit Pemohon
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Unit Pemilik
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Tanggal Dibutuhkan
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Waktu
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {requests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {request.asset?.name || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">
                        {request.asset?.asset_tag || '-'}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm text-gray-900">
                        {request.requesterUnit?.name || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {request.requester?.name || '-'}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900">
                      {request.asset?.unit?.name || 'N/A'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900">
                      {new Date(request.needed_date).toLocaleDateString('id-ID')}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-gray-700">
                      {request.start_time && request.end_time
                        ? `${request.start_time} - ${request.end_time}`
                        : '-'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(request.status)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleViewRequest(request)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {canValidate && request.status === AssetRequestStatus.PENDING
                        ? 'Validasi'
                        : 'Lihat Detail'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Validation Modal */}
      {isValidationModalOpen && selectedRequest && (
        <Modal isOpen={isValidationModalOpen} onClose={handleCloseModal}>
          <AssetRequestValidationModal
            request={selectedRequest}
            onSuccess={handleValidationSuccess}
            onCancel={handleCloseModal}
          />
        </Modal>
      )}
    </div>
  );
};

export default AssetRequestList;
