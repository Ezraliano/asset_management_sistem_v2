import React, { useState, useEffect } from 'react';

interface AutoLogoutWarningProps {
  isVisible: boolean;
}

const AutoLogoutWarning: React.FC<AutoLogoutWarningProps> = ({ isVisible }) => {
  const [displayTime, setDisplayTime] = useState<number>(5);

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setDisplayTime((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-red-600 text-white py-3 px-4 z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg
            className="w-6 h-6 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4v2m0 4v2m0-14a9 9 0 110 18 9 9 0 010-18z"
            />
          </svg>
          <span className="font-medium">
            Sesi Anda telah berakhir. Anda akan diarahkan ke halaman login dalam {displayTime} detik...
          </span>
        </div>
      </div>
    </div>
  );
};

export default AutoLogoutWarning;
