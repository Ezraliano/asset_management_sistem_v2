import React, { useState, useEffect, useCallback } from 'react';
import { getGuaranteeById, getGuaranteeLoansForGuarantee, getGuaranteeSettlementsForGuarantee } from '../services/api';
import { Guarantee, View } from '../types';
import { BackIcon, HistoryIcon } from './icons';
import Modal from './Modal';
import GuaranteeInputForm from './GuaranteeInputForm';
import GuaranteeLoaning from './GuaranteeLoaning';
import GuaranteeSettlement from './GuaranteeSettlement';
import GuaranteeReturn from './GuaranteeReturn';
import SettlementValidation from './SettlementValidation';
import SettlementRevision from './SettlementRevision';
import { exportGuaranteeDetailToPdf } from '../utils/guaranteeExportUtils';

interface GuaranteeDetailProps {
  guaranteeId: string;
  navigateTo: (view: View) => void;
}

type Tab = 'history' | 'settlement';

const GuaranteeDetail: React.FC<GuaranteeDetailProps> = ({ guaranteeId, navigateTo }) => {
  const [guarantee, setGuarantee] = useState<Guarantee | null>(null);
  const [loanHistory, setLoanHistory] = useState<any[]>([]);
  const [settlementHistory, setSettlementHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [loadingSettlements, setLoadingSettlements] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('history');
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isLoanModalOpen, setLoanModalOpen] = useState(false);
  const [isSettlementModalOpen, setSettlementModalOpen] = useState(false);
  const [isReturnModalOpen, setReturnModalOpen] = useState(false);
  const [isValidationModalOpen, setValidationModalOpen] = useState(false);
  const [selectedLoanForReturn, setSelectedLoanForReturn] = useState<any | null>(null);
  const [selectedSettlementForValidation, setSelectedSettlementForValidation] = useState<any | null>(null);
  const [selectedSettlementForRevision, setSelectedSettlementForRevision] = useState<any | null>(null);
  const [isRevisionModalOpen, setRevisionModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isSettlementAlertOpen, setSettlementAlertOpen] = useState(false);
  const [settlementAlertMessage, setSettlementAlertMessage] = useState('');
  const [isDownloadingPdf, setDownloadingPdf] = useState(false);

  const fetchLoanHistory = useCallback(async (gId: number) => {
    setLoadingLoans(true);
    try {
      console.log('Fetching loan history for guarantee ID:', gId);
      const loans = await getGuaranteeLoansForGuarantee(gId);
      console.log('Loan history received:', loans);

      // Ensure loans is always an array
      if (Array.isArray(loans)) {
        setLoanHistory(loans);
      } else if (loans && typeof loans === 'object' && 'data' in loans && Array.isArray((loans as any).data)) {
        setLoanHistory((loans as any).data);
      } else {
        console.warn('Invalid loan history format:', loans);
        setLoanHistory([]);
      }
    } catch (err: any) {
      console.error('Error fetching loan history:', err);
      setLoanHistory([]);
    } finally {
      setLoadingLoans(false);
    }
  }, []);

  const fetchSettlementHistory = useCallback(async (gId: number) => {
    setLoadingSettlements(true);
    try {
      console.log('Fetching settlement history for guarantee ID:', gId);
      const settlements = await getGuaranteeSettlementsForGuarantee(gId);
      console.log('Settlement history received:', settlements);

      // Ensure settlements is always an array
      if (Array.isArray(settlements)) {
        setSettlementHistory(settlements);
      } else if (settlements && typeof settlements === 'object' && 'data' in settlements && Array.isArray((settlements as any).data)) {
        setSettlementHistory((settlements as any).data);
      } else {
        console.warn('Invalid settlement history format:', settlements);
        setSettlementHistory([]);
      }
    } catch (err: any) {
      console.error('Error fetching settlement history:', err);
      setSettlementHistory([]);
    } finally {
      setLoadingSettlements(false);
    }
  }, []);

  const fetchGuaranteeDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getGuaranteeById(parseInt(guaranteeId));

      // Handle response format dengan aman
      const actualData = (data as any).data || data;

      if (!actualData || typeof actualData !== 'object') {
        setError('Data jaminan tidak valid');
        setLoading(false);
        return;
      }

      const guarantee = actualData as Guarantee;
      setGuarantee(guarantee);

      // Fetch loan history dan settlement history setelah guarantee dimuat
      if (guarantee.id) {
        await fetchLoanHistory(guarantee.id);
        await fetchSettlementHistory(guarantee.id);
      }
    } catch (err: any) {
      console.error('Error fetching guarantee details:', err);
      setError(err.message || 'Gagal memuat detail jaminan');
    } finally {
      setLoading(false);
    }
  }, [guaranteeId, fetchLoanHistory, fetchSettlementHistory]);

  useEffect(() => {
    fetchGuaranteeDetail();
  }, [fetchGuaranteeDetail]);

  const handleEditSuccess = async () => {
    setEditModalOpen(false);
    setSuccessMessage('Jaminan berhasil diperbarui');
    setTimeout(() => {
      setSuccessMessage('');
      fetchGuaranteeDetail();
    }, 1000);
  };

  const handleLoanSuccess = async () => {
    setLoanModalOpen(false);
    setSuccessMessage('Peminjaman jaminan berhasil disimpan');
    setTimeout(() => {
      setSuccessMessage('');
      fetchGuaranteeDetail();
    }, 1000);
  };

  const handleSettlementSuccess = async () => {
    setSettlementModalOpen(false);
    setSuccessMessage('Pelunasan jaminan berhasil disimpan');
    setTimeout(() => {
      setSuccessMessage('');
      fetchGuaranteeDetail();
    }, 1000);
  };

  const handleReturnSuccess = async () => {
    setReturnModalOpen(false);
    setSelectedLoanForReturn(null);
    setSuccessMessage('Jaminan berhasil dikembalikan');
    setTimeout(() => {
      setSuccessMessage('');
      fetchGuaranteeDetail();
    }, 1000);
  };

  const openReturnModal = (loan: any) => {
    setSelectedLoanForReturn(loan);
    setReturnModalOpen(true);
  };

  const closeReturnModal = () => {
    setReturnModalOpen(false);
    setSelectedLoanForReturn(null);
  };

  const handleSettlementButtonClick = () => {
    if (!guarantee) return;

    if (guarantee.status === 'available') {
      // Bisa melakukan pelunasan
      setSettlementModalOpen(true);
    } else if (guarantee.status === 'dipinjam') {
      // Jaminan sedang dipinjam
      setSettlementAlertMessage(
        'Jaminan sedang dalam status "Dipinjam". Anda tidak dapat melakukan pelunasan sampai jaminan dikembalikan. Silakan lakukan pengembalian jaminan terlebih dahulu agar statusnya berubah menjadi "Tersedia".'
      );
      setSettlementAlertOpen(true);
    } else if (guarantee.status === 'lunas') {
      // Jaminan sudah dilunasi
      setSettlementAlertMessage(
        'Jaminan sudah dalam status "Lunas". Tidak dapat melakukan pelunasan lebih lanjut.'
      );
      setSettlementAlertOpen(true);
    }
  };

  const handleDownloadPdf = async () => {
    if (!guarantee) return;

    setDownloadingPdf(true);
    try {
      // Prepare guarantee data with settlements and loans for PDF export
      const guaranteeDataForPdf = {
        ...guarantee,
        settlements: settlementHistory,
        loans: loanHistory,
      };

      // Generate filename with guarantee and spk number
      const filename = `Detail_Jaminan_${guarantee.spk_number}_${guarantee.guarantee_name.replace(/\s+/g, '_')}.pdf`;

      // Call export function
      await exportGuaranteeDetailToPdf(filename, guaranteeDataForPdf as any);

      setSuccessMessage('PDF berhasil diunduh');
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setSuccessMessage('Gagal mengunduh PDF');
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'BPKB': 'bg-blue-100 text-blue-800',
      'SHM': 'bg-green-100 text-green-800',
      'SHGB': 'bg-purple-100 text-purple-800',
      'E-SHM': 'bg-orange-100 text-orange-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    const statusLower = String(status).toLowerCase();
    const colors: Record<string, string> = {
      'available': 'bg-green-100 text-green-800',
      'dipinjam': 'bg-yellow-100 text-yellow-800',
      'lunas': 'bg-blue-100 text-blue-800',
    };
    return colors[statusLower] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const statusLower = String(status).toLowerCase();
    const labels: Record<string, string> = {
      'available': 'Tersedia',
      'dipinjam': 'Dipinjam',
      'lunas': 'Lunas',
    };
    return labels[statusLower] || status;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
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

  const TabButton: React.FC<{ tabName: Tab; label: string; icon: React.ReactNode }> = ({ tabName, label, icon }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`flex-shrink-0 flex items-center px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
        activeTab === tabName
          ? 'border-b-2 border-primary text-primary bg-blue-50'
          : 'text-gray-500 hover:text-primary hover:bg-gray-50'
      }`}
    >
      {icon}
      <span className="ml-2">{label}</span>
    </button>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <span className="ml-4">Memuat detail jaminan...</span>
      </div>
    );
  }

  if (error && !guarantee) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateTo({ type: 'GUARANTEE_LIST' })}
            className="flex items-center gap-2 text-primary hover:text-primary-dark font-medium"
          >
            <BackIcon />
            Kembali
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-800">
          <p className="font-medium">Error</p>
          <p className="text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!guarantee) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateTo({ type: 'GUARANTEE_LIST' })}
            className="flex items-center gap-2 text-primary hover:text-primary-dark font-medium"
          >
            <BackIcon />
            Kembali
          </button>
        </div>
        <div className="text-center py-12">
          <p className="text-gray-600">Data jaminan tidak ditemukan</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ✅ Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Back Button */}
      <button
        onClick={() => navigateTo({ type: 'GUARANTEE_LIST' })}
        className="flex items-center text-primary hover:underline transition-colors"
      >
        <BackIcon />
        <span className="ml-2">Kembali ke Daftar Jaminan</span>
      </button>

      {/* Main Detail Card */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <div className="flex flex-col md:flex-row items-start gap-8">
          {/* Left Section - Info */}
          <div className="flex-grow w-full">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">{guarantee.guarantee_name}</h1>
              <p className="text-lg text-gray-500 mt-2">{guarantee.spk_number}</p>
            </div>

            {/* Section 1: Informasi SPK */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Informasi SPK</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border-l-4 border-primary pl-4">
                  <p className="text-sm text-gray-600 font-medium">No SPK</p>
                  <p className="text-lg text-gray-900 font-semibold mt-1">{guarantee.spk_number}</p>
                </div>
                <div className="border-l-4 border-primary pl-4">
                  <p className="text-sm text-gray-600 font-medium">No CIF</p>
                  <p className="text-lg text-gray-900 font-semibold mt-1">{guarantee.cif_number}</p>
                </div>
                <div className="border-l-4 border-primary pl-4">
                  <p className="text-sm text-gray-600 font-medium">Atas Nama SPK</p>
                  <p className="text-lg text-gray-900 font-semibold mt-1">{guarantee.spk_name}</p>
                </div>
                <div className="border-l-4 border-primary pl-4">
                  <p className="text-sm text-gray-600 font-medium">Jangka Kredit</p>
                  <p className="text-lg text-gray-900 font-semibold mt-1">{guarantee.credit_period}</p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 my-8"></div>

            {/* Section 2: Informasi Jaminan */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Informasi Jaminan</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border-l-4 border-green-400 pl-4">
                  <p className="text-sm text-gray-600 font-medium">Atas Nama Jaminan</p>
                  <p className="text-lg text-gray-900 font-semibold mt-1">{guarantee.guarantee_name}</p>
                </div>
                <div className="border-l-4 border-green-400 pl-4">
                  <p className="text-sm text-gray-600 font-medium">Tipe Jaminan</p>
                  <div className="mt-1">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(guarantee.guarantee_type)}`}>
                      {guarantee.guarantee_type}
                    </span>
                  </div>
                </div>
                <div className="border-l-4 border-green-400 pl-4">
                  <p className="text-sm text-gray-600 font-medium">No Jaminan</p>
                  <p className="text-lg text-gray-900 font-semibold mt-1">{guarantee.guarantee_number}</p>
                </div>
                <div className="border-l-4 border-green-400 pl-4">
                  <p className="text-sm text-gray-600 font-medium">Lokasi File</p>
                  <p className="text-lg text-gray-900 font-semibold mt-1">{guarantee.file_location}</p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 my-8"></div>

            {/* Section 3: Status dan Tanggal */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Status dan Tanggal</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border-l-4 border-blue-400 pl-4">
                  <p className="text-sm text-gray-600 font-medium">Status</p>
                  <div className="mt-1">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(guarantee.status)}`}>
                      {getStatusLabel(guarantee.status)}
                    </span>
                  </div>
                </div>
                <div className="border-l-4 border-blue-400 pl-4">
                  <p className="text-sm text-gray-600 font-medium">Tanggal Input</p>
                  <p className="text-lg text-gray-900 font-semibold mt-1">{formatDate(guarantee.input_date)}</p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 my-8"></div>

            {/* Section 4: Informasi Sistem */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Informasi Sistem</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border-l-4 border-gray-400 pl-4">
                  <p className="text-sm text-gray-600 font-medium">Dibuat Pada</p>
                  <p className="text-sm text-gray-900 mt-1">{formatDate(guarantee.created_at)}</p>
                </div>
                <div className="border-l-4 border-gray-400 pl-4">
                  <p className="text-sm text-gray-600 font-medium">Diperbarui Pada</p>
                  <p className="text-sm text-gray-900 mt-1">{formatDate(guarantee.updated_at)}</p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 my-8"></div>

            {/* Action Buttons Bar */}
            <div className="mt-8 pt-6 border-t border-gray-200 flex flex-wrap gap-3 justify-center md:justify-start">
              {/* Peminjaman Button - Selalu tersedia */}
              {guarantee && (
                <button
                  onClick={() => setLoanModalOpen(true)}
                  className="flex items-center justify-center text-sm font-medium bg-yellow-50 text-yellow-700 px-4 py-2 rounded-lg shadow-sm hover:bg-yellow-100 border border-yellow-200 transition-colors"
                >
                  <span className="mr-2">📤</span>
                  <span>Peminjaman Jaminan</span>
                </button>
              )}

              {/* Pelunasan Button - Hanya bisa jika status 'available' */}
              {guarantee && (
                <button
                  onClick={handleSettlementButtonClick}
                  className={`flex items-center justify-center text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-colors ${
                    guarantee.status === 'available'
                      ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 cursor-pointer'
                      : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
                  }`}
                  disabled={guarantee.status !== 'available'}
                >
                  <span className="mr-2">✅</span>
                  <span>Pelunasan Jaminan</span>
                </button>
              )}

              {/* Download PDF Button - Selalu tersedia */}
              {guarantee && (
                <button
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf}
                  className="flex items-center justify-center text-sm font-medium bg-red-50 text-red-700 px-4 py-2 rounded-lg shadow-sm hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="mr-2">📥</span>
                  <span>{isDownloadingPdf ? 'Membuat PDF...' : 'Download PDF'}</span>
                </button>
              )}

              {/* Edit Button - Selalu tersedia */}
              <button
                onClick={() => setEditModalOpen(true)}
                className="flex items-center justify-center text-sm font-medium bg-primary text-white px-4 py-2 rounded-lg shadow-sm hover:bg-primary-dark transition-colors"
              >
                <span className="mr-2">✏️</span>
                <span>Edit</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Content */}
      <div className="bg-white rounded-xl shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px space-x-4 px-4 overflow-x-auto">
            <TabButton tabName="history" label="Riwayat Peminjaman" icon={<HistoryIcon />} />
            <TabButton tabName="settlement" label="Pelunasan" icon={<span>💰</span>} />
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'history' && (
            <div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900">Riwayat Peminjaman Jaminan</h3>

              {loadingLoans ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-gray-600">Memuat data peminjaman...</p>
                </div>
              ) : loanHistory.length === 0 ? (
                <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                  <p>Belum ada riwayat peminjaman</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left font-semibold text-gray-700">Nama Peminjam</th>
                        <th className="px-6 py-3 text-left font-semibold text-gray-700">Kontak Peminjam</th>
                        <th className="px-6 py-3 text-left font-semibold text-gray-700">Tanggal Peminjaman</th>
                        <th className="px-6 py-3 text-left font-semibold text-gray-700">Tanggal Ekspektasi Kembali</th>
                        <th className="px-6 py-3 text-left font-semibold text-gray-700">Lokasi Jaminan</th>
                        <th className="px-6 py-3 text-left font-semibold text-gray-700">Alasan Peminjaman</th>
                        <th className="px-6 py-3 text-center font-semibold text-gray-700">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loanHistory.map((loan) => (
                        <tr key={loan.id} className="border-b hover:bg-gray-50 transition">
                          <td className="px-6 py-4 text-gray-900 font-medium">{loan.borrower_name || 'N/A'}</td>
                          <td className="px-6 py-4 text-gray-900">{loan.borrower_contact || 'N/A'}</td>
                          <td className="px-6 py-4 text-gray-900">{formatDate(loan.loan_date)}</td>
                          <td className="px-6 py-4 text-gray-900">
                            {loan.expected_return_date ? formatDate(loan.expected_return_date) : 'Belum ditentukan'}
                          </td>
                          <td className="px-6 py-4 text-gray-900">{loan.file_location || 'N/A'}</td>
                          <td className="px-6 py-4 text-gray-900">{loan.reason || 'N/A'}</td>
                          <td className="px-6 py-4 text-center">
                            {loan.status === 'active' && !loan.actual_return_date && (
                              <button
                                onClick={() => openReturnModal(loan)}
                                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                              >
                                Kembalikan
                              </button>
                            )}
                            {loan.actual_return_date && (
                              <span className="text-green-600 font-medium text-sm">Dikembalikan</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settlement' && (
            <div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900">Riwayat Pelunasan Jaminan</h3>

              {loadingSettlements ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-gray-600">Memuat data pelunasan...</p>
                </div>
              ) : settlementHistory.length === 0 ? (
                <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                  <p>Belum ada data pelunasan</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {settlementHistory.map((settlement) => (
                    <li key={settlement.id} className={`p-4 rounded-lg border transition-colors ${
                      settlement.settlement_status === 'approved'
                        ? 'bg-green-50 border-green-200 hover:bg-green-100'
                        : settlement.settlement_status === 'rejected'
                        ? 'bg-red-50 border-red-200 hover:bg-red-100'
                        : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
                    }`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <span className="font-medium text-gray-900">Status Pelunasan:</span>
                            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              settlement.settlement_status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : settlement.settlement_status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {settlement.settlement_status === 'pending' ? 'Menunggu Persetujuan' :
                               settlement.settlement_status === 'approved' ? 'Disetujui' :
                               settlement.settlement_status === 'rejected' ? 'Ditolak' : settlement.settlement_status}
                            </span>
                          </div>
                          <div className="flex items-center mb-2">
                            <span className="font-medium text-gray-900">Lokasi Jaminan:</span>
                            <span className="ml-2 text-gray-700">{guarantee?.file_location || 'N/A'}</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <div><strong>Tanggal Pelunasan:</strong> {formatDate(settlement.settlement_date)}</div>
                            {settlement.settlement_notes && (
                              <div><strong>Catatan:</strong> {settlement.settlement_notes}</div>
                            )}
                            {settlement.settlement_remarks && (
                              <div><strong>Keterangan:</strong> {settlement.settlement_remarks}</div>
                            )}
                            {settlement.bukti_pelunasan && (
                              <div className="mt-3">
                                <p className="font-medium mb-2"><strong>Bukti Pelunasan:</strong></p>
                                <img
                                  src={`http://127.0.0.1:8000/storage/${settlement.bukti_pelunasan}`}
                                  alt="Bukti Pelunasan"
                                  className="w-32 h-auto rounded border border-gray-300 cursor-pointer hover:opacity-80"
                                  onClick={() => window.open(`http://127.0.0.1:8000/storage/${settlement.bukti_pelunasan}`, '_blank')}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="text-sm text-gray-500 whitespace-nowrap">
                            {formatDateTime(settlement.created_at)}
                          </div>
                          {settlement.settlement_status === 'pending' && (
                            <button
                              onClick={() => {
                                setSelectedSettlementForValidation(settlement);
                                setValidationModalOpen(true);
                              }}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors font-medium"
                              title="Validasi pelunasan jaminan"
                            >
                              Validasi
                            </button>
                          )}
                          {settlement.settlement_status === 'rejected' && guarantee?.status !== 'lunas' && (
                            <button
                              onClick={() => {
                                setSelectedSettlementForRevision(settlement);
                                setRevisionModalOpen(true);
                              }}
                              className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition-colors font-medium"
                              title="Revisi dan kirim ulang pelunasan jaminan"
                            >
                              Revisi
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Edit */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Jaminan"
      >
        <GuaranteeInputForm
          guarantee={guarantee}
          assets={[]}
          onSuccess={handleEditSuccess}
          onClose={() => setEditModalOpen(false)}
        />
      </Modal>

      {/* Modal Peminjaman */}
      <Modal
        isOpen={isLoanModalOpen}
        onClose={() => setLoanModalOpen(false)}
        title="Peminjaman Jaminan"
      >
        {guarantee && (
          <GuaranteeLoaning
            guarantee={guarantee}
            onSuccess={handleLoanSuccess}
            onClose={() => setLoanModalOpen(false)}
          />
        )}
      </Modal>

      {/* Modal Pelunasan */}
      <Modal
        isOpen={isSettlementModalOpen}
        onClose={() => setSettlementModalOpen(false)}
        title="Pelunasan Jaminan"
      >
        {guarantee && (
          <GuaranteeSettlement
            guarantee={guarantee}
            onSuccess={handleSettlementSuccess}
            onClose={() => setSettlementModalOpen(false)}
          />
        )}
      </Modal>

      {/* Modal Pengembalian */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={closeReturnModal}
        title="Pengembalian Jaminan"
      >
        {guarantee && selectedLoanForReturn && (
          <GuaranteeReturn
            guarantee={guarantee}
            loanId={selectedLoanForReturn.id}
            borrowerName={selectedLoanForReturn.borrower_name}
            loanDate={selectedLoanForReturn.loan_date}
            onSuccess={handleReturnSuccess}
            onClose={closeReturnModal}
          />
        )}
      </Modal>

      {/* Modal Validasi Pelunasan */}
      <Modal
        isOpen={isValidationModalOpen}
        onClose={() => {
          setValidationModalOpen(false);
          setSelectedSettlementForValidation(null);
        }}
        title="Validasi Pelunasan Jaminan"
      >
        {selectedSettlementForValidation && guarantee && (
          <SettlementValidation
            settlement={selectedSettlementForValidation}
            guarantee={guarantee}
            onSuccess={() => {
              setValidationModalOpen(false);
              setSelectedSettlementForValidation(null);
              // Refresh guarantee detail dan settlement history
              if (guarantee?.id) {
                fetchGuaranteeDetail();
                fetchSettlementHistory(guarantee.id);
              }
            }}
            onClose={() => {
              setValidationModalOpen(false);
              setSelectedSettlementForValidation(null);
            }}
          />
        )}
      </Modal>

      {/* Modal Revisi Pelunasan */}
      <Modal
        isOpen={isRevisionModalOpen}
        onClose={() => {
          setRevisionModalOpen(false);
          setSelectedSettlementForRevision(null);
        }}
        title="Revisi Pelunasan Jaminan"
      >
        {selectedSettlementForRevision && guarantee && (
          <SettlementRevision
            guarantee={guarantee}
            previousSettlement={selectedSettlementForRevision}
            onSuccess={() => {
              setRevisionModalOpen(false);
              setSelectedSettlementForRevision(null);
              // Refresh settlement history
              if (guarantee?.id) {
                fetchSettlementHistory(guarantee.id);
              }
            }}
            onClose={() => {
              setRevisionModalOpen(false);
              setSelectedSettlementForRevision(null);
            }}
          />
        )}
      </Modal>

      {/* Modal Alert - Settlement Status Information */}
      <Modal
        isOpen={isSettlementAlertOpen}
        onClose={() => setSettlementAlertOpen(false)}
        title="Informasi Pelunasan Jaminan"
      >
        <div className="space-y-4">
          <div className={`p-4 rounded-lg border-l-4 ${
            guarantee?.status === 'dipinjam'
              ? 'bg-yellow-50 border-yellow-500'
              : 'bg-blue-50 border-blue-500'
          }`}>
            <p className={`text-sm ${
              guarantee?.status === 'dipinjam'
                ? 'text-yellow-800'
                : 'text-blue-800'
            }`}>
              {settlementAlertMessage}
            </p>
          </div>

          {guarantee?.status === 'dipinjam' && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">Langkah yang harus dilakukan:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>Buka riwayat peminjaman jaminan</li>
                <li>Pilih peminjaman yang ingin dikembalikan</li>
                <li>Klik tombol "Pengembalian Jaminan"</li>
                <li>Lengkapi data pengembalian dan submit</li>
                <li>Setelah disetujui, status jaminan akan berubah menjadi "Tersedia"</li>
                <li>Kemudian Anda bisa melakukan pelunasan jaminan</li>
              </ol>
            </div>
          )}

          <button
            onClick={() => setSettlementAlertOpen(false)}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Mengerti
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default GuaranteeDetail;
