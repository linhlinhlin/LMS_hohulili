import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, finalize } from 'rxjs/operators';
import { ApiClient } from '../../../../api/client/api-client';
import { ADMIN_ENDPOINTS } from '../../../../api/endpoints/admin.endpoints';
import { UserRole } from '../../../../core/services/auth.service';

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
  totalRevenue: number;
  monthlyRevenue: number;
  activeUsers: number;
  systemHealth: {
    database: 'healthy' | 'warning' | 'error';
    api: 'healthy' | 'warning' | 'error';
    storage: 'healthy' | 'warning' | 'error';
    email: 'healthy' | 'warning' | 'error';
  };
  userGrowth: {
    thisMonth: number;
    lastMonth: number;
    growthRate: number;
  };
  courseStats: {
    pending: number;
    approved: number;
    rejected: number;
    active: number;
  };
  revenueStats: {
    thisMonth: number;
    lastMonth: number;
    growthRate: number;
  };
  coursesByStatus: { [key: string]: number };
  usersByRole: { [key: string]: number };
  enrollmentsByMonth: { [key: string]: number };
  studentGrowth: number;
  courseGrowth: number;
  revenue: number;
  revenueGrowth: number;
  systemUptime: number;
  onlineStudents: number;
  activeCourses: number;
  pendingAssignments: number;
  unreadMessages: number;
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

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string; // Backend returns 'TEACHER', 'STUDENT', 'ADMIN' (uppercase)
  avatar?: string;
  department?: string;
  studentId?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  lastLogin: Date;
  loginCount: number;
  coursesCreated?: number;
  coursesEnrolled?: number;
  totalSpent?: number;
  permissions: string[];
}

// Backend User interface
export interface BackendUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  enabled: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Create User Request
export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
}

// Update User Request
export interface UpdateUserRequest {
  email?: string;
  fullName?: string;
  role?: 'ADMIN' | 'TEACHER' | 'STUDENT';
  enabled?: boolean;
}

export interface AdminCourseSummary {
  id: string;
  code: string;
  title: string;
  description?: string;
  shortDescription?: string;
  category?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  price?: number;
  thumbnail?: string;
  status: string;
  teacherId?: string;
  teacherName: string;
  teacherEmail?: string;
  enrolledCount: number;
  sectionsCount: number;
  assignmentsCount: number;
  rating?: number;
  revenue?: number;
  submittedAt?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

// Alias for backward compatibility
export type CourseSummary = AdminCourseSummary;

export interface SystemSettings {
  general: {
    siteName: string;
    siteDescription: string;
    maintenanceMode: boolean;
    allowRegistration: boolean;
    requireEmailVerification: boolean;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    fromEmail: string;
    fromName: string;
  };
  payment: {
    stripePublicKey: string;
    stripeSecretKey: string;
    paypalClientId: string;
    paypalClientSecret: string;
    currency: string;
  };
  security: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    passwordMinLength: number;
    requireTwoFactor: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiClient = inject(ApiClient);

  // Reactive state
  private _isLoading = new BehaviorSubject<boolean>(false);
  readonly isLoading$ = this._isLoading.asObservable();
  
  // Getter for loading state (better for template binding)
  get isLoading(): boolean {
    return this._isLoading.value;
  }

  private _users = signal<AdminUser[]>([]);
  readonly users = this._users.asReadonly();

  getSystemAnalytics(): Observable<SystemAnalytics> {
    console.log('[ADMIN SERVICE] 🔍 Loading system analytics');
    this._isLoading.next(true);
    return this.apiClient.getWithResponse<SystemAnalytics>(ADMIN_ENDPOINTS.ANALYTICS).pipe(
      finalize(() => this._isLoading.next(false)),
      map(response => {
        console.log('[ADMIN SERVICE] ✅ Analytics loaded successfully:', response);
        return response.data;
      }),
      catchError(error => {
        console.error('[ADMIN SERVICE] ❌ Error loading analytics:', error);
        return throwError(() => error);
      })
    );
  }

  getPendingCourses(params: any = {}): Observable<{ data: PendingCourseSummary[]; pagination: any }> {
    this._isLoading.next(true);
    return this.apiClient.getWithResponse<PendingCourseSummary[]>(ADMIN_ENDPOINTS.PENDING_COURSES, { params }).pipe(
      finalize(() => this._isLoading.next(false)),
      map(response => ({
        data: response.data || [],
        pagination: response.pagination
      })),
      catchError(error => {
        console.error('[ADMIN SERVICE] Error loading pending courses:', error);
        return throwError(() => error);
      })
    );
  }

  getAllCourses(params: any = {}): Observable<{ data: AdminCourseSummary[]; pagination: any }> {
    return this.apiClient.getWithResponse<AdminCourseSummary[]>(ADMIN_ENDPOINTS.ALL_COURSES, { params }).pipe(
      map(response => ({
        data: response.data || [],
        pagination: response.pagination
      })),
      catchError(error => {
        console.error('[ADMIN SERVICE] Error loading courses:', error);
        return throwError(() => error);
      })
    );
  }

  approveCourse(courseId: string): Observable<{ message: string }> {
    this._isLoading.next(true);
    return this.apiClient.patchWithResponse<string>(ADMIN_ENDPOINTS.APPROVE_COURSE(courseId), {}).pipe(
      finalize(() => this._isLoading.next(false)),
      map(response => ({
        message: response.message || 'Course approved successfully'
      })),
      catchError(error => {
        console.error('[ADMIN SERVICE] Error approving course:', error);
        return throwError(() => error);
      })
    );
  }

  rejectCourse(courseId: string, reason: string): Observable<{ message: string }> {
    return this.apiClient.patchWithResponse<string>(ADMIN_ENDPOINTS.REJECT_COURSE(courseId), { reason }).pipe(
      map(response => ({
        message: response.message || 'Course rejected successfully'
      })),
      catchError(error => {
        console.error('[ADMIN SERVICE] Error rejecting course:', error);
        return throwError(() => error);
      })
    );
  }

  deleteCourse(courseId: string): Observable<{ message: string }> {
    return this.apiClient.deleteWithResponse<string>(ADMIN_ENDPOINTS.DELETE_COURSE(courseId)).pipe(
      map(response => ({
        message: response.message || 'Course deleted successfully'
      })),
      catchError(error => {
        console.error('[ADMIN SERVICE] Error deleting course:', error);
        return throwError(() => error);
      })
    );
  }

  // ============================================
  // USER MANAGEMENT - IMPLEMENTED
  // ============================================

  getUsers(params: any = {}): Observable<{ data: AdminUser[]; pagination: any }> {
    console.log('[ADMIN SERVICE] 🔍 Loading users with params:', params);
    this._isLoading.next(true);
    
    return this.apiClient.getWithResponse<BackendUser[]>(ADMIN_ENDPOINTS.USERS, { params }).pipe(
      finalize(() => this._isLoading.next(false)),
      map(response => {
        console.log('[ADMIN SERVICE] ✅ Users loaded successfully:', response);
        
        // Backend returns Spring Boot Page format: {data: {content: [...], totalElements: ...}, pagination: {...}}
        // Extract the actual user array from content
        const responseData = response.data as any;
        const backendUsers: BackendUser[] = Array.isArray(response.data) 
          ? response.data 
          : (responseData?.content || responseData?.data || []);
        
        // Convert BackendUser to AdminUser
        const users: AdminUser[] = backendUsers.map((u: BackendUser) => this.mapBackendUserToAdminUser(u));
        this._users.set(users);
        
        return {
          data: users,
          pagination: response.pagination || {}
        };
      }),
      catchError(error => {
        console.error('[ADMIN SERVICE] ❌ Error loading users:', error);
        return throwError(() => error);
      })
    );
  }

  getAllUsersNoPagination(): Observable<AdminUser[]> {
    console.log('[ADMIN SERVICE] 🔍 Loading all users (no pagination)');
    
    return this.apiClient.get<BackendUser[]>(ADMIN_ENDPOINTS.ALL_USERS_NO_PAGINATION).pipe(
      map(users => {
        console.log('[ADMIN SERVICE] ✅ All users loaded:', users.length);
        return users.map(u => this.mapBackendUserToAdminUser(u));
      }),
      catchError(error => {
        console.error('[ADMIN SERVICE] ❌ Error loading all users:', error);
        return throwError(() => error);
      })
    );
  }

  getUserById(userId: string): Observable<AdminUser> {
    console.log('[ADMIN SERVICE] 🔍 Loading user by ID:', userId);
    
    return this.apiClient.get<BackendUser>(ADMIN_ENDPOINTS.USER_DETAIL(userId)).pipe(
      map(user => {
        console.log('[ADMIN SERVICE] ✅ User loaded:', user);
        return this.mapBackendUserToAdminUser(user);
      }),
      catchError(error => {
        console.error('[ADMIN SERVICE] ❌ Error loading user:', error);
        return throwError(() => error);
      })
    );
  }

  createUser(request: CreateUserRequest): Observable<{ message: string; data: AdminUser }> {
    console.log('[ADMIN SERVICE] 🔨 Creating user:', request);
    this._isLoading.next(true);
    
    return this.apiClient.postWithResponse<BackendUser>(ADMIN_ENDPOINTS.CREATE_USER, request).pipe(
      finalize(() => this._isLoading.next(false)),
      map(response => {
        console.log('[ADMIN SERVICE] ✅ User created successfully:', response);
        
        const user = this.mapBackendUserToAdminUser(response.data);
        
        // Refresh users list
        this.getUsers().subscribe();
        
        return {
          message: response.message || 'User created successfully',
          data: user
        };
      }),
      catchError(error => {
        console.error('[ADMIN SERVICE] ❌ Error creating user:', error);
        return throwError(() => error);
      })
    );
  }

  updateUser(userId: string, request: UpdateUserRequest): Observable<{ message: string; data: AdminUser }> {
    console.log('[ADMIN SERVICE] 🔨 Updating user:', userId, request);
    this._isLoading.next(true);
    
    return this.apiClient.putWithResponse<BackendUser>(ADMIN_ENDPOINTS.UPDATE_USER(userId), request).pipe(
      finalize(() => this._isLoading.next(false)),
      map(response => {
        console.log('[ADMIN SERVICE] ✅ User updated successfully:', response);
        
        const user = this.mapBackendUserToAdminUser(response.data);
        
        // Refresh users list
        this.getUsers().subscribe();
        
        return {
          message: response.message || 'User updated successfully',
          data: user
        };
      }),
      catchError(error => {
        console.error('[ADMIN SERVICE] ❌ Error updating user:', error);
        return throwError(() => error);
      })
    );
  }

  deleteUser(userId: string): Observable<{ message: string }> {
    console.log('[ADMIN SERVICE] 🗑️ Deleting user:', userId);
    this._isLoading.next(true);
    
    return this.apiClient.deleteWithResponse<string>(ADMIN_ENDPOINTS.DELETE_USER(userId)).pipe(
      finalize(() => this._isLoading.next(false)),
      map(response => {
        console.log('[ADMIN SERVICE] ✅ User deleted successfully');
        
        // Refresh users list
        this.getUsers().subscribe();
        
        return {
          message: response.message || 'User deleted successfully'
        };
      }),
      catchError(error => {
        console.error('[ADMIN SERVICE] ❌ Error deleting user:', error);
        return throwError(() => error);
      })
    );
  }

  toggleUserStatus(userId: string): Observable<{ message: string; data: AdminUser }> {
    console.log('[ADMIN SERVICE] 🔄 Toggling user status:', userId);
    this._isLoading.next(true);
    
    return this.apiClient.patchWithResponse<BackendUser>(ADMIN_ENDPOINTS.TOGGLE_USER_STATUS(userId), {}).pipe(
      finalize(() => this._isLoading.next(false)),
      map(response => {
        console.log('[ADMIN SERVICE] ✅ User status toggled successfully:', response);
        
        const user = this.mapBackendUserToAdminUser(response.data);
        
        // Refresh users list
        this.getUsers().subscribe();
        
        return {
          message: response.message || 'User status toggled successfully',
          data: user
        };
      }),
      catchError(error => {
        console.error('[ADMIN SERVICE] ❌ Error toggling user status:', error);
        return throwError(() => error);
      })
    );
  }

  bulkImportUsers(file: File, defaultRole: 'ADMIN' | 'TEACHER' | 'STUDENT' = 'STUDENT'): Observable<any> {
    console.log('[ADMIN SERVICE] 📤 Bulk importing users');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('defaultRole', defaultRole);
    
    return this.apiClient.postWithResponse(ADMIN_ENDPOINTS.BULK_IMPORT_USERS, formData).pipe(
      map(response => {
        console.log('[ADMIN SERVICE] ✅ Bulk import completed:', response);
        // Refresh users list after import
        this.getUsers().subscribe();
        return response;
      }),
      catchError(error => {
        console.error('[ADMIN SERVICE] ❌ Error bulk importing users:', error);
        return throwError(() => error);
      })
    );
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private mapBackendUserToAdminUser(backendUser: BackendUser): AdminUser {
    return {
      id: backendUser.id,
      email: backendUser.email,
      name: backendUser.fullName,
      role: this.mapBackendRoleToUserRole(backendUser.role),
      createdAt: new Date(backendUser.createdAt),
      updatedAt: backendUser.updatedAt ? new Date(backendUser.updatedAt) : new Date(),
      isActive: backendUser.enabled,
      lastLogin: new Date(),
      loginCount: 0,
      permissions: this.getPermissionsForRole(backendUser.role)
    };
  }

  private mapBackendRoleToUserRole(role: string): UserRole {
    switch (role.toUpperCase()) {
      case 'ADMIN': return UserRole.ADMIN;
      case 'TEACHER': return UserRole.TEACHER;
      case 'STUDENT': return UserRole.STUDENT;
      default: return UserRole.STUDENT;
    }
  }

  private getPermissionsForRole(role: string): string[] {
    switch (role.toUpperCase()) {
      case 'ADMIN': return ['all'];
      case 'TEACHER': return ['courses.create', 'courses.edit', 'assignments.manage'];
      case 'STUDENT': return ['courses.view', 'assignments.submit'];
      default: return [];
    }
  }

  getSettings(): Observable<SystemSettings> {
    return throwError(() => new Error('Settings API not implemented yet'));
  }

  updateSettings(settings: SystemSettings): Observable<{ message: string }> {
    return throwError(() => new Error('Settings API not implemented yet'));
  }

  // ============================================
  // STATS COMPUTED SIGNALS (Auto-update when users change)
  // ============================================

  totalUsers = computed(() => this._users().length);

  totalTeachers = computed(() => 
    this._users().filter(u => u.role === 'TEACHER').length
  );

  totalStudents = computed(() => 
    this._users().filter(u => u.role === 'STUDENT').length
  );

  totalAdminsCount = computed(() => 
    this._users().filter(u => u.role === 'ADMIN').length
  );

  activeUsersCount = computed(() => 
    this._users().filter(u => u.isActive).length
  );
}
