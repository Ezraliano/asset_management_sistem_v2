
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Asset } from '../types';
import { getInventoryAuditById, scanAssetInAudit, completeInventoryAudit } from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { BackIcon, DamageIcon } from './icons';
import Modal from './Modal';
import ReportIssueForm from './ReportIssueForm';

declare const Html5Qrcode: any;

interface InventoryAuditProps {
  unitId: number;
  unitName: string;
  auditId: number;
  mode: 'camera' | 'manual';
  navigateTo: (view: View) => void;
}

type Tab = 'missing' | 'found' | 'misplaced';

const InventoryAudit: React.FC<InventoryAuditProps> = ({ unitName, auditId, mode, navigateTo }) => {
  const { t } = useTranslation();
  const [expectedAssets, setExpectedAssets] = useState<Asset[]>([]);
  const [foundAssetIds, setFoundAssetIds] = useState<Set<number>>(new Set());
  const [misplacedAssets, setMisplacedAssets] = useState<any[]>([]);
  const [manualInput, setManualInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [scanResult, setScanResult] = useState<{ type: 'success' | 'info' | 'error', message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('missing');
  const [reportingAsset, setReportingAsset] = useState<Asset | null>(null);
  const qrScannerRef = useRef<any>(null);

  useEffect(() => {
    const fetchAuditData = async () => {
      setLoading(true);
      try {
        const audit = await getInventoryAuditById(auditId);
        if (audit) {
          setExpectedAssets(audit.expected_assets || []);
          setFoundAssetIds(new Set(audit.found_asset_ids || []));
          setMisplacedAssets(audit.misplaced_assets || []);
        }
      } catch (error) {
        console.error('Failed to fetch audit data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAuditData();
  }, [auditId]);

  const processScannedId = useCallback(async (scannedId: string) => {
    setScanResult(null);
    if (!scannedId) return;

    try {
      const response = await scanAssetInAudit(auditId, scannedId);

      if (response.type === 'success') {
        // Asset found in correct unit - use the asset ID from response
        const assetId = response.asset?.id;
        if (assetId) {
          setFoundAssetIds(prev => {
            const newSet = new Set(prev);
            newSet.add(assetId);
            return newSet;
          });
        }
        setScanResult({ type: 'success', message: response.message });
      } else if (response.type === 'info') {
        // Asset is misplaced - refresh misplaced assets list
        const audit = await getInventoryAuditById(auditId);
        if (audit) {
          setMisplacedAssets(audit.misplaced_assets || []);
        }
        setScanResult({ type: 'info', message: response.message });
      }
    } catch (error: any) {
      if (error.message.includes('404')) {
        setScanResult({ type: 'error', message: `Asset ${scannedId} not found in system` });
      } else {
        setScanResult({ type: 'error', message: error.message || 'Failed to scan asset' });
      }
    }
  }, [auditId]);

  const handleManualSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      processScannedId(manualInput.trim());
      setManualInput('');
  };

  // Initialize and manage QR scanner with continuous scanning
  useEffect(() => {
    if (mode !== 'camera' || loading) return;

    const qrScanner = new Html5Qrcode("audit-qr-reader");
    qrScannerRef.current = qrScanner;

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    const successCallback = (decodedText: string) => {
      // Process the scanned code WITHOUT stopping the scanner
      // This allows continuous scanning
      processScannedId(decodedText.trim());

      // Auto-clear the scan result message after 2 seconds
      setTimeout(() => {
        setScanResult(null);
      }, 2000);
    };

    const errorCallback = () => {
      // Silent error callback - just continue scanning
      // Don't show error for every frame that doesn't detect a QR code
    };

    // Start the scanner with continuous scanning enabled
    qrScanner.start({ facingMode: "environment" }, config, successCallback, errorCallback)
      .then(() => {
        console.log("QR Scanner started successfully - continuous scanning enabled");
      })
      .catch((err: unknown) => {
        console.error("QR Scanner Error:", err);
        setScanResult({ type: 'error', message: t('inventory_audit.camera_error') });
      });

    // Cleanup on unmount
    return () => {
      if (qrScanner) {
        qrScanner.stop()
          .then(() => {
            console.log("QR Scanner stopped");
          })
          .catch((err: unknown) => console.error("Failed to stop QR scanner on cleanup", err));
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

  const handleFinishAudit = async () => {
    if (window.confirm('Are you sure you want to finish this audit?')) {
      try {
        await completeInventoryAudit(auditId);
        alert('Audit completed successfully!');
        navigateTo({ type: 'DASHBOARD' });
      } catch (error: any) {
        alert('Failed to complete audit: ' + error.message);
      }
    }
  };

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
          <h1 className="text-3xl font-bold text-dark-text">Auditing Unit: {unitName}</h1>
          <p className="text-sm text-gray-600 mt-1">Audit ID: #{auditId}</p>
        </div>
        <button onClick={handleFinishAudit} className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary-dark transition-colors">
          Finish Audit
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md">
        {mode === 'camera' ? (
          <div>
            <div id="audit-qr-reader" className="w-full max-w-sm mx-auto border-2 border-dashed border-gray-300 rounded-lg overflow-hidden"></div>
            {scanResult && <p className={`mt-4 p-3 rounded-md text-center ${scanResultColor}`}>{scanResult.message}</p>}
            <p className="text-center text-medium-text mt-4">Scan asset QR code to mark as found</p>
          </div>
        ) : (
          <form onSubmit={handleManualSubmit}>
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Enter Asset ID manually"
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
                <TabButton tabName="missing" label="Missing" count={missingAssets.length} />
                <TabButton tabName="found" label="Found" count={foundAssets.length} />
                <TabButton tabName="misplaced" label="Misplaced" count={misplacedAssets.length} />
            </nav>
        </div>
        <div className="p-4">
            {activeTab === 'missing' && (
                <ul className="divide-y divide-gray-200">
                    {missingAssets.map(asset => (
                        <li key={asset.id} className="py-3 flex justify-between items-center">
                            <div>
                                <p className="font-medium">{asset.name}</p>
                                <p className="text-sm text-gray-500">ID: {asset.id} | Tag: {asset.asset_tag}</p>
                            </div>
                            <button onClick={() => setReportingAsset(asset)} className="flex items-center text-sm text-red-600 hover:text-red-800">
                                <DamageIcon />
                                <span className="ml-1">Report Loss</span>
                            </button>
                        </li>
                    ))}
                    {missingAssets.length === 0 && (
                        <p className="text-center text-gray-500 py-4">All assets have been found!</p>
                    )}
                </ul>
            )}
             {activeTab === 'found' && (
                <ul className="divide-y divide-gray-200">
                    {foundAssets.map(asset => (
                        <li key={asset.id} className="py-3">
                            <p className="font-medium">{asset.name}</p>
                            <p className="text-sm text-gray-500">ID: {asset.id} | Tag: {asset.asset_tag}</p>
                        </li>
                    ))}
                    {foundAssets.length === 0 && (
                        <p className="text-center text-gray-500 py-4">No assets found yet</p>
                    )}
                </ul>
            )}
             {activeTab === 'misplaced' && (
                <ul className="divide-y divide-gray-200">
                    {misplacedAssets.map((asset, idx) => (
                        <li key={idx} className="py-3">
                            <p className="font-medium">{asset.name}</p>
                            <p className="text-sm text-gray-500">ID: {asset.id} | Tag: {asset.asset_tag}</p>
                            <p className="text-sm text-yellow-600">Should be in: {asset.current_unit_name}</p>
                        </li>
                    ))}
                    {misplacedAssets.length === 0 && (
                        <p className="text-center text-gray-500 py-4">No misplaced assets detected</p>
                    )}
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
