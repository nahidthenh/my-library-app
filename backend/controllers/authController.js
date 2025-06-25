import { asyncHandler, AppError } from '../middleware/errorMiddleware.js';
import { generateToken, verifyFirebaseToken } from '../middleware/authMiddleware.js';
import {
  generateSecureToken,
  generateRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  blacklistToken,
  logSecurityEvent
} from '../middleware/tokenSecurityMiddleware.js';
import User from '../models/User.js';

// @desc    Authenticate user with Google
// @route   POST /api/v1/auth/google
// @access  Public
const googleAuth = asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    throw new AppError('ID token is required', 400);
  }

  try {
    // Verify Firebase ID token
    const decodedToken = await verifyFirebaseToken(idToken);

    if (!decodedToken) {
      throw new AppError('Invalid ID token', 401);
    }

    // Check if user exists
    let user = await User.findOne({ googleId: decodedToken.uid });

    if (user) {
      // Update existing user's last login
      user.lastLogin = new Date();
      await user.save();
    } else {
      // Create new user
      user = await User.create({
        googleId: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name || decodedToken.email.split('@')[0],
        avatar: decodedToken.picture || '',
      });
    }

    // Generate secure JWT tokens
    const accessToken = generateSecureToken(user._id, { type: 'access', expiresIn: '15m' });
    const refreshToken = generateRefreshToken(user._id);

    // Log successful authentication
    logSecurityEvent('SUCCESSFUL_AUTHENTICATION', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      originalUrl: req.originalUrl,
      method: req.method,
      user: { _id: user._id }
    }, {
      userId: user._id,
      authMethod: 'google_oauth'
    });

    res.status(200).json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        expiresIn: 900, // 15 minutes in seconds
        tokenType: 'Bearer',
        user: {
          id: user._id,
          googleId: user.googleId,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          preferences: user.preferences,
          readingGoal: user.readingGoal,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        }
      },
      message: user.isNew ? 'Account created successfully' : 'Login successful'
    });
  } catch (error) {
    console.error('Google auth error:', error);
    throw new AppError('Authentication failed', 401);
  }
});

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const { refreshToken } = req.body;

  // Blacklist the access token
  if (token) {
    blacklistToken(token);
  }

  // Revoke the refresh token
  if (refreshToken) {
    revokeRefreshToken(refreshToken);
  }

  // Log logout event
  logSecurityEvent('USER_LOGOUT', req, {
    userId: req.user._id,
    tokenBlacklisted: !!token,
    refreshTokenRevoked: !!refreshToken
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
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
        lastLogin: user.lastLogin
      }
    }
  });
});

// @desc    Refresh authentication token
// @route   POST /api/v1/auth/refresh
// @access  Public (uses refresh token)
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: clientRefreshToken } = req.body;

  if (!clientRefreshToken) {
    throw new AppError('Refresh token is required', 400);
  }

  try {
    // Validate refresh token
    const tokenData = validateRefreshToken(clientRefreshToken);

    // Get user
    const user = await User.findById(tokenData.userId);
    if (!user || !user.isActive) {
      revokeRefreshToken(clientRefreshToken);
      throw new AppError('User not found or inactive', 401);
    }

    // Generate new tokens
    const newAccessToken = generateSecureToken(user._id, { type: 'access', expiresIn: '15m' });
    const newRefreshToken = generateRefreshToken(user._id);

    // Revoke old refresh token
    revokeRefreshToken(clientRefreshToken);

    // Log token refresh
    logSecurityEvent('TOKEN_REFRESH', req, {
      userId: user._id,
      oldTokenRevoked: true
    });

    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 900, // 15 minutes in seconds
        tokenType: 'Bearer',
        user: {
          id: user._id,
          googleId: user.googleId,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          preferences: user.preferences,
          readingGoal: user.readingGoal,
          readingGoalProgress: user.readingGoalProgress,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        }
      },
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    logSecurityEvent('TOKEN_REFRESH_FAILED', req, {
      error: error.message,
      refreshToken: clientRefreshToken?.substring(0, 10) + '...'
    });
    throw error;
  }
});

export {
  googleAuth,
  logout,
  getMe,
  refreshToken
};
