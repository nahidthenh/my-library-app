import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { encrypt, decrypt, generateSecureToken } from './encryption.js';

// Secrets management utility
class SecretsManager {
  constructor() {
    this.secrets = new Map();
    this.encryptionKey = process.env.SECRETS_ENCRYPTION_KEY;
    this.secretsFile = process.env.SECRETS_FILE || './config/secrets.encrypted';
    this.initialized = false;
  }

  // Initialize secrets manager
  async initialize() {
    if (this.initialized) return;

    try {
      // Generate encryption key if not provided
      if (!this.encryptionKey) {
        this.encryptionKey = generateSecureToken(32);
        console.warn('⚠️ Generated temporary encryption key. Set SECRETS_ENCRYPTION_KEY for persistence.');
      }

      // Load existing secrets
      await this.loadSecrets();
      this.initialized = true;
      console.log('🔐 Secrets manager initialized');
    } catch (error) {
      console.error('❌ Failed to initialize secrets manager:', error.message);
      throw error;
    }
  }

  // Store a secret
  async setSecret(key, value, metadata = {}) {
    await this.initialize();

    const secretData = {
      value: encrypt(value, this.encryptionKey),
      metadata: {
        ...metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
      }
    };

    this.secrets.set(key, secretData);
    await this.saveSecrets();
    
    console.log(`🔐 Secret stored: ${key}`);
  }

  // Retrieve a secret
  async getSecret(key) {
    await this.initialize();

    const secretData = this.secrets.get(key);
    if (!secretData) {
      throw new Error(`Secret not found: ${key}`);
    }

    try {
      const decryptedValue = decrypt(secretData.value, this.encryptionKey);
      
      // Update last accessed time
      secretData.metadata.lastAccessed = new Date().toISOString();
      this.secrets.set(key, secretData);
      
      return decryptedValue;
    } catch (error) {
      console.error(`❌ Failed to decrypt secret: ${key}`);
      throw new Error('Failed to decrypt secret');
    }
  }

  // Check if secret exists
  hasSecret(key) {
    return this.secrets.has(key);
  }

  // Delete a secret
  async deleteSecret(key) {
    await this.initialize();

    if (!this.secrets.has(key)) {
      throw new Error(`Secret not found: ${key}`);
    }

    this.secrets.delete(key);
    await this.saveSecrets();
    
    console.log(`🗑️ Secret deleted: ${key}`);
  }

  // List all secret keys (without values)
  listSecrets() {
    return Array.from(this.secrets.keys()).map(key => ({
      key,
      metadata: this.secrets.get(key).metadata
    }));
  }

  // Rotate encryption key
  async rotateEncryptionKey(newKey) {
    await this.initialize();

    const oldKey = this.encryptionKey;
    const rotatedSecrets = new Map();

    // Re-encrypt all secrets with new key
    for (const [key, secretData] of this.secrets.entries()) {
      try {
        const decryptedValue = decrypt(secretData.value, oldKey);
        const reencryptedValue = encrypt(decryptedValue, newKey);
        
        rotatedSecrets.set(key, {
          ...secretData,
          value: reencryptedValue,
          metadata: {
            ...secretData.metadata,
            keyRotatedAt: new Date().toISOString(),
            version: (secretData.metadata.version || 1) + 1
          }
        });
      } catch (error) {
        console.error(`❌ Failed to rotate key for secret: ${key}`);
        throw error;
      }
    }

    this.secrets = rotatedSecrets;
    this.encryptionKey = newKey;
    await this.saveSecrets();
    
    console.log('🔄 Encryption key rotated successfully');
  }

  // Load secrets from file
  async loadSecrets() {
    try {
      const encryptedData = await fs.readFile(this.secretsFile, 'utf8');
      const decryptedData = decrypt(encryptedData, this.encryptionKey);
      const secretsData = JSON.parse(decryptedData);
      
      this.secrets = new Map(Object.entries(secretsData));
      console.log(`📂 Loaded ${this.secrets.size} secrets from file`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('📂 No existing secrets file found, starting fresh');
        this.secrets = new Map();
      } else {
        console.error('❌ Failed to load secrets:', error.message);
        throw error;
      }
    }
  }

  // Save secrets to file
  async saveSecrets() {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.secretsFile);
      await fs.mkdir(dir, { recursive: true });

      const secretsData = Object.fromEntries(this.secrets);
      const jsonData = JSON.stringify(secretsData, null, 2);
      const encryptedData = encrypt(jsonData, this.encryptionKey);
      
      await fs.writeFile(this.secretsFile, encryptedData, { mode: 0o600 });
      console.log('💾 Secrets saved to file');
    } catch (error) {
      console.error('❌ Failed to save secrets:', error.message);
      throw error;
    }
  }

  // Backup secrets
  async backupSecrets(backupPath) {
    await this.initialize();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = backupPath || `./backups/secrets-backup-${timestamp}.encrypted`;
    
    try {
      // Ensure backup directory exists
      const dir = path.dirname(backupFile);
      await fs.mkdir(dir, { recursive: true });

      const secretsData = Object.fromEntries(this.secrets);
      const jsonData = JSON.stringify(secretsData, null, 2);
      const encryptedData = encrypt(jsonData, this.encryptionKey);
      
      await fs.writeFile(backupFile, encryptedData, { mode: 0o600 });
      console.log(`💾 Secrets backed up to: ${backupFile}`);
      
      return backupFile;
    } catch (error) {
      console.error('❌ Failed to backup secrets:', error.message);
      throw error;
    }
  }

  // Restore secrets from backup
  async restoreSecrets(backupPath) {
    try {
      const encryptedData = await fs.readFile(backupPath, 'utf8');
      const decryptedData = decrypt(encryptedData, this.encryptionKey);
      const secretsData = JSON.parse(decryptedData);
      
      this.secrets = new Map(Object.entries(secretsData));
      await this.saveSecrets();
      
      console.log(`📂 Secrets restored from: ${backupPath}`);
    } catch (error) {
      console.error('❌ Failed to restore secrets:', error.message);
      throw error;
    }
  }

  // Audit secrets usage
  auditSecrets() {
    const audit = {
      timestamp: new Date().toISOString(),
      totalSecrets: this.secrets.size,
      secrets: []
    };

    for (const [key, secretData] of this.secrets.entries()) {
      audit.secrets.push({
        key,
        createdAt: secretData.metadata.createdAt,
        updatedAt: secretData.metadata.updatedAt,
        lastAccessed: secretData.metadata.lastAccessed,
        version: secretData.metadata.version,
        hasExpiry: !!secretData.metadata.expiresAt,
        isExpired: secretData.metadata.expiresAt ? 
          new Date(secretData.metadata.expiresAt) < new Date() : false
      });
    }

    return audit;
  }

  // Clean up expired secrets
  async cleanupExpiredSecrets() {
    await this.initialize();

    const now = new Date();
    const expiredKeys = [];

    for (const [key, secretData] of this.secrets.entries()) {
      if (secretData.metadata.expiresAt && 
          new Date(secretData.metadata.expiresAt) < now) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.secrets.delete(key);
      console.log(`🗑️ Expired secret removed: ${key}`);
    }

    if (expiredKeys.length > 0) {
      await this.saveSecrets();
    }

    return expiredKeys;
  }
}

// Environment security utilities
export const environmentSecurity = {
  // Validate environment configuration
  validateEnvironment: () => {
    const errors = [];
    const warnings = [];

    // Check required environment variables
    const requiredVars = [
      'NODE_ENV',
      'JWT_SECRET',
      'MONGODB_URI',
      'FIREBASE_PROJECT_ID'
    ];

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        errors.push(`Missing required environment variable: ${varName}`);
      }
    }

    // Check sensitive variables
    const sensitiveVars = ['JWT_SECRET', 'ENCRYPTION_KEY', 'MONGODB_URI'];
    for (const varName of sensitiveVars) {
      const value = process.env[varName];
      if (value && value.length < 32) {
        warnings.push(`${varName} should be at least 32 characters long`);
      }
    }

    // Production-specific checks
    if (process.env.NODE_ENV === 'production') {
      if (process.env.MONGODB_URI?.includes('localhost')) {
        errors.push('Production should not use localhost database');
      }

      if (!process.env.CORS_ORIGIN || process.env.CORS_ORIGIN.includes('localhost')) {
        warnings.push('Production CORS origin should not include localhost');
      }
    }

    return { errors, warnings };
  },

  // Mask sensitive environment variables for logging
  maskEnvironment: () => {
    const masked = {};
    const sensitivePatterns = [
      /password/i, /secret/i, /key/i, /token/i, /uri/i, /url/i
    ];

    for (const [key, value] of Object.entries(process.env)) {
      const isSensitive = sensitivePatterns.some(pattern => pattern.test(key));
      
      if (isSensitive && value) {
        masked[key] = value.length > 8 ? 
          value.substring(0, 4) + '*'.repeat(value.length - 8) + value.substring(value.length - 4) :
          '*'.repeat(value.length);
      } else {
        masked[key] = value;
      }
    }

    return masked;
  },

  // Generate secure environment template
  generateEnvTemplate: () => {
    const template = `# Environment Configuration Template
# Generated on ${new Date().toISOString()}

# Application
NODE_ENV=development
PORT=5000
API_VERSION=v1

# Database
MONGODB_URI=mongodb://localhost:27017/library-tracker

# Authentication & Security
JWT_SECRET=${generateSecureToken(64)}
JWT_ACCESS_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d
ENCRYPTION_KEY=${generateSecureToken(64)}
SECRETS_ENCRYPTION_KEY=${generateSecureToken(64)}

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nYOUR_PRIVATE_KEY\\n-----END PRIVATE KEY-----\\n"
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ENABLE_RATE_LIMITING=true

# Security Configuration
TRUSTED_IPS=127.0.0.1,::1
ENABLE_SECURITY_LOGGING=true
ENABLE_REQUEST_LOGGING=true

# File Upload
MAX_UPLOAD_SIZE=10MB
ENABLE_VIRUS_SCANNING=false

# Monitoring
LOG_LEVEL=info
ENABLE_ERROR_LOGGING=true
`;

    return template;
  }
};

// Create singleton instance
const secretsManager = new SecretsManager();

export { secretsManager, SecretsManager };
export default secretsManager;
