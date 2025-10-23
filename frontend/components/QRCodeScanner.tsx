
import React, { useState, useEffect, useCallback } from 'react';
import { View } from '../types';
import { getAssetByTag } from '../services/api';
import { QRIcon, CameraIcon } from './icons';
import { useTranslation } from '../hooks/useTranslation';

// Assume Html5Qrcode is available globally from the script tag in index.html
declare const Html5Qrcode: any;

interface QRCodeScannerProps {
  navigateTo: (view: View) => void;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ navigateTo }) => {
  const { t } = useTranslation();
  const [assetId, setAssetId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const handleSearch = useCallback(async (scannedTag: string) => {
    if (!scannedTag) {
      setError(t('qr_scanner.errors.required'));
      return;
    }
    setLoading(true);
    setError('');
    // ✅ FIX: Use getAssetByTag instead of getAssetById
    // QR code contains asset_tag (e.g., AST-00001), not numeric ID
    const asset = await getAssetByTag(scannedTag.trim());
    if (asset) {
      navigateTo({ type: 'ASSET_DETAIL', assetId: asset.id.toString() });
    } else {
      setError(t('qr_scanner.errors.not_found'));
    }
    setLoading(false);
  }, [navigateTo, t]);

  useEffect(() => {
    if (!isScanning) {
      return;
    }

    const qrScanner = new Html5Qrcode("qr-reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    const qrCodeSuccessCallback = (decodedText: string) => {
      qrScanner.stop().then(() => {
        setAssetId(decodedText);
        setIsScanning(false);
        handleSearch(decodedText);
      });
    };

    qrScanner.start({ facingMode: "environment" }, config, qrCodeSuccessCallback, undefined)
      .catch((err: any) => {
        console.error("Unable to start QR scanner", err);
        setError(t('qr_scanner.errors.camera_fail'));
        setIsScanning(false);
      });

    return () => {
      // Check if the scanner exists and is in a scanning state before trying to stop it.
      if (qrScanner && qrScanner.isScanning) {
        qrScanner.stop()
          .catch((err: any) => console.error("Failed to stop QR scanner", err));
      }
    };
  }, [isScanning, handleSearch, t]);

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
        <div className="mx-auto bg-primary text-white rounded-full h-20 w-20 flex items-center justify-center mb-6">
          <QRIcon className="h-10 w-10" />
        </div>
        <h1 className="text-3xl font-bold text-dark-text mb-2">{t('qr_scanner.title')}</h1>
        
        {isScanning ? (
          <div className="mt-4">
            <div id="qr-reader" className="w-full border-2 border-dashed border-gray-300 rounded-lg overflow-hidden"></div>
            <button
              onClick={() => setIsScanning(false)}
              className="w-full bg-red-500 text-white font-bold py-3 px-4 rounded-lg mt-4 hover:bg-red-600 transition-colors"
            >
              {t('qr_scanner.cancel_scan')}
            </button>
          </div>
        ) : (
          <>
            <p className="text-medium-text mb-6">{t('qr_scanner.description')}</p>
            <input
              type="text"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              placeholder={t('qr_scanner.placeholder')}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-center text-lg"
            />
            
            {error && <p className="text-red-500 mt-4">{error}</p>}
            
            <div className="flex flex-col sm:flex-row gap-4 mt-6">
               <button
                onClick={() => { setError(''); setIsScanning(true); }}
                className="flex-1 flex items-center justify-center bg-secondary text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition-all duration-300 ease-in-out transform hover:scale-105"
              >
                <CameraIcon />
                <span className="ml-2">{t('qr_scanner.scan_with_camera')}</span>
              </button>
              <button
                onClick={() => handleSearch(assetId)}
                disabled={loading || !assetId}
                className="flex-1 bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-dark transition-all duration-300 ease-in-out transform hover:scale-105 disabled:bg-gray-400"
              >
                {loading ? t('qr_scanner.verifying') : t('qr_scanner.find_asset')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default QRCodeScanner;
