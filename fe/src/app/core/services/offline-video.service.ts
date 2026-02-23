import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { offlineDb } from '../db/lms-offline.db';

export interface OfflineVideoEntry {
  lessonId: string;
  title: string;
  sizeBytes: number;
  downloadedAt: Date;
  blobUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class OfflineVideoService {
  private readonly http = inject(HttpClient);

  readonly downloads = signal<OfflineVideoEntry[]>([]);
  readonly downloadProgress = signal<Map<string, number>>(new Map());
  readonly isDownloading = signal(false);

  constructor() {
    this.refreshList();
  }

  async downloadVideo(videoUrl: string, lessonId: string, title: string): Promise<void> {
    if (this.isDownloading()) return;
    this.isDownloading.set(true);

    try {
      const response = await fetch(videoUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body?.getReader();
      const contentLength = Number(response.headers.get('content-length')) || 0;

      if (!reader) throw new Error('No readable stream');

      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        received += value.length;

        if (contentLength > 0) {
          this.downloadProgress.update(map => {
            const newMap = new Map(map);
            newMap.set(lessonId, Math.round((received / contentLength) * 100));
            return newMap;
          });
        }
      }

      const blob = new Blob(chunks as BlobPart[], { type: 'video/mp4' });

      // Store in IndexedDB via lesson record
      const existingLesson = await offlineDb.lessons.get(lessonId);
      if (existingLesson) {
        await offlineDb.lessons.update(lessonId, {
          videoOfflineUri: `blob:${lessonId}`,
          downloadedAt: new Date(),
        });
      }

      // Also store blob directly in a dedicated store for large files
      await this.storeBlobInCache(lessonId, blob);

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

  async getVideoUrl(lessonId: string): Promise<string | null> {
    const cache = await caches.open('offline-videos');
    const response = await cache.match(`/offline-video/${lessonId}`);
    if (!response) return null;

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  async deleteVideo(lessonId: string): Promise<void> {
    const cache = await caches.open('offline-videos');
    await cache.delete(`/offline-video/${lessonId}`);

    const lesson = await offlineDb.lessons.get(lessonId);
    if (lesson) {
      await offlineDb.lessons.update(lessonId, { videoOfflineUri: undefined });
    }

    await this.refreshList();
  }

  isAvailableOffline(lessonId: string): boolean {
    return this.downloads().some(d => d.lessonId === lessonId);
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

        const blob = await response.blob();
        const lesson = await offlineDb.lessons.get(lessonId);

        entries.push({
          lessonId,
          title: lesson?.title || lessonId,
          sizeBytes: blob.size,
          downloadedAt: lesson?.downloadedAt || new Date(),
        });
      }

      this.downloads.set(entries);
    } catch {
      // Cache API not available
    }
  }

  private async storeBlobInCache(lessonId: string, blob: Blob): Promise<void> {
    const cache = await caches.open('offline-videos');
    const response = new Response(blob, {
      headers: { 'Content-Type': blob.type, 'Content-Length': String(blob.size) },
    });
    await cache.put(`/offline-video/${lessonId}`, response);
  }
}
