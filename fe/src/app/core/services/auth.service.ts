import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap, throwError, map } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AUTH_ENDPOINTS } from '../../api/endpoints/auth.endpoints';
import { ApiResponse } from '../../api/types/common.types';

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
  avatar?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private tokenKey = 'lms_access_token';
  private refreshTokenKey = 'lms_refresh_token';
  private userKey = 'lms_user';

  private currentUserSubject = new BehaviorSubject<User | null>(this.getSavedUser());
  public currentUser$ = this.currentUserSubject.asObservable();

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
        // Normalize role for currentUserSubject too
        const normalizedUser = { ...data.user, role: data.user.role?.toLowerCase() || '' };
        this.currentUserSubject.next(normalizedUser);
      }),
      catchError(error => {
        throw error;
      })
    );
  }

  register(userData: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(AUTH_ENDPOINTS.REGISTER, userData);
  }

  loginAsDemo(role: string): Observable<AuthResponse> {
    return this.login({ email: `demo_${role}@example.com`, password: 'demo123' });
  }

  logout(): void {
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

    // Primary token key
    let token = localStorage.getItem(this.tokenKey);

    // Fallback to other possible keys if primary is not found
    if (!token) {
      token = localStorage.getItem('token') ||
        localStorage.getItem('access_token') ||
        localStorage.getItem('auth_token');
    }

    return token;
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
    return userStr ? JSON.parse(userStr) : null;
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
    return this.http.post<AuthResponse>(AUTH_ENDPOINTS.REFRESH, { refreshToken }).pipe(
      tap(response => {
        this.setTokens(response.accessToken, response.refreshToken);
        this.setUser(response.user);
        // Normalize role for currentUserSubject too
        const normalizedUser = { ...response.user, role: response.user.role?.toLowerCase() || '' };
        this.currentUserSubject.next(normalizedUser);
      })
    );
  }
}
