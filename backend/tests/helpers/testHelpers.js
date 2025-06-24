import jwt from 'jsonwebtoken';
import User from '../../models/User.js';
import Book from '../../models/Book.js';

/**
 * Test helper functions for creating test data and utilities
 */

// Generate JWT token for testing
export const generateTestToken = (userId, expiresIn = '1h') => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn });
};

// Create a test user
export const createTestUser = async (userData = {}) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  const defaultUser = {
    googleId: 'test-google-id-' + timestamp + '-' + random,
    email: 'test' + timestamp + '-' + random + '@example.com',
    name: 'Test User ' + random,
    avatar: 'https://example.com/avatar.jpg',
    ...userData
  };

  const user = await User.create(defaultUser);
  return user;
};

// Create a test book
export const createTestBook = async (userId, bookData = {}) => {
  const defaultBook = {
    userId,
    title: 'Test Book',
    author: 'Test Author',
    genre: 'Fiction',
    status: 'not_started',
    publicationDate: new Date('2023-01-01'),
    ...bookData
  };

  const book = await Book.create(defaultBook);
  return book;
};

// Create multiple test books
export const createTestBooks = async (userId, count = 3) => {
  const books = [];

  for (let i = 0; i < count; i++) {
    const book = await createTestBook(userId, {
      title: `Test Book ${i + 1}`,
      author: `Test Author ${i + 1}`,
      genre: i % 2 === 0 ? 'Fiction' : 'Non-Fiction',
      status: ['not_started', 'in_progress', 'completed'][i % 3]
    });
    books.push(book);
  }

  return books;
};

// Clean up test data
export const cleanupTestData = async () => {
  await User.deleteMany({});
  await Book.deleteMany({});
};

// Mock request object
export const mockRequest = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: null,
  ...overrides
});

// Mock response object
export const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

// Mock next function
export const mockNext = jest.fn();

// Test data generators
export const generateBookData = (overrides = {}) => ({
  title: 'Sample Book Title',
  author: 'Sample Author',
  genre: 'Fiction',
  publicationDate: '2023-01-01',
  isbn: '9780123456786', // Valid ISBN-13
  description: 'A sample book description',
  coverImage: 'https://example.com/cover.jpg',
  pageCount: 300,
  ...overrides
});

export const generateUserData = (overrides = {}) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return {
    googleId: 'google-id-' + timestamp + '-' + random,
    email: 'user' + timestamp + '-' + random + '@example.com',
    name: 'Test User ' + random,
    avatar: 'https://example.com/avatar.jpg',
    ...overrides
  };
};

// Assertion helpers
export const expectValidationError = (response, field) => {
  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toContain(field);
};

export const expectUnauthorized = (response) => {
  expect(response.status).toBe(401);
  expect(response.body.success).toBe(false);
};

export const expectNotFound = (response) => {
  expect(response.status).toBe(404);
  expect(response.body.success).toBe(false);
};

export const expectSuccess = (response, statusCode = 200) => {
  expect(response.status).toBe(statusCode);
  expect(response.body.success).toBe(true);
};

// Database state helpers
export const getUserCount = async () => {
  return await User.countDocuments();
};

export const getBookCount = async () => {
  return await Book.countDocuments();
};

export const findUserByEmail = async (email) => {
  return await User.findOne({ email });
};

export const findBooksByUser = async (userId) => {
  return await Book.find({ userId });
};
