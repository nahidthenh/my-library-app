import jwt from 'jsonwebtoken';
import { AppError } from './errorMiddleware.js';
import User from '../models/User.js';

// In-memory token blacklist (in production, use Redis or database)
const tokenBlacklist = new Set();
const refreshTokens = new Map(); // Store refresh tokens with metadata

// Token blacklist management
export const blacklistToken = (token) => {
  tokenBlacklist.add(token);
  
  // Clean up expired tokens periodically
  setTimeout(() => {
    tokenBlacklist.delete(token);
  }, 7 * 24 * 60 * 60 * 1000); // Remove after 7 days (max JWT lifetime)
};

export const isTokenBlacklisted = (token) => {
  return tokenBlacklist.has(token);
};

// Enhanced JWT token generation with additional security
export const generateSecureToken = (userId, options = {}) => {
  const payload = {
    id: userId,
    iat: Math.floor(Date.now() / 1000),
    jti: generateTokenId(), // JWT ID for tracking
    type: options.type || 'access'
  };

  const tokenOptions = {
    expiresIn: options.expiresIn || process.env.JWT_EXPIRE || '15m',
    issuer: 'library-tracker-api',
    audience: 'library-tracker-client',
    algorithm: 'HS256'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, tokenOptions);
};

// Generate refresh token
export const generateRefreshToken = (userId) => {
  const refreshToken = generateSecureToken(userId, {
    type: 'refresh',
    expiresIn: '7d'
  });

  // Store refresh token metadata
  refreshTokens.set(refreshToken, {
    userId,
    createdAt: new Date(),
    lastUsed: new Date(),
    isActive: true
  });

  return refreshToken;
};

// Generate unique token ID
const generateTokenId = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// Enhanced token verification with security checks
export const verifySecureToken = async (token, options = {}) => {
  try {
    // Check if token is blacklisted
    if (isTokenBlacklisted(token)) {
      throw new AppError('Token has been revoked', 401);
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'library-tracker-api',
      audience: 'library-tracker-client',
      algorithms: ['HS256']
    });

    // Additional security checks
    if (options.requireType && decoded.type !== options.requireType) {
      throw new AppError('Invalid token type', 401);
    }

    // Check token age for additional security
    const tokenAge = Date.now() / 1000 - decoded.iat;
    const maxAge = options.maxAge || 24 * 60 * 60; // 24 hours default

    if (tokenAge > maxAge) {
      throw new AppError('Token too old, please refresh', 401);
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Invalid token', 401);
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Token expired', 401);
    }
    throw error;
  }
};

// Token rotation middleware
export const tokenRotation = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (token) {
    try {
      const decoded = await verifySecureToken(token);
      
      // Check if token is close to expiration (within 5 minutes)
      const timeToExpiry = decoded.exp - Math.floor(Date.now() / 1000);
      
      if (timeToExpiry < 300) { // 5 minutes
        // Generate new token
        const newToken = generateSecureToken(decoded.id);
        
        // Add new token to response headers
        res.setHeader('X-New-Token', newToken);
        res.setHeader('X-Token-Rotated', 'true');
        
        // Blacklist old token
        blacklistToken(token);
        
        console.log('🔄 Token rotated for user:', decoded.id);
      }
    } catch (error) {
      // Don't fail the request if rotation fails
      console.warn('Token rotation failed:', error.message);
    }
  }
  
  next();
};

// Session management middleware
export const sessionManagement = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (token && req.user) {
    try {
      const decoded = await verifySecureToken(token);
      
      // Update user's last activity
      await User.findByIdAndUpdate(req.user._id, {
        lastActivity: new Date(),
        lastIP: req.ip,
        lastUserAgent: req.get('User-Agent')
      });

      // Check for concurrent sessions (optional security measure)
      const concurrentSessionLimit = 5;
      const user = await User.findById(req.user._id);
      
      if (user.activeSessions && user.activeSessions.length > concurrentSessionLimit) {
        console.warn('🚨 Too many concurrent sessions for user:', req.user._id);
        // Could implement session termination here
      }

    } catch (error) {
      console.warn('Session management error:', error.message);
    }
  }
  
  next();
};

// Refresh token validation
export const validateRefreshToken = (refreshToken) => {
  const tokenData = refreshTokens.get(refreshToken);
  
  if (!tokenData) {
    throw new AppError('Invalid refresh token', 401);
  }
  
  if (!tokenData.isActive) {
    throw new AppError('Refresh token has been revoked', 401);
  }
  
  // Check if refresh token is expired (7 days)
  const tokenAge = Date.now() - tokenData.createdAt.getTime();
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  if (tokenAge > maxAge) {
    refreshTokens.delete(refreshToken);
    throw new AppError('Refresh token expired', 401);
  }
  
  // Update last used timestamp
  tokenData.lastUsed = new Date();
  refreshTokens.set(refreshToken, tokenData);
  
  return tokenData;
};

// Revoke refresh token
export const revokeRefreshToken = (refreshToken) => {
  const tokenData = refreshTokens.get(refreshToken);
  if (tokenData) {
    tokenData.isActive = false;
    refreshTokens.set(refreshToken, tokenData);
  }
};

// Clean up expired refresh tokens
export const cleanupExpiredTokens = () => {
  const now = Date.now();
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  for (const [token, data] of refreshTokens.entries()) {
    const tokenAge = now - data.createdAt.getTime();
    if (tokenAge > maxAge || !data.isActive) {
      refreshTokens.delete(token);
    }
  }
};

// Security event logging
export const logSecurityEvent = (event, req, additionalData = {}) => {
  const securityLog = {
    event,
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    url: req.originalUrl,
    method: req.method,
    userId: req.user?._id,
    ...additionalData
  };
  
  console.log('🔒 Security Event:', securityLog);
  
  // In production, send to security monitoring system
  // await sendToSecurityMonitoring(securityLog);
};

// Suspicious activity detection
export const detectSuspiciousActivity = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (token && req.user) {
    try {
      const user = await User.findById(req.user._id);
      const currentIP = req.ip;
      const currentUserAgent = req.get('User-Agent');
      
      // Check for IP address changes
      if (user.lastIP && user.lastIP !== currentIP) {
        logSecurityEvent('IP_CHANGE', req, {
          previousIP: user.lastIP,
          newIP: currentIP
        });
      }
      
      // Check for user agent changes
      if (user.lastUserAgent && user.lastUserAgent !== currentUserAgent) {
        logSecurityEvent('USER_AGENT_CHANGE', req, {
          previousUserAgent: user.lastUserAgent,
          newUserAgent: currentUserAgent
        });
      }
      
      // Check for unusual activity patterns
      const lastActivity = user.lastActivity;
      if (lastActivity) {
        const timeSinceLastActivity = Date.now() - lastActivity.getTime();
        const oneHour = 60 * 60 * 1000;
        
        // If user was inactive for more than 1 hour, log reactivation
        if (timeSinceLastActivity > oneHour) {
          logSecurityEvent('USER_REACTIVATION', req, {
            inactiveTime: timeSinceLastActivity
          });
        }
      }
      
    } catch (error) {
      console.warn('Suspicious activity detection error:', error.message);
    }
  }
  
  next();
};

// Multi-factor authentication preparation
export const mfaPreparation = {
  // Generate MFA secret for user
  generateMFASecret: () => {
    // This would integrate with an MFA library like speakeasy
    return {
      secret: 'base32-encoded-secret',
      qrCode: 'data:image/png;base64,...',
      backupCodes: generateBackupCodes()
    };
  },
  
  // Verify MFA token
  verifyMFAToken: (secret, token) => {
    // This would verify the TOTP token
    return true; // Placeholder
  },
  
  // Generate backup codes
  generateBackupCodes: () => {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }
    return codes;
  }
};

// Generate backup codes helper
const generateBackupCodes = () => {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
  }
  return codes;
};

// Cleanup expired tokens periodically
setInterval(cleanupExpiredTokens, 60 * 60 * 1000); // Every hour

export default {
  generateSecureToken,
  generateRefreshToken,
  verifySecureToken,
  blacklistToken,
  isTokenBlacklisted,
  tokenRotation,
  sessionManagement,
  validateRefreshToken,
  revokeRefreshToken,
  logSecurityEvent,
  detectSuspiciousActivity,
  mfaPreparation
};
