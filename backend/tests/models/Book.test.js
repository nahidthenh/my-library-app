import Book from '../../models/Book.js';
import { createTestUser, createTestBook, generateBookData } from '../helpers/testHelpers.js';

describe('Book Model', () => {
  let testUser;

  beforeEach(async () => {
    testUser = await createTestUser();
  });

  describe('Book Creation', () => {
    it('should create a book with valid data', async () => {
      const bookData = generateBookData();
      const book = await Book.create({
        ...bookData,
        userId: testUser._id
      });

      expect(book._id).toBeDefined();
      expect(book.title).toBe(bookData.title);
      expect(book.author).toBe(bookData.author);
      expect(book.userId.toString()).toBe(testUser._id.toString());
      expect(book.status).toBe('not_started');
      expect(book.createdAt).toBeDefined();
      expect(book.updatedAt).toBeDefined();
    });

    it('should set default status to not_started', async () => {
      const bookData = generateBookData();
      delete bookData.status;

      const book = await Book.create({
        ...bookData,
        userId: testUser._id
      });

      expect(book.status).toBe('not_started');
    });

    it('should allow books without rating', async () => {
      const bookData = generateBookData();
      delete bookData.rating; // Remove rating to test optional field
      const book = await Book.create({
        ...bookData,
        userId: testUser._id
      });

      expect(book.rating).toBeUndefined();
    });
  });

  describe('Book Validation', () => {
    it('should require userId', async () => {
      const bookData = generateBookData();

      await expect(Book.create(bookData)).rejects.toThrow();
    });

    it('should require title', async () => {
      const bookData = generateBookData();
      delete bookData.title;

      await expect(Book.create({
        ...bookData,
        userId: testUser._id
      })).rejects.toThrow();
    });

    it('should require author', async () => {
      const bookData = generateBookData();
      delete bookData.author;

      await expect(Book.create({
        ...bookData,
        userId: testUser._id
      })).rejects.toThrow();
    });

    it('should validate title length', async () => {
      const bookData = generateBookData({ title: 'a'.repeat(201) });

      await expect(Book.create({
        ...bookData,
        userId: testUser._id
      })).rejects.toThrow();
    });

    it('should validate author length', async () => {
      const bookData = generateBookData({ author: 'a'.repeat(101) });

      await expect(Book.create({
        ...bookData,
        userId: testUser._id
      })).rejects.toThrow();
    });

    it('should validate status enum', async () => {
      const bookData = generateBookData({ status: 'invalid-status' });

      await expect(Book.create({
        ...bookData,
        userId: testUser._id
      })).rejects.toThrow();
    });

    it('should validate rating range', async () => {
      const bookData = generateBookData({ rating: 6 });

      await expect(Book.create({
        ...bookData,
        userId: testUser._id
      })).rejects.toThrow();
    });

    it('should validate negative rating', async () => {
      const bookData = generateBookData({ rating: -1 });

      await expect(Book.create({
        ...bookData,
        userId: testUser._id
      })).rejects.toThrow();
    });

    it('should validate page count minimum', async () => {
      const bookData = generateBookData({ pageCount: 0 });

      await expect(Book.create({
        ...bookData,
        userId: testUser._id
      })).rejects.toThrow();
    });

    it('should validate current page range', async () => {
      const bookData = generateBookData({
        pageCount: 100,
        currentPage: 150
      });

      await expect(Book.create({
        ...bookData,
        userId: testUser._id
      })).rejects.toThrow();
    });

    it('should validate date constraints', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const bookData = generateBookData({ dateStarted: futureDate });

      await expect(Book.create({
        ...bookData,
        userId: testUser._id
      })).rejects.toThrow();
    });

    it('should validate completion date after start date', async () => {
      const startDate = new Date('2023-06-01');
      const completionDate = new Date('2023-05-01'); // Before start date

      const bookData = generateBookData({
        dateStarted: startDate,
        dateCompleted: completionDate
      });

      await expect(Book.create({
        ...bookData,
        userId: testUser._id
      })).rejects.toThrow();
    });
  });

  describe('Book Virtual Fields', () => {
    it('should calculate reading progress percentage', async () => {
      const book = await createTestBook(testUser._id, {
        pageCount: 200,
        currentPage: 50
      });

      // Reload the book to get virtual fields
      const reloadedBook = await Book.findById(book._id);
      expect(reloadedBook.progressPercentage).toBe(25);
    });

    it('should handle books without page count for progress', async () => {
      const book = await createTestBook(testUser._id, {
        currentPage: 0
      });

      const reloadedBook = await Book.findById(book._id);
      expect(reloadedBook.progressPercentage).toBe(0);
    });

    it('should calculate reading duration', async () => {
      const startDate = new Date('2023-01-01T00:00:00.000Z');
      const completionDate = new Date('2023-01-15T00:00:00.000Z');

      // Create book with completed status to allow dateCompleted
      const book = await createTestBook(testUser._id, {
        status: 'completed',
        dateStarted: startDate,
        dateCompleted: completionDate
      });

      const reloadedBook = await Book.findById(book._id);

      // Debug: Check if dates are properly saved
      expect(reloadedBook.dateStarted).toBeTruthy();
      expect(reloadedBook.dateCompleted).toBeTruthy();

      // The calculation returns 14 days (difference between dates)
      expect(reloadedBook.readingDuration).toBe(14);
    });

    it('should return null for incomplete books duration', async () => {
      const book = await createTestBook(testUser._id, {
        dateStarted: new Date('2023-01-01'),
        dateCompleted: null
      });

      const reloadedBook = await Book.findById(book._id);
      expect(reloadedBook.readingDuration).toBeNull();
    });
  });

  describe('Book Middleware', () => {
    it('should set dateStarted when status changes to in_progress', async () => {
      const book = await createTestBook(testUser._id, { status: 'not_started' });

      book.status = 'in_progress';
      await book.save();

      expect(book.dateStarted).toBeDefined();
      expect(book.dateStarted).toBeInstanceOf(Date);
    });

    it('should set dateCompleted when status changes to completed', async () => {
      const book = await createTestBook(testUser._id, { status: 'in_progress' });

      book.status = 'completed';
      await book.save();

      expect(book.dateCompleted).toBeDefined();
      expect(book.dateCompleted).toBeInstanceOf(Date);
    });

    it('should set currentPage to pageCount when completed', async () => {
      const book = await createTestBook(testUser._id, {
        status: 'in_progress',
        pageCount: 300,
        currentPage: 150
      });

      book.status = 'completed';
      await book.save();

      expect(book.currentPage).toBe(300);
    });
  });
});
