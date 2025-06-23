import express from 'express';
import {
  getUserProfile,
  updateUserProfile,
  deleteUserAccount,
  getUserStats,
  updateReadingGoal
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// @desc    Get user profile
// @route   GET /api/v1/users/profile
// @access  Private
router.get('/profile', getUserProfile);

// @desc    Update user profile
// @route   PUT /api/v1/users/profile
// @access  Private
router.put('/profile', updateUserProfile);

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

export default router;
