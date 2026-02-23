import { Injectable, signal, computed } from '@angular/core';

export type ConnectionTier = 'none' | 'slow' | 'fast';

@Injectable({ providedIn: 'root' })
export class NetworkStatusService {
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
   */
  private probeLatency(): void {
    if (!navigator.onLine) return;

    const start = performance.now();
    fetch('/actuator/health', { method: 'HEAD', cache: 'no-cache' })
      .then(() => {
        const rtt = performance.now() - start;
        // Estimate: RTT > 500ms → satellite (~0.5 Mbps), > 200ms → slow (~1.5 Mbps)
        if (rtt > 500) {
          this.effectiveBandwidthMbps.set(0.5);
        } else if (rtt > 200) {
          this.effectiveBandwidthMbps.set(1.5);
        }
        // Otherwise keep Network Information API value or default
      })
      .catch(() => {
        // Probe failed — keep existing value
      });
  }
}
