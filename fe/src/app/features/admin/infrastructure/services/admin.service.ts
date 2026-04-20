import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { map, catchError, finalize } from 'rxjs/operators';
import { ApiClient } from '../../../../api/client/api-client';
import { ADMIN_ENDPOINTS, BulkActionResponse, CategoryDTO } from '../../../../api/endpoints/admin.endpoints';
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
  status?: string;
  reviewState?: string;
  draftChangeStatus?: string | null;
  pendingReleaseNotes?: string | null;
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

export interface BulkImportUsersResult {
  totalRows: number;
  successfulImports: number;
  failedImports: number;
  errors: string[];
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
  lastLogin: Date | null;
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
  role: 'ADMIN' | 'ORG_ADMIN' | 'TEACHER' | 'STUDENT';
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
  role: 'ADMIN' | 'ORG_ADMIN' | 'TEACHER' | 'STUDENT';
}

// Update User Request
export interface UpdateUserRequest {
  email?: string;
  fullName?: string;
  role?: 'ADMIN' | 'ORG_ADMIN' | 'TEACHER' | 'STUDENT';
  enabled?: boolean;
}

/** Controlled vocabulary for structured rejection reasons. Matches BE CourseRejectionCategory enum. */
export type CourseRejectionCategory =
  | 'INSUFFICIENT_CONTENT'
  | 'LOW_QUALITY'
  | 'INACCURATE_INFO'
  | 'MISSING_MEDIA'
  | 'COPYRIGHT_VIOLATION'
  | 'INAPPROPRIATE_CONTENT'
  | 'TECHNICAL_ISSUE'
  | 'OTHER';

export interface CourseRejectionCategoryOption {
  value: CourseRejectionCategory;
  label: string;
}

/** Options displayed in the rejection modal (order = UX priority). */
export const COURSE_REJECTION_CATEGORIES: readonly CourseRejectionCategoryOption[] = [
  { value: 'INSUFFICIENT_CONTENT', label: 'Nội dung chưa đầy đủ' },
  { value: 'LOW_QUALITY', label: 'Chất lượng nội dung cần cải thiện' },
  { value: 'INACCURATE_INFO', label: 'Thông tin chưa chính xác' },
  { value: 'MISSING_MEDIA', label: 'Thiếu hình ảnh/video minh họa' },
  { value: 'COPYRIGHT_VIOLATION', label: 'Vi phạm bản quyền' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Nội dung không phù hợp' },
  { value: 'TECHNICAL_ISSUE', label: 'Lỗi kỹ thuật trong nội dung' },
  { value: 'OTHER', label: 'Lý do khác' }
];

export interface ReviewEvent {
  id: string;
  action: string;
  comment: string;
  /** Only populated for REJECTED actions persisted after V115. */
  rejectionCategory?: CourseRejectionCategory | null;
  reviewerId?: string;
  reviewerName?: string;
  createdAt: string;
}

export interface RejectCoursePayload {
  reason: string;
  category?: CourseRejectionCategory;
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
  reviewState?: string;
  draftChangeStatus?: string | null;
  pendingReleaseNotes?: string | null;
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

export interface GatewayStatus {
  vnpay: { enabled: boolean; sandbox: boolean; note: string };
  sepay: {
    enabled: boolean;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    webhookUrl: string;
    webhookConfigured: boolean;
    hint?: string;
  };
}

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
    vnpayEnabled: boolean;
    sepayEnabled: boolean;
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
    this._isLoading.next(true);
    return this.apiClient.getWithResponse<any>(ADMIN_ENDPOINTS.ANALYTICS).pipe(
      finalize(() => this._isLoading.next(false)),
      map(response => {
        const d = response.data || {};
        return {
          totalUsers: d.totalUsers ?? 0,
          totalTeachers: d.totalTeachers ?? 0,
          totalStudents: d.totalStudents ?? 0,
          totalAdmins: d.totalAdmins ?? 0,
          totalCourses: d.totalCourses ?? 0,
          approvedCourses: d.approvedCourses ?? d.publishedCourses ?? 0,
          pendingCourses: d.pendingCourses ?? 0,
          rejectedCourses: d.rejectedCourses ?? 0,
          draftCourses: d.draftCourses ?? 0,
          totalAssignments: d.totalAssignments ?? 0,
          totalSubmissions: d.totalSubmissions ?? 0,
          totalEnrollments: d.totalEnrollments ?? 0,
          totalRevenue: d.totalRevenue ?? 0,
          monthlyRevenue: d.monthlyRevenue ?? 0,
          activeUsers: d.activeUsers ?? d.totalUsers ?? 0,
          systemHealth: d.systemHealth ?? { database: 'healthy', api: 'healthy', storage: 'healthy', email: 'healthy' },
          userGrowth: d.userGrowth ?? { thisMonth: 0, lastMonth: 0, growthRate: 0 },
          courseStats: d.courseStats ?? {
            pending: d.pendingCourses ?? 0,
            approved: d.approvedCourses ?? d.publishedCourses ?? 0,
            rejected: d.rejectedCourses ?? 0,
            active: d.activeCourses ?? d.publishedCourses ?? 0
          },
          revenueStats: d.revenueStats ?? { thisMonth: d.monthlyRevenue ?? 0, lastMonth: 0, growthRate: 0 },
          coursesByStatus: d.coursesByStatus ?? {},
          usersByRole: d.usersByRole ?? {},
          enrollmentsByMonth: d.enrollmentsByMonth ?? {},
          studentGrowth: d.studentGrowth ?? 0,
          courseGrowth: d.courseGrowth ?? 0,
          revenue: d.revenue ?? d.totalRevenue ?? 0,
          revenueGrowth: d.revenueGrowth ?? 0,
          systemUptime: d.systemUptime ?? 99.9,
          onlineStudents: d.onlineStudents ?? 0,
          activeCourses: d.activeCourses ?? d.publishedCourses ?? 0,
          pendingAssignments: d.pendingAssignments ?? 0,
          unreadMessages: d.unreadMessages ?? 0
        } as SystemAnalytics;
      }),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  getPendingCourses(params: any = {}): Observable<{ data: PendingCourseSummary[]; pagination: any }> {
    this._isLoading.next(true);
    return this.apiClient.getWithResponse<any>(ADMIN_ENDPOINTS.PENDING_COURSES, { params }).pipe(
      finalize(() => this._isLoading.next(false)),
      map(response => {
        // Backend returns Spring Page: { content: [...], totalPages, ... }
        const rawData = response.data;
        const courses: PendingCourseSummary[] = Array.isArray(rawData) ? rawData : (rawData?.content || []);
        return {
          data: courses,
          pagination: rawData?.totalPages ? { totalPages: rawData.totalPages, totalElements: rawData.totalElements } : response.pagination
        };
      }),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  getAllCourses(params: any = {}): Observable<{ data: AdminCourseSummary[]; pagination: any }> {
    return this.apiClient.getWithResponse<any>(ADMIN_ENDPOINTS.ALL_COURSES, { params }).pipe(
      map(response => {
        const rawData = response.data;
        const courses: AdminCourseSummary[] = Array.isArray(rawData) ? rawData : (rawData?.content || []);
        return {
          data: courses,
          pagination: rawData?.totalPages ? { totalPages: rawData.totalPages, totalElements: rawData.totalElements } : response.pagination
        };
      }),
      catchError(error => {
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

        return throwError(() => error);
      })
    );
  }

  rejectCourse(
    courseId: string,
    payload: string | RejectCoursePayload
  ): Observable<{ message: string }> {
    // Accept either a bare reason string (legacy call sites) or a structured payload.
    const body: RejectCoursePayload = typeof payload === 'string'
      ? { reason: payload }
      : payload;
    return this.apiClient.patchWithResponse<string>(ADMIN_ENDPOINTS.REJECT_COURSE(courseId), body).pipe(
      map(response => ({
        message: response.message || 'Course rejected successfully'
      })),
      catchError(error => throwError(() => error))
    );
  }

  revokeCourse(courseId: string, reason: string): Observable<{ message: string }> {
    return this.apiClient.patchWithResponse<string>(ADMIN_ENDPOINTS.REVOKE_COURSE(courseId), { reason }).pipe(
      map(response => ({
        message: response.message || 'Course revoked successfully'
      })),
      catchError(error => {

        return throwError(() => error);
      })
    );
  }

  getReviewHistory(courseId: string): Observable<ReviewEvent[]> {
    return this.apiClient.getWithResponse<ReviewEvent[]>(ADMIN_ENDPOINTS.REVIEW_HISTORY(courseId)).pipe(
      map(response => response.data || []),
      catchError(() => of([]))
    );
  }

  deleteCourse(courseId: string): Observable<{ message: string }> {
    return this.apiClient.deleteWithResponse<string>(ADMIN_ENDPOINTS.DELETE_COURSE(courseId)).pipe(
      map(response => ({
        message: response.message || 'Course deleted successfully'
      })),
      catchError(error => {

        return throwError(() => error);
      })
    );
  }

  // ============================================
  // BULK COURSE ACTIONS
  // ============================================

  bulkApproveCourses(courseIds: string[], comment?: string): Observable<BulkActionResponse> {
    return this.apiClient.patchWithResponse<BulkActionResponse>(ADMIN_ENDPOINTS.BULK_APPROVE, { courseIds, comment }).pipe(
      map(response => response.data),
      catchError(error => throwError(() => error))
    );
  }

  bulkRejectCourses(courseIds: string[], reason: string): Observable<BulkActionResponse> {
    return this.apiClient.patchWithResponse<BulkActionResponse>(ADMIN_ENDPOINTS.BULK_REJECT, { courseIds, reason }).pipe(
      map(response => response.data),
      catchError(error => throwError(() => error))
    );
  }

  // ============================================
  // CATEGORIES (legacy flat)
  // ============================================

  getCategories(): Observable<CategoryDTO[]> {
    return this.apiClient.getWithResponse<CategoryDTO[]>(ADMIN_ENDPOINTS.CATEGORIES).pipe(
      map(response => response.data || []),
      catchError(error => throwError(() => error))
    );
  }

  // ============================================
  // COURSE CATEGORIES (new hierarchical)
  // ============================================

  getCourseCategories(): Observable<import('../../../../api/types/course.types').CourseCategoryDTO[]> {
    return this.apiClient.getWithResponse<import('../../../../api/types/course.types').CourseCategoryDTO[]>(ADMIN_ENDPOINTS.COURSE_CATEGORIES).pipe(
      map(res => res.data || []),
      catchError(error => throwError(() => error))
    );
  }

  createCourseCategory(data: { parentId?: string; code: string; name: string; slug: string; prefix?: string; description?: string; icon?: string }): Observable<import('../../../../api/types/course.types').CourseCategoryDTO> {
    return this.apiClient.postWithResponse<import('../../../../api/types/course.types').CourseCategoryDTO>(ADMIN_ENDPOINTS.COURSE_CATEGORIES, data).pipe(
      map(res => res.data)
    );
  }

  updateCourseCategory(id: string, data: { name: string; slug: string; description?: string; icon?: string; prefix?: string }): Observable<import('../../../../api/types/course.types').CourseCategoryDTO> {
    return this.apiClient.putWithResponse<import('../../../../api/types/course.types').CourseCategoryDTO>(`${ADMIN_ENDPOINTS.COURSE_CATEGORIES}/${id}`, data).pipe(
      map(res => res.data)
    );
  }

  deleteCourseCategory(id: string): Observable<void> {
    return this.apiClient.deleteWithResponse<void>(`${ADMIN_ENDPOINTS.COURSE_CATEGORIES}/${id}`).pipe(
      map(() => undefined)
    );
  }

  reorderCourseCategories(orderedIds: string[]): Observable<void> {
    return this.apiClient.putWithResponse<void>(ADMIN_ENDPOINTS.COURSE_CATEGORIES_REORDER, orderedIds).pipe(
      map(() => undefined)
    );
  }

  // ============================================
  // COURSE TAGS
  // ============================================

  getCourseTags(): Observable<import('../../../../api/types/course.types').CourseTagDTO[]> {
    return this.apiClient.getWithResponse<import('../../../../api/types/course.types').CourseTagDTO[]>(ADMIN_ENDPOINTS.COURSE_TAGS).pipe(
      map(res => res.data || []),
      catchError(error => throwError(() => error))
    );
  }

  createCourseTag(data: { name: string; slug: string }): Observable<import('../../../../api/types/course.types').CourseTagDTO> {
    return this.apiClient.postWithResponse<import('../../../../api/types/course.types').CourseTagDTO>(ADMIN_ENDPOINTS.COURSE_TAGS, data).pipe(
      map(res => res.data)
    );
  }

  updateCourseTag(id: string, data: { name: string; slug: string }): Observable<import('../../../../api/types/course.types').CourseTagDTO> {
    return this.apiClient.putWithResponse<import('../../../../api/types/course.types').CourseTagDTO>(`${ADMIN_ENDPOINTS.COURSE_TAGS}/${id}`, data).pipe(
      map(res => res.data)
    );
  }

  deleteCourseTag(id: string): Observable<void> {
    return this.apiClient.deleteWithResponse<void>(`${ADMIN_ENDPOINTS.COURSE_TAGS}/${id}`).pipe(
      map(() => undefined)
    );
  }

  // ============================================
  // USER MANAGEMENT - IMPLEMENTED
  // ============================================

  getUsers(params: any = {}): Observable<{ data: AdminUser[]; pagination: any }> {

    this._isLoading.next(true);

    return this.apiClient.getWithResponse<BackendUser[]>(ADMIN_ENDPOINTS.USERS, { params }).pipe(
      finalize(() => this._isLoading.next(false)),
      map(response => {

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

        return throwError(() => error);
      })
    );
  }

  getAllUsersNoPagination(): Observable<AdminUser[]> {

    return this.apiClient.get<BackendUser[]>(ADMIN_ENDPOINTS.ALL_USERS_NO_PAGINATION).pipe(
      map(users => {

        return users.map(u => this.mapBackendUserToAdminUser(u));
      }),
      catchError(error => {

        return throwError(() => error);
      })
    );
  }

  getUserById(userId: string): Observable<AdminUser> {

    return this.apiClient.get<BackendUser>(ADMIN_ENDPOINTS.USER_DETAIL(userId)).pipe(
      map(user => {

        return this.mapBackendUserToAdminUser(user);
      }),
      catchError(error => {

        return throwError(() => error);
      })
    );
  }

  createUser(request: CreateUserRequest): Observable<{ message: string; data: AdminUser }> {

    this._isLoading.next(true);

    return this.apiClient.postWithResponse<BackendUser>(ADMIN_ENDPOINTS.CREATE_USER, request).pipe(
      finalize(() => this._isLoading.next(false)),
      map(response => {


        const user = this.mapBackendUserToAdminUser(response.data);

        // ✅ No auto-refresh - let component handle it with correct params

        return {
          message: response.message || 'User created successfully',
          data: user
        };
      }),
      catchError(error => {

        return throwError(() => error);
      })
    );
  }

  updateUser(userId: string, request: UpdateUserRequest): Observable<{ message: string; data: AdminUser }> {

    this._isLoading.next(true);

    return this.apiClient.putWithResponse<BackendUser>(ADMIN_ENDPOINTS.UPDATE_USER(userId), request).pipe(
      finalize(() => this._isLoading.next(false)),
      map(response => {


        const user = this.mapBackendUserToAdminUser(response.data);

        // ✅ No auto-refresh - let component handle it with correct params

        return {
          message: response.message || 'User updated successfully',
          data: user
        };
      }),
      catchError(error => {

        return throwError(() => error);
      })
    );
  }

  deleteUser(userId: string): Observable<{ message: string }> {

    this._isLoading.next(true);

    return this.apiClient.deleteWithResponse<string>(ADMIN_ENDPOINTS.DELETE_USER(userId)).pipe(
      finalize(() => this._isLoading.next(false)),
      map(response => {


        // ✅ No auto-refresh - let component handle it with correct params

        return {
          message: response.message || 'User deleted successfully'
        };
      }),
      catchError(error => {

        return throwError(() => error);
      })
    );
  }

  toggleUserStatus(userId: string): Observable<{ message: string; data: AdminUser }> {

    this._isLoading.next(true);

    return this.apiClient.patchWithResponse<BackendUser>(ADMIN_ENDPOINTS.TOGGLE_USER_STATUS(userId), {}).pipe(
      finalize(() => this._isLoading.next(false)),
      map(response => {


        const user = this.mapBackendUserToAdminUser(response.data);

        // ✅ No auto-refresh - let component handle it with correct params

        return {
          message: response.message || 'User status toggled successfully',
          data: user
        };
      }),
      catchError(error => {

        return throwError(() => error);
      })
    );
  }

  /**
   * Update user account status (ACTIVE, BLOCKED, RESTRICTED)
   * NOTE: Backend endpoint may not exist yet - UI is prepared for future integration
   */
  updateUserStatus(userId: string, request: UpdateUserStatusRequest): Observable<{ message: string; data: AdminUser }> {

    this._isLoading.next(true);

    return this.apiClient.patchWithResponse<BackendUser>(ADMIN_ENDPOINTS.UPDATE_USER_STATUS(userId), request).pipe(
      finalize(() => this._isLoading.next(false)),
      map(response => {

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

        // Fallback message for user
        return throwError(() => error);
      })
    );
  }

  bulkImportUsers(file: File, defaultRole: 'ADMIN' | 'ORG_ADMIN' | 'TEACHER' | 'STUDENT' = 'STUDENT'):
    Observable<{ message: string; data: BulkImportUsersResult }> {

    const formData = new FormData();
    formData.append('file', file);
    formData.append('defaultRole', defaultRole);

    return this.apiClient.postWithResponse<BulkImportUsersResult>(ADMIN_ENDPOINTS.BULK_IMPORT_USERS, formData).pipe(
      map(response => ({
        message: response.message || 'Import người dùng thành công',
        data: response.data
      })),
      catchError(error => {

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

    return this.apiClient.getWithResponse<AdminCourseSummary[]>(ADMIN_ENDPOINTS.USER_ENROLLED_COURSES(userId)).pipe(
      map(response => {

        return response.data || [];
      }),
      catchError(error => {

        return throwError(() => error);
      })
    );
  }

  /**
   * Get managed courses for a teacher (Admin view)
   */
  getUserManagedCourses(userId: string): Observable<AdminCourseSummary[]> {

    return this.apiClient.getWithResponse<AdminCourseSummary[]>(ADMIN_ENDPOINTS.USER_MANAGED_COURSES(userId)).pipe(
      map(response => {

        return response.data || [];
      }),
      catchError(error => {

        return throwError(() => error);
      })
    );
  }

  /**
   * Get co-op courses for a teacher (courses where they are invited as teaching staff)
   */
  getUserCoopCourses(userId: string): Observable<AdminCourseSummary[]> {

    return this.apiClient.getWithResponse<AdminCourseSummary[]>(ADMIN_ENDPOINTS.USER_COOP_COURSES(userId)).pipe(
      map(response => {

        return response.data || [];
      }),
      catchError(error => {

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
      lastLogin: backendUser.lastLogin ? new Date(backendUser.lastLogin) : null as any,
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
      case 'ORG_ADMIN': return UserRole.ORG_ADMIN;
      case 'TEACHER': return UserRole.TEACHER;
      case 'STUDENT': return UserRole.STUDENT;
      default: return UserRole.STUDENT;
    }
  }

  private getPermissionsForRole(role: string): string[] {
    switch (role.toUpperCase()) {
      case 'ADMIN': return ['all'];
      case 'ORG_ADMIN': return ['users.manage', 'courses.manage', 'analytics.view'];
      case 'TEACHER': return ['courses.create', 'courses.edit', 'assignments.manage'];
      case 'STUDENT': return ['courses.view', 'assignments.submit'];
      default: return [];
    }
  }

  getSettings(): Observable<SystemSettings> {
    return this.apiClient.getWithResponse<SystemSettings>(ADMIN_ENDPOINTS.SETTINGS).pipe(
      map(response => response.data),
      catchError(() => {
        // Return defaults if API not available
        return new Observable<SystemSettings>(subscriber => {
          subscriber.next({
            general: {
              siteName: 'Maritime LMS',
              siteDescription: 'Hệ thống quản lý học tập hàng hải',
              maintenanceMode: false,
              allowRegistration: true,
              requireEmailVerification: false,
            },
            email: { smtpHost: '', smtpPort: 587, smtpUser: '', smtpPassword: '', fromEmail: '', fromName: '' },
            payment: { stripePublicKey: '', stripeSecretKey: '', paypalClientId: '', paypalClientSecret: '', currency: 'VND', vnpayEnabled: false, sepayEnabled: true },
            security: { sessionTimeout: 1440, maxLoginAttempts: 5, passwordMinLength: 8, requireTwoFactor: false },
          });
          subscriber.complete();
        });
      })
    );
  }

  updateSettings(settings: SystemSettings): Observable<{ message: string }> {
    return this.apiClient.putWithResponse<SystemSettings>(ADMIN_ENDPOINTS.SETTINGS, settings).pipe(
      map(response => ({ message: response.message || 'Đã lưu cài đặt' }))
    );
  }

  getGatewayStatus(): Observable<GatewayStatus> {
    return this.apiClient.get<{ success: boolean; data: GatewayStatus }>('/api/v3/payments/admin/gateway-status').pipe(
      map((r: any) => r.data),
      catchError(() => {
        return new Observable<GatewayStatus>(s => {
          s.next({ vnpay: { enabled: false, sandbox: true, note: '' }, sepay: { enabled: false, bankCode: '', accountNumber: '', accountName: '', webhookUrl: '', webhookConfigured: false } });
          s.complete();
        });
      })
    );
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
