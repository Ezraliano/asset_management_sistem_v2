import React, { useState, useEffect } from 'react';
import { addAsset, updateAsset } from '../services/api';
import { Asset, AssetStatus } from '../types';
import { formatToRupiah } from '../utils/formatters';
import { useTranslation } from '../hooks/useTranslation';

interface AssetFormProps {
  asset?: Asset;
  onSuccess: () => void;
}

const AssetForm: React.FC<AssetFormProps> = ({ asset, onSuccess }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    location: '',
    value: 0,
    purchaseDate: '',
    usefulLife: 0 as number | '', // Allow empty string for clearing input
    status: AssetStatus.InUse,
  });

  useEffect(() => {
    if (asset) {
      setFormData({
        name: asset.name,
        category: asset.category,
        location: asset.location,
        value: asset.value,
        purchaseDate: asset.purchaseDate,
        usefulLife: asset.usefulLife,
        status: asset.status,
      });
    } else {
       setFormData({
        name: '', category: '', location: '', value: 0,
        purchaseDate: new Date().toISOString().split('T')[0],
        usefulLife: 0, // Set default useful life to 0
        status: AssetStatus.InUse,
      });
    }
  }, [asset]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'value') {
      const numericValue = Number(value.replace(/[^0-9]/g, ''));
      setFormData(prev => ({ ...prev, value: isNaN(numericValue) ? 0 : numericValue }));
    } else if (name === 'usefulLife') {
      // Allow empty string to be set in state, enabling user to clear the input
      if (value === '') {
        setFormData(prev => ({ ...prev, usefulLife: '' }));
      } else {
         const numValue = Number(value);
         // Only update if it's a non-negative number
         if (!isNaN(numValue) && numValue >= 0) {
            setFormData(prev => ({ ...prev, usefulLife: numValue }));
         }
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Ensure usefulLife is a number before submitting
    const finalFormData = {
        ...formData,
        usefulLife: Number(formData.usefulLife) || 0,
    };

    if (asset) {
      await updateAsset(asset.id, finalFormData);
    } else {
      await addAsset(finalFormData);
    }
    onSuccess();
  };

  const availableStatuses = asset
    ? Object.values(AssetStatus) // Edit mode: show all statuses
    : [AssetStatus.InUse, AssetStatus.InRepair]; // Add mode: only show 'In Use' and 'In Repair'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold">{asset ? t('asset_form.edit_title') : t('asset_form.add_title')}</h2>
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">{t('asset_form.labels.name')}</label>
        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
      </div>
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700">{t('asset_form.labels.category')}</label>
        <input type="text" name="category" id="category" value={formData.category} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
      </div>
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700">{t('asset_form.labels.location')}</label>
        <input type="text" name="location" id="location" value={formData.location} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
      </div>
       <div>
        <label htmlFor="value" className="block text-sm font-medium text-gray-700">{t('asset_form.labels.value')}</label>
        <input 
            type="text" 
            name="value" 
            id="value" 
            value={formatToRupiah(formData.value)} 
            onChange={handleChange} 
            required 
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" 
        />
      </div>
      <div>
        <label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-700">{t('asset_form.labels.purchase_date')}</label>
        <input type="date" name="purchaseDate" id="purchaseDate" value={formData.purchaseDate} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
      </div>
       <div>
        <label htmlFor="usefulLife" className="block text-sm font-medium text-gray-700">{t('asset_form.labels.useful_life')}</label>
        <input type="number" name="usefulLife" id="usefulLife" value={formData.usefulLife} onChange={handleChange} required min="0" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
      </div>
      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700">{t('asset_form.labels.status')}</label>
        <select name="status" id="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
          {availableStatuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="flex justify-end">
        <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors">
          {asset ? t('asset_form.buttons.save') : t('asset_form.buttons.create')}
        </button>
      </div>
    </form>
  );
};

export default AssetForm;