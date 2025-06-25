// Enhanced security headers middleware
export const securityHeaders = (req, res, next) => {
  // Security headers for all responses
  const headers = {
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // XSS Protection
    'X-XSS-Protection': '1; mode=block',
    
    // Frame Options
    'X-Frame-Options': 'DENY',
    
    // Referrer Policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Cross-Origin Policies
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    
    // Cache Control for sensitive endpoints
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    
    // Server information hiding
    'Server': 'Library-Tracker-API',
    
    // API versioning
    'API-Version': process.env.API_VERSION || 'v1',
    
    // Security contact
    'Security-Contact': 'security@library-tracker.com'
  };

  // Apply HSTS only in production with HTTPS
  if (process.env.NODE_ENV === 'production' && req.secure) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }

  // Content Security Policy for API responses
  if (req.path.startsWith('/api/')) {
    headers['Content-Security-Policy'] = "default-src 'none'; frame-ancestors 'none';";
  }

  // Permissions Policy
  headers['Permissions-Policy'] = [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()',
    'ambient-light-sensor=()',
    'autoplay=()',
    'battery=()',
    'display-capture=()',
    'document-domain=()',
    'encrypted-media=()',
    'fullscreen=()',
    'midi=()',
    'picture-in-picture=()',
    'publickey-credentials-get=()',
    'screen-wake-lock=()',
    'web-share=()',
    'xr-spatial-tracking=()'
  ].join(', ');

  // Apply all headers
  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  next();
};

// Content Security Policy for different environments
export const getCSPDirectives = (environment = 'development') => {
  const baseDirectives = {
    defaultSrc: ["'self'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    upgradeInsecureRequests: environment === 'production' ? [] : null
  };

  const developmentDirectives = {
    ...baseDirectives,
    scriptSrc: [
      "'self'",
      "'unsafe-inline'", // Allow for development
      "'unsafe-eval'", // Allow for development
      "https://apis.google.com",
      "https://www.gstatic.com"
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'",
      "https://fonts.googleapis.com"
    ],
    fontSrc: [
      "'self'",
      "https://fonts.gstatic.com"
    ],
    imgSrc: [
      "'self'",
      "data:",
      "https:",
      "http://localhost:*"
    ],
    connectSrc: [
      "'self'",
      "http://localhost:*",
      "ws://localhost:*",
      "https://identitytoolkit.googleapis.com",
      "https://securetoken.googleapis.com"
    ]
  };

  const productionDirectives = {
    ...baseDirectives,
    scriptSrc: [
      "'self'",
      "https://apis.google.com",
      "https://www.gstatic.com"
    ],
    styleSrc: [
      "'self'",
      "https://fonts.googleapis.com"
    ],
    fontSrc: [
      "'self'",
      "https://fonts.gstatic.com"
    ],
    imgSrc: [
      "'self'",
      "data:",
      "https:",
      "https://lh3.googleusercontent.com",
      "https://books.google.com"
    ],
    connectSrc: [
      "'self'",
      "https://api.library-tracker.com",
      "https://identitytoolkit.googleapis.com",
      "https://securetoken.googleapis.com"
    ],
    frameSrc: [
      "https://accounts.google.com"
    ]
  };

  return environment === 'production' ? productionDirectives : developmentDirectives;
};

// Dynamic CSP middleware
export const dynamicCSP = (req, res, next) => {
  const environment = process.env.NODE_ENV || 'development';
  const directives = getCSPDirectives(environment);
  
  // Convert directives to CSP string
  const cspString = Object.entries(directives)
    .filter(([key, value]) => value !== null)
    .map(([key, value]) => {
      const directive = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${directive} ${Array.isArray(value) ? value.join(' ') : value}`;
    })
    .join('; ');

  res.setHeader('Content-Security-Policy', cspString);
  
  // Also set report-only header in development for testing
  if (environment === 'development') {
    res.setHeader('Content-Security-Policy-Report-Only', cspString);
  }

  next();
};

// CORS security headers
export const corsSecurityHeaders = (req, res, next) => {
  const origin = req.get('Origin');
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174'
  ];

  // Validate origin
  if (origin && !allowedOrigins.includes(origin)) {
    console.warn('🚨 Unauthorized CORS origin:', {
      origin,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
  }

  // Additional CORS security headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  res.setHeader('Vary', 'Origin, Access-Control-Request-Headers');

  next();
};

// API-specific security headers
export const apiSecurityHeaders = (req, res, next) => {
  // Headers specific to API endpoints
  res.setHeader('X-API-Version', process.env.API_VERSION || 'v1');
  res.setHeader('X-Rate-Limit-Policy', 'standard');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent caching of API responses
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // JSON-specific headers
  if (req.accepts('json')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }

  next();
};

// Security headers for file uploads
export const uploadSecurityHeaders = (req, res, next) => {
  // Additional headers for file upload endpoints
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none';");
  
  // File upload specific headers
  res.setHeader('X-Upload-Max-Size', '10MB');
  res.setHeader('X-Upload-Allowed-Types', 'text/csv,application/json');

  next();
};

// Remove sensitive headers from responses
export const sanitizeResponseHeaders = (req, res, next) => {
  // Remove server information that might leak version details
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  // Override with generic server header
  res.setHeader('Server', 'Library-Tracker');

  next();
};

// Security headers for authentication endpoints
export const authSecurityHeaders = (req, res, next) => {
  // Extra security for auth endpoints
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');

  next();
};

// Comprehensive security headers middleware
export const applySecurityHeaders = (options = {}) => {
  const middlewares = [];

  if (options.enableBasicHeaders !== false) {
    middlewares.push(securityHeaders);
  }

  if (options.enableDynamicCSP !== false) {
    middlewares.push(dynamicCSP);
  }

  if (options.enableCORSHeaders !== false) {
    middlewares.push(corsSecurityHeaders);
  }

  if (options.enableResponseSanitization !== false) {
    middlewares.push(sanitizeResponseHeaders);
  }

  return middlewares;
};

export default {
  securityHeaders,
  dynamicCSP,
  corsSecurityHeaders,
  apiSecurityHeaders,
  uploadSecurityHeaders,
  authSecurityHeaders,
  sanitizeResponseHeaders,
  applySecurityHeaders,
  getCSPDirectives
};
