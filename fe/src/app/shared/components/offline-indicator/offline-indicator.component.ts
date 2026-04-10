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
      <!-- Persistent top banner when fully offline (Google OHS pattern) -->
      <div class="fixed left-0 right-0 z-[100] bg-red-600 text-white px-4 py-2 flex items-center justify-between shadow-md"
           [class.top-0]="!hasExpiredBanner()"
           [class.top-10]="hasExpiredBanner()"
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
    } @else if (isSlow()) {
      <!-- Slim inline banner for slow connection — not fixed, no overlay -->
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

  protected readonly isOffline = computed(() => this.network.connectionTier() === 'none');
  protected readonly isSlow = computed(() => this.network.connectionTier() === 'slow');
  protected readonly pendingSyncCount = computed(() => this.syncService.pendingCount());
  protected readonly hasExpiredBanner = computed(() => this.sessionService.showExpiredBanner());
}
