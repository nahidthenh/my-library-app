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

// @desc    Get reading statistics
// @route   GET /api/v1/books/stats
// @access  Private
const getReadingStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Get basic reading statistics
  const basicStats = await Book.getUserReadingStats(userId);

  // Get reading activity by month (last 12 months)
  const readingActivity = await Book.aggregate([
    {
      $match: {
        userId: userId,
        status: 'completed',
        dateCompleted: { $exists: true }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$dateCompleted' },
          month: { $month: '$dateCompleted' }
        },
        count: { $sum: 1 },
        pages: { $sum: { $ifNull: ['$pageCount', 0] } },
        books: {
          $push: {
            title: '$title',
            author: '$author',
            dateCompleted: '$dateCompleted',
            pageCount: '$pageCount',
            rating: '$rating'
          }
        }
      }
    },
    {
      $sort: { '_id.year': -1, '_id.month': -1 }
    },
    {
      $limit: 12
    }
  ]);

  // Get genre distribution
  const genreStats = await Book.getBooksByGenre(userId);

  // Get reading pace (average days to complete a book)
  const readingPace = await Book.aggregate([
    {
      $match: {
        userId: userId,
        status: 'completed',
        dateStarted: { $exists: true },
        dateCompleted: { $exists: true }
      }
    },
    {
      $project: {
        daysToComplete: {
          $divide: [
            { $subtract: ['$dateCompleted', '$dateStarted'] },
            1000 * 60 * 60 * 24 // Convert milliseconds to days
          ]
        }
      }
    },
    {
      $group: {
        _id: null,
        averageDays: { $avg: '$daysToComplete' },
        totalBooks: { $sum: 1 }
      }
    }
  ]);

  // Get current year progress
  const currentYear = new Date().getFullYear();
  const yearlyProgress = await Book.countDocuments({
    userId: userId,
    status: 'completed',
    dateCompleted: {
      $gte: new Date(currentYear, 0, 1),
      $lt: new Date(currentYear + 1, 0, 1)
    }
  });

  // Get reading streaks (consecutive days with reading activity)
  const readingStreaks = await Book.aggregate([
    {
      $match: {
        userId: userId,
        status: 'completed',
        dateCompleted: { $exists: true }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$dateCompleted' }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id': -1 }
    },
    {
      $limit: 30 // Last 30 days
    }
  ]);

  res.status(200).json({
    success: true,
    data: {
      basicStats,
      readingActivity,
      genreStats,
      readingPace: readingPace[0] || { averageDays: 0, totalBooks: 0 },
      yearlyProgress,
      readingStreaks
    }
  });
});

// @desc    Get monthly reading report
// @route   GET /api/v1/books/stats/monthly
// @access  Private
const getMonthlyReport = asyncHandler(async (req, res) => {
  const { year, month } = req.query;
  const userId = req.user._id;

  // Default to current month if not specified
  const targetYear = year ? parseInt(year) : new Date().getFullYear();
  const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;

  const startDate = new Date(targetYear, targetMonth - 1, 1);
  const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

  // Books completed this month
  const completedBooks = await Book.find({
    userId: userId,
    status: 'completed',
    dateCompleted: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ dateCompleted: -1 });

  // Books started this month
  const startedBooks = await Book.find({
    userId: userId,
    dateStarted: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ dateStarted: -1 });

  // Calculate statistics
  const totalPages = completedBooks.reduce((sum, book) => sum + (book.pageCount || 0), 0);
  const averageRating = completedBooks.length > 0
    ? completedBooks.filter(book => book.rating).reduce((sum, book) => sum + book.rating, 0) / completedBooks.filter(book => book.rating).length
    : 0;

  res.status(200).json({
    success: true,
    data: {
      month: targetMonth,
      year: targetYear,
      completedBooks,
      startedBooks,
      statistics: {
        booksCompleted: completedBooks.length,
        booksStarted: startedBooks.length,
        totalPages,
        averageRating: Math.round(averageRating * 10) / 10
      }
    }
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
  getBooksByGenre,
  getReadingStats,
  getMonthlyReport
};
