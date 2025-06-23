import express from 'express';
import {
  getReadingAnalytics,
  getReadingGoals
} from '../controllers/statisticsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// @desc    Get comprehensive reading analytics
// @route   GET /api/v1/stats/analytics
// @access  Private
router.get('/analytics', getReadingAnalytics);

// @desc    Get reading goal progress and recommendations
// @route   GET /api/v1/stats/goals
// @access  Private
router.get('/goals', getReadingGoals);

export default router;
