// Library Tracker Service Worker
const CACHE_NAME = 'library-tracker-v1.0.0';
const STATIC_CACHE = 'library-tracker-static-v1.0.0';
const DYNAMIC_CACHE = 'library-tracker-dynamic-v1.0.0';
const API_CACHE = 'library-tracker-api-v1.0.0';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/books',
  '/analytics',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/v1/books',
  '/api/v1/stats',
  '/api/v1/users/profile'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      caches.open(API_CACHE).then((cache) => {
        console.log('Service Worker: Preparing API cache');
        return Promise.resolve();
      })
    ]).then(() => {
      console.log('Service Worker: Installation complete');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE && 
              cacheName !== API_CACHE) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activation complete');
      return self.clients.claim();
    })
  );
});

// Fetch event - handle requests with different strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    // API requests - Network First with cache fallback
    event.respondWith(handleApiRequest(request));
  } else if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$/)) {
    // Static assets - Cache First
    event.respondWith(handleStaticAssets(request));
  } else {
    // HTML pages - Stale While Revalidate
    event.respondWith(handlePageRequest(request));
  }
});

// Network First strategy for API requests
async function handleApiRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache for:', request.url);
    
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for API requests
    return new Response(
      JSON.stringify({
        success: false,
        message: 'You are offline. Please check your connection.',
        offline: true
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Cache First strategy for static assets
async function handleStaticAssets(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Failed to fetch asset:', request.url);
    
    // Return a fallback for images
    if (request.url.match(/\.(png|jpg|jpeg|gif|svg)$/)) {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f3f4f6"/><text x="100" y="100" text-anchor="middle" dy=".3em" fill="#9ca3af">📚</text></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }
    
    throw error;
  }
}

// Stale While Revalidate strategy for pages
async function handlePageRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  // Fetch from network in background
  const networkResponsePromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => {
    // Network failed, return cached version if available
    return cachedResponse;
  });
  
  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Otherwise wait for network
  try {
    return await networkResponsePromise;
  } catch (error) {
    // Return offline page
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Library Tracker - Offline</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f9fafb; }
            .offline-container { max-width: 400px; margin: 0 auto; }
            .offline-icon { font-size: 4rem; margin-bottom: 1rem; }
            h1 { color: #374151; margin-bottom: 1rem; }
            p { color: #6b7280; margin-bottom: 2rem; }
            button { background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; }
            button:hover { background: #1d4ed8; }
          </style>
        </head>
        <body>
          <div class="offline-container">
            <div class="offline-icon">📚</div>
            <h1>You're Offline</h1>
            <p>Library Tracker is not available right now. Please check your internet connection and try again.</p>
            <button onclick="window.location.reload()">Try Again</button>
          </div>
        </body>
      </html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync-books') {
    event.waitUntil(syncOfflineActions());
  }
});

// Sync offline actions when back online
async function syncOfflineActions() {
  try {
    // Get offline actions from IndexedDB
    const offlineActions = await getOfflineActions();
    
    for (const action of offlineActions) {
      try {
        await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body
        });
        
        // Remove successful action from offline queue
        await removeOfflineAction(action.id);
        
        console.log('Service Worker: Synced offline action:', action.id);
      } catch (error) {
        console.log('Service Worker: Failed to sync action:', action.id, error);
      }
    }
  } catch (error) {
    console.log('Service Worker: Background sync failed:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    body: 'Time for your daily reading session! 📚',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/dashboard'
    },
    actions: [
      {
        action: 'open',
        title: 'Open Library Tracker',
        icon: '/icons/icon-72x72.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/icon-72x72.png'
      }
    ]
  };
  
  if (event.data) {
    const data = event.data.json();
    options.body = data.body || options.body;
    options.data.url = data.url || options.data.url;
  }
  
  event.waitUntil(
    self.registration.showNotification('Library Tracker', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/dashboard')
    );
  }
});

// Message handling for app updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Helper functions for IndexedDB operations
async function getOfflineActions() {
  // This would integrate with IndexedDB
  // For now, return empty array
  return [];
}

async function removeOfflineAction(id) {
  // This would remove from IndexedDB
  console.log('Removing offline action:', id);
}
