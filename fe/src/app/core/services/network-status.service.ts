import { Injectable, signal, computed, OnDestroy } from '@angular/core';

export type ConnectionTier = 'none' | 'slow' | 'fast';
export type ConnectionTransport = 'wifi' | 'ethernet' | 'cellular' | 'unknown';

const OFFLINE_GRACE_MS = 1_500;
const RECENT_OFFLINE_WINDOW_MS = 5_000;
const NON_CRITICAL_SYNC_DEFER_WINDOW_MS = 15_000;
const PROBE_INTERVAL_MS = 120_000;
const PROBE_TIMEOUT_MS = 4_000;
const TRANSPORT_FAILURE_PROBE_DELAY_MS = 250;
const OFFLINE_PROBE_FAILURE_THRESHOLD = 2;
const DEGRADED_PROBE_BANDWIDTH_MBPS = 0.5;

@Injectable({ providedIn: 'root' })
export class NetworkStatusService implements OnDestroy {
  readonly online = signal(this.getBrowserOnlineHint());
  readonly effectiveBandwidthMbps = signal(2);
  readonly reportedDownlinkMbps = signal<number | null>(null);
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
  private consecutiveProbeFailures = 0;

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
    this.consecutiveProbeFailures = 0;
    this.recentOfflineSignalAt.set(null);
    if (this.effectiveBandwidthMbps() <= 0) {
      this.effectiveBandwidthMbps.set(2);
    }
  }

  async probeNow(): Promise<boolean> {
    return this.runProbe();
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
    this.reportedDownlinkMbps.set(this.readReportedDownlinkMbps(conn));

    if (!browserOnline) {
      this.markOfflineState();
      return;
    }

    this.online.set(true);
    this.effectiveBandwidthMbps.set(this.estimateBandwidthMbps(conn));
  }

  private probeLatency(): void {
    void this.runProbe();
  }

  // Single-probe health check against /actuator/health. A single 504/timeout
  // means "degraded" first, not "offline"; mobile networks and sleeping VMs can
  // spike briefly while the browser still has usable connectivity.
  private async runProbe(): Promise<boolean> {
    if (!this.getBrowserOnlineHint()) {
      this.markOfflineState();
      return false;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    const start = performance.now();

    try {
      const response = await fetch(this.buildProbeUrl('/actuator/health'), {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
        redirect: 'error',
      });
      this.ensureSuccessfulProbeResponse(response);
      this.markMeasuredOnlineState(performance.now() - start);
      return true;
    } catch {
      this.markProbeFailureState();
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private normalizeConnectionTransport(value: unknown): ConnectionTransport {
    if (value === 'wifi' || value === 'ethernet' || value === 'cellular') {
      return value;
    }

    return 'unknown';
  }

  private estimateBandwidthMbps(conn: any): number {
    const reportedDownlinkMbps = this.readReportedDownlinkMbps(conn);
    if (reportedDownlinkMbps != null) {
      return reportedDownlinkMbps;
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

  private readReportedDownlinkMbps(conn: any): number | null {
    if (typeof conn?.downlink === 'number' && Number.isFinite(conn.downlink) && conn.downlink > 0) {
      return Math.max(conn.downlink, 0.05);
    }

    return null;
  }

  private ensureSuccessfulProbeResponse(response: Response): void {
    if (!response.ok) {
      throw new Error(`probe-response-${response.status}`);
    }
  }

  private buildProbeUrl(path: string): string {
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}offlineProbe=${Date.now()}`;
  }

  private markMeasuredOnlineState(rtt: number): void {
    this.online.set(true);
    this.consecutiveProbeFailures = 0;
    this.recentOfflineSignalAt.set(null);

    const reportedDownlink = this.reportedDownlinkMbps();
    if (reportedDownlink != null) {
      this.effectiveBandwidthMbps.set(reportedDownlink);
      return;
    }

    if (rtt > 1200) {
      this.effectiveBandwidthMbps.set(0.5);
    } else if (rtt > 700) {
      this.effectiveBandwidthMbps.set(1.5);
    } else {
      this.effectiveBandwidthMbps.set(10);
    }
  }

  private markProbeFailureState(): void {
    this.consecutiveProbeFailures += 1;
    this.recentOfflineSignalAt.set(Date.now());

    if (!this.getBrowserOnlineHint() || this.consecutiveProbeFailures >= OFFLINE_PROBE_FAILURE_THRESHOLD) {
      this.markOfflineState();
      return;
    }

    this.online.set(true);
    this.effectiveBandwidthMbps.set(DEGRADED_PROBE_BANDWIDTH_MBPS);
  }

  private markOfflineState(): void {
    this.online.set(false);
    this.effectiveBandwidthMbps.set(0);
    this.reportedDownlinkMbps.set(null);
    this.recentOfflineSignalAt.set(Date.now());
  }
}
