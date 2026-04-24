import { Injectable, signal, computed, OnDestroy } from '@angular/core';

export type ConnectionTier = 'none' | 'slow' | 'fast';
export type ConnectionTransport = 'wifi' | 'ethernet' | 'cellular' | 'unknown';

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
  private probeInterval: ReturnType<typeof setInterval> | null = null;
  private readonly onlineHandler = () => {
    this.recentOfflineSignalAt.set(null);
    this.updateStatus();
    this.probeLatency();
  };
  private readonly offlineHandler = () => {
    this.markOfflineState();
    this.updateStatus();
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

  hasRecentOfflineSignal(windowMs = 15_000): boolean {
    const lastOfflineSignalAt = this.recentOfflineSignalAt();
    return lastOfflineSignalAt != null && Date.now() - lastOfflineSignalAt <= windowMs;
  }

  isEffectivelyOffline(windowMs = 15_000): boolean {
    return !this.getBrowserOnlineHint()
      || !this.online()
      || this.hasRecentOfflineSignal(windowMs);
  }

  markOfflineFromTransportFailure(): void {
    this.markOfflineState();
  }

  private debouncedUpdate(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.updateStatus(), 150);
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
    if (conn?.downlink != null) {
      this.effectiveBandwidthMbps.set(Math.max(conn.downlink, 1.5));
    } else {
      this.effectiveBandwidthMbps.set(2);
    }
  }

  private probeLatency(): void {
    if (!this.getBrowserOnlineHint()) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const start = performance.now();

    fetch('/icons/icon-192x192.png', {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (iconResponse) => {
        this.ensureSuccessfulProbeResponse(iconResponse);
        clearTimeout(timeoutId);

        const rtt = performance.now() - start;
        const apiController = new AbortController();
        const apiTimeoutId = setTimeout(() => apiController.abort(), 3000);

        try {
          const apiResponse = await fetch('/actuator/health', {
            method: 'GET',
            signal: apiController.signal,
            cache: 'no-store',
          });
          this.ensureSuccessfulProbeResponse(apiResponse);
          this.markMeasuredOnlineState(rtt);
        } catch {
          this.markOfflineState();
        } finally {
          clearTimeout(apiTimeoutId);
        }
      })
      .catch((error) => {
        clearTimeout(timeoutId);

        if (error?.name === 'AbortError') {
          this.online.set(true);
          this.recentOfflineSignalAt.set(null);
          this.effectiveBandwidthMbps.set(0.3);
          return;
        }

        this.markOfflineState();
      });
  }

  private normalizeConnectionTransport(value: unknown): ConnectionTransport {
    if (value === 'wifi' || value === 'ethernet' || value === 'cellular') {
      return value;
    }

    return 'unknown';
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
