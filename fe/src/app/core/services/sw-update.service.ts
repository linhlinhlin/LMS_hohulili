import { Injectable, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, interval, switchMap } from 'rxjs';
import { from } from 'rxjs';
import { ToastService } from './toast.service';
import { StorageManagerService } from './storage-manager.service';
import { ConfirmDialogService } from './confirm-dialog.service';

@Injectable({ providedIn: 'root' })
export class SwUpdateService {
  private readonly swUpdate = inject(SwUpdate, { optional: true });
  private readonly toast = inject(ToastService);
  private readonly storage = inject(StorageManagerService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  initialize(): void {
    this.setupChunkErrorHandler();
    this.setupVisibilityHandler();

    if (!this.swUpdate?.isEnabled) return;
    const sw = this.swUpdate;

    // Check for updates every 6 hours (maritime connectivity windows)
    interval(6 * 60 * 60 * 1000).pipe(
      switchMap(() => from(sw.checkForUpdate())),
    ).subscribe();

    // Prompt user when new version ready (prevents data loss during quiz/assignment)
    sw.versionUpdates.pipe(
      filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
    ).subscribe(async () => {
      const confirmed = await this.confirmDialog.confirm({
        title: 'Cập nhật ứng dụng',
        message: 'Phiên bản mới đã sẵn sàng. Tải lại trang để cập nhật?',
        variant: 'info',
        confirmText: 'Cập nhật ngay',
        cancelText: 'Để sau',
      });

      if (confirmed) {
        document.location.reload();
      } else {
        this.toast.info('Ứng dụng sẽ cập nhật khi bạn tải lại trang');
      }
    });

    // Handle unrecoverable state (Angular #42094, iOS SW eviction)
    // iOS kills SW after ~5min background → unrecoverable fires
    // NEVER reload offline — it will show browser's "No Connection" page
    sw.unrecoverable.subscribe(async (event) => {
      console.error('[SW] Unrecoverable state:', event.reason);

      if (navigator.onLine) {
        // Clear stale NGSW caches before reload to prevent re-entering unrecoverable
        await this.clearNgswCaches();
        this.toast.error('Ứng dụng gặp lỗi. Đang tải lại...');
        setTimeout(() => document.location.reload(), 1000);
      } else {
        // Queue reload for when we come back online
        this.toast.info('Ứng dụng sẽ cập nhật khi có kết nối mạng');
        const onlineHandler = () => {
          window.removeEventListener('online', onlineHandler);
          // Confirm we're truly online with a probe before reload
          fetch('/favicon.ico', { method: 'HEAD' })
            .then(() => document.location.reload())
            .catch(() => { /* still offline, wait more */ });
        };
        window.addEventListener('online', onlineHandler);
      }
    });

    // Request persistent storage — critical for iOS (prevents 7-day eviction)
    this.storage.requestPersistence();

    // One-time "offline ready" toast — shows only on first SW install per device
    this.showOfflineReadyToast();
  }

  /**
   * Show a one-time toast when SW first becomes active (all prefetch assets cached).
   * Uses localStorage flag so it only fires once per device, ever.
   * navigator.serviceWorker.ready resolves when SW is active = prefetch complete.
   */
  private showOfflineReadyToast(): void {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    try {
      if (localStorage.getItem('pwa-ready-shown')) return;
    } catch { return; }

    navigator.serviceWorker.ready.then(() => {
      this.toast.success('Sẵn sàng ngoại tuyến — trang web hoạt động kể cả khi mất mạng');
      try { localStorage.setItem('pwa-ready-shown', '1'); } catch {}
    });
  }

  /**
   * iOS WebKit evicts SW after ~5min background (Apple WebKit policy).
   * On resume (visibilitychange → visible), check if SW is still alive.
   * If dead and online → reload to re-register SW and re-cache app shell.
   * If dead and offline → do nothing (app continues from memory).
   *
   * Source: https://webkit.org/blog/14403/updates-to-storage-policy/
   */
  private setupVisibilityHandler(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState !== 'visible') return;

      // Re-request persistence on every foreground (may have been revoked)
      this.storage.requestPersistence();

      // Check for SW updates on resume (re-validates SW if alive)
      if (this.swUpdate?.isEnabled) {
        this.swUpdate.checkForUpdate().catch(() => {});
        return; // SW is alive, no need to check further
      }

      // If SW is not enabled, check if it was evicted
      if (!('serviceWorker' in navigator)) return;

      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg?.active && navigator.onLine) {
          // SW was evicted by iOS, reload to re-register
          console.warn('[PWA] Service worker evicted by iOS, re-registering...');
          document.location.reload();
        }
      } catch {
        // Ignore errors (e.g., SW API not available)
      }
    });
  }

  /**
   * Angular NGSW's unrecoverable event sometimes does NOT fire for
   * lazy-loaded chunk mismatches (Angular #42094). Catch ChunkLoadError
   * globally and reload to get fresh chunks.
   */
  private setupChunkErrorHandler(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
      const msg = event.message || '';
      if (msg.includes('ChunkLoadError') || msg.includes('Loading chunk')) {
        console.warn('[PWA] ChunkLoadError detected, reloading...');
        if (navigator.onLine) {
          document.location.reload();
        }
      }
    });
  }

  /**
   * Clear all NGSW caches before reload to prevent re-entering
   * unrecoverable state with stale/partial cache.
   */
  private async clearNgswCaches(): Promise<void> {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(name => name.startsWith('ngsw:'))
          .map(name => caches.delete(name))
      );
      console.info('[SW] Cleared', cacheNames.filter(n => n.startsWith('ngsw:')).length, 'NGSW caches');
    } catch {
      // Cache cleanup failed, continue anyway
    }
  }
}
