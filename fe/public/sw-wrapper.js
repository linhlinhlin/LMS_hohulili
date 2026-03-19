/**
 * Service worker wrapper for offline media and Angular NGSW.
 *
 * Why:
 * - NGSW cannot directly serve our custom offline video/file caches.
 * - iPhone/Safari is especially sensitive to MP4 headers and byte ranges.
 * - We keep video responses explicit and stable before delegating everything
 *   else to Angular's generated service worker.
 */

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/offline-video/')) {
    event.respondWith(handleOfflineVideo(event.request));
    return;
  }

  if (url.pathname.startsWith('/offline-file/')) {
    event.respondWith(handleOfflineFile(event.request));
  }
});

async function handleOfflineVideo(request) {
  try {
    const cache = await caches.open('offline-videos');
    const requestUrl = new URL(request.url);
    const cachedResponse =
      await cache.match(request.url)
      || await cache.match(request)
      || await cache.match(requestUrl.pathname);

    if (!cachedResponse) {
      return new Response('Video not available offline', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    if (request.method === 'HEAD') {
      return new Response(null, {
        status: 200,
        headers: buildVideoResponseHeaders(cachedResponse, {
          'Content-Length': cachedResponse.headers.get('Content-Length') || '0',
        }),
      });
    }

    const rangeHeader = request.headers.get('Range');
    if (rangeHeader) {
      return handleRangeRequest(cachedResponse, rangeHeader);
    }

    return buildFullVideoResponse(cachedResponse);
  } catch {
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
  } catch {
    return new Response('Error loading offline file', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

async function handleRangeRequest(fullResponse, rangeHeader) {
  const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
  if (!match) {
    return buildFullVideoResponse(fullResponse);
  }

  const responseForRead = fullResponse.clone();
  const declaredLength = Number(fullResponse.headers.get('Content-Length')) || 0;

  const blobFallback = async () => {
    const blob = await responseForRead.blob();
    const totalSize = blob.size;
    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : totalSize - 1;
    const safeEnd = Math.min(end, totalSize - 1);
    const chunkSize = safeEnd - start + 1;

    if (start < 0 || start >= totalSize || chunkSize <= 0) {
      return new Response(null, {
        status: 416,
        headers: {
          'Content-Range': `bytes */${totalSize}`,
          'Accept-Ranges': 'bytes',
        },
      });
    }

    const slicedBlob = blob.slice(start, safeEnd + 1);
    return new Response(slicedBlob, {
      status: 206,
      headers: buildVideoResponseHeaders(fullResponse, {
        'Content-Length': String(chunkSize),
        'Content-Range': `bytes ${start}-${safeEnd}/${totalSize}`,
      }),
    });
  };

  if (!declaredLength || !responseForRead.body) {
    return blobFallback();
  }

  const start = parseInt(match[1], 10);
  const end = match[2] ? parseInt(match[2], 10) : declaredLength - 1;
  const safeEnd = Math.min(end, declaredLength - 1);
  const chunkSize = safeEnd - start + 1;

  if (start < 0 || start >= declaredLength || chunkSize <= 0) {
    return new Response(null, {
      status: 416,
      headers: {
        'Content-Range': `bytes */${declaredLength}`,
        'Accept-Ranges': 'bytes',
      },
    });
  }

  const reader = responseForRead.body.getReader();
  let currentOffset = 0;
  let remaining = chunkSize;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        while (remaining > 0) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          const chunkStart = currentOffset;
          const chunkEnd = currentOffset + value.byteLength - 1;
          currentOffset += value.byteLength;

          if (chunkEnd < start) {
            continue;
          }

          const sliceStart = Math.max(0, start - chunkStart);
          const sliceEndExclusive = Math.min(value.byteLength, safeEnd - chunkStart + 1);
          if (sliceEndExclusive > sliceStart) {
            const slice = value.slice(sliceStart, sliceEndExclusive);
            controller.enqueue(slice);
            remaining -= slice.byteLength;
          }

          if (remaining <= 0) {
            break;
          }
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      } finally {
        try {
          await reader.cancel();
        } catch {
          // Ignore cancellation errors after stream completion.
        }
      }
    },
    async cancel() {
      try {
        await reader.cancel();
      } catch {
        // Ignore cancellation errors when the browser aborts playback.
      }
    },
  });

  return new Response(stream, {
    status: 206,
    headers: buildVideoResponseHeaders(fullResponse, {
      'Content-Length': String(chunkSize),
      'Content-Range': `bytes ${start}-${safeEnd}/${declaredLength}`,
    }),
  });
}

async function buildFullVideoResponse(cachedResponse) {
  const responseForRead = cachedResponse.clone();
  const headers = buildVideoResponseHeaders(cachedResponse, {
    'Content-Length': cachedResponse.headers.get('Content-Length') || undefined,
  });

  if (responseForRead.body) {
    return new Response(responseForRead.body, {
      status: 200,
      headers,
    });
  }

  const blob = await responseForRead.blob();
  return new Response(blob, {
    status: 200,
    headers: buildVideoResponseHeaders(cachedResponse, {
      'Content-Length': String(blob.size),
    }),
  });
}

function buildVideoResponseHeaders(sourceResponse, overrides = {}) {
  const headers = {
    'Content-Type': sourceResponse.headers.get('Content-Type') || 'video/mp4',
    'Accept-Ranges': 'bytes',
    'Content-Disposition': 'inline',
    ...overrides,
  };

  Object.keys(headers).forEach((key) => {
    if (headers[key] == null || headers[key] === '') {
      delete headers[key];
    }
  });

  return headers;
}

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
    // Sync will be retried automatically by the browser.
  }
}

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

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

importScripts('./ngsw-worker.js');
