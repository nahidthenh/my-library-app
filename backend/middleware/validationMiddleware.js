import { body, param, query, validationResult } from 'express-validator';
import { AppError } from './errorMiddleware.js';
import validator from 'validator';

// Helper function to handle validation results
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        type: 'VALIDATION_ERROR',
        details: errorMessages
      },
      timestamp: new Date().toISOString()
    });
  }

  next();
};

// Sanitization helpers
export const sanitizeInput = {
  // Remove HTML tags and dangerous characters
  html: (value) => {
    if (typeof value !== 'string') return value;
    // Simple HTML tag removal and entity escaping
    return value
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  },

  // Escape SQL injection characters
  sql: (value) => {
    if (typeof value !== 'string') return value;
    return value.replace(/['";\\]/g, '\\$&');
  },

  // Remove NoSQL injection patterns
  nosql: (value) => {
    if (typeof value === 'object' && value !== null) {
      // Convert objects to strings to prevent NoSQL injection
      return JSON.stringify(value);
    }
    if (typeof value !== 'string') return value;
    return value.replace(/[${}]/g, '');
  },

  // Normalize whitespace
  whitespace: (value) => {
    if (typeof value !== 'string') return value;
    return value.trim().replace(/\s+/g, ' ');
  },

  // Remove control characters
  controlChars: (value) => {
    if (typeof value !== 'string') return value;
    return value.replace(/[\x00-\x1F\x7F]/g, '');
  }
};

// Custom sanitization middleware
export const sanitizeRequest = (req, res, next) => {
  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeInput.html(
          sanitizeInput.nosql(
            sanitizeInput.controlChars(
              sanitizeInput.whitespace(value)
            )
          )
        );
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize URL parameters
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

// Book validation rules
export const validateBook = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters')
    .matches(/^[a-zA-Z0-9\s\-.,!?'"():&]+$/)
    .withMessage('Title contains invalid characters'),

  body('author')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Author must be between 1 and 100 characters')
    .matches(/^[a-zA-Z\s\-.,]+$/)
    .withMessage('Author name contains invalid characters'),

  body('isbn')
    .optional()
    .custom((value) => {
      if (value && !validator.isISBN(value)) {
        throw new Error('Invalid ISBN format');
      }
      return true;
    }),

  body('publicationDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid publication date format')
    .custom((value) => {
      if (value && new Date(value) > new Date()) {
        throw new Error('Publication date cannot be in the future');
      }
      return true;
    }),

  body('genre')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Genre cannot exceed 50 characters')
    .matches(/^[a-zA-Z\s\-&]+$/)
    .withMessage('Genre contains invalid characters'),

  body('coverImage')
    .optional()
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('Cover image must be a valid URL'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),

  body('status')
    .optional()
    .isIn(['not_started', 'in_progress', 'completed'])
    .withMessage('Invalid status value'),

  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Notes cannot exceed 2000 characters'),

  body('pageCount')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page count must be a positive integer'),

  body('currentPage')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Current page must be a non-negative integer'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
    .custom((tags) => {
      if (tags && tags.length > 10) {
        throw new Error('Maximum 10 tags allowed');
      }
      if (tags && tags.some(tag => typeof tag !== 'string' || tag.length > 30)) {
        throw new Error('Each tag must be a string with maximum 30 characters');
      }
      return true;
    }),

  handleValidationErrors
];

// User validation rules
export const validateUser = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z\s\-.']+$/)
    .withMessage('Name contains invalid characters'),

  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),

  body('preferences.theme')
    .optional()
    .isIn(['light', 'dark', 'auto'])
    .withMessage('Invalid theme preference'),

  body('preferences.language')
    .optional()
    .isLength({ min: 2, max: 5 })
    .withMessage('Invalid language code'),

  body('readingGoal.annual')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Annual reading goal must be between 1 and 1000'),

  body('readingGoal.monthly')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Monthly reading goal must be between 1 and 100'),

  handleValidationErrors
];

// Authentication validation rules
export const validateAuth = [
  body('idToken')
    .notEmpty()
    .withMessage('ID token is required')
    .isLength({ min: 10 })
    .withMessage('Invalid token format'),

  handleValidationErrors
];

// Search validation rules
export const validateSearch = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-.,!?'"():&]+$/)
    .withMessage('Search query contains invalid characters'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('sortBy')
    .optional()
    .isIn(['title', 'author', 'createdAt', 'updatedAt', 'rating'])
    .withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),

  handleValidationErrors
];

// File upload validation
export const validateFileUpload = [
  body('fileType')
    .optional()
    .isIn(['csv', 'json'])
    .withMessage('File type must be csv or json'),

  handleValidationErrors
];

// ID parameter validation
export const validateId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),

  handleValidationErrors
];

// Advanced search validation
export const validateAdvancedSearch = [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title search term too long'),

  body('author')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Author search term too long'),

  body('genre')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Genre search term too long'),

  body('status')
    .optional()
    .isIn(['not_started', 'in_progress', 'completed'])
    .withMessage('Invalid status filter'),

  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),

  body('dateRange.start')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),

  body('dateRange.end')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),

  handleValidationErrors
];

export default {
  sanitizeRequest,
  validateBook,
  validateUser,
  validateAuth,
  validateSearch,
  validateFileUpload,
  validateId,
  validateAdvancedSearch,
  handleValidationErrors
};
