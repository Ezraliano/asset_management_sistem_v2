import React, { useState } from 'react';
import { Asset, MaintenanceStatus } from '../types';
import { addMaintenance } from '../services/api';
import { useTranslation } from '../hooks/useTranslation';

interface AddMaintenanceFormProps {
  asset: Asset;
  onSuccess: () => void;
  onClose: () => void;
}

const AddMaintenanceForm: React.FC<AddMaintenanceFormProps> = ({ asset, onSuccess, onClose }) => {
  const { t } = useTranslation();
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<MaintenanceStatus>(MaintenanceStatus.Scheduled);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description) {
      alert(t('add_maintenance_form.alerts.fill_fields'));
      return;
    }
    setIsSubmitting(true);
    try {
      await addMaintenance({
        assetId: asset.id,
        description,
        date,
        status,
      });
      alert(t('add_maintenance_form.alerts.success'));
      onSuccess();
    } catch (error) {
      console.error("Failed to add maintenance record:", error);
      alert(t('add_maintenance_form.alerts.fail'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold">{t('add_maintenance_form.title', { assetName: asset.name })}</h2>
      
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">{t('add_maintenance_form.description')}</label>
        <textarea
          name="description"
          id="description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          placeholder={t('add_maintenance_form.placeholders.description')}
        />
      </div>

       <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700">{t('add_maintenance_form.date')}</label>
        <input 
          type="date" 
          name="date" 
          id="date" 
          value={date} 
          onChange={(e) => setDate(e.target.value)} 
          required 
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
      </div>

       <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700">{t('add_maintenance_form.status')}</label>
        <select 
            name="status" 
            id="status" 
            value={status} 
            onChange={(e) => setStatus(e.target.value as MaintenanceStatus)} 
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
          {Object.values(MaintenanceStatus).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors">
          {t('add_maintenance_form.buttons.cancel')}
        </button>
        <button type="submit" disabled={isSubmitting} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors disabled:bg-gray-400">
          {isSubmitting ? t('add_maintenance_form.buttons.submitting') : t('add_maintenance_form.buttons.submit')}
        </button>
      </div>
    </form>
  );
};

export default AddMaintenanceForm;
