import { Injectable } from '@angular/core';
import {
  getOfflineStorageHealthSnapshot,
  resetOfflineStorage,
  type OfflineStorageAvailability,
} from '../db/lms-offline.db';

export interface PwaRepairResult {
  unregisteredServiceWorkers: number;
  clearedCaches: number;
  offlineResetSucceeded: boolean;
  offlineAvailability: OfflineStorageAvailability;
  requiresManualSiteDataClear: boolean;
}

@Injectable({ providedIn: 'root' })
export class PwaRepairService {
  async repairRuntime(): Promise<PwaRepairResult> {
    const unregisteredServiceWorkers = await this.unregisterServiceWorkers();
    const clearedCaches = await this.clearRelevantCaches();
    this.clearSoftRuntimeFlags();

    let offlineResetSucceeded = false;
    try {
      await resetOfflineStorage();
      offlineResetSucceeded = true;
    } catch (error) {
      console.warn('[PWA] Advanced runtime repair could not reopen offline storage.', error);
    }

    const snapshot = getOfflineStorageHealthSnapshot();
    return {
      unregisteredServiceWorkers,
      clearedCaches,
      offlineResetSucceeded,
      offlineAvailability: snapshot.availability,
      requiresManualSiteDataClear: snapshot.availability === 'online-only',
    };
  }

  reloadApp(returnUrl?: string | null): void {
    if (typeof location === 'undefined') {
      return;
    }

    location.href = returnUrl && returnUrl.startsWith('/')
      ? returnUrl
      : '/';
  }

  private async unregisterServiceWorkers(): Promise<number> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return 0;
    }

    const registrations = await navigator.serviceWorker.getRegistrations();
    const results = await Promise.all(
      registrations.map((registration) => registration.unregister().catch(() => false)),
    );

    return results.filter(Boolean).length;
  }

  private async clearRelevantCaches(): Promise<number> {
    if (typeof caches === 'undefined') {
      return 0;
    }

    const cacheNames = await caches.keys();
    const targetNames = cacheNames.filter((name) =>
      name.startsWith('ngsw:')
      || name === 'offline-videos'
      || name === 'offline-files'
      || name.startsWith('offline-'),
    );

    const results = await Promise.all(targetNames.map((name) => caches.delete(name).catch(() => false)));
    return results.filter(Boolean).length;
  }

  private clearSoftRuntimeFlags(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.removeItem('pwa-ready-shown');

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('learning_progress_') ||
        key.startsWith('learning_completed_sections_')
      )) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  }
}
