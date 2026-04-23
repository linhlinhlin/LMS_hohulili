import { Injectable, signal, computed, OnDestroy } from '@angular/core';

export type ConnectionTier = 'none' | 'slow' | 'fast';
export type ConnectionTransport = 'wifi' | 'ethernet' | 'cellular' | 'unknown';

@Injectable({ providedIn: 'root' })
export class NetworkStatusService implements OnDestroy {
  readonly online = signal(typeof navigator !== 'undefined' ? navigator.onLine : true);
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
      case 'none': return 'Ngoại tuyến';
      case 'slow': return 'Kết nối chậm';
      case 'fast': return 'Trực tuyến';
    }
  });

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private probeInterval: ReturnType<typeof setInterval> | null = null;
  private readonly onlineHandler = () => this.debouncedUpdate();
  private readonly offlineHandler = () => this.debouncedUpdate();
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

    // Only probe when online (avoid waking iOS SW unnecessarily)
    if (navigator.onLine) {
      this.probeLatency();
    }

    // Periodic re-probe every 2 minutes (was 30s — too aggressive for iOS SW keepalive)
    this.probeInterval = setInterval(() => {
      if (navigator.onLine) this.probeLatency();
    }, 120_000);
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
  }

  private debouncedUpdate(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.updateStatus(), 150);
  }

  private updateStatus(): void {
    this.online.set(navigator.onLine);

    const conn = (navigator as any).connection;
    this.connectionTransport.set(this.normalizeConnectionTransport(conn?.type));
    this.saveDataEnabled.set(conn?.saveData === true);
    this.effectiveNetworkType.set(typeof conn?.effectiveType === 'string' ? conn.effectiveType : null);

    if (!navigator.onLine) {
      this.effectiveBandwidthMbps.set(0);
    } else if (conn?.downlink != null) {
      // conn.downlink measures physical link, not app server speed.
      // Use it as hint but floor at 1.5 to avoid false "slow" on fast localhost.
      // probeLatency() will correct this with actual measured RTT.
      this.effectiveBandwidthMbps.set(Math.max(conn.downlink, 1.5));
    } else {
      this.effectiveBandwidthMbps.set(2);
    }
  }

  /**
   * Probe actual latency via network request.
   *
   * IMPORTANT: Uses cache: 'no-store' to bypass SW cache and get real network status.
   * Falls back to API health check if icon probe succeeds (to verify internet connectivity).
   *
   * Multi-strategy detection:
   * 1. Static resource with no-store (bypass SW cache)
   * 2. If that succeeds, verify with API health endpoint
   * 3. On iOS: SW can be evicted after ~5min background. Rely on navigator.onLine events (no aggressive probe).
   */
  private probeLatency(): void {
    if (!navigator.onLine) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const start = performance.now();

    // Use cache: 'no-store' to bypass SW cache and get real network status
    fetch('/icons/icon-192x192.png', {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store'
    })
      .then(async () => {
        clearTimeout(timeoutId);
        const rtt = performance.now() - start;

        // Verify internet connectivity with API health check
        // This catches the case where WiFi is connected but no internet
        try {
          const apiController = new AbortController();
          const apiTimeoutId = setTimeout(() => apiController.abort(), 3000);
          await fetch('/actuator/health', {
            method: 'GET',
            signal: apiController.signal,
            cache: 'no-store'
          });
          clearTimeout(apiTimeoutId);

          this.online.set(true);
          if (rtt > 500) {
            this.effectiveBandwidthMbps.set(0.5);   // genuinely slow
          } else if (rtt > 200) {
            this.effectiveBandwidthMbps.set(1.5);   // moderate
          } else {
            this.effectiveBandwidthMbps.set(10);
          }
        } catch {
          // API health check failed → WiFi connected but no internet
          this.online.set(false);
          this.effectiveBandwidthMbps.set(0);
        }
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        // Only mark offline on genuine network failure, not abort timeout
        if (err instanceof TypeError) {
          this.online.set(false);
          this.effectiveBandwidthMbps.set(0);
        }
        // AbortError (timeout 5s) → mark as slow, not offline
        if (err?.name === 'AbortError') {
          this.effectiveBandwidthMbps.set(0.3);
        }
      });
  }

  private normalizeConnectionTransport(value: unknown): ConnectionTransport {
    if (value === 'wifi' || value === 'ethernet' || value === 'cellular') {
      return value;
    }

    return 'unknown';
  }
}
