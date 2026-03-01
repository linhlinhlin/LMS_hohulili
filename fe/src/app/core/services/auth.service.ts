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

  /** Maritime PWA: block logout when offline to preserve offline access */
  readonly canLogout = computed(() => this.network.online());

  login(credentials: { email: string; password: string }): Observable<AuthResponse> {
    // Update expected type to ApiResponse<AuthResponse>
    const loginRequest = this.http.post<ApiResponse<AuthResponse>>(AUTH_ENDPOINTS.LOGIN, credentials);

    return loginRequest.pipe(
      // Extract data from ApiResponse
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

  logout(): void {
    // Maritime PWA: block logout when offline — clearing tokens would lose all offline access
    // and user cannot login again without network connectivity
    if (!this.network.online()) {
      return;
    }

    // ✅ FIXED: Specify 'text' response type since backend returns plain text
    // Call backend logout (fire and forget)
    this.http.post(AUTH_ENDPOINTS.LOGOUT, {}, { responseType: 'text' }).subscribe({
      next: () => {
      },
      error: () => {
      }
    });

    // Clear local storage
    // ✅ Guard against SSR context where localStorage doesn't exist
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.refreshTokenKey);
      localStorage.removeItem(this.userKey);
    }

    this.currentUserSubject.next(null);
    this._currentUser.set(null);
    this.sessionService.transitionToUnauthenticated();

    // Redirect to login page
    this.router.navigate(['/auth/login'], {
      queryParams: { message: 'Đã đăng xuất thành công' }
    });
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    // SSR guard: Only access localStorage in browser context
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.tokenKey, accessToken);
      localStorage.setItem(this.refreshTokenKey, refreshToken);
    }
  }

  getToken(): string | null {
    // SSR guard: Only access localStorage in browser context
    if (typeof localStorage === 'undefined') {
      return null;
    }

    return localStorage.getItem(this.tokenKey);
  }

  private setUser(user: User): void {
    // Normalize role to lowercase for consistency
    const normalizedUser = { ...user, role: user.role?.toLowerCase() || '' };
    // ✅ Guard against SSR context where localStorage doesn't exist
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.userKey, JSON.stringify(normalizedUser));
    }
  }

  private getSavedUser(): User | null {
    // ✅ Guard against SSR context where localStorage doesn't exist
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
    // SSR guard: Only access localStorage in browser context
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
