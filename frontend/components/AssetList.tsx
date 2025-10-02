// AssetList.tsx - PERBAIKAN BAGIAN VALUE
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getAssets, deleteAsset } from '../services/api';
import { Asset, AssetStatus, View } from '../types';
import AssetForm from './AssetForm';
import Modal from './Modal';
import { EditIcon, DeleteIcon, PlusIcon, ViewIcon } from './icons';
import { useTranslation } from '../hooks/useTranslation';
import { formatToRupiah } from '../utils/formatters'; // IMPORT FORMATTER

interface AssetListProps {
  navigateTo: (view: View) => void;
}

const AssetList: React.FC<AssetListProps> = ({ navigateTo }) => {
  const { t } = useTranslation();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | undefined>(undefined);
  const [filters, setFilters] = useState({ category: '', location: '', status: '' });

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedAssets = await getAssets(filters);
      setAssets(fetchedAssets);
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setModalOpen(true);
  };
  
  const handleAdd = () => {
    setEditingAsset(undefined);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm(t('asset_list.delete_confirm'))) {
      try {
        await deleteAsset(id.toString());
        fetchAssets();
      } catch (error) {
        console.error('Failed to delete asset:', error);
        alert('Failed to delete asset');
      }
    }
  };

  const handleFormSuccess = () => {
    setModalOpen(false);
    fetchAssets();
  };

  const uniqueCategories = useMemo(() => [...new Set(assets.map(a => a.category))], [assets]);
  const uniqueLocations = useMemo(() => [...new Set(assets.map(a => a.location))], [assets]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const statusColorMap: { [key in AssetStatus]: string } = {
    [AssetStatus.IN_USE]: 'bg-green-100 text-green-800',
    [AssetStatus.IN_REPAIR]: 'bg-yellow-100 text-yellow-800',
    [AssetStatus.DISPOSED]: 'bg-gray-100 text-gray-800',
    [AssetStatus.LOST]: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-dark-text">{t('asset_list.title')}</h1>
        <button 
          onClick={handleAdd} 
          className="flex items-center bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary-dark transition-colors"
        >
          <PlusIcon />
          <span className="ml-2">{t('asset_list.add_new_asset')}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select name="category" value={filters.category} onChange={handleFilterChange} 
            className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary">
            <option value="">All Categories</option>
            {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select name="location" value={filters.location} onChange={handleFilterChange}
            className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary">
            <option value="">All Locations</option>
            {uniqueLocations.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select name="status" value={filters.status} onChange={handleFilterChange}
            className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary">
            <option value="">All Statuses</option>
            {Object.values(AssetStatus).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Assets Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading assets...</p>
          </div>
        ) : assets.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">No assets found</p>
            <button 
              onClick={handleAdd}
              className="mt-4 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
            >
              Add Your First Asset
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset Tag</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {asset.asset_tag}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {asset.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {asset.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {asset.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {/* PERBAIKAN: Gunakan formatToRupiah */}
                      {formatToRupiah(asset.value)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColorMap[asset.status as AssetStatus]}`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right space-x-2">
                      <button 
                        onClick={() => navigateTo({ type: 'ASSET_DETAIL', assetId: asset.id.toString() })}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <ViewIcon />
                      </button>
                      <button 
                        onClick={() => handleEdit(asset)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <EditIcon />
                      </button>
                      <button 
                        onClick={() => handleDelete(asset.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <DeleteIcon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Asset Form Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
        <AssetForm 
          asset={editingAsset} 
          onSuccess={handleFormSuccess}
          onClose={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default AssetList;