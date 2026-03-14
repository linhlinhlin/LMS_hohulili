import { Injectable, signal } from '@angular/core';
import { ensureOfflineDbReady, isOfflinePersistenceSupported, offlineDb, getCurrentUserId } from '../db/lms-offline.db';

export interface OfflineVideoEntry {
  lessonId: string;
  title: string;
  sizeBytes: number;
  downloadedAt: Date;
}

@Injectable({ providedIn: 'root' })
export class OfflineVideoService {
  readonly downloads = signal<OfflineVideoEntry[]>([]);
  readonly downloadProgress = signal<Map<string, number>>(new Map());
  readonly isDownloading = signal(false);
  private readonly offlineSupported = isOfflinePersistenceSupported();

  constructor() {
    if (!this.offlineSupported) {
      return;
    }
    void this.refreshList().catch((error) => {
      console.error('[OfflineVideoService] Failed to initialize offline video list:', error);
    });
  }

  /**
   * Download video and stream directly to Cache API (zero RAM accumulation).
   * Google Kino PWA pattern: ReadableStream -> Cache API pipe.
   */
  async downloadVideo(videoUrl: string, lessonId: string, title: string): Promise<void> {
    if (this.isDownloading()) return;
    this.isDownloading.set(true);

    try {
      await ensureOfflineDbReady();
      const response = await fetch(videoUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body?.getReader();
      const contentLength = Number(response.headers.get('content-length')) || 0;
      const contentType = response.headers.get('content-type') || 'video/mp4';

      if (!reader) throw new Error('No readable stream');

      let received = 0;

      // Create a ReadableStream that tracks progress without accumulating chunks in RAM
      const progressStream = new ReadableStream({
        pull: async (controller) => {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            return;
          }

          received += value.length;
          controller.enqueue(value);

          if (contentLength > 0) {
            this.downloadProgress.update(map => {
              const newMap = new Map(map);
              newMap.set(lessonId, Math.round((received / contentLength) * 100));
              return newMap;
            });
          }
        },
        cancel: () => {
          reader.cancel();
        },
      });

      // Write directly to Cache API — zero RAM accumulation
      const cache = await caches.open('offline-videos');
      const cacheResponse = new Response(progressStream, {
        headers: {
          'Content-Type': contentType,
          ...(contentLength > 0 ? { 'Content-Length': String(contentLength) } : {}),
        },
      });
      await cache.put(`/offline-video/${lessonId}`, cacheResponse);

      // Update IndexedDB lesson record (compound primary key: [userId, lessonId])
      const userId = getCurrentUserId();
      const existingLesson = await offlineDb.lessons.get([userId, lessonId]);
      if (existingLesson) {
        await offlineDb.lessons.update([userId, lessonId], {
          videoOfflineUri: `cache:${lessonId}`,
          downloadedAt: new Date(),
        });
      }

      this.downloadProgress.update(map => {
        const newMap = new Map(map);
        newMap.delete(lessonId);
        return newMap;
      });

      await this.refreshList();
    } finally {
      this.isDownloading.set(false);
    }
  }

  /**
   * Get video URL for offline playback.
   *
   * Returns a virtual path `/offline-video/{lessonId}` that the SW wrapper
   * intercepts and serves directly from Cache API. The browser streams
   * chunk-by-chunk from disk — zero RAM usage. Supports Range requests
   * for seeking.
   *
   * OOM FIX: Previously this loaded the entire video blob into RAM via
   * response.blob() + URL.createObjectURL(). A 500MB video = 500MB RAM = crash.
   */
  async getVideoUrl(lessonId: string): Promise<string | null> {
    await ensureOfflineDbReady();
    // Verify lesson belongs to current user before serving video
    const userId = getCurrentUserId();
    const lesson = await offlineDb.lessons.get([userId, lessonId]);
    if (!lesson) return null;

    // Verify video actually exists in cache
    const cache = await caches.open('offline-videos');
    const response = await cache.match(`/offline-video/${lessonId}`);
    if (!response) return null;

    // Return virtual path — SW wrapper serves from Cache API (zero RAM)
    return `/offline-video/${lessonId}`;
  }

  async deleteVideo(lessonId: string): Promise<void> {
    await ensureOfflineDbReady();
    const cache = await caches.open('offline-videos');
    await cache.delete(`/offline-video/${lessonId}`);

    const userId = getCurrentUserId();
    const lesson = await offlineDb.lessons.get([userId, lessonId]);
    if (lesson) {
      await offlineDb.lessons.update([userId, lessonId], { videoOfflineUri: undefined });
    }

    await this.refreshList();
  }

  isAvailableOffline(lessonId: string): boolean {
    return this.downloads().some(d => d.lessonId === lessonId);
  }

  async refreshList(): Promise<void> {
    await ensureOfflineDbReady();
    try {
      const cache = await caches.open('offline-videos');
      const keys = await cache.keys();
      const entries: OfflineVideoEntry[] = [];
      const userId = getCurrentUserId();

      for (const request of keys) {
        const url = new URL(request.url);
        const lessonId = url.pathname.replace('/offline-video/', '');
        const response = await cache.match(request);
        if (!response) continue;

        // Use Content-Length header to avoid loading blob into RAM
        const sizeBytes = Number(response.headers.get('content-length')) || 0;
        const lesson = await offlineDb.lessons.get([userId, lessonId]);
        if (!lesson) continue;

        entries.push({
          lessonId,
          title: lesson?.title || lessonId,
          sizeBytes,
          downloadedAt: lesson?.downloadedAt || new Date(),
        });
      }

      this.downloads.set(entries);
    } catch {
      // Cache API not available
    }
  }
}
