import { Injectable } from '@angular/core';
import {
  ensureOfflineDbReady,
  isOfflineDbUnavailableError,
  isOfflinePersistenceSupported,
} from '../db/lms-offline.db';

@Injectable({ providedIn: 'root' })
export class OfflineFileService {
  private readonly offlineSupported = isOfflinePersistenceSupported();

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
