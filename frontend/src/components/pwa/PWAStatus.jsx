import React, { useState, useEffect } from 'react';

const PWAStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInstalled, setIsInstalled] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    // Check if app is installed
    const checkInstallation = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = window.navigator.standalone === true;
      setIsInstalled(isStandaloneMode || isIOSStandalone);
    };

    checkInstallation();

    // Online/offline status
    const handleOnline = () => {
      setIsOnline(true);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowStatus(true);
    };

    // Service worker update detection
    const handleServiceWorkerUpdate = () => {
      setUpdateAvailable(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Listen for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
          handleServiceWorkerUpdate();
        }
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleUpdateApp = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration && registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        }
      });
    }
  };

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500';
    if (updateAvailable) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline Mode';
    if (updateAvailable) return 'Update Available';
    return 'Online';
  };

  const getStatusIcon = () => {
    if (!isOnline) return '📴';
    if (updateAvailable) return '🔄';
    return '🌐';
  };

  return (
    <>
      {/* Status Indicator */}
      <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
        showStatus || !isOnline || updateAvailable ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        <div className={`${getStatusColor()} text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2`}>
          <span>{getStatusIcon()}</span>
          <span className="text-sm font-medium">{getStatusText()}</span>
          
          {updateAvailable && (
            <button
              onClick={handleUpdateApp}
              className="ml-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-2 py-1 rounded text-xs transition-colors"
            >
              Update
            </button>
          )}
        </div>
      </div>

      {/* Offline Banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-yellow-900 p-2 z-40">
          <div className="max-w-7xl mx-auto text-center">
            <p className="text-sm font-medium">
              📴 You're offline. Some features may be limited, but you can still browse your saved books.
            </p>
          </div>
        </div>
      )}

      {/* Update Available Banner */}
      {updateAvailable && isOnline && (
        <div className="fixed bottom-4 left-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-xl">🔄</span>
              <div>
                <h4 className="font-semibold">Update Available</h4>
                <p className="text-sm text-blue-100">
                  A new version of Library Tracker is ready
                </p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setUpdateAvailable(false)}
                className="text-blue-100 hover:text-white p-1"
                aria-label="Dismiss update"
              >
                ✕
              </button>
              <button
                onClick={handleUpdateApp}
                className="bg-white text-blue-600 hover:bg-blue-50 px-3 py-1 rounded text-sm font-medium transition-colors"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PWA Installation Status */}
      {isInstalled && (
        <div className="fixed bottom-4 left-4 bg-green-600 text-white p-3 rounded-lg shadow-lg z-50 opacity-90">
          <div className="flex items-center space-x-2">
            <span className="text-lg">📱</span>
            <span className="text-sm font-medium">PWA Mode Active</span>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAStatus;
