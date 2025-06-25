import { environmentSecurity, secretsManager } from '../utils/secretsManager.js';
import { AppError } from './errorMiddleware.js';

// Environment validation middleware
export const validateEnvironment = (req, res, next) => {
  const { errors, warnings } = environmentSecurity.validateEnvironment();
  
  if (errors.length > 0) {
    console.error('❌ Environment Configuration Errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    throw new AppError('Invalid environment configuration', 500);
  }
  
  if (warnings.length > 0) {
    console.warn('⚠️ Environment Configuration Warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
  
  next();
};

// Environment information endpoint (for debugging)
export const environmentInfo = (req, res) => {
  const info = {
    nodeEnv: process.env.NODE_ENV,
    nodeVersion: process.version,
    platform: process.platform,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
    environment: environmentSecurity.maskEnvironment()
  };
  
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    delete info.environment;
  }
  
  res.json(info);
};

// Secrets management endpoints
export const secretsEndpoints = {
  // Get secret (admin only)
  getSecret: async (req, res) => {
    try {
      const { key } = req.params;
      const value = await secretsManager.getSecret(key);
      
      res.json({
        success: true,
        data: { key, value }
      });
    } catch (error) {
      throw new AppError(error.message, 404);
    }
  },

  // Set secret (admin only)
  setSecret: async (req, res) => {
    try {
      const { key } = req.params;
      const { value, metadata } = req.body;
      
      await secretsManager.setSecret(key, value, metadata);
      
      res.json({
        success: true,
        message: 'Secret stored successfully'
      });
    } catch (error) {
      throw new AppError(error.message, 500);
    }
  },

  // List secrets (admin only)
  listSecrets: async (req, res) => {
    try {
      const secrets = secretsManager.listSecrets();
      
      res.json({
        success: true,
        data: secrets
      });
    } catch (error) {
      throw new AppError(error.message, 500);
    }
  },

  // Delete secret (admin only)
  deleteSecret: async (req, res) => {
    try {
      const { key } = req.params;
      await secretsManager.deleteSecret(key);
      
      res.json({
        success: true,
        message: 'Secret deleted successfully'
      });
    } catch (error) {
      throw new AppError(error.message, 404);
    }
  },

  // Audit secrets (admin only)
  auditSecrets: async (req, res) => {
    try {
      const audit = secretsManager.auditSecrets();
      
      res.json({
        success: true,
        data: audit
      });
    } catch (error) {
      throw new AppError(error.message, 500);
    }
  },

  // Backup secrets (admin only)
  backupSecrets: async (req, res) => {
    try {
      const { backupPath } = req.body;
      const backupFile = await secretsManager.backupSecrets(backupPath);
      
      res.json({
        success: true,
        data: { backupFile },
        message: 'Secrets backed up successfully'
      });
    } catch (error) {
      throw new AppError(error.message, 500);
    }
  },

  // Cleanup expired secrets (admin only)
  cleanupSecrets: async (req, res) => {
    try {
      const expiredKeys = await secretsManager.cleanupExpiredSecrets();
      
      res.json({
        success: true,
        data: { expiredKeys, count: expiredKeys.length },
        message: `Cleaned up ${expiredKeys.length} expired secrets`
      });
    } catch (error) {
      throw new AppError(error.message, 500);
    }
  }
};

// Production environment hardening
export const productionHardening = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    // Remove debug headers
    res.removeHeader('X-Powered-By');
    
    // Add production-specific headers
    res.setHeader('X-Environment', 'production');
    res.setHeader('X-Security-Level', 'high');
    
    // Disable certain endpoints in production
    if (req.path.includes('/debug') || req.path.includes('/env-info')) {
      throw new AppError('Endpoint not available in production', 404);
    }
  }
  
  next();
};

// Configuration drift detection
export const configurationDrift = {
  baseline: null,
  
  // Set configuration baseline
  setBaseline: () => {
    configurationDrift.baseline = {
      timestamp: new Date().toISOString(),
      environment: { ...process.env },
      nodeVersion: process.version,
      platform: process.platform
    };
    
    console.log('📊 Configuration baseline set');
  },
  
  // Check for configuration drift
  checkDrift: () => {
    if (!configurationDrift.baseline) {
      return { hasDrift: false, message: 'No baseline set' };
    }
    
    const current = {
      environment: { ...process.env },
      nodeVersion: process.version,
      platform: process.platform
    };
    
    const drift = {
      hasDrift: false,
      changes: [],
      timestamp: new Date().toISOString()
    };
    
    // Check environment variables
    const baselineEnv = configurationDrift.baseline.environment;
    const currentEnv = current.environment;
    
    // Check for added variables
    for (const key in currentEnv) {
      if (!(key in baselineEnv)) {
        drift.changes.push({
          type: 'added',
          key,
          value: currentEnv[key]
        });
        drift.hasDrift = true;
      }
    }
    
    // Check for removed variables
    for (const key in baselineEnv) {
      if (!(key in currentEnv)) {
        drift.changes.push({
          type: 'removed',
          key,
          oldValue: baselineEnv[key]
        });
        drift.hasDrift = true;
      }
    }
    
    // Check for changed variables
    for (const key in baselineEnv) {
      if (key in currentEnv && baselineEnv[key] !== currentEnv[key]) {
        drift.changes.push({
          type: 'changed',
          key,
          oldValue: baselineEnv[key],
          newValue: currentEnv[key]
        });
        drift.hasDrift = true;
      }
    }
    
    // Check Node.js version
    if (configurationDrift.baseline.nodeVersion !== current.nodeVersion) {
      drift.changes.push({
        type: 'changed',
        key: 'nodeVersion',
        oldValue: configurationDrift.baseline.nodeVersion,
        newValue: current.nodeVersion
      });
      drift.hasDrift = true;
    }
    
    // Check platform
    if (configurationDrift.baseline.platform !== current.platform) {
      drift.changes.push({
        type: 'changed',
        key: 'platform',
        oldValue: configurationDrift.baseline.platform,
        newValue: current.platform
      });
      drift.hasDrift = true;
    }
    
    return drift;
  },
  
  // Monitor configuration drift
  startMonitoring: (intervalMs = 60000) => {
    setInterval(() => {
      const drift = configurationDrift.checkDrift();
      
      if (drift.hasDrift) {
        console.warn('⚠️ Configuration drift detected:', drift);
      }
    }, intervalMs);
    
    console.log('🔍 Configuration drift monitoring started');
  }
};

// Environment security audit
export const auditEnvironmentSecurity = () => {
  const audit = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    validation: environmentSecurity.validateEnvironment(),
    configurationDrift: configurationDrift.checkDrift(),
    secrets: secretsManager.auditSecrets(),
    security: {
      hasEncryptionKey: !!process.env.ENCRYPTION_KEY,
      hasSecretsKey: !!process.env.SECRETS_ENCRYPTION_KEY,
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasDatabaseUri: !!process.env.MONGODB_URI,
      corsConfigured: !!process.env.CORS_ORIGIN,
      rateLimitingEnabled: process.env.ENABLE_RATE_LIMITING !== 'false',
      securityLoggingEnabled: process.env.ENABLE_SECURITY_LOGGING !== 'false'
    },
    recommendations: []
  };
  
  // Generate recommendations
  if (!audit.security.hasEncryptionKey) {
    audit.recommendations.push('Set ENCRYPTION_KEY environment variable');
  }
  
  if (!audit.security.hasSecretsKey) {
    audit.recommendations.push('Set SECRETS_ENCRYPTION_KEY environment variable');
  }
  
  if (audit.validation.errors.length > 0) {
    audit.recommendations.push('Fix environment configuration errors');
  }
  
  if (audit.configurationDrift.hasDrift) {
    audit.recommendations.push('Review configuration drift');
  }
  
  return audit;
};

// Initialize environment security
export const initializeEnvironmentSecurity = async () => {
  try {
    // Initialize secrets manager
    await secretsManager.initialize();
    
    // Set configuration baseline
    configurationDrift.setBaseline();
    
    // Start drift monitoring in production
    if (process.env.NODE_ENV === 'production') {
      configurationDrift.startMonitoring();
    }
    
    // Validate environment
    const { errors, warnings } = environmentSecurity.validateEnvironment();
    
    if (errors.length > 0) {
      console.error('❌ Environment validation failed:', errors);
      throw new Error('Environment validation failed');
    }
    
    if (warnings.length > 0) {
      console.warn('⚠️ Environment warnings:', warnings);
    }
    
    console.log('🔒 Environment security initialized');
  } catch (error) {
    console.error('❌ Failed to initialize environment security:', error.message);
    throw error;
  }
};

export default {
  validateEnvironment,
  environmentInfo,
  secretsEndpoints,
  productionHardening,
  configurationDrift,
  auditEnvironmentSecurity,
  initializeEnvironmentSecurity
};
