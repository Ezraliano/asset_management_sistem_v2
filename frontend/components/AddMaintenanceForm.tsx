import React, { useState, useEffect } from 'react';
import { Asset, MaintenanceStatus, Unit } from '../types';
import { getUnits } from '../services/api';

interface AddMaintenanceFormProps {
  asset: Asset;
  onSuccess: () => void;
  onClose: () => void;
}

const AddMaintenanceForm: React.FC<AddMaintenanceFormProps> = ({ asset, onSuccess, onClose }) => {
  const [type, setType] = useState<'Perbaikan' | 'Pemeliharaan'>('Perbaikan');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [unitId, setUnitId] = useState<number | ''>('');
  const [partyType, setPartyType] = useState<'Internal' | 'External'>('Internal');
  const [instansi, setInstansi] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [photoProof, setPhotoProof] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<MaintenanceStatus>(MaintenanceStatus.COMPLETED);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  useEffect(() => {
    const fetchUnits = async () => {
      setLoadingUnits(true);
      try {
        const unitsData = await getUnits();
        setUnits(unitsData);
      } catch (error) {
        console.error('Failed to fetch units:', error);
      } finally {
        setLoadingUnits(false);
      }
    };
    fetchUnits();
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhotoProof(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!instansi || !phoneNumber) {
      alert('Mohon isi semua field yang wajib');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('asset_id', asset.id.toString());
      formData.append('type', type);
      formData.append('date', date);
      if (unitId) formData.append('unit_id', unitId.toString());
      formData.append('party_type', partyType);
      formData.append('instansi', instansi);
      formData.append('phone_number', phoneNumber);
      if (photoProof) formData.append('photo_proof', photoProof);
      if (description) formData.append('description', description);
      formData.append('status', status);

      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://127.0.0.1:8000/api/maintenances', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal menambahkan data');
      }

      alert('Data perbaikan/pemeliharaan berhasil ditambahkan!');
      onSuccess();
    } catch (error: any) {
      console.error('Failed to add maintenance record:', error);
      alert(error.message || 'Gagal menambahkan data perbaikan/pemeliharaan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold">Perbaikan dan Pemeliharaan: {asset.name}</h2>

      {/* Radio Button untuk memilih Tipe */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Tipe <span className="text-red-500">*</span></label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="type"
              value="Perbaikan"
              checked={type === 'Perbaikan'}
              onChange={(e) => setType(e.target.value as 'Perbaikan' | 'Pemeliharaan')}
              className="mr-2"
            />
            Perbaikan
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="type"
              value="Pemeliharaan"
              checked={type === 'Pemeliharaan'}
              onChange={(e) => setType(e.target.value as 'Perbaikan' | 'Pemeliharaan')}
              className="mr-2"
            />
            Pemeliharaan
          </label>
        </div>
      </div>

      {/* Nama Aset (Read-only) */}
      <div>
        <label htmlFor="asset_name" className="block text-sm font-medium text-gray-700">Nama Aset</label>
        <input
          type="text"
          id="asset_name"
          value={asset.name}
          disabled
          className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm text-gray-700 sm:text-sm"
        />
      </div>

      {/* Tanggal */}
      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700">Tanggal <span className="text-red-500">*</span></label>
        <input
          type="date"
          id="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
        />
      </div>

      {/* Unit yang memperbaiki/memelihara */}
      <div>
        <label htmlFor="unit_id" className="block text-sm font-medium text-gray-700">
          Unit yang {type === 'Perbaikan' ? 'memperbaiki' : 'memelihara'}
        </label>
        <select
          id="unit_id"
          value={unitId}
          onChange={(e) => setUnitId(e.target.value ? Number(e.target.value) : '')}
          disabled={loadingUnits}
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
        >
          <option value="">-- Pilih Unit (Opsional) --</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name}
            </option>
          ))}
        </select>
      </div>

      {/* Pihak yang memperbaiki/memelihara */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Pihak yang {type === 'Perbaikan' ? 'memperbaiki' : 'memelihara'} <span className="text-red-500">*</span>
        </label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="party_type"
              value="Internal"
              checked={partyType === 'Internal'}
              onChange={(e) => setPartyType(e.target.value as 'Internal' | 'External')}
              className="mr-2"
            />
            Internal
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="party_type"
              value="External"
              checked={partyType === 'External'}
              onChange={(e) => setPartyType(e.target.value as 'Internal' | 'External')}
              className="mr-2"
            />
            External
          </label>
        </div>
      </div>

      {/* Nama Instansi yang memperbaiki/memelihara */}
      <div>
        <label htmlFor="instansi" className="block text-sm font-medium text-gray-700">
          Nama Instansi yang {type === 'Perbaikan' ? 'memperbaiki' : 'memelihara'} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="instansi"
          value={instansi}
          onChange={(e) => setInstansi(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          placeholder="Masukkan nama instansi"
        />
      </div>

      {/* No Telepon */}
      <div>
        <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700">No Telepon <span className="text-red-500">*</span></label>
        <input
          type="tel"
          id="phone_number"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          placeholder="Contoh: 081234567890"
        />
      </div>

      {/* Foto Bukti */}
      <div>
        <label htmlFor="photo_proof" className="block text-sm font-medium text-gray-700">Foto Bukti</label>
        <input
          type="file"
          id="photo_proof"
          accept="image/jpeg,image/png,image/jpg"
          onChange={handlePhotoChange}
          className="mt-1 block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-primary file:text-white
            hover:file:bg-primary-dark"
        />
        {photoProof && (
          <p className="mt-2 text-sm text-gray-600">File terpilih: {photoProof.name}</p>
        )}
      </div>

      {/* Deskripsi */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Deskripsi (Opsional)</label>
        <textarea
          id="description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          placeholder="Masukkan deskripsi tambahan jika diperlukan"
        />
      </div>

      {/* Status */}
      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as MaintenanceStatus)}
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
        >
          {Object.values(MaintenanceStatus).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors disabled:bg-gray-400"
        >
          {isSubmitting ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </form>
  );
};

export default AddMaintenanceForm;
