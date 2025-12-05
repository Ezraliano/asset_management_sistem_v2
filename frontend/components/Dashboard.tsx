// Dashboard.tsx - DENGAN CHART DAN DIAGRAM LINGKARAN
import React, { useState, useEffect } from 'react';
import { DashboardStats, ChartData, Unit, View } from '../types';
import { getDashboardStats, getCurrentUser, getUnits } from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { formatToRupiah } from '../utils/formatters';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Warna untuk chart
const CHART_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
];

interface DashboardProps {
  navigateTo?: (view: View) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ navigateTo }) => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnitName, setSelectedUnitName] = useState<string>('all');
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
        const data = await getDashboardStats(selectedUnitName, startDate, endDate);
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
  }, [selectedUnitName, currentUser, startDate, endDate]);

  // Force unit filter for ADMIN (Unit Admin) role - MUST be before any conditional returns
  useEffect(() => {
    if (currentUser?.role === 'admin' && currentUser?.unit_name && selectedUnitName !== currentUser.unit_name) {
      setSelectedUnitName(currentUser.unit_name);
    }
  }, [currentUser, selectedUnitName]);

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

  // Simple welcome message for USER role
  if (currentUser?.role === 'user') {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-12 text-white">
          <h1 className="text-4xl font-bold mb-4">Selamat Datang di Aset Management Sistem</h1>
          <p className="text-lg opacity-90">
            Anda dapat meminjam dan mengembalikan aset dari unit <strong>{currentUser.unit_name || 'Anda'}</strong>
          </p>
        </div>
      </div>
    );
  }

  // Check if user can filter by unit (Super Admin and Admin Holding can filter - Admin Unit is forced to their unit)
  const canFilterByUnit = currentUser && ['super-admin', 'admin-holding'].includes(currentUser.role);

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
                value={selectedUnitName}
                onChange={(e) => setSelectedUnitName(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white shadow-sm w-full sm:w-auto"
              >
                <option value="all">Semua Unit</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.name}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6">
        {/* Total Asset */}
        <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <p className="text-gray-600 text-sm font-medium mb-2">{t('Total Asset')}</p>
              <p className="text-3xl font-bold text-primary">{stats.total_assets}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-2 flex-shrink-0 ml-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m0 0l8-4m0 0l8 4m0 6l-8 4-8-4m0 0l8-4m0 0l8 4m0 6l-8 4-8-4" />
              </svg>
            </div>
          </div>
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Total semua asset</p>
          </div>
        </div>

        {/* Nilai Asset Keseluruhan */}
        <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <p className="text-gray-600 text-sm font-medium mb-2">{t('Nilai Asset Keseluruhan')}</p>
              <p className="text-3xl font-bold text-primary">
                {formatToRupiah(stats.total_value)}
              </p>
            </div>
            <div className="bg-indigo-100 rounded-full p-2 flex-shrink-0 ml-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Total nilai semua asset</p>
          </div>
        </div>

        {/* Asset Yang Tersedia */}
        <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <p className="text-gray-600 text-sm font-medium mb-2">{t('Asset Yang Tersedia')}</p>
              <p className="text-3xl font-bold text-green-600">{stats.assets_in_use}</p>
            </div>
            <div className="bg-green-100 rounded-full p-2 flex-shrink-0 ml-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Asset dalam penggunaan</p>
          </div>
        </div>

        {/* Asset Dalam Perbaikan */}
        <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <p className="text-gray-600 text-sm font-medium mb-2">{t('Asset Dalam Perbaikan')}</p>
              <p className="text-3xl font-bold text-orange-500">{stats.assets_in_repair}</p>
            </div>
            <div className="bg-orange-100 rounded-full p-2 flex-shrink-0 ml-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Sedang dalam perbaikan</p>
          </div>
        </div>

        {/* Asset Yang Dipinjam */}
        <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <p className="text-gray-600 text-sm font-medium mb-2">{t('Asset Yang Dipinjam')}</p>
              <p className="text-3xl font-bold text-yellow-500">{stats.approved_loans}</p>
            </div>
            <div className="bg-yellow-100 rounded-full p-2 flex-shrink-0 ml-2">
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Asset yang sedang dipinjam</p>
          </div>
        </div>

        {/* Insiden Kerusakan Asset */}
        <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <p className="text-gray-600 text-sm font-medium mb-2">{t('Insiden Kerusakan Asset')}</p>
              <p className="text-3xl font-bold text-red-500">{stats.active_incidents}</p>
            </div>
            <div className="bg-red-100 rounded-full p-2 flex-shrink-0 ml-2">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Insiden aktif</p>
          </div>
        </div>

        {/* Asset Dalam Pemeliharaan */}
        <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <p className="text-gray-600 text-sm font-medium mb-2">{t('Asset Dalam Pemeliharaan')}</p>
              <p className="text-3xl font-bold text-cyan-500">{stats.assets_in_maintenance}</p>
            </div>
            <div className="bg-cyan-100 rounded-full p-2 flex-shrink-0 ml-2">
              <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
          </div>
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Asset yang sedang dipelihara</p>
          </div>
        </div>

        {/* Asset Hilang */}
        <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <p className="text-gray-600 text-sm font-medium mb-2">{t('Asset Hilang')}</p>
              <p className="text-3xl font-bold text-gray-600">{stats.assets_lost || 0}</p>
            </div>
            <div className="bg-gray-100 rounded-full p-2 flex-shrink-0 ml-2">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Asset yang hilang</p>
          </div>
        </div>

        {/* Akumulasi Depresiasi Asset */}
        <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <p className="text-gray-600 text-sm font-medium mb-2">{t('Akumulasi Depresiasi Asset')}</p>
              <p className="text-3xl font-bold text-purple-600">
                {formatToRupiah(stats.total_accumulated_depreciation)}
              </p>
            </div>
            <div className="bg-purple-100 rounded-full p-2 flex-shrink-0 ml-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4m0 0L3 9m0 8v-8" />
              </svg>
            </div>
          </div>
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Total penurunan nilai asset</p>
          </div>
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
                <YAxis stroke="#666" allowDecimals={false} />
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