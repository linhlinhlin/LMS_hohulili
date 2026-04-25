import { Injectable, signal } from '@angular/core';

/**
 * Real backend health probe via Spring Boot Actuator.
 *
 * Replaces the previous fictional 4-row breakdown (database / api / email /
 * storage = 'healthy') in the admin dashboard. The course-analytics API never
 * carried those fields — the FE was filling them with `??` defaults, so the
 * card always showed green even when the backend was down.
 *
 * Backend exposes `/actuator/health` (public, no auth — see
 * config/PublicApiEndpointMatcher.java:42). Default Spring Boot response is
 * `{"status":"UP"}` or `{"status":"DOWN"}`. Anything else (network error,
 * non-200, AbortError) is classified DOWN.
 */
export type HealthStatus = 'up' | 'down' | 'unknown';

const PROBE_TIMEOUT_MS = 5_000;

@Injectable({ providedIn: 'root' })
export class SystemHealthService {
  readonly status = signal<HealthStatus>('unknown');
  readonly lastChecked = signal<Date | null>(null);
  readonly loading = signal(false);

  async refresh(): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

    try {
      const res = await fetch('/actuator/health', {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      });
      if (!res.ok) {
        this.status.set('down');
      } else {
        const body = await res.json().catch(() => null);
        const raw = (body?.status ?? '').toString().toUpperCase();
        this.status.set(raw === 'UP' ? 'up' : 'down');
      }
    } catch {
      // AbortError, network failure, JSON parse error — all map to DOWN.
      this.status.set('down');
    } finally {
      clearTimeout(timeoutId);
      this.lastChecked.set(new Date());
      this.loading.set(false);
    }
  }
}
