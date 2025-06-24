// IndexedDB wrapper for offline storage
class OfflineStorage {
  constructor() {
    this.dbName = 'LibraryTrackerDB';
    this.version = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Books store
        if (!db.objectStoreNames.contains('books')) {
          const booksStore = db.createObjectStore('books', { keyPath: '_id' });
          booksStore.createIndex('status', 'status', { unique: false });
          booksStore.createIndex('genre', 'genre', { unique: false });
          booksStore.createIndex('author', 'author', { unique: false });
          booksStore.createIndex('createdAt', 'createdAt', { unique: false });
          booksStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // User data store
        if (!db.objectStoreNames.contains('userData')) {
          const userStore = db.createObjectStore('userData', { keyPath: 'id' });
          userStore.createIndex('type', 'type', { unique: false });
        }

        // Offline actions queue
        if (!db.objectStoreNames.contains('offlineActions')) {
          const actionsStore = db.createObjectStore('offlineActions', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          actionsStore.createIndex('timestamp', 'timestamp', { unique: false });
          actionsStore.createIndex('type', 'type', { unique: false });
        }

        // Reading statistics cache
        if (!db.objectStoreNames.contains('statistics')) {
          const statsStore = db.createObjectStore('statistics', { keyPath: 'id' });
          statsStore.createIndex('type', 'type', { unique: false });
          statsStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
        }

        // Sync metadata
        if (!db.objectStoreNames.contains('syncMeta')) {
          const syncStore = db.createObjectStore('syncMeta', { keyPath: 'key' });
        }

        console.log('IndexedDB schema created/updated');
      };
    });
  }

  async ensureDB() {
    if (!this.db) {
      await this.init();
    }
    return this.db;
  }

  // Books operations
  async saveBooks(books) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['books'], 'readwrite');
    const store = transaction.objectStore('books');

    const promises = books.map(book => {
      return new Promise((resolve, reject) => {
        const request = store.put({
          ...book,
          _offlineUpdated: Date.now()
        });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
    console.log(`Saved ${books.length} books to offline storage`);
  }

  async getBooks(filters = {}) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['books'], 'readonly');
    const store = transaction.objectStore('books');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => {
        let books = request.result;
        
        // Apply filters
        if (filters.status) {
          books = books.filter(book => book.status === filters.status);
        }
        if (filters.genre) {
          books = books.filter(book => book.genre === filters.genre);
        }
        if (filters.search) {
          const searchTerm = filters.search.toLowerCase();
          books = books.filter(book => 
            book.title.toLowerCase().includes(searchTerm) ||
            book.author.toLowerCase().includes(searchTerm)
          );
        }

        // Sort books
        const sortBy = filters.sortBy || 'createdAt';
        const sortOrder = filters.sortOrder || 'desc';
        
        books.sort((a, b) => {
          const aVal = a[sortBy] || '';
          const bVal = b[sortBy] || '';
          
          if (sortOrder === 'desc') {
            return bVal > aVal ? 1 : -1;
          } else {
            return aVal > bVal ? 1 : -1;
          }
        });

        resolve(books);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async getBook(id) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['books'], 'readonly');
    const store = transaction.objectStore('books');

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateBook(id, updates) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['books'], 'readwrite');
    const store = transaction.objectStore('books');

    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const book = getRequest.result;
        if (book) {
          const updatedBook = {
            ...book,
            ...updates,
            _offlineUpdated: Date.now()
          };
          
          const putRequest = store.put(updatedBook);
          putRequest.onsuccess = () => resolve(updatedBook);
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Book not found'));
        }
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deleteBook(id) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['books'], 'readwrite');
    const store = transaction.objectStore('books');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // User data operations
  async saveUserData(type, data) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['userData'], 'readwrite');
    const store = transaction.objectStore('userData');

    const userData = {
      id: type,
      type,
      data,
      lastUpdated: Date.now()
    };

    return new Promise((resolve, reject) => {
      const request = store.put(userData);
      request.onsuccess = () => resolve(userData);
      request.onerror = () => reject(request.error);
    });
  }

  async getUserData(type) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['userData'], 'readonly');
    const store = transaction.objectStore('userData');

    return new Promise((resolve, reject) => {
      const request = store.get(type);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Offline actions queue
  async addOfflineAction(action) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['offlineActions'], 'readwrite');
    const store = transaction.objectStore('offlineActions');

    const actionData = {
      ...action,
      timestamp: Date.now(),
      retryCount: 0
    };

    return new Promise((resolve, reject) => {
      const request = store.add(actionData);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getOfflineActions() {
    const db = await this.ensureDB();
    const transaction = db.transaction(['offlineActions'], 'readonly');
    const store = transaction.objectStore('offlineActions');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removeOfflineAction(id) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['offlineActions'], 'readwrite');
    const store = transaction.objectStore('offlineActions');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // Statistics cache
  async saveStatistics(type, data) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['statistics'], 'readwrite');
    const store = transaction.objectStore('statistics');

    const statsData = {
      id: type,
      type,
      data,
      lastUpdated: Date.now()
    };

    return new Promise((resolve, reject) => {
      const request = store.put(statsData);
      request.onsuccess = () => resolve(statsData);
      request.onerror = () => reject(request.error);
    });
  }

  async getStatistics(type) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['statistics'], 'readonly');
    const store = transaction.objectStore('statistics');

    return new Promise((resolve, reject) => {
      const request = store.get(type);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Sync metadata
  async setSyncTimestamp(key, timestamp) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['syncMeta'], 'readwrite');
    const store = transaction.objectStore('syncMeta');

    return new Promise((resolve, reject) => {
      const request = store.put({ key, timestamp });
      request.onsuccess = () => resolve(timestamp);
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncTimestamp(key) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['syncMeta'], 'readonly');
    const store = transaction.objectStore('syncMeta');

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.timestamp : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Clear all data
  async clearAll() {
    const db = await this.ensureDB();
    const storeNames = ['books', 'userData', 'offlineActions', 'statistics', 'syncMeta'];
    
    const transaction = db.transaction(storeNames, 'readwrite');
    
    const promises = storeNames.map(storeName => {
      return new Promise((resolve, reject) => {
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
    console.log('All offline data cleared');
  }

  // Get storage usage
  async getStorageUsage() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage,
        available: estimate.quota,
        percentage: Math.round((estimate.usage / estimate.quota) * 100)
      };
    }
    return null;
  }
}

// Create singleton instance
const offlineStorage = new OfflineStorage();

export default offlineStorage;
