import { asyncHandler, AppError } from '../middleware/errorMiddleware.js';
import Book from '../models/Book.js';
import User from '../models/User.js';

// @desc    Get all books for user
// @route   GET /api/v1/books
// @access  Private
const getBooks = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    genre,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const query = { userId: req.user._id };

  // Add filters
  if (status && status !== 'all') {
    query.status = status;
  }

  if (genre && genre !== 'all') {
    query.genre = new RegExp(genre, 'i');
  }

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Execute query with pagination
  const books = await Book.find(query)
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();

  // Get total count for pagination
  const total = await Book.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      books,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalBooks: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    }
  });
});

// @desc    Get single book
// @route   GET /api/v1/books/:id
// @access  Private
const getBook = asyncHandler(async (req, res) => {
  const book = await Book.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!book) {
    throw new AppError('Book not found', 404);
  }

  res.status(200).json({
    success: true,
    data: { book }
  });
});

// @desc    Create new book
// @route   POST /api/v1/books
// @access  Private
const createBook = asyncHandler(async (req, res) => {
  const bookData = {
    ...req.body,
    userId: req.user._id
  };

  const book = await Book.create(bookData);

  res.status(201).json({
    success: true,
    data: { book },
    message: 'Book added successfully'
  });
});

// @desc    Update book
// @route   PUT /api/v1/books/:id
// @access  Private
const updateBook = asyncHandler(async (req, res) => {
  let book = await Book.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!book) {
    throw new AppError('Book not found', 404);
  }

  book = await Book.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    success: true,
    data: { book },
    message: 'Book updated successfully'
  });
});

// @desc    Update book status
// @route   PATCH /api/v1/books/:id/status
// @access  Private
const updateBookStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!status || !['not_started', 'in_progress', 'completed'].includes(status)) {
    throw new AppError('Invalid status. Must be: not_started, in_progress, or completed', 400);
  }

  let book = await Book.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!book) {
    throw new AppError('Book not found', 404);
  }

  const oldStatus = book.status;
  book.status = status;

  // The pre-save middleware will handle date updates
  await book.save();

  // Update user's reading goal progress if book was completed
  if (status === 'completed' && oldStatus !== 'completed') {
    const user = await User.findById(req.user._id);
    if (user) {
      await user.updateReadingProgress(1);
    }
  } else if (oldStatus === 'completed' && status !== 'completed') {
    // Decrease progress if book was uncompleted
    const user = await User.findById(req.user._id);
    if (user && user.readingGoal.current > 0) {
      await user.updateReadingProgress(-1);
    }
  }

  res.status(200).json({
    success: true,
    data: { book },
    message: `Book status updated to ${status.replace('_', ' ')}`
  });
});

// @desc    Delete book
// @route   DELETE /api/v1/books/:id
// @access  Private
const deleteBook = asyncHandler(async (req, res) => {
  const book = await Book.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!book) {
    throw new AppError('Book not found', 404);
  }

  // Update user's reading goal if completed book is deleted
  if (book.status === 'completed') {
    const user = await User.findById(req.user._id);
    if (user && user.readingGoal.current > 0) {
      await user.updateReadingProgress(-1);
    }
  }

  await Book.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Book deleted successfully'
  });
});

// @desc    Search books
// @route   GET /api/v1/books/search
// @access  Private
const searchBooks = asyncHandler(async (req, res) => {
  const { q, page = 1, limit = 20 } = req.query;

  if (!q) {
    throw new AppError('Search query is required', 400);
  }

  const query = {
    userId: req.user._id,
    $or: [
      { title: { $regex: q, $options: 'i' } },
      { author: { $regex: q, $options: 'i' } },
      { genre: { $regex: q, $options: 'i' } },
      { tags: { $in: [new RegExp(q, 'i')] } }
    ]
  };

  const books = await Book.find(query)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();

  const total = await Book.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      books,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalBooks: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      },
      searchQuery: q
    }
  });
});

// @desc    Get books by genre
// @route   GET /api/v1/books/genres
// @access  Private
const getBooksByGenre = asyncHandler(async (req, res) => {
  const genreStats = await Book.getBooksByGenre(req.user._id);

  res.status(200).json({
    success: true,
    data: { genres: genreStats }
  });
});

export {
  getBooks,
  getBook,
  createBook,
  updateBook,
  deleteBook,
  updateBookStatus,
  searchBooks,
  getBooksByGenre
};
