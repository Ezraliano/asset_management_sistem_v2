import React, { useState, useEffect, useMemo } from 'react';
import { getAssetLoans, approveAssetLoan, rejectAssetLoan, returnAssetLoan, getCurrentUser, approveAssetReturn, rejectAssetReturn } from '../services/api';
import { AssetLoan, AssetLoanStatus, User } from '../types';
import Modal from './Modal';
import LoanApprovalForm from './LoanApprovalForm';
import LoanRejectionForm from './LoanRejectionForm';
import ReturnValidationModal from './ReturnValidationModal';

const AssetLoanManagement: React.FC = () => {
  const [allLoans, setAllLoans] = useState<AssetLoan[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AssetLoanStatus>(AssetLoanStatus.PENDING);

  // Modal States
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<AssetLoan | null>(null);
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | 'return' | 'validate_return' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [loans, user] = await Promise.all([
        getAssetLoans(),
        getCurrentUser()
      ]);
      setAllLoans(loans.sort((a, b) => new Date(b.request_date).getTime() - new Date(a.request_date).getTime()));
      setCurrentUser(user);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredLoans = useMemo(() => {
    return allLoans.filter(loan => loan.status === activeTab);
  }, [allLoans, activeTab]);

  const canManageLoans = useMemo(() => {
    if (!currentUser) return false;
    return ['Super Admin', 'Admin Holding', 'Admin Unit'].includes(currentUser.role);
  }, [currentUser]);

  const handleActionClick = (loan: AssetLoan, action: 'approve' | 'reject' | 'return' | 'validate_return') => {
    setSelectedLoan(loan);
    setModalAction(action);
    setModalOpen(true);
  };

  const handleModalSubmit = async (formData?: any) => {
    if (!selectedLoan || !modalAction) return;

    setActionLoading(true);
    try {
      if (modalAction === 'approve') {
        // Create FormData for file upload
        const formDataToSend = new FormData();
        formDataToSend.append('approval_date', formData.approval_date);
        formDataToSend.append('loan_proof_photo', formData.loan_proof_photo);
        
        await approveAssetLoan(selectedLoan.id, formDataToSend);
        alert('Peminjaman berhasil disetujui!');
      } else if (modalAction === 'reject') {
        await rejectAssetLoan(selectedLoan.id, {
          rejection_reason: formData.rejection_reason,
          approval_date: ''
        });
        alert('Peminjaman berhasil ditolak!');
      } else if (modalAction === 'return') {
        await returnAssetLoan(selectedLoan.id, { return_notes: formData.return_notes });
        alert('Asset berhasil dikembalikan!');
      }
      
      setModalOpen(false);
      setSelectedLoan(null);
      setModalAction(null);
      fetchData(); // Refresh data
    } catch (err: any) {
      alert(`Gagal ${modalAction} peminjaman: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedLoan(null);
    setModalAction(null);
    setActionLoading(false);
  };

  const TabButton: React.FC<{ status: AssetLoanStatus, label: string }> = ({ status, label }) => (
    <button
      onClick={() => setActiveTab(status)}
      className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === status ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
      {label}
    </button>
  );

  const getActionButtons = (loan: AssetLoan) => {
    if (!canManageLoans) return null;

    switch (loan.status) {
      case AssetLoanStatus.PENDING:
        return (
          <div className="flex space-x-2">
            <button
              onClick={() => handleActionClick(loan, 'approve')}
              className="px-3 py-1 text-xs bg-green-500 text-white rounded-md hover:bg-green-600"
            >
              Setujui
            </button>
            <button
              onClick={() => handleActionClick(loan, 'reject')}
              className="px-3 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600"
            >
              Tolak
            </button>
          </div>
        );
      case AssetLoanStatus.PENDING_RETURN:
        return (
          <button
            onClick={() => handleActionClick(loan, 'validate_return')}
            className="px-3 py-1 text-xs bg-purple-500 text-white rounded-md hover:bg-purple-600"
          >
            Validasi Pengembalian
          </button>
        );
      default:
        return <span className="text-xs text-gray-400">-</span>;
    }
  };

  if (loading) return <div className="text-center p-8">Loading loan management...</div>;
  if (error) return <div className="text-center p-8 text-red-500">Error: {error}</div>;
  if (!canManageLoans) return <div className="text-center p-8 text-red-500">Unauthorized access</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Manajemen Peminjaman Aset</h1>

      <div className="flex space-x-2 border-b pb-2 overflow-x-auto">
        <TabButton status={AssetLoanStatus.PENDING} label="Pending" />
        <TabButton status={AssetLoanStatus.APPROVED} label="Approved" />
        <TabButton status={AssetLoanStatus.PENDING_RETURN} label="Pending Return" />
        <TabButton status={AssetLoanStatus.RETURNED} label="Returned" />
        <TabButton status={AssetLoanStatus.REJECTED} label="Rejected" />
      </div>

      <div className="bg-white p-4 rounded-xl shadow-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aset</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Peminjam</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal Pengajuan</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal Verifikasi</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLoans.length > 0 ? (
                filteredLoans.map(loan => (
                  <tr key={loan.id}>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      <div>{loan.asset.name}</div>
                      <div className="text-xs text-gray-400">{loan.asset.asset_tag}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {loan.asset.unit ? (
                        <div>
                          <div className="font-medium">{loan.asset.unit.name}</div>
                          <div className="text-xs text-gray-400">{loan.asset.unit.code}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">{loan.borrower.name}</td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                        <div className="text-xs">
                          <div>Pengajuan: {new Date(loan.request_date).toLocaleDateString('id-ID')}</div>
                          {loan.status === AssetLoanStatus.PENDING_RETURN && loan.actual_return_date && (
                            <div className="text-blue-600 font-medium">Return: {new Date(loan.actual_return_date).toLocaleDateString('id-ID')}</div>
                          )}
                        </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                        <div className="text-xs">
                          {loan.approval_date && <div>Disetujui: {new Date(loan.approval_date).toLocaleDateString('id-ID')}</div>}
                          {loan.return_verification_date && <div>Verifikasi: {new Date(loan.return_verification_date).toLocaleDateString('id-ID')}</div>}
                          {!loan.approval_date && !loan.return_verification_date && <span className="text-gray-400">-</span>}
                        </div>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <div>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          loan.status === AssetLoanStatus.PENDING ? 'bg-yellow-100 text-yellow-800' :
                          loan.status === AssetLoanStatus.APPROVED ? 'bg-blue-100 text-blue-800' :
                          loan.status === AssetLoanStatus.PENDING_RETURN ? 'bg-purple-100 text-purple-800' :
                          loan.status === AssetLoanStatus.REJECTED ? 'bg-red-100 text-red-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {loan.status}
                        </span>
                      </div>
                      {loan.status === AssetLoanStatus.REJECTED && loan.rejection_reason && (
                        <div className="mt-2 text-xs text-gray-600 bg-red-50 p-2 rounded border border-red-200">
                          <span className="font-medium text-red-700">Alasan: </span>
                          <span className="text-gray-700">{loan.rejection_reason}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm space-x-2">
                      {getActionButtons(loan)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">Tidak ada data untuk status ini.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✅ PERBAIKAN: Single Modal untuk semua action */}
      {selectedLoan && isModalOpen && modalAction !== 'validate_return' && (
        <Modal isOpen={isModalOpen} onClose={handleModalClose}>
          <div className="p-6">
            {modalAction === 'approve' && (
              <LoanApprovalForm
                loan={selectedLoan}
                onSubmit={handleModalSubmit}
                onCancel={handleModalClose}
                loading={actionLoading}
              />
            )}

            {modalAction === 'reject' && (
              <LoanRejectionForm
                loan={selectedLoan}
                onReject={() => {
                  handleModalClose();
                  fetchData();
                  alert('Peminjaman berhasil ditolak!');
                }}
                onCancel={handleModalClose}
                loading={actionLoading}
              />
            )}
          </div>
        </Modal>
      )}

      {/* Return Validation Modal */}
      {selectedLoan && isModalOpen && modalAction === 'validate_return' && (
        <ReturnValidationModal
          loan={selectedLoan}
          onApprove={async (data) => {
            try {
              setActionLoading(true);
              await approveAssetReturn(selectedLoan.id, data);
              alert('Pengembalian berhasil divalidasi!');
              handleModalClose();
              fetchData();
            } catch (error: any) {
              console.error('Approve return failed:', error);
              throw error;
            } finally {
              setActionLoading(false);
            }
          }}
          onReject={async (data) => {
            try {
              setActionLoading(true);
              await rejectAssetReturn(selectedLoan.id, data);
              alert('Pengembalian ditolak. User dapat submit ulang.');
              handleModalClose();
              fetchData();
            } catch (error: any) {
              console.error('Reject return failed:', error);
              throw error;
            } finally {
              setActionLoading(false);
            }
          }}
          onClose={handleModalClose}
          loading={actionLoading}
        />
      )}
    </div>
  );
};

export default AssetLoanManagement;