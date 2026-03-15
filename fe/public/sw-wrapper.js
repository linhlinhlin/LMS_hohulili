/**
 * Service Worker Wrapper — handles offline video playback + delegates to NGSW.
 *
 * Why: NGSW cannot serve videos from our custom 'offline-videos' cache.
 * This wrapper intercepts /offline-video/* requests and streams directly
 * from Cache API (zero RAM), then lets NGSW handle everything else.
 *
 * Registration order matters: our fetch listener runs BEFORE NGSW's
 * because it's registered before importScripts('ngsw-worker.js').
 */

// Handle offline video requests BEFORE NGSW gets them
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/offline-video/')) {
    event.respondWith(handleOfflineVideo(event.request));
    return;
  }

  if (url.pathname.startsWith('/offline-file/')) {
    event.respondWith(handleOfflineFile(event.request));
    return;
  }
});

/**
 * Serve video from 'offline-videos' cache.
 * Supports HTTP Range requests for seeking in <video> elements.
 */
async function handleOfflineVideo(request) {
  try {
    const cache = await caches.open('offline-videos');
    const cachedResponse = await cache.match(request.url);

    if (!cachedResponse) {
      return new Response('Video not available offline', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Handle Range requests (video seeking)
    const rangeHeader = request.headers.get('Range');
    if (rangeHeader) {
      return handleRangeRequest(cachedResponse, rangeHeader);
    }

    // Full response — browser streams chunk-by-chunk from disk cache
    return cachedResponse;
  } catch (error) {
    return new Response('Error loading offline video', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

async function handleOfflineFile(request) {
  try {
    const cache = await caches.open('offline-files');
    const cachedResponse = await cache.match(request.url);

    if (!cachedResponse) {
      return new Response('File not available offline', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    return cachedResponse;
  } catch (error) {
    return new Response('Error loading offline file', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

/**
 * Handle HTTP Range requests for video seeking.
 * Browsers send Range headers when user seeks in <video>.
 */
async function handleRangeRequest(fullResponse, rangeHeader) {
  const blob = await fullResponse.blob();
  const totalSize = blob.size;

  // Parse Range header: "bytes=start-end"
  const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
  if (!match) {
    return new Response(blob, {
      status: 200,
      headers: {
        'Content-Type': fullResponse.headers.get('Content-Type') || 'video/mp4',
        'Content-Length': String(totalSize),
        'Accept-Ranges': 'bytes',
      },
    });
  }

  const start = parseInt(match[1], 10);
  const end = match[2] ? parseInt(match[2], 10) : totalSize - 1;
  const chunkSize = end - start + 1;

  const slicedBlob = blob.slice(start, end + 1);

  return new Response(slicedBlob, {
    status: 206,
    headers: {
      'Content-Type': fullResponse.headers.get('Content-Type') || 'video/mp4',
      'Content-Length': String(chunkSize),
      'Content-Range': `bytes ${start}-${end}/${totalSize}`,
      'Accept-Ranges': 'bytes',
    },
  });
}

// ─── Background Sync ─────────────────────────────────────────────────────────
// Fires when device comes back online after offline mutations were queued.
// OfflineSyncService registers 'lms-offline-sync' tag via SyncManager API.
self.addEventListener('sync', (event) => {
  if (event.tag === 'lms-offline-sync') {
    event.waitUntil(notifyClientsToSync());
  }
});

async function notifyClientsToSync() {
  try {
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
      client.postMessage({ type: 'SYNC_OFFLINE_QUEUE' });
    }
  } catch {
    // Sync will be retried automatically by the browser
  }
}

// ─── Push Notifications ───────────────────────────────────────────────────────
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
      { action: 'close', title: 'Đóng' },
    ],
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'LMS Maritime', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action !== 'close') {
    const url = event.notification.data?.url || '/';
    event.waitUntil(self.clients.openWindow(url));
  }
});

// Handle skip-waiting from Angular app (SW update flow)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Delegate everything else to Angular NGSW
importScripts('./ngsw-worker.js');
