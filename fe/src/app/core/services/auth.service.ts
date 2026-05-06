import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap, throwError, map } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AUTH_ENDPOINTS } from '../../api/endpoints/auth.endpoints';
import { ApiResponse } from '../../api/types/common.types';
import { SessionExpiredService } from './session-expired.service';
import { NetworkStatusService } from './network-status.service';
import { getPortalRootRoute } from '../utils/portal-route.util';

export enum UserRole {
  ADMIN = 'admin',
  ORG_ADMIN = 'org_admin',
  TEACHER = 'teacher',
  STUDENT = 'student'
}

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  name?: string;
  role: string;
  enabled: boolean;
  organizationId?: string;
  organizationName?: string;
  avatar?: string;
  mustChangePassword?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User & { organizationId?: string };
}

export interface GoogleLoginRequest {
  idToken: string;
  inviteCode?: string;
}

export interface AuthLookupResponse {
  email: string;
  displayName: string | null;
  accountExists: boolean;
  passwordLoginAvailable: boolean;
  googleSignInAvailable: boolean;
  nextStep: 'PASSWORD' | 'GOOGLE' | 'REGISTER';
  googleUnavailableMessage?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private sessionService = inject(SessionExpiredService);
  private network = inject(NetworkStatusService);
  private tokenKey = 'lms_access_token';
  private refreshTokenKey = 'lms_refresh_token';
  private userKey = 'lms_user';

  private currentUserSubject = new BehaviorSubject<User | null>(this.getSavedUser());
  public currentUser$ = this.currentUserSubject.asObservable();

  /** Signal-based wrappers (non-breaking, incremental migration) */
  private readonly _currentUser = signal<User | null>(this.getSavedUser());
  readonly currentUserSignal = this._currentUser.asReadonly();
  readonly isAuthenticatedSignal = computed(() => !!this._currentUser());
  readonly userRoleSignal = computed(() => this._currentUser()?.role || '');

  login(credentials: { email: string; password: string }): Observable<AuthResponse> {
    const loginRequest = this.http.post<ApiResponse<AuthResponse>>(AUTH_ENDPOINTS.LOGIN, credentials);

    return loginRequest.pipe(
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Login failed');
        }
        return response.data;
      }),
      tap(data => this.applyAuthenticatedSession(data)),
      catchError(error => {
        throw error;
      })
    );
  }

  lookupAuthOptions(email: string): Observable<AuthLookupResponse> {
    return this.http.post<ApiResponse<AuthLookupResponse>>(AUTH_ENDPOINTS.LOOKUP, { email }).pipe(
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Lookup failed');
        }
        return response.data;
      })
    );
  }

  loginWithGoogle(request: GoogleLoginRequest): Observable<AuthResponse> {
    return this.http.post<ApiResponse<AuthResponse>>(AUTH_ENDPOINTS.GOOGLE_LOGIN, request).pipe(
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Google login failed');
        }
        return response.data;
      }),
      tap(data => this.applyAuthenticatedSession(data))
    );
  }

  register(userData: any): Observable<AuthResponse> {
    return this.http.post<ApiResponse<AuthResponse>>(AUTH_ENDPOINTS.REGISTER, userData).pipe(
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Registration failed');
        }
        return response.data;
      }),
      tap(data => this.applyAuthenticatedSession(data))
    );
  }

  updateProfile(data: { fullName?: string; email?: string; avatarUrl?: string }): Observable<User> {
    return this.http.put<ApiResponse<User>>(AUTH_ENDPOINTS.PROFILE, data).pipe(
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Profile update failed');
        }
        return response.data;
      }),
      tap(updatedUser => {
        const current = this.currentUserSubject.value;
        if (current) {
          const merged = { ...current, ...updatedUser };
          this.currentUserSubject.next(merged);
          this._currentUser.set(merged);
          if (this.canUseLocalStorage()) {
            localStorage.setItem(this.userKey, JSON.stringify(merged));
          }
        }
      })
    );
  }

  /**
   * Logout — online: full logout (clear everything + server call).
   * Offline: soft logout (Auth0 "application-only logout" / Moodle "Change Site" pattern).
   *
   * SOTA: Zero out of 12 major products (Google, Microsoft, Moodle, Auth0, Okta,
   * ChromeOS, Intune, Canvas, Spotify, Netflix, Slack, Apple MDM) block logout
   * when offline. The standard pattern is "local logout" — clear UI session,
   * keep tokens + cached data, allow session resume.
   */
  logout(): void {
    if (!this.network.online()) {
      this.softLogout();
      return;
    }

    // Online: full logout — call server + clear everything
    this.http.post(AUTH_ENDPOINTS.LOGOUT, {}, { responseType: 'text' }).subscribe({
      next: () => {},
      error: () => {}
    });

    if (this.canUseLocalStorage()) {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.refreshTokenKey);
      localStorage.removeItem(this.userKey);

      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('learning_progress_') || key.startsWith('learning_completed_sections_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    }

    if (typeof caches !== 'undefined') {
      caches.keys().then(names =>
        Promise.all(names.filter(n => n.startsWith('ngsw:')).map(n => caches.delete(n)))
      ).catch(() => {});
    }

    this.currentUserSubject.next(null);
    this._currentUser.set(null);
    this.sessionService.transitionToUnauthenticated();

    this.router.navigate(['/auth/login']);
  }

  /**
   * Soft logout — Auth0 "application-only logout" / Moodle "Change Site" pattern.
   *
   * Clears UI session state but KEEPS tokens + IndexedDB offline data.
   * User can resume the offline session from the login page without network.
   *
   * Why: Maritime crews at sea for months cannot afford to lose offline access.
   * Clearing tokens when offline = permanently locked out until network returns.
   */
  softLogout(): void {
    // Clear UI session state only — user appears logged out
    this.currentUserSubject.next(null);
    this._currentUser.set(null);
    this.sessionService.transitionToDegraded();

    // KEEP tokens in localStorage (for offline session resume)
    // KEEP IndexedDB offline data (downloaded courses, progress)
    // KEEP lms_user in localStorage (for session resume to know who was logged in)

    this.router.navigate(['/auth/login']);
  }

  /**
   * Resume offline session — restore UI state from stored tokens + user data.
   * Called from login page when user clicks "Tiếp tục ngoại tuyến".
   *
   * Pattern: ChromeOS cached credentials + Moodle "Change Site" resume.
   */
  resumeOfflineSession(): boolean {
    const savedUser = this.getSavedUser();
    const hasToken = this.getToken();

    if (!savedUser || !hasToken) {
      return false;
    }

    // Restore UI session from stored data
    this.currentUserSubject.next(savedUser);
    this._currentUser.set(savedUser);
    this.sessionService.evaluateState();

    // Navigate to role-based dashboard
    const role = savedUser.role?.toLowerCase() || '';
    const redirectUrl = getPortalRootRoute(role);

    this.router.navigate([redirectUrl]);
    return true;
  }

  /**
   * Check if a soft-logged-out session can be resumed.
   * True when tokens + user data exist in localStorage but UI session is cleared.
   */
  canResumeSession(): boolean {
    return !!this.getToken() && !!this.getSavedUser() && !this.getCurrentUser();
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    if (this.canUseLocalStorage()) {
      localStorage.setItem(this.tokenKey, accessToken);
      localStorage.setItem(this.refreshTokenKey, refreshToken);
    }
  }

  getToken(): string | null {
    if (!this.canUseLocalStorage()) {
      return null;
    }
    return localStorage.getItem(this.tokenKey);
  }

  private normalizeUser(user: User): User {
    return {
      ...user,
      role: user.role?.toLowerCase() || '',
      avatar: (user as any).avatarUrl || user.avatar || null
    };
  }

  private setUser(user: User): void {
    const normalizedUser = this.normalizeUser(user);
    if (this.canUseLocalStorage()) {
      localStorage.setItem(this.userKey, JSON.stringify(normalizedUser));
    }
  }

  getSavedUser(): User | null {
    if (!this.canUseLocalStorage()) {
      return null;
    }
    const userStr = localStorage.getItem(this.userKey);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      localStorage.removeItem(this.userKey);
      return null;
    }
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Public entry point for the server-side Google OAuth redirect flow.
   *
   * Unlike the in-page Google ID-token flow (which calls /api/v3/auth/google and pipes
   * the response through `loginWithGoogle().tap(applyAuthenticatedSession)`), the redirect
   * flow lands the user on /auth/google/callback with an already-issued JWT in the URL
   * fragment. The callback component parses the fragment, builds an AuthResponse, and
   * calls this method to hydrate the session — no extra round-trip to the server.
   */
  hydrateFromOAuthRedirect(data: AuthResponse): void {
    this.applyAuthenticatedSession(data);
  }

  private applyAuthenticatedSession(data: AuthResponse): void {
    if (!data.accessToken) {
      return;
    }

    this.setTokens(data.accessToken, data.refreshToken);
    this.setUser(data.user);
    const normalizedUser = this.normalizeUser(data.user);
    this.currentUserSubject.next(normalizedUser);
    this._currentUser.set(normalizedUser);
    this.sessionService.transitionToAuthenticated();

    if (data.user?.mustChangePassword) {
      this.router.navigate(['/auth/change-password'], { replaceUrl: true });
    }
  }

  /** Update local user state after profile edit (no server call) */
  updateLocalUser(partial: Partial<User>): void {
    const current = this.getCurrentUser();
    if (!current) return;
    const updated = { ...current, ...partial };
    this.setUser(updated);
    this.currentUserSubject.next(updated);
    this._currentUser.set(updated);
  }

  // Computed properties for template usage
  userName = () => this.getCurrentUser()?.fullName || this.getCurrentUser()?.name || '';
  userEmail = () => this.getCurrentUser()?.email || '';
  userRole = () => this.getCurrentUser()?.role || '';
  currentUser = () => this.getCurrentUser();

  // Additional properties for backward compatibility
  user = () => this.getCurrentUser();
  error = () => '';
  isLoading = () => false;

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  refreshToken(): Observable<AuthResponse> {
    if (!this.canUseLocalStorage()) {
      return throwError(() => new Error('Cannot refresh token in SSR context'));
    }

    const refreshToken = localStorage.getItem(this.refreshTokenKey);
    return this.http.post<ApiResponse<AuthResponse>>(AUTH_ENDPOINTS.REFRESH, { refreshToken }).pipe(
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Token refresh failed');
        }
        return response.data;
      }),
      tap(data => this.applyAuthenticatedSession(data))
    );
  }

  private canUseLocalStorage(): boolean {
    return typeof localStorage !== 'undefined'
      && typeof localStorage.getItem === 'function'
      && typeof localStorage.setItem === 'function'
      && typeof localStorage.removeItem === 'function';
  }
}
