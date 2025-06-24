import asyncHandler from 'express-async-handler';
import Book from '../models/Book.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import csv from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @desc    Export user's books to CSV
// @route   GET /api/v1/import-export/books/csv
// @access  Private
const exportBooksCSV = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  // Get all user's books
  const books = await Book.find({ userId }).sort({ createdAt: -1 });
  
  if (books.length === 0) {
    throw new AppError('No books found to export', 404);
  }

  // Prepare CSV data
  const csvData = books.map(book => ({
    title: book.title,
    author: book.author,
    isbn: book.isbn || '',
    genre: book.genre || '',
    pageCount: book.pageCount || '',
    status: book.status,
    rating: book.rating || '',
    dateStarted: book.dateStarted ? book.dateStarted.toISOString().split('T')[0] : '',
    dateCompleted: book.dateCompleted ? book.dateCompleted.toISOString().split('T')[0] : '',
    currentPage: book.currentPage || '',
    notes: book.notes || '',
    tags: book.tags ? book.tags.join(', ') : '',
    createdAt: book.createdAt.toISOString().split('T')[0]
  }));

  // Create CSV file
  const fileName = `books_export_${Date.now()}.csv`;
  const filePath = path.join(__dirname, '../temp', fileName);
  
  // Ensure temp directory exists
  const tempDir = path.join(__dirname, '../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: [
      { id: 'title', title: 'Title' },
      { id: 'author', title: 'Author' },
      { id: 'isbn', title: 'ISBN' },
      { id: 'genre', title: 'Genre' },
      { id: 'pageCount', title: 'Page Count' },
      { id: 'status', title: 'Status' },
      { id: 'rating', title: 'Rating' },
      { id: 'dateStarted', title: 'Date Started' },
      { id: 'dateCompleted', title: 'Date Completed' },
      { id: 'currentPage', title: 'Current Page' },
      { id: 'notes', title: 'Notes' },
      { id: 'tags', title: 'Tags' },
      { id: 'createdAt', title: 'Date Added' }
    ]
  });

  await csvWriter.writeRecords(csvData);

  // Send file
  res.download(filePath, `library_export_${new Date().toISOString().split('T')[0]}.csv`, (err) => {
    if (err) {
      console.error('Error sending file:', err);
    }
    // Clean up temp file
    fs.unlink(filePath, (unlinkErr) => {
      if (unlinkErr) console.error('Error deleting temp file:', unlinkErr);
    });
  });
});

// @desc    Export user's books to JSON
// @route   GET /api/v1/import-export/books/json
// @access  Private
const exportBooksJSON = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  // Get all user's books and user data
  const [books, user] = await Promise.all([
    Book.find({ userId }).sort({ createdAt: -1 }),
    User.findById(userId).select('-password')
  ]);

  if (books.length === 0) {
    throw new AppError('No books found to export', 404);
  }

  const exportData = {
    exportDate: new Date().toISOString(),
    user: {
      name: user.displayName,
      email: user.email,
      readingGoal: user.readingGoal,
      preferences: user.preferences
    },
    books: books.map(book => ({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      genre: book.genre,
      pageCount: book.pageCount,
      status: book.status,
      rating: book.rating,
      dateStarted: book.dateStarted,
      dateCompleted: book.dateCompleted,
      currentPage: book.currentPage,
      notes: book.notes,
      tags: book.tags,
      coverImage: book.coverImage,
      createdAt: book.createdAt,
      updatedAt: book.updatedAt
    })),
    statistics: {
      totalBooks: books.length,
      completedBooks: books.filter(book => book.status === 'completed').length,
      inProgressBooks: books.filter(book => book.status === 'in_progress').length,
      totalPages: books.reduce((sum, book) => sum + (book.pageCount || 0), 0)
    }
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=library_export_${new Date().toISOString().split('T')[0]}.json`);
  res.json(exportData);
});

// @desc    Import books from CSV
// @route   POST /api/v1/import-export/books/csv
// @access  Private
const importBooksCSV = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  if (!req.file) {
    throw new AppError('Please upload a CSV file', 400);
  }

  const results = [];
  const errors = [];
  let lineNumber = 1;

  // Parse CSV file
  const parsePromise = new Promise((resolve, reject) => {
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => {
        lineNumber++;
        
        // Validate required fields
        if (!data.title || !data.author) {
          errors.push(`Line ${lineNumber}: Title and Author are required`);
          return;
        }

        // Prepare book data
        const bookData = {
          userId,
          title: data.title.trim(),
          author: data.author.trim(),
          isbn: data.isbn?.trim() || undefined,
          genre: data.genre?.trim() || undefined,
          pageCount: data.pageCount ? parseInt(data.pageCount) : undefined,
          status: ['not_started', 'in_progress', 'completed'].includes(data.status) ? data.status : 'not_started',
          rating: data.rating ? parseFloat(data.rating) : undefined,
          currentPage: data.currentPage ? parseInt(data.currentPage) : undefined,
          notes: data.notes?.trim() || undefined,
          tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
          dateStarted: data.dateStarted ? new Date(data.dateStarted) : undefined,
          dateCompleted: data.dateCompleted ? new Date(data.dateCompleted) : undefined
        };

        // Validate rating
        if (bookData.rating && (bookData.rating < 1 || bookData.rating > 5)) {
          errors.push(`Line ${lineNumber}: Rating must be between 1 and 5`);
          return;
        }

        results.push(bookData);
      })
      .on('end', resolve)
      .on('error', reject);
  });

  await parsePromise;

  // Clean up uploaded file
  fs.unlink(req.file.path, (err) => {
    if (err) console.error('Error deleting uploaded file:', err);
  });

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Import failed due to validation errors',
      errors,
      validRecords: results.length
    });
  }

  if (results.length === 0) {
    throw new AppError('No valid records found in CSV file', 400);
  }

  // Import books to database
  try {
    const importedBooks = await Book.insertMany(results);
    
    res.status(201).json({
      success: true,
      message: `Successfully imported ${importedBooks.length} books`,
      data: {
        importedCount: importedBooks.length,
        totalProcessed: lineNumber - 1,
        errors: []
      }
    });
  } catch (error) {
    throw new AppError('Failed to import books to database', 500);
  }
});

// @desc    Import books from JSON
// @route   POST /api/v1/import-export/books/json
// @access  Private
const importBooksJSON = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  if (!req.file) {
    throw new AppError('Please upload a JSON file', 400);
  }

  try {
    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    const importData = JSON.parse(fileContent);

    // Clean up uploaded file
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Error deleting uploaded file:', err);
    });

    if (!importData.books || !Array.isArray(importData.books)) {
      throw new AppError('Invalid JSON format: books array is required', 400);
    }

    const validBooks = [];
    const errors = [];

    // Validate and prepare books
    importData.books.forEach((book, index) => {
      if (!book.title || !book.author) {
        errors.push(`Book ${index + 1}: Title and Author are required`);
        return;
      }

      validBooks.push({
        userId,
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        genre: book.genre,
        pageCount: book.pageCount,
        status: ['not_started', 'in_progress', 'completed'].includes(book.status) ? book.status : 'not_started',
        rating: book.rating && book.rating >= 1 && book.rating <= 5 ? book.rating : undefined,
        currentPage: book.currentPage,
        notes: book.notes,
        tags: Array.isArray(book.tags) ? book.tags : [],
        dateStarted: book.dateStarted ? new Date(book.dateStarted) : undefined,
        dateCompleted: book.dateCompleted ? new Date(book.dateCompleted) : undefined,
        coverImage: book.coverImage
      });
    });

    if (validBooks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid books found in JSON file',
        errors
      });
    }

    // Import books
    const importedBooks = await Book.insertMany(validBooks);

    res.status(201).json({
      success: true,
      message: `Successfully imported ${importedBooks.length} books`,
      data: {
        importedCount: importedBooks.length,
        totalProcessed: importData.books.length,
        errors
      }
    });

  } catch (error) {
    if (error.name === 'SyntaxError') {
      throw new AppError('Invalid JSON file format', 400);
    }
    throw error;
  }
});

export {
  exportBooksCSV,
  exportBooksJSON,
  importBooksCSV,
  importBooksJSON
};
