
import React, { useState, useEffect } from 'react';
import { getUnits, startInventoryAudit } from '../services/api';
import { View, Unit } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { AuditIcon, CameraIcon, QRIcon } from './icons';

interface InventoryAuditSetupProps {
  navigateTo: (view: View) => void;
}

const InventoryAuditSetup: React.FC<InventoryAuditSetupProps> = ({ navigateTo }) => {
  const { t } = useTranslation();
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const [scanMode, setScanMode] = useState<'camera' | 'manual' | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUnits = async () => {
      setLoading(true);
      try {
        const fetchedUnits = await getUnits();
        const activeUnits = fetchedUnits.filter(u => u.is_active);
        setUnits(activeUnits);
        if (activeUnits.length > 0) {
          setSelectedUnitId(activeUnits[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load units');
      } finally {
        setLoading(false);
      }
    };
    fetchUnits();
  }, []);

  const handleStartAudit = async () => {
    if (!selectedUnitId || !scanMode) return;

    setStarting(true);
    setError(null);

    try {
      const selectedUnit = units.find(u => u.id === selectedUnitId);
      if (!selectedUnit) {
        throw new Error('Selected unit not found');
      }

      // Create audit session
      const audit = await startInventoryAudit({
        unit_id: selectedUnitId,
        scan_mode: scanMode,
      });

      // Navigate to audit session
      navigateTo({
        type: 'INVENTORY_AUDIT_SESSION',
        unitId: selectedUnitId,
        unitName: selectedUnit.name,
        auditId: audit.id,
        mode: scanMode
      });
    } catch (err: any) {
      setError(err.message || 'Failed to start audit');
    } finally {
      setStarting(false);
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

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <p>Loading units...</p>
        ) : units.length > 0 ? (
          <div className="space-y-6">
            <div>
              <label htmlFor="unit-select" className="block text-lg text-medium-text mb-2">
                Select Unit to Audit
              </label>
              <select
                id="unit-select"
                value={selectedUnitId || ''}
                onChange={(e) => setSelectedUnitId(Number(e.target.value))}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-lg"
              >
                {units.map(unit => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name} ({unit.code})
                  </option>
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
              disabled={!selectedUnitId || !scanMode || starting}
              className="w-full bg-primary text-white font-bold py-3 px-4 rounded-lg mt-6 hover:bg-primary-dark transition-all duration-300 ease-in-out transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:scale-100"
            >
              {starting ? 'Starting Audit...' : t('inventory_audit.start_audit')}
            </button>
          </div>
        ) : (
          <p className="text-medium-text">No active units available for audit</p>
        )}
      </div>
    </div>
  );
};

export default InventoryAuditSetup;