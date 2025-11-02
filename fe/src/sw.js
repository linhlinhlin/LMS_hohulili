// Service Worker for LMS Maritime PWA
const CACHE_NAME = 'lms-maritime-v1';
const STATIC_CACHE = 'lms-static-v1';
const DYNAMIC_CACHE = 'lms-dynamic-v1';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/manifest.webmanifest'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/courses/,
  /\/api\/lessons/,
  /\/api\/user\/profile/,
  /\/api\/assignments/
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Static files cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Error caching static files', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different types of requests
  if (request.destination === 'document') {
    // Handle page requests
    event.respondWith(handlePageRequest(request));
  } else if (request.destination === 'image') {
    // Handle image requests
    event.respondWith(handleImageRequest(request));
  } else if (url.pathname.startsWith('/api/')) {
    // Handle API requests
    event.respondWith(handleApiRequest(request));
  } else {
    // Handle other requests (CSS, JS, etc.)
    event.respondWith(handleOtherRequest(request));
  }
});

// Handle page requests with offline fallback
async function handlePageRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache', request.url);
    
    // Try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to offline page
    return caches.match('/offline.html') || new Response('Offline - No internet connection');
  }
}

// Handle image requests with cache-first strategy
async function handleImageRequest(request) {
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
    console.log('Service Worker: Image fetch failed', request.url);
    return new Response('Image not available offline', { status: 404 });
  }
}

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache API responses for offline use
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('API response not ok');
  } catch (error) {
    console.log('Service Worker: API network failed, trying cache', request.url);
    
    // Try cache for offline use
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline data or error
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'No internet connection. Please check your connection and try again.' 
      }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle other requests (CSS, JS, fonts, etc.)
async function handleOtherRequest(request) {
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
    console.log('Service Worker: Request failed', request.url);
    return new Response('Resource not available offline', { status: 404 });
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Handle background sync
async function doBackgroundSync() {
  try {
    // Sync offline actions when connection is restored
    console.log('Service Worker: Performing background sync');
    
    // Here you would sync offline actions like:
    // - Submitted assignments
    // - Chat messages
    // - Progress updates
    // - etc.
    
    console.log('Service Worker: Background sync completed');
  } catch (error) {
    console.error('Service Worker: Background sync failed', error);
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'Bạn có thông báo mới từ LMS Maritime',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Xem chi tiết',
        icon: '/assets/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Đóng',
        icon: '/assets/icons/xmark.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('LMS Maritime', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    // Open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle app updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Periodic background sync (if supported)
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'content-sync') {
      event.waitUntil(doPeriodicSync());
    }
  });
}

async function doPeriodicSync() {
  try {
    console.log('Service Worker: Performing periodic sync');
    
    // Sync content periodically
    // This could include:
    // - Course updates
    // - New assignments
    // - System announcements
    // - etc.
    
    console.log('Service Worker: Periodic sync completed');
  } catch (error) {
    console.error('Service Worker: Periodic sync failed', error);
  }
}