import { Injectable, signal, computed, OnDestroy } from '@angular/core';

export type ConnectionTier = 'none' | 'slow' | 'fast';
export type ConnectionTransport = 'wifi' | 'ethernet' | 'cellular' | 'unknown';

const OFFLINE_GRACE_MS = 1_500;
const RECENT_OFFLINE_WINDOW_MS = 5_000;
const NON_CRITICAL_SYNC_DEFER_WINDOW_MS = 15_000;
const BACKGROUND_TIMEOUT_DEFER_WINDOW_MS = 15_000;
const PROBE_INTERVAL_MS = 120_000;
const PROBE_TIMEOUT_MS = 4_000;
const TRANSPORT_FAILURE_PROBE_DELAY_MS = 250;
const OFFLINE_PROBE_FAILURE_THRESHOLD = 2;
const FRONTEND_CONNECTIVITY_PROBE_PATH = '/health';
const SLOW_PROBE_RTT_MS = 1_500;
const MODERATE_PROBE_RTT_MS = 900;
const HTTP_SUCCESS_RECOVERY_MS = 1_200;
const SLOW_PROBE_CONFIRMATION_THRESHOLD = 2;
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
    return this.confirmedSlowConnection() ? 'slow' : 'fast';
  });

  readonly isLikelyMetered = computed(() => {
    if (!this.online()) return false;
    if (this.saveDataEnabled()) return true;
    return this.connectionTransport() === 'cellular';
  });

  readonly connectionDetailsAvailable = computed(
    () =>
      this.connectionTransport() !== 'unknown' ||
      this.effectiveNetworkType() != null ||
      this.saveDataEnabled(),
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
  private readonly recentBackgroundTimeoutAt = signal<number | null>(null);
  private readonly confirmedSlowConnection = signal(false);
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private offlineGraceTimer: ReturnType<typeof setTimeout> | null = null;
  private transportFailureProbeTimer: ReturnType<typeof setTimeout> | null = null;
  private probeInterval: ReturnType<typeof setInterval> | null = null;
  private consecutiveProbeFailures = 0;
  private consecutiveSlowProbeSamples = 0;

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
  private connectionRef: {
    removeEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void;
  } | null = null;

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

  hasRecentBackgroundTimeout(windowMs = BACKGROUND_TIMEOUT_DEFER_WINDOW_MS): boolean {
    const lastBackgroundTimeoutAt = this.recentBackgroundTimeoutAt();
    return lastBackgroundTimeoutAt != null && Date.now() - lastBackgroundTimeoutAt <= windowMs;
  }

  isEffectivelyOffline(): boolean {
    return !this.getBrowserOnlineHint() || !this.online();
  }

  shouldDeferNonCriticalSync(windowMs = NON_CRITICAL_SYNC_DEFER_WINDOW_MS): boolean {
    return (
      this.isEffectivelyOffline() ||
      this.saveDataEnabled() ||
      this.confirmedSlowConnection() ||
      this.hasRecentOfflineSignal(windowMs) ||
      this.hasRecentBackgroundTimeout(windowMs)
    );
  }

  markOfflineFromTransportFailure(): void {
    if (!this.getBrowserOnlineHint()) {
      this.markOfflineState();
      return;
    }

    this.recentOfflineSignalAt.set(Date.now());
    this.scheduleTransportFailureProbe();
  }

  markBackgroundMutationTimeout(): void {
    if (!this.getBrowserOnlineHint()) {
      this.markOfflineState();
      return;
    }

    this.recentBackgroundTimeoutAt.set(Date.now());
    this.scheduleTransportFailureProbe();
  }

  markOnlineFromHttpSuccess(responseTimeMs?: number): void {
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
    this.recentBackgroundTimeoutAt.set(null);

    if (responseTimeMs == null || responseTimeMs <= HTTP_SUCCESS_RECOVERY_MS) {
      this.clearSlowConnectionState();
    }

    if (
      this.effectiveBandwidthMbps() <= 0 ||
      (!this.confirmedSlowConnection() && this.effectiveBandwidthMbps() < 1)
    ) {
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
    this.effectiveNetworkType.set(
      typeof conn?.effectiveType === 'string' ? conn.effectiveType : null,
    );
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

  // Keep the connectivity probe on the frontend edge. Backend health checks can
  // include DB, storage, or video pipeline dependencies and would turn server
  // slowness into a misleading user-network warning.
  private async runProbe(): Promise<boolean> {
    if (!this.getBrowserOnlineHint()) {
      this.markOfflineState();
      return false;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    const start = performance.now();

    try {
      const response = await fetch(this.buildProbeUrl(FRONTEND_CONNECTIVITY_PROBE_PATH), {
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
    const measuredBandwidth = this.estimateBandwidthFromRtt(rtt);
    if (reportedDownlink != null) {
      this.effectiveBandwidthMbps.set(Math.min(reportedDownlink, measuredBandwidth));
    } else {
      this.effectiveBandwidthMbps.set(measuredBandwidth);
    }

    if (rtt > SLOW_PROBE_RTT_MS) {
      this.recordSlowProbeSample();
    } else if (rtt <= MODERATE_PROBE_RTT_MS || this.confirmedSlowConnection()) {
      this.clearSlowConnectionState();
    }
  }

  private estimateBandwidthFromRtt(rtt: number): number {
    if (rtt > SLOW_PROBE_RTT_MS) {
      return 0.5;
    }
    if (rtt > MODERATE_PROBE_RTT_MS) {
      return 1.5;
    }
    return 10;
  }

  private recordSlowProbeSample(): void {
    this.consecutiveSlowProbeSamples += 1;
    if (this.consecutiveSlowProbeSamples >= SLOW_PROBE_CONFIRMATION_THRESHOLD) {
      this.confirmedSlowConnection.set(true);
    }
  }

  private clearSlowConnectionState(): void {
    this.consecutiveSlowProbeSamples = 0;
    this.confirmedSlowConnection.set(false);
  }

  private markProbeFailureState(): void {
    this.consecutiveProbeFailures += 1;
    this.recentOfflineSignalAt.set(Date.now());

    if (
      !this.getBrowserOnlineHint() ||
      this.consecutiveProbeFailures >= OFFLINE_PROBE_FAILURE_THRESHOLD
    ) {
      this.markOfflineState();
      return;
    }

    this.online.set(true);
    this.effectiveBandwidthMbps.set(DEGRADED_PROBE_BANDWIDTH_MBPS);
  }

  private markOfflineState(): void {
    this.online.set(false);
    this.clearSlowConnectionState();
    this.effectiveBandwidthMbps.set(0);
    this.reportedDownlinkMbps.set(null);
    this.recentOfflineSignalAt.set(Date.now());
  }
}
