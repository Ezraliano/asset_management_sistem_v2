import React, { useState, useEffect } from 'react';
import { getAllReports } from '../services/api'; // Anda perlu membuat fungsi ini di api.ts
import { useTranslation } from '../hooks/useTranslation';

// Definisikan tipe data untuk laporan komprehensif
interface ComprehensiveReportData {
  assets: any;
  maintenance: any;
  repair: any;
  loan: any;
  damage: any;
  sale: any;
  loss: any;
}

const ComprehensiveReport: React.FC = () => {
  const [reportData, setReportData] = useState<ComprehensiveReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<keyof ComprehensiveReportData>('assets');
  const { t } = useTranslation();

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        // Panggil fungsi API untuk mendapatkan semua laporan
        const response = await getAllReports(); // Asumsi fungsi ini mengembalikan data dari endpoint /reports/all
        if (response.success) {
          setReportData(response.data);
        } else {
          throw new Error(response.message || 'Gagal mengambil data laporan');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, []);

  const renderTabContent = () => {
    if (!reportData) return null;

    const currentData = reportData[activeTab];
    if (!currentData || !currentData.data) {
      return <p className="text-gray-500">Tidak ada data untuk ditampilkan.</p>;
    }

    const dataRows = currentData.data;
    const summary = currentData.summary;
    const headers = dataRows.length > 0 ? Object.keys(dataRows[0]) : [];

    return (
      <div>
        {/* Tampilkan Ringkasan (Summary) */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            {Object.entries(summary).map(([key, value]) => (
              <div key={key}>
                <p className="text-sm text-gray-600 capitalize">{key.replace(/_/g, ' ')}</p>
                <p className="text-xl font-bold text-gray-800">{typeof value === 'number' ? value.toLocaleString('id-ID') : value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tampilkan Tabel Data */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                {headers.map(header => (
                  <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {header.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dataRows.map((row: any, index: number) => (
                <tr key={row.id || index}>
                  {headers.map(header => (
                    <td key={`${header}-${row.id || index}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {typeof row[header] === 'boolean' ? (row[header] ? 'Yes' : 'No') : row[header] ?? 'N/A'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="text-center p-8">Memuat laporan lengkap...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">Error: {error}</div>;
  }

  const tabs: { key: keyof ComprehensiveReportData; label: string }[] = [
    { key: 'assets', label: 'Daftar Aset' },
    { key: 'maintenance', label: 'Pemeliharaan' },
    { key: 'repair', label: 'Perbaikan' },
    { key: 'loan', label: 'Peminjaman' },
    { key: 'damage', label: 'Kerusakan' },
    { key: 'loss', label: 'Kehilangan' },
    { key: 'sale', label: 'Penjualan' },
  ];

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">{t('reports.cards.comprehensive.title')}</h1>
      
      {/* Navigasi Tab */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label} ({reportData?.[tab.key]?.summary?.total_assets ?? reportData?.[tab.key]?.data?.length ?? 0})
            </button>
          ))}
        </nav>
      </div>

      {/* Konten Tab */}
      <div className="mt-6">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default ComprehensiveReport;