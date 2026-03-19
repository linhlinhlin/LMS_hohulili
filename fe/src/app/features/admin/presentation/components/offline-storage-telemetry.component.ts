import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  OfflineStorageTelemetryApi,
  OfflineStorageTelemetryAnalytics,
  OfflineStorageTelemetryBucket,
  OfflineStorageTelemetryDailyTrend,
  OfflineStorageTelemetryEntry,
  OfflineStorageTelemetryEventType,
} from '../../../../api/endpoints/offline-storage-telemetry.api';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-offline-storage-telemetry',
  imports: [CommonModule, FormsModule],
  templateUrl: './offline-storage-telemetry.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfflineStorageTelemetryComponent {
  private readonly telemetryApi = inject(OfflineStorageTelemetryApi);
  private readonly toast = inject(ToastService);

  readonly logs = signal<OfflineStorageTelemetryEntry[]>([]);
  readonly isLoading = signal(false);
  readonly isAnalyticsLoading = signal(false);
  readonly currentPage = signal(0);
  readonly pageSize = signal(20);
  readonly totalElements = signal(0);
  readonly totalPages = signal(0);
  readonly expandedId = signal<string | null>(null);
  readonly analyticsWindowDays = signal(7);
  readonly analytics = signal<OfflineStorageTelemetryAnalytics | null>(null);

  readonly search = signal('');
  readonly eventType = signal<OfflineStorageTelemetryEventType | ''>('');

  readonly totalMatches = computed(() => this.totalElements());
  readonly hasFilters = computed(() => !!this.search().trim() || !!this.eventType());
  readonly summaryTotalEvents = computed(() => this.analytics()?.totalEvents ?? 0);
  readonly summaryAffectedUsers = computed(() => this.analytics()?.affectedUsers ?? 0);
  readonly summaryDisabled = computed(() => this.analytics()?.byEventType?.['disabled'] ?? 0);
  readonly summaryOnlineOnly = computed(() => this.analytics()?.byAvailability?.['online-only'] ?? 0);
  readonly summaryRequiresRedownload = computed(() => this.analytics()?.requiresRedownloadCount ?? 0);
  readonly topRoutes = computed(() => this.analytics()?.topRoutes ?? []);
  readonly topPlatforms = computed(() => this.analytics()?.topPlatforms ?? []);
  readonly topBrowsers = computed(() => this.analytics()?.topBrowsers ?? []);
  readonly dailyTrend = computed(() => this.analytics()?.dailyTrend ?? []);
  readonly maxTrendCount = computed(() =>
    Math.max(1, ...this.dailyTrend().map(item => item.totalCount ?? 0))
  );

  constructor() {
    this.loadPage();
  }

  loadPage(): void {
    this.loadLogs();
    this.loadAnalytics();
  }

  loadLogs(): void {
    this.isLoading.set(true);

    this.telemetryApi.getLogs({
      page: this.currentPage(),
      size: this.pageSize(),
      eventType: this.eventType(),
      search: this.search(),
    }).subscribe({
      next: (response) => {
        const page = response.data;
        this.logs.set(page?.content ?? []);
        this.totalElements.set(page?.totalElements ?? 0);
        this.totalPages.set(page?.totalPages ?? 0);
        this.isLoading.set(false);
      },
      error: () => {
        this.logs.set([]);
        this.totalElements.set(0);
        this.totalPages.set(0);
        this.isLoading.set(false);
        this.toast.error('Không thể tải telemetry bộ nhớ ngoại tuyến.');
      },
    });
  }

  loadAnalytics(): void {
    this.isAnalyticsLoading.set(true);

    this.telemetryApi.getAnalytics({
      days: this.analyticsWindowDays(),
      eventType: this.eventType(),
      search: this.search(),
    }).subscribe({
      next: (response) => {
        this.analytics.set(response.data ?? null);
        this.isAnalyticsLoading.set(false);
      },
      error: () => {
        this.analytics.set(null);
        this.isAnalyticsLoading.set(false);
        this.toast.error('Không thể tải analytics bộ nhớ ngoại tuyến.');
      },
    });
  }

  applyFilters(): void {
    this.currentPage.set(0);
    this.expandedId.set(null);
    this.loadPage();
  }

  resetFilters(): void {
    this.search.set('');
    this.eventType.set('');
    this.applyFilters();
  }

  refresh(): void {
    this.expandedId.set(null);
    this.loadPage();
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages()) {
      return;
    }

    this.currentPage.set(page);
    this.expandedId.set(null);
    this.loadLogs();
  }

  setAnalyticsWindow(days: number): void {
    this.analyticsWindowDays.set(days);
    this.loadAnalytics();
  }

  toggleDetail(id: string): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  async copyPayload(entry: OfflineStorageTelemetryEntry): Promise<void> {
    if (!entry.payload) {
      this.toast.info('Bản ghi này không có payload chẩn đoán.');
      return;
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(entry.payload, null, 2));
      this.toast.success('Đã sao chép payload chẩn đoán.');
    } catch {
      this.toast.error('Không thể sao chép payload.');
    }
  }

  badgeClass(eventType: OfflineStorageTelemetryEventType): string {
    switch (eventType) {
      case 'disabled':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'manual-reset':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'recreate-failed':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  }

  availabilityClass(value: string): string {
    switch (value) {
      case 'ready':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'recovering':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'online-only':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  }

  recoveryLabel(value: string): string {
    switch (value) {
      case 'recreated-db':
        return 'Tạo lại DB';
      case 'rotated-db':
        return 'Đổi DB mới';
      case 'manual-reset':
        return 'Reset thủ công';
      default:
        return 'Không';
    }
  }

  formatPayload(payload: Record<string, unknown> | null): string {
    return payload ? JSON.stringify(payload, null, 2) : '{}';
  }

  formatUser(log: OfflineStorageTelemetryEntry): string {
    if (log.userName && log.userEmail) {
      return `${log.userName} (${log.userEmail})`;
    }
    return log.userEmail ?? log.userId;
  }

  trendBarWidth(item: OfflineStorageTelemetryDailyTrend): number {
    return Math.max(6, Math.round((item.totalCount / this.maxTrendCount()) * 100));
  }

  bucketBarWidth(item: OfflineStorageTelemetryBucket, max: number): number {
    return Math.max(8, Math.round((item.count / Math.max(1, max)) * 100));
  }

  topRouteMax(): number {
    return Math.max(1, ...this.topRoutes().map(item => item.count));
  }

  topPlatformMax(): number {
    return Math.max(1, ...this.topPlatforms().map(item => item.count));
  }

  topBrowserMax(): number {
    return Math.max(1, ...this.topBrowsers().map(item => item.count));
  }
}
