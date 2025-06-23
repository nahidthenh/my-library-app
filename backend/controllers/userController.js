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

export {
  getUserProfile,
  updateUserProfile,
  deleteUserAccount,
  getUserStats,
  updateReadingGoal
};
