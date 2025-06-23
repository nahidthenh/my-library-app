import { asyncHandler, AppError } from '../middleware/errorMiddleware.js';
import User from '../models/User.js';
import Book from '../models/Book.js';

// @desc    Get user profile
// @route   GET /api/v1/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-__v');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id,
        googleId: user.googleId,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        preferences: user.preferences,
        readingGoal: user.readingGoal,
        readingGoalProgress: user.readingGoalProgress,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLogin: user.lastLogin
      }
    }
  });
});

// @desc    Update user profile
// @route   PUT /api/v1/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const { name, preferences } = req.body;

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Update allowed fields
  if (name !== undefined) user.name = name;
  if (preferences !== undefined) {
    user.preferences = { ...user.preferences, ...preferences };
  }

  const updatedUser = await user.save();

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: updatedUser._id,
        googleId: updatedUser.googleId,
        email: updatedUser.email,
        name: updatedUser.name,
        avatar: updatedUser.avatar,
        preferences: updatedUser.preferences,
        readingGoal: updatedUser.readingGoal,
        readingGoalProgress: updatedUser.readingGoalProgress,
        isActive: updatedUser.isActive,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
        lastLogin: updatedUser.lastLogin
      }
    },
    message: 'Profile updated successfully'
  });
});

// @desc    Delete user account
// @route   DELETE /api/v1/users/account
// @access  Private
const deleteUserAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Delete all user's books
  await Book.deleteMany({ userId: user._id });

  // Delete user account
  await User.findByIdAndDelete(user._id);

  res.status(200).json({
    success: true,
    message: 'Account deleted successfully'
  });
});

// @desc    Get user reading statistics
// @route   GET /api/v1/users/stats
// @access  Private
const getUserStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Get book statistics
  const bookStats = await Book.getUserReadingStats(userId);

  // Get books by genre
  const genreStats = await Book.getBooksByGenre(userId);

  // Get reading activity (books completed per month)
  const readingActivity = await Book.aggregate([
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
        count: { $sum: 1 },
        books: { $push: { title: '$title', author: '$author', dateCompleted: '$dateCompleted' } }
      }
    },
    {
      $sort: { '_id.year': -1, '_id.month': -1 }
    },
    {
      $limit: 12 // Last 12 months
    }
  ]);

  // Get current year progress
  const currentYear = new Date().getFullYear();
  const yearlyProgress = await Book.countDocuments({
    userId: userId,
    status: 'completed',
    dateCompleted: {
      $gte: new Date(currentYear, 0, 1),
      $lt: new Date(currentYear + 1, 0, 1)
    }
  });

  // Get user's reading goal
  const user = await User.findById(userId).select('readingGoal');

  res.status(200).json({
    success: true,
    data: {
      bookStats,
      genreStats,
      readingActivity,
      yearlyProgress: {
        completed: yearlyProgress,
        goal: user.readingGoal.yearly,
        percentage: user.readingGoal.yearly > 0 ? Math.round((yearlyProgress / user.readingGoal.yearly) * 100) : 0
      }
    }
  });
});

// @desc    Update reading goal
// @route   PUT /api/v1/users/reading-goal
// @access  Private
const updateReadingGoal = asyncHandler(async (req, res) => {
  const { yearly } = req.body;

  if (!yearly || yearly < 1) {
    throw new AppError('Reading goal must be at least 1 book', 400);
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Update reading goal
  user.readingGoal.yearly = yearly;

  // Recalculate current progress based on completed books this year
  const currentYear = new Date().getFullYear();
  const completedThisYear = await Book.countDocuments({
    userId: user._id,
    status: 'completed',
    dateCompleted: {
      $gte: new Date(currentYear, 0, 1),
      $lt: new Date(currentYear + 1, 0, 1)
    }
  });

  user.readingGoal.current = completedThisYear;

  const updatedUser = await user.save();

  res.status(200).json({
    success: true,
    data: {
      readingGoal: updatedUser.readingGoal,
      readingGoalProgress: updatedUser.readingGoalProgress
    },
    message: 'Reading goal updated successfully'
  });
});

// @desc    Get detailed reading goal progress
// @route   GET /api/v1/users/reading-goal/progress
// @access  Private
const getReadingGoalProgress = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const currentYear = new Date().getFullYear();
  const currentDate = new Date();
  const startOfYear = new Date(currentYear, 0, 1);
  const endOfYear = new Date(currentYear, 11, 31);

  // Calculate days passed and remaining
  const daysPassed = Math.floor((currentDate - startOfYear) / (1000 * 60 * 60 * 24));
  const totalDaysInYear = Math.floor((endOfYear - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
  const daysRemaining = totalDaysInYear - daysPassed;

  // Get books completed this year
  const completedBooks = await Book.find({
    userId: userId,
    status: 'completed',
    dateCompleted: {
      $gte: startOfYear,
      $lte: endOfYear
    }
  }).sort({ dateCompleted: 1 });

  // Calculate monthly progress
  const monthlyProgress = Array(12).fill(0);
  completedBooks.forEach(book => {
    const month = new Date(book.dateCompleted).getMonth();
    monthlyProgress[month]++;
  });

  // Calculate expected progress
  const yearlyGoal = user.readingGoal.yearly;
  const expectedProgress = Math.round((daysPassed / totalDaysInYear) * yearlyGoal);
  const currentProgress = completedBooks.length;

  // Calculate pace needed
  const booksRemaining = Math.max(0, yearlyGoal - currentProgress);
  const daysPerBook = daysRemaining > 0 && booksRemaining > 0 ? Math.round(daysRemaining / booksRemaining) : 0;

  // Determine status
  let status = 'on_track';
  if (currentProgress >= yearlyGoal) {
    status = 'completed';
  } else if (currentProgress < expectedProgress - 2) {
    status = 'behind';
  } else if (currentProgress > expectedProgress + 2) {
    status = 'ahead';
  }

  // Generate insights
  const insights = generateGoalInsights(currentProgress, yearlyGoal, daysPassed, totalDaysInYear, completedBooks);

  res.status(200).json({
    success: true,
    data: {
      goal: {
        yearly: yearlyGoal,
        current: currentProgress,
        remaining: booksRemaining,
        percentage: Math.round((currentProgress / yearlyGoal) * 100)
      },
      timeline: {
        daysPassed,
        daysRemaining,
        totalDaysInYear,
        expectedProgress,
        daysPerBookNeeded: daysPerBook
      },
      status,
      monthlyProgress,
      recentBooks: completedBooks.slice(-5).map(book => ({
        title: book.title,
        author: book.author,
        dateCompleted: book.dateCompleted,
        pageCount: book.pageCount
      })),
      insights
    }
  });
});

// @desc    Set monthly reading goal
// @route   PUT /api/v1/users/reading-goal/monthly
// @access  Private
const setMonthlyGoal = asyncHandler(async (req, res) => {
  const { month, year, target } = req.body;
  const userId = req.user._id;

  if (!month || !year || !target || target < 1) {
    throw new AppError('Month, year, and target (minimum 1) are required', 400);
  }

  if (month < 1 || month > 12) {
    throw new AppError('Month must be between 1 and 12', 400);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Initialize monthly goals if not exists
  if (!user.readingGoal.monthly) {
    user.readingGoal.monthly = {};
  }

  const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
  user.readingGoal.monthly[monthKey] = target;

  await user.save();

  // Get current progress for this month
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0);

  const completedThisMonth = await Book.countDocuments({
    userId: userId,
    status: 'completed',
    dateCompleted: {
      $gte: startOfMonth,
      $lte: endOfMonth
    }
  });

  res.status(200).json({
    success: true,
    data: {
      monthlyGoal: {
        month,
        year,
        target,
        current: completedThisMonth,
        percentage: Math.round((completedThisMonth / target) * 100)
      }
    },
    message: 'Monthly reading goal set successfully'
  });
});

// Helper function to generate goal insights
const generateGoalInsights = (current, yearly, daysPassed, totalDays, completedBooks) => {
  const insights = [];
  const progressPercentage = (current / yearly) * 100;
  const timePercentage = (daysPassed / totalDays) * 100;

  if (current >= yearly) {
    insights.push({
      type: 'success',
      message: `🎉 Congratulations! You've completed your yearly goal of ${yearly} books!`,
      action: 'Consider setting a higher goal for next year.'
    });
  } else if (progressPercentage > timePercentage + 10) {
    insights.push({
      type: 'success',
      message: `🚀 You're ahead of schedule! ${Math.round(progressPercentage - timePercentage)}% ahead of your target pace.`,
      action: 'Keep up the excellent work!'
    });
  } else if (progressPercentage < timePercentage - 10) {
    const booksNeeded = yearly - current;
    const daysLeft = totalDays - daysPassed;
    const pace = Math.round(daysLeft / booksNeeded);

    insights.push({
      type: 'warning',
      message: `📚 You're behind schedule. You need to read ${booksNeeded} books in ${daysLeft} days.`,
      action: `Try to finish 1 book every ${pace} days to catch up.`
    });
  } else {
    insights.push({
      type: 'info',
      message: `📖 You're on track! ${yearly - current} books to go.`,
      action: 'Maintain your current reading pace.'
    });
  }

  // Reading streak insight
  if (completedBooks.length >= 2) {
    const lastTwoBooks = completedBooks.slice(-2);
    const daysBetween = Math.floor(
      (new Date(lastTwoBooks[1].dateCompleted) - new Date(lastTwoBooks[0].dateCompleted)) / (1000 * 60 * 60 * 24)
    );

    if (daysBetween <= 7) {
      insights.push({
        type: 'success',
        message: `🔥 Great reading streak! You completed 2 books within ${daysBetween} days.`,
        action: 'Keep the momentum going!'
      });
    }
  }

  return insights;
};

export {
  getUserProfile,
  updateUserProfile,
  deleteUserAccount,
  getUserStats,
  updateReadingGoal,
  getReadingGoalProgress,
  setMonthlyGoal
};
