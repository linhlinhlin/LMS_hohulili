import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NetworkStatusService } from '../../../core/services/network-status.service';
import { OfflineSyncService } from '../../../core/services/offline-sync.service';

@Component({
  selector: 'app-offline-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    @if (isOffline()) {
      <!-- Persistent top banner when fully offline (Google OHS pattern) -->
      <div class="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white px-4 py-2 flex items-center justify-between shadow-md"
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
      <!-- Corner pill for slow connection -->
      <div class="fixed top-3 right-3 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full shadow-md text-white bg-amber-600 transition-all duration-300"
           role="status"
           aria-live="polite">
        <span class="inline-block w-2 h-2 rounded-full bg-amber-300 animate-pulse"></span>
        <span class="text-xs font-medium">{{ network.connectionLabel() }}</span>
      </div>
    }
  `,
})
export class OfflineIndicatorComponent {
  protected readonly network = inject(NetworkStatusService);
  private readonly syncService = inject(OfflineSyncService);

  protected readonly isOffline = computed(() => this.network.connectionTier() === 'none');
  protected readonly isSlow = computed(() => this.network.connectionTier() === 'slow');
  protected readonly pendingSyncCount = computed(() => this.syncService.pendingCount());
}
