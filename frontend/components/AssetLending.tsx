import React, { useState, useEffect, useMemo } from 'react';
import { getAvailableAssets, getAssetLoans, getCurrentUser } from '../services/api';
import { Asset, AssetLoan, AssetLoanStatus, User } from '../types';
import { BorrowIcon } from './icons';
import Modal from './Modal';
import AssetLoanForm from './AssetLoanForm';
import LoanApprovalForm from './LoanApprovalForm';
import LoanRejectionForm from './LoanRejectionForm';

const AssetLending: React.FC = () => {
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  const [allLoans, setAllLoans] = useState<AssetLoan[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssetLoanStatus | 'ALL'>('ALL');

  const [isLoanModalOpen, setLoanModalOpen] = useState(false);
  const [isApprovalModalOpen, setApprovalModalOpen] = useState(false);
  const [isRejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<AssetLoan | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [assetsResponse, loansResponse, userResponse] = await Promise.all([
        getAvailableAssets(),
        getAssetLoans(),
        getCurrentUser(),
      ]);
      setAvailableAssets(assetsResponse);
      setAllLoans(loansResponse);
      setCurrentUser(userResponse);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBorrowClick = (asset: Asset) => {
    setSelectedAsset(asset);
    setLoanModalOpen(true);
  };

  const handleApproveClick = (loan: AssetLoan) => {
    setSelectedLoan(loan);
    setApprovalModalOpen(true);
  };

  const handleRejectClick = (loan: AssetLoan) => {
    setSelectedLoan(loan);
    setRejectionModalOpen(true);
  };

  const handleApprovalSuccess = () => {
    setApprovalModalOpen(false);
    setSelectedLoan(null);
    fetchData();
  };

  const handleRejectionSuccess = () => {
    setRejectionModalOpen(false);
    setSelectedLoan(null);
    fetchData();
  };

  const filteredAssets = useMemo(() => {
    if (!searchTerm) {
      return availableAssets;
    }
    return availableAssets.filter(asset =>
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.asset_tag.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, availableAssets]);

  // Filter loans based on user role and status filter
  const filteredLoans = useMemo(() => {
    let loans = allLoans;

    // If user is not admin, only show their own loans
    if (currentUser && !['Super Admin', 'Admin Holding', 'Unit'].includes(currentUser.role)) {
      loans = loans.filter(loan => loan.borrower_id === currentUser.id);
    }

    // Apply status filter
    if (statusFilter !== 'ALL') {
      loans = loans.filter(loan => loan.status === statusFilter);
    }

    return loans;
  }, [allLoans, currentUser, statusFilter]);

  // Check if user can manage loans (accept/reject)
  const canManageLoans = useMemo(() => {
    if (!currentUser) return false;
    return ['Super Admin', 'Admin Holding'].includes(currentUser.role);
  }, [currentUser]);

  // Get pending loans for admin view
  const pendingLoans = useMemo(() => {
    return allLoans.filter(loan => loan.status === AssetLoanStatus.PENDING);
  }, [allLoans]);

  const getStatusBadge = (status: AssetLoanStatus) => {
    switch (status) {
      case AssetLoanStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case AssetLoanStatus.APPROVED:
        return 'bg-blue-100 text-blue-800';
      case AssetLoanStatus.REJECTED:
        return 'bg-red-100 text-red-800';
      case AssetLoanStatus.RETURNED:
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center p-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-800">Peminjaman Aset</h1>

      {/* Section 1: Request a New Loan */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-semibold mb-4">Ajukan Peminjaman Baru</h2>
        <input
          type="text"
          placeholder="Cari aset berdasarkan nama atau tag..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-md"
        />
        <div className="max-h-96 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Aset</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tag</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAssets.length > 0 ? (
                filteredAssets.map(asset => (
                  <tr key={asset.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{asset.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asset.asset_tag}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asset.unit?.name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => handleBorrowClick(asset)}
                          className="inline-flex items-center justify-center text-sm font-medium bg-blue-50 text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-100 border border-blue-200 transition-colors w-full max-w-[100px]"
                        >
                          <BorrowIcon />
                          <span className="ml-1">Pinjam</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500">Tidak ada aset yang tersedia untuk dipinjam.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Pending Loan Requests (Admin Only) */}
      {canManageLoans && pendingLoans.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold mb-4">Permintaan Peminjaman Pending</h2>
          <div className="max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Aset</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Peminjam</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal Pengajuan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tujuan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingLoans.map(loan => (
                  <tr key={loan.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{loan.asset.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{loan.borrower.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(loan.request_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="max-w-xs truncate" title={loan.purpose}>
                        {loan.purpose}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApproveClick(loan)}
                          disabled={actionLoading}
                          className="px-3 py-1 text-xs bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400"
                        >
                          Setujui
                        </button>
                        <button
                          onClick={() => handleRejectClick(loan)}
                          disabled={actionLoading}
                          className="px-3 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-gray-400"
                        >
                          Tolak
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 3: Loan History */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {canManageLoans ? 'Semua Riwayat Peminjaman' : 'Riwayat Peminjaman Saya'}
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-2 text-sm rounded-md ${statusFilter === 'ALL' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Semua
            </button>
            <button
              onClick={() => setStatusFilter(AssetLoanStatus.PENDING)}
              className={`px-3 py-2 text-sm rounded-md ${statusFilter === AssetLoanStatus.PENDING ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Pending
            </button>
            <button
              onClick={() => setStatusFilter(AssetLoanStatus.APPROVED)}
              className={`px-3 py-2 text-sm rounded-md ${statusFilter === AssetLoanStatus.APPROVED ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Approved
            </button>
            <button
              onClick={() => setStatusFilter(AssetLoanStatus.REJECTED)}
              className={`px-3 py-2 text-sm rounded-md ${statusFilter === AssetLoanStatus.REJECTED ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Rejected
            </button>
            <button
              onClick={() => setStatusFilter(AssetLoanStatus.RETURNED)}
              className={`px-3 py-2 text-sm rounded-md ${statusFilter === AssetLoanStatus.RETURNED ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Returned
            </button>
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Aset</th>
                {canManageLoans && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Peminjam</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tgl. Pengajuan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tgl. Verifikasi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alasan Penolakan</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLoans.length > 0 ? (
                filteredLoans.map(loan => (
                  <tr key={loan.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{loan.asset.name}</td>
                    {canManageLoans && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{loan.borrower.name}</td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(loan.request_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {loan.approval_date ? new Date(loan.approval_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(loan.status)}`}>
                        {loan.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {loan.status === AssetLoanStatus.REJECTED && loan.rejection_reason ? (
                        <div className="max-w-xs" title={loan.rejection_reason}>
                          {loan.rejection_reason}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    {canManageLoans ? 'Tidak ada data peminjaman.' : 'Anda belum pernah mengajukan peminjaman.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {selectedAsset && (
        <Modal isOpen={isLoanModalOpen} onClose={() => setLoanModalOpen(false)}>
          <AssetLoanForm
            assetId={selectedAsset.id}
            onCancel={() => setLoanModalOpen(false)}
            onSuccess={() => {
              setLoanModalOpen(false);
              fetchData();
            }}
          />
        </Modal>
      )}

      {selectedLoan && (
        <>
          <Modal isOpen={isApprovalModalOpen} onClose={() => setApprovalModalOpen(false)}>
            <LoanApprovalForm
              loan={selectedLoan}
              onApprove={handleApprovalSuccess}
              onCancel={() => {
                setApprovalModalOpen(false);
                setSelectedLoan(null);
              }}
              loading={actionLoading}
            />
          </Modal>

          <Modal isOpen={isRejectionModalOpen} onClose={() => setRejectionModalOpen(false)}>
            <LoanRejectionForm
              loan={selectedLoan}
              onReject={handleRejectionSuccess}
              onCancel={() => {
                setRejectionModalOpen(false);
                setSelectedLoan(null);
              }}
              loading={actionLoading}
            />
          </Modal>
        </>
      )}
    </div>
  );
};

export default AssetLending;