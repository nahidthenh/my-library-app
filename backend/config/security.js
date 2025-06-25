import dotenv from 'dotenv';

dotenv.config();

// Security configuration object
export const securityConfig = {
  // Environment settings
  environment: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRE || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRE || '7d',
    issuer: 'library-tracker-api',
    audience: 'library-tracker-client',
    algorithm: 'HS256'
  },

  // Rate Limiting Configuration
  rateLimiting: {
    enabled: process.env.ENABLE_RATE_LIMITING !== 'false',
    general: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
    },
    auth: {
      windowMs: 15 * 60 * 1000,
      max: 10,
      skipSuccessfulRequests: true
    },
    upload: {
      windowMs: 60 * 60 * 1000,
      max: 20
    },
    search: {
      windowMs: 5 * 60 * 1000,
      max: 50
    },
    create: {
      windowMs: 10 * 60 * 1000,
      max: 30
    },
    bulk: {
      windowMs: 30 * 60 * 1000,
      max: 5
    }
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key', 'X-Correlation-ID']
  },

  // Security Headers Configuration
  headers: {
    contentSecurityPolicy: {
      development: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
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
      },
      production: {
        defaultSrc: ["'self'"],
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
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  },

  // IP Security Configuration
  ipSecurity: {
    trustedIPs: process.env.TRUSTED_IPS?.split(',') || [],
    enableWhitelisting: process.env.ENABLE_IP_WHITELIST === 'true',
    enableBlacklisting: process.env.ENABLE_IP_BLACKLIST === 'true',
    blacklistedIPs: process.env.BLACKLISTED_IPS?.split(',') || [],
    allowPrivateIPs: process.env.ALLOW_PRIVATE_IPS !== 'false',
    allowLocalhost: process.env.ALLOW_LOCALHOST !== 'false'
  },

  // File Upload Security
  fileUpload: {
    maxSize: process.env.MAX_UPLOAD_SIZE || '10MB',
    allowedTypes: ['text/csv', 'application/json'],
    allowedExtensions: ['.csv', '.json'],
    virusScanning: process.env.ENABLE_VIRUS_SCANNING === 'true',
    quarantinePath: process.env.QUARANTINE_PATH || './quarantine'
  },

  // Database Security
  database: {
    connectionEncryption: process.env.DB_ENCRYPTION === 'true',
    queryLogging: process.env.DB_QUERY_LOGGING === 'true',
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 30000,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS) || 10
  },

  // Session Management
  session: {
    maxConcurrentSessions: parseInt(process.env.MAX_CONCURRENT_SESSIONS) || 5,
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 24 * 60 * 60 * 1000, // 24 hours
    trackUserActivity: process.env.TRACK_USER_ACTIVITY !== 'false',
    detectSuspiciousActivity: process.env.DETECT_SUSPICIOUS_ACTIVITY !== 'false'
  },

  // API Security
  api: {
    enableApiKeys: process.env.ENABLE_API_KEYS === 'true',
    enableRequestSigning: process.env.ENABLE_REQUEST_SIGNING === 'true',
    enableGeolocation: process.env.ENABLE_GEOLOCATION === 'true',
    supportedVersions: ['v1'],
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000,
    maxRequestSize: process.env.MAX_REQUEST_SIZE || '10mb'
  },

  // Monitoring and Logging
  monitoring: {
    enableSecurityLogging: process.env.ENABLE_SECURITY_LOGGING !== 'false',
    enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING !== 'false',
    enableErrorLogging: process.env.ENABLE_ERROR_LOGGING !== 'false',
    logLevel: process.env.LOG_LEVEL || 'info',
    securityEventWebhook: process.env.SECURITY_EVENT_WEBHOOK,
    alertThresholds: {
      failedLogins: parseInt(process.env.FAILED_LOGIN_THRESHOLD) || 5,
      suspiciousRequests: parseInt(process.env.SUSPICIOUS_REQUEST_THRESHOLD) || 10,
      rateLimitViolations: parseInt(process.env.RATE_LIMIT_VIOLATION_THRESHOLD) || 3
    }
  },

  // Encryption
  encryption: {
    algorithm: 'aes-256-gcm',
    keyDerivation: 'pbkdf2',
    iterations: 100000,
    saltLength: 32,
    ivLength: 16
  },

  // Multi-Factor Authentication
  mfa: {
    enabled: process.env.ENABLE_MFA === 'true',
    issuer: 'Library Tracker',
    window: 2, // Allow 2 time steps before/after current
    backupCodeCount: 10
  },

  // Security Policies
  policies: {
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
      preventReuse: 5
    },
    accountLockout: {
      maxFailedAttempts: 5,
      lockoutDuration: 30 * 60 * 1000, // 30 minutes
      progressiveLockout: true
    },
    dataRetention: {
      logRetentionDays: 90,
      sessionRetentionDays: 30,
      auditRetentionDays: 365
    }
  }
};

// Validation function to ensure required security settings
export const validateSecurityConfig = () => {
  const errors = [];

  // Check required environment variables
  if (!securityConfig.jwt.secret) {
    errors.push('JWT_SECRET is required');
  }

  if (securityConfig.jwt.secret && securityConfig.jwt.secret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
  }

  if (securityConfig.isProduction) {
    // Production-specific validations
    if (securityConfig.cors.origin.some(origin => origin.includes('localhost'))) {
      errors.push('Localhost origins should not be allowed in production');
    }

    if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('localhost')) {
      errors.push('Production database URI should not use localhost');
    }
  }

  if (errors.length > 0) {
    console.error('❌ Security Configuration Errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    throw new Error('Invalid security configuration');
  }

  console.log('✅ Security configuration validated successfully');
};

// Get environment-specific configuration
export const getSecurityConfig = (environment = process.env.NODE_ENV) => {
  const config = { ...securityConfig };
  
  // Override settings based on environment
  if (environment === 'test') {
    config.rateLimiting.enabled = false;
    config.monitoring.enableRequestLogging = false;
  }
  
  return config;
};

export default securityConfig;
