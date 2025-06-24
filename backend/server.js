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

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
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

// Rate limiting
// const limiter = rateLimit({
//   windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
//   max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
//   message: {
//     error: 'Too many requests from this IP, please try again later.',
//     retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000) / 1000)
//   },
//   standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
//   legacyHeaders: false, // Disable the `X-RateLimit-*` headers
// });

// app.use('/api/', limiter);

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

// Health check endpoint
// app.get('/health', (req, res) => {
//   res.status(200).json({
//     status: 'OK',
//     timestamp: new Date().toISOString(),
//     uptime: process.uptime(),
//     environment: process.env.NODE_ENV,
//     version: process.env.API_VERSION || 'v1'
//   });
// });

// API routes
const apiVersion = process.env.API_VERSION || 'v1';
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
