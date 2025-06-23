import express from 'express';
import {
  getBooks,
  getBook,
  createBook,
  updateBook,
  deleteBook,
  updateBookStatus,
  searchBooks,
  getBooksByGenre
} from '../controllers/bookController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// @desc    Get all books for user
// @route   GET /api/v1/books
// @access  Private
router.get('/', getBooks);

// @desc    Search books
// @route   GET /api/v1/books/search
// @access  Private
router.get('/search', searchBooks);

// @desc    Get books by genre
// @route   GET /api/v1/books/genres
// @access  Private
router.get('/genres', getBooksByGenre);

// @desc    Get single book
// @route   GET /api/v1/books/:id
// @access  Private
router.get('/:id', getBook);

// @desc    Create new book
// @route   POST /api/v1/books
// @access  Private
router.post('/', createBook);

// @desc    Update book
// @route   PUT /api/v1/books/:id
// @access  Private
router.put('/:id', updateBook);

// @desc    Update book status
// @route   PATCH /api/v1/books/:id/status
// @access  Private
router.patch('/:id/status', updateBookStatus);

// @desc    Delete book
// @route   DELETE /api/v1/books/:id
// @access  Private
router.delete('/:id', deleteBook);

export default router;
