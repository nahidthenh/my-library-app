import { AppError } from './errorMiddleware.js';
import validator from 'validator';

// Security logging middleware
export const securityLogger = (req, res, next) => {
  const securityEvents = [];
  
  // Log suspicious patterns
  const suspiciousPatterns = [
    /(\<script\>|\<\/script\>)/gi,
    /(javascript:|data:|vbscript:)/gi,
    /(union|select|insert|delete|update|drop|create|alter)/gi,
    /(\$where|\$ne|\$gt|\$lt|\$regex)/gi,
    /(\.\.\/|\.\.\\)/g,
    /(eval\(|setTimeout\(|setInterval\()/gi
  ];

  const checkForSuspiciousContent = (obj, path = '') => {
    if (typeof obj === 'string') {
      suspiciousPatterns.forEach((pattern, index) => {
        if (pattern.test(obj)) {
          securityEvents.push({
            type: 'SUSPICIOUS_PATTERN',
            pattern: pattern.toString(),
            value: obj.substring(0, 100),
            path: path,
            timestamp: new Date().toISOString()
          });
        }
      });
    } else if (typeof obj === 'object' && obj !== null) {
      Object.keys(obj).forEach(key => {
        checkForSuspiciousContent(obj[key], path ? `${path}.${key}` : key);
      });
    }
  };

  // Check request body, query, and params
  if (req.body) checkForSuspiciousContent(req.body, 'body');
  if (req.query) checkForSuspiciousContent(req.query, 'query');
  if (req.params) checkForSuspiciousContent(req.params, 'params');

  // Log security events
  if (securityEvents.length > 0) {
    console.warn('🚨 Security Alert:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      method: req.method,
      events: securityEvents,
      timestamp: new Date().toISOString()
    });

    // Block request if too many suspicious patterns
    if (securityEvents.length > 3) {
      throw new AppError('Suspicious activity detected', 403);
    }
  }

  next();
};

// Request size limiter
export const requestSizeLimiter = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = req.get('Content-Length');
    
    if (contentLength) {
      const sizeInBytes = parseInt(contentLength);
      const maxSizeInBytes = parseSize(maxSize);
      
      if (sizeInBytes > maxSizeInBytes) {
        throw new AppError('Request entity too large', 413);
      }
    }
    
    next();
  };
};

// Helper function to parse size strings
const parseSize = (size) => {
  if (typeof size === 'number') return size;
  
  const units = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };
  
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';
  
  return value * units[unit];
};

// IP-based security middleware
export const ipSecurity = (req, res, next) => {
  const clientIP = req.ip;
  const userAgent = req.get('User-Agent') || '';
  
  // Block known malicious IP patterns (example patterns)
  const maliciousPatterns = [
    /^10\.0\.0\.1$/, // Example: block specific test IP
    /^192\.168\.1\.666$/ // Example: invalid IP pattern
  ];
  
  const isBlocked = maliciousPatterns.some(pattern => pattern.test(clientIP));
  
  if (isBlocked) {
    console.warn('🚫 Blocked IP attempt:', {
      ip: clientIP,
      userAgent,
      url: req.originalUrl,
      timestamp: new Date().toISOString()
    });
    
    throw new AppError('Access denied', 403);
  }
  
  // Log suspicious user agents
  const suspiciousUserAgents = [
    /sqlmap/i,
    /nikto/i,
    /nessus/i,
    /burp/i,
    /nmap/i,
    /masscan/i
  ];
  
  const isSuspiciousUA = suspiciousUserAgents.some(pattern => pattern.test(userAgent));
  
  if (isSuspiciousUA) {
    console.warn('🚨 Suspicious User Agent:', {
      ip: clientIP,
      userAgent,
      url: req.originalUrl,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

// Content type validation
export const contentTypeValidation = (allowedTypes = ['application/json']) => {
  return (req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      const contentType = req.get('Content-Type');
      
      if (!contentType) {
        throw new AppError('Content-Type header is required', 400);
      }
      
      const isAllowed = allowedTypes.some(type => 
        contentType.toLowerCase().includes(type.toLowerCase())
      );
      
      if (!isAllowed) {
        throw new AppError(`Content-Type must be one of: ${allowedTypes.join(', ')}`, 415);
      }
    }
    
    next();
  };
};

// Request method validation
export const methodValidation = (allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']) => {
  return (req, res, next) => {
    if (!allowedMethods.includes(req.method)) {
      throw new AppError('Method not allowed', 405);
    }
    
    next();
  };
};

// Header security validation
export const headerSecurity = (req, res, next) => {
  const headers = req.headers;
  
  // Check for suspicious headers
  const suspiciousHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'x-cluster-client-ip'
  ];
  
  // Validate X-Forwarded-For if present
  if (headers['x-forwarded-for']) {
    const ips = headers['x-forwarded-for'].split(',').map(ip => ip.trim());
    const invalidIPs = ips.filter(ip => !validator.isIP(ip));
    
    if (invalidIPs.length > 0) {
      console.warn('🚨 Invalid X-Forwarded-For header:', {
        header: headers['x-forwarded-for'],
        invalidIPs,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  // Check for excessively long headers
  Object.keys(headers).forEach(key => {
    if (typeof headers[key] === 'string' && headers[key].length > 8192) {
      throw new AppError('Header too long', 400);
    }
  });
  
  next();
};

// Request frequency monitoring
const requestCounts = new Map();

export const requestFrequencyMonitor = (windowMs = 60000, threshold = 1000) => {
  return (req, res, next) => {
    const clientId = req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get or create request history for this client
    if (!requestCounts.has(clientId)) {
      requestCounts.set(clientId, []);
    }
    
    const requests = requestCounts.get(clientId);
    
    // Remove old requests outside the window
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);
    
    // Add current request
    recentRequests.push(now);
    
    // Update the map
    requestCounts.set(clientId, recentRequests);
    
    // Check if threshold exceeded
    if (recentRequests.length > threshold) {
      console.warn('🚨 High request frequency detected:', {
        ip: clientId,
        requestCount: recentRequests.length,
        threshold,
        windowMs,
        timestamp: new Date().toISOString()
      });
      
      // Don't block, just log for now
      // Could implement blocking logic here
    }
    
    next();
  };
};

// Cleanup old request counts periodically
setInterval(() => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  for (const [clientId, requests] of requestCounts.entries()) {
    const recentRequests = requests.filter(timestamp => timestamp > (now - oneHour));
    
    if (recentRequests.length === 0) {
      requestCounts.delete(clientId);
    } else {
      requestCounts.set(clientId, recentRequests);
    }
  }
}, 5 * 60 * 1000); // Cleanup every 5 minutes

// Combined security middleware
export const applySecurity = (options = {}) => {
  const middlewares = [];
  
  if (options.enableSecurityLogging !== false) {
    middlewares.push(securityLogger);
  }
  
  if (options.enableIPSecurity !== false) {
    middlewares.push(ipSecurity);
  }
  
  if (options.enableHeaderSecurity !== false) {
    middlewares.push(headerSecurity);
  }
  
  if (options.enableContentTypeValidation !== false) {
    middlewares.push(contentTypeValidation(options.allowedContentTypes));
  }
  
  if (options.enableMethodValidation !== false) {
    middlewares.push(methodValidation(options.allowedMethods));
  }
  
  if (options.enableRequestSizeLimit !== false) {
    middlewares.push(requestSizeLimiter(options.maxRequestSize));
  }
  
  if (options.enableFrequencyMonitoring !== false) {
    middlewares.push(requestFrequencyMonitor(
      options.frequencyWindowMs,
      options.frequencyThreshold
    ));
  }
  
  return middlewares;
};

export default {
  securityLogger,
  ipSecurity,
  headerSecurity,
  contentTypeValidation,
  methodValidation,
  requestSizeLimiter,
  requestFrequencyMonitor,
  applySecurity
};
