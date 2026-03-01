import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap, throwError, map } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AUTH_ENDPOINTS } from '../../api/endpoints/auth.endpoints';
import { ApiResponse } from '../../api/types/common.types';
import { SessionExpiredService } from './session-expired.service';
import { NetworkStatusService } from './network-status.service';

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
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User & { organizationId?: string };
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
      tap(data => {
        this.setTokens(data.accessToken, data.refreshToken);
        this.setUser(data.user);
        const normalizedUser = { ...data.user, role: data.user.role?.toLowerCase() || '' };
        this.currentUserSubject.next(normalizedUser);
        this._currentUser.set(normalizedUser);
        this.sessionService.transitionToAuthenticated();
      }),
      catchError(error => {
        throw error;
      })
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
      tap(data => {
        if (data.accessToken) {
          this.setTokens(data.accessToken, data.refreshToken);
          this.setUser(data.user);
          const normalizedUser = { ...data.user, role: data.user.role?.toLowerCase() || '' };
          this.currentUserSubject.next(normalizedUser);
          this._currentUser.set(normalizedUser);
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

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.refreshTokenKey);
      localStorage.removeItem(this.userKey);
    }

    this.currentUserSubject.next(null);
    this._currentUser.set(null);
    this.sessionService.transitionToUnauthenticated();

    this.router.navigate(['/auth/login'], {
      queryParams: { message: 'Đã đăng xuất thành công' }
    });
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

    this.router.navigate(['/auth/login'], {
      queryParams: { softLogout: 'true' }
    });
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
    let redirectUrl = '/';
    switch (role) {
      case 'admin':
      case 'org_admin':
        redirectUrl = '/admin';
        break;
      case 'teacher':
        redirectUrl = '/teacher';
        break;
      case 'student':
        redirectUrl = '/student';
        break;
    }

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
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.tokenKey, accessToken);
      localStorage.setItem(this.refreshTokenKey, refreshToken);
    }
  }

  getToken(): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    return localStorage.getItem(this.tokenKey);
  }

  private setUser(user: User): void {
    const normalizedUser = { ...user, role: user.role?.toLowerCase() || '' };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.userKey, JSON.stringify(normalizedUser));
    }
  }

  private getSavedUser(): User | null {
    if (typeof localStorage === 'undefined') {
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
    if (typeof localStorage === 'undefined') {
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
      tap(data => {
        this.setTokens(data.accessToken, data.refreshToken);
        this.setUser(data.user);
        const normalizedUser = { ...data.user, role: data.user.role?.toLowerCase() || '' };
        this.currentUserSubject.next(normalizedUser);
        this._currentUser.set(normalizedUser);
        this.sessionService.transitionToAuthenticated();
      })
    );
  }
}
