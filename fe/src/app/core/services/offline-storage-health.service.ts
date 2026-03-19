import { Injectable, signal } from '@angular/core';
import {
  getOfflineStorageHealthSnapshot,
  resetOfflineStorage,
  subscribeOfflineStorageHealth,
  type OfflineStorageHealthSnapshot,
} from '../db/lms-offline.db';

@Injectable({ providedIn: 'root' })
export class OfflineStorageHealthService {
  readonly status = signal<OfflineStorageHealthSnapshot>(getOfflineStorageHealthSnapshot());

  constructor() {
    subscribeOfflineStorageHealth((snapshot) => {
      this.status.set(snapshot);
    });
  }

  async resetOfflineStorage(): Promise<OfflineStorageHealthSnapshot> {
    await resetOfflineStorage();
    return this.status();
  }
}
