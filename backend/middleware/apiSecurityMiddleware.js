import { AppError } from './errorMiddleware.js';
import validator from 'validator';
import crypto from 'crypto';

// API key storage (in production, use database)
const apiKeys = new Map();
const apiKeyUsage = new Map();

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request details
  const requestLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    referer: req.get('Referer'),
    origin: req.get('Origin'),
    userId: req.user?._id,
    sessionId: req.sessionID,
    requestId: crypto.randomUUID()
  };

  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestLog.requestId);
  
  // Store request log in request object
  req.requestLog = requestLog;
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const responseLog = {
      ...requestLog,
      statusCode: res.statusCode,
      duration,
      responseSize: res.get('Content-Length'),
      success: res.statusCode < 400
    };
    
    // Log based on status code
    if (res.statusCode >= 500) {
      console.error('🚨 Server Error:', responseLog);
    } else if (res.statusCode >= 400) {
      console.warn('⚠️ Client Error:', responseLog);
    } else if (process.env.NODE_ENV === 'development') {
      console.log('📝 Request:', responseLog);
    }
    
    // Store in usage analytics
    updateApiUsage(requestLog, responseLog);
  });
  
  next();
};

// API usage tracking
const updateApiUsage = (requestLog, responseLog) => {
  const key = `${requestLog.ip}-${requestLog.method}-${requestLog.url}`;
  const usage = apiKeyUsage.get(key) || {
    count: 0,
    firstSeen: requestLog.timestamp,
    lastSeen: requestLog.timestamp,
    errors: 0,
    totalDuration: 0
  };
  
  usage.count++;
  usage.lastSeen = requestLog.timestamp;
  usage.totalDuration += responseLog.duration;
  
  if (responseLog.statusCode >= 400) {
    usage.errors++;
  }
  
  apiKeyUsage.set(key, usage);
};

// IP whitelisting middleware
export const ipWhitelisting = (options = {}) => {
  const {
    whitelist = [],
    blacklist = [],
    allowPrivateIPs = true,
    allowLocalhost = true
  } = options;
  
  return (req, res, next) => {
    const clientIP = req.ip;
    
    // Check blacklist first
    if (blacklist.includes(clientIP)) {
      console.warn('🚫 Blacklisted IP blocked:', {
        ip: clientIP,
        url: req.originalUrl,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
      throw new AppError('Access denied', 403);
    }
    
    // If whitelist is defined and not empty, check it
    if (whitelist.length > 0) {
      const isWhitelisted = whitelist.some(allowedIP => {
        // Support CIDR notation
        if (allowedIP.includes('/')) {
          return isIPInCIDR(clientIP, allowedIP);
        }
        return clientIP === allowedIP;
      });
      
      if (!isWhitelisted) {
        console.warn('🚫 Non-whitelisted IP blocked:', {
          ip: clientIP,
          url: req.originalUrl,
          timestamp: new Date().toISOString()
        });
        throw new AppError('Access denied', 403);
      }
    }
    
    // Check for private/localhost IPs if not allowed
    if (!allowPrivateIPs && isPrivateIP(clientIP)) {
      throw new AppError('Private IP addresses not allowed', 403);
    }
    
    if (!allowLocalhost && (clientIP === '127.0.0.1' || clientIP === '::1')) {
      throw new AppError('Localhost access not allowed', 403);
    }
    
    next();
  };
};

// Helper function to check if IP is in CIDR range
const isIPInCIDR = (ip, cidr) => {
  // Simple CIDR check - in production, use a proper library
  const [network, prefixLength] = cidr.split('/');
  // This is a simplified implementation
  return ip.startsWith(network.split('.').slice(0, Math.floor(prefixLength / 8)).join('.'));
};

// Helper function to check if IP is private
const isPrivateIP = (ip) => {
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^fc00:/,
    /^fe80:/
  ];
  
  return privateRanges.some(range => range.test(ip));
};

// API key generation and management
export const generateApiKey = (userId, permissions = [], expiresIn = null) => {
  const apiKey = crypto.randomBytes(32).toString('hex');
  const keyData = {
    userId,
    permissions,
    createdAt: new Date(),
    expiresAt: expiresIn ? new Date(Date.now() + expiresIn) : null,
    isActive: true,
    usage: {
      totalRequests: 0,
      lastUsed: null,
      rateLimitHits: 0
    }
  };
  
  apiKeys.set(apiKey, keyData);
  return apiKey;
};

// API key validation middleware
export const validateApiKey = (requiredPermissions = []) => {
  return (req, res, next) => {
    const apiKey = req.get('X-API-Key') || req.query.apiKey;
    
    if (!apiKey) {
      throw new AppError('API key is required', 401);
    }
    
    const keyData = apiKeys.get(apiKey);
    
    if (!keyData) {
      console.warn('🚨 Invalid API key attempt:', {
        apiKey: apiKey.substring(0, 8) + '...',
        ip: req.ip,
        url: req.originalUrl,
        timestamp: new Date().toISOString()
      });
      throw new AppError('Invalid API key', 401);
    }
    
    if (!keyData.isActive) {
      throw new AppError('API key is disabled', 401);
    }
    
    if (keyData.expiresAt && keyData.expiresAt < new Date()) {
      throw new AppError('API key has expired', 401);
    }
    
    // Check permissions
    if (requiredPermissions.length > 0) {
      const hasPermission = requiredPermissions.every(permission => 
        keyData.permissions.includes(permission)
      );
      
      if (!hasPermission) {
        throw new AppError('Insufficient API key permissions', 403);
      }
    }
    
    // Update usage
    keyData.usage.totalRequests++;
    keyData.usage.lastUsed = new Date();
    
    // Add key data to request
    req.apiKey = {
      key: apiKey,
      userId: keyData.userId,
      permissions: keyData.permissions
    };
    
    next();
  };
};

// Request signature validation
export const validateRequestSignature = (secretKey) => {
  return (req, res, next) => {
    const signature = req.get('X-Signature');
    const timestamp = req.get('X-Timestamp');
    
    if (!signature || !timestamp) {
      throw new AppError('Request signature and timestamp required', 401);
    }
    
    // Check timestamp (prevent replay attacks)
    const requestTime = parseInt(timestamp);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDiff = Math.abs(currentTime - requestTime);
    
    if (timeDiff > 300) { // 5 minutes tolerance
      throw new AppError('Request timestamp too old', 401);
    }
    
    // Verify signature
    const payload = `${req.method}${req.originalUrl}${timestamp}${JSON.stringify(req.body || {})}`;
    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(payload)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      console.warn('🚨 Invalid request signature:', {
        ip: req.ip,
        url: req.originalUrl,
        timestamp: new Date().toISOString()
      });
      throw new AppError('Invalid request signature', 401);
    }
    
    next();
  };
};

// Geolocation-based access control
export const geolocationControl = (options = {}) => {
  const {
    allowedCountries = [],
    blockedCountries = [],
    allowUnknown = true
  } = options;
  
  return (req, res, next) => {
    // In production, integrate with a geolocation service
    const country = req.get('CF-IPCountry') || req.get('X-Country-Code') || 'UNKNOWN';
    
    if (blockedCountries.includes(country)) {
      console.warn('🚫 Blocked country access:', {
        country,
        ip: req.ip,
        url: req.originalUrl,
        timestamp: new Date().toISOString()
      });
      throw new AppError('Access denied from this location', 403);
    }
    
    if (allowedCountries.length > 0 && !allowedCountries.includes(country)) {
      if (!allowUnknown || country !== 'UNKNOWN') {
        throw new AppError('Access denied from this location', 403);
      }
    }
    
    req.geoLocation = { country };
    next();
  };
};

// API versioning middleware
export const apiVersioning = (supportedVersions = ['v1']) => {
  return (req, res, next) => {
    const version = req.get('API-Version') || 
                   req.params.version || 
                   req.query.version || 
                   'v1';
    
    if (!supportedVersions.includes(version)) {
      throw new AppError(`API version ${version} is not supported`, 400);
    }
    
    req.apiVersion = version;
    res.setHeader('API-Version', version);
    
    next();
  };
};

// Request correlation middleware
export const requestCorrelation = (req, res, next) => {
  const correlationId = req.get('X-Correlation-ID') || crypto.randomUUID();
  
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  
  next();
};

// API health check middleware
export const healthCheck = (req, res, next) => {
  if (req.path === '/health' || req.path === '/api/health') {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.API_VERSION || 'v1',
      environment: process.env.NODE_ENV || 'development'
    };
    
    return res.status(200).json(healthData);
  }
  
  next();
};

// Comprehensive API security middleware
export const applyApiSecurity = (options = {}) => {
  const middlewares = [];
  
  if (options.enableRequestLogging !== false) {
    middlewares.push(requestLogger);
  }
  
  if (options.enableCorrelation !== false) {
    middlewares.push(requestCorrelation);
  }
  
  if (options.enableHealthCheck !== false) {
    middlewares.push(healthCheck);
  }
  
  if (options.enableVersioning !== false) {
    middlewares.push(apiVersioning(options.supportedVersions));
  }
  
  if (options.enableIPWhitelisting && options.ipWhitelistConfig) {
    middlewares.push(ipWhitelisting(options.ipWhitelistConfig));
  }
  
  if (options.enableGeolocation && options.geolocationConfig) {
    middlewares.push(geolocationControl(options.geolocationConfig));
  }
  
  return middlewares;
};

export default {
  requestLogger,
  ipWhitelisting,
  validateApiKey,
  validateRequestSignature,
  geolocationControl,
  apiVersioning,
  requestCorrelation,
  healthCheck,
  generateApiKey,
  applyApiSecurity
};
