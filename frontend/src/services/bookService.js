import axios from 'axios';
import offlineStorage from '../utils/offlineStorage';

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

// Enhanced offline-aware book service
export const offlineBookService = {
  // Initialize offline storage
  async init() {
    try {
      await offlineStorage.init();
      console.log('Offline book service initialized');
    } catch (error) {
      console.error('Failed to initialize offline storage:', error);
    }
  },

  // Get books with offline fallback
  async getBooks(params = {}) {
    try {
      // Try network first
      if (navigator.onLine) {
        const response = await bookService.getBooks(params);

        // Cache successful response
        if (response.success && response.data.books) {
          await offlineStorage.saveBooks(response.data.books);
          await offlineStorage.setSyncTimestamp('books', Date.now());
        }

        return response;
      }
    } catch (error) {
      console.log('Network request failed, falling back to offline data');
    }

    // Fallback to offline data
    try {
      const books = await offlineStorage.getBooks(params);
      return {
        success: true,
        data: {
          books,
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalBooks: books.length,
            hasNextPage: false,
            hasPrevPage: false
          }
        },
        offline: true
      };
    } catch (error) {
      throw new Error('No offline data available');
    }
  },

  // Create book with offline queue
  async createBook(bookData) {
    try {
      if (navigator.onLine) {
        const response = await bookService.createBook(bookData);

        // Update offline cache
        if (response.success && response.data) {
          const books = await offlineStorage.getBooks();
          books.push(response.data);
          await offlineStorage.saveBooks(books);
        }

        return response;
      }
    } catch (error) {
      console.log('Network request failed, queuing for offline sync');
    }

    // Queue for offline sync
    const tempId = `temp_${Date.now()}`;
    const tempBook = {
      ...bookData,
      _id: tempId,
      _tempId: true,
      _offlineCreated: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to offline storage
    const books = await offlineStorage.getBooks();
    books.push(tempBook);
    await offlineStorage.saveBooks(books);

    // Queue sync action
    await offlineStorage.addOfflineAction({
      type: 'CREATE_BOOK',
      method: 'POST',
      url: '/api/v1/books',
      data: bookData,
      tempId
    });

    return {
      success: true,
      data: tempBook,
      offline: true,
      queued: true
    };
  },

  // Update book with offline queue
  async updateBook(id, updates) {
    try {
      if (navigator.onLine) {
        const response = await bookService.updateBook(id, updates);

        // Update offline cache
        if (response.success && response.data) {
          await offlineStorage.updateBook(id, response.data);
        }

        return response;
      }
    } catch (error) {
      console.log('Network request failed, queuing for offline sync');
    }

    // Update offline storage
    const updatedBook = await offlineStorage.updateBook(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
      _offlineUpdated: true
    });

    // Queue sync action if not a temp book
    if (!id.startsWith('temp_')) {
      await offlineStorage.addOfflineAction({
        type: 'UPDATE_BOOK',
        method: 'PUT',
        url: `/api/v1/books/${id}`,
        data: updates,
        bookId: id
      });
    }

    return {
      success: true,
      data: updatedBook,
      offline: true,
      queued: true
    };
  },

  // Delete book with offline queue
  async deleteBook(id) {
    try {
      if (navigator.onLine) {
        const response = await bookService.deleteBook(id);

        // Remove from offline cache
        if (response.success) {
          await offlineStorage.deleteBook(id);
        }

        return response;
      }
    } catch (error) {
      console.log('Network request failed, queuing for offline sync');
    }

    // Remove from offline storage
    await offlineStorage.deleteBook(id);

    // Queue sync action if not a temp book
    if (!id.startsWith('temp_')) {
      await offlineStorage.addOfflineAction({
        type: 'DELETE_BOOK',
        method: 'DELETE',
        url: `/api/v1/books/${id}`,
        bookId: id
      });
    }

    return {
      success: true,
      offline: true,
      queued: true
    };
  },

  // Sync offline actions when back online
  async syncOfflineActions() {
    if (!navigator.onLine) {
      console.log('Cannot sync: offline');
      return { success: false, message: 'Offline' };
    }

    try {
      const actions = await offlineStorage.getOfflineActions();
      const results = [];

      for (const action of actions) {
        try {
          let response;

          switch (action.type) {
            case 'CREATE_BOOK':
              response = await bookService.createBook(action.data);
              if (response.success) {
                // Replace temp book with real book
                await offlineStorage.deleteBook(action.tempId);
                const books = await offlineStorage.getBooks();
                books.push(response.data);
                await offlineStorage.saveBooks(books);
              }
              break;

            case 'UPDATE_BOOK':
              response = await bookService.updateBook(action.bookId, action.data);
              if (response.success) {
                await offlineStorage.updateBook(action.bookId, response.data);
              }
              break;

            case 'DELETE_BOOK':
              response = await bookService.deleteBook(action.bookId);
              break;

            default:
              console.warn('Unknown action type:', action.type);
              continue;
          }

          if (response.success) {
            await offlineStorage.removeOfflineAction(action.id);
            results.push({ action: action.type, success: true });
          } else {
            results.push({ action: action.type, success: false, error: response.message });
          }
        } catch (error) {
          console.error('Sync action failed:', action.type, error);
          results.push({ action: action.type, success: false, error: error.message });
        }
      }

      // Update sync timestamp
      await offlineStorage.setSyncTimestamp('lastSync', Date.now());

      return {
        success: true,
        results,
        syncedCount: results.filter(r => r.success).length,
        failedCount: results.filter(r => !r.success).length
      };
    } catch (error) {
      console.error('Sync failed:', error);
      return { success: false, message: error.message };
    }
  },

  // Get sync status
  async getSyncStatus() {
    const actions = await offlineStorage.getOfflineActions();
    const lastSync = await offlineStorage.getSyncTimestamp('lastSync');

    return {
      pendingActions: actions.length,
      lastSync: lastSync ? new Date(lastSync) : null,
      isOnline: navigator.onLine
    };
  },

  // Force full sync from server
  async forceSync() {
    if (!navigator.onLine) {
      throw new Error('Cannot sync: offline');
    }

    try {
      // Get fresh data from server
      const response = await bookService.getBooks({ limit: 1000 });

      if (response.success && response.data.books) {
        // Replace all offline data
        await offlineStorage.saveBooks(response.data.books);
        await offlineStorage.setSyncTimestamp('books', Date.now());

        console.log(`Synced ${response.data.books.length} books from server`);
        return { success: true, count: response.data.books.length };
      }

      throw new Error('Failed to fetch data from server');
    } catch (error) {
      console.error('Force sync failed:', error);
      throw error;
    }
  }
};

export default bookService;
