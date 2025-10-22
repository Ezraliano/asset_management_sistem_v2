import React, { useState, useEffect, useMemo } from 'react';
import {
  getAvailableAssets,
  getAssetLoans,
  getCurrentUser,
  requestAssetLoan,
  approveAssetLoan,
  rejectAssetLoan,
  returnAssetLoan,
  approveAssetReturn,
  rejectAssetReturn,
  createAssetRequest
} from '../services/api';
import { Asset, AssetLoan, AssetLoanStatus, User } from '../types';
import { BorrowIcon, CalendarIcon, SearchIcon } from './icons';
import Modal from './Modal';
import AssetLoanForm from './AssetLoanForm';
import LoanApprovalForm from './LoanApprovalForm';
import LoanRejectionForm from './LoanRejectionForm';
import LoanReturnForm from './LoanReturnForm';
import ReturnValidationModal from './ReturnValidationModal';
import AssetRequestList from './AssetRequestList';
import AssetRequestForm from './AssetRequestForm';

const AssetLending: React.FC = () => {
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  const [allLoans, setAllLoans] = useState<AssetLoan[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssetLoanStatus | 'ALL'>('ALL');
  const [unitFilter, setUnitFilter] = useState<string>('ALL');

  // View Mode State - for switching between loan list and asset requests
  const [viewMode, setViewMode] = useState<'LOANS' | 'REQUESTS'>('LOANS');

  // Modal States
  const [isLoanModalOpen, setLoanModalOpen] = useState(false);
  const [isApprovalModalOpen, setApprovalModalOpen] = useState(false);
  const [isRejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [isReturnModalOpen, setReturnModalOpen] = useState(false);
  const [isValidationModalOpen, setValidationModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<AssetLoan | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Asset Request States
  const [isRequestFormOpen, setRequestFormOpen] = useState(false);
  const [requestFormLoading, setRequestFormLoading] = useState(false);

  // Fetch data function
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
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Listen for openRequestForm event from AssetRequestList
    const handleOpenRequestForm = () => {
      setRequestFormOpen(true);
    };

    window.addEventListener('openRequestForm', handleOpenRequestForm as EventListener);

    return () => {
      window.removeEventListener('openRequestForm', handleOpenRequestForm as EventListener);
    };
  }, []);

  // Handle borrow request
  const handleBorrowClick = (asset: Asset) => {
    setSelectedAsset(asset);
    setLoanModalOpen(true);
  };

  // Handle loan actions
  const handleApproveClick = (loan: AssetLoan) => {
    setSelectedLoan(loan);
    setApprovalModalOpen(true);
  };

  const handleRejectClick = (loan: AssetLoan) => {
    setSelectedLoan(loan);
    setRejectionModalOpen(true);
  };

  const handleReturnClick = (loan: AssetLoan) => {
    setSelectedLoan(loan);
    setReturnModalOpen(true);
  };

  const handleValidateReturnClick = (loan: AssetLoan) => {
    setSelectedLoan(loan);
    setValidationModalOpen(true);
  };

  // Handle form submissions
  const handleLoanSubmit = async (loanData: any) => {
    setActionLoading(true);
    try {
      await requestAssetLoan(loanData);
      setSuccessMessage('Permintaan peminjaman berhasil diajukan!');
      setLoanModalOpen(false);
      fetchData(); // Refresh data
    } catch (err: any) {
      setError(err.message || 'Gagal mengajukan peminjaman.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprovalSubmit = async (formData: any) => {
    setActionLoading(true);
    try {
      if (selectedLoan) {
        await approveAssetLoan(selectedLoan.id, formData);
        setSuccessMessage('Peminjaman berhasil disetujui!');
        setApprovalModalOpen(false);
        fetchData();
      }
    } catch (err: any) {
      setError(err.message || 'Gagal menyetujui peminjaman.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectionSubmit = async (rejectionData: any) => {
    setActionLoading(true);
    try {
      if (selectedLoan) {
        await rejectAssetLoan(selectedLoan.id, rejectionData);
        setSuccessMessage('Peminjaman berhasil ditolak!');
        setRejectionModalOpen(false);
        fetchData();
      }
    } catch (err: any) {
      setError(err.message || 'Gagal menolak peminjaman.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnSubmit = async (returnData: any) => {
    setActionLoading(true);
    try {
      if (selectedLoan) {
        await returnAssetLoan(selectedLoan.id, returnData);
        setSuccessMessage('Asset berhasil dikembalikan!');
        setReturnModalOpen(false);
        fetchData();
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memproses pengembalian.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter assets based on search term
  const filteredAssets = useMemo(() => {
    if (!searchTerm) {
      return availableAssets;
    }
    return availableAssets.filter(asset =>
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.asset_tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, availableAssets]);

  // Filter loans based on user role, status, and unit
  const filteredLoans = useMemo(() => {
    // Safety check: ensure allLoans is an array
    if (!Array.isArray(allLoans)) {
      console.warn('allLoans is not an array:', allLoans);
      return [];
    }

    let loans = allLoans;

    // Apply role-based filtering
    if (currentUser) {
      if (currentUser.role === 'User') {
        // For 'User' role, show loans they have borrowed
        loans = loans.filter(loan => loan.borrower_id === currentUser.id);
      } else if (currentUser.role === 'Admin Unit' && currentUser.unit_id) {
        // For 'Admin Unit' role, show loans where their unit is the lender OR the borrower
        loans = loans.filter(loan => 
          loan.asset.unit_id === currentUser.unit_id || 
          loan.borrower.unit_id === currentUser.unit_id
        );
      }
    }

    // Apply status filter
    if (statusFilter !== 'ALL') {
      loans = loans.filter(loan => loan.status === statusFilter);
    }

    // Apply unit filter (for Super Admin and Admin Holding)
    if (unitFilter !== 'ALL' && currentUser && ['Super Admin', 'Admin Holding'].includes(currentUser.role)) {
      loans = loans.filter(loan => loan.asset.unit_id?.toString() === unitFilter);
    }

    return loans;
  }, [allLoans, currentUser, statusFilter, unitFilter]);

  // Get unique units for filter (for admins)
  const availableUnits = useMemo(() => {
    if (!currentUser || !['Super Admin', 'Admin Holding'].includes(currentUser.role)) {
      return [];
    }

    // Safety check: ensure allLoans is an array
    if (!Array.isArray(allLoans)) {
      console.warn('allLoans is not an array in availableUnits:', allLoans);
      return [];
    }

    const units = new Map();
    allLoans.forEach(loan => {
      if (loan.asset.unit) {
        units.set(loan.asset.unit.id, loan.asset.unit);
      }
    });
    return Array.from(units.values());
  }, [allLoans, currentUser]);

  // Get pending loans for admin view
  const pendingLoans = useMemo(() => {
    // Safety check: ensure allLoans is an array
    if (!Array.isArray(allLoans)) {
      console.warn('allLoans is not an array in pendingLoans:', allLoans);
      return [];
    }

    let pending = allLoans.filter(loan => loan.status === AssetLoanStatus.PENDING);

    if (currentUser && currentUser.role === 'Admin Unit' && currentUser.unit_id) {
      pending = pending.filter(loan => loan.asset.unit_id === currentUser.unit_id);
    }

    return pending;
  }, [allLoans, currentUser]);

  // ✅ PERBAIKAN: Check if user can manage loans (approve/reject/return)
  const canManageLoans = useMemo(() => {
    if (!currentUser) return false;
    return ['Super Admin', 'Admin Holding', 'Admin Unit'].includes(currentUser.role);
  }, [currentUser]);

  // ✅ PERBAIKAN: Check if user can borrow assets - SEMUA ROLE BISA PINJAM
  const canBorrowAssets = useMemo(() => {
    if (!currentUser) return false;
    
    // Semua role bisa melakukan peminjaman
    return ['Super Admin', 'Admin Holding', 'Admin Unit', 'User'].includes(currentUser.role);
  }, [currentUser]);

  // ✅ PERBAIKAN: Check if user can see available assets section
  const canSeeAvailableAssets = useMemo(() => {
    if (!currentUser) return false;
    
    // Semua role bisa melihat section aset yang tersedia
    return ['Super Admin', 'Admin Holding', 'Admin Unit', 'User'].includes(currentUser.role);
  }, [currentUser]);

  // Status badge styling
  const getStatusBadge = (status: AssetLoanStatus) => {
    switch (status) {
      case AssetLoanStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case AssetLoanStatus.APPROVED:
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case AssetLoanStatus.PENDING_RETURN:
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      case AssetLoanStatus.REJECTED:
        return 'bg-red-100 text-red-800 border border-red-200';
      case AssetLoanStatus.RETURNED:
        return 'bg-green-100 text-green-800 border border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  // Get action buttons based on loan status and user permissions
  const getActionButtons = (loan: AssetLoan) => {
    // ✅ PERBAIKAN: User bisa mengembalikan aset mereka sendiri
    const isUserOwnLoan = currentUser && loan.borrower_id === currentUser.id;

    switch (loan.status) {
      case AssetLoanStatus.PENDING:
        // Only admins can approve/reject
        if (!canManageLoans) return null;
        return (
          <div className="flex space-x-2">
            <button
              onClick={() => handleApproveClick(loan)}
              disabled={actionLoading}
              className="px-3 py-1 text-xs bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400 transition-colors"
            >
              Setujui
            </button>
            <button
              onClick={() => handleRejectClick(loan)}
              disabled={actionLoading}
              className="px-3 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-gray-400 transition-colors"
            >
              Tolak
            </button>
          </div>
        );
      case AssetLoanStatus.APPROVED:
        // ✅ Both admins AND users (for their own loans) can return
        if (!canManageLoans && !isUserOwnLoan) return null;
        return (
          <button
            onClick={() => handleReturnClick(loan)}
            disabled={actionLoading}
            className="px-3 py-1 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
          >
            {isUserOwnLoan && !canManageLoans ? 'Kembalikan Aset' : 'Proses Pengembalian'}
          </button>
        );
      case AssetLoanStatus.PENDING_RETURN:
        // Only admins can validate return
        if (!canManageLoans) return null;
        return (
          <button
            onClick={() => handleValidateReturnClick(loan)}
            disabled={actionLoading}
            className="px-3 py-1 text-xs bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:bg-gray-400 transition-colors"
          >
            Validasi Pengembalian
          </button>
        );
      default:
        return null;
    }
  };

  // Handle Asset Request Form Submit
  const handleRequestFormSubmit = async (requestData: any) => {
    setRequestFormLoading(true);
    try {
      await createAssetRequest(requestData);
      setSuccessMessage('Request peminjaman asset berhasil diajukan!');
      setRequestFormOpen(false);
      fetchData();
    } catch (error: any) {
      setError(error.message || 'Gagal mengajukan request');
    } finally {
      setRequestFormLoading(false);
    }
  };

  // Clear messages after delay
  useEffect(() => {
    if (successMessage || error) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, error]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const renderViewModeDescription = () => {
    if (viewMode === 'LOANS') {
      return 'Kelola permintaan peminjaman aset di sistem Anda';
    }
    // REQUESTS view
    if (currentUser?.role === 'Admin Unit') {
      return 'Request peminjaman asset dari unit lain';
    }
    return 'Validasi request peminjaman asset antar unit';
  };

  const renderRoleDescription = () => {
    if (viewMode === 'REQUESTS') {
      if (currentUser?.role === 'Admin Unit') {
        return 'Anda dapat membuat request peminjaman asset untuk unit Anda.';
      }
      return 'Anda dapat memvalidasi request peminjaman asset dari semua unit.';
    }

    // LOANS view
    switch (currentUser?.role) {
      case 'User':
        return 'Anda hanya dapat meminjam asset di unit Anda sendiri';
      case 'Admin Unit':
        return 'Anda dapat mengelola peminjaman dan meminjam asset di unit Anda';
      default:
        return 'Anda dapat mengelola semua unit dan meminjam asset';
    }
  };


  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
        <div className="flex flex-col gap-3 mb-2">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Peminjaman & Permintaan Aset</h1>

          {/* View Mode Toggle - Show for Admins */}
          {['Super Admin', 'Admin Holding', 'Admin Unit'].includes(currentUser?.role || '') && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setViewMode('LOANS')}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'LOANS'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Peminjaman
              </button>
              <button
                onClick={() => setViewMode('REQUESTS')}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                  viewMode === 'REQUESTS'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Antar Unit
              </button>
            </div>
          )}
        </div>

        <p className="text-gray-600">
          {renderViewModeDescription()}
        </p>

        {/* User Info */}
        {currentUser && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-800 font-medium">
                  <strong>Role:</strong> {currentUser.role}
                  {currentUser.unit && ` • Unit: ${currentUser.unit.name}`}
                </p>
                <p className="text-blue-600 text-sm mt-1">
                  {renderRoleDescription()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-medium">✅ {successMessage}</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">❌ {error}</p>
        </div>
      )}

      {/* Show Asset Request List when in REQUESTS view mode */}
      {viewMode === 'REQUESTS' && ['Super Admin', 'Admin Holding', 'Admin Unit'].includes(currentUser?.role || '') ? (
        <div className="bg-white p-6 rounded-xl shadow-md">
          <AssetRequestList currentUser={currentUser} />
        </div>
      ) : (
        <>
          {/* ✅ PERBAIKAN: Section 1: Request New Loan (for ALL Roles) */}
          {canSeeAvailableAssets && (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
            <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800">
              {canBorrowAssets ? 'Ajukan Peminjaman Baru' : 'Aset yang Tersedia'}
            </h2>
            <div className="relative w-full sm:w-auto">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Cari aset..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64"
              />
            </div>
          </div>

          {filteredAssets.length > 0 ? (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 hidden md:table-header-group">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nama Aset
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kode
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kategori
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit
                    </th>
                    {/* ✅ PERBAIKAN: Show action column for all roles that can borrow */}
                    {canBorrowAssets && (
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                        Aksi
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 md:divide-y-0">
                  {filteredAssets.map(asset => (
                    <tr key={asset.id} className="block md:table-row border-b md:border-none p-4 md:p-0">
                      <td className="block md:table-cell md:px-6 md:py-4 md:whitespace-nowrap">
                        <span className="font-bold md:hidden">Aset: </span>
                        <div className="text-sm font-medium text-gray-900 inline md:block">{asset.name}</div>
                      </td>
                      <td className="block md:table-cell md:px-6 md:py-4 md:whitespace-nowrap">
                        <span className="font-bold md:hidden">Kode: </span>
                        <div className="text-sm text-gray-500 font-mono inline md:block">{asset.asset_tag}</div>
                      </td>
                      <td className="block md:table-cell md:px-6 md:py-4 md:whitespace-nowrap">
                        <span className="font-bold md:hidden">Kategori: </span>
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{asset.category}</span>
                      </td>
                      <td className="block md:table-cell md:px-6 md:py-4 md:whitespace-nowrap">
                        <span className="font-bold md:hidden">Unit: </span>
                        <div className="text-sm text-gray-500 inline md:block">{asset.unit?.name || 'N/A'}</div>
                      </td>
                      {canBorrowAssets && (
                        <td className="block md:table-cell md:px-6 md:py-4 md:whitespace-nowrap md:text-center mt-4 md:mt-0">
                          <button onClick={() => handleBorrowClick(asset)} disabled={actionLoading} className="w-full md:w-auto inline-flex items-center justify-center text-sm font-medium bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 border border-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            <BorrowIcon className="w-4 h-4 mr-2" /> Pinjam
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <CalendarIcon className="w-16 h-16 mx-auto" />
              </div>
              <p className="text-gray-500 text-lg font-medium">Tidak ada aset yang tersedia</p>
              <p className="text-gray-400 mt-2">
                {searchTerm 
                  ? 'Tidak ada aset yang sesuai dengan pencarian Anda' 
                  : 'Semua aset sedang dipinjam atau dalam perawatan'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Section 2: Pending Loan Requests (for Admins) */}
      {canManageLoans && pendingLoans.length > 0 && (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 mb-4">
            Permintaan Peminjaman Menunggu Persetujuan
            {currentUser?.role === 'Admin Unit' && ' - Unit Anda'}
          </h2>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 hidden md:table-header-group">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aset
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Peminjam
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Aset
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanggal Pengajuan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tujuan
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 md:divide-y-0">
                {pendingLoans.map(loan => (
                  <tr key={loan.id} className="block md:table-row border-b md:border-none p-4 md:p-0">
                    <td className="block md:table-cell md:px-6 md:py-4 md:whitespace-nowrap">
                      <span className="font-bold md:hidden">Aset: </span>
                      <div className="text-sm font-medium text-gray-900 inline md:block">{loan.asset.name}</div>
                      <div className="text-sm text-gray-500 font-mono inline md:block md:mt-1">{loan.asset.asset_tag}</div>
                    </td>
                    <td className="block md:table-cell md:px-6 md:py-4 md:whitespace-nowrap">
                      <span className="font-bold md:hidden">Peminjam: </span>
                      <div className="text-sm text-gray-900 inline md:block">{loan.borrower.name}</div>
                      <div className="text-sm text-gray-500 inline md:block md:mt-1">{loan.borrower.email}</div>
                    </td>
                    <td className="block md:table-cell md:px-6 md:py-4 md:whitespace-nowrap">
                      <span className="font-bold md:hidden">Unit Aset: </span>
                      <div className="text-sm text-gray-500 inline md:block">{loan.asset.unit?.name || 'N/A'}</div>
                    </td>
                    <td className="block md:table-cell md:px-6 md:py-4 md:whitespace-nowrap">
                      <span className="font-bold md:hidden">Tgl Pengajuan: </span>
                      <div className="text-sm text-gray-900 inline md:block">{new Date(loan.request_date).toLocaleDateString('id-ID')}</div>
                    </td>
                    <td className="block md:table-cell md:px-6 md:py-4">
                      <span className="font-bold md:hidden">Tujuan: </span>
                      <div className="text-sm text-gray-500 max-w-xs truncate inline md:block" title={loan.purpose}>{loan.purpose}</div>
                    </td>
                    <td className="block md:table-cell md:px-6 md-py-4 md:whitespace-nowrap md:text-center mt-4 md:mt-0">
                      <div className="w-full">{getActionButtons(loan)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 3: Loan History */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-4">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800">
            {currentUser?.role === 'User' ? 'Riwayat Peminjaman Saya' : 'Riwayat Peminjaman'}
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            {/* Unit Filter (for Admins) */}
            {availableUnits.length > 0 && (
              <select
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
                className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ALL">Semua Unit</option>
                {availableUnits.map(unit => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            )}

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AssetLoanStatus | 'ALL')}
              className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">Semua Status</option>
              <option value={AssetLoanStatus.PENDING}>Pending</option>
              <option value={AssetLoanStatus.APPROVED}>Disetujui</option>
              <option value={AssetLoanStatus.PENDING_RETURN}>Pending Return</option>
              <option value={AssetLoanStatus.RETURNED}>Dikembalikan</option>
              <option value={AssetLoanStatus.REJECTED}>Ditolak</option>
            </select>
          </div>
        </div>

        {filteredLoans.length > 0 ? (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 hidden md:table-header-group">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aset
                  </th>
                  {currentUser?.role !== 'User' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Peminjam
                    </th>
                  )}
                  {['Super Admin', 'Admin Holding'].includes(currentUser?.role || '') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanggal Pengajuan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanggal Verifikasi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alasan
                  </th>
                  {/* ✅ PERBAIKAN: Show action column for both admins and users */}
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 md:divide-y-0">
                {filteredLoans.map(loan => {
                  const actionButtons = getActionButtons(loan);
                  return (
                    <tr key={loan.id} className="block md:table-row border-b md:border-none p-4 md:p-0">
                      <td className="block md:table-cell md:px-6 md:py-4 md:whitespace-nowrap">
                        <span className="font-bold md:hidden">Aset: </span>
                        <div className="text-sm font-medium text-gray-900 inline md:block">{loan.asset.name}</div>
                        <div className="text-sm text-gray-500 font-mono inline md:block md:mt-1">{loan.asset.asset_tag}</div>
                      </td>
                      {currentUser?.role !== 'User' && (
                        <td className="block md:table-cell md:px-6 md:py-4 md:whitespace-nowrap">
                          <span className="font-bold md:hidden">Peminjam: </span>
                          <div className="text-sm text-gray-900 inline md:block">{loan.borrower.name}</div>
                          <div className="text-sm text-gray-500 inline md:block md:mt-1">{loan.borrower.email}</div>
                        </td>
                      )}
                      {['Super Admin', 'Admin Holding'].includes(currentUser?.role || '') && (
                        <td className="block md:table-cell md:px-6 md:py-4 md:whitespace-nowrap">
                          <span className="font-bold md:hidden">Unit: </span>
                          <div className="text-sm text-gray-500 inline md:block">{loan.asset.unit?.name || 'N/A'}</div>
                        </td>
                      )}
                      <td className="block md:table-cell md:px-6 mdpy-4 md:whitespace-nowrap">
                        <span className="font-bold md:hidden">Tgl Pengajuan: </span>
                        <div className="text-sm text-gray-900 inline md:block">{new Date(loan.request_date).toLocaleDateString('id-ID')}</div>
                      </td>
                      <td className="block md:table-cell md:px-6 md:py-4 md:whitespace-nowrap">
                        <span className="font-bold md:hidden">Tgl Verifikasi: </span>
                        <div className="text-sm text-gray-500 inline md:block">{loan.approval_date ? new Date(loan.approval_date).toLocaleDateString('id-ID') : '-'}</div>
                      </td>
                      <td className="block md:table-cell md:px-6 md:py-4 md:whitespace-nowrap">
                        <span className="font-bold md:hidden">Status: </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(loan.status)}`}>
                          {loan.status === AssetLoanStatus.PENDING && 'Menunggu'}
                          {loan.status === AssetLoanStatus.APPROVED && 'Disetujui'}
                          {loan.status === AssetLoanStatus.PENDING_RETURN && 'Pending Return'}
                          {loan.status === AssetLoanStatus.REJECTED && 'Ditolak'}
                          {loan.status === AssetLoanStatus.RETURNED && 'Dikembalikan'}
                        </span>
                      </td>
                      <td className="block md:table-cell md:px-6 md:py-4 md:whitespace-nowrap">
                        <span className="font-bold md:hidden">Alasan: </span>
                        {loan.status === AssetLoanStatus.REJECTED && loan.rejection_reason ? (
                          <div className="text-xs text-gray-600 inline md:block" title={loan.rejection_reason}>
                            {loan.rejection_reason}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="block md:table-cell md:px-6 md:py-4 md:whitespace-nowrap md:text-center mt-4 md:mt-0">
                        <div className="w-full">{actionButtons || <span className="text-gray-400 text-xs">-</span>}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <CalendarIcon className="w-16 h-16 mx-auto" />
            </div>
            <p className="text-gray-500 text-lg font-medium">
              {currentUser?.role === 'User' 
                ? 'Anda belum memiliki riwayat peminjaman' 
                : 'Tidak ada data peminjaman'
              }
            </p>
            <p className="text-gray-400 mt-2">
              {statusFilter !== 'ALL' && 'Coba ubah filter status untuk melihat lebih banyak data'}
            </p>
          </div>
        )}
      </div>
        </>
      )}

      {/* Asset Request Form Modal */}
      {isRequestFormOpen && (
        <Modal isOpen={isRequestFormOpen} onClose={() => setRequestFormOpen(false)}>
          <AssetRequestForm
            onSubmit={handleRequestFormSubmit}
            onCancel={() => setRequestFormOpen(false)}
            loading={requestFormLoading}
            userUnit={currentUser?.unit || null}
          />
        </Modal>
      )}

      {/* Modals */}
      {selectedAsset && (
        <Modal isOpen={isLoanModalOpen} onClose={() => setLoanModalOpen(false)} title="Ajukan Peminjaman">
          <AssetLoanForm
            asset={selectedAsset}
            onSubmit={handleLoanSubmit}
            onCancel={() => setLoanModalOpen(false)}
            loading={actionLoading}
          />
        </Modal>
      )}

      {selectedLoan && (
        <>
          <Modal isOpen={isApprovalModalOpen} onClose={() => setApprovalModalOpen(false)} title="Setujui Peminjaman">
            <LoanApprovalForm
              loan={selectedLoan}
              onSubmit={handleApprovalSubmit}
              onCancel={() => setApprovalModalOpen(false)}
              loading={actionLoading}
            />
          </Modal>

          <Modal isOpen={isRejectionModalOpen} onClose={() => setRejectionModalOpen(false)} title="Tolak Peminjaman">
            <LoanRejectionForm
              loan={selectedLoan}
              onReject={handleRejectionSubmit}
              onCancel={() => setRejectionModalOpen(false)}
              loading={actionLoading}
            />
          </Modal>

          <Modal isOpen={isReturnModalOpen} onClose={() => setReturnModalOpen(false)} title="Proses Pengembalian">
            <LoanReturnForm
              loan={selectedLoan}
              onSubmit={handleReturnSubmit}
              onCancel={() => setReturnModalOpen(false)}
              loading={actionLoading}
            />
          </Modal>
        </>
      )}

      {/* Return Validation Modal */}
      {selectedLoan && isValidationModalOpen && (
        <ReturnValidationModal
          loan={selectedLoan}
          onApprove={async (data) => {
            try {
              setActionLoading(true);
              await approveAssetReturn(selectedLoan.id, data);
              setSuccessMessage('Pengembalian berhasil divalidasi! Asset status telah diupdate.');
              setValidationModalOpen(false);
              fetchData();
            } catch (error: any) {
              setError(error.message || 'Gagal memvalidasi pengembalian.');
            } finally {
              setActionLoading(false);
            }
          }}
          onReject={async (data) => {
            try {
              setActionLoading(true);
              await rejectAssetReturn(selectedLoan.id, data);
              setSuccessMessage('Pengembalian ditolak. User dapat mengajukan pengembalian ulang.');
              setValidationModalOpen(false);
              fetchData();
            } catch (error: any) {
              setError(error.message || 'Gagal menolak pengembalian.');
            } finally {
              setActionLoading(false);
            }
          }}
          onClose={() => setValidationModalOpen(false)}
          loading={actionLoading}
        />
      )}
    </div>
  );
};

export default AssetLending;