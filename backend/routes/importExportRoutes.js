import express from 'express';
import {
  exportBooksCSV,
  exportBooksJSON,
  importBooksCSV,
  importBooksJSON
} from '../controllers/importExportController.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadLimiter, bulkLimiter } from '../middleware/rateLimitMiddleware.js';
import { validateFileUpload, sanitizeRequest } from '../middleware/validationMiddleware.js';
import { uploadSecurityHeaders } from '../middleware/securityHeadersMiddleware.js';
import {
  secureUpload,
  processUploadedFile,
  cleanupTempFiles,
  uploadRateLimit
} from '../middleware/fileUploadSecurityMiddleware.js';

const router = express.Router();

// All routes are protected, secured, and sanitized
router.use(protect);
router.use(uploadSecurityHeaders);
router.use(sanitizeRequest);
router.use(cleanupTempFiles);
router.use(uploadRateLimit(10, 60 * 60 * 1000)); // 10 uploads per hour

// Export routes (bulk operations)
router.get('/books/csv', bulkLimiter, exportBooksCSV);
router.get('/books/json', bulkLimiter, exportBooksJSON);

// Import routes (secure file upload + bulk operations)
router.post('/books/csv', uploadLimiter, bulkLimiter, secureUpload.single('file'), processUploadedFile, importBooksCSV);
router.post('/books/json', uploadLimiter, bulkLimiter, secureUpload.single('file'), processUploadedFile, importBooksJSON);

export default router;
