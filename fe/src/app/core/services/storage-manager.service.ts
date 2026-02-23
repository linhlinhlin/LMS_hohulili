import { Injectable, signal } from '@angular/core';

export interface StorageEstimate {
  usedBytes: number;
  quotaBytes: number;
  percentUsed: number;
}

@Injectable({ providedIn: 'root' })
export class StorageManagerService {
  readonly estimate = signal<StorageEstimate>({ usedBytes: 0, quotaBytes: 0, percentUsed: 0 });
  readonly isPersisted = signal(false);

  constructor() {
    if (typeof navigator !== 'undefined') {
      this.refresh();
      this.checkPersistence();
    }
  }

  async refresh(): Promise<StorageEstimate> {
    if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
      return this.estimate();
    }

    const est = await navigator.storage.estimate();
    const used = est.usage ?? 0;
    const quota = est.quota ?? 0;
    const result: StorageEstimate = {
      usedBytes: used,
      quotaBytes: quota,
      percentUsed: quota > 0 ? (used / quota) * 100 : 0,
    };
    this.estimate.set(result);
    return result;
  }

  async requestPersistence(): Promise<boolean> {
    if (!('storage' in navigator) || !('persist' in navigator.storage)) {
      return false;
    }
    const granted = await navigator.storage.persist();
    this.isPersisted.set(granted);
    return granted;
  }

  private async checkPersistence(): Promise<void> {
    if (!('storage' in navigator) || !('persisted' in navigator.storage)) return;
    const persisted = await navigator.storage.persisted();
    this.isPersisted.set(persisted);
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
  }
}
