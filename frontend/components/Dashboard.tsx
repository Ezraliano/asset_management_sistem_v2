import React, { useState, useEffect } from 'react';
import { View, DashboardStats } from '../types';
import { getDashboardStats } from '../services/api';
import { useTranslation } from '../hooks/useTranslation';

interface DashboardProps {
  navigateTo: (view: View) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ navigateTo }) => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center text-red-500">
        Failed to load dashboard data
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-dark-text">{t('dashboard.title')}</h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-medium-text">{t('dashboard.total_assets')}</h3>
          <p className="text-3xl font-bold text-primary">{stats.total_assets}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-medium-text">{t('dashboard.total_value')}</h3>
          <p className="text-3xl font-bold text-primary">
            ${stats.total_value.toLocaleString()}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-medium-text">{t('dashboard.assets_in_use')}</h3>
          <p className="text-3xl font-bold text-secondary">{stats.assets_in_use}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-medium-text">{t('dashboard.assets_in_repair')}</h3>
          <p className="text-3xl font-bold text-orange-500">{stats.assets_in_repair}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-medium-text">{t('dashboard.scheduled_maintenances')}</h3>
          <p className="text-3xl font-bold text-yellow-500">{stats.scheduled_maintenances}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-medium-text">{t('dashboard.active_incidents')}</h3>
          <p className="text-3xl font-bold text-red-500">{stats.active_incidents}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">{t('dashboard.quick_actions')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigateTo({ type: 'ASSET_LIST' })}
            className="p-4 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            {t('dashboard.view_assets')}
          </button>
          <button
            onClick={() => navigateTo({ type: 'BULK_TRANSACTION' })}
            className="p-4 bg-secondary text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            {t('dashboard.bulk_operations')}
          </button>
          <button
            onClick={() => navigateTo({ type: 'QR_SCANNER' })}
            className="p-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            {t('dashboard.scan_qr')}
          </button>
          <button
            onClick={() => navigateTo({ type: 'REPORTS' })}
            className="p-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            {t('dashboard.view_reports')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;