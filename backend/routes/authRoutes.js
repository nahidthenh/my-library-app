import express from 'express';
import {
  googleAuth,
  logout,
  getMe,
  refreshToken
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimitMiddleware.js';
import { validateAuth, sanitizeRequest } from '../middleware/validationMiddleware.js';
import { authSecurityHeaders } from '../middleware/securityHeadersMiddleware.js';

const router = express.Router();

// Apply security measures to all auth routes
router.use(authSecurityHeaders);
router.use(sanitizeRequest);

// @desc    Authenticate user with Google
// @route   POST /api/v1/auth/google
// @access  Public
router.post('/google', authLimiter, validateAuth, googleAuth);

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
router.post('/refresh', authLimiter, protect, refreshToken);

export default router;
