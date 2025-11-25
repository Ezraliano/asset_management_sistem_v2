// Dashboard.tsx - DENGAN CHART DAN DIAGRAM LINGKARAN
import React, { useState, useEffect } from 'react';
import { DashboardStats, ChartData, Unit } from '../types';
import { getDashboardStats, getCurrentUser, getUnits } from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { formatToRupiah } from '../utils/formatters';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Warna untuk chart
const CHART_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
];

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [user, fetchedUnits] = await Promise.all([
          getCurrentUser(),
          getUnits()
        ]);
        setCurrentUser(user);
        setUnits(fetchedUnits);
      } catch (error) {
        console.error('Failed to load user and units:', error);
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      try {
        const data = await getDashboardStats(selectedUnitId, startDate, endDate);
        setStats(data);
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      loadStats();
    }
  }, [selectedUnitId, currentUser, startDate, endDate]);


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

  // Check if user can filter by unit (Super Admin or Admin Holding)
  const canFilterByUnit = currentUser && ['super-admin', 'admin'].includes(currentUser.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold text-dark-text">{t('dashboard.title')}</h1>

        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
          {/* Date Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
            <label htmlFor="start-date" className="text-sm font-medium text-gray-700 whitespace-nowrap">Dari:</label>
            <input
              type="date"
              id="start-date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white shadow-sm w-full sm:w-auto"
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
            <label htmlFor="end-date" className="text-sm font-medium text-gray-700 whitespace-nowrap">Sampai:</label>
            <input
              type="date"
              id="end-date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white shadow-sm w-full sm:w-auto"
            />
          </div>

          {/* Unit Filter Dropdown */}
          {canFilterByUnit && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
              <label htmlFor="unit-filter" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Unit:
              </label>
              <select
                id="unit-filter"
                value={selectedUnitId}
                onChange={(e) => setSelectedUnitId(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white shadow-sm w-full sm:w-auto"
              >
                <option value="all">Semua Unit</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          <h3 className="text-lg font-semibold text-medium-text">{t('Asset Yang Tersedia')}</h3>
          <p className="text-3xl font-bold text-green-600">{stats.assets_in_use}</p>
          <p className="text-sm text-gray-500 mt-1">Asset dalam penggunaan</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-medium-text">{t('Asset Dalam Perbaikan')}</h3>
          <p className="text-3xl font-bold text-orange-500">{stats.assets_in_repair}</p>
          <p className="text-sm text-gray-500 mt-1">Sedang dalam perbaikan</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-medium-text">{t('Asset Yang Dipinjam')}</h3>
          <p className="text-3xl font-bold text-yellow-500">{stats.approved_loans}</p>
          <p className="text-sm text-gray-500 mt-1">Asset yang sedang dipinjam</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-medium-text">{t('Insiden Kerusakan Asset')}</h3>
          <p className="text-3xl font-bold text-red-500">{stats.active_incidents}</p>
          <p className="text-sm text-gray-500 mt-1">Insiden aktif</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-medium-text">{t('Asset Dalam Pemeliharaan')}</h3>
          <p className="text-3xl font-bold text-cyan-500">{stats.assets_in_maintenance}</p>
          <p className="text-sm text-gray-500 mt-1">Asset yang sedang dipelihara</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-medium-text">{t('Asset Hilang')}</h3>
          <p className="text-3xl font-bold text-gray-500">{stats.assets_lost || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Asset yang hilang</p>
        </div>
      </div>

      {/* Charts Section */}
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
          {stats.assets_by_category.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.assets_by_category}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                  formatter={(value) => [`${value}`, 'Jumlah']}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-300 flex items-center justify-center text-gray-500">
              Tidak ada data kategori asset
            </div>
          )}
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
          {stats.assets_by_location.length > 0 && stats.assets_by_location.some(d => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.assets_by_location}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="count"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {stats.assets_by_location.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                  formatter={(value) => [`${value}`, 'Jumlah']}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-300 flex items-center justify-center text-gray-500">
              Tidak ada data lokasi asset
            </div>
          )}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {stats.assets_by_location.map((location, index) => (
                <div key={location.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  ></div>
                  <span className="text-gray-600">{location.name}: {location.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500 text-center">
            Diagram menunjukkan persentase asset per lokasi
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;