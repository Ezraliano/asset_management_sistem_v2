
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Asset } from '../types';
import { getInventoryAuditById, scanAssetInAudit, completeInventoryAudit } from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { BackIcon, DamageIcon, DownloadIcon } from './icons';
import Modal from './Modal';
import ReportIssueForm from './ReportIssueForm';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Html5Qrcode } from 'html5-qrcode';

interface InventoryAuditProps {
  unitId: number;
  unitName: string;
  auditId: number;
  mode: 'camera' | 'manual';
  navigateTo: (view: View) => void;
}

type Tab = 'missing' | 'found' | 'misplaced';

interface ScanConfirmation {
  isOpen: boolean;
  assetId: number | null;
  assetName: string;
  assetTag: string;
}

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
  const [scanConfirmation, setScanConfirmation] = useState<ScanConfirmation>({
    isOpen: false,
    assetId: null,
    assetName: '',
    assetTag: ''
  });
  const qrScannerRef = useRef<any>(null);
  const [isScannerPaused, setIsScannerPaused] = useState(false);
  const [isReportDownloaded, setIsReportDownloaded] = useState(false);
  const [showFinishWarning, setShowFinishWarning] = useState(false);

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
        const assetName = response.asset?.name || 'Unknown Asset';
        const assetTag = response.asset?.asset_tag || 'N/A';

        if (assetId) {
          setFoundAssetIds(prev => {
            const newSet = new Set(prev);
            newSet.add(assetId);
            return newSet;
          });

          // Pause scanner and show confirmation modal
          setIsScannerPaused(true);
          setScanConfirmation({
            isOpen: true,
            assetId: assetId,
            assetName: assetName,
            assetTag: assetTag
          });
          setScanResult({ type: 'success', message: response.message });
        }
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

  const handleContinueScan = () => {
    // Close confirmation modal and resume scanning
    setScanConfirmation({
      isOpen: false,
      assetId: null,
      assetName: '',
      assetTag: ''
    });
    setIsScannerPaused(false);
    // Clear the scan result message
    setScanResult(null);
  };

  const handleStopScan = () => {
    // Close confirmation modal without resuming scan
    setScanConfirmation({
      isOpen: false,
      assetId: null,
      assetName: '',
      assetTag: ''
    });
    setIsScannerPaused(false);
    setScanResult(null);
  };

  // Initialize and manage QR scanner with continuous scanning
  useEffect(() => {
    if (mode !== 'camera' || loading) return;

    // Html5Qrcode is now imported directly
    if (!Html5Qrcode) {
      console.error("Html5Qrcode library not loaded");
      setScanResult({ type: 'error', message: 'QR Code scanner library failed to load' });
      return;
    }

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

  const handleFinishAudit = () => {
    // Jika laporan belum didownload, tampilkan warning modal
    if (!isReportDownloaded) {
      setShowFinishWarning(true);
    } else {
      // Jika sudah didownload, langsung selesaikan audit
      completeAuditProcess();
    }
  };

  const completeAuditProcess = async () => {
    try {
      await completeInventoryAudit(auditId);
      alert('Audit completed successfully!');
      // Tetap di halaman audit, tidak redirect ke dashboard
      // User dapat melihat hasil audit dan download report sebelum kembali
    } catch (error: any) {
      alert('Failed to complete audit: ' + error.message);
    }
  };

  const handleConfirmFinishWithoutReport = async () => {
    setShowFinishWarning(false);
    await completeAuditProcess();
  };

  const handleCancelFinish = () => {
    setShowFinishWarning(false);
  };

  const handleDownloadReport = () => {
    try {
      // Create PDF document
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = { left: 40, right: 40, top: 50, bottom: 40 };

      // Title
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text('Laporan Audit Inventaris', margin.left, margin.top);

      // Audit Info
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Unit: ${unitName}`, margin.left, margin.top + 25);
      doc.text(`Audit ID: #${auditId}`, margin.left, margin.top + 40);
      doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`, margin.left, margin.top + 55);

      // Summary Statistics
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text('Ringkasan Audit', margin.left, margin.top + 85);

      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      const stats = [
        `Total Asset yang Diharapkan: ${expectedAssets.length}`,
        `Asset Ditemukan: ${foundAssets.length}`,
        `Asset Hilang: ${missingAssets.length}`,
        `Asset Salah Tempat: ${misplacedAssets.length}`,
        `Persentase Kelengkapan: ${expectedAssets.length > 0 ? Math.round((foundAssets.length / expectedAssets.length) * 100) : 0}%`
      ];

      let yPos = margin.top + 105;
      stats.forEach(stat => {
        doc.text(stat, margin.left + 10, yPos);
        yPos += 18;
      });

      // Found Assets Table
      yPos += 20;
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text('Asset yang Ditemukan', margin.left, yPos);
      yPos += 10;

      if (foundAssets.length > 0) {
        (doc as any).autoTable({
          startY: yPos,
          head: [['No', 'Nama Asset', 'Tag Asset', 'ID']],
          body: foundAssets.map((asset, idx) => [
            idx + 1,
            asset.name.length > 40 ? asset.name.substring(0, 37) + '...' : asset.name,
            asset.asset_tag,
            asset.id
          ]),
          styles: { fontSize: 9, cellPadding: 5 },
          headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [240, 253, 244] },
          margin: { left: margin.left, right: margin.right },
          theme: 'grid'
        });
        yPos = (doc as any).lastAutoTable.finalY + 20;
      } else {
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text('Tidak ada asset yang ditemukan', margin.left + 10, yPos + 15);
        yPos += 35;
      }

      // Check if we need a new page
      if (yPos > pageHeight - 150) {
        doc.addPage();
        yPos = margin.top;
      }

      // Missing Assets Table
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text('Asset yang Hilang', margin.left, yPos);
      yPos += 10;

      if (missingAssets.length > 0) {
        (doc as any).autoTable({
          startY: yPos,
          head: [['No', 'Nama Asset', 'Tag Asset', 'ID']],
          body: missingAssets.map((asset, idx) => [
            idx + 1,
            asset.name.length > 40 ? asset.name.substring(0, 37) + '...' : asset.name,
            asset.asset_tag,
            asset.id
          ]),
          styles: { fontSize: 9, cellPadding: 5 },
          headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [254, 242, 242] },
          margin: { left: margin.left, right: margin.right },
          theme: 'grid'
        });
        yPos = (doc as any).lastAutoTable.finalY + 20;
      } else {
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text('Tidak ada asset yang hilang', margin.left + 10, yPos + 15);
        yPos += 35;
      }

      // Check if we need a new page
      if (yPos > pageHeight - 150) {
        doc.addPage();
        yPos = margin.top;
      }

      // Misplaced Assets Table
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text('Asset yang Salah Tempat', margin.left, yPos);
      yPos += 10;

      if (misplacedAssets.length > 0) {
        (doc as any).autoTable({
          startY: yPos,
          head: [['No', 'Nama Asset', 'Tag Asset', 'ID', 'Lokasi Seharusnya']],
          body: misplacedAssets.map((asset, idx) => [
            idx + 1,
            asset.name.length > 30 ? asset.name.substring(0, 27) + '...' : asset.name,
            asset.asset_tag || asset.asset_code || 'N/A',
            asset.id,
            asset.current_unit_name.length > 25 ? asset.current_unit_name.substring(0, 22) + '...' : asset.current_unit_name
          ]),
          styles: { fontSize: 9, cellPadding: 5 },
          headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [239, 246, 255] },
          margin: { left: margin.left, right: margin.right },
          theme: 'grid'
        });
      } else {
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text('Tidak ada asset yang salah tempat', margin.left + 10, yPos + 15);
      }

      // Add footer to all pages
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Halaman ${i} dari ${pageCount}`,
          pageWidth / 2,
          pageHeight - 20,
          { align: 'center' }
        );
      }

      // Download PDF
      const filename = `Laporan_Audit_${unitName.replace(/\s+/g, '_')}_${auditId}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);

      // Mark report as downloaded
      setIsReportDownloaded(true);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Gagal membuat laporan PDF. Silakan coba lagi.');
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
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={handleDownloadReport} className="flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition-colors">
            <DownloadIcon />
            <span className="ml-2">Download Report</span>
          </button>
          <button onClick={handleFinishAudit} className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary-dark transition-colors">
            Finish Audit
          </button>
        </div>
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

      <Modal isOpen={scanConfirmation.isOpen} onClose={handleStopScan}>
        <div className="bg-white rounded-lg p-6 max-w-sm mx-auto">
          <div className="text-center mb-6">
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-bold text-dark-text mb-2">Asset Berhasil Di-Scan</h2>
            <p className="text-gray-600">Apakah anda ingin melanjutkan proses audit?</p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="mb-3">
              <p className="text-sm text-gray-600">Nama Asset</p>
              <p className="font-semibold text-dark-text">{scanConfirmation.assetName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tag Asset</p>
              <p className="font-semibold text-dark-text">{scanConfirmation.assetTag}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleStopScan}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Tidak, Hentikan
            </button>
            <button
              onClick={handleContinueScan}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors"
            >
              Ya, Lanjutkan
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showFinishWarning} onClose={handleCancelFinish}>
        <div className="bg-white rounded-lg p-6 max-w-sm mx-auto">
          <div className="text-center mb-6">
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-bold text-dark-text mb-2">Peringatan</h2>
            <p className="text-gray-600">Apakah anda yakin untuk mengakhiri proses audit tanpa mendownload laporan audit?</p>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800">
              Anda belum mendownload laporan audit. Laporan ini penting untuk dokumentasi dan referensi di masa mendatang.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCancelFinish}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors"
            >
              Batal, Download Laporan
            </button>
            <button
              onClick={handleConfirmFinishWithoutReport}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
            >
              Ya, Akhiri Audit
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InventoryAudit;