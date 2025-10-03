// Dashboard.tsx - DENGAN CHART DAN DIAGRAM LINGKARAN
import React, { useState, useEffect } from 'react';
import { View, DashboardStats, ChartData } from '../types';
import { getDashboardStats } from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { formatToRupiah } from '../utils/formatters';

interface DashboardProps {
  navigateTo: (view: View) => void;
}

// Warna untuk chart
const CHART_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
];

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

  // Komponen untuk Bar Chart (Assets by Category)
  const BarChart: React.FC<{ data: ChartData[] }> = ({ data }) => {
    const maxCount = Math.max(...data.map(item => item.count), 0);
    
    return (
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center">
            <div className="w-32 text-sm text-gray-600 truncate mr-3">
              {item.name}
            </div>
            <div className="flex-1">
              <div className="flex items-center">
                <div 
                  className="bg-blue-500 h-6 rounded-l transition-all duration-500"
                  style={{ 
                    width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%`,
                    backgroundColor: CHART_COLORS[index % CHART_COLORS.length]
                  }}
                >
                  <span className="text-white text-xs font-medium pl-2">
                    {item.count}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            No category data available
          </div>
        )}
      </div>
    );
  };

  // Komponen untuk Pie Chart (Assets by Location)
  const PieChart: React.FC<{ data: ChartData[] }> = ({ data }) => {
    const total = data.reduce((sum, item) => sum + item.count, 0);
    
    if (data.length === 0) {
      return (
        <div className="text-center text-gray-500 py-8">
          No location data available
        </div>
      );
    }

    let currentAngle = 0;
    const segments = data.map((item, index) => {
      const percentage = (item.count / total) * 100;
      const angle = (item.count / total) * 360;
      const segment = {
        ...item,
        percentage,
        angle,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        color: CHART_COLORS[index % CHART_COLORS.length]
      };
      currentAngle += angle;
      return segment;
    });

    return (
      <div className="flex flex-col lg:flex-row items-center justify-center space-y-4 lg:space-y-0 lg:space-x-8">
        {/* SVG Pie Chart */}
        <div className="relative">
          <svg width="200" height="200" viewBox="0 0 42 42" className="transform -rotate-90">
            {segments.map((segment, index) => (
              <circle
                key={segment.name}
                cx="21"
                cy="21"
                r="15.91549430918954"
                fill="transparent"
                stroke={segment.color}
                strokeWidth="8"
                strokeDasharray={`${segment.angle} ${360 - segment.angle}`}
                strokeDashoffset={-segment.startAngle}
                className="transition-all duration-500"
              />
            ))}
          </svg>
        </div>
        
        {/* Legend */}
        <div className="space-y-2 min-w-48">
          {segments.map((segment, index) => (
            <div key={segment.name} className="flex items-center text-sm">
              <div 
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-gray-600 flex-1 truncate">{segment.name}</span>
              <span className="text-gray-900 font-medium ml-2">
                {segment.count} ({segment.percentage.toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

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
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-medium-text">{t('Total Asset')}</h3>
          <p className="text-3xl font-bold text-primary">{stats.total_assets}</p>
          <p className="text-sm text-gray-500 mt-1">Total semua asset</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-medium-text">{t('Nilai Asset Keseluruhan')}</h3>
          <p className="text-3xl font-bold text-primary">
            {formatToRupiah(stats.total_value)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Total nilai semua asset</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-medium-text">{t('Asset Yang Digunakan')}</h3>
          <p className="text-3xl font-bold text-green-600">{stats.assets_in_use}</p>
          <p className="text-sm text-gray-500 mt-1">Asset dalam penggunaan</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-medium-text">{t('Asset Dalam Perbaikan')}</h3>
          <p className="text-3xl font-bold text-orange-500">{stats.assets_in_repair}</p>
          <p className="text-sm text-gray-500 mt-1">Sedang dalam perbaikan</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-medium-text">{t('Jadwal Maintenance')}</h3>
          <p className="text-3xl font-bold text-yellow-500">{stats.scheduled_maintenances}</p>
          <p className="text-sm text-gray-500 mt-1">Maintenance terjadwal</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-medium-text">{t('Insiden Asset')}</h3>
          <p className="text-3xl font-bold text-red-500">{stats.active_incidents}</p>
          <p className="text-sm text-gray-500 mt-1">Insiden aktif</p>
        </div>
      </div>

      {/* Charts Section - Menggantikan Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Assets by Category */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-dark-text">
              Distribusi Asset Berdasarkan Kategori
            </h2>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Total: {stats.assets_by_category.reduce((sum, item) => sum + item.count, 0)}
            </span>
          </div>
          <BarChart data={stats.assets_by_category} />
          <div className="mt-4 text-sm text-gray-500 text-center">
            Grafik menunjukkan jumlah asset per kategori
          </div>
        </div>

        {/* Pie Chart - Assets by Location */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-dark-text">
              Distribusi Asset Berdasarkan Lokasi
            </h2>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Total: {stats.assets_by_location.reduce((sum, item) => sum + item.count, 0)}
            </span>
          </div>
          <PieChart data={stats.assets_by_location} />
          <div className="mt-4 text-sm text-gray-500 text-center">
            Diagram menunjukkan persentase asset per lokasi
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => navigateTo({ type: 'ASSET_LIST' })}
          className="bg-white p-4 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-all duration-200 text-left group"
        >
          <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
            📋 Daftar Asset
          </h3>
          <p className="text-sm text-gray-600 mt-1">Lihat dan kelola semua asset</p>
        </button>

        <button
          onClick={() => navigateTo({ type: 'QR_SCANNER' })}
          className="bg-white p-4 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-all duration-200 text-left group"
        >
          <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
            📷 Scan QR
          </h3>
          <p className="text-sm text-gray-600 mt-1">Scan QR code asset</p>
        </button>

        <button
          onClick={() => navigateTo({ type: 'BULK_TRANSACTION' })}
          className="bg-white p-4 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-all duration-200 text-left group"
        >
          <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
            🔄 Bulk Transaction
          </h3>
          <p className="text-sm text-gray-600 mt-1">Transaksi asset dalam jumlah besar</p>
        </button>

        <button
          onClick={() => navigateTo({ type: 'REPORTS' })}
          className="bg-white p-4 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-all duration-200 text-left group"
        >
          <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
            📊 Laporan
          </h3>
          <p className="text-sm text-gray-600 mt-1">Lihat laporan lengkap</p>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;