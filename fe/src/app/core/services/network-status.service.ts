import { Injectable, signal, computed, OnDestroy } from '@angular/core';

export type ConnectionTier = 'none' | 'slow' | 'fast';
export type ConnectionTransport = 'wifi' | 'ethernet' | 'cellular' | 'unknown';

const OFFLINE_GRACE_MS = 1_500;
const RECENT_OFFLINE_WINDOW_MS = 5_000;
const NON_CRITICAL_SYNC_DEFER_WINDOW_MS = 15_000;
const PROBE_INTERVAL_MS = 120_000;
const PROBE_TIMEOUT_MS = 4_000;
const TRANSPORT_FAILURE_PROBE_DELAY_MS = 250;

@Injectable({ providedIn: 'root' })
export class NetworkStatusService implements OnDestroy {
  readonly online = signal(this.getBrowserOnlineHint());
  readonly effectiveBandwidthMbps = signal(2);
  readonly connectionTransport = signal<ConnectionTransport>('unknown');
  readonly saveDataEnabled = signal(false);
  readonly effectiveNetworkType = signal<string | null>(null);

  readonly connectionTier = computed<ConnectionTier>(() => {
    if (!this.online()) return 'none';
    return this.effectiveBandwidthMbps() < 1 ? 'slow' : 'fast';
  });

  readonly isLikelyMetered = computed(() => {
    if (!this.online()) return false;
    if (this.saveDataEnabled()) return true;
    return this.connectionTransport() === 'cellular';
  });

  readonly connectionDetailsAvailable = computed(() =>
    this.connectionTransport() !== 'unknown' || this.effectiveNetworkType() != null || this.saveDataEnabled()
  );

  readonly connectionLabel = computed(() => {
    switch (this.connectionTier()) {
      case 'none':
        return 'Ngoại tuyến';
      case 'slow':
        return 'Kết nối chậm';
      case 'fast':
        return 'Trực tuyến';
    }
  });

  private readonly recentOfflineSignalAt = signal<number | null>(
    this.getBrowserOnlineHint() ? null : Date.now(),
  );
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private offlineGraceTimer: ReturnType<typeof setTimeout> | null = null;
  private transportFailureProbeTimer: ReturnType<typeof setTimeout> | null = null;
  private probeInterval: ReturnType<typeof setInterval> | null = null;

  private readonly onlineHandler = () => {
    if (this.offlineGraceTimer) {
      clearTimeout(this.offlineGraceTimer);
      this.offlineGraceTimer = null;
    }
    this.recentOfflineSignalAt.set(null);
    this.updateStatus();
    this.probeLatency();
  };

  // Browser 'offline' events are often spurious (Wi-Fi transitions, OS sleep,
  // VPN toggles). Wait a grace period and verify with a probe before flipping
  // the UI to the offline state.
  private readonly offlineHandler = () => {
    if (this.offlineGraceTimer) clearTimeout(this.offlineGraceTimer);
    this.offlineGraceTimer = setTimeout(() => {
      this.offlineGraceTimer = null;
      if (!this.getBrowserOnlineHint()) {
        this.probeLatency();
      }
    }, OFFLINE_GRACE_MS);
  };

  private readonly connectionChangeHandler = () => this.debouncedUpdate();
  private connectionRef: { removeEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void } | null = null;

  constructor() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);

    const conn = (navigator as any).connection;
    if (conn) {
      conn.addEventListener('change', this.connectionChangeHandler);
      this.connectionRef = conn;
    }

    this.updateStatus();

    if (this.getBrowserOnlineHint()) {
      this.probeLatency();
    }

    this.probeInterval = setInterval(() => {
      if (this.getBrowserOnlineHint()) {
        this.probeLatency();
      }
    }, PROBE_INTERVAL_MS);
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.onlineHandler);
      window.removeEventListener('offline', this.offlineHandler);
    }
    this.connectionRef?.removeEventListener?.('change', this.connectionChangeHandler);
    this.connectionRef = null;
    if (this.probeInterval) {
      clearInterval(this.probeInterval);
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    if (this.offlineGraceTimer) {
      clearTimeout(this.offlineGraceTimer);
    }
    if (this.transportFailureProbeTimer) {
      clearTimeout(this.transportFailureProbeTimer);
    }
  }

  hasRecentOfflineSignal(windowMs = RECENT_OFFLINE_WINDOW_MS): boolean {
    const lastOfflineSignalAt = this.recentOfflineSignalAt();
    return lastOfflineSignalAt != null && Date.now() - lastOfflineSignalAt <= windowMs;
  }

  isEffectivelyOffline(): boolean {
    return !this.getBrowserOnlineHint()
      || !this.online();
  }

  shouldDeferNonCriticalSync(windowMs = NON_CRITICAL_SYNC_DEFER_WINDOW_MS): boolean {
    return this.isEffectivelyOffline()
      || this.connectionTier() === 'slow'
      || this.saveDataEnabled()
      || this.hasRecentOfflineSignal(windowMs);
  }

  markOfflineFromTransportFailure(): void {
    if (!this.getBrowserOnlineHint()) {
      this.markOfflineState();
      return;
    }

    this.recentOfflineSignalAt.set(Date.now());
    this.scheduleTransportFailureProbe();
  }

  markOnlineFromHttpSuccess(): void {
    if (!this.getBrowserOnlineHint()) {
      return;
    }

    if (this.transportFailureProbeTimer) {
      clearTimeout(this.transportFailureProbeTimer);
      this.transportFailureProbeTimer = null;
    }

    this.online.set(true);
    this.recentOfflineSignalAt.set(null);
    if (this.effectiveBandwidthMbps() <= 0) {
      this.effectiveBandwidthMbps.set(2);
    }
  }

  private debouncedUpdate(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.updateStatus(), 150);
  }

  private scheduleTransportFailureProbe(): void {
    if (this.transportFailureProbeTimer) return;

    this.transportFailureProbeTimer = setTimeout(() => {
      this.transportFailureProbeTimer = null;
      this.probeLatency();
    }, TRANSPORT_FAILURE_PROBE_DELAY_MS);
  }

  private updateStatus(): void {
    const browserOnline = this.getBrowserOnlineHint();
    const conn = (navigator as any).connection;

    this.connectionTransport.set(this.normalizeConnectionTransport(conn?.type));
    this.saveDataEnabled.set(conn?.saveData === true);
    this.effectiveNetworkType.set(typeof conn?.effectiveType === 'string' ? conn.effectiveType : null);

    if (!browserOnline) {
      this.markOfflineState();
      return;
    }

    this.online.set(true);
    this.effectiveBandwidthMbps.set(this.estimateBandwidthMbps(conn));
  }

  // Single-probe health check against /actuator/health. Previously used a
  // two-step icon-HEAD + actuator-GET sequence which had a race condition where
  // the icon succeeded but actuator timed out, showing false-offline state.
  // In dev, /actuator is proxied to the Spring Boot backend at :8088.
  private probeLatency(): void {
    if (!this.getBrowserOnlineHint()) {
      this.markOfflineState();
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    const start = performance.now();

    fetch('/actuator/health', {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
      redirect: 'error',
    })
      .then((response) => {
        clearTimeout(timeoutId);
        this.ensureSuccessfulProbeResponse(response);
        const rtt = performance.now() - start;
        this.markMeasuredOnlineState(rtt);
      })
      .catch(() => {
        clearTimeout(timeoutId);
        this.markOfflineState();
      });
  }

  private normalizeConnectionTransport(value: unknown): ConnectionTransport {
    if (value === 'wifi' || value === 'ethernet' || value === 'cellular') {
      return value;
    }

    return 'unknown';
  }

  private estimateBandwidthMbps(conn: any): number {
    if (typeof conn?.downlink === 'number' && Number.isFinite(conn.downlink) && conn.downlink > 0) {
      return Math.max(conn.downlink, 0.05);
    }

    switch (conn?.effectiveType) {
      case 'slow-2g':
        return 0.1;
      case '2g':
        return 0.25;
      case '3g':
        return 0.75;
      default:
        return 2;
    }
  }

  private getBrowserOnlineHint(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  private ensureSuccessfulProbeResponse(response: Response): void {
    if (!response.ok) {
      throw new Error(`probe-response-${response.status}`);
    }
  }

  private markMeasuredOnlineState(rtt: number): void {
    this.online.set(true);
    this.recentOfflineSignalAt.set(null);

    if (rtt > 500) {
      this.effectiveBandwidthMbps.set(0.5);
    } else if (rtt > 200) {
      this.effectiveBandwidthMbps.set(1.5);
    } else {
      this.effectiveBandwidthMbps.set(10);
    }
  }

  private markOfflineState(): void {
    this.online.set(false);
    this.effectiveBandwidthMbps.set(0);
    this.recentOfflineSignalAt.set(Date.now());
  }
}
