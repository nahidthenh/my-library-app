import express from 'express';
import {
  getBooks,
  getBook,
  createBook,
  updateBook,
  deleteBook,
  updateBookStatus,
  searchBooks,
  advancedSearchBooks,
  getBooksByGenre,
  getReadingStats,
  getMonthlyReport
} from '../controllers/bookController.js';
import { protect } from '../middleware/authMiddleware.js';
import { searchLimiter, createLimiter } from '../middleware/rateLimitMiddleware.js';
import {
  validateBook,
  validateSearch,
  validateAdvancedSearch,
  validateId,
  sanitizeRequest
} from '../middleware/validationMiddleware.js';

const router = express.Router();

// All routes are protected and sanitized
router.use(protect);
router.use(sanitizeRequest);

// @desc    Get all books for user
// @route   GET /api/v1/books
// @access  Private
router.get('/', getBooks);

// @desc    Search books
// @route   GET /api/v1/books/search
// @access  Private
router.get('/search', searchLimiter, validateSearch, searchBooks);

// @desc    Advanced search books
// @route   POST /api/v1/books/search/advanced
// @access  Private
router.post('/search/advanced', searchLimiter, validateAdvancedSearch, advancedSearchBooks);

// @desc    Get books by genre
// @route   GET /api/v1/books/genres
// @access  Private
router.get('/genres', getBooksByGenre);

// @desc    Get reading statistics
// @route   GET /api/v1/books/stats
// @access  Private
router.get('/stats', getReadingStats);

// @desc    Get monthly reading report
// @route   GET /api/v1/books/stats/monthly
// @access  Private
router.get('/stats/monthly', getMonthlyReport);

// @desc    Get single book
// @route   GET /api/v1/books/:id
// @access  Private
router.get('/:id', validateId, getBook);

// @desc    Create new book
// @route   POST /api/v1/books
// @access  Private
router.post('/', createLimiter, validateBook, createBook);

// @desc    Update book
// @route   PUT /api/v1/books/:id
// @access  Private
router.put('/:id', validateId, validateBook, updateBook);

// @desc    Update book status
// @route   PATCH /api/v1/books/:id/status
// @access  Private
router.patch('/:id/status', validateId, updateBookStatus);

// @desc    Delete book
// @route   DELETE /api/v1/books/:id
// @access  Private
router.delete('/:id', validateId, deleteBook);

export default router;
