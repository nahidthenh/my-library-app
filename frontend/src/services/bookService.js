import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Book service functions
export const bookService = {
  // Get all books with optional filters and pagination
  getBooks: async (params = {}) => {
    try {
      const response = await api.get('/books', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch books');
    }
  },

  // Get a single book by ID
  getBook: async (id) => {
    try {
      const response = await api.get(`/books/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch book');
    }
  },

  // Create a new book
  createBook: async (bookData) => {
    try {
      const response = await api.post('/books', bookData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create book');
    }
  },

  // Update an existing book
  updateBook: async (id, bookData) => {
    try {
      const response = await api.put(`/books/${id}`, bookData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update book');
    }
  },

  // Update book status
  updateBookStatus: async (id, status) => {
    try {
      const response = await api.patch(`/books/${id}/status`, { status });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update book status');
    }
  },

  // Delete a book
  deleteBook: async (id) => {
    try {
      const response = await api.delete(`/books/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete book');
    }
  },

  // Search books
  searchBooks: async (query, params = {}) => {
    try {
      const response = await api.get('/books/search', {
        params: { q: query, ...params }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to search books');
    }
  },

  // Advanced search books
  advancedSearchBooks: async (searchCriteria, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc') => {
    try {
      const response = await api.post('/books/search/advanced', {
        ...searchCriteria,
        page,
        limit,
        sortBy,
        sortOrder
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to perform advanced search');
    }
  },

  // Get books by genre
  getBooksByGenre: async () => {
    try {
      const response = await api.get('/books/genres');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch genres');
    }
  },
};

export default bookService;
