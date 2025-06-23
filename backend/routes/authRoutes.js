import express from 'express';
import { 
  googleAuth, 
  logout, 
  getMe, 
  refreshToken 
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Authenticate user with Google
// @route   POST /api/v1/auth/google
// @access  Public
router.post('/google', googleAuth);

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
router.post('/logout', protect, logout);

// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
router.get('/me', protect, getMe);

// @desc    Refresh authentication token
// @route   POST /api/v1/auth/refresh
// @access  Private
router.post('/refresh', protect, refreshToken);

export default router;
