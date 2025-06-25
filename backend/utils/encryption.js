import crypto from 'crypto';
import { securityConfig } from '../config/security.js';

// Encryption configuration
const ALGORITHM = securityConfig.encryption.algorithm;
const KEY_DERIVATION = securityConfig.encryption.keyDerivation;
const ITERATIONS = securityConfig.encryption.iterations;
const SALT_LENGTH = securityConfig.encryption.saltLength;
const IV_LENGTH = securityConfig.encryption.ivLength;

// Get encryption key from environment or generate one
const getEncryptionKey = (password = process.env.ENCRYPTION_KEY) => {
  if (!password) {
    throw new Error('Encryption key not provided. Set ENCRYPTION_KEY environment variable.');
  }
  
  // Use a fixed salt for key derivation to ensure consistency
  const salt = crypto.createHash('sha256').update('library-tracker-salt').digest();
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');
};

// Encrypt sensitive data
export const encrypt = (text, password = null) => {
  try {
    if (!text) return text;
    
    const key = getEncryptionKey(password);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipher(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Combine IV, auth tag, and encrypted data
    const result = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    
    return result;
  } catch (error) {
    console.error('Encryption error:', error.message);
    throw new Error('Failed to encrypt data');
  }
};

// Decrypt sensitive data
export const decrypt = (encryptedText, password = null) => {
  try {
    if (!encryptedText || typeof encryptedText !== 'string') return encryptedText;
    
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const key = getEncryptionKey(password);
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipher(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error.message);
    throw new Error('Failed to decrypt data');
  }
};

// Hash sensitive data (one-way)
export const hash = (data, salt = null) => {
  try {
    const actualSalt = salt || crypto.randomBytes(SALT_LENGTH);
    const hash = crypto.pbkdf2Sync(data, actualSalt, ITERATIONS, 64, 'sha256');
    
    return {
      hash: hash.toString('hex'),
      salt: actualSalt.toString('hex')
    };
  } catch (error) {
    console.error('Hashing error:', error.message);
    throw new Error('Failed to hash data');
  }
};

// Verify hashed data
export const verifyHash = (data, hashedData, salt) => {
  try {
    const saltBuffer = Buffer.from(salt, 'hex');
    const hash = crypto.pbkdf2Sync(data, saltBuffer, ITERATIONS, 64, 'sha256');
    
    return hash.toString('hex') === hashedData;
  } catch (error) {
    console.error('Hash verification error:', error.message);
    return false;
  }
};

// Generate secure random tokens
export const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Generate secure random passwords
export const generateSecurePassword = (length = 16) => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  
  return password;
};

// Encrypt object fields
export const encryptObjectFields = (obj, fieldsToEncrypt = []) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const encrypted = { ...obj };
  
  fieldsToEncrypt.forEach(field => {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      encrypted[field] = encrypt(encrypted[field]);
    }
  });
  
  return encrypted;
};

// Decrypt object fields
export const decryptObjectFields = (obj, fieldsToDecrypt = []) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const decrypted = { ...obj };
  
  fieldsToDecrypt.forEach(field => {
    if (decrypted[field] && typeof decrypted[field] === 'string') {
      try {
        decrypted[field] = decrypt(decrypted[field]);
      } catch (error) {
        console.warn(`Failed to decrypt field ${field}:`, error.message);
        // Keep original value if decryption fails
      }
    }
  });
  
  return decrypted;
};

// Secure data comparison (constant time)
export const secureCompare = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  
  if (a.length !== b.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

// Generate HMAC signature
export const generateHMAC = (data, secret = process.env.HMAC_SECRET) => {
  if (!secret) {
    throw new Error('HMAC secret not provided');
  }
  
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
};

// Verify HMAC signature
export const verifyHMAC = (data, signature, secret = process.env.HMAC_SECRET) => {
  if (!secret) {
    throw new Error('HMAC secret not provided');
  }
  
  const expectedSignature = generateHMAC(data, secret);
  return secureCompare(signature, expectedSignature);
};

// Encrypt file content
export const encryptFile = async (filePath, outputPath = null) => {
  const fs = await import('fs/promises');
  
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const encrypted = encrypt(content);
    
    const output = outputPath || `${filePath}.encrypted`;
    await fs.writeFile(output, encrypted);
    
    return output;
  } catch (error) {
    console.error('File encryption error:', error.message);
    throw new Error('Failed to encrypt file');
  }
};

// Decrypt file content
export const decryptFile = async (filePath, outputPath = null) => {
  const fs = await import('fs/promises');
  
  try {
    const encryptedContent = await fs.readFile(filePath, 'utf8');
    const decrypted = decrypt(encryptedContent);
    
    const output = outputPath || filePath.replace('.encrypted', '');
    await fs.writeFile(output, decrypted);
    
    return output;
  } catch (error) {
    console.error('File decryption error:', error.message);
    throw new Error('Failed to decrypt file');
  }
};

// Key rotation utility
export const rotateEncryptionKey = async (oldKey, newKey) => {
  // This would be used to re-encrypt data with a new key
  // Implementation depends on specific use case
  console.log('Key rotation initiated - implement based on data storage strategy');
};

// Data masking for logging
export const maskSensitiveData = (data, fieldsToMask = ['password', 'token', 'secret', 'key']) => {
  if (typeof data === 'string') {
    return data.replace(/./g, '*');
  }
  
  if (typeof data === 'object' && data !== null) {
    const masked = { ...data };
    
    fieldsToMask.forEach(field => {
      if (masked[field]) {
        if (typeof masked[field] === 'string') {
          masked[field] = '*'.repeat(masked[field].length);
        } else {
          masked[field] = '[MASKED]';
        }
      }
    });
    
    return masked;
  }
  
  return data;
};

// Validate encryption configuration
export const validateEncryptionConfig = () => {
  const errors = [];
  
  if (!process.env.ENCRYPTION_KEY) {
    errors.push('ENCRYPTION_KEY environment variable is required');
  }
  
  if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length < 32) {
    errors.push('ENCRYPTION_KEY must be at least 32 characters long');
  }
  
  if (errors.length > 0) {
    console.error('❌ Encryption Configuration Errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    throw new Error('Invalid encryption configuration');
  }
  
  console.log('✅ Encryption configuration validated');
};

export default {
  encrypt,
  decrypt,
  hash,
  verifyHash,
  generateSecureToken,
  generateSecurePassword,
  encryptObjectFields,
  decryptObjectFields,
  secureCompare,
  generateHMAC,
  verifyHMAC,
  encryptFile,
  decryptFile,
  maskSensitiveData,
  validateEncryptionConfig
};
