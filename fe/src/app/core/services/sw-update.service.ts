import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, interval, switchMap } from 'rxjs';
import { from } from 'rxjs';
import { ToastService } from './toast.service';
import { StorageManagerService } from './storage-manager.service';
import { ConfirmDialogService } from './confirm-dialog.service';
import { NetworkStatusService } from './network-status.service';

const RUNTIME_CHUNK_FAILURE_MARKERS = [
  'ChunkLoadError',
  'Loading chunk',
  'Failed to fetch dynamically imported module',
  'Importing a module script failed',
  'error loading dynamically imported module',
] as const;

export function isRuntimeChunkLoadFailure(errorLike: unknown): boolean {
  const message = getRuntimeFailureMessage(errorLike).toLowerCase();
  return RUNTIME_CHUNK_FAILURE_MARKERS.some((marker) =>
    message.includes(marker.toLowerCase()),
  );
}

function getRuntimeFailureMessage(errorLike: unknown): string {
  if (typeof errorLike === 'string') {
    return errorLike;
  }

  if (!errorLike || typeof errorLike !== 'object') {
    return '';
  }

  const record = errorLike as Record<string, unknown>;
  const message = record['message'];
  if (typeof message === 'string') {
    return message;
  }

  const reason = record['reason'];
  if (typeof reason === 'string') {
    return reason;
  }

  if (reason && typeof reason === 'object') {
    const nestedMessage = (reason as Record<string, unknown>)['message'];
    if (typeof nestedMessage === 'string') {
      return nestedMessage;
    }
  }

  return '';
}

@Injectable({ providedIn: 'root' })
export class SwUpdateService {
  private readonly swUpdate = inject(SwUpdate, { optional: true });
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly storage = inject(StorageManagerService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly networkStatus = inject(NetworkStatusService);
  private initialized = false;
  private runtimeRecoveryTriggered = false;
  private readonly visibilityChangeHandler = async () => {
    if (document.visibilityState !== 'visible') return;

    this.storage.requestPersistence();

    if (this.swUpdate?.isEnabled) {
      this.swUpdate.checkForUpdate().catch(() => {});
      return;
    }

    if (!('serviceWorker' in navigator)) return;

    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg?.active && navigator.onLine) {
        console.warn('[PWA] Service worker evicted by iOS, re-registering...');
        document.location.reload();
      }
    } catch {
      // Ignore errors (e.g., SW API not available)
    }
  };
  private readonly windowErrorHandler = (event: ErrorEvent) => {
    if (!isRuntimeChunkLoadFailure(event)) {
      return;
    }

    this.handleRuntimeChunkFailure(event);
  };
  private readonly unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
    if (!isRuntimeChunkLoadFailure(event.reason)) {
      return;
    }

    event.preventDefault();
    this.handleRuntimeChunkFailure(event.reason);
  };

  initialize(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    this.setupChunkErrorHandler();
    this.setupVisibilityHandler();

    if (this.shouldDisableServiceWorkerRuntime()) {
      void this.disableServiceWorkerForLocalRuntime();
      return;
    }

    if (!this.swUpdate?.isEnabled) return;
    const sw = this.swUpdate;

    interval(6 * 60 * 60 * 1000).pipe(
      switchMap(() => from(sw.checkForUpdate())),
    ).subscribe();

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

    sw.unrecoverable.subscribe(async (event) => {
      console.error('[SW] Unrecoverable state:', event.reason);

      if (navigator.onLine) {
        await this.clearNgswCaches();
        this.toast.error('Ứng dụng gặp lỗi. Đang tải lại...');
        setTimeout(() => document.location.reload(), 1000);
      } else {
        this.toast.info('Ứng dụng sẽ cập nhật khi có kết nối mạng');
        const onlineHandler = () => {
          window.removeEventListener('online', onlineHandler);
          fetch('/icons/icon-192x192.png', { method: 'HEAD' })
            .then(() => document.location.reload())
            .catch(() => {});
        };
        window.addEventListener('online', onlineHandler);
      }
    });

    this.storage.requestPersistence();
    this.showOfflineReadyToast();
  }

  private shouldDisableServiceWorkerRuntime(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  }

  private async disableServiceWorkerForLocalRuntime(): Promise<void> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
      await this.clearNgswCaches();
      console.info('[SW] Disabled and cleared for local runtime');
    } catch (error) {
      console.warn('[SW] Failed to clear local service worker state', error);
    }
  }

  private showOfflineReadyToast(): void {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    try {
      if (localStorage.getItem('pwa-ready-shown')) return;
    } catch {
      return;
    }

    navigator.serviceWorker.ready.then(() => {
      this.toast.success('Sẵn sàng ngoại tuyến — trang web hoạt động kể cả khi mất mạng');
      try {
        localStorage.setItem('pwa-ready-shown', '1');
      } catch {}
    });
  }

  private setupVisibilityHandler(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
  }

  private setupChunkErrorHandler(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', this.windowErrorHandler);
    window.addEventListener('unhandledrejection', this.unhandledRejectionHandler);
  }

  private async clearNgswCaches(): Promise<void> {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith('ngsw:'))
          .map((name) => caches.delete(name)),
      );
      console.info('[SW] Cleared', cacheNames.filter((name) => name.startsWith('ngsw:')).length, 'NGSW caches');
    } catch {
      // Cache cleanup failed, continue anyway
    }
  }

  private handleRuntimeChunkFailure(reason: unknown): void {
    if (this.runtimeRecoveryTriggered) {
      return;
    }

    this.runtimeRecoveryTriggered = true;

    if (this.networkStatus.isEffectivelyOffline()) {
      this.networkStatus.markOfflineFromTransportFailure();
      console.warn('[PWA] Runtime chunk request failed while offline, redirecting to offline recovery.', reason);
      this.toast.info('Bạn đang ngoại tuyến. Đang mở trang ngoại tuyến đã tải xuống.');
      this.navigateToOfflineRecovery();
      return;
    }

    console.warn('[PWA] Runtime chunk load failure detected, reloading app shell.', reason);

    if (typeof navigator === 'undefined' || navigator.onLine) {
      document.location.reload();
      return;
    }

    this.navigateToOfflineRecovery();
  }

  private navigateToOfflineRecovery(): void {
    void this.router.navigateByUrl('/offline').catch(() => {
      document.location.assign('/offline');
    });
  }
}
