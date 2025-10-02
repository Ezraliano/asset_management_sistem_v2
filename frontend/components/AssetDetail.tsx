// AssetDetail.tsx - PERBAIKAN LENGKAP
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getAssetById, getAssetHistory, getMaintenanceHistory, getDamageReports, getLossReports } from '../services/api';
import { Asset, AssetMovement, Maintenance, DamageReport, LossReport, View } from '../types';
import { QRCodeCanvas } from 'qrcode.react';
import { BackIcon, HistoryIcon, MaintenanceIcon, DamageIcon, MoveIcon, DownloadIcon, DepreciationIcon } from './icons';
import { formatToRupiah } from '../utils/formatters';
import Modal from './Modal';
import MoveAssetForm from './MoveAssetForm';
import ReportIssueForm from './ReportIssueForm';
import AddMaintenanceForm from './AddMaintenanceForm';
import { useTranslation } from '../hooks/useTranslation';
import { calculateDepreciation } from '../utils/depreciation';

interface AssetDetailProps {
  assetId: string;
  navigateTo: (view: View) => void;
}

type Tab = 'history' | 'maintenance' | 'damage_loss';

const AssetDetail: React.FC<AssetDetailProps> = ({ assetId, navigateTo }) => {
  const { t } = useTranslation();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [history, setHistory] = useState<AssetMovement[]>([]);
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
  const [damageReports, setDamageReports] = useState<DamageReport[]>([]);
  const [lossReports, setLossReports] = useState<LossReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('history');
  const [isMoveModalOpen, setMoveModalOpen] = useState(false);
  const [isReportModalOpen, setReportModalOpen] = useState(false);
  const [isMaintModalOpen, setMaintModalOpen] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [assetData, historyData, maintenanceData, damageData, lossData] = await Promise.all([
        getAssetById(assetId),
        getAssetHistory(assetId),
        getMaintenanceHistory(assetId),
        getDamageReports(assetId),
        getLossReports(assetId)
      ]);
      
      if (!assetData) {
        setError('Asset not found');
        return;
      }
      
      setAsset(assetData);
      setHistory(historyData);
      setMaintenance(maintenanceData);
      setDamageReports(damageData);
      setLossReports(lossData);
    } catch (err) {
      console.error('Error fetching asset details:', err);
      setError('Failed to load asset details');
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const depreciation = useMemo(() => (asset ? calculateDepreciation(asset) : null), [asset]);

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
        
        // PERBAIKAN: Gunakan asset_tag bukan id
        ctx.fillText(asset.asset_tag, textX, textY);
        
        // Trigger download
        const pngUrl = canvas
            .toDataURL("image/png")
            .replace("image/png", "image/octet-stream");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `${asset.asset_tag}_qr_code.png`; // PERBAIKAN: gunakan asset_tag
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <span className="ml-4">Loading asset details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 text-lg">{error}</p>
        <button 
          onClick={() => navigateTo({ type: 'ASSET_LIST' })}
          className="mt-4 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
        >
          Back to Asset List
        </button>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="text-center py-8">
        <p>Asset not found</p>
        <button 
          onClick={() => navigateTo({ type: 'ASSET_LIST' })}
          className="mt-4 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
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
              : 'text-gray-500 hover:text-primary'
          }`}
      >
          {icon}
          <span className="ml-2">{label}</span>
      </button>
  );

  return (
    <div className="space-y-6">
      <button 
        onClick={() => navigateTo({ type: 'ASSET_LIST' })} 
        className="flex items-center text-primary hover:underline"
      >
        <BackIcon />
        <span className="ml-2">{t('asset_detail.back_to_list')}</span>
      </button>
      
      <div className="bg-white p-6 rounded-xl shadow-md">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="flex-shrink-0 text-center">
                {/* PERBAIKAN: Gunakan asset_tag untuk QR code value */}
                <QRCodeCanvas 
                  id="qr-code-canvas" 
                  value={asset.asset_tag} 
                  size={160} 
                />
            </div>
            
            <div className="flex-grow flex flex-col w-full">
                 <div>
                    <h1 className="text-3xl font-bold text-center md:text-left">{asset.name}</h1>
                    {/* PERBAIKAN: Tampilkan asset_tag bukan id */}
                    <p className="text-lg text-gray-500 text-center md:text-left">{asset.asset_tag}</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div><strong>{t('asset_detail.labels.category')}:</strong> {asset.category}</div>
                    <div><strong>{t('asset_detail.labels.location')}:</strong> {asset.location}</div>
                    <div><strong>{t('asset_detail.labels.status')}:</strong> {asset.status}</div>
                    {/* PERBAIKAN: Gunakan purchase_date dan useful_life */}
                    <div><strong>{t('asset_detail.labels.purchase_date')}:</strong> {new Date(asset.purchase_date).toLocaleDateString()}</div>
                    <div><strong>{t('asset_detail.labels.value')}:</strong> {formatToRupiah(asset.value)}</div>
                    <div><strong>{t('asset_detail.labels.useful_life')}:</strong> {asset.useful_life} months</div>
                </div>

                {/* Depreciation Details Section */}
                {depreciation && (
                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <h3 className="text-lg font-semibold text-dark-text mb-2 flex items-center">
                            <DepreciationIcon />
                            <span className="ml-2">{t('asset_detail.labels.depreciation_details')}</span>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div>
                                <span className="font-semibold text-gray-600 block">{t('asset_detail.labels.monthly_depreciation')}</span>
                                <span className="text-gray-800">{formatToRupiah(depreciation.monthlyDepreciation)}</span>
                            </div>
                            <div>
                                <span className="font-semibold text-gray-600 block">{t('asset_detail.labels.accumulated_depreciation')}</span>
                                <span className="text-gray-800">{formatToRupiah(depreciation.accumulatedDepreciation)}</span>
                            </div>
                            <div>
                                <span className="font-semibold text-gray-600 block">{t('asset_detail.labels.current_value')}</span>
                                <span className="font-bold text-green-700">{formatToRupiah(depreciation.currentValue)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons Bar */}
                <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap gap-3 justify-center md:justify-start">
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
                        <span className="ml-2">{t('asset_detail.add_maintenance')}</span>
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
            </nav>
        </div>
        
        <div className="p-6">
            {activeTab === 'history' && (
                <div>
                    <h3 className="text-xl font-semibold mb-4">{t('asset_detail.history.title')}</h3>
                    {history.length === 0 ? (
                        <p className="text-gray-500">No movement history found</p>
                    ) : (
                        <ul className="space-y-3">
                            {history.map(movement => (
                                <li key={movement.id} className="p-3 bg-gray-50 rounded-md border">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <strong>Location:</strong> {movement.location}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {new Date(movement.moved_at).toLocaleString()}
                                        </div>
                                    </div>
                                    {movement.moved_by && (
                                        <div className="mt-1 text-sm text-gray-600">
                                            <strong>Moved by:</strong> {movement.moved_by.name}
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
            
            {activeTab === 'maintenance' && (
                <div>
                    <h3 className="text-xl font-semibold mb-4">{t('asset_detail.maintenance.title')}</h3>
                    {maintenance.length === 0 ? (
                        <p className="text-gray-500">No maintenance records found</p>
                    ) : (
                        <ul className="space-y-3">
                            {maintenance.map(maint => (
                                <li key={maint.id} className="p-3 bg-gray-50 rounded-md border">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <strong>Status:</strong> {maint.status}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {new Date(maint.date).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="mt-1">
                                        <strong>Description:</strong> {maint.description}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
            
            {activeTab === 'damage_loss' && (
                <div>
                    <h3 className="text-xl font-semibold mb-4">{t('asset_detail.damage_loss.damage_title')}</h3>
                    {damageReports.length === 0 ? (
                        <p className="text-gray-500 mb-6">No damage reports found</p>
                    ) : (
                        <ul className="space-y-3 mb-6">
                            {damageReports.map(report => (
                                <li key={report.id} className="p-3 bg-red-50 rounded-md border border-red-200">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <strong>Status:</strong> {report.status}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {new Date(report.date).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="mt-1">
                                        <strong>Description:</strong> {report.description}
                                    </div>
                                    {report.reporter && (
                                        <div className="mt-1 text-sm text-gray-600">
                                            <strong>Reported by:</strong> {report.reporter.name}
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                    
                    <h3 className="text-xl font-semibold mb-4">{t('asset_detail.damage_loss.loss_title')}</h3>
                    {lossReports.length === 0 ? (
                        <p className="text-gray-500">No loss reports found</p>
                    ) : (
                        <ul className="space-y-3">
                            {lossReports.map(report => (
                                <li key={report.id} className="p-3 bg-red-50 rounded-md border border-red-200">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <strong>Status:</strong> {report.status}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {new Date(report.date).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="mt-1">
                                        <strong>Description:</strong> {report.description}
                                    </div>
                                    {report.reporter && (
                                        <div className="mt-1 text-sm text-gray-600">
                                            <strong>Reported by:</strong> {report.reporter.name}
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
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
    </div>
  );
};

export default AssetDetail;