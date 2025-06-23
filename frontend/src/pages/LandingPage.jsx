import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GoogleSignIn from '../components/auth/GoogleSignIn';
import { useAuth } from '../context/AuthContext';

const LandingPage = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard if user is authenticated
  useEffect(() => {
    if (isAuthenticated && !loading) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render the authenticated view since we're redirecting
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 bg-gradient-to-br from-blue-50 to-indigo-100 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                  <span className="block xl:inline">Track Your</span>{' '}
                  <span className="block text-blue-600 xl:inline">Reading Journey</span>
                </h1>
                <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  Organize your personal library, track reading progress, and discover your next favorite book.
                  Join thousands of readers who love staying organized with their reading goals.
                </p>

                {/* Sign In Section */}
                <div className="mt-8 sm:mt-10">
                  <div className="max-w-md mx-auto lg:mx-0">
                    <GoogleSignIn />
                  </div>
                  <p className="mt-3 text-sm text-gray-500 text-center lg:text-left">
                    Sign in with Google to get started. It's free and takes just seconds!
                  </p>
                </div>
              </div>
            </main>
          </div>
        </div>

        {/* Hero Image/Illustration */}
        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
          <div className="h-56 w-full bg-gradient-to-r from-blue-400 to-purple-500 sm:h-72 md:h-96 lg:w-full lg:h-full flex items-center justify-center">
            <div className="text-center text-white">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-2xl font-bold mb-2">Your Digital Library</h3>
              <p className="text-lg opacity-90">Awaits You</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">Features</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to track your reading
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              Simple, powerful tools to help you organize your books and achieve your reading goals.
            </p>
          </div>

          <div className="mt-10">
            <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  📖
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Track Reading Progress</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  Monitor your reading progress with visual indicators and completion tracking.
                </p>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  🔍
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Search & Filter</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  Easily find books in your library with powerful search and filtering options.
                </p>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  📊
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Reading Statistics</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  View detailed statistics about your reading habits and achievements.
                </p>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  🎯
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Reading Goals</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  Set and track reading goals to stay motivated and achieve more.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
