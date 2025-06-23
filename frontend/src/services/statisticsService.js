import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Reading Statistics API
export const statisticsService = {
  // Get basic reading statistics
  getReadingStats: async () => {
    try {
      const response = await api.get('/books/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching reading stats:', error);
      throw error;
    }
  },

  // Get comprehensive reading analytics
  getReadingAnalytics: async (timeframe = 'year') => {
    try {
      const response = await api.get('/stats/analytics', {
        params: { timeframe }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching reading analytics:', error);
      throw error;
    }
  },

  // Get reading goal progress
  getReadingGoals: async () => {
    try {
      const response = await api.get('/stats/goals');
      return response.data;
    } catch (error) {
      console.error('Error fetching reading goals:', error);
      throw error;
    }
  },

  // Get monthly reading report
  getMonthlyReport: async (year, month) => {
    try {
      const response = await api.get('/books/stats/monthly', {
        params: { year, month }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching monthly report:', error);
      throw error;
    }
  },

  // Get user reading goal progress
  getUserGoalProgress: async () => {
    try {
      const response = await api.get('/users/reading-goal/progress');
      return response.data;
    } catch (error) {
      console.error('Error fetching user goal progress:', error);
      throw error;
    }
  },

  // Update yearly reading goal
  updateYearlyGoal: async (yearly) => {
    try {
      const response = await api.put('/users/reading-goal', { yearly });
      return response.data;
    } catch (error) {
      console.error('Error updating yearly goal:', error);
      throw error;
    }
  },

  // Set monthly reading goal
  setMonthlyGoal: async (month, year, target) => {
    try {
      const response = await api.put('/users/reading-goal/monthly', {
        month,
        year,
        target
      });
      return response.data;
    } catch (error) {
      console.error('Error setting monthly goal:', error);
      throw error;
    }
  },

  // Get user profile with reading goals
  getUserProfile: async () => {
    try {
      const response = await api.get('/users/profile');
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }
};

export default statisticsService;
