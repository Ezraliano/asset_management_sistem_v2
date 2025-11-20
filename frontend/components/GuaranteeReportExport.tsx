import React, { useState, useEffect } from 'react';
import { Guarantee } from '../types';
import { getGuarantees, getGuaranteeLoans, getGuaranteeSettlements } from '../services/api';
import {
  exportGuaranteeIncomeToPdf,
  exportGuaranteeIncomeToExcel,
  exportGuaranteeLoanToPdf,
  exportGuaranteeLoanToExcel,
  exportGuaranteeSettlementToPdf,
  exportGuaranteeSettlementToExcel,
} from '../utils/guaranteeExportUtils';

interface GuaranteeReportExportProps {
  isOpen: boolean;
  onClose: () => void;
}

type ReportType = 'income' | 'loan' | 'settlement';
type ExportFormat = 'pdf' | 'excel';

const GuaranteeReportExport: React.FC<GuaranteeReportExportProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('income');
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Reset messages setelah beberapa detik
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleExport = async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('Token tidak ditemukan. Silakan login kembali.');
        setLoading(false);
        return;
      }

      let filename = '';
      const today = new Date().toISOString().split('T')[0];

      if (selectedReport === 'income') {
        filename = `Laporan_Jaminan_Masuk_${today}`;
        const response = await getGuarantees({ per_page: 1000 });
        const guarantees: Guarantee[] = response.guarantees || [];

        if (guarantees.length === 0) {
          setError('Tidak ada data jaminan untuk diekspor');
          setLoading(false);
          return;
        }

        if (selectedFormat === 'pdf') {
          exportGuaranteeIncomeToPdf(`${filename}.pdf`, guarantees);
        } else {
          exportGuaranteeIncomeToExcel(`${filename}.xlsx`, guarantees);
        }
      } else if (selectedReport === 'loan') {
        filename = `Laporan_Jaminan_Dipinjam_${today}`;
        const result = await getGuaranteeLoans({ per_page: 1000 });
        const loanData = result.loans || [];

        if (!Array.isArray(loanData) || loanData.length === 0) {
          setError('Tidak ada data peminjaman jaminan untuk diekspor');
          setLoading(false);
          return;
        }

        if (selectedFormat === 'pdf') {
          exportGuaranteeLoanToPdf(`${filename}.pdf`, loanData);
        } else {
          exportGuaranteeLoanToExcel(`${filename}.xlsx`, loanData);
        }
      } else if (selectedReport === 'settlement') {
        filename = `Laporan_Jaminan_Lunas_${today}`;
        const result = await getGuaranteeSettlements({ per_page: 1000 });
        const settlementData = result.settlements || [];

        if (!Array.isArray(settlementData) || settlementData.length === 0) {
          setError('Tidak ada data pelunasan jaminan untuk diekspor');
          setLoading(false);
          return;
        }

        if (selectedFormat === 'pdf') {
          exportGuaranteeSettlementToPdf(`${filename}.pdf`, settlementData);
        } else {
          exportGuaranteeSettlementToExcel(`${filename}.xlsx`, settlementData);
        }
      }

      setSuccessMessage(
        `Laporan ${getReportLabel(selectedReport)} berhasil diunduh dalam format ${selectedFormat.toUpperCase()}`
      );

      // Close modal after 1.5 seconds
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Export error:', err);
      setError(
        err.message || 'Gagal mengekspor laporan. Silakan coba lagi.'
      );
    } finally {
      setLoading(false);
    }
  };

  const getReportLabel = (type: ReportType): string => {
    const labels: Record<ReportType, string> = {
      income: 'Jaminan Masuk',
      loan: 'Jaminan Dipinjam',
      settlement: 'Jaminan Lunas',
    };
    return labels[type];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Download Laporan Jaminan</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-500 hover:text-gray-700 text-2xl disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">
              {error}
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-800 text-sm">
              {successMessage}
            </div>
          )}

          {/* Report Type Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Pilih Jenis Laporan
            </label>
            <div className="space-y-2">
              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                <input
                  type="radio"
                  name="report"
                  value="income"
                  checked={selectedReport === 'income'}
                  onChange={(e) => setSelectedReport(e.target.value as ReportType)}
                  disabled={loading}
                  className="w-4 h-4 text-primary"
                />
                <span className="ml-3 text-gray-700">
                  <div className="font-medium">Jaminan Masuk (Tersedia)</div>
                  <div className="text-xs text-gray-500">Data semua jaminan yang sudah diinput</div>
                </span>
              </label>

              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                <input
                  type="radio"
                  name="report"
                  value="loan"
                  checked={selectedReport === 'loan'}
                  onChange={(e) => setSelectedReport(e.target.value as ReportType)}
                  disabled={loading}
                  className="w-4 h-4 text-primary"
                />
                <span className="ml-3 text-gray-700">
                  <div className="font-medium">Jaminan Dipinjam</div>
                  <div className="text-xs text-gray-500">Data jaminan yang sedang dipinjamkan</div>
                </span>
              </label>

              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                <input
                  type="radio"
                  name="report"
                  value="settlement"
                  checked={selectedReport === 'settlement'}
                  onChange={(e) => setSelectedReport(e.target.value as ReportType)}
                  disabled={loading}
                  className="w-4 h-4 text-primary"
                />
                <span className="ml-3 text-gray-700">
                  <div className="font-medium">Jaminan Lunas</div>
                  <div className="text-xs text-gray-500">Data jaminan yang sudah dikembalikan/lunas</div>
                </span>
              </label>
            </div>
          </div>

          {/* Export Format Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Pilih Format Ekspor
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                <input
                  type="radio"
                  name="format"
                  value="pdf"
                  checked={selectedFormat === 'pdf'}
                  onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
                  disabled={loading}
                  className="w-4 h-4 text-primary"
                />
                <span className="ml-2 text-gray-700">
                  <div className="font-medium text-sm">PDF</div>
                  <div className="text-xs text-gray-500">File PDF</div>
                </span>
              </label>

              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                <input
                  type="radio"
                  name="format"
                  value="excel"
                  checked={selectedFormat === 'excel'}
                  onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
                  disabled={loading}
                  className="w-4 h-4 text-primary"
                />
                <span className="ml-2 text-gray-700">
                  <div className="font-medium text-sm">Excel</div>
                  <div className="text-xs text-gray-500">File XLSX</div>
                </span>
              </label>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              <strong>Catatan:</strong> Laporan akan diunduh dalam format{' '}
              {selectedFormat === 'pdf' ? 'PDF' : 'Excel'} dengan data terkini dari sistem.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex gap-3 bg-gray-50">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Batal
          </button>
          <button
            onClick={handleExport}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Memproses...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Unduh Laporan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuaranteeReportExport;
