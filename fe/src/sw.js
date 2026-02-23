// Companion Service Worker for LMS Maritime PWA
// NOTE: Caching is handled by Angular's ngsw-worker.js (via ngsw-config.json)
// This file only handles Background Sync and Push Notifications

// Background sync for offline mutations
self.addEventListener('sync', (event) => {
  if (event.tag === 'lms-offline-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Notify the Angular app to trigger OfflineSyncService.syncAll()
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
      client.postMessage({ type: 'SYNC_OFFLINE_QUEUE' });
    }
  } catch (error) {
    // Sync will retry automatically
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'Bạn có thông báo mới từ LMS Maritime',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'Xem chi tiết' },
      { action: 'close', title: 'Đóng' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'LMS Maritime', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action !== 'close') {
    const url = event.notification.data?.url || '/';
    event.waitUntil(self.clients.openWindow(url));
  }
});

// Handle skip-waiting message from Angular app
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
