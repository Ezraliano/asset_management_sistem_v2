import React, { useState } from 'react';
import { Asset } from '../types';
import { addDamageReport, addLossReport } from '../services/api';
import { useTranslation } from '../hooks/useTranslation';

interface ReportIssueFormProps {
  asset: Asset;
  onSuccess: () => void;
  onClose: () => void;
}

const ReportIssueForm: React.FC<ReportIssueFormProps> = ({ asset, onSuccess, onClose }) => {
  const { t } = useTranslation();
  const [reportType, setReportType] = useState<'damage' | 'loss' | ''>('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportType || !description) {
      alert(t('report_issue_form.alerts.fill_fields'));
      return;
    }
    setIsSubmitting(true);
    try {
      const reportData = { assetId: asset.id, description, date };
      if (reportType === 'damage') {
        await addDamageReport(reportData);
      } else {
        await addLossReport(reportData);
      }
      alert(t('report_issue_form.alerts.success'));
      onSuccess();
    } catch (error) {
      console.error("Failed to submit report:", error);
      alert(t('report_issue_form.alerts.fail'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold">{t('report_issue_form.title', { assetName: asset.name })}</h2>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">{t('report_issue_form.report_type')}</label>
        <div className="mt-2 flex space-x-6">
          {/* Custom Damage Radio Button */}
          <label className="flex items-center cursor-pointer">
            <input 
              type="radio" 
              name="reportType" 
              value="damage" 
              checked={reportType === 'damage'} 
              onChange={() => setReportType('damage')} 
              className="sr-only peer" 
            />
            <div className="
              w-5 h-5 rounded-full border-2 border-gray-400 bg-white
              peer-checked:bg-primary peer-checked:border-primary
              transition-colors duration-200
              peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-primary
            ">
            </div>
            <span className="ml-2 text-sm text-gray-700">{t('report_issue_form.type_damage')}</span>
          </label>
          {/* Custom Loss Radio Button */}
          <label className="flex items-center cursor-pointer">
            <input 
              type="radio" 
              name="reportType" 
              value="loss" 
              checked={reportType === 'loss'} 
              onChange={() => setReportType('loss')} 
              className="sr-only peer" 
            />
            <div className="
              w-5 h-5 rounded-full border-2 border-gray-400 bg-white
              peer-checked:bg-primary peer-checked:border-primary
              transition-colors duration-200
              peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-primary
            ">
            </div>
            <span className="ml-2 text-sm text-gray-700">{t('report_issue_form.type_loss')}</span>
          </label>
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
      </div>

       <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700">{t('report_issue_form.date')}</label>
        <input 
          type="date" 
          name="date" 
          id="date" 
          value={date} 
          onChange={(e) => setDate(e.target.value)} 
          required 
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors">
          {t('report_issue_form.buttons.cancel')}
        </button>
        <button type="submit" disabled={isSubmitting} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors disabled:bg-gray-400">
          {isSubmitting ? t('report_issue_form.buttons.submitting') : t('report_issue_form.buttons.submit')}
        </button>
      </div>
    </form>
  );
};

export default ReportIssueForm;