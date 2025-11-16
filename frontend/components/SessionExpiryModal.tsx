import React, { useState, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';

interface SessionExpiryModalProps {
  isOpen: boolean;
  timeRemaining: number; // in milliseconds
  onExtendSession: () => void;
  onLogout: () => void;
}

const SessionExpiryModal: React.FC<SessionExpiryModalProps> = ({
  isOpen,
  timeRemaining,
  onExtendSession,
  onLogout,
}) => {
  const { t } = useTranslation();
  const [displayTime, setDisplayTime] = useState<string>('');

  // Convert milliseconds to MM:SS format
  useEffect(() => {
    if (timeRemaining <= 0) {
      setDisplayTime('00:00');
      return;
    }

    const totalSeconds = Math.floor(timeRemaining / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    setDisplayTime(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
  }, [timeRemaining]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="bg-yellow-100 rounded-full p-4">
            <svg
              className="w-8 h-8 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-dark-text mb-2">
          Sesi Anda Akan Berakhir
        </h2>

        {/* Description */}
        <p className="text-center text-medium-text mb-6">
          Karena tidak ada aktivitas, sesi Anda akan berakhir dalam:
        </p>

        {/* Timer Display */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-6 mb-6">
          <div className="text-center">
            <p className="text-sm text-medium-text mb-2">Waktu Tersisa</p>
            <p className="text-5xl font-bold text-orange-600 font-mono">{displayTime}</p>
          </div>
        </div>

        {/* Warning Message */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-700">
            <strong>Perhatian:</strong> Anda akan secara otomatis logout jika tidak ada tindakan dalam waktu yang tersisa.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onLogout}
            className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Logout
          </button>
          <button
            onClick={onExtendSession}
            className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Lanjutkan Sesi
          </button>
        </div>

        {/* Footer Info */}
        <p className="text-xs text-center text-gray-500 mt-4">
          Klik "Lanjutkan Sesi" untuk memperpanjang waktu session Anda sebanyak 1 jam lagi
        </p>
      </div>
    </div>
  );
};

export default SessionExpiryModal;
