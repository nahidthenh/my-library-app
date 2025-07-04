import express from 'express';
import {
  getUserProfile,
  updateUserProfile,
  deleteUserAccount,
  getUserStats,
  updateReadingGoal,
  getReadingGoalProgress,
  setMonthlyGoal
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateUser, sanitizeRequest } from '../middleware/validationMiddleware.js';

const router = express.Router();

// All routes are protected and sanitized
router.use(protect);
router.use(sanitizeRequest);

// @desc    Get user profile
// @route   GET /api/v1/users/profile
// @access  Private
router.get('/profile', getUserProfile);

// @desc    Update user profile
// @route   PUT /api/v1/users/profile
// @access  Private
router.put('/profile', validateUser, updateUserProfile);

// @desc    Delete user account
// @route   DELETE /api/v1/users/account
// @access  Private
router.delete('/account', deleteUserAccount);

// @desc    Get user reading statistics
// @route   GET /api/v1/users/stats
// @access  Private
router.get('/stats', getUserStats);

// @desc    Update reading goal
// @route   PUT /api/v1/users/reading-goal
// @access  Private
router.put('/reading-goal', updateReadingGoal);

// @desc    Get detailed reading goal progress
// @route   GET /api/v1/users/reading-goal/progress
// @access  Private
router.get('/reading-goal/progress', getReadingGoalProgress);

// @desc    Set monthly reading goal
// @route   PUT /api/v1/users/reading-goal/monthly
// @access  Private
router.put('/reading-goal/monthly', setMonthlyGoal);

export default router;
