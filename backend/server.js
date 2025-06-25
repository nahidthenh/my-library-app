import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';

// Import configurations and utilities
import connectDB from './config/database.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import bookRoutes from './routes/bookRoutes.js';
import userRoutes from './routes/userRoutes.js';
import statisticsRoutes from './routes/statisticsRoutes.js';
import importExportRoutes from './routes/importExportRoutes.js';

// Load environment variables
dotenv.config();

const PORT = 5001;

// Create Express app
const app = express();

// Connect to MongoDB
connectDB();

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Enhanced security middleware with comprehensive helmet configuration
app.use(helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Only for development - remove in production
        "https://apis.google.com",
        "https://www.gstatic.com",
        "https://www.googleapis.com"
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
        "https://lh3.googleusercontent.com", // Google profile images
        "https://books.google.com" // Book cover images
      ],
      connectSrc: [
        "'self'",
        "https://api.library-tracker.com",
        "https://identitytoolkit.googleapis.com",
        "https://securetoken.googleapis.com"
      ],
      frameSrc: [
        "'self'",
        "https://accounts.google.com"
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    },
    reportOnly: process.env.NODE_ENV === 'development'
  },

  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },

  // X-Frame-Options
  frameguard: {
    action: 'deny'
  },

  // X-Content-Type-Options
  noSniff: true,

  // X-XSS-Protection
  xssFilter: true,

  // Referrer Policy
  referrerPolicy: {
    policy: ['no-referrer', 'strict-origin-when-cross-origin']
  },

  // Cross-Origin Embedder Policy
  crossOriginEmbedderPolicy: false, // Disable for Google OAuth compatibility

  // Cross-Origin Opener Policy
  crossOriginOpenerPolicy: {
    policy: 'same-origin-allow-popups'
  },

  // Cross-Origin Resource Policy
  crossOriginResourcePolicy: {
    policy: 'cross-origin'
  },

  // Permissions Policy (formerly Feature Policy)
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: [],
    payment: [],
    usb: [],
    magnetometer: [],
    gyroscope: [],
    accelerometer: []
  }
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174'
    ];

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

// Rate limiting middleware
import {
  generalLimiter,
  authLimiter,
  uploadLimiter,
  progressiveLimiter,
  ipWhitelist,
  adminBypass
} from './middleware/rateLimitMiddleware.js';

// Security headers middleware
import {
  applySecurityHeaders,
  apiSecurityHeaders,
  sanitizeResponseHeaders
} from './middleware/securityHeadersMiddleware.js';

// API security middleware
import {
  applyApiSecurity,
  requestLogger,
  requestCorrelation,
  healthCheck
} from './middleware/apiSecurityMiddleware.js';

// Apply comprehensive security middleware
app.use(...applySecurityHeaders());
app.use(...applyApiSecurity({
  enableRequestLogging: true,
  enableCorrelation: true,
  enableHealthCheck: true,
  enableVersioning: true,
  supportedVersions: ['v1', 'v2']
}));

// Apply progressive rate limiting and IP whitelist
app.use(progressiveLimiter);
app.use(ipWhitelist(process.env.TRUSTED_IPS?.split(',') || []));

// Apply general rate limiting to all API routes
app.use('/api/', generalLimiter);

// Compression middleware
app.use(compression());

// Logging middleware
// if (process.env.NODE_ENV === 'development') {
//   app.use(morgan('dev'));
// } else {
//   app.use(morgan('combined'));
// }

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint (bypasses rate limiting)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.API_VERSION || 'v1',
    rateLimiting: {
      enabled: process.env.ENABLE_RATE_LIMITING !== 'false',
      progressiveBlocking: process.env.ENABLE_PROGRESSIVE_BLOCKING !== 'false'
    }
  });
});

// API routes with security headers
const apiVersion = process.env.API_VERSION || 'v1';
app.use(`/api/${apiVersion}`, apiSecurityHeaders); // Apply API-specific headers to all API routes
app.use(`/api/${apiVersion}/auth`, authRoutes);
app.use(`/api/${apiVersion}/books`, bookRoutes);
app.use(`/api/${apiVersion}/users`, userRoutes);
app.use(`/api/${apiVersion}/stats`, statisticsRoutes);
app.use(`/api/${apiVersion}/import-export`, importExportRoutes);

// Root endpoint
// app.get('/', (req, res) => {
//   res.json({
//     message: 'Library Tracker API',
//     version: apiVersion,
//     documentation: '/api/docs',
//     health: '/health'
//   });
// });

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

app.get("/", (req, res) => {
  res.json("Welome to Library Tracker APP");
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Start server
// const PORT = process.env.PORT || 5000;

// const server = app.listen(PORT, () => {
//   console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
//   console.log(`📚 Library Tracker API v${apiVersion} is ready!`);
//   console.log(`🔗 API Base URL: http://localhost:${PORT}/api/${apiVersion}`);
//   console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
// });



export default app;
