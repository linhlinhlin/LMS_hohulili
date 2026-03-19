import { HttpBackend, HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, effect, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { NetworkStatusService } from './network-status.service';
import { OfflineStorageTelemetryService } from './offline-storage-telemetry.service';
import type { OfflineStorageTelemetryEvent } from '../db/lms-offline.db';

const OFFLINE_STORAGE_TELEMETRY_ENDPOINT = `${environment.apiUrl}/api/v3/client-telemetry/offline-storage`;
const OFFLINE_STORAGE_SENT_EVENT_IDS_KEY = 'lms_offline_storage_sent_event_ids';
const OFFLINE_STORAGE_SENT_EVENT_IDS_LIMIT = 100;
const INGESTIBLE_EVENT_TYPES = new Set(['recreate-failed', 'disabled', 'manual-reset']);

@Injectable({ providedIn: 'root' })
export class OfflineStorageTelemetryIngestService {
  private readonly telemetry = inject(OfflineStorageTelemetryService);
  private readonly auth = inject(AuthService);
  private readonly network = inject(NetworkStatusService);
  private readonly http = new HttpClient(inject(HttpBackend));

  private readonly inflightIds = new Set<string>();
  private readonly sentIds = new Set<string>(this.readSentEventIds());

  constructor() {
    effect(() => {
      const events = this.telemetry.events();
      const isAuthenticated = this.auth.isAuthenticatedSignal();
      const isOnline = this.network.online();

      if (!isAuthenticated || !isOnline) {
        return;
      }

      for (const event of events) {
        if (!this.shouldSend(event)) {
          continue;
        }

        void this.sendEvent(event);
      }
    });
  }

  private shouldSend(event: OfflineStorageTelemetryEvent): boolean {
    return INGESTIBLE_EVENT_TYPES.has(event.type)
      && !this.sentIds.has(event.id)
      && !this.inflightIds.has(event.id)
      && !!this.auth.getToken();
  }

  private async sendEvent(event: OfflineStorageTelemetryEvent): Promise<void> {
    const token = this.auth.getToken();
    if (!token) {
      return;
    }

    this.inflightIds.add(event.id);

    try {
      await firstValueFrom(this.http.post(
        OFFLINE_STORAGE_TELEMETRY_ENDPOINT,
        {
          eventType: event.type,
          availability: event.availability,
          recoveryAction: event.recoveryAction,
          dbName: event.dbName,
          requiresRedownload: event.requiresRedownload,
          errorName: event.errorName,
          errorMessage: event.errorMessage,
          route: this.currentRoute(),
          userAgent: event.userAgent,
          platform: event.platform,
          connectionType: event.connectionType,
          occurredAt: event.timestamp,
          payload: {
            event,
            currentUrl: typeof location !== 'undefined' ? location.href : null,
          },
        },
        {
          headers: new HttpHeaders({
            Authorization: `Bearer ${token}`,
          }),
        },
      ));

      this.markAsSent(event.id);
    } catch {
      // Best-effort telemetry: do not block UX or surface noisy toasts.
    } finally {
      this.inflightIds.delete(event.id);
    }
  }

  private currentRoute(): string | null {
    if (typeof location === 'undefined') {
      return null;
    }
    return `${location.pathname}${location.search}`;
  }

  private readSentEventIds(): string[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    try {
      const raw = localStorage.getItem(OFFLINE_STORAGE_SENT_EVENT_IDS_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === 'string').slice(0, OFFLINE_STORAGE_SENT_EVENT_IDS_LIMIT)
        : [];
    } catch {
      return [];
    }
  }

  private markAsSent(id: string): void {
    this.sentIds.add(id);

    if (typeof localStorage === 'undefined') {
      return;
    }

    const next = Array.from(this.sentIds).slice(-OFFLINE_STORAGE_SENT_EVENT_IDS_LIMIT);
    localStorage.setItem(OFFLINE_STORAGE_SENT_EVENT_IDS_KEY, JSON.stringify(next));
  }
}
