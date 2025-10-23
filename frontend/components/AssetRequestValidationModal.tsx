import React, { useState, useRef, useEffect } from 'react';
import { AssetRequest, Asset } from '../types';
import AssetRequestReturnForm from './AssetRequestReturnForm';

interface AssetRequestValidationModalProps {
  request: AssetRequest;
  currentUser: any;
  onSuccess: () => void;
  onCancel: () => void;
}

const AssetRequestValidationModal: React.FC<AssetRequestValidationModalProps> = ({
  request,
  currentUser,
  onSuccess,
  onCancel,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showApproveForm, setShowApproveForm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [showConfirmReturnForm, setShowConfirmReturnForm] = useState(false);
  const [showRejectReturnForm, setShowRejectReturnForm] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [returnRejectionReason, setReturnRejectionReason] = useState('');

  // New states for approval form
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [loanPhoto, setLoanPhoto] = useState<File | null>(null);
  const [loanPhotoPreview, setLoanPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch available assets when approve form is shown
  useEffect(() => {
    if (showApproveForm && canValidate) {
      fetchAvailableAssets();
    }
  }, [showApproveForm]);

  const fetchAvailableAssets = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:8000/api/asset-requests-available-assets', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Gagal mengambil data asset');
      }

      const data = await response.json();
      setAvailableAssets(data.data || []);
    } catch (error: any) {
      console.error('Failed to fetch available assets:', error);
      alert('Gagal mengambil data asset yang tersedia');
    }
  };

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

      setLoanPhoto(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLoanPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setLoanPhoto(null);
    setLoanPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('auth_token');
      const formData = new FormData();
      formData.append('approval_notes', approvalNotes);
      if (selectedAssetId) {
        formData.append('asset_id', selectedAssetId.toString());
      }
      if (loanPhoto) {
        formData.append('loan_photo', loanPhoto);
      }

      const response = await fetch(`http://localhost:8000/api/asset-requests/${request.id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal menyetujui request');
      }

      alert('Request berhasil disetujui. Peminjaman asset telah diaktifkan.');
      onSuccess();
    } catch (error: any) {
      console.error('Failed to approve request:', error);
      alert(error.message || 'Gagal menyetujui request');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Mohon isi alasan penolakan');
      return;
    }

    setIsProcessing(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:8000/api/asset-requests/${request.id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rejection_reason: rejectionReason,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal menolak request');
      }

      alert('Request berhasil ditolak.');
      onSuccess();
    } catch (error: any) {
      console.error('Failed to reject request:', error);
      alert(error.message || 'Gagal menolak request');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReturnAsset = async (formData: FormData) => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:8000/api/asset-requests/${request.id}/return`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal mengajukan pengembalian');
      }

      alert('Pengembalian asset berhasil diajukan. Menunggu konfirmasi dari Holding.');
      setShowReturnForm(false);
      onSuccess();
    } catch (error: any) {
      console.error('Failed to submit return:', error);
      alert(error.message || 'Gagal mengajukan pengembalian');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmReturn = async () => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:8000/api/asset-requests/${request.id}/confirm-return`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal mengkonfirmasi pengembalian');
      }

      alert('Pengembalian asset berhasil dikonfirmasi.');
      onSuccess();
    } catch (error: any) {
      console.error('Failed to confirm return:', error);
      alert(error.message || 'Gagal mengkonfirmasi pengembalian');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectReturn = async () => {
    if (!returnRejectionReason.trim()) {
      alert('Mohon isi alasan penolakan pengembalian');
      return;
    }

    setIsProcessing(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:8000/api/asset-requests/${request.id}/reject-return`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          return_rejection_reason: returnRejectionReason,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal menolak pengembalian');
      }

      alert('Pengembalian ditolak. Unit harus mengajukan pengembalian ulang.');
      onSuccess();
    } catch (error: any) {
      console.error('Failed to reject return:', error);
      alert(error.message || 'Gagal menolak pengembalian');
    } finally {
      setIsProcessing(false);
    }
  };

  const canValidate =
    (currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin Holding') &&
    request.status === 'PENDING';

  const canReturn =
    currentUser?.role === 'Admin Unit' &&
    request.status === 'APPROVED' &&
    request.loan_status === 'ACTIVE' &&
    request.requester_unit_id === currentUser?.unit_id;

  // // Debug logging untuk troubleshooting
  // console.log('🔍 DEBUG canReturn:', {
  //   canReturn,
  //   userRole: currentUser?.role,
  //   requestStatus: request.status,
  //   loanStatus: request.loan_status,
  //   requesterUnitId: request.requester_unit_id,
  //   currentUserUnitId: currentUser?.unit_id,
  //   match: request.requester_unit_id === currentUser?.unit_id
  // });

  const canConfirmReturn =
    (currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin Holding') &&
    request.loan_status === 'PENDING_RETURN';

  // Show return form if user clicks return button
  if (showReturnForm) {
    return (
      <AssetRequestReturnForm
        request={request}
        onSubmit={handleReturnAsset}
        onCancel={() => setShowReturnForm(false)}
        loading={isProcessing}
      />
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-3xl mx-auto max-h-[90vh] overflow-y-auto">
      <h3 className="text-xl font-bold mb-6 text-gray-800">Detail Request Peminjaman Asset</h3>

      {/* Request Info */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="font-semibold text-gray-700 mb-3">Informasi Request</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className={currentUser?.role === 'Admin Unit' ? 'col-span-2' : ''}>
            <span className="font-medium text-gray-600">Unit Pemohon:</span>
            <p className="text-gray-900 mt-1">{request.requester_unit?.name || request.requester?.name || 'N/A'}</p>
          </div>
          {currentUser?.role !== 'Admin Unit' && (
            <div>
              <span className="font-medium text-gray-600">Nama Pemohon:</span>
              <p className="text-gray-900 mt-1">{request.requester?.name || 'N/A'}</p>
            </div>
          )}
          <div>
            <span className="font-medium text-gray-600">Tanggal Request:</span>
            <p className="text-gray-900 mt-1">
              {new Date(request.request_date).toLocaleDateString('id-ID')}
            </p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Status Request:</span>
            <p className="mt-1">
              <span
                className={`px-2 py-1 rounded text-xs font-semibold ${
                  request.status === 'PENDING'
                    ? 'bg-yellow-100 text-yellow-800'
                    : request.status === 'APPROVED'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {request.status}
              </span>
            </p>
          </div>
          {request.loan_status && (
            <div className="col-span-2">
              <span className="font-medium text-gray-600">Status Peminjaman:</span>
              <p className="mt-1">
                <span
                  className={`px-2 py-1 rounded text-xs font-semibold ${
                    request.loan_status === 'ACTIVE'
                      ? 'bg-blue-100 text-blue-800'
                      : request.loan_status === 'PENDING_RETURN'
                      ? 'bg-yellow-100 text-yellow-800'
                      : request.loan_status === 'RETURNED'
                      ? 'bg-green-100 text-green-800'
                      : request.loan_status === 'OVERDUE'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {request.loan_status === 'ACTIVE' && 'Sedang Dipinjam'}
                  {request.loan_status === 'PENDING_RETURN' && 'Menunggu Konfirmasi Pengembalian'}
                  {request.loan_status === 'RETURNED' && 'Sudah Dikembalikan'}
                  {request.loan_status === 'OVERDUE' && 'Terlambat'}
                  {request.loan_status === 'NOT_STARTED' && 'Belum Dimulai'}
                </span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Asset Info */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-gray-700 mb-3">Asset yang Diminta</h4>
        <div className="text-sm">
          <span className="font-medium text-gray-600">Nama Asset:</span>
          <p className="text-gray-900 mt-1">{request.asset_name || 'N/A'}</p>
        </div>
      </div>

      {/* Loan Details */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="font-semibold text-gray-700 mb-3">Detail Peminjaman</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-600">Tanggal Peminjaman:</span>
            <p className="text-gray-900 mt-1">
              {new Date(request.needed_date).toLocaleDateString('id-ID')}
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
            <span className="font-medium text-gray-600">Tanggal Pengembalian:</span>
            <p className="text-gray-900 mt-1">
              {new Date(request.expected_return_date).toLocaleDateString('id-ID')}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <span className="font-medium text-gray-600">Tujuan Peminjaman Asset</span>
          <div className="text-gray-900 mt-1 bg-white p-3 rounded border">
            <p className="text-sm whitespace-pre-wrap">{request.purpose}</p>
          </div>
        </div>

        <div className="mt-4">
          <span className="font-medium text-gray-600">Alasan Request Peminjaman</span>
          <div className="text-gray-900 mt-1 bg-white p-3 rounded border">
            <p className="text-sm whitespace-pre-wrap">{request.reason}</p>
          </div>
        </div>
      </div>

      {/* Review Info */}
      {request.status !== 'PENDING' && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-700 mb-3">Informasi Validasi</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Divalidasi oleh:</span>
              <p className="text-gray-900 mt-1">{request.reviewer?.name || '-'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Tanggal Validasi:</span>
              <p className="text-gray-900 mt-1">
                {request.review_date
                  ? new Date(request.review_date).toLocaleDateString('id-ID')
                  : '-'}
              </p>
            </div>
          </div>

          {request.status === 'APPROVED' && request.asset && (
            <div className="mt-4">
              <span className="font-medium text-gray-600">Asset yang Dipinjamkan:</span>
              <div className="text-gray-900 mt-1 bg-white p-3 rounded border">
                <p className="text-sm font-semibold">{request.asset.asset_tag} - {request.asset.name}</p>
                <p className="text-xs text-gray-600 mt-1">
                  Kategori: {request.asset.category} | Unit: {request.asset.unit?.name || 'N/A'}
                </p>
              </div>
            </div>
          )}

          {request.status === 'APPROVED' && request.loan_photo_path && (
            <div className="mt-4">
              <span className="font-medium text-gray-600">Foto Asset:</span>
              <div className="mt-2">
                <img
                  src={`http://localhost:8000/storage/${request.loan_photo_path}`}
                  alt="Foto asset yang dipinjamkan"
                  className="w-full max-w-md h-64 object-cover rounded-lg border border-gray-300"
                />
              </div>
            </div>
          )}

          {request.status === 'APPROVED' && request.approval_notes && (
            <div className="mt-4">
              <span className="font-medium text-gray-600">Catatan Persetujuan:</span>
              <div className="text-gray-900 mt-1 bg-white p-3 rounded border">
                <p className="text-sm">{request.approval_notes}</p>
              </div>
            </div>
          )}

          {request.status === 'REJECTED' && request.rejection_reason && (
            <div className="mt-4">
              <span className="font-medium text-gray-600">Alasan Penolakan:</span>
              <div className="text-red-900 mt-1 bg-red-50 p-3 rounded border border-red-200">
                <p className="text-sm">{request.rejection_reason}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Return Info - Show if there's return data */}
      {request.loan_status === 'PENDING_RETURN' || request.loan_status === 'RETURNED' ? (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-gray-700 mb-3">Informasi Pengembalian</h4>

          {request.return_notes && (
            <div className="mb-3">
              <span className="font-medium text-gray-600">Catatan Pengembalian:</span>
              <div className="text-gray-900 mt-1 bg-white p-3 rounded border">
                <p className="text-sm">{request.return_notes}</p>
              </div>
            </div>
          )}

          {request.return_proof_photo_path && (
            <div className="mb-3">
              <span className="font-medium text-gray-600">Foto Bukti Pengembalian:</span>
              <div className="mt-2">
                <img
                  src={`http://localhost:8000/storage/${request.return_proof_photo_path}`}
                  alt="Bukti pengembalian"
                  className="w-full max-w-md h-48 object-cover rounded border"
                />
              </div>
            </div>
          )}

          {request.loan_status === 'RETURNED' && (
            <div className="grid grid-cols-2 gap-4 text-sm mt-3">
              <div>
                <span className="font-medium text-gray-600">Dikonfirmasi oleh:</span>
                <p className="text-gray-900 mt-1">{request.return_confirmer?.name || '-'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Tanggal Konfirmasi:</span>
                <p className="text-gray-900 mt-1">
                  {request.return_confirmation_date
                    ? new Date(request.return_confirmation_date).toLocaleDateString('id-ID')
                    : '-'}
                </p>
              </div>
            </div>
          )}

          {request.return_rejection_reason && (
            <div className="mt-3">
              <span className="font-medium text-gray-600">Alasan Penolakan Pengembalian:</span>
              <div className="text-red-900 mt-1 bg-red-50 p-3 rounded border border-red-200">
                <p className="text-sm">{request.return_rejection_reason}</p>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Action Buttons - Only show if PENDING */}
      {canValidate && !showApproveForm && !showRejectForm && (
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
            disabled={isProcessing}
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={() => setShowRejectForm(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            disabled={isProcessing}
          >
            Tolak Request
          </button>
          <button
            type="button"
            onClick={() => setShowApproveForm(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            disabled={isProcessing}
          >
            Setujui Request
          </button>
        </div>
      )}

      {/* Approve Form */}
      {showApproveForm && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-semibold text-green-800 mb-3">Setujui Request</h4>
          <p className="text-sm text-green-700 mb-4">
            Pilih asset yang akan dipinjamkan dan upload foto asset untuk dikirim ke unit pemohon.
          </p>

          {/* Asset Selection Dropdown */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pilih Asset yang Akan Dipinjamkan (Opsional)
            </label>
            <select
              value={selectedAssetId || ''}
              onChange={(e) => setSelectedAssetId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">-- Pilih Asset (Opsional) --</option>
              {availableAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.asset_tag} - {asset.name} ({asset.unit?.name || 'Tidak ada unit'})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Pilih asset spesifik yang akan dipinjamkan. Jika dipilih, status asset akan otomatis menjadi "Terpinjam".
            </p>
          </div>

          {/* Photo Upload */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Foto Asset (Opsional)
            </label>

            {!loanPhotoPreview ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="loan_photo"
                  accept="image/jpeg,image/png,image/jpg"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <label htmlFor="loan_photo" className="cursor-pointer">
                  <div className="space-y-2">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-green-600 hover:text-green-500">Klik untuk upload foto</span>
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
                    src={loanPhotoPreview}
                    alt="Preview foto asset"
                    className="w-full h-48 object-cover rounded-lg border border-gray-300"
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
                  className="text-sm text-green-600 hover:text-green-500"
                >
                  Ganti foto
                </button>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Upload foto asset yang akan dipinjamkan untuk informasi unit pemohon.
            </p>
          </div>

          {/* Approval Notes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Catatan Persetujuan (Opsional)
            </label>
            <textarea
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Tambahkan catatan jika diperlukan..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowApproveForm(false);
                setApprovalNotes('');
                setSelectedAssetId(null);
                setLoanPhoto(null);
                setLoanPhotoPreview(null);
              }}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
              disabled={isProcessing}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleApprove}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              disabled={isProcessing}
            >
              {isProcessing ? 'Memproses...' : 'Konfirmasi Setujui'}
            </button>
          </div>
        </div>
      )}

      {/* Reject Form */}
      {showRejectForm && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="font-semibold text-red-800 mb-3">Tolak Request</h4>
          <p className="text-sm text-red-700 mb-4">
            Mohon berikan alasan penolakan yang jelas untuk unit pemohon.
          </p>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alasan Penolakan *
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Jelaskan alasan penolakan..."
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowRejectForm(false);
                setRejectionReason('');
              }}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
              disabled={isProcessing}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleReject}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              disabled={isProcessing}
            >
              {isProcessing ? 'Memproses...' : 'Konfirmasi Tolak'}
            </button>
          </div>
        </div>
      )}

      {/* Return Action Buttons - For Admin Unit */}
      {canReturn && !showConfirmReturnForm && !showRejectReturnForm && (
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
            disabled={isProcessing}
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={() => {
              console.log('🔵 Tombol Kembalikan Asset diklik');
              setShowReturnForm(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            disabled={isProcessing}
          >
            Kembalikan Asset
          </button>
        </div>
      )}

      {/* Debug Info - Hanya untuk development
      {currentUser?.role === 'Admin Unit' && !canReturn && request.status === 'APPROVED' && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800 font-medium">
            ℹ️ Informasi: Tombol pengembalian tidak muncul
          </p>
          <ul className="text-xs text-yellow-700 mt-2 space-y-1 ml-4">
            <li>• Status Request: {request.status}</li>
            <li>• Status Peminjaman: {request.loan_status || 'Tidak ada'}</li>
            <li>• Unit Pemohon ID: {request.requester_unit_id}</li>
            <li>• Unit Anda ID: {currentUser?.unit_id}</li>
            <li>• Role Anda: {currentUser?.role}</li>
          </ul>
          <p className="text-xs text-yellow-700 mt-2">
            Untuk dapat mengembalikan asset, pastikan:
            <br />1. Status peminjaman adalah "ACTIVE"
            <br />2. Unit Anda adalah unit yang meminjam
          </p>
        </div>
      )} */}

      {/* Confirm Return Buttons - For Holding */}
      {canConfirmReturn && !showConfirmReturnForm && !showRejectReturnForm && (
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
            disabled={isProcessing}
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={() => setShowRejectReturnForm(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            disabled={isProcessing}
          >
            Tolak Pengembalian
          </button>
          <button
            type="button"
            onClick={() => setShowConfirmReturnForm(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            disabled={isProcessing}
          >
            Konfirmasi Pengembalian
          </button>
        </div>
      )}

      {/* Confirm Return Form */}
      {showConfirmReturnForm && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-semibold text-green-800 mb-3">Konfirmasi Pengembalian Asset</h4>
          <p className="text-sm text-green-700 mb-4">
            Apakah Anda yakin ingin mengkonfirmasi bahwa asset telah diterima kembali dengan baik?
            Status akan berubah menjadi "RETURNED".
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowConfirmReturnForm(false)}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
              disabled={isProcessing}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmReturn}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              disabled={isProcessing}
            >
              {isProcessing ? 'Memproses...' : 'Konfirmasi Penerimaan'}
            </button>
          </div>
        </div>
      )}

      {/* Reject Return Form */}
      {showRejectReturnForm && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="font-semibold text-red-800 mb-3">Tolak Pengembalian</h4>
          <p className="text-sm text-red-700 mb-4">
            Jika asset belum diterima atau ada masalah, Anda dapat menolak pengembalian.
            Unit harus mengajukan pengembalian ulang.
          </p>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alasan Penolakan *
            </label>
            <textarea
              value={returnRejectionReason}
              onChange={(e) => setReturnRejectionReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Jelaskan alasan penolakan pengembalian..."
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowRejectReturnForm(false);
                setReturnRejectionReason('');
              }}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
              disabled={isProcessing}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleRejectReturn}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              disabled={isProcessing}
            >
              {isProcessing ? 'Memproses...' : 'Konfirmasi Tolak'}
            </button>
          </div>
        </div>
      )}

      {/* Close button if already processed or no actions available */}
      {!canValidate && !canReturn && !canConfirmReturn && (
        <div className="flex justify-end pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
          >
            Tutup
          </button>
        </div>
      )}
    </div>
  );
};

export default AssetRequestValidationModal;
