import React, { useState } from 'react';
import { Asset } from '../types';
import { addAssetMovement } from '../services/api';
import { useTranslation } from '../hooks/useTranslation';

interface MoveAssetFormProps {
  asset: Asset;
  onSuccess: () => void;
  onClose: () => void;
}

const MoveAssetForm: React.FC<MoveAssetFormProps> = ({ asset, onSuccess, onClose }) => {
  const { t } = useTranslation();
  const [location, setLocation] = useState('');
  const [movedBy, setMovedBy] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location || !movedBy) {
        alert(t('move_asset_form.alerts.fill_fields'));
        return;
    }
    setIsSubmitting(true);
    try {
        await addAssetMovement({
          assetId: asset.id,
          location,
          movedBy,
        });
        onSuccess();
    } catch(error) {
        console.error("Failed to move asset:", error);
        alert(t('move_asset_form.alerts.fail'));
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold">{t('move_asset_form.title', { assetName: asset.name })}</h2>
      <p>{t('move_asset_form.current_location')}: <strong>{asset.location}</strong></p>
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700">{t('move_asset_form.new_location')}</label>
        <input
          type="text"
          name="location"
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          placeholder={t('move_asset_form.placeholders.location')}
        />
      </div>
      <div>
        <label htmlFor="movedBy" className="block text-sm font-medium text-gray-700">{t('move_asset_form.moved_by')}</label>
        <input
          type="text"
          name="movedBy"
          id="movedBy"
          value={movedBy}
          onChange={(e) => setMovedBy(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          placeholder={t('move_asset_form.placeholders.name')}
        />
      </div>
      <div className="flex justify-end space-x-2 pt-4">
        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors">
          {t('move_asset_form.buttons.cancel')}
        </button>
        <button type="submit" disabled={isSubmitting} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors disabled:bg-gray-400">
          {isSubmitting ? t('move_asset_form.buttons.moving') : t('move_asset_form.buttons.confirm')}
        </button>
      </div>
    </form>
  );
};

export default MoveAssetForm;