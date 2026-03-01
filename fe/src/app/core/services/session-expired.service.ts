import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { NetworkStatusService } from './network-status.service';

export type AuthState =
  | 'ONLINE_AUTHENTICATED'
  | 'OFFLINE_AUTHENTICATED'
  | 'OFFLINE_DEGRADED'
  | 'UNAUTHENTICATED';

/**
 * Four-state auth machine for maritime PWA soft logout.
 *
 * States:
 *  ONLINE_AUTHENTICATED  — tokens valid, server reachable
 *  OFFLINE_AUTHENTICATED — offline, refresh token still valid (full offline access)
 *  OFFLINE_DEGRADED      — offline AND refresh token expired (read-only cached content)
 *  UNAUTHENTICATED       — no tokens
 *
 * Automatically re-evaluates when network status changes.
 */
@Injectable({ providedIn: 'root' })
export class SessionExpiredService {
  private network = inject(NetworkStatusService);

  private readonly _state = signal<AuthState>('UNAUTHENTICATED');
  readonly state = this._state.asReadonly();

  readonly showExpiredBanner = computed(() => this._state() === 'OFFLINE_DEGRADED');
  readonly isAuthenticated = computed(() =>
    this._state() === 'ONLINE_AUTHENTICATED' || this._state() === 'OFFLINE_AUTHENTICATED'
  );
  readonly isDegraded = computed(() => this._state() === 'OFFLINE_DEGRADED');

  /** Re-evaluate auth state whenever network status changes */
  private networkEffect = effect(() => {
    const online = this.network.online(); // track signal
    // Only re-evaluate if we have tokens (avoid overwriting explicit transitions)
    if (this.hasStoredTokens()) {
      this.evaluateState();
    }
  });

  evaluateState(): void {
    const hasTokens = this.hasStoredTokens();
    if (!hasTokens) {
      this._state.set('UNAUTHENTICATED');
      return;
    }

    const online = this.network.online();
    const refreshValid = this.isRefreshTokenValid();

    if (online) {
      this._state.set('ONLINE_AUTHENTICATED');
    } else if (refreshValid) {
      this._state.set('OFFLINE_AUTHENTICATED');
    } else {
      this._state.set('OFFLINE_DEGRADED');
    }
  }

  transitionToAuthenticated(): void {
    this._state.set(this.network.online() ? 'ONLINE_AUTHENTICATED' : 'OFFLINE_AUTHENTICATED');
  }

  transitionToDegraded(): void {
    this._state.set('OFFLINE_DEGRADED');
  }

  transitionToUnauthenticated(): void {
    this._state.set('UNAUTHENTICATED');
  }

  isRefreshTokenValid(): boolean {
    const expiry = this.getRefreshTokenExpiry();
    if (!expiry) return false;
    return expiry.getTime() > Date.now();
  }

  getRefreshTokenExpiry(): Date | null {
    if (typeof localStorage === 'undefined') return null;
    const token = localStorage.getItem('lms_refresh_token');
    if (!token) return null;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(atob(parts[1]));
      if (!payload.exp) return null;
      return new Date(payload.exp * 1000);
    } catch {
      return null;
    }
  }

  private hasStoredTokens(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return !!localStorage.getItem('lms_access_token');
  }
}
