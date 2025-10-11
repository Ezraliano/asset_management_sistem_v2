import React, { useState } from 'react';
import { requestAssetLoan } from '../services/api';

interface AssetLoanFormProps {
  assetId: number;
  onSuccess: () => void; // Callback to be called on successful request
  onCancel: () => void;
}

const AssetLoanForm: React.FC<AssetLoanFormProps> = ({ assetId, onSuccess, onCancel }) => {
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [purpose, setPurpose] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!expectedReturnDate || !purpose) {
      setError('Please fill in all fields.');
      return;
    }

    setIsLoading(true);
    try {
      await requestAssetLoan({
        asset_id: assetId,
        expected_return_date: expectedReturnDate,
        purpose: purpose,
      });
      alert('Loan request submitted successfully!');
      onSuccess(); // Trigger the success callback
    } catch (err: any) {
      setError(err.message || 'Failed to submit loan request.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-bold mb-4">Request to Borrow Asset</h3>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="expectedReturnDate" className="block text-sm font-medium text-gray-700">Expected Return Date</label>
          <input
            type="date"
            id="expectedReturnDate"
            min={getTodayString()}
            value={expectedReturnDate}
            onChange={(e) => setExpectedReturnDate(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="purpose" className="block text-sm font-medium text-gray-700">Purpose / Description</label>
          <textarea
            id="purpose"
            rows={3}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="e.g., For event at location X"
            required
          />
        </div>
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
            disabled={isLoading}
          >
            {isLoading ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AssetLoanForm;
