import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  getIdToken,
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Configure axios defaults
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';
  axios.defaults.baseURL = apiBaseUrl;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Get the ID token
          const idToken = await getIdToken(firebaseUser);

          // Set the token in axios headers
          axios.defaults.headers.common['Authorization'] = `Bearer ${idToken}`;

          // Store user data
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          });
        } else {
          // Clear user data and token
          delete axios.defaults.headers.common['Authorization'];
          setUser(null);
        }
      } catch (err) {
        console.error('Auth state change error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setError(null);
      setLoading(true);

      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await getIdToken(result.user);

      // Send token to backend for verification and user creation
      try {
        const response = await axios.post('/auth/google', { idToken });
        console.log('✅ Backend authentication successful:', response.data);
      } catch (apiError) {
        console.warn('⚠️ Backend authentication failed:', apiError.response?.data?.message || apiError.message);
        // Continue with frontend-only auth for development
        if (apiError.response?.status === 401) {
          setError('Authentication failed. Please try again.');
          await signOut(auth);
          return { success: false, error: 'Authentication failed' };
        }
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Google sign-in error:', error);
      let errorMessage = 'Sign in failed. Please try again.';

      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign in was cancelled.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Pop-up was blocked. Please allow pop-ups and try again.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection and try again.';
      }

      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      setLoading(true);

      // Sign out from Firebase
      await signOut(auth);

      // Clear axios authorization header
      delete axios.defaults.headers.common['Authorization'];

      // Clear user state
      setUser(null);

      console.log('✅ Logout successful');
      return { success: true };
    } catch (error) {
      console.error('❌ Logout error:', error);
      const errorMessage = 'Logout failed. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Function to clear errors
  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    loading,
    error,
    signInWithGoogle,
    logout,
    clearError,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
