import React, { useState, useEffect } from 'react';
import { getGuaranteeStats } from '../services/api';

interface GuaranteeDashboardProps {
  navigateTo?: (view: any) => void;
}

const GuaranteeDashboard: React.FC<GuaranteeDashboardProps> = ({ navigateTo }) => {
  const [stats, setStats] = useState({
    available: 0,
    dipinjam: 0,
    lunas: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const guaranteeStats = await getGuaranteeStats();

        if (guaranteeStats && guaranteeStats.by_status) {
          setStats({
            available: guaranteeStats.by_status.available || 0,
            dipinjam: guaranteeStats.by_status.dipinjam || 0,
            lunas: guaranteeStats.by_status.lunas || 0,
            total: guaranteeStats.total || 0,
          });
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
  }, []);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard Jaminan Asset</h1>
        <p className="text-gray-600">Kelola data jaminan asuransi untuk semua aset perusahaan</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Jaminan Tersedia - Green */}
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-2">Jaminan Tersedia</p>
              <p className="text-4xl font-bold text-green-600">{stats.available}</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">Jaminan siap dipinjamkan</p>
          </div>
        </div>

        {/* Jaminan Dipinjam - Yellow */}
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-2">Jaminan Dipinjam</p>
              <p className="text-4xl font-bold text-yellow-600">{stats.dipinjam}</p>
            </div>
            <div className="bg-yellow-100 rounded-full p-3">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">Jaminan sedang dalam peminjaman</p>
          </div>
        </div>

        {/* Jaminan Lunas - Blue */}
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-2">Jaminan Lunas</p>
              <p className="text-4xl font-bold text-blue-600">{stats.lunas}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-700 font-medium mb-2">Total Jaminan</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p>{stats.available} tersedia</p>
            <p>{stats.dipinjam} dipinjam</p>
            <p>{stats.lunas} lunas</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuaranteeDashboard;
