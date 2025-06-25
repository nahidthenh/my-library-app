import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { AppError } from './errorMiddleware.js';
import { securityConfig } from '../config/security.js';

// File upload security configuration
const uploadConfig = securityConfig.fileUpload;

// Allowed MIME types and extensions
const ALLOWED_MIME_TYPES = {
  'text/csv': ['.csv'],
  'application/json': ['.json'],
  'text/plain': ['.txt'],
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp']
};

// Dangerous file extensions to block
const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
  '.app', '.deb', '.pkg', '.dmg', '.rpm', '.msi', '.dll', '.so', '.dylib',
  '.php', '.asp', '.aspx', '.jsp', '.py', '.rb', '.pl', '.sh', '.ps1'
];

// Magic number signatures for file type validation
const FILE_SIGNATURES = {
  'text/csv': [],
  'application/json': [],
  'text/plain': [],
  'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  'image/gif': [0x47, 0x49, 0x46, 0x38],
  'image/webp': [0x52, 0x49, 0x46, 0x46]
};

// Create secure upload directories
const createUploadDirectories = async () => {
  const directories = [
    './uploads',
    './uploads/temp',
    './uploads/processed',
    './uploads/quarantine'
  ];
  
  for (const dir of directories) {
    try {
      await fs.mkdir(dir, { recursive: true, mode: 0o755 });
    } catch (error) {
      console.error(`Failed to create directory ${dir}:`, error.message);
    }
  }
};

// Secure file storage configuration
const secureStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await createUploadDirectories();
    cb(null, './uploads/temp');
  },
  filename: (req, file, cb) => {
    // Generate secure filename
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(16).toString('hex');
    const sanitizedName = sanitizeFilename(file.originalname);
    const extension = path.extname(sanitizedName).toLowerCase();
    
    const secureFilename = `${timestamp}-${randomBytes}${extension}`;
    cb(null, secureFilename);
  }
});

// Sanitize filename
const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .substring(0, 100); // Limit length
};

// File filter for security validation
const secureFileFilter = async (req, file, cb) => {
  try {
    // Check file extension
    const extension = path.extname(file.originalname).toLowerCase();
    
    if (DANGEROUS_EXTENSIONS.includes(extension)) {
      return cb(new AppError(`Dangerous file type: ${extension}`, 400), false);
    }
    
    // Check MIME type
    if (!ALLOWED_MIME_TYPES[file.mimetype]) {
      return cb(new AppError(`File type not allowed: ${file.mimetype}`, 400), false);
    }
    
    // Check if extension matches MIME type
    const allowedExtensions = ALLOWED_MIME_TYPES[file.mimetype];
    if (!allowedExtensions.includes(extension)) {
      return cb(new AppError(`File extension ${extension} doesn't match MIME type ${file.mimetype}`, 400), false);
    }
    
    // Log upload attempt
    console.log('📁 File upload attempt:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      ip: req.ip,
      user: req.user?._id,
      timestamp: new Date().toISOString()
    });
    
    cb(null, true);
  } catch (error) {
    cb(new AppError('File validation failed', 400), false);
  }
};

// Parse file size limit
const parseFileSize = (sizeStr) => {
  const units = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)$/i);
  
  if (!match) return 10 * 1024 * 1024; // Default 10MB
  
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  
  return value * units[unit];
};

// Create secure multer instance
export const secureUpload = multer({
  storage: secureStorage,
  fileFilter: secureFileFilter,
  limits: {
    fileSize: parseFileSize(uploadConfig.maxSize),
    files: 5, // Max 5 files per request
    fields: 10, // Max 10 form fields
    fieldNameSize: 100, // Max field name length
    fieldSize: 1024 * 1024 // Max field value size (1MB)
  }
});

// File content validation
export const validateFileContent = async (filePath, expectedMimeType) => {
  try {
    const buffer = await fs.readFile(filePath);
    
    // Check file signature (magic numbers)
    const signature = FILE_SIGNATURES[expectedMimeType];
    if (signature && signature.length > 0) {
      const fileHeader = Array.from(buffer.slice(0, signature.length));
      
      if (!arraysEqual(fileHeader, signature)) {
        throw new AppError('File content doesn\'t match declared type', 400);
      }
    }
    
    // Additional content validation based on file type
    if (expectedMimeType === 'application/json') {
      try {
        JSON.parse(buffer.toString());
      } catch (error) {
        throw new AppError('Invalid JSON file content', 400);
      }
    }
    
    if (expectedMimeType === 'text/csv') {
      const content = buffer.toString();
      if (!content.includes(',') && !content.includes('\t')) {
        throw new AppError('Invalid CSV file content', 400);
      }
    }
    
    return true;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('File content validation failed', 400);
  }
};

// Virus scanning simulation (integrate with real antivirus in production)
export const scanForViruses = async (filePath) => {
  if (!uploadConfig.virusScanning) {
    return { clean: true, message: 'Virus scanning disabled' };
  }
  
  try {
    // Simulate virus scanning delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check for suspicious patterns in filename
    const filename = path.basename(filePath);
    const suspiciousPatterns = [
      /virus/i, /malware/i, /trojan/i, /worm/i, /backdoor/i,
      /keylogger/i, /rootkit/i, /spyware/i, /adware/i
    ];
    
    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(filename));
    
    if (isSuspicious) {
      // Move to quarantine
      const quarantinePath = path.join(uploadConfig.quarantinePath, path.basename(filePath));
      await fs.rename(filePath, quarantinePath);
      
      console.warn('🦠 Suspicious file quarantined:', {
        originalPath: filePath,
        quarantinePath,
        timestamp: new Date().toISOString()
      });
      
      return { clean: false, message: 'File quarantined due to suspicious content' };
    }
    
    return { clean: true, message: 'File is clean' };
  } catch (error) {
    console.error('Virus scanning error:', error.message);
    return { clean: false, message: 'Virus scanning failed' };
  }
};

// Secure file processing middleware
export const processUploadedFile = async (req, res, next) => {
  if (!req.file) {
    return next();
  }
  
  try {
    const filePath = req.file.path;
    const mimeType = req.file.mimetype;
    
    // Validate file content
    await validateFileContent(filePath, mimeType);
    
    // Scan for viruses
    const scanResult = await scanForViruses(filePath);
    
    if (!scanResult.clean) {
      // Remove the file if not clean
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        console.error('Failed to remove infected file:', unlinkError.message);
      }
      
      throw new AppError(scanResult.message, 400);
    }
    
    // Move to processed directory
    const processedPath = path.join('./uploads/processed', path.basename(filePath));
    await fs.rename(filePath, processedPath);
    
    // Update file path in request
    req.file.path = processedPath;
    req.file.secure = true;
    
    console.log('✅ File processed successfully:', {
      originalname: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      processedPath,
      timestamp: new Date().toISOString()
    });
    
    next();
  } catch (error) {
    // Clean up file on error
    try {
      await fs.unlink(req.file.path);
    } catch (unlinkError) {
      console.error('Failed to clean up file:', unlinkError.message);
    }
    
    next(error);
  }
};

// File cleanup middleware
export const cleanupTempFiles = async (req, res, next) => {
  // Clean up temp files older than 1 hour
  try {
    const tempDir = './uploads/temp';
    const files = await fs.readdir(tempDir);
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.mtime.getTime() < oneHourAgo) {
        await fs.unlink(filePath);
        console.log('🧹 Cleaned up temp file:', filePath);
      }
    }
  } catch (error) {
    console.error('Temp file cleanup error:', error.message);
  }
  
  next();
};

// File upload rate limiting
export const uploadRateLimit = (maxUploads = 10, windowMs = 60 * 60 * 1000) => {
  const uploadCounts = new Map();
  
  return (req, res, next) => {
    const clientId = req.ip + (req.user?._id || '');
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get upload history for this client
    const uploads = uploadCounts.get(clientId) || [];
    
    // Remove old uploads outside the window
    const recentUploads = uploads.filter(timestamp => timestamp > windowStart);
    
    if (recentUploads.length >= maxUploads) {
      throw new AppError('Upload rate limit exceeded', 429);
    }
    
    // Add current upload
    recentUploads.push(now);
    uploadCounts.set(clientId, recentUploads);
    
    next();
  };
};

// Helper function to compare arrays
const arraysEqual = (a, b) => {
  return a.length === b.length && a.every((val, index) => val === b[index]);
};

// File upload security audit
export const auditFileUploads = async () => {
  try {
    const directories = ['./uploads/temp', './uploads/processed', './uploads/quarantine'];
    const audit = {
      timestamp: new Date().toISOString(),
      directories: {}
    };
    
    for (const dir of directories) {
      try {
        const files = await fs.readdir(dir);
        const stats = await Promise.all(
          files.map(async (file) => {
            const filePath = path.join(dir, file);
            const stat = await fs.stat(filePath);
            return {
              name: file,
              size: stat.size,
              created: stat.birthtime,
              modified: stat.mtime
            };
          })
        );
        
        audit.directories[dir] = {
          fileCount: files.length,
          totalSize: stats.reduce((sum, file) => sum + file.size, 0),
          files: stats
        };
      } catch (error) {
        audit.directories[dir] = { error: error.message };
      }
    }
    
    console.log('📁 File Upload Audit:', audit);
    return audit;
  } catch (error) {
    console.error('File upload audit failed:', error.message);
    throw error;
  }
};

// Initialize file upload security
export const initializeFileUploadSecurity = async () => {
  await createUploadDirectories();
  
  // Schedule cleanup of temp files
  setInterval(async () => {
    try {
      const tempDir = './uploads/temp';
      const files = await fs.readdir(tempDir);
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < oneHourAgo) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      console.error('Scheduled cleanup error:', error.message);
    }
  }, 30 * 60 * 1000); // Every 30 minutes
  
  console.log('📁 File upload security initialized');
};

export default {
  secureUpload,
  validateFileContent,
  scanForViruses,
  processUploadedFile,
  cleanupTempFiles,
  uploadRateLimit,
  auditFileUploads,
  initializeFileUploadSecurity
};
