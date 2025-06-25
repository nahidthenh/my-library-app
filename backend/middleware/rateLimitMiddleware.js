import rateLimit from 'express-rate-limit';
import { AppError } from './errorMiddleware.js';

// Store for tracking failed attempts
const failedAttempts = new Map();

// Helper function to create standardized rate limit response
const createRateLimitResponse = (message, type, retryAfter) => ({
  success: false,
  error: {
    message,
    type,
    retryAfter
  },
  timestamp: new Date().toISOString()
});

// Helper function to get client identifier
const getClientId = (req) => {
  // Use user ID if authenticated, otherwise IP
  return req.user ? `${req.ip}-${req.user._id}` : req.ip;
};

// General API rate limiter
export const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: createRateLimitResponse(
    'Too many requests from this IP, please try again later.',
    'RATE_LIMIT_EXCEEDED',
    Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000) / 1000)
  ),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientId,
  skip: (req) => {
    // Skip rate limiting for health checks and static assets
    return req.path === '/health' || req.path.startsWith('/static/');
  },
  onLimitReached: (req, res, options) => {
    console.warn(`Rate limit exceeded for ${getClientId(req)} on ${req.path}`);
  }
});

// Strict rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Very strict for auth endpoints
  message: createRateLimitResponse(
    'Too many authentication attempts, please try again later.',
    'AUTH_RATE_LIMIT_EXCEEDED',
    900
  ),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  keyGenerator: (req) => req.ip, // Use IP only for auth
  onLimitReached: (req, res, options) => {
    console.warn(`Auth rate limit exceeded for IP ${req.ip}`);
    // Track failed attempts for potential blocking
    const attempts = failedAttempts.get(req.ip) || 0;
    failedAttempts.set(req.ip, attempts + 1);
  }
});

// File upload rate limiter
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: createRateLimitResponse(
    'Too many file uploads, please try again later.',
    'UPLOAD_RATE_LIMIT_EXCEEDED',
    3600
  ),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientId,
  onLimitReached: (req, res, options) => {
    console.warn(`Upload rate limit exceeded for ${getClientId(req)}`);
  }
});

// Search rate limiter (to prevent search abuse)
export const searchLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // 50 searches per 5 minutes
  message: createRateLimitResponse(
    'Too many search requests, please try again later.',
    'SEARCH_RATE_LIMIT_EXCEEDED',
    300
  ),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientId
});

// API creation rate limiter (for POST requests)
export const createLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30, // 30 creations per 10 minutes
  message: createRateLimitResponse(
    'Too many creation requests, please try again later.',
    'CREATE_RATE_LIMIT_EXCEEDED',
    600
  ),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientId
});

// Bulk operation rate limiter
export const bulkLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 5, // 5 bulk operations per 30 minutes
  message: createRateLimitResponse(
    'Too many bulk operations, please try again later.',
    'BULK_RATE_LIMIT_EXCEEDED',
    1800
  ),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientId
});

// Progressive rate limiter for repeated violations
export const progressiveLimiter = (req, res, next) => {
  const clientId = getClientId(req);
  const attempts = failedAttempts.get(clientId) || 0;
  
  // Progressive blocking based on failed attempts
  if (attempts > 20) {
    // Block for 24 hours after 20 failed attempts
    return res.status(429).json(createRateLimitResponse(
      'Account temporarily blocked due to suspicious activity.',
      'ACCOUNT_BLOCKED',
      86400
    ));
  } else if (attempts > 10) {
    // Block for 1 hour after 10 failed attempts
    return res.status(429).json(createRateLimitResponse(
      'Too many failed attempts. Please try again later.',
      'TEMPORARY_BLOCK',
      3600
    ));
  }
  
  next();
};

// Cleanup function to remove old failed attempts
export const cleanupFailedAttempts = () => {
  // Run cleanup every hour
  setInterval(() => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    for (const [key, timestamp] of failedAttempts.entries()) {
      if (now - timestamp > oneHour) {
        failedAttempts.delete(key);
      }
    }
  }, oneHour);
};

// IP whitelist middleware (for trusted IPs)
export const ipWhitelist = (trustedIPs = []) => {
  return (req, res, next) => {
    const clientIP = req.ip;
    
    // Check if IP is in whitelist
    if (trustedIPs.includes(clientIP)) {
      // Skip rate limiting for whitelisted IPs
      req.skipRateLimit = true;
    }
    
    next();
  };
};

// Rate limit bypass for authenticated admin users
export const adminBypass = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    req.skipRateLimit = true;
  }
  next();
};

// Custom rate limiter factory
export const createCustomLimiter = (options) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getClientId
  };
  
  return rateLimit({
    ...defaultOptions,
    ...options,
    message: createRateLimitResponse(
      options.message || 'Too many requests, please try again later.',
      options.type || 'RATE_LIMIT_EXCEEDED',
      options.retryAfter || Math.ceil(options.windowMs / 1000)
    )
  });
};

// Initialize cleanup on module load
cleanupFailedAttempts();

export default {
  generalLimiter,
  authLimiter,
  uploadLimiter,
  searchLimiter,
  createLimiter,
  bulkLimiter,
  progressiveLimiter,
  ipWhitelist,
  adminBypass,
  createCustomLimiter
};
