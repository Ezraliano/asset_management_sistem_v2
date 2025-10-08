// AssetList.tsx - DENGAN CHECKLIST, PAGINASI, DAN UNDUH QR CODE
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getAssets, deleteAsset } from '../services/api';
import { Asset, AssetStatus, View } from '../types';
import AssetForm from './AssetForm';
import Modal from './Modal';
import { EditIcon, DeleteIcon, PlusIcon, ViewIcon, FilterIcon, XIcon, AssetIcon, DownloadIcon } from './icons';
import { useTranslation } from '../hooks/useTranslation';
import { formatToRupiah } from '../utils/formatters';
import { QRCodeCanvas } from 'qrcode.react';
import JSZip from 'jszip';

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
  const [error, setError] = useState<string>('');
  const [totalAssets, setTotalAssets] = useState(0);
  
  // State untuk checklist dan paginasi
  const [selectedAssets, setSelectedAssets] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const ASSETS_PER_PAGE = 15;

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const assetsData = await getAssets(filters);
      if (Array.isArray(assetsData)) {
        setAssets(assetsData);
        setTotalAssets(assetsData.length);
      } else {
        setAssets([]);
        setTotalAssets(0);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load assets');
      setAssets([]);
      setTotalAssets(0);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Logika Paginasi
  const paginatedAssets = useMemo(() => {
    const startIndex = (currentPage - 1) * ASSETS_PER_PAGE;
    return assets.slice(startIndex, startIndex + ASSETS_PER_PAGE);
  }, [assets, currentPage]);

  const totalPages = Math.ceil(totalAssets / ASSETS_PER_PAGE);

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
      setSelectedAssets(new Set()); // Clear selection saat ganti halaman
    }
  };

  // Logika Checklist
  const handleSelectAsset = (assetId: number) => {
    const newSelection = new Set(selectedAssets);
    if (newSelection.has(assetId)) {
      newSelection.delete(assetId);
    } else {
      newSelection.add(assetId);
    }
    setSelectedAssets(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedAssets.size === paginatedAssets.length) {
      setSelectedAssets(new Set());
    } else {
      const allAssetIds = paginatedAssets.map(a => a.id);
      setSelectedAssets(new Set(allAssetIds));
    }
  };

  // Logika Unduh QR Code
  const handleDownloadQRCodes = async () => {
    if (selectedAssets.size === 0) return;

    const zip = new JSZip();
    const qrCodesFolder = zip.folder('asset-qr-codes');

    if (!qrCodesFolder) return;

    const selectedAssetObjects = assets.filter(asset => selectedAssets.has(asset.id));

    for (const asset of selectedAssetObjects) {
      const sourceCanvas = document.getElementById(`qr-code-${asset.id}`) as HTMLCanvasElement;
      if (sourceCanvas) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        const qrSize = 256;
        const padding = 20;
        const fontSize = 16;
        const textHeight = 30;
        const font = `${fontSize}px Arial`;

        canvas.width = qrSize + padding * 2;
        canvas.height = qrSize + padding * 2 + textHeight;

        // Latar belakang putih
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Gambar QR code
        ctx.drawImage(sourceCanvas, padding, padding, qrSize, qrSize);

        // Tambahkan teks ID Asset
        ctx.fillStyle = 'black';
        ctx.font = font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const textX = canvas.width / 2;
        const textY = padding + qrSize + (textHeight / 2);
        ctx.fillText(asset.asset_tag, textX, textY);

        const pngUrl = canvas.toDataURL('image/png');
        qrCodesFolder.file(`${asset.asset_tag}.png`, pngUrl.split(',')[1], { base64: true });
      }
    }

    zip.generateAsync({ type: 'blob' }).then(content => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = 'asset-qr-codes.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

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

  const uniqueCategories = useMemo(() => {
    if (!Array.isArray(assets)) return [];
    const categories = assets.map(a => a.category).filter(Boolean);
    return [...new Set(categories)].sort();
  }, [assets]);

  const uniqueLocations = useMemo(() => {
    if (!Array.isArray(assets)) return [];
    const locations = assets.map(a => a.location).filter(Boolean);
    return [...new Set(locations)].sort();
  }, [assets]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1); // Reset ke halaman pertama saat filter berubah
  };

  const handleClearFilters = () => {
    setFilters({ category: '', location: '', status: '' });
    setCurrentPage(1);
  };

  const hasActiveFilters = useMemo(() => Object.values(filters).some(v => v !== ''), [filters]);

  const statusColorMap: { [key in AssetStatus]: string } = {
    [AssetStatus.IN_USE]: 'bg-green-100 text-green-800',
    [AssetStatus.IN_REPAIR]: 'bg-yellow-100 text-yellow-800',
    [AssetStatus.DISPOSED]: 'bg-gray-100 text-gray-800',
    [AssetStatus.LOST]: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-6">
      {/* Hidden QR Canvases for download */}
      <div style={{ display: 'none' }}>
        {assets.map(asset => (
          <QRCodeCanvas key={asset.id} id={`qr-code-${asset.id}`} value={asset.asset_tag} size={256} />
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-dark-text">{t('asset_list.title')}</h1>
          <p className="text-gray-600 mt-1">
            {loading ? 'Loading...' : `${totalAssets} assets found`}
            {hasActiveFilters && ' (filtered)'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
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
          </button>
          <button 
            onClick={handleAdd} 
            className="flex items-center bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary-dark transition-colors"
          >
            <PlusIcon />
            <span className="ml-2">{t('asset_list.add_new_asset')}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <span>{error}</span>
        </div>
      )}

      {(showFilters || hasActiveFilters) && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          {/* ... filter UI ... */}
        </div>
      )}

      {/* Tombol Aksi untuk item terpilih */}
      {selectedAssets.size > 0 && (
        <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200 flex items-center justify-between">
          <span className="text-gray-700 font-medium">
            {selectedAssets.size} asset(s) selected
          </span>
          <button
            onClick={handleDownloadQRCodes}
            className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 transition-colors"
          >
            <DownloadIcon />
            <span className="ml-2">Download QR Codes</span>
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
        {loading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : assets.length === 0 ? (
          <div className="p-8 text-center">No assets found.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left">
                      <input 
                        type="checkbox" 
                        className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                        onChange={handleSelectAll}
                        checked={selectedAssets.size === paginatedAssets.length && paginatedAssets.length > 0}
                      />
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Asset Tag</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Value</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedAssets.map((asset) => (
                    <tr key={asset.id} className={`hover:bg-gray-50 transition-colors ${selectedAssets.has(asset.id) ? 'bg-blue-50' : ''}`}>
                      <td className="px-6 py-4">
                        <input 
                          type="checkbox" 
                          className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                          checked={selectedAssets.has(asset.id)}
                          onChange={() => handleSelectAsset(asset.id)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{asset.asset_tag}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{asset.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asset.category}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asset.location}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatToRupiah(asset.value)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColorMap[asset.status as AssetStatus] || 'bg-gray-100 text-gray-800'}`}>
                          {asset.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button onClick={() => navigateTo({ type: 'ASSET_DETAIL', assetId: asset.id.toString() })} className="text-indigo-600 hover:text-indigo-900"><ViewIcon /></button>
                        <button onClick={() => handleEdit(asset)} className="text-blue-600 hover:text-blue-900"><EditIcon /></button>
                        <button onClick={() => handleDelete(asset.id)} className="text-red-600 hover:text-red-900"><DeleteIcon /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Paginasi */}
            {totalPages > 1 && (
              <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
                    Previous
                  </button>
                  <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{(currentPage - 1) * ASSETS_PER_PAGE + 1}</span> to <span className="font-medium">{Math.min(currentPage * ASSETS_PER_PAGE, totalAssets)}</span> of <span className="font-medium">{totalAssets}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                        &laquo;
                      </button>
                      {[...Array(totalPages).keys()].map(num => (
                        <button 
                          key={num + 1} 
                          onClick={() => handlePageChange(num + 1)} 
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === num + 1 ? 'z-10 bg-primary border-primary text-white' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}
                        >
                          {num + 1}
                        </button>
                      ))}
                      <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                        &raquo;
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

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