import { Injectable, signal, computed, OnDestroy } from '@angular/core';

export type ConnectionTier = 'none' | 'slow' | 'fast';

@Injectable({ providedIn: 'root' })
export class NetworkStatusService implements OnDestroy {
  readonly online = signal(typeof navigator !== 'undefined' ? navigator.onLine : true);
  readonly effectiveBandwidthMbps = signal(2);

  readonly connectionTier = computed<ConnectionTier>(() => {
    if (!this.online()) return 'none';
    return this.effectiveBandwidthMbps() < 1 ? 'slow' : 'fast';
  });

  readonly connectionLabel = computed(() => {
    switch (this.connectionTier()) {
      case 'none': return 'Ngoại tuyến';
      case 'slow': return 'Kết nối chậm';
      case 'fast': return 'Trực tuyến';
    }
  });

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private probeInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => this.debouncedUpdate());
    window.addEventListener('offline', () => this.debouncedUpdate());

    const conn = (navigator as any).connection;
    if (conn) {
      conn.addEventListener('change', () => this.debouncedUpdate());
    }

    this.updateStatus();
    this.probeLatency();

    // Periodic re-probe every 30s (maritime connections fluctuate)
    this.probeInterval = setInterval(() => this.probeLatency(), 30_000);
  }

  ngOnDestroy(): void {
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
    if (!navigator.onLine) {
      this.effectiveBandwidthMbps.set(0);
    } else if (conn?.downlink != null) {
      this.effectiveBandwidthMbps.set(conn.downlink);
    } else {
      this.effectiveBandwidthMbps.set(2);
    }
  }

  /**
   * Probe actual latency via HEAD to /actuator/health.
   * Estimates bandwidth tier from RTT (maritime: satellite ~600ms, VSAT ~300ms).
   * Uses 3s AbortController timeout to prevent blocking.
   */
  private probeLatency(): void {
    if (!navigator.onLine) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const start = performance.now();
    fetch('/actuator/health', { method: 'HEAD', cache: 'no-cache', signal: controller.signal })
      .then((response) => {
        clearTimeout(timeoutId);
        const rtt = performance.now() - start;
        // Any HTTP response (including 401/403) means we're online
        this.online.set(true);
        // Estimate: RTT > 500ms → satellite (~0.5 Mbps), > 200ms → slow (~1.5 Mbps)
        if (rtt > 500) {
          this.effectiveBandwidthMbps.set(0.5);
        } else if (rtt > 200) {
          this.effectiveBandwidthMbps.set(1.5);
        }
        // Otherwise keep Network Information API value or default
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        // AbortError = timeout, TypeError = network failure → offline
        if (err?.name === 'AbortError' || err instanceof TypeError) {
          this.online.set(false);
          this.effectiveBandwidthMbps.set(0);
        }
        // Other errors — keep existing value
      });
  }
}
