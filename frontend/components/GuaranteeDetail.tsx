import React, { useState, useEffect, useCallback } from 'react';
import { getGuaranteeById } from '../services/api';
import { Guarantee, View } from '../types';
import { BackIcon, EditIcon } from './icons';
import Modal from './Modal';
import GuaranteeInputForm from './GuaranteeInputForm';
import GuaranteeLoaning from './GuaranteeLoaning';

interface GuaranteeDetailProps {
  guaranteeId: string;
  navigateTo: (view: View) => void;
}

const GuaranteeDetail: React.FC<GuaranteeDetailProps> = ({ guaranteeId, navigateTo }) => {
  const [guarantee, setGuarantee] = useState<Guarantee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isLoanModalOpen, setLoanModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchGuaranteeDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getGuaranteeById(parseInt(guaranteeId));

      // Handle response format dengan aman
      const actualData = (data as any).data || data;

      if (!actualData || typeof actualData !== 'object') {
        setError('Data jaminan tidak valid');
        setLoading(false);
        return;
      }

      setGuarantee(actualData as Guarantee);
    } catch (err: any) {
      console.error('Error fetching guarantee details:', err);
      setError(err.message || 'Gagal memuat detail jaminan');
    } finally {
      setLoading(false);
    }
  }, [guaranteeId]);

  useEffect(() => {
    fetchGuaranteeDetail();
  }, [fetchGuaranteeDetail]);

  const handleEditSuccess = async () => {
    setEditModalOpen(false);
    setSuccessMessage('Jaminan berhasil diperbarui');
    setTimeout(() => {
      setSuccessMessage('');
      fetchGuaranteeDetail();
    }, 1000);
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'BPKB': 'bg-blue-100 text-blue-800',
      'SHM': 'bg-green-100 text-green-800',
      'SHGB': 'bg-purple-100 text-purple-800',
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat detail jaminan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateTo({ type: 'GUARANTEE_LIST' })}
            className="flex items-center gap-2 text-primary hover:text-primary-dark font-medium"
          >
            <BackIcon />
            Kembali
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-800">
          <p className="font-medium">Error</p>
          <p className="text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!guarantee) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateTo({ type: 'GUARANTEE_LIST' })}
            className="flex items-center gap-2 text-primary hover:text-primary-dark font-medium"
          >
            <BackIcon />
            Kembali
          </button>
        </div>
        <div className="text-center py-12">
          <p className="text-gray-600">Data jaminan tidak ditemukan</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header dengan Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateTo({ type: 'GUARANTEE_LIST' })}
            className="flex items-center gap-2 text-primary hover:text-primary-dark font-medium"
          >
            <BackIcon />
            Kembali
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Detail Jaminan</h1>
            <p className="text-gray-600 mt-1">Informasi lengkap jaminan aset</p>
          </div>
        </div>
        <button
          onClick={() => setEditModalOpen(true)}
          className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors font-medium flex items-center gap-2"
        >
          <EditIcon />
          Edit
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
          {successMessage}
        </div>
      )}

      {/* Main Detail Card */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-8 space-y-8">
          {/* Section 1: Informasi SPK */}
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Informasi SPK</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-l-4 border-primary pl-4">
                <p className="text-sm text-gray-600 font-medium">No SPK</p>
                <p className="text-lg text-gray-900 font-semibold mt-1">{guarantee.spk_number}</p>
              </div>
              <div className="border-l-4 border-primary pl-4">
                <p className="text-sm text-gray-600 font-medium">No CIF</p>
                <p className="text-lg text-gray-900 font-semibold mt-1">{guarantee.cif_number}</p>
              </div>
              <div className="border-l-4 border-primary pl-4">
                <p className="text-sm text-gray-600 font-medium">Atas Nama SPK</p>
                <p className="text-lg text-gray-900 font-semibold mt-1">{guarantee.spk_name}</p>
              </div>
              <div className="border-l-4 border-primary pl-4">
                <p className="text-sm text-gray-600 font-medium">Jangka Kredit</p>
                <p className="text-lg text-gray-900 font-semibold mt-1">{guarantee.credit_period}</p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200"></div>

          {/* Section 2: Informasi Jaminan */}
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Informasi Jaminan</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-l-4 border-green-400 pl-4">
                <p className="text-sm text-gray-600 font-medium">Atas Nama Jaminan</p>
                <p className="text-lg text-gray-900 font-semibold mt-1">{guarantee.guarantee_name}</p>
              </div>
              <div className="border-l-4 border-green-400 pl-4">
                <p className="text-sm text-gray-600 font-medium">Tipe Jaminan</p>
                <div className="mt-1">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(guarantee.guarantee_type)}`}>
                    {guarantee.guarantee_type}
                  </span>
                </div>
              </div>
              <div className="border-l-4 border-green-400 pl-4">
                <p className="text-sm text-gray-600 font-medium">No Jaminan</p>
                <p className="text-lg text-gray-900 font-semibold mt-1">{guarantee.guarantee_number}</p>
              </div>
              <div className="border-l-4 border-green-400 pl-4">
                <p className="text-sm text-gray-600 font-medium">Lokasi File</p>
                <p className="text-lg text-gray-900 font-semibold mt-1">{guarantee.file_location}</p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200"></div>

          {/* Section 3: Status dan Tanggal */}
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Status dan Tanggal</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-l-4 border-blue-400 pl-4">
                <p className="text-sm text-gray-600 font-medium">Status</p>
                <div className="mt-1">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(guarantee.status)}`}>
                    {getStatusLabel(guarantee.status)}
                  </span>
                </div>
              </div>
              <div className="border-l-4 border-blue-400 pl-4">
                <p className="text-sm text-gray-600 font-medium">Tanggal Input</p>
                <p className="text-lg text-gray-900 font-semibold mt-1">{formatDate(guarantee.input_date)}</p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200"></div>

          {/* Section 4: Informasi Sistem */}
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Informasi Sistem</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-l-4 border-gray-400 pl-4">
                <p className="text-sm text-gray-600 font-medium">Dibuat Pada</p>
                <p className="text-sm text-gray-900 mt-1">{formatDate(guarantee.created_at)}</p>
              </div>
              <div className="border-l-4 border-gray-400 pl-4">
                <p className="text-sm text-gray-600 font-medium">Diperbarui Pada</p>
                <p className="text-sm text-gray-900 mt-1">{formatDate(guarantee.updated_at)}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="border-t border-gray-200 pt-8">
            <div className="flex gap-4">
              {guarantee.status === 'available' && (
                <button
                  onClick={() => setLoanModalOpen(true)}
                  className="bg-yellow-500 text-white px-6 py-2 rounded-lg hover:bg-yellow-600 transition-colors font-medium"
                >
                  Peminjaman
                </button>
              )}
              {guarantee.status === 'dipinjam' && (
                <button
                  onClick={() => setLoanModalOpen(true)}
                  className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors font-medium"
                >
                  Lunas
                </button>
              )}
              <button
                onClick={() => navigateTo({ type: 'GUARANTEE_LIST' })}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Edit */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Jaminan"
      >
        <GuaranteeInputForm
          guarantee={guarantee}
          assets={[]}
          onSuccess={handleEditSuccess}
          onClose={() => setEditModalOpen(false)}
        />
      </Modal>

      {/* Modal Peminjaman */}
      <Modal
        isOpen={isLoanModalOpen}
        onClose={() => setLoanModalOpen(false)}
        title="Peminjaman Jaminan"
      >
        {guarantee && (
          <GuaranteeLoaning
            guarantee={guarantee}
            onSuccess={() => {
              setLoanModalOpen(false);
              fetchGuaranteeDetail();
            }}
            onClose={() => setLoanModalOpen(false)}
          />
        )}
      </Modal>
    </div>
  );
};

export default GuaranteeDetail;
