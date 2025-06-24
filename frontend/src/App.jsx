
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { PWAInstallPrompt, PWAStatus } from './components/pwa';
import { register as registerSW } from './utils/serviceWorker';
import { offlineBookService } from './services/bookService';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Books from './pages/Books';
import BookDetail from './components/books/BookDetail';

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
    <AuthProvider>
      <Router>
        <div className="App">
          {/* PWA Components */}
          <PWAInstallPrompt />
          <PWAStatus />

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

            {/* Redirect any unknown routes to landing page */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;