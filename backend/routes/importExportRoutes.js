import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  exportBooksCSV,
  exportBooksJSON,
  importBooksCSV,
  importBooksJSON
} from '../controllers/importExportController.js';
import { protect } from '../middleware/authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../temp');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept CSV and JSON files
  if (file.mimetype === 'text/csv' || 
      file.mimetype === 'application/json' ||
      file.originalname.endsWith('.csv') ||
      file.originalname.endsWith('.json')) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV and JSON files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// All routes are protected
router.use(protect);

// Export routes
router.get('/books/csv', exportBooksCSV);
router.get('/books/json', exportBooksJSON);

// Import routes
router.post('/books/csv', upload.single('file'), importBooksCSV);
router.post('/books/json', upload.single('file'), importBooksJSON);

export default router;
