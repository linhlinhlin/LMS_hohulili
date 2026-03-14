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
   * Probe actual latency via HEAD to a bundled icon (cached by SW).
   * Uses /icons/icon-192x192.png which is in the app-shell prefetch group,
   * so it works even when served from SW cache.
   *
   * IMPORTANT: Does NOT use cache: 'no-cache' — allows SW to serve
   * cached responses. We only set offline when the fetch truly fails
   * (TypeError = no network AND no SW cache).
   *
   * On iOS: SW can be evicted after ~5min background. If that happens,
   * we rely solely on navigator.onLine events (no aggressive probe).
   */
  private probeLatency(): void {
    if (!navigator.onLine) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const start = performance.now();
    fetch('/icons/icon-192x192.png', { method: 'HEAD', signal: controller.signal })
      .then(() => {
        clearTimeout(timeoutId);
        const rtt = performance.now() - start;
        this.online.set(true);
        if (rtt > 500) {
          this.effectiveBandwidthMbps.set(0.5);
        } else if (rtt > 200) {
          this.effectiveBandwidthMbps.set(1.5);
        }
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        // Only mark offline on genuine network failure, not abort timeout
        if (err instanceof TypeError) {
          this.online.set(false);
          this.effectiveBandwidthMbps.set(0);
        }
        // AbortError (timeout) → keep existing state (might be slow, not offline)
      });
  }
}
