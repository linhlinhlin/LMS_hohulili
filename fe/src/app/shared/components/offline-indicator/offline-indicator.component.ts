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
        class="pointer-events-none fixed bottom-20 right-3 z-[950] max-w-[calc(100vw-1.5rem)] transition-all duration-200 sm:bottom-4 sm:right-4 sm:max-w-sm"
        role="status"
        aria-live="polite"
      >
        @if (showOfflineDetails()) {
          <div class="pointer-events-auto rounded-xl border border-amber-200 bg-white/95 p-3 text-slate-900 shadow-lg shadow-slate-900/10 backdrop-blur">
            <div class="flex items-start gap-3">
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                <lucide-icon name="wifi-off" [size]="18" aria-hidden="true"></lucide-icon>
              </span>
              <div class="min-w-0 flex-1">
                <div class="flex min-w-0 items-center gap-2">
                  <span class="truncate text-sm font-semibold">Đang ngoại tuyến</span>
                  @if (pendingSyncCount() > 0) {
                    <span class="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                      {{ pendingSyncCount() }} chờ đồng bộ
                    </span>
                  }
                </div>
                <p class="mt-1 text-xs leading-5 text-slate-600">
                  Nội dung đã tải vẫn dùng được. Tiến độ sẽ tự đồng bộ khi kết nối ổn định.
                </p>
                <div class="mt-3 flex items-center gap-2">
                  <a
                    routerLink="/offline"
                    class="inline-flex h-8 items-center justify-center rounded-lg bg-[#0056D2] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#004BB5] focus:outline-none focus:ring-2 focus:ring-[#0056D2] focus:ring-offset-2"
                  >
                    Kho offline
                  </a>
                  <button
                    type="button"
                    (click)="dismissOfflineBanner()"
                    class="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0056D2] focus:ring-offset-2"
                  >
                    Thu gọn
                  </button>
                </div>
              </div>
            </div>
          </div>
        } @else {
          <a
            routerLink="/offline"
            class="pointer-events-auto inline-flex h-10 items-center gap-2 rounded-full border border-amber-200 bg-white/95 px-3 text-xs font-semibold text-amber-900 shadow-md shadow-slate-900/10 backdrop-blur transition-colors hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400"
            aria-label="Mở kho offline"
          >
            <lucide-icon name="wifi-off" [size]="15" aria-hidden="true"></lucide-icon>
            Kho offline
          </a>
        }
      </div>
    } @else if (isSyncing()) {
      <div
        class="pointer-events-none fixed left-1/2 z-[1000] w-[calc(100vw-1.5rem)] max-w-sm -translate-x-1/2 sm:w-auto"
        [class.top-3]="!hasExpiredBanner()"
        [class.top-14]="hasExpiredBanner()"
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
        class="pointer-events-none fixed left-1/2 z-[1000] w-[calc(100vw-1.5rem)] max-w-sm -translate-x-1/2 sm:w-auto"
        [class.top-3]="!hasExpiredBanner()"
        [class.top-14]="hasExpiredBanner()"
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
  private readonly offlineBannerDismissed = signal(false);
  private readonly compactViewport = signal(this.readCompactViewport());

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(event => this.currentUrl.set(event.urlAfterRedirects));

    if (typeof window !== 'undefined') {
      const media = window.matchMedia('(max-width: 640px)');
      const handleViewportChange = () => this.compactViewport.set(media.matches);
      media.addEventListener('change', handleViewportChange);
      this.destroyRef.onDestroy(() => media.removeEventListener('change', handleViewportChange));
    }
  }

  protected readonly isOffline = computed(() => {
    const tier = this.network.connectionTier();
    if (tier === 'none') return true;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
    return false;
  });
  protected readonly showOfflineDetails = computed(() => !this.compactViewport() && !this.offlineBannerDismissed());
  protected readonly isSyncing = computed(() => !this.isOffline() && this.syncService.isSyncing());
  protected readonly isSlow = computed(() => this.network.connectionTier() === 'slow');
  protected readonly pendingSyncCount = computed(() => this.syncService.pendingCount());
  protected readonly hasExpiredBanner = computed(() => this.sessionService.showExpiredBanner());
  protected readonly isOfflineRoute = computed(() => this.currentUrl().startsWith('/offline'));

  protected dismissOfflineBanner(): void {
    this.offlineBannerDismissed.set(true);
  }

  private readCompactViewport(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches;
  }
}
