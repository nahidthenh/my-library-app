import asyncHandler from 'express-async-handler';
import Book from '../models/Book.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';

// @desc    Get comprehensive reading analytics
// @route   GET /api/v1/stats/analytics
// @access  Private
const getReadingAnalytics = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { timeframe = 'year' } = req.query; // year, month, all

  // Calculate date range based on timeframe
  let startDate, endDate;
  const now = new Date();
  
  switch (timeframe) {
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
      break;
    default:
      startDate = null;
      endDate = null;
  }

  // Build match query
  const matchQuery = { userId: userId };
  if (startDate && endDate) {
    matchQuery.dateCompleted = { $gte: startDate, $lte: endDate };
  }

  // Reading velocity (books per month over time)
  const readingVelocity = await Book.aggregate([
    {
      $match: {
        userId: userId,
        status: 'completed',
        dateCompleted: { $exists: true }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$dateCompleted' },
          month: { $month: '$dateCompleted' }
        },
        booksCompleted: { $sum: 1 },
        totalPages: { $sum: { $ifNull: ['$pageCount', 0] } },
        averageRating: { $avg: { $ifNull: ['$rating', 0] } }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    }
  ]);

  // Genre analysis with reading patterns
  const genreAnalysis = await Book.aggregate([
    {
      $match: {
        userId: userId,
        genre: { $exists: true, $ne: '' }
      }
    },
    {
      $group: {
        _id: '$genre',
        totalBooks: { $sum: 1 },
        completedBooks: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        averageRating: {
          $avg: {
            $cond: [
              { $and: [{ $eq: ['$status', 'completed'] }, { $ne: ['$rating', null] }] },
              '$rating',
              null
            ]
          }
        },
        totalPages: { $sum: { $ifNull: ['$pageCount', 0] } },
        averagePages: { $avg: { $ifNull: ['$pageCount', 0] } }
      }
    },
    {
      $addFields: {
        completionRate: {
          $multiply: [
            { $divide: ['$completedBooks', '$totalBooks'] },
            100
          ]
        }
      }
    },
    {
      $sort: { totalBooks: -1 }
    }
  ]);

  // Reading habits (day of week, time patterns)
  const readingHabits = await Book.aggregate([
    {
      $match: {
        userId: userId,
        status: 'completed',
        dateCompleted: { $exists: true }
      }
    },
    {
      $group: {
        _id: { $dayOfWeek: '$dateCompleted' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id': 1 }
    }
  ]);

  // Reading goals progress
  const user = await User.findById(userId);
  const currentYearCompleted = await Book.countDocuments({
    userId: userId,
    status: 'completed',
    dateCompleted: {
      $gte: new Date(now.getFullYear(), 0, 1),
      $lt: new Date(now.getFullYear() + 1, 0, 1)
    }
  });

  // Page reading statistics
  const pageStats = await Book.aggregate([
    {
      $match: {
        userId: userId,
        status: 'completed',
        pageCount: { $exists: true, $gt: 0 }
      }
    },
    {
      $group: {
        _id: null,
        totalPages: { $sum: '$pageCount' },
        averagePages: { $avg: '$pageCount' },
        minPages: { $min: '$pageCount' },
        maxPages: { $max: '$pageCount' },
        totalBooks: { $sum: 1 }
      }
    }
  ]);

  // Reading streaks
  const readingStreaks = await calculateReadingStreaks(userId);

  res.status(200).json({
    success: true,
    data: {
      timeframe,
      readingVelocity,
      genreAnalysis,
      readingHabits: formatReadingHabits(readingHabits),
      readingGoals: {
        yearly: user?.readingGoal?.yearly || 0,
        current: currentYearCompleted,
        progress: user?.readingGoal?.yearly ? Math.round((currentYearCompleted / user.readingGoal.yearly) * 100) : 0
      },
      pageStats: pageStats[0] || {
        totalPages: 0,
        averagePages: 0,
        minPages: 0,
        maxPages: 0,
        totalBooks: 0
      },
      readingStreaks
    }
  });
});

// @desc    Get reading goal progress and recommendations
// @route   GET /api/v1/stats/goals
// @access  Private
const getReadingGoals = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const user = await User.findById(userId);
  
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const daysInYear = new Date(currentYear, 11, 31).getDate() === 31 ? 366 : 365;
  const dayOfYear = Math.floor((new Date() - new Date(currentYear, 0, 0)) / (1000 * 60 * 60 * 24));

  // Current year progress
  const booksCompletedThisYear = await Book.countDocuments({
    userId: userId,
    status: 'completed',
    dateCompleted: {
      $gte: new Date(currentYear, 0, 1),
      $lt: new Date(currentYear + 1, 0, 1)
    }
  });

  // Monthly breakdown
  const monthlyProgress = await Book.aggregate([
    {
      $match: {
        userId: userId,
        status: 'completed',
        dateCompleted: {
          $gte: new Date(currentYear, 0, 1),
          $lt: new Date(currentYear + 1, 0, 1)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$dateCompleted' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id': 1 }
    }
  ]);

  // Calculate recommendations
  const yearlyGoal = user.readingGoal.yearly;
  const expectedProgress = Math.round((dayOfYear / daysInYear) * yearlyGoal);
  const booksNeeded = Math.max(0, yearlyGoal - booksCompletedThisYear);
  const daysRemaining = daysInYear - dayOfYear;
  const recommendedPace = daysRemaining > 0 ? Math.round(daysRemaining / Math.max(1, booksNeeded)) : 0;

  res.status(200).json({
    success: true,
    data: {
      yearlyGoal,
      currentProgress: booksCompletedThisYear,
      progressPercentage: Math.round((booksCompletedThisYear / yearlyGoal) * 100),
      expectedProgress,
      isOnTrack: booksCompletedThisYear >= expectedProgress,
      booksNeeded,
      daysRemaining,
      recommendedPace,
      monthlyProgress: formatMonthlyProgress(monthlyProgress),
      recommendations: generateRecommendations(booksCompletedThisYear, yearlyGoal, daysRemaining)
    }
  });
});

// Helper function to calculate reading streaks
const calculateReadingStreaks = async (userId) => {
  const completedBooks = await Book.find({
    userId: userId,
    status: 'completed',
    dateCompleted: { $exists: true }
  }).sort({ dateCompleted: -1 });

  if (completedBooks.length === 0) {
    return { currentStreak: 0, longestStreak: 0, streakDates: [] };
  }

  const dates = completedBooks.map(book => 
    new Date(book.dateCompleted).toDateString()
  );
  
  const uniqueDates = [...new Set(dates)].sort((a, b) => new Date(b) - new Date(a));
  
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;
  
  // Calculate current streak
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  
  if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
    currentStreak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const currentDate = new Date(uniqueDates[i-1]);
      const nextDate = new Date(uniqueDates[i]);
      const diffDays = (currentDate - nextDate) / (1000 * 60 * 60 * 24);
      
      if (diffDays <= 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  for (let i = 1; i < uniqueDates.length; i++) {
    const currentDate = new Date(uniqueDates[i-1]);
    const nextDate = new Date(uniqueDates[i]);
    const diffDays = (currentDate - nextDate) / (1000 * 60 * 60 * 24);
    
    if (diffDays <= 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return {
    currentStreak,
    longestStreak,
    streakDates: uniqueDates.slice(0, currentStreak)
  };
};

// Helper function to format reading habits
const formatReadingHabits = (habits) => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const formatted = Array(7).fill(0);
  
  habits.forEach(habit => {
    formatted[habit._id - 1] = habit.count;
  });
  
  return formatted.map((count, index) => ({
    day: dayNames[index],
    count
  }));
};

// Helper function to format monthly progress
const formatMonthlyProgress = (progress) => {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const formatted = Array(12).fill(0);
  progress.forEach(month => {
    formatted[month._id - 1] = month.count;
  });
  
  return formatted.map((count, index) => ({
    month: monthNames[index],
    count
  }));
};

// Helper function to generate reading recommendations
const generateRecommendations = (current, goal, daysRemaining) => {
  const recommendations = [];
  
  if (current >= goal) {
    recommendations.push("🎉 Congratulations! You've reached your reading goal!");
    recommendations.push("Consider setting a higher goal for next year.");
  } else if (daysRemaining <= 0) {
    recommendations.push("The year is ending, but every book counts!");
    recommendations.push("Consider setting a more achievable goal for next year.");
  } else {
    const booksNeeded = goal - current;
    const pace = Math.round(daysRemaining / booksNeeded);
    
    if (pace >= 30) {
      recommendations.push(`📚 You're doing great! Read 1 book every ${pace} days to reach your goal.`);
    } else if (pace >= 14) {
      recommendations.push(`📖 You need to pick up the pace. Try to finish 1 book every ${pace} days.`);
    } else {
      recommendations.push("⚡ Time to accelerate! Consider shorter books or audiobooks.");
      recommendations.push("Focus on books you're genuinely excited about.");
    }
  }
  
  return recommendations;
};

export {
  getReadingAnalytics,
  getReadingGoals
};
