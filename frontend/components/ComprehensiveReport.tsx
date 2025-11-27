import React, { useState, useEffect } from 'react';
import { getAllReports } from '../services/api'; // Anda perlu membuat fungsi ini di api.ts
import { useTranslation } from '../hooks/useTranslation';
import { exportToPdf } from '../utils/exportUtils';
import { formatToRupiah } from '../utils/formatters';

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

// Mapping kolom dengan label bahasa Indonesia
const COLUMN_LABELS: { [key: string]: string } = {
  id: 'No.',
  asset_id: 'ID Aset',
  asset_tag: 'Tag Aset',
  name: 'Nama Aset',
  category: 'Kategori',
  unit_name: 'Unit',
  value: 'Nilai Awal',
  purchase_date: 'Tanggal Pembelian',
  useful_life: 'Umur Manfaat (Tahun)',
  status: 'Status',
  monthly_depreciation: 'Depresiasi Bulanan',
  accumulated_depreciation: 'Depresiasi Akumulasi',
  current_value: 'Nilai Saat Ini',
  depreciation_percentage: 'Persentase Depresiasi',
  // Kolom untuk maintenance
  maintenance_date: 'Tanggal Pemeliharaan',
  maintenance_description: 'Deskripsi',
  maintenance_status: 'Status',
  // Kolom untuk repair
  repair_date: 'Tanggal Perbaikan',
  repair_description: 'Deskripsi',
  repair_status: 'Status',
  // Kolom untuk loan
  loan_date: 'Tanggal Peminjaman',
  loan_borrower: 'Peminjam',
  loan_return_date: 'Tanggal Pengembalian',
  // Kolom untuk damage
  damage_date: 'Tanggal Kerusakan',
  damage_description: 'Deskripsi',
  damage_status: 'Status',
  // Kolom untuk loss
  loss_date: 'Tanggal Kehilangan',
  loss_description: 'Deskripsi',
  loss_status: 'Status',
  // Kolom untuk sale
  sale_date: 'Tanggal Penjualan',
  sale_price: 'Harga Jual',
  sale_status: 'Status',
};

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

  // Format value untuk currency (Rupiah)
  const formatCellValue = (value: any, header: string): string => {
    if (value === null || value === undefined) return 'N/A';

    // Format currency untuk kolom nilai/harga
    if (['value', 'monthly_depreciation', 'accumulated_depreciation', 'current_value', 'sale_price'].includes(header)) {
      if (typeof value === 'number') {
        return formatToRupiah(value);
      }
    }

    // Format persentase dengan pembulatan ke bawah (floor)
    if (header === 'depreciation_percentage' && typeof value === 'number') {
      return `${Math.floor(value)}%`;
    }

    // Format tanggal
    if (['purchase_date', 'maintenance_date', 'repair_date', 'loan_date', 'damage_date', 'loss_date', 'sale_date', 'loan_return_date'].includes(header)) {
      if (value) {
        const date = new Date(value);
        return date.toLocaleDateString('id-ID');
      }
    }

    // Format boolean
    if (typeof value === 'boolean') {
      return value ? 'Ya' : 'Tidak';
    }

    return String(value);
  };

  // Fungsi untuk download PDF
  const handleDownloadPdf = () => {
    if (!reportData) return;

    const currentData = reportData[activeTab];
    if (!currentData || !currentData.data) {
      alert('Tidak ada data untuk diunduh');
      return;
    }

    const dataRows = currentData.data;
    const headers = dataRows.length > 0 ? Object.keys(dataRows[0]) : [];

    // Gunakan label Indonesia untuk headers
    const headerLabels = headers.map(header => COLUMN_LABELS[header] || header.replace(/_/g, ' '));

    // Format data untuk PDF
    const pdfData = dataRows.map((row: any) =>
      headers.map(header => formatCellValue(row[header], header))
    );

    // Tentukan judul berdasarkan tab aktif
    const tabTitles: { [key: string]: string } = {
      assets: 'Laporan Aset Lengkap',
      maintenance: 'Laporan Pemeliharaan Aset',
      repair: 'Laporan Perbaikan Aset',
      loan: 'Laporan Peminjaman Aset',
      damage: 'Laporan Kerusakan Aset',
      loss: 'Laporan Kehilangan Aset',
      sale: 'Laporan Penjualan Aset',
    };

    const title = tabTitles[activeTab] || 'Laporan Aset';
    const filename = `${title}-${new Date().toISOString().split('T')[0]}.pdf`;

    exportToPdf(filename, title, headerLabels, pdfData);
  };

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
        {/* Tombol Download PDF */}
        <div className="mb-4">
          <button
            onClick={handleDownloadPdf}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 16.5a1 1 0 11-2 0 1 1 0 012 0zM15 7H4v2h11V7zm0 4H4v2h11v-2z" />
            </svg>
            Download PDF
          </button>
        </div>

        {/* Tampilkan Ringkasan (Summary) */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            {Object.entries(summary).map(([key, value]) => (
              <div key={key}>
                <p className="text-sm text-gray-600 capitalize">{COLUMN_LABELS[key] || key.replace(/_/g, ' ')}</p>
                <p className="text-xl font-bold text-gray-800">
                  {typeof value === 'number' ?
                    (key.includes('depreciation') || key.includes('value') ? formatToRupiah(value as number) : (value as number).toLocaleString('id-ID'))
                    : String(value)}
                </p>
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
                    {COLUMN_LABELS[header] || header.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dataRows.map((row: any, index: number) => (
                <tr key={row.id || index}>
                  {headers.map(header => (
                    <td key={`${header}-${row.id || index}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatCellValue(row[header], header)}
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