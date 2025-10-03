// AssetList.tsx - PERBAIKAN FILTER BACKEND
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getAssets, deleteAsset } from '../services/api';
import { Asset, AssetStatus, View } from '../types';
import AssetForm from './AssetForm';
import Modal from './Modal';
import { EditIcon, DeleteIcon, PlusIcon, ViewIcon, FilterIcon, XIcon, AssetIcon } from './icons';
import { useTranslation } from '../hooks/useTranslation';
import { formatToRupiah } from '../utils/formatters';

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
  const [showFilters, setShowFilters] = useState(false);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      // Kirim filters ke backend
      const fetchedAssets = await getAssets(filters);
      setAssets(fetchedAssets);
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]); // fetchAssets akan dipanggil ulang ketika filters berubah

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
        fetchAssets(); // Refresh data setelah delete
      } catch (error) {
        console.error('Failed to delete asset:', error);
        alert('Failed to delete asset');
      }
    }
  };

  const handleFormSuccess = () => {
    setModalOpen(false);
    fetchAssets(); // Refresh data setelah add/edit
  };

  // Get unique values for filters dari data yang sudah difilter
  const uniqueCategories = useMemo(() => {
    const categories = [...new Set(assets.map(a => a.category))].filter(Boolean);
    return categories.sort();
  }, [assets]);

  const uniqueLocations = useMemo(() => {
    const locations = [...new Set(assets.map(a => a.location))].filter(Boolean);
    return locations.sort();
  }, [assets]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    // Filter akan otomatis trigger fetchAssets karena ada dependency di useCallback
  };

  const handleClearFilters = () => {
    setFilters({ category: '', location: '', status: '' });
  };

  const handleClearSingleFilter = (filterName: keyof typeof filters) => {
    setFilters(prev => ({ ...prev, [filterName]: '' }));
  };

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(value => value !== '');
  }, [filters]);

  const statusColorMap: { [key in AssetStatus]: string } = {
    [AssetStatus.IN_USE]: 'bg-green-100 text-green-800 border border-green-200',
    [AssetStatus.IN_REPAIR]: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    [AssetStatus.DISPOSED]: 'bg-gray-100 text-gray-800 border border-gray-200',
    [AssetStatus.LOST]: 'bg-red-100 text-red-800 border border-red-200',
  };

  // Custom Select Component untuk filter yang lebih baik
  const FilterSelect: React.FC<{
    name: keyof typeof filters;
    value: string;
    options: string[];
    placeholder: string;
    onClear: () => void;
  }> = ({ name, value, options, placeholder, onClear }) => (
    <div className="relative">
      <select
        name={name}
        value={value}
        onChange={handleFilterChange}
        className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white appearance-none cursor-pointer"
      >
        <option value="">{placeholder}</option>
        {options.map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {value && (
        <button
          onClick={onClear}
          className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          type="button"
        >
          <XIcon />
        </button>
      )}
      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-dark-text">{t('asset_list.title')}</h1>
          <p className="text-gray-600 mt-1">
            {loading ? 'Loading...' : `${assets.length} assets found`}
            {hasActiveFilters && ' (filtered)'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Filter Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <FilterIcon />
            <span className="ml-2">Filters</span>
            {hasActiveFilters && (
              <span className="ml-2 bg-white text-primary rounded-full w-5 h-5 text-xs flex items-center justify-center">
                {Object.values(filters).filter(Boolean).length}
              </span>
            )}
          </button>
          
          {/* Add Asset Button */}
          <button 
            onClick={handleAdd} 
            className="flex items-center bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary-dark transition-colors"
          >
            <PlusIcon />
            <span className="ml-2">{t('asset_list.add_new_asset')}</span>
          </button>
        </div>
      </div>

      {/* Filters Section */}
      {(showFilters || hasActiveFilters) && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-dark-text flex items-center">
              <FilterIcon />
              <span className="ml-2">Filter Assets</span>
            </h3>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="flex items-center text-sm text-gray-600 hover:text-gray-800"
              >
                <XIcon />
                <span className="ml-1">Clear all</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <FilterSelect
                name="category"
                value={filters.category}
                options={uniqueCategories}
                placeholder="All Categories"
                onClear={() => handleClearSingleFilter('category')}
              />
            </div>

            {/* Location Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <FilterSelect
                name="location"
                value={filters.location}
                options={uniqueLocations}
                placeholder="All Locations"
                onClear={() => handleClearSingleFilter('location')}
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <FilterSelect
                name="status"
                value={filters.status}
                options={Object.values(AssetStatus)}
                placeholder="All Statuses"
                onClear={() => handleClearSingleFilter('status')}
              />
            </div>
          </div>

          {/* Active Filters Badges */}
          {hasActiveFilters && (
            <div className="mt-4 flex flex-wrap gap-2">
              {filters.category && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Category: {filters.category}
                  <button
                    onClick={() => handleClearSingleFilter('category')}
                    className="ml-1 hover:text-blue-600"
                  >
                    <XIcon />
                  </button>
                </span>
              )}
              {filters.location && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Location: {filters.location}
                  <button
                    onClick={() => handleClearSingleFilter('location')}
                    className="ml-1 hover:text-green-600"
                  >
                    <XIcon />
                  </button>
                </span>
              )}
              {filters.status && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Status: {filters.status}
                  <button
                    onClick={() => handleClearSingleFilter('status')}
                    className="ml-1 hover:text-purple-600"
                  >
                    <XIcon />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Assets Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading assets...</p>
          </div>
        ) : assets.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-4">
              <AssetIcon />
            </div>
            <p className="text-gray-600 text-lg mb-2">No assets found</p>
            <p className="text-gray-500 mb-4">
              {hasActiveFilters 
                ? 'Try changing your filters or clear them to see all assets.'
                : 'Get started by adding your first asset to the system.'
              }
            </p>
            <button 
              onClick={handleAdd}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors"
            >
              Add Your First Asset
            </button>
            {hasActiveFilters && (
              <button 
                onClick={handleClearFilters}
                className="ml-3 bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Asset Tag
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{asset.asset_tag}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{asset.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{asset.category}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{asset.location}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatToRupiah(asset.value)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColorMap[asset.status as AssetStatus]}`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button 
                        onClick={() => navigateTo({ type: 'ASSET_DETAIL', assetId: asset.id.toString() })}
                        className="text-indigo-600 hover:text-indigo-900 transition-colors"
                        title="View Details"
                      >
                        <ViewIcon />
                      </button>
                      <button 
                        onClick={() => handleEdit(asset)}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                        title="Edit Asset"
                      >
                        <EditIcon />
                      </button>
                      <button 
                        onClick={() => handleDelete(asset.id)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                        title="Delete Asset"
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