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

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [assetData, historyData, maintenanceData, damageData, lossData] = await Promise.all([
      getAssetById(assetId),
      getAssetHistory(assetId),
      getMaintenanceHistory(assetId),
      getDamageReports(assetId),
      getLossReports(assetId)
    ]);
    setAsset(assetData || null);
    setHistory(historyData);
    setMaintenance(maintenanceData);
    setDamageReports(damageData);
    setLossReports(lossData);
    setLoading(false);
  }, [assetId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const depreciation = useMemo(() => (asset ? calculateDepreciation(asset) : null), [asset]);

  const handleDownloadQR = () => {
    const sourceCanvas = document.getElementById('qr-code-canvas') as HTMLCanvasElement;
    if (sourceCanvas && asset) {
        // 1. Create a new canvas to be our download image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 2. Define dimensions and styling
        const qrSize = 320; // Increase size for clarity
        const padding = 20;
        const fontSize = 18;
        const textHeight = 40; // Space for the text below QR
        const font = `${fontSize}px Arial`;

        canvas.width = qrSize + padding * 2;
        canvas.height = qrSize + padding * 2 + textHeight;

        // 3. Draw the background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 4. Draw the QR code from the source canvas, scaled up
        // Disabling image smoothing for a sharper, pixelated QR code look
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sourceCanvas, padding, padding, qrSize, qrSize);

        // 5. Draw the Asset ID text below the QR code
        ctx.fillStyle = '#1F2937'; // dark-text color
        ctx.font = font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const textX = canvas.width / 2;
        const textY = padding + qrSize + (textHeight / 2);
        
        ctx.fillText(asset.id, textX, textY);
        
        // 6. Trigger download
        const pngUrl = canvas
            .toDataURL("image/png")
            .replace("image/png", "image/octet-stream");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `${asset.id}_qr_code.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }
  };


  if (loading) return <p>{t('asset_detail.loading')}</p>;
  if (!asset) return <p>{t('asset_detail.not_found')}</p>;

  const TabButton:React.FC<{tabName: Tab, label: string, icon: React.ReactNode}> = ({tabName, label, icon}) => (
      <button 
          onClick={() => setActiveTab(tabName)}
          className={`flex-shrink-0 flex items-center px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === tabName ? 'border-b-2 border-primary text-primary bg-blue-50' : 'text-gray-500 hover:text-primary'}`}
      >
          {icon}
          <span className="ml-2">{label}</span>
      </button>
  );

  return (
    <div className="space-y-6">
      <button onClick={() => navigateTo({ type: 'ASSET_LIST' })} className="flex items-center text-primary hover:underline">
        <BackIcon />
        <span className="ml-2">{t('asset_detail.back_to_list')}</span>
      </button>
      <div className="bg-white p-6 rounded-xl shadow-md">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="flex-shrink-0 text-center">
                <QRCodeCanvas id="qr-code-canvas" value={asset.qrCodeUrl} size={160} />
            </div>
            <div className="flex-grow flex flex-col w-full">
                 <div>
                    <h1 className="text-3xl font-bold text-center md:text-left">{asset.name}</h1>
                    <p className="text-lg text-gray-500 text-center md:text-left">{asset.id}</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div><strong>{t('asset_detail.labels.category')}:</strong> {asset.category}</div>
                    <div><strong>{t('asset_detail.labels.location')}:</strong> {asset.location}</div>
                    <div><strong>{t('asset_detail.labels.status')}:</strong> {asset.status}</div>
                    <div><strong>{t('asset_detail.labels.purchase_date')}:</strong> {new Date(asset.purchaseDate).toLocaleDateString()}</div>
                    <div><strong>{t('asset_detail.labels.value')}:</strong> {formatToRupiah(asset.value)}</div>
                    <div><strong>{t('asset_detail.labels.useful_life')}:</strong> {t('asset_detail.labels.useful_life_months', { months: asset.usefulLife })}</div>
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
                    <ul className="space-y-2">
                        {history.map(h => <li key={h.id} className="p-2 bg-gray-50 rounded-md">{t('asset_detail.history.entry', { location: h.location, movedBy: h.movedBy, date: new Date(h.movedAt).toLocaleString() })}</li>)}
                    </ul>
                </div>
            )}
            {activeTab === 'maintenance' && (
                 <div>
                    <h3 className="text-xl font-semibold mb-4">{t('asset_detail.maintenance.title')}</h3>
                    <ul className="space-y-2">
                        {maintenance.map(m => <li key={m.id} className="p-2 bg-gray-50 rounded-md">{t('asset_detail.maintenance.entry', { status: m.status, description: m.description, date: new Date(m.date).toLocaleDateString() })}</li>)}
                    </ul>
                </div>
            )}
             {activeTab === 'damage_loss' && (
                 <div>
                    <h3 className="text-xl font-semibold mb-2">{t('asset_detail.damage_loss.damage_title')}</h3>
                    <ul className="space-y-2 mb-4">{damageReports.map(d => <li key={d.id} className="p-2 bg-red-50 rounded-md">{t('asset_detail.damage_loss.entry', { status: d.status, description: d.description, date: new Date(d.date).toLocaleDateString() })}</li>)}</ul>
                    <h3 className="text-xl font-semibold mb-2">{t('asset_detail.damage_loss.loss_title')}</h3>
                    <ul className="space-y-2">{lossReports.map(l => <li key={l.id} className="p-2 bg-red-50 rounded-md">{t('asset_detail.damage_loss.entry', { status: l.status, description: l.description, date: new Date(l.date).toLocaleDateString() })}</li>)}</ul>
                </div>
            )}
        </div>
      </div>
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