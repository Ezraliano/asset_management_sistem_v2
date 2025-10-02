

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getAssets, deleteAsset } from '../services/api';
import { Asset, AssetStatus, View } from '../types';
import AssetForm from './AssetForm';
import Modal from './Modal';
import { EditIcon, DeleteIcon, PlusIcon, ViewIcon, DownloadIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';
import { useTranslation } from '../hooks/useTranslation';
import { QRCodeCanvas } from 'qrcode.react';
import { createRoot } from 'react-dom/client';
import JSZip from 'jszip';

interface AssetListProps {
  navigateTo: (view: View) => void;
}

const ITEMS_PER_PAGE = 25;

const AssetList: React.FC<AssetListProps> = ({ navigateTo }) => {
  const { t } = useTranslation();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | undefined>(undefined);
  const [filters, setFilters] = useState({ category: '', location: '', status: '' });
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  const fetchAssets = useCallback(async () => {
    setLoading(true);
    const fetchedAssets = await getAssets(filters);
    setAssets(fetchedAssets);
    setLoading(false);
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

  const handleDelete = async (id: string) => {
    if (window.confirm(t('asset_list.delete_confirm'))) {
        await deleteAsset(id);
        fetchAssets();
        setSelectedAssetIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
        });
    }
  };

  const uniqueCategories = useMemo(() => [...new Set(assets.map(a => a.category))], [assets]);
  const uniqueLocations = useMemo(() => [...new Set(assets.map(a => a.location))], [assets]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setCurrentPage(1); // Reset page when filters change
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Memoize paginated assets and total pages
  const { paginatedAssets, totalPages } = useMemo(() => {
    const total = Math.ceil(assets.length / ITEMS_PER_PAGE);
    const paginated = assets.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    return { paginatedAssets: paginated, totalPages: total };
  }, [assets, currentPage]);

  const isAllOnPageSelected = useMemo(() => 
    paginatedAssets.length > 0 && paginatedAssets.every(a => selectedAssetIds.has(a.id)),
    [paginatedAssets, selectedAssetIds]
  );
  
  const handleSelectOne = useCallback((assetId: string) => {
    setSelectedAssetIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(assetId)) {
            newSet.delete(assetId);
        } else {
            newSet.add(assetId);
        }
        return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const pageAssetIds = new Set(paginatedAssets.map(a => a.id));
    if (isAllOnPageSelected) {
        // Deselect all on this page
        setSelectedAssetIds(prev => {
            const newSet = new Set(prev);
            for (const id of pageAssetIds) {
                newSet.delete(id);
            }
            return newSet;
        });
    } else {
        // Select all on this page
        setSelectedAssetIds(prev => new Set([...prev, ...pageAssetIds]));
    }
  }, [paginatedAssets, isAllOnPageSelected]);

  const handleBulkDownloadQR = async () => {
      if (selectedAssetIds.size === 0) return;
      setIsDownloading(true);

      const zip = new JSZip();
      const selectedAssets = assets.filter(a => selectedAssetIds.has(a.id));

      const qrContainer = document.createElement('div');
      qrContainer.style.position = 'absolute';
      qrContainer.style.left = '-9999px';
      document.body.appendChild(qrContainer);
      const qrRoot = createRoot(qrContainer);

      const generateImageBlob = (asset: Asset): Promise<Blob | null> => {
          return new Promise((resolve) => {
              qrRoot.render(<QRCodeCanvas value={asset.qrCodeUrl} size={320} />);
              setTimeout(() => {
                  const sourceCanvas = qrContainer.querySelector('canvas');
                  if (!sourceCanvas) { resolve(null); return; }

                  const finalCanvas = document.createElement('canvas');
                  const ctx = finalCanvas.getContext('2d');
                  if (!ctx) { resolve(null); return; }

                  const qrSize = 320, padding = 20, fontSize = 18, textHeight = 40;
                  finalCanvas.width = qrSize + padding * 2;
                  finalCanvas.height = qrSize + padding * 2 + textHeight;

                  ctx.fillStyle = 'white';
                  ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
                  ctx.imageSmoothingEnabled = false;
                  ctx.drawImage(sourceCanvas, padding, padding, qrSize, qrSize);
                  ctx.fillStyle = '#1F2937';
                  ctx.font = `${fontSize}px Arial`;
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillText(asset.id, finalCanvas.width / 2, padding + qrSize + (textHeight / 2));

                  finalCanvas.toBlob(blob => resolve(blob), 'image/png');
              }, 50);
          });
      };

      for (const asset of selectedAssets) {
          const blob = await generateImageBlob(asset);
          if (blob) {
              zip.file(`${asset.id}_qr_code.png`, blob);
          }
      }
      
      qrRoot.unmount();
      document.body.removeChild(qrContainer);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = 'asset_qrcodes.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      setSelectedAssetIds(new Set());
      setIsDownloading(false);
  };


  const statusColorMap: { [key in AssetStatus]: string } = {
    [AssetStatus.InUse]: 'bg-green-100 text-green-800',
    [AssetStatus.InRepair]: 'bg-yellow-100 text-yellow-800',
    [AssetStatus.Disposed]: 'bg-gray-100 text-gray-800',
    [AssetStatus.Lost]: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-4xl font-bold text-dark-text">{t('asset_list.title')}</h1>
        <div className="flex items-center space-x-2">
             <button 
                onClick={handleBulkDownloadQR} 
                disabled={selectedAssetIds.size === 0 || isDownloading} 
                className="flex items-center bg-green-500 text-white px-4 py-2 rounded-lg shadow hover:bg-green-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
                <DownloadIcon />
                <span className="ml-2">
                    {isDownloading 
                        ? t('asset_list.downloading') 
                        : t('asset_list.download_qr', { count: selectedAssetIds.size })
                    }
                </span>
            </button>
            <button onClick={handleAdd} className="flex items-center bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary-dark transition-colors">
                <PlusIcon />
                <span className="ml-2">{t('asset_list.add_new_asset')}</span>
            </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select name="category" value={filters.category} onChange={handleFilterChange} className="p-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
                <option value="">{t('asset_list.filters.all_categories')}</option>
                {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
             <select name="location" value={filters.location} onChange={handleFilterChange} className="p-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
                <option value="">{t('asset_list.filters.all_locations')}</option>
                {uniqueLocations.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select name="status" value={filters.status} onChange={handleFilterChange} className="p-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
                <option value="">{t('asset_list.filters.all_statuses')}</option>
                {Object.values(AssetStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {loading ? (
          <p className="p-4 text-center">{t('asset_list.loading')}</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left">
                      <input type="checkbox"
                        className="form-checkbox h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                        onChange={handleSelectAll}
                        checked={isAllOnPageSelected}
                        aria-label="Select all assets on this page"
                      />
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('asset_list.table.name')}</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('asset_list.table.category')}</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('asset_list.table.location')}</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('asset_list.table.status')}</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('asset_list.table.actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedAssets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                          <input type="checkbox"
                            className="form-checkbox h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                            checked={selectedAssetIds.has(asset.id)}
                            onChange={() => handleSelectOne(asset.id)}
                            aria-labelledby={`asset-name-${asset.id}`}
                          />
                      </td>
                      <td id={`asset-name-${asset.id}`} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{asset.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asset.category}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asset.location}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColorMap[asset.status]}`}>
                          {asset.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right space-x-2">
                         <button onClick={() => navigateTo({ type: 'ASSET_DETAIL', assetId: asset.id })} className="text-indigo-600 hover:text-indigo-900"><ViewIcon /></button>
                        <button onClick={() => handleEdit(asset)} className="text-blue-600 hover:text-blue-900"><EditIcon /></button>
                        <button onClick={() => handleDelete(asset.id)} className="text-red-600 hover:text-red-900"><DeleteIcon /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
                <div>
                    <p className="text-sm text-gray-700">
                        {t('asset_list.pagination.showing_results', { 
                            start: Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, assets.length),
                            end: Math.min(currentPage * ITEMS_PER_PAGE, assets.length), 
                            total: assets.length 
                        })}
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setCurrentPage(p => p - 1)}
                        disabled={currentPage === 1}
                        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={t('asset_list.pagination.previous')}
                    >
                        <ChevronLeftIcon />
                        <span className="ml-2 hidden md:inline">{t('asset_list.pagination.previous')}</span>
                    </button>
                    <button
                        onClick={() => setCurrentPage(p => p + 1)}
                        disabled={currentPage === totalPages}
                        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={t('asset_list.pagination.next')}
                    >
                        <span className="mr-2 hidden md:inline">{t('asset_list.pagination.next')}</span>
                        <ChevronRightIcon />
                    </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
        <AssetForm asset={editingAsset} onSuccess={() => { setModalOpen(false); fetchAssets(); }} />
      </Modal>
    </div>
  );
};

export default AssetList;