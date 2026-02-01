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

// User Account Status for Admin Management
export enum UserAccountStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
  RESTRICTED = 'RESTRICTED'
}

// Request to update user status with reason
export interface UpdateUserStatusRequest {
  status: UserAccountStatus;
  reason: string;
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
  accountStatus: UserAccountStatus; // NEW: ACTIVE, BLOCKED, RESTRICTED
  statusReason?: string; // NEW: Reason for blocking/restricting
  lastLogin: Date;
  loginCount: number;
  coursesCreated?: number;  // For TEACHER: courses they own
  coursesCooped?: number;   // For TEACHER: courses they are invited as co-op
  coursesEnrolled?: number; // For STUDENT
  totalSpent?: number;
  permissions: string[];
}

// Backend User interface - matches AdminUserDTO from backend
export interface BackendUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  enabled: boolean;
  accountStatus?: string;  // ACTIVE, BLOCKED, RESTRICTED
  statusReason?: string;
  lastLogin?: string;      // ISO timestamp
  loginCount?: number;
  coursesCreated?: number;  // For TEACHER: courses they own
  coursesCooped?: number;   // For TEACHER: courses they are invited as co-op
  coursesEnrolled?: number; // For STUDENT
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
  lessonsCount?: number;
  assignmentsCount: number;
  rating?: number;
  revenue?: number;
  submittedAt?: string;
  approvedAt?: string;
  rejectionReason?: string;
  reviewComment?: string;
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

  revokeCourse(courseId: string, reason: string): Observable<{ message: string }> {
    return this.apiClient.patchWithResponse<string>(ADMIN_ENDPOINTS.REVOKE_COURSE(courseId), { reason }).pipe(
      map(response => ({
        message: response.message || 'Course revoked successfully'
      })),
      catchError(error => {
        console.error('[ADMIN SERVICE] Error revoking course:', error);
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

        // Extract the actual user array from content
        const responseData = response.data as any;
        const backendUsers: BackendUser[] = Array.isArray(response.data)
          ? response.data
          : (responseData?.content || responseData?.data || []);

        // DEBUG: Log raw data to verify coursesCooped is coming from backend
        console.log('[ADMIN SERVICE DEBUG] Raw backend users (first 2):',
          backendUsers.slice(0, 2).map(u => ({
            fullName: u.fullName,
            coursesCreated: u.coursesCreated,
            coursesCooped: u.coursesCooped
          }))
        );

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

        // ✅ No auto-refresh - let component handle it with correct params

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

        // ✅ No auto-refresh - let component handle it with correct params

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

        // ✅ No auto-refresh - let component handle it with correct params

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

        // ✅ No auto-refresh - let component handle it with correct params

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

  /**
   * Update user account status (ACTIVE, BLOCKED, RESTRICTED)
   * NOTE: Backend endpoint may not exist yet - UI is prepared for future integration
   */
  updateUserStatus(userId: string, request: UpdateUserStatusRequest): Observable<{ message: string; data: AdminUser }> {
    console.log('[ADMIN SERVICE] 🔄 Updating user status:', userId, request);
    this._isLoading.next(true);

    // TODO: Update endpoint when Backend implements it
    // Current implementation uses toggle endpoint as fallback
    return this.apiClient.patchWithResponse<BackendUser>(`/api/v3/admin/users/${userId}/status`, request).pipe(
      finalize(() => this._isLoading.next(false)),
      map(response => {
        console.log('[ADMIN SERVICE] ✅ User status updated successfully:', response);
        const user = this.mapBackendUserToAdminUser(response.data);
        // Override with requested status since backend may not return it
        user.accountStatus = request.status;
        user.statusReason = request.reason;

        return {
          message: response.message || `User status updated to ${request.status}`,
          data: user
        };
      }),
      catchError(error => {
        console.error('[ADMIN SERVICE] ❌ Error updating user status:', error);
        // Fallback message for user
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
        // ✅ No auto-refresh - let component handle it with correct params
        return response;
      }),
      catchError(error => {
        console.error('[ADMIN SERVICE] ❌ Error bulk importing users:', error);
        return throwError(() => error);
      })
    );
  }

  // ============================================
  // USER COURSES (Admin view)
  // ============================================

  /**
   * Get enrolled courses for a student (Admin view)
   */
  getUserEnrolledCourses(userId: string): Observable<AdminCourseSummary[]> {
    console.log('[ADMIN SERVICE] 📚 Getting enrolled courses for user:', userId);
    return this.apiClient.getWithResponse<AdminCourseSummary[]>(ADMIN_ENDPOINTS.USER_ENROLLED_COURSES(userId)).pipe(
      map(response => {
        console.log('[ADMIN SERVICE] ✅ Enrolled courses loaded:', response.data);
        return response.data || [];
      }),
      catchError(error => {
        console.error('[ADMIN SERVICE] ❌ Error loading enrolled courses:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get managed courses for a teacher (Admin view)
   */
  getUserManagedCourses(userId: string): Observable<AdminCourseSummary[]> {
    console.log('[ADMIN SERVICE] 📚 Getting managed courses for user:', userId);
    return this.apiClient.getWithResponse<AdminCourseSummary[]>(ADMIN_ENDPOINTS.USER_MANAGED_COURSES(userId)).pipe(
      map(response => {
        console.log('[ADMIN SERVICE] ✅ Managed courses loaded:', response.data);
        return response.data || [];
      }),
      catchError(error => {
        console.error('[ADMIN SERVICE] ❌ Error loading managed courses:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get co-op courses for a teacher (courses where they are invited as teaching staff)
   */
  getUserCoopCourses(userId: string): Observable<AdminCourseSummary[]> {
    console.log('[ADMIN SERVICE] 📚 Getting co-op courses for user:', userId);
    return this.apiClient.getWithResponse<AdminCourseSummary[]>(ADMIN_ENDPOINTS.USER_COOP_COURSES(userId)).pipe(
      map(response => {
        console.log('[ADMIN SERVICE] ✅ Co-op courses loaded:', response.data);
        return response.data || [];
      }),
      catchError(error => {
        console.error('[ADMIN SERVICE] ❌ Error loading co-op courses:', error);
        return throwError(() => error);
      })
    );
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private mapBackendUserToAdminUser(backendUser: BackendUser): AdminUser {
    // Map accountStatus from backend or derive from enabled flag
    let accountStatus = UserAccountStatus.ACTIVE;
    if (backendUser.accountStatus) {
      accountStatus = backendUser.accountStatus as UserAccountStatus;
    } else if (!backendUser.enabled) {
      accountStatus = UserAccountStatus.BLOCKED;
    }

    return {
      id: backendUser.id,
      email: backendUser.email,
      name: backendUser.fullName,
      role: this.mapBackendRoleToUserRole(backendUser.role),
      createdAt: new Date(backendUser.createdAt),
      updatedAt: backendUser.updatedAt ? new Date(backendUser.updatedAt) : new Date(),
      isActive: backendUser.enabled,
      accountStatus: accountStatus,
      statusReason: backendUser.statusReason,
      // Use actual data from backend instead of hardcoded values
      lastLogin: backendUser.lastLogin ? new Date(backendUser.lastLogin) : new Date(),
      loginCount: backendUser.loginCount ?? 0,
      coursesCreated: backendUser.coursesCreated ?? 0,
      coursesCooped: backendUser.coursesCooped ?? 0,
      coursesEnrolled: backendUser.coursesEnrolled ?? 0,
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
