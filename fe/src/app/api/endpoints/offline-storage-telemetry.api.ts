import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../client/api-client';

export type OfflineStorageTelemetryEventType = 'recreate-failed' | 'disabled' | 'manual-reset';
export type OfflineStorageAvailability = 'ready' | 'recovering' | 'online-only';

export interface OfflineStorageTelemetryEntry {
  id: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  eventType: OfflineStorageTelemetryEventType;
  availability: OfflineStorageAvailability;
  recoveryAction: string;
  dbName: string;
  requiresRedownload: boolean;
  errorName: string | null;
  errorMessage: string | null;
  route: string | null;
  userAgent: string | null;
  platform: string | null;
  normalizedPlatform: string | null;
  browserFamily: string | null;
  connectionType: string | null;
  occurredAt: string;
  createdAt: string;
  payload: Record<string, unknown> | null;
}

export interface OfflineStorageTelemetryPage {
  content: OfflineStorageTelemetryEntry[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface OfflineStorageTelemetryBucket {
  label: string;
  count: number;
}

export interface OfflineStorageTelemetryDailyTrend {
  date: string;
  totalCount: number;
  disabledCount: number;
  manualResetCount: number;
  recreateFailedCount: number;
}

export interface OfflineStorageTelemetryAnalytics {
  days: number;
  since: string;
  totalEvents: number;
  affectedUsers: number;
  requiresRedownloadCount: number;
  byEventType: Record<string, number>;
  byAvailability: Record<string, number>;
  dailyTrend: OfflineStorageTelemetryDailyTrend[];
  topRoutes: OfflineStorageTelemetryBucket[];
  topPlatforms: OfflineStorageTelemetryBucket[];
  topBrowsers: OfflineStorageTelemetryBucket[];
}

export interface OfflineStorageTelemetryQuery {
  page?: number;
  size?: number;
  eventType?: OfflineStorageTelemetryEventType | '';
  search?: string;
}

export interface OfflineStorageTelemetryAnalyticsQuery {
  days?: number;
  eventType?: OfflineStorageTelemetryEventType | '';
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class OfflineStorageTelemetryApi {
  private readonly apiClient = inject(ApiClient);

  getLogs(query: OfflineStorageTelemetryQuery = {}) {
    const params = new URLSearchParams();
    params.set('page', String(query.page ?? 0));
    params.set('size', String(query.size ?? 20));

    if (query.eventType) {
      params.set('eventType', query.eventType);
    }
    if (query.search?.trim()) {
      params.set('search', query.search.trim());
    }

    return this.apiClient.getWithResponse<OfflineStorageTelemetryPage>(
      `/api/v3/admin/client-telemetry/offline-storage?${params.toString()}`,
    );
  }

  getAnalytics(query: OfflineStorageTelemetryAnalyticsQuery = {}) {
    const params = new URLSearchParams();
    params.set('days', String(query.days ?? 7));

    if (query.eventType) {
      params.set('eventType', query.eventType);
    }
    if (query.search?.trim()) {
      params.set('search', query.search.trim());
    }

    return this.apiClient.getWithResponse<OfflineStorageTelemetryAnalytics>(
      `/api/v3/admin/client-telemetry/offline-storage/analytics?${params.toString()}`,
    );
  }
}
