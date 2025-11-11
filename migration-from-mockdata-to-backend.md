# 🔄 Hướng Dẫn Chuyển Từ Mock Data Sang Backend Thật - Admin LMS

## 📋 Tổng Quan

Tài liệu này hướng dẫn chi tiết cách chuyển đổi từ mock data sang sử dụng backend thật cho chức năng Admin trong hệ thống LMS Hàng Hải.

## 🎯 API Base URLs

### Development Environment
```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8090',  // Backend Spring Boot
  appName: 'LMS Maritime',
  version: '1.0.0'
};
```

### Production Environment
```typescript
// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://api.lms-maritime.com',  // Production backend URL
  appName: 'LMS Maritime',
  version: '1.0.0'
};
```

## 🔧 Các File Cần Sửa

### 1. Environment Configuration

**File:** `src/environments/environment.ts`
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8090',  // ✅ Đúng URL backend
  appName: 'LMS Maritime',
  version: '1.0.0'
};
```

**File:** `src/environments/environment.prod.ts`
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-production-api.com',  // ✅ Thay bằng URL thật
  appName: 'LMS Maritime',
  version: '1.0.0'
};
```

### 2. API Endpoints Configuration

**File:** `src/app/api/endpoints/auth.endpoints.ts`
```typescript
export const AUTH_ENDPOINTS = {
  LOGIN: '/api/v1/auth/login',
  REGISTER: '/api/v1/auth/register',
  LOGOUT: '/api/v1/auth/logout',
  REFRESH: '/api/v1/auth/refresh',
  ME: '/api/v1/auth/me',
  PROFILE: '/api/v1/auth/profile',
  PASSWORD: '/api/v1/auth/password',
  FORGOT_PASSWORD: '/api/v1/auth/forgot-password',
  RESET_PASSWORD: '/api/v1/auth/reset-password'
} as const;
```

**File:** `src/app/api/endpoints/admin.endpoints.ts` (Tạo mới)
```typescript
export const ADMIN_ENDPOINTS = {
  // Analytics
  ANALYTICS: '/api/v1/admin/analytics',
  USER_ANALYTICS: '/api/v1/admin/users/analytics',
  COURSE_ANALYTICS: '/api/v1/admin/courses/analytics',

  // Course Management
  PENDING_COURSES: '/api/v1/admin/courses/pending',
  ALL_COURSES: '/api/v1/admin/courses/all',
  APPROVE_COURSE: (courseId: string) => `/api/v1/admin/courses/${courseId}/approve`,
  REJECT_COURSE: (courseId: string) => `/api/v1/admin/courses/${courseId}/reject`,
  DELETE_COURSE: (courseId: string) => `/api/v1/admin/courses/${courseId}`,

  // User Management
  USERS: '/api/v1/users',
  USER_DETAIL: (userId: string) => `/api/v1/users/${userId}`,
  CREATE_USER: '/api/v1/users',
  UPDATE_USER: (userId: string) => `/api/v1/users/${userId}`,
  DELETE_USER: (userId: string) => `/api/v1/users/${userId}`,
  BULK_IMPORT_USERS: '/api/v1/users/bulk-import',
  IMPORT_TEMPLATE: '/api/v1/users/bulk-import/template',

  // File Upload
  SIGNED_URL: '/api/v1/uploads/signed-url',
  VALIDATE_UPLOAD: '/api/v1/uploads/validate',
  DELETE_FILE: '/api/v1/uploads/file'
} as const;
```

### 3. API Client Service

**File:** `src/app/api/client/api-client.ts`
```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../types/common.types';
import { CacheService } from '../../core/services/cache.service';

@Injectable({
  providedIn: 'root'
})
export class ApiClient {
  private http = inject(HttpClient);
  private cache = inject(CacheService);
  private readonly baseUrl = environment.apiUrl;  // ✅ Sử dụng environment

  constructor() {}

  // ... existing methods ...

  // Helper method for API responses with standard format
  getWithResponse<T>(endpoint: string, options?: any): Observable<ApiResponse<T>> {
    return this.http.get<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, options).pipe(
      map(response => response as unknown as ApiResponse<T>),
      catchError(this.handleError)
    );
  }

  postWithResponse<T>(endpoint: string, data: any, options?: any): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, data, options).pipe(
      map(response => response as unknown as ApiResponse<T>),
      catchError(this.handleError)
    );
  }

  putWithResponse<T>(endpoint: string, data: any, options?: any): Observable<ApiResponse<T>> {
    return this.http.put<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, data, options).pipe(
      map(response => response as unknown as ApiResponse<T>),
      catchError(this.handleError)
    );
  }

  deleteWithResponse<T>(endpoint: string, options?: any): Observable<ApiResponse<T>> {
    return this.http.delete<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, options).pipe(
      map(response => response as unknown as ApiResponse<T>),
      catchError(this.handleError)
    );
  }

  // ... rest of the file ...
}
```

### 4. Authentication Service

**File:** `src/app/core/services/auth.service.ts`
```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { AUTH_ENDPOINTS } from '../../api/endpoints/auth.endpoints';

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  enabled: boolean;
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
  private tokenKey = 'auth_token';
  private refreshTokenKey = 'refresh_token';
  private userKey = 'user';

  private currentUserSubject = new BehaviorSubject<User | null>(this.getSavedUser());
  public currentUser$ = this.currentUserSubject.asObservable();

  login(credentials: { username: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(AUTH_ENDPOINTS.LOGIN, credentials).pipe(
      tap(response => {
        this.setTokens(response.accessToken, response.refreshToken);
        this.setUser(response.user);
        this.currentUserSubject.next(response.user);
      })
    );
  }

  logout(): void {
    // Call backend logout
    this.http.post(AUTH_ENDPOINTS.LOGOUT, {}).subscribe();

    // Clear local storage
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
    this.currentUserSubject.next(null);
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(this.tokenKey, accessToken);
    localStorage.setItem(this.refreshTokenKey, refreshToken);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private setUser(user: User): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  private getSavedUser(): User | null {
    const userStr = localStorage.getItem(this.userKey);
    return userStr ? JSON.parse(userStr) : null;
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem(this.refreshTokenKey);
    return this.http.post<AuthResponse>(AUTH_ENDPOINTS.REFRESH, { refreshToken }).pipe(
      tap(response => {
        this.setTokens(response.accessToken, response.refreshToken);
        this.setUser(response.user);
        this.currentUserSubject.next(response.user);
      })
    );
  }
}
```

### 5. Admin Services

**File:** `src/app/features/admin/infrastructure/services/admin.service.ts`
```typescript
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../../api/client/api-client';
import { ADMIN_ENDPOINTS } from '../../../../api/endpoints/admin.endpoints';

export interface SystemAnalytics {
  totalUsers: number;
  totalTeachers: number;
  totalStudents: number;
  totalAdmins: number;
  totalCourses: number;
  approvedCourses: number;
  pendingCourses: number;
  rejectedCourses: number;
  draftCourses: number;
  totalAssignments: number;
  totalSubmissions: number;
  totalEnrollments: number;
  coursesByStatus: { [key: string]: number };
  usersByRole: { [key: string]: number };
  enrollmentsByMonth: { [key: string]: number };
}

export interface PendingCourseSummary {
  id: string;
  code: string;
  title: string;
  description: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  sectionsCount: number;
  submittedAt: string;
  createdAt: string;
}

export interface AdminCourseSummary {
  id: string;
  code: string;
  title: string;
  status: string;
  teacherName: string;
  enrolledCount: number;
  sectionsCount: number;
  assignmentsCount: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiClient = inject(ApiClient);

  getSystemAnalytics(): Observable<SystemAnalytics> {
    return this.apiClient.get<SystemAnalytics>(ADMIN_ENDPOINTS.ANALYTICS);
  }

  getPendingCourses(params: any = {}): Observable<{ data: PendingCourseSummary[]; pagination: any }> {
    return this.apiClient.getWithResponse<PendingCourseSummary[]>(ADMIN_ENDPOINTS.PENDING_COURSES, { params });
  }

  getAllCourses(params: any = {}): Observable<{ data: AdminCourseSummary[]; pagination: any }> {
    return this.apiClient.getWithResponse<AdminCourseSummary[]>(ADMIN_ENDPOINTS.ALL_COURSES, { params });
  }

  approveCourse(courseId: string): Observable<{ message: string }> {
    return this.apiClient.patchWithResponse<string>(ADMIN_ENDPOINTS.APPROVE_COURSE(courseId), {});
  }

  rejectCourse(courseId: string, reason: string): Observable<{ message: string }> {
    return this.apiClient.patchWithResponse<string>(ADMIN_ENDPOINTS.REJECT_COURSE(courseId), { reason });
  }

  deleteCourse(courseId: string): Observable<{ message: string }> {
    return this.apiClient.deleteWithResponse<string>(ADMIN_ENDPOINTS.DELETE_COURSE(courseId));
  }
}
```

**File:** `src/app/features/admin/infrastructure/services/user-management.service.ts`
```typescript
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../../api/client/api-client';
import { ADMIN_ENDPOINTS } from '../../../../api/endpoints/admin.endpoints';

export interface UserSummary {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserDetail extends UserSummary {}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
  role: string;
}

export interface UpdateUserRequest {
  email?: string;
  fullName?: string;
  role?: string;
  enabled?: boolean;
}

export interface BulkImportResult {
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  errors: Array<{
    row: number;
    email: string;
    error: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private apiClient = inject(ApiClient);

  getUsers(params: any = {}): Observable<{ data: UserSummary[]; pagination: any }> {
    return this.apiClient.getWithResponse<UserSummary[]>(ADMIN_ENDPOINTS.USERS, { params });
  }

  getAllUsers(): Observable<{ data: UserSummary[] }> {
    return this.apiClient.getWithResponse<UserSummary[]>(`${ADMIN_ENDPOINTS.USERS}/list/all`);
  }

  getUserById(userId: string): Observable<{ data: UserDetail }> {
    return this.apiClient.getWithResponse<UserDetail>(ADMIN_ENDPOINTS.USER_DETAIL(userId));
  }

  createUser(userData: CreateUserRequest): Observable<{ data: UserDetail }> {
    return this.apiClient.postWithResponse<UserDetail>(ADMIN_ENDPOINTS.CREATE_USER, userData);
  }

  updateUser(userId: string, userData: UpdateUserRequest): Observable<{ data: UserDetail }> {
    return this.apiClient.putWithResponse<UserDetail>(ADMIN_ENDPOINTS.UPDATE_USER(userId), userData);
  }

  deleteUser(userId: string): Observable<{ message: string }> {
    return this.apiClient.deleteWithResponse<string>(ADMIN_ENDPOINTS.DELETE_USER(userId));
  }

  bulkImportUsers(file: File): Observable<{ data: BulkImportResult }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.apiClient.postWithResponse<BulkImportResult>(ADMIN_ENDPOINTS.BULK_IMPORT_USERS, formData);
  }

  getImportTemplate(): Observable<{ data: string }> {
    return this.apiClient.getWithResponse<string>(ADMIN_ENDPOINTS.IMPORT_TEMPLATE);
  }
}
```

### 6. HTTP Interceptors

**File:** `src/app/api/interceptors/auth.interceptor.ts`
```typescript
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Add authorization header
    const token = this.authService.getToken();
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(request).pipe(
      catchError((error) => {
        if (error.status === 401) {
          // Token expired or invalid
          this.authService.logout();
          // Redirect to login page
          window.location.href = '/login';
        }
        return throwError(error);
      })
    );
  }
}
```

**File:** `src/app/api/interceptors/error.interceptor.ts`
```typescript
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NotificationService } from '../../shared/services/notification.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private notificationService: NotificationService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'An unknown error occurred';

        if (error.error instanceof ErrorEvent) {
          // Client-side error
          errorMessage = `Client Error: ${error.error.message}`;
        } else {
          // Server-side error
          if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else {
            errorMessage = `Server Error: ${error.status} - ${error.message}`;
          }
        }

        // Show error notification
        this.notificationService.showError(errorMessage);

        console.error('API Error:', error);
        return throwError(() => new Error(errorMessage));
      })
    );
  }
}
```

### 7. Admin Components

**File:** `src/app/features/admin/presentation/components/admin-dashboard.component.ts`
```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, SystemAnalytics } from '../../infrastructure/services/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container">
      <div class="stats-grid">
        <div class="stat-card" *ngFor="let stat of stats">
          <div class="stat-icon">
            <i [class]="stat.icon"></i>
          </div>
          <div class="stat-content">
            <h3>{{ stat.title }}</h3>
            <p class="value">{{ stat.value | number }}</p>
            <span class="change" [class]="stat.changeClass">
              {{ stat.change }}%
            </span>
          </div>
        </div>
      </div>

      <div class="charts-section">
        <div class="chart-card">
          <h4>Users by Role</h4>
          <canvas #usersChart></canvas>
        </div>
        <div class="chart-card">
          <h4>Courses by Status</h4>
          <canvas #coursesChart></canvas>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container { padding: 20px; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .stat-icon {
      font-size: 2rem;
      color: #007bff;
    }
    .charts-section {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 20px;
    }
    .chart-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  stats: any[] = [];
  analytics: SystemAnalytics | null = null;
  loading = true;

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadAnalytics();
  }

  private loadAnalytics() {
    this.adminService.getSystemAnalytics().subscribe({
      next: (data) => {
        this.analytics = data;
        this.stats = this.transformAnalyticsData(data);
        this.loading = false;
      },
      error: (error) => {
        console.error('Failed to load analytics:', error);
        this.loading = false;
      }
    });
  }

  private transformAnalyticsData(data: SystemAnalytics): any[] {
    return [
      {
        title: 'Total Users',
        value: data.totalUsers,
        icon: 'fas fa-users',
        change: 12.5,
        changeClass: 'positive'
      },
      {
        title: 'Active Courses',
        value: data.approvedCourses,
        icon: 'fas fa-book',
        change: 8.2,
        changeClass: 'positive'
      },
      {
        title: 'Pending Approvals',
        value: data.pendingCourses,
        icon: 'fas fa-clock',
        change: -5.1,
        changeClass: 'negative'
      },
      {
        title: 'Total Enrollments',
        value: data.totalEnrollments,
        icon: 'fas fa-graduation-cap',
        change: 15.3,
        changeClass: 'positive'
      }
    ];
  }
}
```

**File:** `src/app/features/admin/presentation/components/user-management.component.ts`
```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserManagementService, UserSummary } from '../../infrastructure/services/user-management.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="user-management">
      <div class="header">
        <h2>User Management</h2>
        <div class="actions">
          <button class="btn-primary" (click)="openCreateUserModal()">
            <i class="fas fa-plus"></i> Add User
          </button>
          <button class="btn-secondary" (click)="openBulkImportModal()">
            <i class="fas fa-upload"></i> Bulk Import
          </button>
        </div>
      </div>

      <div class="filters">
        <input
          type="text"
          placeholder="Search users..."
          [(ngModel)]="searchQuery"
          (input)="onSearchChange()"
        >
        <select [(ngModel)]="selectedRole" (change)="onRoleFilterChange()">
          <option value="">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="TEACHER">Teacher</option>
          <option value="STUDENT">Student</option>
        </select>
      </div>

      <div class="table-container" *ngIf="!loading">
        <table class="users-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Full Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let user of users" [class.disabled]="!user.enabled">
              <td>{{ user.username }}</td>
              <td>{{ user.email }}</td>
              <td>{{ user.fullName }}</td>
              <td>
                <span class="role-badge" [class]="user.role.toLowerCase()">
                  {{ user.role }}
                </span>
              </td>
              <td>
                <span class="status-badge" [class]="user.enabled ? 'active' : 'inactive'">
                  {{ user.enabled ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td>{{ user.createdAt | date:'short' }}</td>
              <td>
                <div class="action-buttons">
                  <button class="btn-icon" (click)="editUser(user)">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="btn-icon" (click)="toggleUserStatus(user)">
                    <i [class]="user.enabled ? 'fas fa-ban' : 'fas fa-check'"></i>
                  </button>
                  <button class="btn-icon danger" (click)="deleteUser(user)">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="loading" *ngIf="loading">
        <p>Loading users...</p>
      </div>

      <div class="pagination" *ngIf="totalPages > 1">
        <button
          [disabled]="currentPage === 1"
          (click)="goToPage(currentPage - 1)"
        >
          Previous
        </button>

        <span *ngFor="let page of visiblePages">
          <button
            [class.active]="page === currentPage"
            (click)="goToPage(page)"
          >
            {{ page }}
          </button>
        </span>

        <button
          [disabled]="currentPage === totalPages"
          (click)="goToPage(currentPage + 1)"
        >
          Next
        </button>
      </div>
    </div>
  `,
  styles: [`
    .user-management { padding: 20px; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .filters {
      display: flex;
      gap: 15px;
      margin-bottom: 20px;
    }
    .filters input, .filters select {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .table-container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .users-table {
      width: 100%;
      border-collapse: collapse;
    }
    .users-table th, .users-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    .role-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: bold;
    }
    .role-badge.admin { background: #dc3545; color: white; }
    .role-badge.teacher { background: #28a745; color: white; }
    .role-badge.student { background: #007bff; color: white; }
    .status-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.8rem;
    }
    .status-badge.active { background: #28a745; color: white; }
    .status-badge.inactive { background: #6c757d; color: white; }
    .action-buttons { display: flex; gap: 5px; }
    .btn-icon {
      padding: 6px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      background: #007bff;
      color: white;
    }
    .btn-icon.danger { background: #dc3545; }
    .pagination {
      display: flex;
      justify-content: center;
      gap: 5px;
      margin-top: 20px;
    }
    .pagination button {
      padding: 8px 12px;
      border: 1px solid #ddd;
      background: white;
      cursor: pointer;
    }
    .pagination button.active {
      background: #007bff;
      color: white;
    }
  `]
})
export class UserManagementComponent implements OnInit {
  users: UserSummary[] = [];
  currentPage = 1;
  totalPages = 1;
  pageSize = 10;
  searchQuery = '';
  selectedRole = '';
  loading = false;

  constructor(private userService: UserManagementService) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    const params = {
      page: this.currentPage,
      limit: this.pageSize,
      search: this.searchQuery,
      role: this.selectedRole
    };

    this.userService.getUsers(params).subscribe({
      next: (response) => {
        this.users = response.data;
        this.totalPages = response.pagination.totalPages;
        this.loading = false;
      },
      error: (error) => {
        console.error('Failed to load users:', error);
        this.loading = false;
      }
    });
  }

  onSearchChange() {
    this.currentPage = 1;
    this.loadUsers();
  }

  onRoleFilterChange() {
    this.currentPage = 1;
    this.loadUsers();
  }

  goToPage(page: number) {
    this.currentPage = page;
    this.loadUsers();
  }

  openCreateUserModal() {
    // TODO: Implement modal
    console.log('Open create user modal');
  }

  editUser(user: UserSummary) {
    // TODO: Implement edit modal
    console.log('Edit user:', user);
  }

  toggleUserStatus(user: UserSummary) {
    // TODO: Implement status toggle
    console.log('Toggle status for user:', user);
  }

  deleteUser(user: UserSummary) {
    if (confirm('Are you sure you want to delete this user?')) {
      this.userService.deleteUser(user.id).subscribe({
        next: () => {
          this.loadUsers();
        },
        error: (error) => {
          console.error('Failed to delete user:', error);
        }
      });
    }
  }

  openBulkImportModal() {
    // TODO: Implement bulk import modal
    console.log('Open bulk import modal');
  }

  get visiblePages(): number[] {
    const delta = 2;
    const range = [];

    for (let i = Math.max(2, this.currentPage - delta);
         i <= Math.min(this.totalPages - 1, this.currentPage + delta);
         i++) {
      range.push(i);
    }

    const rangeWithDots = [];
    if (this.currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (this.currentPage + delta < this.totalPages - 1) {
      rangeWithDots.push('...', this.totalPages);
    } else if (this.totalPages > 1) {
      rangeWithDots.push(this.totalPages);
    }

    return rangeWithDots.filter(item => item !== '...') as number[];
  }
}
```

### 8. App Module Configuration

**File:** `src/app/app.config.ts`
```typescript
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './api/interceptors/auth.interceptor';
import { errorInterceptor } from './api/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor, errorInterceptor])
    )
  ]
};
```

### 9. Type Definitions

**File:** `src/app/api/types/common.types.ts`
```typescript
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: PaginationInfo;
  timestamp: string;
}

export interface PaginationInfo {
  totalItems: number;
  totalPages: number;
  page: number;
  limit: number;
  first: boolean;
  last: boolean;
}
```

## 🚀 Testing the Migration

### 1. Start Backend
```bash
cd backend-lms-postgres
docker compose up -d
mvn spring-boot:run
```

### 2. Start Frontend
```bash
cd lms-angular
npm install
ng serve --port 4201
```

### 3. Test API Connection
```bash
# Test login
curl -X POST http://localhost:8090/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Test admin analytics
curl -X GET http://localhost:8090/api/v1/admin/analytics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Common Issues & Solutions

**Issue:** `CORS error`
**Solution:** Check backend CORS configuration in `SecurityConfig.java`

**Issue:** `401 Unauthorized`
**Solution:** Check JWT token in localStorage and interceptor

**Issue:** `404 Not Found`
**Solution:** Verify API endpoints match backend routes

**Issue:** `500 Internal Server Error`
**Solution:** Check backend logs for detailed error messages

## 📋 Checklist Migration

- [ ] ✅ Update environment files with correct API URLs
- [ ] ✅ Create admin endpoints configuration
- [ ] ✅ Update ApiClient to use environment variables
- [ ] ✅ Implement authentication service with JWT
- [ ] ✅ Create admin services (AdminService, UserManagementService)
- [ ] ✅ Configure HTTP interceptors for auth and error handling
- [ ] ✅ Update admin components to use real APIs
- [ ] ✅ Test all CRUD operations
- [ ] ✅ Verify pagination and search functionality
- [ ] ✅ Test file upload functionality
- [ ] ✅ Check error handling and user feedback

---

*Tài liệu này cung cấp hướng dẫn chi tiết để chuyển từ mock data sang backend thật. Hãy follow theo từng bước và test kỹ trước khi deploy production.*