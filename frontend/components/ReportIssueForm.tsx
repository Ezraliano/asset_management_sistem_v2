import React, { useState, useRef } from 'react';
import { Asset } from '../types';
import { createIncidentReport } from '../services/api';
import { useTranslation } from '../hooks/useTranslation';

interface ReportIssueFormProps {
  asset: Asset;
  onSuccess: () => void;
  onClose: () => void;
}

const ReportIssueForm: React.FC<ReportIssueFormProps> = ({ asset, onSuccess, onClose }) => {
  const { t } = useTranslation();
  // This form is now dedicated to Loss reports only
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Mohon pilih file gambar (JPEG, PNG, GIF)');
        return;
      }

      // Validate file size (2MB max)
      if (file.size > 2 * 1024 * 1024) {
        alert('Ukuran file harus kurang dari 2MB');
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

    if (!description || !selectedPhoto) {
      alert(t('report_issue_form.alerts.fill_fields'));
      return;
    }

    if (description.trim().length < 10) {
      alert('Deskripsi minimal 10 karakter');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('asset_id', asset.id.toString());
      formData.append('type', 'Loss'); // Always Loss
      formData.append('description', description);
      formData.append('date', date);
      formData.append('evidence_photo', selectedPhoto);

      await createIncidentReport(formData);

      alert(t('report_issue_form.alerts.success'));
      onSuccess();
    } catch (error: any) {
      console.error("Failed to submit report:", error);
      alert(error.message || t('report_issue_form.alerts.fail'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold">Laporkan Aset Hilang - {asset.name}</h2>

      {/* Info Alert */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="h-5 w-5 text-orange-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="ml-3">
            <p className="text-sm text-orange-800">
              Form ini khusus untuk melaporkan <strong>aset hilang</strong>. Laporan Anda akan direview oleh Super Admin dan Admin Holding untuk validasi.
            </p>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">{t('report_issue_form.description')}</label>
        <textarea
          name="description"
          id="description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          placeholder={t('report_issue_form.placeholders.description')}
        />
        <div className="flex justify-between mt-1">
          <p className="text-xs text-gray-500">Minimal 10 karakter</p>
          <p className="text-xs text-gray-500">{description.length}/1000</p>
        </div>
      </div>

      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700">{t('report_issue_form.date')}</label>
        <input
          type="date"
          name="date"
          id="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={today}
          required
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">Tanggal tidak boleh melebihi hari ini</p>
      </div>

      {/* Evidence Photo Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Bukti Foto *
        </label>

        {!photoPreview ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              id="evidence_photo"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
              required
            />
            <label htmlFor="evidence_photo" className="cursor-pointer">
              <div className="space-y-2">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-primary hover:text-primary-dark">Klik untuk upload foto</span>
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
              className="text-sm text-primary hover:text-primary-dark"
            >
              Ganti foto
            </button>
          </div>
        )}

        <p className="text-xs text-gray-500 mt-2">
          Upload foto bukti kehilangan (maksimal 2MB, format: JPG, PNG, GIF)
        </p>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
        >
          {t('report_issue_form.buttons.cancel')}
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !selectedPhoto || description.trim().length < 10}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? t('report_issue_form.buttons.submitting') : t('report_issue_form.buttons.submit')}
        </button>
      </div>
    </form>
  );
};

export default ReportIssueForm;
