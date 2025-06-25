import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Database security configuration
const dbSecurity = {
  enableEncryption: process.env.DB_ENCRYPTION === 'true',
  enableQueryLogging: process.env.DB_QUERY_LOGGING === 'true',
  enableConnectionLogging: process.env.DB_CONNECTION_LOGGING === 'true',
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS) || 10,
  connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 30000,
  enableSSL: process.env.DB_SSL === 'true',
  enableAuth: process.env.DB_AUTH === 'true'
};

// Query logging middleware
const queryLogger = (query) => {
  if (dbSecurity.enableQueryLogging) {
    const sanitizedQuery = sanitizeQuery(query);
    console.log('🔍 DB Query:', {
      collection: query.getQuery ? query.getQuery() : 'unknown',
      operation: query.op || 'unknown',
      timestamp: new Date().toISOString(),
      duration: query.getOptions()?.maxTimeMS || 'unlimited'
    });
  }
};

// Sanitize query for logging (remove sensitive data)
const sanitizeQuery = (query) => {
  const queryStr = JSON.stringify(query);
  return queryStr.replace(/"password":\s*"[^"]*"/g, '"password":"[REDACTED]"')
    .replace(/"token":\s*"[^"]*"/g, '"token":"[REDACTED]"');
};

// Enhanced database connection with security features
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/library-tracker';

    // Enhanced connection options with security
    const options = {
      // Connection pool settings
      maxPoolSize: dbSecurity.maxConnections,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,

      // Timeout settings
      serverSelectionTimeoutMS: dbSecurity.connectionTimeout,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,

      // Security settings
      ssl: dbSecurity.enableSSL,
      sslValidate: dbSecurity.enableSSL,
      authSource: dbSecurity.enableAuth ? 'admin' : undefined,

      // Performance and reliability
      retryWrites: true,
      retryReads: true,
      readPreference: 'primary',
      writeConcern: {
        w: 'majority',
        j: true,
        wtimeout: 5000
      },

      // Compression
      compressors: ['zlib'],

      // Application name for monitoring
      appName: 'library-tracker-api'
    };

    // Add SSL certificate options if enabled
    if (dbSecurity.enableSSL && process.env.DB_SSL_CERT) {
      options.sslCert = process.env.DB_SSL_CERT;
      options.sslKey = process.env.DB_SSL_KEY;
      options.sslCA = process.env.DB_SSL_CA;
    }

    const conn = await mongoose.connect(mongoURI, options);

    if (dbSecurity.enableConnectionLogging) {
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      console.log(`🔒 Security Features: SSL=${dbSecurity.enableSSL}, Auth=${dbSecurity.enableAuth}, Encryption=${dbSecurity.enableEncryption}`);
    }

    // Set up query logging
    if (dbSecurity.enableQueryLogging) {
      mongoose.set('debug', (collectionName, method, query, doc) => {
        console.log('🔍 MongoDB Query:', {
          collection: collectionName,
          method: method,
          query: sanitizeQuery(query),
          timestamp: new Date().toISOString()
        });
      });
    }

    // Enhanced connection event handlers
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', {
        message: err.message,
        code: err.code,
        timestamp: new Date().toISOString()
      });
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected:', {
        timestamp: new Date().toISOString(),
        readyState: mongoose.connection.readyState
      });
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected:', {
        timestamp: new Date().toISOString()
      });
    });

    // Security monitoring
    mongoose.connection.on('open', () => {
      if (dbSecurity.enableConnectionLogging) {
        console.log('🔓 MongoDB connection opened:', {
          host: conn.connection.host,
          port: conn.connection.port,
          database: conn.connection.name,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Graceful shutdown with cleanup
    const gracefulShutdown = async (signal) => {
      console.log(`📡 Received ${signal}, closing MongoDB connection...`);
      try {
        await mongoose.connection.close();
        console.log('🔌 MongoDB connection closed gracefully');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during MongoDB shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon

    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', {
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    });
    process.exit(1);
  }
};

export default connectDB;
