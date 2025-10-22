import React, { useState, useEffect } from 'react';
import ComprehensiveReport from './ComprehensiveReport'; // Import komponen baru
import { DownloadIcon } from './icons';
import { useTranslation } from '../hooks/useTranslation';
import {
    getFullAssetReport,
    getMaintenanceReport,
    getRepairReport,
    getLoanReport,
    getDamageReport,
    getSaleReport,
    getLossReport,
    getUnits
} from '../services/api';
import { exportToCsv, exportToPdf } from '../utils/exportUtils';
import { Unit } from '../types';

interface ReportCardProps {
    title: string;
    description: string;
    isLoading?: boolean;
    onExport: (format: 'CSV' | 'PDF') => void;
}

const ReportCard: React.FC<ReportCardProps> = ({ title, description, isLoading, onExport }) => {
    const { t } = useTranslation();

    const buttonContent = (label: string) => (
        <>
            <DownloadIcon />
            <span className="ml-2">{isLoading ? t('reports.exporting') : label}</span>
        </>
    );

    return (
        <div className="bg-white p-6 rounded-xl shadow-md flex flex-col justify-between">
            <div>
                <h3 className="text-xl font-bold text-dark-text">{title}</h3>
                <p className="text-medium-text mt-2">{description}</p>
            </div>
            <div className="mt-6 flex space-x-3">
                <button 
                    onClick={() => onExport('CSV')} 
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center bg-secondary text-white px-4 py-2 rounded-lg shadow hover:bg-green-600 transition-colors disabled:bg-gray-400 disabled:cursor-wait"
                >
                    {buttonContent(t('reports.export_csv'))}
                </button>
                 <button 
                    onClick={() => onExport('PDF')} 
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-wait"
                 >
                    {buttonContent(t('reports.export_pdf'))}
                </button>
            </div>
        </div>
    );
};

// Fungsi format Rupiah
const formatToRupiah = (value: number): string => {
    if (!value || isNaN(value)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
};

// Fungsi format tanggal
const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (error) {
        return 'Invalid Date';
    }
};

// Fungsi untuk memotong teks panjang
const truncateText = (text: string, maxLength: number = 50): string => {
    if (!text) return 'N/A';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

// Helper untuk mendapatkan data yang benar dari response API
const getDataFromResponse = (response: any): any[] => {
    console.log('Raw API Response:', response); // Debug log
    
    // Jika response memiliki structure {success, data, message}
    if (response && typeof response === 'object') {
        if (response.success && Array.isArray(response.data)) {
            return response.data;
        }
        // Jika data langsung berupa array
        if (Array.isArray(response.data)) {
            return response.data;
        }
        // Jika response langsung berupa array
        if (Array.isArray(response)) {
            return response;
        }
    }
    
    console.warn('Invalid response format:', response);
    return [];
};

const ReportView: React.FC = () => {
    const { t } = useTranslation();
    const [loadingReport, setLoadingReport] = useState<string | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1));
    const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
    const [selectedUnit, setSelectedUnit] = useState<string>('all');
    const [units, setUnits] = useState<Unit[]>([]);

    // Fetch units on component mount
    useEffect(() => {
        const fetchUnits = async () => {
            try {
                const fetchedUnits = await getUnits();
                setUnits(fetchedUnits);
            } catch (error) {
                console.error('Failed to fetch units:', error);
            }
        };
        fetchUnits();
    }, []);

    const reports = [
        {
            key: 'full_asset',
            title: t('reports.cards.full_asset.title'),
            description: t('reports.cards.full_asset.description'),
        },
        {
            key: 'maintenance',
            title: t('reports.cards.maintenance.title'),
            description: t('reports.cards.maintenance.description'),
        },
        {
            key: 'repair',
            title: t('reports.cards.repair.title'),
            description: t('reports.cards.repair.description'),
        },
        {
            key: 'loan',
            title: t('reports.cards.loan.title'),
            description: t('reports.cards.loan.description'),
        },
        {
            key: 'damage',
            title: t('reports.cards.damage.title'),
            description: t('reports.cards.damage.description'),
        },
        {
            key: 'sale',
            title: t('reports.cards.sale.title'),
            description: t('reports.cards.sale.description'),
        },
        {
            key: 'loss',
            title: t('reports.cards.loss.title'),
            description: t('reports.cards.loss.description'),
        },
        {
            key: 'comprehensive',
            title: t('reports.cards.comprehensive.title'),
            description: t('reports.cards.comprehensive.description'),
        },
    ];

    const handleExport = async (reportKey: string, format: 'CSV' | 'PDF') => {
        setLoadingReport(reportKey);
        const reportInfo = reports.find(r => r.key === reportKey);
        const reportTitle = reportInfo ? reportInfo.title : 'Report';

        try {
            let headers: string[] = [];
            let data: any[][] = [];
            let filename = `${reportKey}_report_${new Date().toISOString().split('T')[0]}.${format === 'PDF' ? 'pdf' : 'csv'}`;

            console.log(`Exporting ${reportKey} report...`);

            let response;
            switch (reportKey) {
                case 'full_asset': {
                    response = await getFullAssetReport({
                        month: selectedMonth,
                        year: selectedYear,
                        unit_id: selectedUnit !== 'all' ? selectedUnit : undefined
                    });
                    const reportData = getDataFromResponse(response);
                    console.log('Full Asset Data:', reportData); // Debug log
                    
                    headers = [
                        'ID',
                        'Tag Aset',
                        t('reports.headers.name'),
                        t('reports.headers.category'),
                        'Unit',
                        'Nilai Aset Awal',
                        t('reports.headers.purchase_date'),
                        t('reports.headers.useful_life'),
                        t('reports.headers.status'),
                        t('reports.headers.monthly_depreciation'),
                        t('reports.headers.accumulated_depreciation'),
                        t('reports.headers.current_value')
                    ];
                    data = reportData.map((asset: any) => [
                        asset.id || 'N/A',
                        asset.asset_tag || 'N/A',
                        truncateText(asset.name, 30),
                        asset.category || 'N/A',
                        truncateText(asset.unit_name, 20),
                        formatToRupiah(asset.value || 0),
                        formatDate(asset.purchase_date),
                        asset.useful_life ? `${asset.useful_life} bulan` : 'N/A',
                        asset.status || 'N/A',
                        formatToRupiah(asset.monthly_depreciation || 0),
                        formatToRupiah(asset.accumulated_depreciation || 0),
                        formatToRupiah(asset.current_value || 0)
                    ]);
                    break;
                }
                case 'maintenance': {
                    response = await getMaintenanceReport({
                        month: selectedMonth,
                        year: selectedYear,
                        unit_id: selectedUnit !== 'all' ? selectedUnit : undefined
                    });
                    const reportData = getDataFromResponse(response);
                    console.log('Maintenance Data:', reportData); // Debug log
                    
                    headers = [
                        'ID',
                        'Tag Aset',
                        t('reports.headers.asset_name'),
                        'Unit',
                        t('reports.headers.date'),
                        t('reports.headers.description'),
                        'Tipe Pihak',
                        'Instansi',
                        t('reports.headers.status'),
                        'Status Validasi'
                    ];
                    data = reportData.map((m: any) => [
                        m.id || 'N/A',
                        m.asset_tag || 'N/A',
                        truncateText(m.asset_name, 30),
                        truncateText(m.unit_name, 20),
                        formatDate(m.date),
                        truncateText(m.description, 40),
                        m.party_type || 'N/A',
                        m.instansi || 'N/A',
                        m.status || 'N/A',
                        m.validation_status || 'N/A'
                    ]);
                    break;
                }
                case 'repair': {
                    response = await getRepairReport({
                        month: selectedMonth,
                        year: selectedYear,
                        unit_id: selectedUnit !== 'all' ? selectedUnit : undefined
                    });
                    const reportData = getDataFromResponse(response);
                    console.log('Repair Data:', reportData); // Debug log
                    
                    headers = [
                        'ID',
                        'Tag Aset',
                        t('reports.headers.asset_name'),
                        'Unit',
                        t('reports.headers.date'),
                        t('reports.headers.description'),
                        'Tipe Pihak',
                        'Instansi',
                        t('reports.headers.status'),
                        'Status Validasi'
                    ];
                    data = reportData.map((r: any) => [
                        r.id || 'N/A',
                        r.asset_tag || 'N/A',
                        truncateText(r.asset_name, 30),
                        truncateText(r.unit_name, 20),
                        formatDate(r.date),
                        truncateText(r.description, 40),
                        r.party_type || 'N/A',
                        r.instansi || 'N/A',
                        r.status || 'N/A',
                        r.validation_status || 'N/A'
                    ]);
                    break;
                }
                case 'loan': {
                    response = await getLoanReport({
                        month: selectedMonth,
                        year: selectedYear,
                        unit_id: selectedUnit !== 'all' ? selectedUnit : undefined
                    });
                    const reportData = getDataFromResponse(response);
                    console.log('Loan Data:', reportData); // Debug log
                    
                    headers = [
                        'ID',
                        'Tag Aset',
                        t('reports.headers.asset_name'),
                        'Unit',
                        'Peminjam',
                        'Tanggal Permintaan',
                        'Tanggal Pinjam',
                        'Jadwal Kembali',
                        'Tanggal Kembali',
                        t('reports.headers.purpose'),
                        t('reports.headers.status')
                    ];
                    data = reportData.map((l: any) => [
                        l.id || 'N/A',
                        l.asset_tag || 'N/A',
                        truncateText(l.asset_name, 30),
                        truncateText(l.unit_name, 20),
                        l.borrower_name || 'N/A',
                        formatDate(l.request_date),
                        formatDate(l.loan_date),
                        formatDate(l.expected_return_date),
                        l.actual_return_date ? formatDate(l.actual_return_date) : 'N/A',
                        truncateText(l.purpose, 40),
                        l.status || 'N/A'
                    ]);
                    break;
                }
                case 'damage': {
                    response = await getDamageReport({
                        month: selectedMonth,
                        year: selectedYear,
                        unit_id: selectedUnit !== 'all' ? selectedUnit : undefined
                    });
                    const reportData = getDataFromResponse(response);
                    console.log('Damage Data:', reportData); // Debug log
                    
                    headers = [
                        'ID',
                        'Tag Aset',
                        t('reports.headers.asset_name'),
                        'Unit',
                        'Pelapor',
                        t('reports.headers.date'),
                        t('reports.headers.description'),
                        t('reports.headers.status'),
                        'Pihak Bertanggung Jawab'
                    ];
                    data = reportData.map((d: any) => [
                        d.id || 'N/A',
                        d.asset_tag || 'N/A',
                        truncateText(d.asset_name, 30),
                        truncateText(d.unit_name, 20),
                        d.reporter_name || 'N/A',
                        formatDate(d.date),
                        truncateText(d.description, 40),
                        d.status || 'N/A',
                        d.responsible_party || 'N/A'
                    ]);
                    break;
                }
                case 'sale': {
                    response = await getSaleReport({
                        month: selectedMonth,
                        year: selectedYear,
                        unit_id: selectedUnit !== 'all' ? selectedUnit : undefined
                    });
                    const reportData = getDataFromResponse(response);
                    console.log('Sale Data:', reportData); // Debug log
                    
                    headers = [
                        'ID',
                        'Tag Aset',
                        t('reports.headers.asset_name'),
                        'Unit',
                        'Nilai Asli',
                        'Nilai Buku',
                        'Harga Jual',
                        'Laba/Rugi',
                        'Tanggal Jual',
                        'Nama Pembeli'
                    ];
                    data = reportData.map((s: any) => [
                        s.id || 'N/A',
                        s.asset_tag || 'N/A',
                        truncateText(s.asset_name, 30),
                        truncateText(s.unit_name, 20),
                        formatToRupiah(s.original_value || 0),
                        formatToRupiah(s.book_value || 0),
                        formatToRupiah(s.sale_price || 0),
                        formatToRupiah(s.profit_loss || 0),
                        formatDate(s.sale_date),
                        s.buyer_name || 'N/A'
                    ]);
                    break;
                }
                case 'loss': {
                    response = await getLossReport({
                        month: selectedMonth,
                        year: selectedYear,
                        unit_id: selectedUnit !== 'all' ? selectedUnit : undefined
                    });
                    const reportData = getDataFromResponse(response);
                    console.log('Loss Data:', reportData); // Debug log
                    
                    headers = [
                        'ID',
                        'Tag Aset',
                        t('reports.headers.asset_name'),
                        'Unit',
                        'Nilai Asli',
                        'Nilai saat Hilang',
                        'Pelapor',
                        t('reports.headers.date'),
                        t('reports.headers.description'),
                        t('reports.headers.status'),
                        'Pihak Bertanggung Jawab'
                    ];
                    data = reportData.map((l: any) => [
                        l.id || 'N/A',
                        l.asset_tag || 'N/A',
                        truncateText(l.asset_name, 30),
                        truncateText(l.unit_name, 20),
                        formatToRupiah(l.original_value || 0),
                        formatToRupiah(l.value_at_loss || 0),
                        l.reporter_name || 'N/A',
                        formatDate(l.date),
                        truncateText(l.description, 40),
                        l.status || 'N/A',
                        l.responsible_party || 'N/A'
                    ]);
                    break;
                }
                default:
                    console.warn(`Unknown report key: ${reportKey}`);
                    setLoadingReport(null);
                    return;
            }

            // Check if data is empty
            if (data.length === 0) {
                alert('Tidak ada data untuk diexport. Silakan coba lagi atau periksa koneksi Anda.');
                setLoadingReport(null);
                return;
            }

            console.log(`Exporting ${data.length} rows to ${format}`);

            if (format === 'PDF') {
                exportToPdf(filename, reportTitle, headers, data);
            }
            else {
                exportToCsv(filename, headers, data);
            }
        } catch (error) {
            console.error(`Failed to export report ${reportKey}:`, error);
            alert(`Tidak dapat menghasilkan report. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setLoadingReport(null);
        }
    };

    // State untuk menampilkan laporan komprehensif
    const [showComprehensive, setShowComprehensive] = useState(false);

    if (showComprehensive) return <ComprehensiveReport />;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-4xl font-bold text-dark-text">{t('reports.title')}</h1>
                <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                        <label htmlFor="unit-select" className="text-sm font-medium text-gray-700">Unit:</label>
                        <select
                            id="unit-select"
                            value={selectedUnit}
                            onChange={(e) => setSelectedUnit(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white shadow-sm"
                        >
                            <option value="all">Semua Unit</option>
                            {units.map((unit) => (
                                <option key={unit.id} value={unit.id}>
                                    {unit.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center space-x-2">
                        <label htmlFor="month-select" className="text-sm font-medium text-gray-700">Bulan:</label>
                        <select
                            id="month-select"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white shadow-sm"
                        >
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('id-ID', { month: 'long' })}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center space-x-2">
                        <label htmlFor="year-select" className="text-sm font-medium text-gray-700">Tahun:</label>
                        <input
                            type="number"
                            id="year-select"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white shadow-sm"
                        />
                    </div>
                </div>
            </div>
            <p className="text-lg text-medium-text">{t('reports.description')}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reports.map(report => (
                    report.key === 'comprehensive' ? (
                        <div key={report.key} className="bg-white p-6 rounded-xl shadow-md flex flex-col justify-between cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setShowComprehensive(true)}>
                             <div>
                                <h3 className="text-xl font-bold text-dark-text">{report.title}</h3>
                                <p className="text-medium-text mt-2">{report.description}</p>
                            </div>
                            <div className="mt-6">
                                <button className="w-full bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary-dark transition-colors">
                                    Buka Laporan
                                </button>
                            </div>
                        </div>
                    ) : (
                        <ReportCard 
                            key={report.key}
                            title={report.title} 
                            description={report.description}
                            isLoading={loadingReport === report.key}
                            onExport={(format) => handleExport(report.key, format)} 
                        />
                    )
                ))}
            </div>
        </div>
    );
};

export default ReportView;