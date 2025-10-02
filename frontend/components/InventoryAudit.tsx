
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Asset } from '../types';
import { getAssets, getAssetById } from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { BackIcon, DamageIcon } from './icons';
import Modal from './Modal';
import ReportIssueForm from './ReportIssueForm';

declare const Html5Qrcode: any;

interface InventoryAuditProps {
  location: string;
  mode: 'camera' | 'manual';
  navigateTo: (view: View) => void;
}

type Tab = 'missing' | 'found' | 'misplaced';

const InventoryAudit: React.FC<InventoryAuditProps> = ({ location, mode, navigateTo }) => {
  const { t } = useTranslation();
  const [expectedAssets, setExpectedAssets] = useState<Asset[]>([]);
  const [foundAssetIds, setFoundAssetIds] = useState<Set<string>>(new Set());
  const [misplacedAssets, setMisplacedAssets] = useState<Asset[]>([]);
  const [manualInput, setManualInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [scanResult, setScanResult] = useState<{ type: 'success' | 'info' | 'error', message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('missing');
  const [reportingAsset, setReportingAsset] = useState<Asset | null>(null);

  useEffect(() => {
    const fetchExpectedAssets = async () => {
      setLoading(true);
      const assetsInLocation = await getAssets({ location });
      setExpectedAssets(assetsInLocation);
      setLoading(false);
    };
    fetchExpectedAssets();
  }, [location]);

  const processScannedId = useCallback(async (scannedId: string) => {
    setScanResult(null);
    if (!scannedId) return;

    // Check if it's an expected asset
    const isExpected = expectedAssets.some(a => a.id === scannedId);
    if (isExpected) {
      setFoundAssetIds(prev => new Set(prev).add(scannedId));
      setScanResult({ type: 'success', message: t('inventory_audit.asset_found_msg', { id: scannedId }) });
      return;
    }
    
    // Check if it's a misplaced asset
    const asset = await getAssetById(scannedId);
    if (asset) {
      if (!misplacedAssets.some(a => a.id === asset.id) && !foundAssetIds.has(asset.id)) {
        setMisplacedAssets(prev => [...prev, asset]);
      }
      setScanResult({ type: 'info', message: t('inventory_audit.asset_misplaced_msg', { id: asset.id, location: asset.location }) });
    } else {
      setScanResult({ type: 'error', message: t('inventory_audit.asset_unknown_msg', { id: scannedId }) });
    }
  }, [expectedAssets, misplacedAssets, t, foundAssetIds]);
  
  const handleManualSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      processScannedId(manualInput.trim());
      setManualInput('');
  };

  useEffect(() => {
    if (mode !== 'camera' || loading) return;

    const qrScanner = new Html5Qrcode("audit-qr-reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    const successCallback = (decodedText: string) => {
        qrScanner.stop().then(() => {
            processScannedId(decodedText.trim());
        }).catch(err => console.error("Error stopping scanner after success:", err));
    };

    qrScanner.start({ facingMode: "environment" }, config, successCallback, undefined)
      .catch((err: any) => {
        console.error("QR Scanner Error:", err);
        setScanResult({ type: 'error', message: t('inventory_audit.camera_error') });
      });
      
    return () => {
      // Check if scanner is still active before trying to stop
      if (qrScanner && qrScanner.getState() === 2) { // 2 is SCANNING state
        qrScanner.stop().catch(err => console.error("Failed to stop QR scanner on cleanup", err));
      }
    };
  }, [mode, loading, processScannedId, t]);

  const missingAssets = useMemo(() => expectedAssets.filter(a => !foundAssetIds.has(a.id)), [expectedAssets, foundAssetIds]);
  const foundAssets = useMemo(() => expectedAssets.filter(a => foundAssetIds.has(a.id)), [expectedAssets, foundAssetIds]);
  
  const scanResultColor = {
      success: 'bg-green-100 text-green-800',
      info: 'bg-blue-100 text-blue-800',
      error: 'bg-red-100 text-red-800'
  }[scanResult?.type || 'success'];

  if (loading) return <p>Loading audit session...</p>;
  
  const TabButton:React.FC<{tabName: Tab, label: string, count: number}> = ({tabName, label, count}) => (
      <button 
          onClick={() => setActiveTab(tabName)}
          className={`flex-shrink-0 flex items-center px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === tabName ? 'border-b-2 border-primary text-primary bg-blue-50' : 'text-gray-500 hover:text-primary'}`}
      >
          {label} <span className="ml-2 bg-gray-200 text-gray-700 rounded-full px-2 text-xs">{count}</span>
      </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <button onClick={() => navigateTo({ type: 'INVENTORY_AUDIT_SETUP' })} className="flex items-center text-primary hover:underline mb-2">
            <BackIcon />
            <span className="ml-2">Back to Setup</span>
          </button>
          <h1 className="text-3xl font-bold text-dark-text">{t('inventory_audit.auditing_location', { location })}</h1>
        </div>
        <button onClick={() => navigateTo({type: 'DASHBOARD'})} className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary-dark transition-colors">
          {t('inventory_audit.finish_audit')}
        </button>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-md">
        {mode === 'camera' ? (
          <div>
            <div id="audit-qr-reader" className="w-full max-w-sm mx-auto border-2 border-dashed border-gray-300 rounded-lg overflow-hidden"></div>
            {scanResult && <p className={`mt-4 p-3 rounded-md text-center ${scanResultColor}`}>{scanResult.message}</p>}
            <p className="text-center text-medium-text mt-4">{t('inventory_audit.scan_prompt')}</p>
          </div>
        ) : (
          <form onSubmit={handleManualSubmit}>
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder={t('inventory_audit.manual_input_placeholder')}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-center text-lg"
              autoFocus
            />
            {scanResult && <p className={`mt-4 p-3 rounded-md text-center ${scanResultColor}`}>{scanResult.message}</p>}
          </form>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-md">
         <div className="border-b border-gray-200">
            <nav className="flex -mb-px space-x-2 px-4 overflow-x-auto">
                <TabButton tabName="missing" label={t('inventory_audit.missing')} count={missingAssets.length} />
                <TabButton tabName="found" label={t('inventory_audit.found')} count={foundAssets.length} />
                <TabButton tabName="misplaced" label={t('inventory_audit.misplaced')} count={misplacedAssets.length} />
            </nav>
        </div>
        <div className="p-4">
            {activeTab === 'missing' && (
                <ul className="divide-y divide-gray-200">
                    {missingAssets.map(asset => (
                        <li key={asset.id} className="py-3 flex justify-between items-center">
                            <div>
                                <p className="font-medium">{asset.name}</p>
                                <p className="text-sm text-gray-500">{asset.id}</p>
                            </div>
                            <button onClick={() => setReportingAsset(asset)} className="flex items-center text-sm text-red-600 hover:text-red-800">
                                <DamageIcon />
                                <span className="ml-1">{t('inventory_audit.report_loss')}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
             {activeTab === 'found' && (
                <ul className="divide-y divide-gray-200">
                    {foundAssets.map(asset => (
                        <li key={asset.id} className="py-3">
                            <p className="font-medium">{asset.name}</p>
                            <p className="text-sm text-gray-500">{asset.id}</p>
                        </li>
                    ))}
                </ul>
            )}
             {activeTab === 'misplaced' && (
                <ul className="divide-y divide-gray-200">
                    {misplacedAssets.map(asset => (
                        <li key={asset.id} className="py-3">
                            <p className="font-medium">{asset.name}</p>
                            <p className="text-sm text-gray-500">{asset.id}</p>
                            <p className="text-sm text-yellow-600">{t('inventory_audit.should_be_at', { location: asset.location })}</p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
      </div>
      <Modal isOpen={!!reportingAsset} onClose={() => setReportingAsset(null)}>
        {reportingAsset && <ReportIssueForm 
            asset={reportingAsset} 
            onClose={() => setReportingAsset(null)}
            onSuccess={() => {
                alert('Report submitted.');
                setReportingAsset(null);
            }}
        />}
      </Modal>
    </div>
  );
};

export default InventoryAudit;