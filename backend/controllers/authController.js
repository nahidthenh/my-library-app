import { asyncHandler, AppError } from '../middleware/errorMiddleware.js';
import { generateToken, verifyFirebaseToken } from '../middleware/authMiddleware.js';
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

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      data: {
        token,
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
  // In a stateless JWT system, logout is handled client-side
  // Here we could add token to a blacklist if needed
  
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
// @access  Private
const refreshToken = asyncHandler(async (req, res) => {
  const user = req.user;

  // Generate new JWT token
  const token = generateToken(user._id);

  res.status(200).json({
    success: true,
    data: {
      token,
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
});

export {
  googleAuth,
  logout,
  getMe,
  refreshToken
};
