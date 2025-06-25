/**
 * Advanced Cache Manager for Library Tracker
 * Implements multiple caching strategies with TTL, LRU, and size limits
 */

class CacheManager {
  constructor() {
    this.caches = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes
    this.maxCacheSize = 50 * 1024 * 1024; // 50MB
    this.cleanupInterval = 60 * 1000; // 1 minute
    
    this.startCleanupTimer();
  }

  /**
   * Create a new cache with specific configuration
   */
  createCache(name, options = {}) {
    const config = {
      ttl: options.ttl || this.defaultTTL,
      maxSize: options.maxSize || 100,
      strategy: options.strategy || 'lru', // lru, fifo, lfu
      persistent: options.persistent || false,
      ...options
    };

    const cache = {
      name,
      config,
      data: new Map(),
      accessCount: new Map(),
      accessOrder: [],
      size: 0,
      hits: 0,
      misses: 0,
      created: Date.now()
    };

    this.caches.set(name, cache);
    
    // Load from localStorage if persistent
    if (config.persistent) {
      this.loadPersistentCache(cache);
    }

    return cache;
  }

  /**
   * Get cache by name or create if doesn't exist
   */
  getCache(name, options = {}) {
    return this.caches.get(name) || this.createCache(name, options);
  }

  /**
   * Set item in cache
   */
  set(cacheName, key, value, ttl = null) {
    const cache = this.getCache(cacheName);
    const expiresAt = Date.now() + (ttl || cache.config.ttl);
    
    const item = {
      value,
      expiresAt,
      createdAt: Date.now(),
      accessCount: 0,
      size: this.calculateSize(value)
    };

    // Check if we need to evict items
    if (cache.data.size >= cache.config.maxSize) {
      this.evictItems(cache);
    }

    // Remove old item if exists
    if (cache.data.has(key)) {
      const oldItem = cache.data.get(key);
      cache.size -= oldItem.size;
    }

    cache.data.set(key, item);
    cache.size += item.size;
    
    // Update access tracking
    this.updateAccessTracking(cache, key);
    
    // Persist if needed
    if (cache.config.persistent) {
      this.savePersistentCache(cache);
    }

    return true;
  }

  /**
   * Get item from cache
   */
  get(cacheName, key) {
    const cache = this.getCache(cacheName);
    const item = cache.data.get(key);

    if (!item) {
      cache.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > item.expiresAt) {
      cache.data.delete(key);
      cache.size -= item.size;
      cache.misses++;
      return null;
    }

    // Update access tracking
    item.accessCount++;
    this.updateAccessTracking(cache, key);
    cache.hits++;

    return item.value;
  }

  /**
   * Get item with fallback function
   */
  async getOrSet(cacheName, key, fallbackFn, ttl = null) {
    let value = this.get(cacheName, key);
    
    if (value === null) {
      value = await fallbackFn();
      this.set(cacheName, key, value, ttl);
    }
    
    return value;
  }

  /**
   * Delete item from cache
   */
  delete(cacheName, key) {
    const cache = this.getCache(cacheName);
    const item = cache.data.get(key);
    
    if (item) {
      cache.data.delete(key);
      cache.size -= item.size;
      
      // Remove from access tracking
      const index = cache.accessOrder.indexOf(key);
      if (index > -1) {
        cache.accessOrder.splice(index, 1);
      }
      cache.accessCount.delete(key);
      
      if (cache.config.persistent) {
        this.savePersistentCache(cache);
      }
      
      return true;
    }
    
    return false;
  }

  /**
   * Clear entire cache
   */
  clear(cacheName) {
    const cache = this.getCache(cacheName);
    cache.data.clear();
    cache.accessCount.clear();
    cache.accessOrder = [];
    cache.size = 0;
    cache.hits = 0;
    cache.misses = 0;
    
    if (cache.config.persistent) {
      localStorage.removeItem(`cache_${cacheName}`);
    }
  }

  /**
   * Update access tracking for eviction strategies
   */
  updateAccessTracking(cache, key) {
    // Update access order for LRU
    const index = cache.accessOrder.indexOf(key);
    if (index > -1) {
      cache.accessOrder.splice(index, 1);
    }
    cache.accessOrder.push(key);

    // Update access count for LFU
    const currentCount = cache.accessCount.get(key) || 0;
    cache.accessCount.set(key, currentCount + 1);
  }

  /**
   * Evict items based on strategy
   */
  evictItems(cache) {
    const itemsToEvict = Math.ceil(cache.config.maxSize * 0.1); // Evict 10%
    
    for (let i = 0; i < itemsToEvict && cache.data.size > 0; i++) {
      let keyToEvict;
      
      switch (cache.config.strategy) {
        case 'lru':
          keyToEvict = cache.accessOrder[0];
          break;
        case 'lfu':
          keyToEvict = this.getLeastFrequentlyUsed(cache);
          break;
        case 'fifo':
        default:
          keyToEvict = cache.data.keys().next().value;
          break;
      }
      
      if (keyToEvict) {
        this.delete(cache.name, keyToEvict);
      }
    }
  }

  /**
   * Get least frequently used key
   */
  getLeastFrequentlyUsed(cache) {
    let minCount = Infinity;
    let leastUsedKey = null;
    
    for (const [key, count] of cache.accessCount) {
      if (count < minCount) {
        minCount = count;
        leastUsedKey = key;
      }
    }
    
    return leastUsedKey;
  }

  /**
   * Calculate size of value
   */
  calculateSize(value) {
    try {
      return new Blob([JSON.stringify(value)]).size;
    } catch {
      return JSON.stringify(value).length * 2; // Rough estimate
    }
  }

  /**
   * Load persistent cache from localStorage
   */
  loadPersistentCache(cache) {
    try {
      const stored = localStorage.getItem(`cache_${cache.name}`);
      if (stored) {
        const data = JSON.parse(stored);
        
        // Restore cache data
        for (const [key, item] of Object.entries(data.items)) {
          if (Date.now() < item.expiresAt) {
            cache.data.set(key, item);
            cache.size += item.size;
          }
        }
        
        // Restore access tracking
        cache.accessOrder = data.accessOrder || [];
        cache.accessCount = new Map(data.accessCount || []);
        cache.hits = data.hits || 0;
        cache.misses = data.misses || 0;
      }
    } catch (error) {
      console.warn(`Failed to load persistent cache ${cache.name}:`, error);
    }
  }

  /**
   * Save persistent cache to localStorage
   */
  savePersistentCache(cache) {
    try {
      const data = {
        items: Object.fromEntries(cache.data),
        accessOrder: cache.accessOrder,
        accessCount: Array.from(cache.accessCount),
        hits: cache.hits,
        misses: cache.misses,
        savedAt: Date.now()
      };
      
      localStorage.setItem(`cache_${cache.name}`, JSON.stringify(data));
    } catch (error) {
      console.warn(`Failed to save persistent cache ${cache.name}:`, error);
    }
  }

  /**
   * Cleanup expired items
   */
  cleanup() {
    const now = Date.now();
    
    for (const cache of this.caches.values()) {
      const expiredKeys = [];
      
      for (const [key, item] of cache.data) {
        if (now > item.expiresAt) {
          expiredKeys.push(key);
        }
      }
      
      expiredKeys.forEach(key => this.delete(cache.name, key));
    }
  }

  /**
   * Start cleanup timer
   */
  startCleanupTimer() {
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Get cache statistics
   */
  getStats(cacheName = null) {
    if (cacheName) {
      const cache = this.caches.get(cacheName);
      if (!cache) return null;
      
      return {
        name: cache.name,
        size: cache.data.size,
        memorySize: cache.size,
        hits: cache.hits,
        misses: cache.misses,
        hitRate: cache.hits / (cache.hits + cache.misses) || 0,
        config: cache.config
      };
    }
    
    // Return stats for all caches
    const stats = {};
    for (const [name, cache] of this.caches) {
      stats[name] = this.getStats(name);
    }
    return stats;
  }

  /**
   * Destroy cache manager
   */
  destroy() {
    for (const cache of this.caches.values()) {
      if (cache.config.persistent) {
        this.savePersistentCache(cache);
      }
    }
    this.caches.clear();
  }
}

// Create singleton instance
const cacheManager = new CacheManager();

// Export convenience functions
export const createCache = (name, options) => cacheManager.createCache(name, options);
export const getCache = (name, options) => cacheManager.getCache(name, options);
export const setCache = (cacheName, key, value, ttl) => cacheManager.set(cacheName, key, value, ttl);
export const getFromCache = (cacheName, key) => cacheManager.get(cacheName, key);
export const getOrSetCache = (cacheName, key, fallbackFn, ttl) => cacheManager.getOrSet(cacheName, key, fallbackFn, ttl);
export const deleteFromCache = (cacheName, key) => cacheManager.delete(cacheName, key);
export const clearCache = (cacheName) => cacheManager.clear(cacheName);
export const getCacheStats = (cacheName) => cacheManager.getStats(cacheName);

export default cacheManager;
