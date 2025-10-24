// AssetDetail.tsx - PERBAIKAN LENGKAP DENGAN ERROR HANDLING DAN SAFE DATA ACCESS
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getAssetById,
  getAssetHistory,
  getMaintenanceHistory,
  getDamageReports,
  getLossReports,
  getAssetDepreciation,
  generateAssetDepreciation,
  getCurrentUser,
  getAssetLoanHistory
} from '../services/api';
import { Asset, AssetMovement, Maintenance, DamageReport, LossReport, View, AssetLoan } from '../types';
import { QRCodeCanvas } from 'qrcode.react';
import { BackIcon, HistoryIcon, MaintenanceIcon, DamageIcon, MoveIcon, DownloadIcon, DepreciationIcon } from './icons';
import { formatToRupiah } from '../utils/formatters';
import Modal from './Modal';
import MoveAssetForm from './MoveAssetForm';
import ReportIssueForm from './ReportIssueForm';
import AddMaintenanceForm from './AddMaintenanceForm';
import LossReportDetailModal from './LossReportDetailModal';
import MaintenanceValidationModal from './MaintenanceValidationModal';
import DamageReportValidationModal from './DamageReportValidationModal';
import { useTranslation } from '../hooks/useTranslation';

interface AssetDetailProps {
  assetId: string;
  navigateTo: (view: View) => void;
}

type Tab = 'history' | 'maintenance' | 'damage_loss' | 'depreciation';

interface DepreciationData {
  monthly_depreciation?: number;
  accumulated_depreciation?: number;
  current_value?: number;
  remaining_months?: number;
  depreciated_months?: number;
  next_depreciation_date?: string;
  is_depreciable?: boolean;
  depreciation_history?: any[];
  completion_percentage?: number;
  elapsed_months_since_purchase?: number;
  pending_depreciation_months?: number;
  expected_depreciated_months?: number;
  is_up_to_date?: boolean;
}

const AssetDetail: React.FC<AssetDetailProps> = ({ assetId, navigateTo }) => {
  const { t } = useTranslation();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [history, setHistory] = useState<AssetMovement[]>([]);
  const [loanHistory, setLoanHistory] = useState<AssetLoan[]>([]);
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
  const [damageReports, setDamageReports] = useState<DamageReport[]>([]);
  const [lossReports, setLossReports] = useState<LossReport[]>([]);
  const [depreciationData, setDepreciationData] = useState<DepreciationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDepreciation, setLoadingDepreciation] = useState(false);
  const [generatingDepreciation, setGeneratingDepreciation] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('history');
  const [isMoveModalOpen, setMoveModalOpen] = useState(false);
  const [isReportModalOpen, setReportModalOpen] = useState(false);
  const [isMaintModalOpen, setMaintModalOpen] = useState(false);
  const [isLossDetailModalOpen, setLossDetailModalOpen] = useState(false);
  const [selectedLossReport, setSelectedLossReport] = useState<LossReport | null>(null);
  const [isMaintenanceDetailModalOpen, setMaintenanceDetailModalOpen] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState<Maintenance | null>(null);
  const [isDamageReportDetailModalOpen, setDamageReportDetailModalOpen] = useState(false);
  const [selectedDamageReport, setSelectedDamageReport] = useState<DamageReport | null>(null);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [assetData, historyData, loanHistoryData, maintenanceData, damageData, lossData] = await Promise.all([
        getAssetById(assetId),
        getAssetHistory(assetId),
        getAssetLoanHistory(assetId),
        getMaintenanceHistory(assetId),
        getDamageReports(assetId),
        getLossReports(assetId)
      ]);
      
      // ✅ PERBAIKAN: Handle response format dengan aman
      if (!assetData || (typeof assetData === 'object' && 'success' in assetData && !assetData.success)) {
        setError('Asset not found');
        setLoading(false);
        return;
      }

      // ✅ PERBAIKAN: Extract data dari response object jika diperlukan
      const actualAssetData = (assetData as any).data || assetData;
      
      if (!actualAssetData || typeof actualAssetData !== 'object') {
        setError('Invalid asset data format');
        setLoading(false);
        return;
      }
      
      setAsset(actualAssetData as Asset);

      // ✅ PERBAIKAN: Ensure arrays dengan safety check
      setHistory(Array.isArray(historyData) ? historyData :
                Array.isArray((historyData as any)?.data) ? (historyData as any).data : []);

      setLoanHistory(Array.isArray(loanHistoryData) ? loanHistoryData :
                    Array.isArray((loanHistoryData as any)?.data) ? (loanHistoryData as any).data : []);

      setMaintenance(Array.isArray(maintenanceData) ? maintenanceData :
                    Array.isArray((maintenanceData as any)?.data) ? (maintenanceData as any).data : []);

      setDamageReports(Array.isArray(damageData) ? damageData :
                      Array.isArray((damageData as any)?.data) ? (damageData as any).data : []);

      setLossReports(Array.isArray(lossData) ? lossData :
                    Array.isArray((lossData as any)?.data) ? (lossData as any).data : []);
    } catch (err: any) {
      console.error('Error fetching asset details:', err);
      setError(err.message || 'Failed to load asset details');
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  const fetchDepreciationData = useCallback(async () => {
    if (!assetId) return;
    
    setLoadingDepreciation(true);
    try {
      const data = await getAssetDepreciation(assetId);
      
      // ✅ PERBAIKAN: Handle depreciation data format dengan aman
      if (data && typeof data === 'object') {
        if ('success' in data && data.success === false) {
          setDepreciationData(null);
          return;
        }
        
        // Extract data dari response
        const actualData = data.data || data;
        setDepreciationData(actualData as DepreciationData);
      } else {
        setDepreciationData(null);
      }
    } catch (error: any) {
      console.error('Failed to fetch depreciation data:', error);
      setDepreciationData(null);
    } finally {
      setLoadingDepreciation(false);
    }
  }, [assetId]);

  useEffect(() => {
    fetchData();
    fetchDepreciationData();

    // Fetch current user
    const loadUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    };
    loadUser();
  }, [fetchData, fetchDepreciationData]);

  // ✅ PERBAIKAN: Handle Generate Depreciation dengan error handling yang lebih baik
  const handleGenerateDepreciation = async () => {
    if (!asset) return;
    
    setGeneratingDepreciation(true);
    setError('');
    setSuccessMessage('');
    
    try {
      const result = await generateAssetDepreciation(asset.id.toString());

      // ✅ PERBAIKAN: Cek response success dengan format yang konsisten
      if (result && result.success) {
        setSuccessMessage(result.message || 'Depresiasi berhasil dibuat!');

        // Refresh data depresiasi
        await fetchDepreciationData();

        // Auto-hide success message setelah 3 detik
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } else {
        // Backend mengembalikan success=false
        setError(result?.message || 'Gagal melakukan depresiasi');

        // Auto-hide error setelah 5 detik
        setTimeout(() => {
          setError('');
        }, 5000);
      }
    } catch (error: any) {
      console.error('Depreciation generation error:', error);

      // ✅ PERBAIKAN: Tampilkan error yang lebih spesifik
      let errorMessage = 'Gagal melakukan depresiasi';

      if (error.message?.includes('next depreciation date has not arrived') || error.message?.includes('not yet time')) {
        // Validasi waktu dari backend
        errorMessage = 'Asset belum waktunya terdepresiasi';
      } else if (error.message?.includes('fully depreciated')) {
        errorMessage = 'Asset sudah selesai didepresiasi';
      } else if (error.message?.includes('500')) {
        errorMessage = 'Terjadi kesalahan server. Silakan coba lagi atau hubungi administrator';
      } else if (error.message?.includes('404')) {
        errorMessage = 'Asset tidak ditemukan';
      } else if (error.message?.includes('Network Error')) {
        errorMessage = 'Koneksi jaringan bermasalah. Silakan periksa koneksi internet Anda';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);

      // Auto-hide error setelah 5 detik
      setTimeout(() => {
        setError('');
      }, 5000);
    } finally {
      setGeneratingDepreciation(false);
    }
  };

  // ✅ PERBAIKAN: Safe array access untuk depreciation history
  const depreciationHistory = useMemo(() => {
    if (!depreciationData) return [];
    return Array.isArray(depreciationData.depreciation_history) 
      ? depreciationData.depreciation_history 
      : [];
  }, [depreciationData]);

  // ✅ PERBAIKAN: Safe values untuk depreciation data
  const monthlyDepreciation = depreciationData?.monthly_depreciation || 0;
  const accumulatedDepreciation = depreciationData?.accumulated_depreciation || 0;
  const currentValue = depreciationData?.current_value ?? asset?.value ?? 0;
  const remainingMonths = depreciationData?.remaining_months ?? asset?.useful_life ?? 0;
  const depreciatedMonths = depreciationData?.depreciated_months || 0;
  const nextDepreciationDate = depreciationData?.next_depreciation_date;
  const isDepreciable = depreciationData?.is_depreciable !== false;
  const completionPercentage = depreciationData?.completion_percentage || 0;
  const elapsedMonths = depreciationData?.elapsed_months_since_purchase || 0;
  const pendingMonths = depreciationData?.pending_depreciation_months || 0;
  const expectedMonths = depreciationData?.expected_depreciated_months || 0;
  const isUpToDate = depreciationData?.is_up_to_date || false;

  const handleDownloadQR = () => {
    const sourceCanvas = document.getElementById('qr-code-canvas') as HTMLCanvasElement;
    if (sourceCanvas && asset) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const qrSize = 320;
        const padding = 20;
        const fontSize = 18;
        const textHeight = 40;
        const font = `${fontSize}px Arial`;

        canvas.width = qrSize + padding * 2;
        canvas.height = qrSize + padding * 2 + textHeight;

        // Draw background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw QR code
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sourceCanvas, padding, padding, qrSize, qrSize);

        // Draw Asset Tag text
        ctx.fillStyle = '#1F2937';
        ctx.font = font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const textX = canvas.width / 2;
        const textY = padding + qrSize + (textHeight / 2);
        
        ctx.fillText(asset.asset_tag, textX, textY);
        
        // Trigger download
        const pngUrl = canvas
            .toDataURL("image/png")
            .replace("image/png", "image/octet-stream");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `${asset.asset_tag}_qr_code.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }
  };

  // ✅ PERBAIKAN: Reset messages ketika tab berubah
  useEffect(() => {
    setError('');
    setSuccessMessage('');
  }, [activeTab]);

  // ✅ PERBAIKAN: Format date function dengan safety check
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
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

  // ✅ PERBAIKAN: Format datetime function dengan safety check
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

  // ✅ PERBAIKAN: Cek apakah bisa generate depreciation (dengan validasi waktu)
  const canGenerateDepreciation = useMemo(() => {
    // Asset harus depreciable, masih ada remaining months, book value > 0, DAN ada pending months
    return isDepreciable && remainingMonths > 0 && currentValue > 0 && pendingMonths > 0;
  }, [isDepreciable, remainingMonths, currentValue, pendingMonths]);

  // Handler untuk membuka modal detail laporan kehilangan
  const handleViewLossReportDetail = (report: LossReport) => {
    setSelectedLossReport(report);
    setLossDetailModalOpen(true);
  };

  const handleCloseLossDetailModal = () => {
    setLossDetailModalOpen(false);
    setSelectedLossReport(null);
  };

  const handleLossReportSuccess = () => {
    handleCloseLossDetailModal();
    fetchData(); // Refresh data after validation
  };

  // Handler untuk membuka modal detail maintenance
  const handleViewMaintenanceDetail = (maint: Maintenance) => {
    setSelectedMaintenance(maint);
    setMaintenanceDetailModalOpen(true);
  };

  const handleCloseMaintenanceDetailModal = () => {
    setMaintenanceDetailModalOpen(false);
    setSelectedMaintenance(null);
  };

  const handleMaintenanceSuccess = () => {
    handleCloseMaintenanceDetailModal();
    fetchData(); // Refresh data after validation
  };

  // Handler untuk membuka modal detail damage report
  const handleViewDamageReportDetail = (report: DamageReport) => {
    setSelectedDamageReport(report);
    setDamageReportDetailModalOpen(true);
  };

  const handleCloseDamageReportDetailModal = () => {
    setDamageReportDetailModalOpen(false);
    setSelectedDamageReport(null);
  };

  const handleDamageReportSuccess = () => {
    handleCloseDamageReportDetailModal();
    fetchData(); // Refresh data after validation
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <span className="ml-4">Loading asset details...</span>
      </div>
    );
  }

  if (error && !asset) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 text-lg">{error}</p>
        <button 
          onClick={() => navigateTo({ type: 'ASSET_LIST' })}
          className="mt-4 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
        >
          Back to Asset List
        </button>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 text-lg">Asset not found</p>
        <button 
          onClick={() => navigateTo({ type: 'ASSET_LIST' })}
          className="mt-4 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
        >
          Back to Asset List
        </button>
      </div>
    );
  }

  const TabButton: React.FC<{tabName: Tab, label: string, icon: React.ReactNode}> = ({tabName, label, icon}) => (
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

  return (
    <div className="space-y-6">
      {/* ✅ PERBAIKAN: Success & Error Messages */}
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

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800 whitespace-pre-line">{error}</p>
            </div>
          </div>
        </div>
      )}

      <button 
        onClick={() => navigateTo({ type: 'ASSET_LIST' })} 
        className="flex items-center text-primary hover:underline transition-colors"
      >
        <BackIcon />
        <span className="ml-2">{t('asset_detail.back_to_list')}</span>
      </button>
      
      <div className="bg-white p-6 rounded-xl shadow-md">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="flex-shrink-0 text-center">
                <QRCodeCanvas 
                  id="qr-code-canvas" 
                  value={asset.asset_tag} 
                  size={160} 
                />
            </div>
            
            <div className="flex-grow flex flex-col w-full">
                 <div>
                    <h1 className="text-3xl font-bold text-center md:text-left text-gray-900">{asset.name}</h1>
                    <p className="text-lg text-gray-500 text-center md:text-left mt-1">{asset.asset_tag}</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-500">{t('asset_detail.labels.category')}</span>
                        <span className="text-gray-900">{asset.category}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-500">{t('unit')}</span>
                        <span className="text-gray-900">{asset.unit?.name || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-500">{t('asset_detail.labels.status')}</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          (() => {
                            const s = String(asset.status).toLowerCase();
                            if (s === 'in use' || s === 'in_use' || s === 'in-use' || s === 'inuse') return 'bg-green-100 text-green-800';
                            if (s === 'in repair' || s === 'in_repair' || s === 'in-repair' || s === 'inrepair') return 'bg-yellow-100 text-yellow-800';
                            if (s === 'disposed' || s === 'disposed') return 'bg-red-100 text-red-800';
                            return 'bg-gray-100 text-gray-800';
                          })()
                        }`}>
                          {asset.status}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-500">{t('asset_detail.labels.purchase_date')}</span>
                        <span className="text-gray-900">{formatDate(asset.purchase_date)}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-500">{t('asset_detail.labels.value')}</span>
                        <span className="text-gray-900 font-semibold">{formatToRupiah(asset.value)}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-500">{t('asset_detail.labels.useful_life')}</span>
                        <span className="text-gray-900">{asset.useful_life} months</span>
                    </div>
                </div>

                {/* Depreciation Details Section */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <DepreciationIcon />
                        <span className="ml-2">Depreciation Details</span>
                    </h3>
                    <button
                      onClick={fetchDepreciationData}
                      disabled={loadingDepreciation}
                      className="flex items-center text-sm bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="mr-1">🔄</span>
                      <span className="ml-1">{loadingDepreciation ? 'Refreshing...' : 'Refresh'}</span>
                    </button>
                  </div>

                  {loadingDepreciation ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-2 text-gray-600">Loading depreciation data...</p>
                    </div>
                  ) : depreciationData ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <p className="text-sm text-blue-600 font-medium">Monthly Depreciation</p>
                          <p className="text-lg font-bold text-blue-800">
                            {formatToRupiah(monthlyDepreciation)}
                          </p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <p className="text-sm text-green-600 font-medium">Accumulated Depreciation</p>
                          <p className="text-lg font-bold text-green-800">
                            {formatToRupiah(accumulatedDepreciation)}
                          </p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                          <p className="text-sm text-purple-600 font-medium">Current Book Value</p>
                          <p className="text-lg font-bold text-purple-800">
                            {formatToRupiah(currentValue)}
                          </p>
                        </div>
                      </div>

                      {/* ✅ PERBAIKAN: Additional Depreciation Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-600 font-medium">Progress</p>
                          <div className="mt-2">
                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                              <span>{completionPercentage.toFixed(1)}% Complete</span>
                              <span>{depreciatedMonths} / {asset.useful_life} months</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full" 
                                style={{ width: `${completionPercentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-600 font-medium">Timeline</p>
                          <div className="mt-2 space-y-1 text-sm text-gray-600">
                            <div className="flex justify-between">
                              <span>Bulan Depresiasi:</span>
                              <span className="font-medium">{depreciatedMonths}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Sisa Bulan Depresiasi:</span>
                              <span className={`font-medium ${remainingMonths > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                {remainingMonths} months
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Status:</span>
                              {remainingMonths <= 0 ? (
                                <span className="font-medium text-green-600">
                                  Asset sudah selesai di depresiasi
                                </span>
                              ) : (
                                <span className={`font-medium ${isUpToDate ? 'text-blue-600' : 'text-orange-600'}`}>
                                  {isUpToDate ? 'Tepat Waktu' : 'Asset Masih Proses Depresiasi'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm bg-gray-50 p-4 rounded-lg">
                        <div className="text-gray-600">
                          <div><strong>Next Depreciation:</strong> {formatDate(nextDepreciationDate)}</div>
                          <div className="mt-1"><strong>Remaining Months:</strong> {remainingMonths}</div>
                          <div className="mt-1"><strong>Total Depreciated:</strong> {depreciatedMonths} months</div>
                        </div>
                        
                        {canGenerateDepreciation ? (
                          <button
                            onClick={handleGenerateDepreciation}
                            disabled={generatingDepreciation}
                            className="flex items-center bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px] justify-center"
                          >
                            {generatingDepreciation ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Generating...
                              </>
                            ) : (
                              <>
                                <DepreciationIcon />
                                <span className="ml-2">Generate Depreciation</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <div className={`px-3 py-2 rounded-lg border ${
                            remainingMonths <= 0
                              ? 'text-green-600 bg-green-50 border-green-200'
                              : 'text-orange-600 bg-orange-50 border-orange-200'
                          }`}>
                            {remainingMonths <= 0 ? (
                              <>
                                <span className="font-medium">Depreciation Complete</span>
                                <p className="text-sm mt-1">All {asset.useful_life} months have been depreciated</p>
                              </>
                            ) : pendingMonths <= 0 ? (
                              <>
                                <span className="font-medium">Belum Waktunya Depresiasi</span>
                                <p className="text-sm mt-1">Depresiasi berikutnya: {formatDate(nextDepreciationDate)}</p>
                              </>
                            ) : (
                              <>
                                <span className="font-medium">Cannot Generate</span>
                                <p className="text-sm mt-1">Current value is 0 or asset is fully depreciated</p>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                      <p className="text-lg">No depreciation data available</p>
                      <p className="text-sm mt-2">Generate initial depreciation to start tracking</p>
                      <button
                        onClick={handleGenerateDepreciation}
                        disabled={generatingDepreciation}
                        className="mt-4 bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {generatingDepreciation ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Generating Initial Depreciation...
                          </>
                        ) : (
                          'Generate Initial Depreciation'
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Action Buttons Bar */}
                <div className="mt-8 pt-6 border-t border-gray-200 flex flex-wrap gap-3 justify-center md:justify-start">
                    <button 
                        onClick={() => setMoveModalOpen(true)}
                        className="flex items-center justify-center text-sm font-medium bg-green-50 text-green-700 px-4 py-2 rounded-lg shadow-sm hover:bg-green-100 border border-green-200 transition-colors"
                    >
                        <MoveIcon />
                        <span className="ml-2">{t('asset_detail.move_asset')}</span>
                    </button>
                    <button
                        onClick={() => setMaintModalOpen(true)}
                        className="flex items-center justify-center text-sm font-medium bg-yellow-50 text-yellow-700 px-4 py-2 rounded-lg shadow-sm hover:bg-yellow-100 border border-yellow-200 transition-colors"
                    >
                        <MaintenanceIcon />
                        <span className="ml-2">Perbaikan dan Pemeliharaan</span>
                    </button>
                    <button 
                        onClick={() => setReportModalOpen(true)}
                        className="flex items-center justify-center text-sm font-medium bg-red-50 text-red-700 px-4 py-2 rounded-lg shadow-sm hover:bg-red-100 border border-red-200 transition-colors"
                    >
                        <DamageIcon />
                        <span className="ml-2">{t('asset_detail.report_issue')}</span>
                    </button>
                    <button 
                        onClick={handleDownloadQR}
                        className="flex items-center justify-center text-sm font-medium bg-primary text-white px-4 py-2 rounded-lg shadow-sm hover:bg-primary-dark transition-colors"
                    >
                        <DownloadIcon />
                        <span className="ml-2">{t('asset_detail.download_qr')}</span>
                    </button>
                </div>
            </div>
        </div>
      </div>
      
      {/* Tabs Content */}
      <div className="bg-white rounded-xl shadow-md">
        <div className="border-b border-gray-200">
            <nav className="flex -mb-px space-x-4 px-4 overflow-x-auto">
                <TabButton tabName="history" label={t('asset_detail.tabs.history')} icon={<HistoryIcon />} />
                <TabButton tabName="maintenance" label={t('asset_detail.tabs.maintenance')} icon={<MaintenanceIcon />} />
                <TabButton tabName="damage_loss" label={t('asset_detail.tabs.damage_loss')} icon={<DamageIcon />} />
                <TabButton tabName="depreciation" label="Depreciation" icon={<DepreciationIcon />} />
            </nav>
        </div>
        
        <div className="p-6">
            {activeTab === 'history' && (
                <div>
                    <h3 className="text-xl font-semibold mb-4 text-gray-900">Riwayat</h3>

                    {/* Riwayat Peminjaman */}
                    <div className="mb-6">
                        <h4 className="text-lg font-semibold mb-3 text-gray-800">Riwayat Peminjaman</h4>
                        {loanHistory.length === 0 ? (
                            <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                                <p>Belum ada riwayat peminjaman</p>
                            </div>
                        ) : (
                            <ul className="space-y-3">
                                {loanHistory.map(loan => (
                                    <li key={loan.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex-1">
                                                <div className="flex items-center mb-2">
                                                    <span className="font-medium text-gray-900">Peminjam:</span>
                                                    <span className="ml-2 text-gray-700">{loan.borrower?.name || 'N/A'}</span>
                                                </div>
                                                <div className="flex items-center mb-2">
                                                    <span className="font-medium text-gray-900">Status:</span>
                                                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                        loan.status === 'RETURNED' ? 'bg-green-100 text-green-800' :
                                                        loan.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                                                        loan.status === 'PENDING_RETURN' ? 'bg-yellow-100 text-yellow-800' :
                                                        loan.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                        loan.status === 'LOST' ? 'bg-gray-100 text-gray-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {loan.status === 'RETURNED' ? 'Dikembalikan' :
                                                         loan.status === 'APPROVED' ? 'Dipinjam' :
                                                         loan.status === 'PENDING_RETURN' ? 'Menunggu Validasi Pengembalian' :
                                                         loan.status === 'REJECTED' ? 'Ditolak' :
                                                         loan.status === 'LOST' ? 'Hilang' :
                                                         loan.status === 'PENDING' ? 'Menunggu Persetujuan' : loan.status}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    <div><strong>Tanggal Peminjaman:</strong> {formatDate(loan.loan_date || loan.request_date)}</div>
                                                    {loan.actual_return_date && (
                                                        <div><strong>Tanggal Pengembalian:</strong> {formatDate(loan.actual_return_date)}</div>
                                                    )}
                                                    {loan.return_condition && (
                                                        <div><strong>Kondisi Pengembalian:</strong> {
                                                            loan.return_condition === 'good' ? 'Baik' :
                                                            loan.return_condition === 'damaged' ? 'Rusak' :
                                                            loan.return_condition === 'lost' ? 'Hilang' : loan.return_condition
                                                        }</div>
                                                    )}
                                                    <div><strong>Tujuan:</strong> {loan.purpose}</div>
                                                </div>
                                            </div>
                                            <div className="text-sm text-gray-500 whitespace-nowrap">
                                                {formatDateTime(loan.created_at)}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Riwayat Perpindahan Unit */}
                    <div>
                        <h4 className="text-lg font-semibold mb-3 text-gray-800">Riwayat Perpindahan Unit</h4>
                        {history.length === 0 ? (
                            <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                                <p>Belum ada riwayat perpindahan unit</p>
                            </div>
                        ) : (
                            <ul className="space-y-3">
                                {history.map(movement => (
                                    <li key={movement.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center mb-2">
                                                    <span className="font-medium text-gray-900">Unit:</span>
                                                    <span className="ml-2 text-gray-700">{movement.location}</span>
                                                </div>
                                                {movement.moved_by && (
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <span className="font-medium">Dipindahkan oleh:</span>
                                                        <span className="ml-2">{movement.moved_by.name}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-sm text-gray-500 whitespace-nowrap">
                                                {formatDateTime(movement.moved_at)}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
            
            {activeTab === 'maintenance' && (
                <div>
                    <h3 className="text-xl font-semibold mb-4 text-gray-900">Riwayat Perbaikan dan Pemeliharaan</h3>
                    {maintenance.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                            <p>Belum ada riwayat perbaikan dan pemeliharaan</p>
                        </div>
                    ) : (
                        <ul className="space-y-4">
                            {maintenance.map(maint => (
                                <li key={maint.id} className={`p-4 rounded-lg border hover:shadow-md transition-all ${
                                    maint.type === 'Perbaikan' ? 'bg-red-50 border-red-200 hover:bg-red-100' : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
                                }`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                                                maint.type === 'Perbaikan' ? 'bg-red-600 text-white' : 'bg-yellow-600 text-white'
                                            }`}>
                                                {maint.type}
                                            </span>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                maint.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                                maint.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                                maint.status === 'SCHEDULED' ? 'bg-purple-100 text-purple-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                                {maint.status}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {formatDate(maint.date)}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                                        {maint.unit && (
                                            <div>
                                                <span className="text-xs font-medium text-gray-500">Unit:</span>
                                                <p className="text-sm text-gray-900">{maint.unit.name}</p>
                                            </div>
                                        )}
                                        <div>
                                            <span className="text-xs font-medium text-gray-500">Pihak yang menangani:</span>
                                            <p className="text-sm text-gray-900">{maint.party_type}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs font-medium text-gray-500">Nama Instansi:</span>
                                            <p className="text-sm text-gray-900">{maint.instansi}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs font-medium text-gray-500">No Telepon:</span>
                                            <p className="text-sm text-gray-900">{maint.phone_number}</p>
                                        </div>
                                    </div>

                                    {maint.description && (
                                        <div className="mt-3 pt-3 border-t border-gray-200">
                                            <span className="text-xs font-medium text-gray-500">Deskripsi:</span>
                                            <p className="mt-1 text-sm text-gray-700">{maint.description}</p>
                                        </div>
                                    )}

                                    {maint.photo_proof && (
                                        <div className="mt-3 pt-3 border-t border-gray-200">
                                            <span className="text-xs font-medium text-gray-500">Foto Bukti:</span>
                                            <div className="mt-2">
                                                <img
                                                    src={`https://assetmanagementga.arjunaconnect.com/storage/${maint.photo_proof}`}
                                                    alt="Bukti Perbaikan/Pemeliharaan"
                                                    className="max-w-xs rounded-lg border border-gray-300 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                                                    onClick={() => window.open(`https://assetmanagementga.arjunaconnect.com/storage/${maint.photo_proof}`, '_blank')}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Validation Status and Detail Button */}
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <span className="text-xs font-medium text-gray-500">Status Validasi:</span>
                                                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    maint.validation_status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                                    maint.validation_status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {maint.validation_status === 'PENDING' ? 'Menunggu Validasi' :
                                                     maint.validation_status === 'APPROVED' ? 'Disetujui' :
                                                     maint.validation_status === 'REJECTED' ? 'Ditolak' : maint.validation_status}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => handleViewMaintenanceDetail(maint)}
                                                className="flex items-center text-sm font-medium text-primary hover:text-primary-dark transition-colors"
                                            >
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                Lihat Detail / Validasi
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
            
            {activeTab === 'damage_loss' && (
                <div>
                    <h3 className="text-xl font-semibold mb-4 text-gray-900">{t('asset_detail.damage_loss.damage_title')}</h3>
                    {damageReports.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg mb-6">
                            <p>No damage reports found</p>
                        </div>
                    ) : (
                        <ul className="space-y-3 mb-6">
                            {damageReports.map(report => (
                                <li key={report.id} className="p-4 bg-red-50 rounded-lg border border-red-200 hover:bg-red-100 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <span className="font-medium text-gray-900">Status:</span>
                                            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                report.status === 'Resolved' ? 'bg-green-100 text-green-800' :
                                                report.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {report.status}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {formatDate(report.date)}
                                        </div>
                                    </div>
                                    <div className="mt-2">
                                        <span className="font-medium text-gray-900">Description:</span>
                                        <p className="mt-1 text-gray-700">{report.description}</p>
                                    </div>
                                    {report.reporter && (
                                        <div className="mt-2 text-sm text-gray-600">
                                            <span className="font-medium">Reported by:</span>
                                            <span className="ml-2">{report.reporter.name}</span>
                                        </div>
                                    )}
                                    {/* Button Detail / Validasi Laporan */}
                                    <div className="mt-3 pt-3 border-t border-red-200">
                                        <button
                                            onClick={() => handleViewDamageReportDetail(report)}
                                            className="flex items-center text-sm font-medium text-red-700 hover:text-red-900 transition-colors"
                                        >
                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                            Lihat Detail / Validasi
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    
                    <h3 className="text-xl font-semibold mb-4 text-gray-900">{t('asset_detail.damage_loss.loss_title')}</h3>
                    {lossReports.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                            <p>No loss reports found</p>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {lossReports.map(report => (
                                <li key={report.id} className="p-4 bg-orange-50 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <span className="font-medium text-gray-900">Status:</span>
                                            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                report.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                                                report.status === 'UNDER_REVIEW' ? 'bg-blue-100 text-blue-800' :
                                                report.status === 'CLOSED' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {report.status === 'PENDING' ? 'Menunggu Validasi' :
                                                 report.status === 'UNDER_REVIEW' ? 'Sedang Ditinjau' :
                                                 report.status === 'RESOLVED' ? 'Disetujui' :
                                                 report.status === 'CLOSED' ? 'Ditolak' : report.status}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {formatDate(report.date)}
                                        </div>
                                    </div>
                                    <div className="mt-2">
                                        <span className="font-medium text-gray-900">Description:</span>
                                        <p className="mt-1 text-gray-700">{report.description}</p>
                                    </div>
                                    {report.reporter && (
                                        <div className="mt-2 text-sm text-gray-600">
                                            <span className="font-medium">Reported by:</span>
                                            <span className="ml-2">{report.reporter.name}</span>
                                        </div>
                                    )}
                                    {/* Button Detail Laporan */}
                                    <div className="mt-3 pt-3 border-t border-orange-200">
                                        <button
                                            onClick={() => handleViewLossReportDetail(report)}
                                            className="flex items-center text-sm font-medium text-orange-700 hover:text-orange-900 transition-colors"
                                        >
                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                            Detail Laporan
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {activeTab === 'depreciation' && (
                <div>
                    <h3 className="text-xl font-semibold mb-4 text-gray-900">Depreciation History</h3>
                    {loadingDepreciation ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                            <p className="mt-2 text-gray-600">Loading depreciation history...</p>
                        </div>
                    ) : depreciationHistory.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Depreciation Amount</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accumulated</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Book Value</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {depreciationHistory.map((record: any) => (
                                        <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">Month {record.month_sequence}</td>
                                            <td className="px-4 py-3 text-sm text-gray-500">{formatDate(record.depreciation_date)}</td>
                                            <td className="px-4 py-3 text-sm text-red-600 font-medium">{formatToRupiah(record.depreciation_amount)}</td>
                                            <td className="px-4 py-3 text-sm text-orange-600 font-medium">{formatToRupiah(record.accumulated_depreciation)}</td>
                                            <td className="px-4 py-3 text-sm text-green-600 font-medium">{formatToRupiah(record.current_value)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                            <p className="text-lg">No depreciation history found</p>
                            <p className="text-sm mt-2">Generate depreciation to see the history</p>
                            <button
                                onClick={handleGenerateDepreciation}
                                disabled={generatingDepreciation}
                                className="mt-4 bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {generatingDepreciation ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Generating Depreciation...
                                    </>
                                ) : (
                                    'Generate Depreciation'
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
      
      {/* Modals */}
      <Modal isOpen={isMoveModalOpen} onClose={() => setMoveModalOpen(false)}>
        <MoveAssetForm
            asset={asset}
            onClose={() => setMoveModalOpen(false)}
            onSuccess={() => {
                setMoveModalOpen(false);
                fetchData();
            }}
        />
      </Modal>
      
      <Modal isOpen={isReportModalOpen} onClose={() => setReportModalOpen(false)}>
        <ReportIssueForm
            asset={asset}
            onClose={() => setReportModalOpen(false)}
            onSuccess={() => {
                setReportModalOpen(false);
                fetchData();
            }}
        />
      </Modal>
      
      <Modal isOpen={isMaintModalOpen} onClose={() => setMaintModalOpen(false)}>
        <AddMaintenanceForm
            asset={asset}
            onClose={() => setMaintModalOpen(false)}
            onSuccess={() => {
                setMaintModalOpen(false);
                fetchData();
            }}
        />
      </Modal>

      {/* Modal for Loss Report Detail */}
      {isLossDetailModalOpen && selectedLossReport && currentUser && (
        <Modal isOpen={isLossDetailModalOpen} onClose={handleCloseLossDetailModal}>
          <LossReportDetailModal
            report={selectedLossReport}
            currentUser={currentUser}
            onClose={handleCloseLossDetailModal}
            onSuccess={handleLossReportSuccess}
          />
        </Modal>
      )}

      {/* Modal for Maintenance Validation */}
      {isMaintenanceDetailModalOpen && selectedMaintenance && currentUser && (
        <Modal isOpen={isMaintenanceDetailModalOpen} onClose={handleCloseMaintenanceDetailModal}>
          <MaintenanceValidationModal
            maintenance={selectedMaintenance}
            currentUser={currentUser}
            onClose={handleCloseMaintenanceDetailModal}
            onSuccess={handleMaintenanceSuccess}
          />
        </Modal>
      )}

      {/* Modal for Damage Report Validation */}
      {isDamageReportDetailModalOpen && selectedDamageReport && currentUser && (
        <Modal isOpen={isDamageReportDetailModalOpen} onClose={handleCloseDamageReportDetailModal}>
          <DamageReportValidationModal
            report={selectedDamageReport}
            currentUser={currentUser}
            onClose={handleCloseDamageReportDetailModal}
            onSuccess={handleDamageReportSuccess}
          />
        </Modal>
      )}
    </div>
  );
};

export default AssetDetail;