import React, { useState, useEffect } from 'react';
import Button from '../common/Button';
import Modal from '../common/Modal';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const checkInstallation = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = window.navigator.standalone === true;
      const isInstalled = isStandaloneMode || isIOSStandalone;
      
      setIsStandalone(isStandaloneMode || isIOSStandalone);
      setIsInstalled(isInstalled);
    };

    checkInstallation();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show install prompt if not already installed and user hasn't dismissed it recently
      const lastDismissed = localStorage.getItem('pwa-install-dismissed');
      const daysSinceDismissed = lastDismissed ? 
        (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60 * 24) : 999;
      
      if (!isInstalled && daysSinceDismissed > 7) {
        setShowInstallPrompt(true);
      }
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      
      // Show success message
      if ('serviceWorker' in navigator && 'Notification' in window) {
        new Notification('Library Tracker Installed!', {
          body: 'You can now access Library Tracker from your home screen.',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png'
        });
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      // Show the install prompt
      deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
      }
      
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    } catch (error) {
      console.error('Error during installation:', error);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  const getInstallInstructions = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    if (isIOS) {
      return {
        title: 'Install on iOS',
        steps: [
          'Tap the Share button in Safari',
          'Scroll down and tap "Add to Home Screen"',
          'Tap "Add" to install the app'
        ],
        icon: '📱'
      };
    } else if (isAndroid) {
      return {
        title: 'Install on Android',
        steps: [
          'Tap the menu button (⋮) in Chrome',
          'Select "Add to Home screen"',
          'Tap "Add" to install the app'
        ],
        icon: '🤖'
      };
    } else {
      return {
        title: 'Install on Desktop',
        steps: [
          'Click the install button in your browser\'s address bar',
          'Or use the install button below',
          'Follow your browser\'s installation prompts'
        ],
        icon: '💻'
      };
    }
  };

  // Don't show anything if already installed
  if (isInstalled || isStandalone) {
    return null;
  }

  const instructions = getInstallInstructions();

  return (
    <>
      {/* Install Banner */}
      {showInstallPrompt && deferredPrompt && (
        <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white p-4 z-50 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">📚</span>
              <div>
                <h3 className="font-semibold">Install Library Tracker</h3>
                <p className="text-sm text-blue-100">
                  Get the full app experience with offline access
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleInstallClick}
                variant="secondary"
                size="sm"
                className="bg-white text-blue-600 hover:bg-blue-50"
              >
                Install
              </Button>
              <button
                onClick={handleDismiss}
                className="text-blue-100 hover:text-white p-1"
                aria-label="Dismiss install prompt"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Install Instructions Modal */}
      <Modal
        isOpen={showInstallPrompt && !deferredPrompt}
        onClose={handleDismiss}
        title={`${instructions.icon} ${instructions.title}`}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Install Library Tracker for the best experience with offline access and native app features.
          </p>
          
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Installation Steps:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              {instructions.steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Benefits of Installing:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 📱 Native app experience</li>
              <li>• 🔄 Offline access to your books</li>
              <li>• 🔔 Reading reminders and notifications</li>
              <li>• ⚡ Faster loading and better performance</li>
              <li>• 🏠 Easy access from your home screen</li>
            </ul>
          </div>
        </div>
        
        <Modal.Footer>
          <Button onClick={handleDismiss} variant="secondary">
            Maybe Later
          </Button>
          {deferredPrompt && (
            <Button onClick={handleInstallClick} variant="primary">
              Install Now
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default PWAInstallPrompt;
