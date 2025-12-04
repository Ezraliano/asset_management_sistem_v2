import React, { useState, useEffect } from 'react';
import { getGuaranteeStats, getGuaranteeUnits } from '../services/api';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface GuaranteeDashboardProps {
  navigateTo?: (view: any) => void;
  user?: any;
}

interface BarChartData {
  name: string;
  count: number;
  color?: string;
}

interface DonutChartData {
  [key: string]: string | number;
  name: string;
  value: number;
}

interface Unit {
  id: number;
  code: string;
  name: string;
  description?: string;
  location?: string;
  is_active: boolean;
}

const GuaranteeDashboard: React.FC<GuaranteeDashboardProps> = ({ navigateTo, user }) => {
  const [stats, setStats] = useState({
    available: 0,
    dipinjam: 0,
    lunas: 0,
    total: 0,
  });
  const [typeData, setTypeData] = useState<BarChartData[]>([]);
  const [statusData, setStatusData] = useState<DonutChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<number | ''>('');
  const [units, setUnits] = useState<Unit[]>([]);

  // Color mapping for guarantee types
  const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      'BPKB': '#3b82f6',    // Blue
      'SHM': '#10b981',     // Green
      'SHGB': '#8b5cf6',    // Purple
      'E-SHM': '#f59e0b',   // Orange
    };
    return colors[type] || '#6b7280';
  };

  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const unitsList = await getGuaranteeUnits();
        if (unitsList) {
          setUnits(unitsList);
        }
      } catch (err: any) {
        console.error('Error fetching units:', err);
      }
    };

    fetchUnits();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const guaranteeStats = await getGuaranteeStats(selectedUnit);

        if (guaranteeStats && guaranteeStats.by_status) {
          const availableCount = guaranteeStats.by_status.available || 0;
          const dipinjamCount = guaranteeStats.by_status.dipinjam || 0;
          const lunasCount = guaranteeStats.by_status.lunas || 0;

          setStats({
            available: availableCount,
            dipinjam: dipinjamCount,
            lunas: lunasCount,
            total: guaranteeStats.total || 0,
          });

          // Prepare data untuk Bar Chart (Tipe Jaminan)
          if (guaranteeStats.by_type) {
            const typeChartData: BarChartData[] = [
              { name: 'BPKB', count: guaranteeStats.by_type.BPKB || 0, color: getTypeColor('BPKB') },
              { name: 'SHM', count: guaranteeStats.by_type.SHM || 0, color: getTypeColor('SHM') },
              { name: 'SHGB', count: guaranteeStats.by_type.SHGB || 0, color: getTypeColor('SHGB') },
              { name: 'E-SHM', count: guaranteeStats.by_type['E-SHM'] || 0, color: getTypeColor('E-SHM') },
            ];
            setTypeData(typeChartData);
          }

          // Prepare data untuk Donut Chart (Status Jaminan)
          const statusChartData: DonutChartData[] = [
            { name: 'Tersedia', value: availableCount },
            { name: 'Dipinjam', value: dipinjamCount },
            { name: 'Lunas', value: lunasCount },
          ];
          setStatusData(statusChartData);
        }
      } catch (err: any) {
        console.error('Error fetching guarantee stats:', err);
        setError('Gagal memuat data statistik jaminan');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Refresh stats setiap 5 menit
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedUnit]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard Jaminan Asset</h1>
          <p className="text-gray-600">Kelola data jaminan asuransi untuk semua aset perusahaan</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-10 bg-gray-200 rounded mb-4 w-20"></div>
              <div className="h-6 bg-gray-200 rounded w-32"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header with Unit Filter */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1 md:mb-2">Dashboard Jaminan Asset</h1>
            <p className="text-sm md:text-base text-gray-600">Kelola data jaminan asuransi untuk semua aset perusahaan</p>
          </div>
          {units.length > 0 && user?.role !== 'admin-kredit' && (
            <div className="w-full md:w-auto">
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter Unit</label>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value ? parseInt(e.target.value) : '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Semua Unit</option>
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

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Jaminan Tersedia - Green */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-xs md:text-sm font-medium mb-2">Jaminan Tersedia</p>
              <p className="text-3xl md:text-4xl font-bold text-green-600">{stats.available}</p>
            </div>
            <div className="bg-green-100 rounded-full p-2 md:p-3">
              <svg className="w-5 h-5 md:w-6 md:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">Jaminan Yang Tersedia</p>
          </div>
        </div>

        {/* Jaminan Dipinjam - Yellow */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-xs md:text-sm font-medium mb-2">Jaminan Dipinjam</p>
              <p className="text-3xl md:text-4xl font-bold text-yellow-600">{stats.dipinjam}</p>
            </div>
            <div className="bg-yellow-100 rounded-full p-2 md:p-3">
              <svg className="w-5 h-5 md:w-6 md:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">Jaminan sedang dalam peminjaman</p>
          </div>
        </div>

        {/* Jaminan Lunas - Blue */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-xs md:text-sm font-medium mb-2">Jaminan Lunas</p>
              <p className="text-3xl md:text-4xl font-bold text-blue-600">{stats.lunas}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-2 md:p-3">
              <svg className="w-5 h-5 md:w-6 md:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">Jaminan sudah dikembalikan/lunas</p>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-gray-700 text-sm md:text-base font-medium mb-2">Total Jaminan</p>
            <p className="text-2xl md:text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-3 gap-4 md:gap-6 text-sm md:text-right">
            <div className="md:text-right">
              <p className="text-gray-600">{stats.available}</p>
              <p className="text-xs text-gray-500">tersedia</p>
            </div>
            <div className="md:text-right">
              <p className="text-gray-600">{stats.dipinjam}</p>
              <p className="text-xs text-gray-500">dipinjam</p>
            </div>
            <div className="md:text-right">
              <p className="text-gray-600">{stats.lunas}</p>
              <p className="text-xs text-gray-500">lunas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Bar Chart - Tipe Jaminan */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4">Total Jaminan Berdasarkan Tipe</h2>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#666" />
                <YAxis stroke="#666" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                  formatter={(value) => [`${value}`, 'Jumlah']}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-300 flex items-center justify-center text-gray-500">
              Tidak ada data jaminan
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex flex-wrap gap-4 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
                <span className="text-xs text-gray-600">BPKB</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10b981' }}></div>
                <span className="text-xs text-gray-600">SHM</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#8b5cf6' }}></div>
                <span className="text-xs text-gray-600">SHGB</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
                <span className="text-xs text-gray-600">E-SHM</span>
              </div>
            </div>
            <p className="text-xs text-gray-600">Data jaminan berdasarkan tipe</p>
          </div>
        </div>

        {/* Donut Chart - Status Jaminan */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4">Distribusi Status Jaminan</h2>
          {statusData.length > 0 && statusData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#f59e0b" />
                  <Cell fill="#3b82f6" />
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                  formatter={(value) => [`${value}`, 'Jumlah']}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-300 flex items-center justify-center text-gray-500">
              Tidak ada data status jaminan
            </div>
          )}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs md:text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 md:w-3 md:h-3 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
                <span className="text-gray-600">Tersedia: {stats.available}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 md:w-3 md:h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }}></div>
                <span className="text-gray-600">Dipinjam: {stats.dipinjam}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 md:w-3 md:h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div>
                <span className="text-gray-600">Lunas: {stats.lunas}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuaranteeDashboard;
