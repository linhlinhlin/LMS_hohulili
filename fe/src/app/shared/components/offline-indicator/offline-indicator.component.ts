import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NetworkStatusService } from '../../../core/services/network-status.service';
import { OfflineSyncService } from '../../../core/services/offline-sync.service';
import { SessionExpiredService } from '../../../core/services/session-expired.service';

@Component({
  selector: 'app-offline-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    @if (isOffline()) {
      <div class="bg-red-600 text-white px-4 py-2 flex items-center justify-between shadow-md"
           role="alert"
           aria-live="assertive">
        <div class="flex items-center gap-3">
          <span class="inline-block w-2.5 h-2.5 rounded-full bg-red-300 animate-pulse"></span>
          <span class="text-sm font-semibold">Ngoại tuyến</span>
          @if (pendingSyncCount() > 0) {
            <span class="text-xs bg-red-700 px-2 py-0.5 rounded-full">
              {{ pendingSyncCount() }} mục chờ đồng bộ
            </span>
          }
        </div>
        <a routerLink="/offline"
           class="text-xs underline hover:text-red-200 transition-colors">
          Khóa học đã tải
        </a>
      </div>
    } @else if (isSyncing()) {
      <div class="flex items-center justify-center gap-2 px-3 py-1 bg-blue-50 border-b border-blue-200 text-blue-700"
           role="status"
           aria-live="polite">
        <span class="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
        <span class="text-xs font-medium">Đang đồng bộ dữ liệu...</span>
      </div>
    } @else if (isSlow()) {
      <div class="flex items-center justify-center gap-2 px-3 py-1 bg-amber-50 border-b border-amber-200 text-amber-700"
           role="status"
           aria-live="polite">
        <span class="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
        <span class="text-xs font-medium">{{ network.connectionLabel() }}</span>
      </div>
    }
  `,
})
export class OfflineIndicatorComponent {
  protected readonly network = inject(NetworkStatusService);
  private readonly syncService = inject(OfflineSyncService);
  private readonly sessionService = inject(SessionExpiredService);

  // Multi-strategy offline detection:
  // 1. connectionTier === 'none' (from NetworkStatusService)
  // 2. navigator.onLine === false (fallback)
  protected readonly isOffline = computed(() => {
    const tier = this.network.connectionTier();
    if (tier === 'none') return true;
    // Additional safety check: if navigator.onLine is false, treat as offline
    // even if our probe thinks otherwise
    if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
    return false;
  });
  protected readonly isSyncing = computed(() => !this.isOffline() && this.syncService.isSyncing());
  protected readonly isSlow = computed(() => this.network.connectionTier() === 'slow');
  protected readonly pendingSyncCount = computed(() => this.syncService.pendingCount());
  protected readonly hasExpiredBanner = computed(() => this.sessionService.showExpiredBanner());

  constructor() {
    // Log network status changes for debugging
    if (typeof window !== 'undefined') {
      const logStatus = () => {
        console.log('[PWA] Network Status:', {
          online: this.network.online(),
          tier: this.network.connectionTier(),
          navigatorOnLine: navigator.onLine,
          timestamp: new Date().toISOString()
        });
      };
      logStatus();
      window.addEventListener('online', () => {
        console.log('[PWA] Network: online event fired');
        logStatus();
      });
      window.addEventListener('offline', () => {
        console.log('[PWA] Network: offline event fired');
        logStatus();
      });
    }
  }
}
