import { Injectable, signal } from '@angular/core';
import { offlineDb } from '../db/lms-offline.db';

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

  /** Track blob URLs to revoke them and prevent memory leaks */
  private readonly blobUrls = new Map<string, string>();

  constructor() {
    this.refreshList();
  }

  /**
   * Download video and stream directly to Cache API (zero RAM accumulation).
   * Google Kino PWA pattern: ReadableStream → Cache API pipe.
   */
  async downloadVideo(videoUrl: string, lessonId: string, title: string): Promise<void> {
    if (this.isDownloading()) return;
    this.isDownloading.set(true);

    try {
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

      // Update IndexedDB lesson record
      const existingLesson = await offlineDb.lessons.get(lessonId);
      if (existingLesson) {
        await offlineDb.lessons.update(lessonId, {
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
   * Get video URL from Cache API.
   * Revokes previous blob URL for same lesson to prevent memory leaks.
   */
  async getVideoUrl(lessonId: string): Promise<string | null> {
    const cache = await caches.open('offline-videos');
    const response = await cache.match(`/offline-video/${lessonId}`);
    if (!response) return null;

    // Defer revoke of previous blob URL to allow video player to finish streaming
    const previousUrl = this.blobUrls.get(lessonId);
    if (previousUrl) {
      setTimeout(() => URL.revokeObjectURL(previousUrl), 500);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    this.blobUrls.set(lessonId, url);
    return url;
  }

  async deleteVideo(lessonId: string): Promise<void> {
    const cache = await caches.open('offline-videos');
    await cache.delete(`/offline-video/${lessonId}`);

    // Revoke blob URL if exists
    const blobUrl = this.blobUrls.get(lessonId);
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      this.blobUrls.delete(lessonId);
    }

    const lesson = await offlineDb.lessons.get(lessonId);
    if (lesson) {
      await offlineDb.lessons.update(lessonId, { videoOfflineUri: undefined });
    }

    await this.refreshList();
  }

  isAvailableOffline(lessonId: string): boolean {
    return this.downloads().some(d => d.lessonId === lessonId);
  }

  /** Revoke all blob URLs (cleanup on service destroy) */
  revokeAllUrls(): void {
    for (const url of this.blobUrls.values()) {
      URL.revokeObjectURL(url);
    }
    this.blobUrls.clear();
  }

  async refreshList(): Promise<void> {
    try {
      const cache = await caches.open('offline-videos');
      const keys = await cache.keys();
      const entries: OfflineVideoEntry[] = [];

      for (const request of keys) {
        const url = new URL(request.url);
        const lessonId = url.pathname.replace('/offline-video/', '');
        const response = await cache.match(request);
        if (!response) continue;

        // Use Content-Length header to avoid loading blob into RAM
        const sizeBytes = Number(response.headers.get('content-length')) || 0;
        const lesson = await offlineDb.lessons.get(lessonId);

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
