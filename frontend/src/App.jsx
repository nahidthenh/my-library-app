
import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { PWAInstallPrompt, PWAStatus } from './components/pwa';
import PWAUpdateNotification, { EnhancedPWAStatus } from './components/pwa/PWAUpdateNotification';
import { register as registerSW } from './utils/serviceWorker';
import { offlineBookService } from './services/bookService';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';

// Lazy load pages for better performance
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Books = lazy(() => import('./pages/Books'));
const Analytics = lazy(() => import('./pages/Analytics'));
const BookDetail = lazy(() => import('./components/books/BookDetail'));

function App() {
  useEffect(() => {
    // Initialize PWA features
    const initPWA = async () => {
      try {
        // Register service worker
        registerSW({
          onUpdate: (registration) => {
            console.log('New app version available');
          },
          onSuccess: (registration) => {
            console.log('App is ready for offline use');
          }
        });

        // Initialize offline storage
        await offlineBookService.init();

        // Set up sync when coming back online
        window.addEventListener('online', async () => {
          console.log('Back online, syncing data...');
          try {
            const result = await offlineBookService.syncOfflineActions();
            if (result.success && result.syncedCount > 0) {
              console.log(`Synced ${result.syncedCount} offline actions`);
            }
          } catch (error) {
            console.error('Sync failed:', error);
          }
        });

      } catch (error) {
        console.error('PWA initialization failed:', error);
      }
    };

    initPWA();
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="App">
            {/* PWA Components */}
            <PWAInstallPrompt />
            <PWAStatus />
            <PWAUpdateNotification />
            <EnhancedPWAStatus />

            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />

                {/* Protected Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/books"
                  element={
                    <ProtectedRoute>
                      <Books />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/books/:id"
                  element={
                    <ProtectedRoute>
                      <BookDetail />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/analytics"
                  element={
                    <ProtectedRoute>
                      <Analytics />
                    </ProtectedRoute>
                  }
                />

                {/* Redirect any unknown routes to landing page */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;