import React, { useState, useEffect } from 'react';
import { getAssets, getGuarantees } from '../services/api';
import { Asset, View, Guarantee } from '../types';
import Modal from './Modal';
import GuaranteeInputForm from './GuaranteeInputForm';
import GuaranteeDetail from './GuaranteeDetail';
import GuaranteeReportExport from './GuaranteeReportExport';
import { PlusIcon, ViewIcon } from './icons';

interface GuaranteeListProps {
  navigateTo: (view: View) => void;
}

const GuaranteeList: React.FC<GuaranteeListProps> = ({ navigateTo }) => {
  const [guarantees, setGuarantees] = useState<Guarantee[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [isReportExportOpen, setReportExportOpen] = useState(false);
  const [editingGuarantee, setEditingGuarantee] = useState<Guarantee | undefined>(undefined);
  const [viewingGuaranteeId, setViewingGuaranteeId] = useState<string | null>(null);

  // Fetch assets
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setLoading(true);
        const assetsData = await getAssets({});
        if (Array.isArray(assetsData)) {
          const sortedAssets = assetsData.sort((a, b) => a.asset_tag.localeCompare(b.asset_tag));
          setAssets(sortedAssets);
        }
      } catch (err) {
        console.error('Failed to fetch assets:', err);
        setError('Gagal memuat data aset');
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, []);

  // Fetch guarantees
  useEffect(() => {
    const fetchGuaranteesList = async () => {
      try {
        const response = await getGuarantees({ per_page: 50 });
        if (response.guarantees && Array.isArray(response.guarantees)) {
          setGuarantees(response.guarantees);
        }
      } catch (err) {
        console.error('Failed to fetch guarantees:', err);
        setError('Gagal memload data jaminan');
      }
    };
    fetchGuaranteesList();
  }, []);

  const handleAddGuarantee = () => {
    setEditingGuarantee(undefined);
    setModalOpen(true);
  };

  const handleEditGuarantee = (guarantee: Guarantee) => {
    setEditingGuarantee(guarantee);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingGuarantee(undefined);
  };

  const handleSuccess = async () => {
    handleCloseModal();
    // Refresh guarantees list after successful save
    try {
      const response = await getGuarantees({ per_page: 50 });
      if (response?.guarantees && Array.isArray(response.guarantees)) {
        setGuarantees(response.guarantees);
      } else {
        setError('Failed to refresh guarantees list');
      }
    } catch (err) {
      console.error('Failed to refresh guarantees:', err);
      setError('Gagal refresh data jaminan');
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'BPKB': 'bg-blue-100 text-blue-800',
      'SHM': 'bg-green-100 text-green-800',
      'SHGB': 'bg-purple-100 text-purple-800',
      'E-SHM': 'bg-orange-100 text-orange-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'available': 'bg-green-100 text-green-800',
      'dipinjam': 'bg-yellow-100 text-yellow-800',
      'lunas': 'bg-blue-100 text-blue-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'available': 'Tersedia',
      'dipinjam': 'Dipinjam',
      'lunas': 'Lunas',
    };
    return labels[status] || status;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Show detail view if viewing a guarantee
  if (viewingGuaranteeId) {
    return (
      <GuaranteeDetail
        guaranteeId={viewingGuaranteeId}
        navigateTo={() => setViewingGuaranteeId(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Daftar Jaminan</h1>
          <p className="text-gray-600 mt-1">Kelola data jaminan aset perusahaan</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setReportExportOpen(true)}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
            title="Unduh laporan jaminan"
          >
            <svg
              className="w-5 h-5"
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
          </button>
          <button
            onClick={handleAddGuarantee}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors font-medium flex items-center gap-2"
          >
            <PlusIcon />
            Input Jaminan
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Guarantees Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {guarantees.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-gray-600 font-medium">Tidak ada data jaminan</p>
            <p className="text-gray-500 text-sm mt-1">Klik tombol "Input Jaminan" untuk menambahkan data baru</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">No SPK</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">No CIF</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Atas Nama SPK</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Atas Nama Jaminan</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Tipe Jaminan</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">No Jaminan</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Lokasi Jaminan</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Tgl Input Jaminan Masuk</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {guarantees.map(guarantee => (
                  <tr key={guarantee.id} className="border-b hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-gray-900 font-medium">{guarantee.spk_number}</td>
                    <td className="px-6 py-4 text-gray-900">{guarantee.cif_number}</td>
                    <td className="px-6 py-4 text-gray-900">{guarantee.spk_name}</td>
                    <td className="px-6 py-4 text-gray-900">{guarantee.guarantee_name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(guarantee.guarantee_type)}`}>
                        {guarantee.guarantee_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-900">{guarantee.guarantee_number}</td>
                    <td className="px-6 py-4 text-gray-900">{guarantee.file_location}</td>
                    <td className="px-6 py-4 text-gray-900">{formatDate(guarantee.input_date)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(guarantee.status)}`}>
                        {getStatusLabel(guarantee.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setViewingGuaranteeId(guarantee.id.toString())}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1"
                          title="Lihat Detail"
                        >
                          <ViewIcon />
                          Lihat
                        </button>
                        <button
                          onClick={() => handleEditGuarantee(guarantee)}
                          className="text-primary hover:text-primary-dark font-medium text-sm"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for Input/Edit Guarantee */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingGuarantee ? 'Edit Jaminan' : 'Tambah Jaminan Baru'}>
        <GuaranteeInputForm
          guarantee={editingGuarantee}
          assets={assets}
          onSuccess={handleSuccess}
          onClose={handleCloseModal}
        />
      </Modal>

      {/* Report Export Modal */}
      <GuaranteeReportExport
        isOpen={isReportExportOpen}
        onClose={() => setReportExportOpen(false)}
      />
    </div>
  );
};

export default GuaranteeList;
