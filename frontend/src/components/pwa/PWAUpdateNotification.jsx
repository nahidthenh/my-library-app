import React, { useState, useEffect } from 'react';

const PWAUpdateNotification = () => {
  const [showUpdate, setShowUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    // Listen for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
          setShowUpdate(true);
          setRegistration(event.data.registration);
        }
      });

      // Check for existing waiting service worker
      navigator.serviceWorker.ready.then((reg) => {
        if (reg.waiting) {
          setShowUpdate(true);
          setRegistration(reg);
        }
      });
    }
  }, []);

  const handleUpdate = async () => {
    if (!registration) return;

    setIsUpdating(true);

    try {
      // Tell the waiting service worker to skip waiting
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // Listen for the controlling service worker change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Reload the page to get the new version
        window.location.reload();
      });
    } catch (error) {
      console.error('Failed to update app:', error);
      setIsUpdating(false);
    }
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 animate-slide-up">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <svg 
                className="w-5 h-5 text-blue-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" 
                />
              </svg>
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">
                App Update Available
              </h3>
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Dismiss update notification"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mt-1">
              A new version of Library Tracker is available with improvements and bug fixes.
            </p>
            
            <div className="flex space-x-2 mt-3">
              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 px-3 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isUpdating ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Updating...</span>
                  </div>
                ) : (
                  'Update Now'
                )}
              </button>
              
              <button
                onClick={handleDismiss}
                className="flex-1 bg-gray-100 text-gray-700 text-sm font-medium py-2 px-3 rounded-md hover:bg-gray-200 transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced PWA Status component with more features
export const EnhancedPWAStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [cacheSize, setCacheSize] = useState(null);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for sync messages from service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SYNC_COMPLETE') {
          setSyncStatus('completed');
          setTimeout(() => setSyncStatus('idle'), 3000);
        }
      });
    }

    // Get cache size
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then((estimate) => {
        setCacheSize({
          used: Math.round(estimate.usage / 1024 / 1024 * 100) / 100, // MB
          quota: Math.round(estimate.quota / 1024 / 1024 / 1024 * 100) / 100 // GB
        });
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500';
    if (syncStatus === 'syncing') return 'bg-yellow-500';
    if (syncStatus === 'completed') return 'bg-green-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (syncStatus === 'syncing') return 'Syncing...';
    if (syncStatus === 'completed') return 'Synced';
    return 'Online';
  };

  return (
    <>
      {/* Status indicator */}
      <div 
        className="fixed top-4 right-4 z-40 cursor-pointer"
        onClick={() => setShowStatus(!showStatus)}
      >
        <div className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse`}></div>
      </div>

      {/* Detailed status panel */}
      {showStatus && (
        <div className="fixed top-12 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-40 w-64">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Connection</span>
              <span className={`text-sm font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                {getStatusText()}
              </span>
            </div>

            {cacheSize && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Cache</span>
                <span className="text-sm text-gray-600">
                  {cacheSize.used} MB / {cacheSize.quota} GB
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">PWA</span>
              <span className="text-sm text-green-600">Active</span>
            </div>

            {!isOnline && (
              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                You're offline. Changes will sync when connection is restored.
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default PWAUpdateNotification;
