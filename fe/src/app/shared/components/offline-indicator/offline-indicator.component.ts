import { Component, ChangeDetectionStrategy, DestroyRef, inject, computed, signal } from '@angular/core';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideAngularModule } from 'lucide-angular';
import { filter } from 'rxjs';
import { NetworkStatusService } from '../../../core/services/network-status.service';
import { OfflineSyncService } from '../../../core/services/offline-sync.service';
import { SessionExpiredService } from '../../../core/services/session-expired.service';

@Component({
  selector: 'app-offline-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LucideAngularModule],
  template: `
    @if (isOffline() && !isOfflineRoute()) {
      <div
        class="pointer-events-none fixed left-1/2 z-[1000] w-[calc(100vw-1.5rem)] max-w-xl -translate-x-1/2 transition-all duration-200 sm:w-[calc(100vw-2rem)]"
        [class.top-3]="!hasExpiredBanner()"
        [class.top-14]="hasExpiredBanner()"
        role="status"
        aria-live="polite"
      >
        <div class="pointer-events-auto flex min-h-11 items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/95 px-3 py-2 text-amber-950 shadow-lg shadow-amber-950/10 backdrop-blur sm:px-4">
          <div class="flex min-w-0 items-center gap-3">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <lucide-icon name="wifi-off" [size]="15" aria-hidden="true"></lucide-icon>
            </span>
            <div class="min-w-0">
              <div class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <span class="truncate text-sm font-semibold">Đang ngoại tuyến</span>
                @if (pendingSyncCount() > 0) {
                  <span class="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                    {{ pendingSyncCount() }} mục chờ đồng bộ
                  </span>
                }
              </div>
              <p class="hidden truncate text-xs text-amber-800 sm:block">
                Bạn vẫn xem được nội dung đã tải. Tiến độ sẽ đồng bộ khi có mạng.
              </p>
            </div>
          </div>

          <a
            routerLink="/offline"
            class="shrink-0 rounded-lg border border-amber-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-amber-900 transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            Kho offline
          </a>
        </div>
      </div>
    } @else if (isSyncing()) {
      <div
        class="pointer-events-none fixed left-1/2 top-3 z-[1000] w-[calc(100vw-1.5rem)] max-w-sm -translate-x-1/2 sm:w-auto"
        role="status"
        aria-live="polite"
      >
        <div class="pointer-events-auto flex items-center justify-center gap-2 rounded-full border border-blue-200 bg-blue-50/95 px-3 py-2 text-blue-700 shadow-md shadow-blue-900/10 backdrop-blur">
          <lucide-icon name="refresh-cw" [size]="14" class="animate-spin" aria-hidden="true"></lucide-icon>
          <span class="text-xs font-semibold">Đang đồng bộ dữ liệu...</span>
        </div>
      </div>
    } @else if (isSlow()) {
      <div
        class="pointer-events-none fixed left-1/2 top-3 z-[1000] w-[calc(100vw-1.5rem)] max-w-sm -translate-x-1/2 sm:w-auto"
        role="status"
        aria-live="polite"
      >
        <div class="pointer-events-auto flex items-center justify-center gap-2 rounded-full border border-amber-200 bg-amber-50/95 px-3 py-2 text-amber-800 shadow-md shadow-amber-950/10 backdrop-blur">
          <lucide-icon name="alert-triangle" [size]="14" aria-hidden="true"></lucide-icon>
          <span class="text-xs font-semibold">{{ network.connectionLabel() }}</span>
        </div>
      </div>
    }
  `,
})
export class OfflineIndicatorComponent {
  protected readonly network = inject(NetworkStatusService);
  private readonly syncService = inject(OfflineSyncService);
  private readonly sessionService = inject(SessionExpiredService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly currentUrl = signal(this.router.url);

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(event => this.currentUrl.set(event.urlAfterRedirects));
  }

  protected readonly isOffline = computed(() => {
    const tier = this.network.connectionTier();
    if (tier === 'none') return true;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
    return false;
  });
  protected readonly isSyncing = computed(() => !this.isOffline() && this.syncService.isSyncing());
  protected readonly isSlow = computed(() => this.network.connectionTier() === 'slow');
  protected readonly pendingSyncCount = computed(() => this.syncService.pendingCount());
  protected readonly hasExpiredBanner = computed(() => this.sessionService.showExpiredBanner());
  protected readonly isOfflineRoute = computed(() => this.currentUrl().startsWith('/offline'));
}
