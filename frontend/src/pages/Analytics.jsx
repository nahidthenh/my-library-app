import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { MainLayout } from '../components/layout';
import { statisticsService } from '../services/statisticsService';
import { ReadingVelocityChart, GenreDistributionChart, ReadingHabitsChart } from '../components/charts';
import { StatCard } from '../components/dashboard';

const Analytics = () => {
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState({
    data: null,
    loading: true,
    error: null
  });
  const [timeframe, setTimeframe] = useState('year');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setAnalyticsData(prev => ({ ...prev, loading: true, error: null }));

        const response = await statisticsService.getReadingAnalytics(timeframe);

        setAnalyticsData({
          data: response.data,
          loading: false,
          error: null
        });
      } catch (error) {
        console.error('Error fetching analytics:', error);
        setAnalyticsData({
          data: null,
          loading: false,
          error: 'Failed to load analytics data'
        });
      }
    };

    if (user) {
      fetchAnalytics();
    }
  }, [user, timeframe]);

  const { data, loading, error } = analyticsData;

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Page Header */}
          <div className="mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">📊 Reading Analytics</h1>
                <p className="text-sm text-gray-600">Detailed insights into your reading habits</p>
              </div>

              {/* Timeframe Selector */}
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Timeframe:</label>
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                  <option value="all">All Time</option>
                </select>
              </div>
            </div>
          </div>
          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <div className="text-red-400">⚠️</div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error loading analytics</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Reading Goal Progress"
              value={data?.readingGoals?.progress ? `${data.readingGoals.progress}%` : '0%'}
              icon="🎯"
              color="blue"
              subtitle={`${data?.readingGoals?.current || 0} of ${data?.readingGoals?.yearly || 0} books`}
              loading={loading}
            />
            <StatCard
              title="Total Pages Read"
              value={data?.pageStats?.totalPages || 0}
              icon="📄"
              color="green"
              subtitle={`${data?.pageStats?.totalBooks || 0} books completed`}
              loading={loading}
            />
            <StatCard
              title="Average Rating"
              value={data?.pageStats?.totalBooks > 0 ? '4.2' : '0'}
              icon="⭐"
              color="yellow"
              subtitle="For completed books"
              loading={loading}
            />
            <StatCard
              title="Reading Streak"
              value={data?.readingStreaks?.currentStreak || 0}
              icon="🔥"
              color="orange"
              subtitle={`Longest: ${data?.readingStreaks?.longestStreak || 0} days`}
              loading={loading}
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <ReadingVelocityChart data={data} loading={loading} />
            <GenreDistributionChart data={data} loading={loading} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <ReadingHabitsChart data={data} loading={loading} />
            </div>

            {/* Reading Goals Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Goal Summary</h3>

              {loading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              ) : data?.readingGoals ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Yearly Goal</span>
                    <span className="font-medium">{data.readingGoals.yearly} books</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Progress</span>
                    <span className="font-medium">{data.readingGoals.current} completed</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Remaining</span>
                    <span className="font-medium">{Math.max(0, data.readingGoals.yearly - data.readingGoals.current)} books</span>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                      <div
                        className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(data.readingGoals.progress, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 text-center">
                      {data.readingGoals.progress >= 100 ? 'Goal Achieved! 🎉' : `${data.readingGoals.progress}% Complete`}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No goal data available</p>
              )}
            </div>
          </div>

          {/* Page Statistics */}
          {data?.pageStats && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Reading Statistics</h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{data.pageStats.totalPages}</p>
                  <p className="text-sm text-gray-500">Total Pages</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{Math.round(data.pageStats.averagePages)}</p>
                  <p className="text-sm text-gray-500">Avg Pages/Book</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{data.pageStats.minPages}</p>
                  <p className="text-sm text-gray-500">Shortest Book</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{data.pageStats.maxPages}</p>
                  <p className="text-sm text-gray-500">Longest Book</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Analytics;
