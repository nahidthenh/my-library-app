import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MainLayout } from '../components/layout';
import { StatCard, ReadingProgress, RecentActivity, QuickActions } from '../components/dashboard';
import { statisticsService } from '../services/statisticsService';
import { bookService } from '../services/bookService';
import { useResponsive } from '../hooks/useResponsive';
import ResponsiveContainer from '../components/layout/ResponsiveContainer';
import ResponsiveGrid from '../components/layout/ResponsiveGrid';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isMobile, isTablet, getResponsiveValue } = useResponsive();

  // State for dashboard data
  const [dashboardData, setDashboardData] = useState({
    stats: null,
    goalProgress: null,
    recentBooks: null,
    loading: true,
    error: null
  });

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setDashboardData(prev => ({ ...prev, loading: true, error: null }));

        // Fetch all dashboard data in parallel
        const [statsResponse, goalResponse, booksResponse] = await Promise.allSettled([
          statisticsService.getReadingStats(),
          statisticsService.getUserGoalProgress(),
          bookService.getBooks({ limit: 5, sortBy: 'updatedAt', sortOrder: 'desc' })
        ]);

        const stats = statsResponse.status === 'fulfilled' ? statsResponse.value.data : null;
        const goalProgress = goalResponse.status === 'fulfilled' ? goalResponse.value.data : null;
        const recentBooks = booksResponse.status === 'fulfilled' ? booksResponse.value.data?.books : null;

        setDashboardData({
          stats,
          goalProgress,
          recentBooks,
          loading: false,
          error: null
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setDashboardData(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load dashboard data'
        }));
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  return (
    <MainLayout>
      <ResponsiveContainer maxWidth="7xl" className="py-6">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.displayName?.split(' ')[0] || 'Reader'}! 📚
          </h2>
          <p className="text-gray-600">
            Ready to track your reading journey? Let's see what you're reading today.
          </p>
        </div>

        {/* Error State */}
        {dashboardData.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="text-red-400">⚠️</div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading dashboard</h3>
                <p className="text-sm text-red-700 mt-1">{dashboardData.error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        <ResponsiveGrid
          columns={{ xs: 1, sm: 2, lg: 4 }}
          gap={getResponsiveValue({ xs: 'sm', md: 'md', lg: 'lg' })}
          className="mb-6"
        >
          <StatCard
            title="Currently Reading"
            value={dashboardData.stats?.basicStats?.inProgress || 0}
            icon="📖"
            color="blue"
            loading={dashboardData.loading}
            onClick={() => navigate('/books?status=in_progress')}
          />
          <StatCard
            title="Books Completed"
            value={dashboardData.stats?.basicStats?.completed || 0}
            icon="✅"
            color="green"
            loading={dashboardData.loading}
            onClick={() => navigate('/books?status=completed')}
          />
          <StatCard
            title="Total Books"
            value={dashboardData.stats?.basicStats?.totalBooks || 0}
            icon="📚"
            color="purple"
            loading={dashboardData.loading}
            onClick={() => navigate('/books')}
          />
          <StatCard
            title="Pages Read"
            value={dashboardData.stats?.basicStats?.totalPages || 0}
            icon="📄"
            color="orange"
            subtitle="Total pages"
            loading={dashboardData.loading}
          />
        </ResponsiveGrid>

        {/* Main Content Grid */}
        <ResponsiveGrid
          columns={{ xs: 1, lg: 3 }}
          gap={getResponsiveValue({ xs: 'sm', md: 'md', lg: 'lg' })}
          className="mb-6"
        >
          {/* Reading Progress - Takes 2 columns on desktop */}
          <div className={isTablet || isMobile ? 'col-span-1' : 'lg:col-span-2'}>
            <ReadingProgress
              goalData={dashboardData.goalProgress}
              loading={dashboardData.loading}
            />
          </div>

          {/* Recent Activity - Takes 1 column */}
          <div className="lg:col-span-1">
            <RecentActivity
              recentBooks={dashboardData.recentBooks}
              loading={dashboardData.loading}
            />
          </div>
        </ResponsiveGrid>

        {/* Quick Actions */}
        <QuickActions
          onAddBook={() => navigate('/books')}
          onViewBooks={() => navigate('/books')}
          onViewAnalytics={() => navigate('/analytics')}
        />
      </ResponsiveContainer>
    </MainLayout>
  );
};

export default Dashboard;
