import React, { useState, useEffect, useMemo } from 'react';
import { getAssetLoans, approveAssetLoan, rejectAssetLoan, returnAssetLoan, getCurrentUser } from '../services/api';
import { AssetLoan, AssetLoanStatus, User } from '../types';
import Modal from './Modal';

const AssetLoanManagement: React.FC = () => {
  const [allLoans, setAllLoans] = useState<AssetLoan[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AssetLoanStatus>(AssetLoanStatus.PENDING);

  // Modal States
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<AssetLoan | null>(null);
  const [modalAction, setModalAction] = useState<'approve' | 'return' | null>(null);
  const [modalInput, setModalInput] = useState('');
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
    return ['Super Admin', 'Admin Holding'].includes(currentUser.role);
  }, [currentUser]);

  const handleActionClick = (loan: AssetLoan, action: 'approve' | 'return') => {
    setSelectedLoan(loan);
    setModalAction(action);
    setModalInput('');
    setModalOpen(true);
  };

  const handleRejectClick = async (loan: AssetLoan) => {
    if (window.confirm(`Are you sure you want to reject this loan request for ${loan.asset.name}?`)) {
      setActionLoading(true);
      try {
        await rejectAssetLoan(loan.id);
        fetchData(); // Refresh data
      } catch (err: any) {
        alert(`Failed to reject loan: ${err.message}`);
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleModalSubmit = async () => {
    if (!selectedLoan || !modalAction) return;

    setActionLoading(true);
    try {
      if (modalAction === 'approve') {
        await approveAssetLoan(selectedLoan.id, { loan_proof_photo_path: modalInput });
      } else if (modalAction === 'return') {
        await returnAssetLoan(selectedLoan.id, { return_notes: modalInput });
      }
      setModalOpen(false);
      fetchData(); // Refresh data
    } catch (err: any) {
      alert(`Failed to process action: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const TabButton: React.FC<{ status: AssetLoanStatus, label: string }> = ({ status, label }) => (
    <button
      onClick={() => setActiveTab(status)}
      className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === status ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
      {label}
    </button>
  );

  if (loading) return <div className="text-center p-8">Loading loan management...</div>;
  if (error) return <div className="text-center p-8 text-red-500">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Manajemen Peminjaman Aset</h1>

      <div className="flex space-x-2 border-b pb-2">
        <TabButton status={AssetLoanStatus.PENDING} label="Pending" />
        <TabButton status={AssetLoanStatus.APPROVED} label="Approved" />
        <TabButton status={AssetLoanStatus.RETURNED} label="Returned" />
        <TabButton status={AssetLoanStatus.REJECTED} label="Rejected" />
      </div>

      <div className="bg-white p-4 rounded-xl shadow-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aset</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Peminjam</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLoans.length > 0 ? (
                filteredLoans.map(loan => (
                  <tr key={loan.id}>
                    <td className="px-4 py-4 text-sm text-gray-900">{loan.asset.name}</td>
                    <td className="px-4 py-4 text-sm text-gray-500">{loan.borrower.name}</td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                        <div>Req: {new Date(loan.request_date).toLocaleDateString()}</div>
                        <div>Return: {new Date(loan.expected_return_date).toLocaleDateString()}</div>
                    </td>
                    <td className="px-4 py-4 text-sm space-x-2">
                      {loan.status === AssetLoanStatus.PENDING && canManageLoans && (
                        <>
                          <button onClick={() => handleActionClick(loan, 'approve')} className="px-3 py-1 text-xs bg-green-500 text-white rounded-md hover:bg-green-600">Accept</button>
                          <button onClick={() => handleRejectClick(loan)} className="px-3 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600">Reject</button>
                        </>
                      )}
                      {loan.status === AssetLoanStatus.APPROVED && (
                        <button onClick={() => handleActionClick(loan, 'return')} className="px-3 py-1 text-xs bg-green-500 text-white rounded-md hover:bg-green-600">Proses Pengembalian</button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500">Tidak ada data untuk status ini.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedLoan && (
        <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
          <div className="p-4">
            <h3 className="text-lg font-bold mb-4">
              {modalAction === 'approve' ? 'Approve Loan Request' : 'Process Asset Return'}
            </h3>
            <p><strong>Aset:</strong> {selectedLoan.asset.name}</p>
            <p className="mb-4"><strong>Peminjam:</strong> {selectedLoan.borrower.name}</p>
            
            <div className="mb-4">
              <label htmlFor="modalInput" className="block text-sm font-medium text-gray-700">
                {modalAction === 'approve' ? 'Photo Proof (Path/URL)' : 'Return Notes'}
              </label>
              <input
                type="text"
                id="modalInput"
                value={modalInput}
                onChange={(e) => setModalInput(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm"
                placeholder={modalAction === 'approve' ? 'e.g., /storage/photos/loan123.jpg' : 'e.g., Asset returned in good condition'}
              />
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 bg-gray-300 rounded-md">Cancel</button>
              <button onClick={handleModalSubmit} disabled={actionLoading} className="px-4 py-2 bg-primary text-white rounded-md disabled:bg-blue-300">
                {actionLoading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AssetLoanManagement;