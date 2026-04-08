import { Injectable, signal } from '@angular/core';
import {
  ensureOfflineDbReady,
  isOfflineDbUnavailableError,
  isOfflinePersistenceSupported,
} from '../db/lms-offline.db';

@Injectable({ providedIn: 'root' })
export class OfflineFileService {
  private readonly offlineSupported = isOfflinePersistenceSupported();
  readonly totalBytes = signal(0);

  async downloadSectionFile(fileUrl: string, sectionId: string): Promise<string> {
    await this.ensureOfflineReady();

    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const cache = await caches.open('offline-files');
    await cache.put(`/offline-file/${sectionId}`, response);
    return `/offline-file/${sectionId}`;
  }

  async getSectionFileUrl(sectionId: string): Promise<string | null> {
    if (!(await this.ensureOfflineReady(true))) {
      return null;
    }

    const cache = await caches.open('offline-files');
    const response = await cache.match(`/offline-file/${sectionId}`);
    return response ? `/offline-file/${sectionId}` : null;
  }

  async deleteSectionFile(sectionId: string): Promise<void> {
    if (!(await this.ensureOfflineReady(true))) {
      return;
    }

    const cache = await caches.open('offline-files');
    await cache.delete(`/offline-file/${sectionId}`);
  }

  async refreshTotalBytes(): Promise<void> {
    if (!this.offlineSupported) {
      this.totalBytes.set(0);
      return;
    }
    try {
      const cache = await caches.open('offline-files');
      const keys = await cache.keys();
      let total = 0;
      for (const request of keys) {
        const response = await cache.match(request);
        if (!response) continue;
        let size = Number(response.headers.get('content-length')) || 0;
        if (size === 0) {
          try {
            const blob = await response.clone().blob();
            size = blob.size;
          } catch { /* ignore */ }
        }
        total += size;
      }
      this.totalBytes.set(total);
    } catch {
      this.totalBytes.set(0);
    }
  }

  private async ensureOfflineReady(optional = false): Promise<boolean> {
    if (!this.offlineSupported) {
      return false;
    }

    try {
      await ensureOfflineDbReady();
      return true;
    } catch (error) {
      if (!isOfflineDbUnavailableError(error)) {
        throw error;
      }

      if (!optional) {
        throw error;
      }

      return false;
    }
  }
}
