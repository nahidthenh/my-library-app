import jwt from 'jsonwebtoken';
import admin from 'firebase-admin';
import { asyncHandler, AppError } from './errorMiddleware.js';
import User from '../models/User.js';
import {
  verifySecureToken,
  isTokenBlacklisted,
  logSecurityEvent,
  detectSuspiciousActivity,
  sessionManagement,
  tokenRotation
} from './tokenSecurityMiddleware.js';

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  if (!admin.apps.length) {
    try {
      // Check if we have valid Firebase configuration
      if (!process.env.FIREBASE_PROJECT_ID ||
        !process.env.FIREBASE_PRIVATE_KEY ||
        !process.env.FIREBASE_CLIENT_EMAIL ||
        process.env.FIREBASE_PROJECT_ID === 'library-tracker-demo' ||
        process.env.FIREBASE_PRIVATE_KEY.includes('YOUR_ACTUAL_PRIVATE_KEY_HERE')) {
        console.warn('⚠️ Firebase configuration not provided or using demo/placeholder values');
        console.warn('🔄 Continuing without Firebase verification (development mode)');
        console.warn('📝 To fix: Get Firebase service account key from Firebase Console > Project Settings > Service Accounts');
        return;
      }

      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });

      console.log('✅ Firebase Admin SDK initialized');
    } catch (error) {
      console.warn('⚠️ Firebase Admin SDK initialization failed:', error.message);
      console.warn('🔄 Continuing without Firebase verification (development mode)');
    }
  }
};

// Initialize Firebase on module load
initializeFirebase();

// Verify Firebase ID token
const verifyFirebaseToken = async (idToken) => {
  try {
    if (!admin.apps.length) {
      throw new Error('Firebase Admin SDK not initialized');
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.warn('Firebase token verification failed:', error.message);
    return null;
  }
};

// Protect routes - require authentication
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Check if token is blacklisted
      if (isTokenBlacklisted(token)) {
        logSecurityEvent('BLACKLISTED_TOKEN_ATTEMPT', req);
        throw new AppError('Token has been revoked', 401);
      }

      // Try to verify as Firebase token first
      const firebaseUser = await verifyFirebaseToken(token);

      if (firebaseUser) {
        // Firebase token verified - find or create user
        let user = await User.findOne({ googleId: firebaseUser.uid });

        if (!user) {
          // Create new user from Firebase token
          user = await User.create({
            googleId: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.name || firebaseUser.email.split('@')[0],
            avatar: firebaseUser.picture || '',
          });
        } else {
          // Update last login
          user.lastLogin = new Date();
          await user.save();
        }

        req.user = user;

        // Apply security middleware for Firebase users
        await new Promise((resolve, reject) => {
          detectSuspiciousActivity(req, res, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        await new Promise((resolve, reject) => {
          sessionManagement(req, res, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        return next();
      }

      // If Firebase verification fails, try enhanced JWT
      try {
        const decoded = await verifySecureToken(token, { requireType: 'access' });
        const user = await User.findById(decoded.id).select('-__v');

        if (!user) {
          logSecurityEvent('JWT_USER_NOT_FOUND', req, { tokenId: decoded.jti });
          throw new AppError('User not found', 401);
        }

        if (!user.isActive) {
          logSecurityEvent('INACTIVE_USER_JWT_ACCESS', req, { userId: user._id });
          throw new AppError('User account is deactivated', 401);
        }

        req.user = user;

        // Apply security middleware for JWT users
        await new Promise((resolve, reject) => {
          detectSuspiciousActivity(req, res, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        await new Promise((resolve, reject) => {
          sessionManagement(req, res, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        await new Promise((resolve, reject) => {
          tokenRotation(req, res, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        next();
      } catch (jwtError) {
        logSecurityEvent('JWT_VERIFICATION_FAILED', req, { error: jwtError.message });
        throw new AppError('Invalid token', 401);
      }
    } catch (error) {
      throw new AppError('Not authorized, token failed', 401);
    }
  }

  if (!token) {
    throw new AppError('Not authorized, no token', 401);
  }
});

// Admin middleware
const admin_required = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    throw new AppError('Not authorized as admin', 403);
  }
});

// Optional authentication - doesn't fail if no token
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Try Firebase token first
      const firebaseUser = await verifyFirebaseToken(token);

      if (firebaseUser) {
        const user = await User.findOne({ googleId: firebaseUser.uid });
        if (user && user.isActive) {
          req.user = user;
        }
      } else {
        // Try JWT
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const user = await User.findById(decoded.id).select('-__v');
          if (user && user.isActive) {
            req.user = user;
          }
        } catch (jwtError) {
          // Ignore JWT errors in optional auth
        }
      }
    } catch (error) {
      // Ignore errors in optional auth
    }
  }

  next();
});

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// Validate user ownership of resource
const validateOwnership = (resourceUserField = 'userId') => {
  return asyncHandler(async (req, res, next) => {
    const resource = req.resource || req.body;

    if (!resource) {
      throw new AppError('Resource not found', 404);
    }

    const resourceUserId = resource[resourceUserField]?.toString() || resource[resourceUserField];
    const currentUserId = req.user._id.toString();

    if (resourceUserId !== currentUserId) {
      throw new AppError('Not authorized to access this resource', 403);
    }

    next();
  });
};

export {
  protect,
  admin_required,
  optionalAuth,
  generateToken,
  validateOwnership,
  verifyFirebaseToken
};
