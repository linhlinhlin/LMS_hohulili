import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { Router } from '@angular/router';
import { User, UserRole, LoginRequest, RegisterRequest } from '../../shared/types/user.types';
import { AuthenticationResponse } from '../../api/types/auth.types';
import { ApiResponse } from '../../api/types/common.types';
import { ApiClient } from '../../api/client/api-client';
import { AUTH_ENDPOINTS } from '../../api/endpoints/auth.endpoints';
import { ErrorHandlingService } from '../../shared/services/error-handling.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private router = inject(Router);
  private apiClient = inject(ApiClient);
  private errorService = inject(ErrorHandlingService);

  // Core signals for state management
  private _user = signal<User | null>(null);
  private _isLoading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Readonly computed signals for external consumption
  readonly currentUser = computed(() => this._user());
  readonly isLoading = computed(() => this._isLoading());
  readonly error = computed(() => this._error());
  readonly isAuthenticated = computed(() => !!this._user());
  readonly userRole = computed(() => this._user()?.role || null);
  readonly userName = computed(() => this._user()?.name || this._user()?.fullName || '');
  readonly userEmail = computed(() => this._user()?.email || '');

  constructor() {
    // Auto-hydrate state from localStorage on service initialization
    this.initializeFromStorage();

    // Auto-sync state to localStorage when user changes
    effect(() => {
      const user = this._user();
      if (typeof window !== 'undefined' && window.localStorage) {
        if (user) {
          localStorage.setItem('lms_user', JSON.stringify(user));
        } else {
          localStorage.removeItem('lms_user');
        }
      }
    });
  }

  private initializeFromStorage(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedUser = localStorage.getItem('lms_user');
      const loginTime = localStorage.getItem('lms_login_time');

      if (storedUser && loginTime) {
        try {
          const user = JSON.parse(storedUser);
          const loginTimestamp = parseInt(loginTime);
          const now = Date.now();

          // Check if session has expired (24 hours)
          if (now - loginTimestamp < 24 * 60 * 60 * 1000) {
            this._user.set(user);
          } else {
            // Session expired, clear storage
            localStorage.removeItem('lms_user');
            localStorage.removeItem('lms_login_time');
          }
        } catch (error) {
          console.error('Error parsing stored user:', error);
          localStorage.removeItem('lms_user');
          localStorage.removeItem('lms_login_time');
        }
      }
    }
  }

  // State mutation methods
  setUser(user: User | null): void {
    this._user.set(user);
    if (user) {
      // Store login time for session management
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('lms_login_time', Date.now().toString());
      }
    }
  }

  setLoading(loading: boolean): void {
    this._isLoading.set(loading);
  }

  setError(error: string | null): void {
    this._error.set(error);
  }

  // Token management methods
  private setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
    }
  }

  private getAccessToken(): string | null {
    return typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  }

  private getRefreshToken(): string | null {
    return typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
  }

  // User mapping methods
  private mapBackendUserToFrontend(backendUser: any): User {
    return {
      id: backendUser.id,
      username: backendUser.username,
      email: backendUser.email,
      fullName: backendUser.fullName,
      name: backendUser.fullName, // alias for templates using `name`
      role: this.mapBackendRole(backendUser.role),
      enabled: backendUser.enabled,
      avatar: this.getDefaultAvatar(backendUser.email),
      department: this.getDepartmentFromRole(this.mapBackendRole(backendUser.role)),
      studentId: this.mapBackendRole(backendUser.role) === 'student' ? this.generateStudentId() : undefined,
      createdAt: backendUser.createdAt || new Date().toISOString(),
      updatedAt: backendUser.updatedAt || new Date().toISOString()
    };
  }

  private mapFrontendUserToBackend(frontendUser: User): any {
    return {
      username: frontendUser.username,
      email: frontendUser.email,
      fullName: frontendUser.fullName,
      role: frontendUser.role.toUpperCase(),
      enabled: frontendUser.enabled
    };
  }


  async login(credentials: LoginRequest): Promise<void> {
    try {
      this._isLoading.set(true);
      this._error.set(null);

      // Backend expects { email, password } (email may be username)
      const backendCredentials = {
        email: credentials.email,
        password: credentials.password
      };

      // Call backend API - backend returns data directly, not wrapped in {data: ...}
      const response = await this.apiClient.post<AuthenticationResponse>(
        AUTH_ENDPOINTS.LOGIN,
        backendCredentials
      ).toPromise();

      if (response && response.accessToken && response.user) {
        // Store tokens
        this.setTokens(response.accessToken, response.refreshToken);

        // Map and store user
        const mappedUser = this.mapBackendUserToFrontend(response.user);
        this.setUser(mappedUser);

  this.errorService.showSuccess(`Chào mừng ${mappedUser.name || mappedUser.fullName}!`, 'login');

        // Navigate: prefer returnUrl if present, otherwise go to role-based dashboard
        const returnUrl = this.getReturnUrlFromRouter();
        if (returnUrl) {
          this.router.navigateByUrl(returnUrl).catch(error => {
            console.error('Navigation error (returnUrl):', error);
            this.navigateToDashboard(mappedUser.role);
          });
        } else {
          this.navigateToDashboard(mappedUser.role);
        }
      } else {
        throw new Error('Invalid response format');
      }

    } catch (error: any) {
      const errorMessage = error?.error?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
      this._error.set(errorMessage);
      this.errorService.addError({
        message: errorMessage,
        type: 'error',
        context: 'login'
      });
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  async register(userData: RegisterRequest): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // Transform userData to match backend expectations
      const backendUserData: any = {
        // Ensure username is present (fallback to email prefix)
        username: userData.username || (userData.email ? userData.email.split('@')[0] : ''),
        // Ensure email is present (fallback to username)
        email: userData.email || userData.username,
        password: userData.password,
        fullName: userData.fullName
      };

      // Map role to backend enum format (ADMIN/TEACHER/STUDENT) only if provided
      if (userData.role) {
        backendUserData.role = this.mapFrontendRoleToBackend(userData.role);
      }

      // Call backend API - backend returns data directly, not wrapped in {data: ...}
      const response = await this.apiClient.post<AuthenticationResponse>(
        AUTH_ENDPOINTS.REGISTER,
        backendUserData
      ).toPromise();

      if (response && response.accessToken && response.user) {
        // Store tokens
        this.setTokens(response.accessToken, response.refreshToken);

        // Map and store user
        const mappedUser = this.mapBackendUserToFrontend(response.user);
        this.setUser(mappedUser);

        this.errorService.showSuccess(`Đăng ký thành công! Chào mừng ${mappedUser.fullName}!`, 'register');

        // After register, prefer returnUrl (if any), else role-based dashboard
        const returnUrl = this.getReturnUrlFromRouter();
        if (returnUrl) {
          this.router.navigateByUrl(returnUrl).catch(() => this.navigateToDashboard(mappedUser.role));
        } else {
          this.navigateToDashboard(mappedUser.role);
        }
      } else {
        throw new Error('Invalid response format');
      }

    } catch (error: any) {
      const errorMessage = error?.error?.message || 'Đăng ký thất bại. Vui lòng thử lại.';
      this._error.set(errorMessage);
      this.errorService.addError({
        message: errorMessage,
        type: 'error',
        context: 'register'
      });
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  async logout(): Promise<void> {
    try {
      // Call logout endpoint if needed; ignore response type to avoid JSON parsing issues
      try {
        await this.apiClient.post(AUTH_ENDPOINTS.LOGOUT, {}, { responseType: 'text' }).toPromise();
      } catch (e) {
        // Many backends return text/plain or no body; ignore parse/format errors
        console.warn('Logout API call failed:', e);
      }
    } catch (error) {
      // Ignore logout errors
      console.warn('Logout API call failed:', error);
    } finally {
      // Always clear local state
      this._user.set(null);
      this._error.set(null);

      // Clear localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('lms_user');
        localStorage.removeItem('lms_login_time');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }

      // Navigate to login
      this.router.navigate(['/auth/login']).catch(error => {
        console.error('Navigation error:', error);
      });

      // Đã đăng xuất thành công - không hiển thị thông báo
    }
  }

  // Role checking methods
  hasRole(role: UserRole): boolean {
    return this.userRole() === role;
  }

  hasAnyRole(roles: UserRole[]): boolean {
    const userRole = this.userRole();
    return userRole ? roles.includes(userRole) : false;
  }

  // Compatibility method for components using user()
  user(): User | null {
    return this._user();
  }

  private getRoleFromEmail(email: string): UserRole {
    if (email.includes('admin')) return 'admin';
    if (email.includes('teacher')) return 'teacher';
    if (email.includes('student')) return 'student';
    return 'student'; // Default role
  }

  private getEmailFromUsername(username: string): string {
    // Convert username to email format that backend expects
    switch (username.toLowerCase()) {
      case 'admin':
        return 'admin@lms.com';
      case 'teacher1':
        return 'teacher1@lms.com';
      case 'student1':
        return 'student1@lms.com';
      default:
        // If it's already an email, return as is
        if (username.includes('@')) {
          return username;
        }
        // Otherwise, assume it's a username and convert to email
        return `${username}@lms.com`;
    }
  }

  private navigateToDashboard(role: UserRole): void {
    let dashboardUrl: string;

    switch (role) {
      case 'admin':
        dashboardUrl = '/admin';
        break;
      case 'teacher':
        dashboardUrl = '/teacher';
        break;
      case 'student':
        dashboardUrl = '/student';
        break;
      default:
        dashboardUrl = '/student'; // Default fallback
    }

    this.router.navigate([dashboardUrl]).catch(error => {
      console.error('Navigation error:', error);
    });
  }

  // Helper methods for role mapping
  private mapBackendRole(backendRole: string): UserRole {
    switch ((backendRole || '').toUpperCase()) {
      case 'STUDENT': return 'student';
      case 'TEACHER': return 'teacher';
      case 'ADMIN': return 'admin';
      default: return 'student';
    }
  }

  private mapFrontendRoleToBackend(frontendRole: UserRole): string {
    return (frontendRole || 'student').toUpperCase();
  }

  // Attempt to read returnUrl from the current router state (e.g., set by guards)
  private getReturnUrlFromRouter(): string | null {
    try {
      let route = this.router.routerState.snapshot.root;
      while (route) {
        const q = route.queryParams;
        if (q && typeof q['returnUrl'] === 'string' && q['returnUrl']) {
          return q['returnUrl'];
        }
        route = route.firstChild as any;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  private generateUserId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private generateStudentId(): string {
    return 'SV' + new Date().getFullYear() + Math.random().toString(36).substr(2, 4).toUpperCase();
  }

  private getDemoName(role: UserRole): string {
    switch (role) {
      case 'student': return 'Nguyễn Văn Học viên';
      case 'teacher': return 'ThS. Trần Thị Giáo viên';
      case 'admin': return 'Admin Hệ thống';
      default: return 'Người dùng Demo';
    }
  }

  private getDefaultAvatar(email: string): string {
    const name = email.split('@')[0];
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3b82f6&color=ffffff&size=150`;
  }

  private getDepartmentFromRole(role: UserRole): string {
    switch (role) {
      case 'student': return 'Khoa Hàng hải';
      case 'teacher': return 'Khoa Hàng hải';
      case 'admin': return 'Phòng Quản trị';
      default: return 'Khoa Hàng hải';
    }
  }

  // Demo login methods for testing
  async loginAsDemo(role: UserRole): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // Simulate API call
      await this.simulateApiCall();

      // Mock user data based on role
      const mockUser: User = {
        id: this.generateUserId(),
        username: `${role.toLowerCase()}demo`,
        email: `${role.toLowerCase()}@demo.com`,
        fullName: this.getDemoName(role),
        name: this.getDemoName(role),
        role: role,
        enabled: true,
        avatar: this.getDefaultAvatar(`${role.toLowerCase()}@demo.com`),
        department: this.getDepartmentFromRole(role),
        studentId: role === 'student' ? this.generateStudentId() : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.setUser(mockUser);
      this._isLoading.set(false);

      // Navigate to appropriate dashboard based on role
      this.navigateToDashboard(role);

    } catch (error) {
      this._error.set('Login failed. Please try again.');
      this._isLoading.set(false);
      throw error;
    }
  }

  private async simulateApiCall(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}