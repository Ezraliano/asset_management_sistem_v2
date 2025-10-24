import React, { useState } from 'react';
// FIX: The `Asset` type was not imported, causing a TypeScript error. Added `Asset` to the import list from `../types`.
import { View, AssetStatus, Asset } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { addBulkAssets } from '../services/api';
import { BulkIcon } from './icons';

interface BulkTransactionProps {
  navigateTo: (view: View) => void;
}

const BulkTransaction: React.FC<BulkTransactionProps> = ({ navigateTo }) => {
  const { t } = useTranslation();
  const [csvData, setCsvData] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleImport = async () => {
    if (!csvData.trim()) {
      alert(t('bulk_transaction.alerts.no_data'));
      return;
    }
    setIsSubmitting(true);
    setError('');

    const lines = csvData.trim().split('\n');
    const header = lines.shift()?.trim().toLowerCase();

    const expectedHeader = "name,category,unit_id,value,purchasedate,usefullife,status";
    if (header !== expectedHeader) {
      setError(t('bulk_transaction.alerts.error'));
      console.error('Invalid CSV header. Expected:', expectedHeader, 'Got:', header);
      setIsSubmitting(false);
      return;
    }

    const newAssets: Omit<Asset, 'id' | 'asset_tag'>[] = [];
    const errors: string[] = [];
    const assetStatuses = Object.values(AssetStatus);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const values = line.split(',');

        if (values.length !== 7) {
            errors.push(t('bulk_transaction.errors.column_count', { row: i + 2, count: values.length }));
            continue;
        }

        const [name, category, unitIdStr, valueStr, purchaseDate, usefulLifeStr, statusStr] = values.map(v => v.trim());

        const value = parseFloat(valueStr);
        const usefulLife = parseInt(usefulLifeStr, 10);
        const unitId = unitIdStr ? parseInt(unitIdStr, 10) : null;

        if (isNaN(value) || value < 0) {
            errors.push(t('bulk_transaction.errors.invalid_value', { row: i + 2 }));
            continue;
        }

        if (isNaN(usefulLife) || usefulLife < 0) {
            errors.push(t('bulk_transaction.errors.invalid_life', { row: i + 2 }));
            continue;
        }

        if (unitIdStr && (isNaN(unitId!) || unitId! < 1)) {
            errors.push(`Row ${i + 2}: Invalid unit_id. Must be a positive number or leave empty.`);
            continue;
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(purchaseDate) || isNaN(new Date(purchaseDate).getTime())) {
            errors.push(t('bulk_transaction.errors.invalid_date', { row: i + 2 }));
            continue;
        }

        const foundStatus = assetStatuses.find(s => s.toLowerCase() === statusStr.toLowerCase());
        if (!foundStatus) {
            errors.push(t('bulk_transaction.errors.invalid_status', { row: i + 2, status: statusStr, options: assetStatuses.join(', ') }));
            continue;
        }

        newAssets.push({
            name,
            category,
            unit_id: unitId,
            value,
            purchase_date: purchaseDate,
            useful_life: usefulLife,
            status: foundStatus,
        });
    }
    
    if (errors.length > 0) {
      const detailedError = `${t('bulk_transaction.alerts.validation_error', { errorCount: errors.length })}\n- ${errors.slice(0, 5).join('\n- ')}${errors.length > 5 ? '\n...' : ''}`;
      setError(detailedError);
      console.error('Validation errors:', errors);
      setIsSubmitting(false);
      return;
    }

    try {
      if (newAssets.length === 0) {
          setError(t('bulk_transaction.alerts.no_valid_data'));
          setIsSubmitting(false);
          return;
      }
      const result = await addBulkAssets(newAssets);
      alert(t('bulk_transaction.alerts.success', { count: result.length }));
      navigateTo({ type: 'ASSET_LIST' });
    } catch (e) {
      setError(t('bulk_transaction.alerts.error'));
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold text-dark-text">{t('bulk_transaction.title')}</h1>
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-semibold mb-2">{t('bulk_transaction.csv_format_title')}</h2>
        <code className="block bg-gray-100 p-3 rounded-md text-sm text-gray-800 mb-2">{t('bulk_transaction.csv_format')}</code>
        <p className="text-sm text-medium-text mb-4">{t('bulk_transaction.csv_format_note')}</p>
        
        <textarea
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            rows={10}
            className="w-full p-3 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm whitespace-pre"
            placeholder={t('bulk_transaction.placeholder')}
        />
        {error && <p className="text-red-500 mt-2 whitespace-pre-wrap">{error}</p>}
      </div>
       <div className="flex justify-end">
            <button
                onClick={handleImport}
                disabled={isSubmitting}
                className="flex items-center justify-center bg-primary text-white font-bold py-3 px-6 rounded-lg shadow hover:bg-primary-dark transition-colors disabled:bg-gray-400"
            >
                <BulkIcon />
                <span className="ml-2">{isSubmitting ? t('bulk_transaction.importing_button') : t('bulk_transaction.import_button')}</span>
            </button>
        </div>
    </div>
  );
};

export default BulkTransaction;