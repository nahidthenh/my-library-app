import mongoose from 'mongoose';
import { AppError } from './errorMiddleware.js';

// Query performance monitoring
const queryPerformanceMonitor = new Map();
const slowQueryThreshold = parseInt(process.env.SLOW_QUERY_THRESHOLD) || 1000; // 1 second

// Database security middleware
export const databaseSecurity = {
  // Query optimization middleware
  optimizeQuery: (schema) => {
    schema.pre(/^find/, function() {
      const startTime = Date.now();
      
      // Add query timeout
      this.maxTimeMS(30000); // 30 seconds max
      
      // Limit result size
      if (!this.getOptions().limit) {
        this.limit(1000); // Default limit
      }
      
      // Track query performance
      this.startTime = startTime;
    });
    
    schema.post(/^find/, function(result) {
      const duration = Date.now() - this.startTime;
      
      if (duration > slowQueryThreshold) {
        console.warn('🐌 Slow Query Detected:', {
          collection: this.model.collection.name,
          query: this.getQuery(),
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        });
      }
      
      // Update performance metrics
      const queryKey = `${this.model.collection.name}_${this.op}`;
      const metrics = queryPerformanceMonitor.get(queryKey) || {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        slowQueries: 0
      };
      
      metrics.count++;
      metrics.totalTime += duration;
      metrics.avgTime = metrics.totalTime / metrics.count;
      
      if (duration > slowQueryThreshold) {
        metrics.slowQueries++;
      }
      
      queryPerformanceMonitor.set(queryKey, metrics);
    });
  },

  // Prevent NoSQL injection
  sanitizeQuery: (query) => {
    if (typeof query !== 'object' || query === null) {
      return query;
    }
    
    const sanitized = {};
    
    for (const [key, value] of Object.entries(query)) {
      // Remove dangerous operators
      if (key.startsWith('$') && !isAllowedOperator(key)) {
        console.warn('🚨 Blocked dangerous query operator:', key);
        continue;
      }
      
      // Recursively sanitize nested objects
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeQuery(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  },

  // Validate query complexity
  validateQueryComplexity: (query) => {
    const complexity = calculateQueryComplexity(query);
    const maxComplexity = parseInt(process.env.MAX_QUERY_COMPLEXITY) || 100;
    
    if (complexity > maxComplexity) {
      throw new AppError(`Query too complex (${complexity} > ${maxComplexity})`, 400);
    }
    
    return true;
  },

  // Database connection monitoring
  monitorConnections: () => {
    setInterval(() => {
      const connections = mongoose.connection.readyState;
      const stats = {
        readyState: connections,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name,
        collections: Object.keys(mongoose.connection.collections).length,
        timestamp: new Date().toISOString()
      };
      
      if (process.env.DB_CONNECTION_LOGGING === 'true') {
        console.log('📊 DB Connection Stats:', stats);
      }
    }, 60000); // Every minute
  },

  // Query result size limiter
  limitResultSize: (maxSize = 10000) => {
    return (req, res, next) => {
      const originalJson = res.json;
      
      res.json = function(data) {
        if (Array.isArray(data) && data.length > maxSize) {
          console.warn('⚠️ Large result set detected:', {
            size: data.length,
            maxSize,
            endpoint: req.originalUrl,
            timestamp: new Date().toISOString()
          });
          
          // Truncate results and add warning
          const truncated = data.slice(0, maxSize);
          return originalJson.call(this, {
            data: truncated,
            warning: `Results truncated. Showing ${maxSize} of ${data.length} items.`,
            total: data.length,
            truncated: true
          });
        }
        
        return originalJson.call(this, data);
      };
      
      next();
    };
  },

  // Database transaction security
  secureTransaction: async (operations) => {
    const session = await mongoose.startSession();
    
    try {
      session.startTransaction({
        readConcern: { level: 'majority' },
        writeConcern: { w: 'majority', j: true },
        maxTimeMS: 30000
      });
      
      const result = await operations(session);
      
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      console.error('🚨 Transaction failed:', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    } finally {
      session.endSession();
    }
  },

  // Index monitoring and optimization
  monitorIndexes: async () => {
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      
      for (const collection of collections) {
        const collectionObj = mongoose.connection.db.collection(collection.name);
        const indexes = await collectionObj.indexes();
        
        // Check for missing indexes on frequently queried fields
        const stats = await collectionObj.stats();
        
        if (stats.count > 1000 && indexes.length < 3) {
          console.warn('⚠️ Collection may need more indexes:', {
            collection: collection.name,
            documentCount: stats.count,
            indexCount: indexes.length,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('❌ Index monitoring error:', error.message);
    }
  },

  // Data validation middleware
  validateData: (schema) => {
    schema.pre('save', function() {
      // Validate data size
      const docSize = JSON.stringify(this.toObject()).length;
      const maxDocSize = parseInt(process.env.MAX_DOCUMENT_SIZE) || 16777216; // 16MB
      
      if (docSize > maxDocSize) {
        throw new Error(`Document too large: ${docSize} bytes > ${maxDocSize} bytes`);
      }
      
      // Validate field count
      const fieldCount = Object.keys(this.toObject()).length;
      const maxFields = parseInt(process.env.MAX_DOCUMENT_FIELDS) || 1000;
      
      if (fieldCount > maxFields) {
        throw new Error(`Too many fields: ${fieldCount} > ${maxFields}`);
      }
    });
  },

  // Get performance metrics
  getPerformanceMetrics: () => {
    const metrics = {};
    
    for (const [key, value] of queryPerformanceMonitor.entries()) {
      metrics[key] = {
        ...value,
        slowQueryPercentage: (value.slowQueries / value.count) * 100
      };
    }
    
    return metrics;
  },

  // Clear performance metrics
  clearPerformanceMetrics: () => {
    queryPerformanceMonitor.clear();
  }
};

// Helper function to check allowed MongoDB operators
const isAllowedOperator = (operator) => {
  const allowedOperators = [
    '$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin',
    '$and', '$or', '$not', '$nor',
    '$exists', '$type', '$regex', '$options',
    '$all', '$elemMatch', '$size',
    '$text', '$search',
    '$limit', '$skip', '$sort', '$project'
  ];
  
  return allowedOperators.includes(operator);
};

// Calculate query complexity score
const calculateQueryComplexity = (query, depth = 0) => {
  if (depth > 10) return 100; // Prevent infinite recursion
  
  let complexity = 0;
  
  if (typeof query === 'object' && query !== null) {
    for (const [key, value] of Object.entries(query)) {
      complexity += 1;
      
      // Add complexity for operators
      if (key.startsWith('$')) {
        complexity += 2;
      }
      
      // Add complexity for regex
      if (key === '$regex') {
        complexity += 5;
      }
      
      // Recursively calculate for nested objects
      if (typeof value === 'object' && value !== null) {
        complexity += calculateQueryComplexity(value, depth + 1);
      }
      
      // Add complexity for arrays
      if (Array.isArray(value)) {
        complexity += value.length;
      }
    }
  }
  
  return complexity;
};

// Database security audit
export const auditDatabaseSecurity = async () => {
  const audit = {
    timestamp: new Date().toISOString(),
    connectionSecurity: {
      ssl: mongoose.connection.options?.ssl || false,
      auth: mongoose.connection.options?.authSource ? true : false,
      compression: mongoose.connection.options?.compressors?.length > 0
    },
    collections: [],
    indexes: [],
    performance: databaseSecurity.getPerformanceMetrics()
  };
  
  try {
    // Audit collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    for (const collection of collections) {
      const collectionObj = mongoose.connection.db.collection(collection.name);
      const stats = await collectionObj.stats();
      const indexes = await collectionObj.indexes();
      
      audit.collections.push({
        name: collection.name,
        documentCount: stats.count,
        avgDocumentSize: stats.avgObjSize,
        totalSize: stats.size,
        indexCount: indexes.length
      });
      
      audit.indexes.push(...indexes.map(index => ({
        collection: collection.name,
        name: index.name,
        keys: index.key,
        unique: index.unique || false,
        sparse: index.sparse || false
      })));
    }
    
    console.log('🔍 Database Security Audit:', audit);
    return audit;
  } catch (error) {
    console.error('❌ Database audit failed:', error.message);
    throw error;
  }
};

// Initialize database security monitoring
export const initializeDatabaseSecurity = () => {
  // Start connection monitoring
  databaseSecurity.monitorConnections();
  
  // Schedule index monitoring
  setInterval(() => {
    databaseSecurity.monitorIndexes();
  }, 24 * 60 * 60 * 1000); // Daily
  
  // Schedule performance metrics cleanup
  setInterval(() => {
    databaseSecurity.clearPerformanceMetrics();
  }, 60 * 60 * 1000); // Hourly
  
  console.log('🔒 Database security monitoring initialized');
};

export default databaseSecurity;
