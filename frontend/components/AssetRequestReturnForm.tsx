import React, { useState, useRef } from 'react';
import { AssetRequest } from '../types';

interface AssetRequestReturnFormProps {
  request: AssetRequest;
  onSubmit: (returnData: FormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

const AssetRequestReturnForm: React.FC<AssetRequestReturnFormProps> = ({
  request,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [notes, setNotes] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Mohon pilih file gambar (JPEG, PNG, JPG)');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran file harus kurang dari 5MB');
        return;
      }

      setSelectedPhoto(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setSelectedPhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPhoto) {
      if (!confirm('Anda belum mengupload foto bukti pengembalian. Lanjutkan tanpa foto?')) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('return_notes', notes);
      if (selectedPhoto) {
        formData.append('return_proof_photo', selectedPhoto);
      }

      console.log('Submitting asset request return:', {
        notes,
        hasPhoto: !!selectedPhoto,
        requestId: request.id
      });

      await onSubmit(formData);

    } catch (error: any) {
      console.error('Return submission failed:', error);
      alert(`Pengembalian gagal: ${error.message || 'Error tidak diketahui'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl mx-auto max-h-[80vh] overflow-y-auto">
      <h3 className="text-xl font-bold mb-6 text-gray-800">Form Pengembalian Asset ke Holding</h3>

      {/* Request Details */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-gray-700 mb-2">Detail Request Peminjaman</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-600">Asset:</span>
            <p className="text-gray-900 mt-1">{request.asset_name}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Unit Pemohon:</span>
            <p className="text-gray-900 mt-1">{request.requester_unit?.name || 'N/A'}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Tanggal Peminjaman:</span>
            <p className="text-gray-900 mt-1">
              {request.actual_loan_date
                ? new Date(request.actual_loan_date).toLocaleDateString('id-ID')
                : new Date(request.needed_date).toLocaleDateString('id-ID')
              }
            </p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Waktu:</span>
            <p className="text-gray-900 mt-1">
              {request.start_time && request.end_time
                ? `${request.start_time} - ${request.end_time} WIB`
                : '-'}
            </p>
          </div>
          <div className="col-span-2">
            <span className="font-medium text-gray-600">Tanggal Pengembalian Diharapkan:</span>
            <p className="text-gray-900 mt-1">{new Date(request.expected_return_date).toLocaleDateString('id-ID')}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Notes */}
        <div>
          <label htmlFor="return_notes" className="block text-sm font-medium text-gray-700 mb-2">
            Catatan Pengembalian
          </label>
          <textarea
            id="return_notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Catatan mengenai kondisi asset atau informasi penting lainnya (opsional)..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Tambahkan informasi kondisi asset atau catatan penting. Holding akan mereview dan mengkonfirmasi pengembalian.
          </p>
        </div>

        {/* Proof Photo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bukti Foto Pengembalian Asset (Opsional)
          </label>

          {!photoPreview ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                id="return_proof_photo"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <label htmlFor="return_proof_photo" className="cursor-pointer">
                <div className="space-y-2">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-blue-600 hover:text-blue-500">Klik untuk upload foto</span>
                    <br />
                    atau drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PNG, JPG, JPEG hingga 5MB</p>
                </div>
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="Preview bukti foto"
                  className="w-full h-64 object-cover rounded-lg border border-gray-300"
                />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Ganti foto
              </button>
            </div>
          )}

          <p className="text-xs text-gray-500 mt-1">
            Upload foto bukti pengembalian asset (maksimal 5MB, format: JPG, PNG, JPEG)
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-yellow-800">Informasi Penting</h4>
              <p className="text-xs text-yellow-700 mt-1">
                Setelah Anda mengajukan pengembalian, status akan menjadi "PENDING_RETURN" dan menunggu konfirmasi dari Holding.
                Holding akan mereview kondisi asset dan mengkonfirmasi penerimaan pengembalian.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            disabled={isSubmitting || loading}
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting || loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isSubmitting || loading ? 'Memproses...' : 'Ajukan Pengembalian'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AssetRequestReturnForm;
