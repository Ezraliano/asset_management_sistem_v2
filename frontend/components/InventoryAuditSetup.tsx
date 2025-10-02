
import React, { useState, useEffect } from 'react';
import { getAssets } from '../services/api';
import { View } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { AuditIcon, CameraIcon, QRIcon } from './icons';

interface InventoryAuditSetupProps {
  navigateTo: (view: View) => void;
}

const InventoryAuditSetup: React.FC<InventoryAuditSetupProps> = ({ navigateTo }) => {
  const { t } = useTranslation();
  const [locations, setLocations] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [scanMode, setScanMode] = useState<'camera' | 'manual' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      setLoading(true);
      const allAssets = await getAssets();
      const uniqueLocations = [...new Set(allAssets.map(a => a.location))].sort();
      setLocations(uniqueLocations);
      if (uniqueLocations.length > 0) {
        setSelectedLocation(uniqueLocations[0]);
      }
      setLoading(false);
    };
    fetchLocations();
  }, []);

  const handleStartAudit = () => {
    if (selectedLocation && scanMode) {
      navigateTo({ type: 'INVENTORY_AUDIT_SESSION', location: selectedLocation, mode: scanMode });
    }
  };

  const ScanModeButton: React.FC<{
    mode: 'camera' | 'manual';
    label: string;
    icon: React.ReactNode;
  }> = ({ mode, label, icon }) => (
    <button
      onClick={() => setScanMode(mode)}
      className={`flex-1 flex flex-col items-center justify-center p-4 border-2 rounded-lg transition-all duration-200 ${
        scanMode === mode
          ? 'bg-primary border-primary text-white shadow-lg scale-105'
          : 'bg-white border-gray-300 hover:border-primary hover:bg-blue-50'
      }`}
    >
      {icon}
      <span className="mt-2 font-semibold">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg text-center">
        <div className="mx-auto bg-primary text-white rounded-full h-20 w-20 flex items-center justify-center mb-6">
          <AuditIcon />
        </div>
        <h1 className="text-3xl font-bold text-dark-text mb-6">{t('inventory_audit.setup_title')}</h1>
        
        {loading ? (
          <p>{t('inventory_audit.loading_locations')}</p>
        ) : locations.length > 0 ? (
          <div className="space-y-6">
            <div>
              <label htmlFor="location-select" className="block text-lg text-medium-text mb-2">
                {t('inventory_audit.select_location')}
              </label>
              <select
                id="location-select"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-lg"
              >
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-lg text-medium-text mb-2">
                {t('inventory_audit.select_scan_mode')}
              </label>
              <div className="flex gap-4">
                <ScanModeButton mode="camera" label={t('inventory_audit.camera_mode')} icon={<CameraIcon />} />
                <ScanModeButton mode="manual" label={t('inventory_audit.manual_mode')} icon={<QRIcon />} />
              </div>
            </div>

            <button
              onClick={handleStartAudit}
              disabled={!selectedLocation || !scanMode}
              className="w-full bg-primary text-white font-bold py-3 px-4 rounded-lg mt-6 hover:bg-primary-dark transition-all duration-300 ease-in-out transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:scale-100"
            >
              {t('inventory_audit.start_audit')}
            </button>
          </div>
        ) : (
          <p className="text-medium-text">{t('inventory_audit.no_locations')}</p>
        )}
      </div>
    </div>
  );
};

export default InventoryAuditSetup;