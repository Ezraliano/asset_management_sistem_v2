
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getDashboardStats } from '../services/api';
import { View } from '../types';
import { PlusIcon, QRIcon } from './icons';
import { useTranslation } from '../hooks/useTranslation';
import { formatToRupiah } from '../utils/formatters';

interface DashboardProps {
  navigateTo: (view: View) => void;
}

interface StatData {
  totalAssets: number;
  totalAssetValue: number;
  inRepair: number;
  disposed: number;
  byCategory: { name: string, value: number }[];
  byLocation: { name: string, value: number }[];
}

const StatCard: React.FC<{ title: string; value: string | number; color: string }> = ({ title, value, color }) => (
    <div className="bg-white p-6 rounded-xl shadow-md flex flex-col">
        <h3 className="text-lg font-medium text-medium-text">{title}</h3>
        <p className={`text-4xl font-bold ${color}`}>{value}</p>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ navigateTo }) => {
    const { t } = useTranslation();
    const [stats, setStats] = useState<StatData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            const data = await getDashboardStats();
            setStats(data);
            setLoading(false);
        };
        fetchStats();
    }, []);

    if (loading || !stats) {
        return <div className="flex justify-center items-center h-full">Loading...</div>;
    }

    const PIE_CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-4xl font-bold text-dark-text">{t('dashboard.title')}</h1>
                 <div className="flex space-x-4">
                    <button onClick={() => navigateTo({type: 'ASSET_LIST'})} className="flex items-center bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary-dark transition-colors">
                        <PlusIcon />
                        <span className="ml-2">{t('dashboard.add_asset')}</span>
                    </button>
                    <button onClick={() => navigateTo({type: 'QR_SCANNER'})} className="flex items-center bg-secondary text-white px-4 py-2 rounded-lg shadow hover:bg-green-600 transition-colors">
                        <QRIcon />
                        <span className="ml-2">{t('dashboard.scan_asset')}</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title={t('dashboard.total_assets')} value={stats.totalAssets} color="text-primary" />
                <StatCard title={t('dashboard.total_asset_value')} value={formatToRupiah(stats.totalAssetValue)} color="text-indigo-500" />
                <StatCard title={t('dashboard.assets_in_repair')} value={stats.inRepair} color="text-yellow-500" />
                <StatCard title={t('dashboard.assets_disposed')} value={stats.disposed} color="text-red-500" />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h2 className="text-2xl font-semibold mb-4 text-dark-text">{t('dashboard.assets_by_category')}</h2>
                    <div style={{ width: '100%', height: 400 }}>
                        <ResponsiveContainer>
                            <BarChart data={stats.byCategory} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="value" fill="#3B82F6" name={t('dashboard.number_of_assets')} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h2 className="text-2xl font-semibold mb-4 text-dark-text">{t('dashboard.assets_by_location')}</h2>
                    <div style={{ width: '100%', height: 400 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={stats.byLocation}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={150}
                                    fill="#8884d8"
                                    dataKey="value"
                                    nameKey="name"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {stats.byLocation.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;