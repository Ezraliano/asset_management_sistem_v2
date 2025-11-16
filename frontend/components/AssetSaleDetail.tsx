import React, { useState, useEffect } from 'react';
import { getAssetSaleById, cancelAssetSale } from '../services/api';
import { AssetSale, User, View } from '../types';

interface AssetSaleDetailProps {
  saleId: string;
  user: User;
  navigateTo: (view: View) => void;
}

const AssetSaleDetail: React.FC<AssetSaleDetailProps> = ({ saleId, user, navigateTo }) => {
  const [sale, setSale] = useState<AssetSale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const canEditSales = ['super-admin', 'admin'].includes(user.role);

  useEffect(() => {
    fetchSaleDetail();
  }, [saleId]);

  const fetchSaleDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const saleData = await getAssetSaleById(Number(saleId));
      if (saleData) {
        setSale(saleData);
      } else {
        setError('Penjualan tidak ditemukan');
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat detail penjualan');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSale = async () => {
    if (!confirm('Apakah Anda yakin ingin membatalkan penjualan ini? Status asset akan dikembalikan ke Available.')) {
      return;
    }

    setActionLoading(true);
    try {
      await cancelAssetSale(Number(saleId));
      alert('Penjualan berhasil dibatalkan!');
      navigateTo({ type: 'ASSET_SALES' });
    } catch (err: any) {
      alert(`Gagal membatalkan penjualan: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBack = () => {
    navigateTo({ type: 'ASSET_SALES' });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Memuat detail penjualan...</div>
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="text-center p-8">
        <div className="text-red-500 mb-4">{error || 'Penjualan tidak ditemukan'}</div>
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          Kembali
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <button
            onClick={handleBack}
            className="text-blue-600 hover:text-blue-800 mb-2 flex items-center"
          >
            ← Kembali ke Daftar
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Detail Penjualan Aset</h1>
        </div>
        {canEditSales && (
          <button
            onClick={handleCancelSale}
            disabled={actionLoading}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
          >
            {actionLoading ? 'Memproses...' : 'Batalkan Penjualan'}
          </button>
        )}
      </div>

      {/* Asset Information */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
          Informasi Aset
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Tag Aset</label>
            <div className="text-gray-900 font-medium">{sale.asset.asset_tag}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Nama Aset</label>
            <div className="text-gray-900 font-medium">{sale.asset.name}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Kategori</label>
            <div className="text-gray-900">{sale.asset.category}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Unit</label>
            <div className="text-gray-900">
              {sale.asset.unit ? (
                <>
                  <div>{sale.asset.unit.name}</div>
                  <div className="text-xs text-gray-500">{sale.asset.unit.code}</div>
                </>
              ) : (
                '-'
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Nilai Perolehan</label>
            <div className="text-gray-900">{formatCurrency(sale.asset.value)}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Status Aset</label>
            <div>
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                {sale.asset.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sale Information */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
          Informasi Penjualan
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Harga Jual</label>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(sale.sale_price)}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Tanggal Jual</label>
            <div className="text-gray-900 font-medium">{formatDate(sale.sale_date)}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Nama Pembeli</label>
            <div className="text-gray-900">{sale.buyer_name}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Kontak Pembeli</label>
            <div className="text-gray-900">{sale.buyer_contact || '-'}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Dijual Oleh</label>
            <div className="text-gray-900">
              <div>{sale.sold_by.name}</div>
              <div className="text-xs text-gray-500">{sale.sold_by.role}</div>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Tanggal Dibuat</label>
            <div className="text-gray-900">{formatDate(sale.created_at)}</div>
          </div>
        </div>

        {/* Profit/Loss Indicator (if available) */}
        {sale.profit_loss !== undefined && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  {sale.is_profit ? 'Keuntungan' : 'Kerugian'}
                </label>
                <div className={`text-xl font-bold ${sale.is_profit ? 'text-green-600' : 'text-red-600'}`}>
                  {sale.is_profit ? '+' : ''}{formatCurrency(sale.profit_loss)}
                </div>
              </div>
              <div className="text-sm text-gray-500">
                (Harga Jual - Nilai Buku)
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reason and Notes */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
          Alasan & Catatan
        </h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Alasan Penjualan</label>
            <div className="mt-1 p-3 bg-gray-50 rounded-md text-gray-900 whitespace-pre-wrap">
              {sale.reason}
            </div>
          </div>
          {sale.notes && (
            <div>
              <label className="text-sm font-medium text-gray-500">Catatan Tambahan</label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md text-gray-900 whitespace-pre-wrap">
                {sale.notes}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sale Proof */}
      {sale.sale_proof_path && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
            Bukti Penjualan
          </h2>
          <div className="space-y-2">
            <div className="text-sm text-gray-500">
              Dokumen bukti penjualan telah diunggah
            </div>
            <a
              href={`https://assetmanagementga.arjunaconnect.com/api/storage/${sale.sale_proof_path}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Lihat Bukti Penjualan
            </a>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
          Timeline
        </h2>
        <div className="space-y-3">
          <div className="flex items-start">
            <div className="flex-shrink-0 w-2 h-2 mt-2 bg-green-500 rounded-full"></div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-900">Aset Dijual</div>
              <div className="text-xs text-gray-500">{formatDate(sale.sale_date)}</div>
              <div className="text-xs text-gray-600 mt-1">
                Oleh: {sale.sold_by.name}
              </div>
            </div>
          </div>
          <div className="flex items-start">
            <div className="flex-shrink-0 w-2 h-2 mt-2 bg-gray-400 rounded-full"></div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-900">Record Dibuat</div>
              <div className="text-xs text-gray-500">{formatDate(sale.created_at)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetSaleDetail;
