import { Injectable, signal } from '@angular/core';
import {
  clearOfflineStorageTelemetryEvents,
  getOfflineStorageHealthSnapshot,
  getOfflineStorageTelemetryEvents,
  subscribeOfflineStorageTelemetry,
  type OfflineStorageTelemetryEvent,
} from '../db/lms-offline.db';

@Injectable({ providedIn: 'root' })
export class OfflineStorageTelemetryService {
  readonly events = signal<OfflineStorageTelemetryEvent[]>(getOfflineStorageTelemetryEvents());

  constructor() {
    subscribeOfflineStorageTelemetry((events) => {
      this.events.set(events);
    });
  }

  buildDiagnosticsReport(): string {
    const payload = {
      generatedAt: new Date().toISOString(),
      currentUrl: typeof location !== 'undefined' ? location.href : null,
      health: getOfflineStorageHealthSnapshot(),
      events: this.events(),
    };

    return JSON.stringify(payload, null, 2);
  }

  async copyDiagnostics(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      return false;
    }

    await navigator.clipboard.writeText(this.buildDiagnosticsReport());
    return true;
  }

  clearDiagnostics(): void {
    clearOfflineStorageTelemetryEvents();
  }
}
