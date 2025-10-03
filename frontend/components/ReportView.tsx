import React, { useState } from 'react';
import { DownloadIcon } from './icons';
import { useTranslation } from '../hooks/useTranslation';
import { getAssets, getAllMaintenance, getAllMovements, getAllDamageReports, getAllLossReports } from '../services/api';
import { exportToCsv, exportToPdf } from '../utils/exportUtils';
import { calculateDepreciation } from '../utils/depreciation';

interface ReportCardProps {
    title: string;
    description: string;
    isLoading: boolean;
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

const ReportView: React.FC = () => {
    const { t } = useTranslation();
    const [loadingReport, setLoadingReport] = useState<string | null>(null);
    
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
            key: 'audit',
            title: t('reports.cards.audit.title'),
            description: t('reports.cards.audit.description'),
        },
        {
            key: 'damage_loss',
            title: t('reports.cards.damage_loss.title'),
            description: t('reports.cards.damage_loss.description'),
        },
    ];

    const handleExport = async (reportKey: string, format: 'CSV' | 'PDF') => {
        setLoadingReport(reportKey);
        const reportInfo = reports.find(r => r.key === reportKey);
        const reportTitle = reportInfo ? reportInfo.title : 'Report';
        
        try {
            const allAssets = await getAssets();
            const assetMap = new Map(allAssets.map(asset => [asset.id, asset]));
            let headers: string[] = [];
            let data: any[][] = [];
            let filename = `${reportKey}_report_${new Date().toISOString().split('T')[0]}.${format === 'PDF' ? 'pdf' : 'csv'}`;

            switch (reportKey) {
                case 'full_asset': {
                    headers = [
                        t('reports.headers.id'), 
                        t('reports.headers.name'), 
                        t('reports.headers.category'), 
                        t('reports.headers.location'), 
                        t('reports.headers.value'), 
                        t('reports.headers.purchase_date'), 
                        t('reports.headers.useful_life'), 
                        t('reports.headers.status'), 
                        t('reports.headers.monthly_depreciation'), 
                        t('reports.headers.accumulated_depreciation'), 
                        t('reports.headers.current_value')
                    ];
                    data = allAssets.map(asset => {
                        const { monthlyDepreciation, accumulatedDepreciation, currentValue } = calculateDepreciation(asset);
                        
                        // Format data dengan field yang benar dari backend
                        return [
                            asset.id, 
                            truncateText(asset.name, 30), // Potong nama yang terlalu panjang
                            asset.category, 
                            truncateText(asset.location, 25), // Potong lokasi yang terlalu panjang
                            formatToRupiah(asset.value),
                            formatDate(asset.purchase_date),
                            asset.useful_life ? `${asset.useful_life} bulan` : 'N/A',
                            asset.status,
                            formatToRupiah(monthlyDepreciation),
                            formatToRupiah(accumulatedDepreciation), 
                            formatToRupiah(currentValue)
                        ];
                    });
                    break;
                }
                case 'maintenance': {
                    const allMaintenance = await getAllMaintenance();
                    headers = [
                        t('reports.headers.asset_id'), 
                        t('reports.headers.asset_name'), 
                        t('reports.headers.date'), 
                        t('reports.headers.description'), 
                        t('reports.headers.status')
                    ];
                    data = allMaintenance.map(m => [
                        m.assetId, 
                        truncateText(assetMap.get(m.assetId)?.name || 'N/A', 30), 
                        formatDate(m.date), 
                        truncateText(m.description, 40), // Potong deskripsi yang panjang
                        m.status
                    ]);
                    break;
                }
                case 'audit': {
                    const allMovements = await getAllMovements();
                    headers = [
                        t('reports.headers.asset_id'), 
                        t('reports.headers.asset_name'), 
                        t('reports.headers.new_location'), 
                        t('reports.headers.moved_by'), 
                        t('reports.headers.moved_at')
                    ];
                    data = allMovements.map(m => [
                        m.assetId, 
                        truncateText(assetMap.get(m.assetId)?.name || 'N/A', 30), 
                        truncateText(m.location, 25), 
                        truncateText(m.movedBy, 20), 
                        formatDate(m.movedAt)
                    ]);
                    break;
                }
                case 'damage_loss': {
                    const [damageReports, lossReports] = await Promise.all([getAllDamageReports(), getAllLossReports()]);
                    headers = [
                        t('reports.headers.type'), 
                        t('reports.headers.asset_id'), 
                        t('reports.headers.asset_name'), 
                        t('reports.headers.description'), 
                        t('reports.headers.date'), 
                        t('reports.headers.status')
                    ];
                    const damageData = damageReports.map(d => [
                        'Damage', 
                        d.assetId, 
                        truncateText(assetMap.get(d.assetId)?.name || 'N/A', 30), 
                        truncateText(d.description, 40), 
                        formatDate(d.date), 
                        d.status
                    ]);
                    const lossData = lossReports.map(l => [
                        'Loss', 
                        l.assetId, 
                        truncateText(assetMap.get(l.assetId)?.name || 'N/A', 30), 
                        truncateText(l.description, 40), 
                        formatDate(l.date), 
                        l.status
                    ]);
                    data = [...damageData, ...lossData];
                    break;
                }
                default:
                    console.warn(`Unknown report key: ${reportKey}`);
                    setLoadingReport(null);
                    return;
            }

            if (format === 'PDF') {
                exportToPdf(filename, reportTitle, headers, data);
            } else {
                exportToCsv(filename, headers, data);
            }
        } catch (error) {
            console.error(`Failed to export report ${reportKey}:`, error);
            alert(`Could not generate report. See console for details.`);
        } finally {
            setLoadingReport(null);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-4xl font-bold text-dark-text">{t('reports.title')}</h1>
            <p className="text-lg text-medium-text">{t('reports.description')}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reports.map(report => (
                    <ReportCard 
                        key={report.key}
                        title={report.title} 
                        description={report.description}
                        isLoading={loadingReport === report.key}
                        onExport={(format) => handleExport(report.key, format)} 
                    />
                ))}
            </div>
        </div>
    );
};

export default ReportView;