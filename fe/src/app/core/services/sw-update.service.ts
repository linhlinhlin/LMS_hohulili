import { Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, timer } from 'rxjs';
import { ToastService } from './toast.service';
import { StorageManagerService } from './storage-manager.service';
import { NetworkStatusService } from './network-status.service';
import {
  AppUpdateBlocker,
  AppUpdateSeverity,
  AppUpdateStateService,
  AppUpdateVersionInfo,
  classifyAppUpdateContext,
} from './app-update-state.service';

const RUNTIME_CHUNK_FAILURE_MARKERS = [
  'ChunkLoadError',
  'Loading chunk',
  'Failed to fetch dynamically imported module',
  'Importing a module script failed',
  'error loading dynamically imported module',
] as const;

const INITIAL_UPDATE_CHECK_DELAY_MS = 30 * 1000;
const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const UPDATE_REMIND_LATER_MS = 30 * 60 * 1000;
const APP_UPDATE_BROADCAST_CHANNEL = 'holilihu-app-update';
const APP_UPDATE_STARTED_AT_KEY = 'holilihu-app-update-started-at';
const APP_UPDATE_RETURN_URL_KEY = 'holilihu-app-update-return-url';

type AppUpdateBroadcastMessage = {
  type: 'version-ready';
  version: AppUpdateVersionInfo;
};

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
  private readonly networkStatus = inject(NetworkStatusService);
  private readonly updateState = inject(AppUpdateStateService);

  private initialized = false;
  private runtimeRecoveryTriggered = false;
  private pendingVersion: AppUpdateVersionInfo | null = null;
  private updateChannel: BroadcastChannel | null = null;

  private readonly visibilityChangeHandler = async () => {
    if (document.visibilityState !== 'visible') return;

    this.storage.requestPersistence();

    if (this.swUpdate?.isEnabled) {
      void this.checkForUpdate('visible');
      this.syncPendingUpdateContext();
      return;
    }

    if (!('serviceWorker' in navigator)) return;

    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && !reg.active && navigator.onLine) {
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
    this.setupUpdateBroadcastChannel();
    this.announceCompletedUpdateIfNeeded();

    if (this.shouldDisableServiceWorkerRuntime()) {
      void this.disableServiceWorkerForLocalRuntime();
      return;
    }

    if (!this.swUpdate?.isEnabled) return;
    const sw = this.swUpdate;

    timer(INITIAL_UPDATE_CHECK_DELAY_MS, UPDATE_CHECK_INTERVAL_MS)
      .subscribe(() => void this.checkForUpdate('scheduled'));

    sw.versionUpdates.pipe(
      filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
    ).subscribe((event) => this.handleVersionReady(event));

    sw.unrecoverable.subscribe((event) => {
      void this.handleUnrecoverableState(event.reason);
    });

    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    ).subscribe(() => this.syncPendingUpdateContext());

    this.storage.requestPersistence();
    this.showOfflineReadyToast();
  }

  applyPendingUpdate(): void {
    this.updateState.markApplying();
    this.rememberUpdateReload();
    setTimeout(() => document.location.reload(), 100);
  }

  remindLater(): void {
    this.updateState.dismissFor(UPDATE_REMIND_LATER_MS);
    this.toast.info('Sẽ nhắc lại khi phù hợp để cập nhật ứng dụng.');
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
      this.toast.success('Sẵn sàng ngoại tuyến - trang web vẫn mở được nội dung đã tải khi mất mạng');
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

  private setupUpdateBroadcastChannel(): void {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
      return;
    }

    this.updateChannel = new BroadcastChannel(APP_UPDATE_BROADCAST_CHANNEL);
    this.updateChannel.onmessage = (event: MessageEvent<AppUpdateBroadcastMessage>) => {
      if (event.data?.type !== 'version-ready') {
        return;
      }

      this.pendingVersion = event.data.version;
      this.publishUpdateState(event.data.version);
    };
  }

  private async checkForUpdate(_reason: 'scheduled' | 'visible'): Promise<void> {
    if (!this.swUpdate?.isEnabled || !this.canCheckForUpdate()) {
      return;
    }

    this.updateState.markChecking();
    try {
      await this.swUpdate.checkForUpdate();
    } catch {
      this.updateState.markFailed('Không thể kiểm tra cập nhật lúc này.');
    } finally {
      if (this.updateState.state().status === 'checking') {
        this.updateState.clear();
      }
    }
  }

  private canCheckForUpdate(): boolean {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return false;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false;
    }

    return !this.networkStatus.isEffectivelyOffline();
  }

  private handleVersionReady(event: VersionReadyEvent): void {
    const version = this.toVersionInfo(event);
    this.pendingVersion = version;
    this.publishUpdateState(version);
    this.broadcastVersionReady(version);
  }

  private publishUpdateState(version: AppUpdateVersionInfo): void {
    this.updateState.markReady(version, this.getCurrentUpdateBlocker());
  }

  private broadcastVersionReady(version: AppUpdateVersionInfo): void {
    this.updateChannel?.postMessage({
      type: 'version-ready',
      version,
    } satisfies AppUpdateBroadcastMessage);
  }

  private syncPendingUpdateContext(): void {
    if (!this.pendingVersion) {
      return;
    }

    this.updateState.updateBlocker(this.getCurrentUpdateBlocker());
  }

  private getCurrentUpdateBlocker(): AppUpdateBlocker | null {
    const online = !(
      (typeof navigator !== 'undefined' && !navigator.onLine) ||
      this.networkStatus.isEffectivelyOffline()
    );
    const visibilityState = typeof document === 'undefined' ? 'visible' : document.visibilityState;

    return classifyAppUpdateContext(this.router.url, {
      online,
      visibilityState,
    });
  }

  private toVersionInfo(event: VersionReadyEvent): AppUpdateVersionInfo {
    const appData = (event.latestVersion.appData ?? {}) as Record<string, unknown>;
    return {
      currentHash: event.currentVersion.hash ?? null,
      latestHash: event.latestVersion.hash ?? null,
      detectedAt: Date.now(),
      severity: this.parseSeverity(appData['severity']),
      releaseNote: this.readReleaseNote(appData),
    };
  }

  private parseSeverity(value: unknown): AppUpdateSeverity {
    if (value === 'important' || value === 'critical') {
      return value;
    }

    return 'normal';
  }

  private readReleaseNote(appData: Record<string, unknown>): string | null {
    const releaseNote = appData['releaseNote'] ?? appData['message'];
    if (typeof releaseNote !== 'string') {
      return null;
    }

    const trimmed = releaseNote.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private async handleUnrecoverableState(reason: string): Promise<void> {
    console.error('[SW] Unrecoverable state:', reason);
    this.updateState.markUnrecoverable(reason, this.getCurrentUpdateBlocker());

    if (navigator.onLine) {
      await this.clearNgswCaches();
      this.toast.error('Ứng dụng cần tải lại để khôi phục phiên hiện tại.');
      setTimeout(() => this.applyPendingUpdate(), 1200);
      return;
    }

    this.toast.info('Ứng dụng sẽ khôi phục khi có kết nối mạng.');
    const onlineHandler = () => {
      window.removeEventListener('online', onlineHandler);
      fetch('/icons/icon-192x192.png', { method: 'HEAD' })
        .then(() => this.applyPendingUpdate())
        .catch(() => {});
    };
    window.addEventListener('online', onlineHandler);
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
    this.updateState.markUnrecoverable('runtime chunk load failure', this.getCurrentUpdateBlocker());

    if (typeof navigator === 'undefined' || navigator.onLine) {
      this.toast.info('Có bản ứng dụng mới. Đang tải lại để đồng bộ giao diện.');
      setTimeout(() => this.applyPendingUpdate(), 500);
      return;
    }

    this.navigateToOfflineRecovery();
  }

  private rememberUpdateReload(): void {
    try {
      localStorage.setItem(APP_UPDATE_STARTED_AT_KEY, String(Date.now()));
      localStorage.setItem(APP_UPDATE_RETURN_URL_KEY, this.router.url);
    } catch {
      // Ignore storage failures. Reload is still the source of truth.
    }
  }

  private announceCompletedUpdateIfNeeded(): void {
    try {
      const startedAt = Number(localStorage.getItem(APP_UPDATE_STARTED_AT_KEY) ?? 0);
      if (!startedAt) {
        return;
      }

      localStorage.removeItem(APP_UPDATE_STARTED_AT_KEY);
      localStorage.removeItem(APP_UPDATE_RETURN_URL_KEY);

      if (Date.now() - startedAt < 2 * 60 * 1000) {
        this.toast.success('Ứng dụng đã được cập nhật.');
      }
    } catch {
      // Ignore storage failures.
    }
  }

  private navigateToOfflineRecovery(): void {
    void this.router.navigateByUrl('/offline').catch(() => {
      document.location.assign('/offline');
    });
  }
}
