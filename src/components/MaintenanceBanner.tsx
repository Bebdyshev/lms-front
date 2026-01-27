import React, { useState, useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';

const MaintenanceBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if the user has dismissed the banner
    const isDismissed = localStorage.getItem('maintenance_banner_dismissed');
    if (!isDismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('maintenance_banner_dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="bg-yellow-50 border-b border-yellow-200">
      <div className="max-w-7xl mx-auto py-2 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap">
          <div className="flex-1 flex items-center justify-center">
            <span className="flex p-1 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-700" aria-hidden="true" />
            </span>
            <p className="ml-3 font-medium text-yellow-800 truncate text-sm sm:text-base">
              <span className="md:hidden">LMS unavailable tomorrow from 18:00</span>
              <span className="hidden md:inline">
                Attention: Tomorrow (Jan 28) at 18:00 the LMS will be temporarily unavailable due to technical updates.
              </span>
            </p>
          </div>
          <div className="flex-shrink-0">
            <button
              type="button"
              onClick={handleDismiss}
              className="flex p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors"
              title="Dismiss"
            >
              <X className="h-4 w-4 text-yellow-700" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceBanner;
