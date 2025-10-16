import React, { useState, useRef } from 'react';
import { AssetLoan } from '../types';

interface LoanApprovalFormProps {
  loan: AssetLoan;
  onSubmit: (formData: any) => void;
  onCancel: () => void;
  loading?: boolean;
}

const LoanApprovalForm: React.FC<LoanApprovalFormProps> = ({
  loan,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [approvalDate, setApprovalDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (JPEG, PNG, GIF)');
        return;
      }
      
      // Validate file size (2MB max)
      if (file.size > 2 * 1024 * 1024) {
        alert('File size must be less than 2MB');
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
    setError(null);

    if (!approvalDate) {
      setError('Mohon pilih tanggal verifikasi persetujuan');
      return;
    }

    if (!selectedPhoto) {
      setError('Mohon upload foto bukti peminjaman');
      return;
    }

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('approval_date', approvalDate);
    formData.append('loan_proof_photo', selectedPhoto);

    console.log('Submitting approval:', {
      approvalDate,
      hasPhoto: !!selectedPhoto,
      loanId: loan.id
    });

    // Call parent's onSubmit
    onSubmit(formData);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl mx-auto max-h-[80vh] overflow-y-auto">
      <h3 className="text-xl font-bold mb-6 text-gray-800">Form Persetujuan Peminjaman Asset</h3>
      
      {/* Loan Details */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-700 mb-2">Detail Peminjaman</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Asset:</span>
            <p className="text-gray-600">{loan.asset.name}</p>
          </div>
          <div>
            <span className="font-medium">Tag Asset:</span>
            <p className="text-gray-600">{loan.asset.asset_tag}</p>
          </div>
          <div>
            <span className="font-medium">Peminjam:</span>
            <p className="text-gray-600">{loan.borrower.name}</p>
          </div>
          <div>
            <span className="font-medium">Tanggal Permintaan:</span>
            <p className="text-gray-600">{new Date(loan.request_date).toLocaleDateString('id-ID')}</p>
          </div>
          <div>
            <span className="font-medium">Tanggal Peminjaman:</span>
            <p className="text-gray-600">{loan.loan_date ? new Date(loan.loan_date).toLocaleDateString('id-ID') : '-'}</p>
          </div>
          <div>
            <span className="font-medium">Waktu:</span>
            <p className="text-gray-600">
              {loan.start_time && loan.end_time
                ? `${loan.start_time} - ${loan.end_time} WIB`
                : '-'}
            </p>
          </div>
          <div className="col-span-2">
            <span className="font-medium">Tanggal Pengembalian Diharapkan:</span>
            <p className="text-gray-600">{new Date(loan.expected_return_date).toLocaleDateString('id-ID')}</p>
          </div>
        </div>
        <div className="mt-3">
          <span className="font-medium">Tujuan Peminjaman:</span>
          <div className="text-gray-600 mt-1 bg-white p-2 rounded border max-w-full">
            <p className="break-words whitespace-pre-wrap text-sm leading-relaxed">{loan.purpose}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Approval Date */}
        <div>
          <label htmlFor="approval_date" className="block text-sm font-medium text-gray-700 mb-2">
            Tanggal Verifikasi Persetujuan *
          </label>
          <input
            type="date"
            id="approval_date"
            value={approvalDate}
            onChange={(e) => setApprovalDate(e.target.value)}
            max={today}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Tanggal tidak boleh melebihi hari ini</p>
        </div>

        {/* Proof Photo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bukti Foto Peminjaman Asset *
          </label>
          
          {!photoPreview ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                id="loan_proof_photo"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
                required
              />
              <label htmlFor="loan_proof_photo" className="cursor-pointer">
                <div className="space-y-2">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-blue-600 hover:text-blue-500">Klik untuk upload foto</span>
                    <br />
                    atau drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF hingga 2MB</p>
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
            Upload foto bukti peminjaman asset (maksimal 2MB, format: JPG, PNG, GIF)
          </p>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            disabled={loading}
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading || !approvalDate || !selectedPhoto}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Memproses...' : 'Setujui Peminjaman'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoanApprovalForm;