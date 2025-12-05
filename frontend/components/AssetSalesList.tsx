import React, { useState, useEffect } from 'react';
import { getAssetSales, cancelAssetSale, getUnits } from '../services/api';
import { AssetSale, User, Unit, View } from '../types';
import Modal from './Modal';
import AssetSaleForm from './AssetSaleForm';

interface AssetSalesListProps {
  user: User;
  navigateTo: (view: View) => void;
}

const AssetSalesList: React.FC<AssetSalesListProps> = ({ user, navigateTo }) => {
  const [sales, setSales] = useState<AssetSale[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnitName, setSelectedUnitName] = useState<string | undefined>(undefined);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal states
  const [isModalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const canEditSales = ['super-admin', 'admin'].includes(user.role);
  const canCreateSale = ['super-admin', 'admin', 'unit'].includes(user.role);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedUnitName) params.unit_name = selectedUnitName;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const [salesData, unitsData] = await Promise.all([
        getAssetSales(params),
        user.role === 'admin' || user.role === 'super-admin' ? getUnits() : Promise.resolve([])
      ]);

      setSales(salesData);
      setUnits(unitsData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch asset sales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchTerm, selectedUnitName, startDate, endDate]);

  const handleCancelSale = async (saleId: number) => {
    if (!confirm('Apakah Anda yakin ingin membatalkan penjualan ini? Status asset akan dikembalikan ke Available.')) {
      return;
    }

    setActionLoading(true);
    try {
      await cancelAssetSale(saleId);
      alert('Penjualan berhasil dibatalkan!');
      fetchData();
    } catch (err: any) {
      alert(`Gagal membatalkan penjualan: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewDetail = (saleId: number) => {
    navigateTo({ type: 'ASSET_SALE_DETAIL', saleId: saleId.toString() });
  };

  const handleCreateSale = () => {
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
  };

  const handleSaleCreated = () => {
    setModalOpen(false);
    fetchData();
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

  if (loading && sales.length === 0) {
    return <div className="text-center p-8">Memuat data penjualan aset...</div>;
  }

  if (error && sales.length === 0) {
    return <div className="text-center p-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Penjualan Aset</h1>
        {canCreateSale && (
          <button
            onClick={handleCreateSale}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            + Jual Aset
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-md space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cari
            </label>
            <input
              type="text"
              placeholder="Nama pembeli, aset..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Unit Filter (Admin Holding only) */}
          {(user.role === 'admin' || user.role === 'super-admin') && units.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit
              </label>
              <select
                value={selectedUnitName || ''}
                onChange={(e) => setSelectedUnitName(e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua Unit</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.name}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Clear Filters */}
        {(searchTerm || selectedUnitName || startDate || endDate) && (
          <div className="flex justify-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedUnitName(undefined);
                setStartDate('');
                setEndDate('');
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aset
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Harga Jual
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tanggal Jual
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pembeli
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dijual Oleh
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sales.length > 0 ? (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {sale.asset.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {sale.asset.asset_tag}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {sale.asset.unit ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {sale.asset.unit.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {sale.asset.unit.code}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-green-600">
                        {formatCurrency(sale.sale_price)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(sale.sale_date)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{sale.buyer_name}</div>
                      {sale.buyer_contact && (
                        <div className="text-xs text-gray-500">{sale.buyer_contact}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sale.sold_by.name}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleViewDetail(sale.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Detail
                      </button>
                      {canEditSales && (
                        <button
                          onClick={() => handleCancelSale(sale.id)}
                          disabled={actionLoading}
                          className="text-red-600 hover:text-red-900 disabled:text-gray-400"
                        >
                          Batal
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Tidak ada data penjualan aset.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      {sales.length > 0 && (
        <div className="bg-white p-4 rounded-xl shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm text-gray-500">Total Penjualan</div>
              <div className="text-2xl font-bold text-gray-800">{sales.length}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500">Total Nilai</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(sales.reduce((sum, sale) => sum + Number(sale.sale_price || 0), 0))}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500">Rata-rata Harga</div>
              <div className="text-2xl font-bold text-blue-600">
                {sales.length > 0 ? formatCurrency(sales.reduce((sum, sale) => sum + Number(sale.sale_price || 0), 0) / sales.length) : formatCurrency(0)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Create Sale */}
      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={handleModalClose}>
          <AssetSaleForm
            user={user}
            onSuccess={handleSaleCreated}
            onCancel={handleModalClose}
          />
        </Modal>
      )}
    </div>
  );
};

export default AssetSalesList;
