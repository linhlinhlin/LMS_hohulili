import { Injectable, inject, signal } from '@angular/core';
import { Observable, throwError, BehaviorSubject, EMPTY } from 'rxjs';
import { map, catchError, finalize, tap } from 'rxjs/operators';
import { ApiClient } from '../../../../api/client/api-client';
import { ToastService } from '../../../../core/services/toast.service';

// ============================================
// INTERFACES
// ============================================

export interface InstructorPermissions {
    canEditContent: boolean;
    canManageStudents: boolean;
    canViewAnalytics: boolean;
    canManageSettings: boolean;
}

export interface CourseInstructor {
    id: string;
    userId: string;
    userName: string;           // Backend field name
    userEmail: string;          // Backend field name
    role: 'OWNER' | 'CO_INSTRUCTOR';
    status: 'ACTIVE' | 'PENDING' | 'INVITED';
    canManage: boolean;
    canViewPerformance: boolean;
    isVisible: boolean;
    canGradeAssignments: boolean;
    revenueSharePercent: number;
    invitedAt: string;
    acceptedAt?: string;
}

export interface InviteInstructorRequest {
    email: string;
    permissions?: InstructorPermissions;
    message?: string;
}

export interface InvitationItem {
    id: string;
    courseId: string;
    courseName: string;
    courseThumbnail?: string;
    invitedBy: string;
    invitedByName: string;
    invitedAt: string;
    status: 'pending' | 'accepted' | 'declined';
    permissions: InstructorPermissions;
}

// Default permissions for new co-instructors
export const DEFAULT_PERMISSIONS: InstructorPermissions = {
    canEditContent: true,
    canManageStudents: false,
    canViewAnalytics: true,
    canManageSettings: false
};

// ============================================
// SERVICE
// ============================================

@Injectable({
    providedIn: 'root'
})
export class CourseInstructorService {
    private apiClient = inject(ApiClient);
    private toast = inject(ToastService);

    // Loading state
    private _isLoading = new BehaviorSubject<boolean>(false);
    readonly isLoading$ = this._isLoading.asObservable();
    readonly isLoading = signal(false);

    // Cached data signals
    private _instructors = signal<CourseInstructor[]>([]);
    private _myInvitations = signal<InvitationItem[]>([]);

    // Public readonly signals
    readonly instructors = this._instructors.asReadonly();
    readonly myInvitations = this._myInvitations.asReadonly();

    // ============================================
    // INSTRUCTOR MANAGEMENT
    // ============================================

    /**
     * Get list of instructors for a course
     */
    getInstructors(courseId: string): Observable<CourseInstructor[]> {
        this._isLoading.next(true);
        this.isLoading.set(true);

        return this.apiClient.getWithResponse<CourseInstructor[]>(`/api/v3/courses/${courseId}/instructors`).pipe(
            finalize(() => {
                this._isLoading.next(false);
                this.isLoading.set(false);
            }),
            map(response => {
                const instructors = response.data ?? [];
                this._instructors.set(instructors);
                return instructors;
            }),
            catchError(error => {
                return throwError(() => error);
            })
        );
    }

    /**
     * Invite a co-instructor to the course
     * Maps frontend permissions to backend format
     */
    inviteInstructor(courseId: string, request: InviteInstructorRequest): Observable<{ message: string }> {
        this._isLoading.next(true);
        this.isLoading.set(true);

        // Map frontend permissions to backend format
        const backendRequest = {
            email: request.email,
            canManage: request.permissions?.canEditContent ?? true,
            canViewPerformance: request.permissions?.canViewAnalytics ?? true,
            isVisible: true,
            canGradeAssignments: request.permissions?.canManageStudents ?? false,
            revenueSharePercent: 0
        };

        return this.apiClient.postWithResponse<void>(`/api/v3/courses/${courseId}/instructors/invite`, backendRequest).pipe(
            finalize(() => {
                this._isLoading.next(false);
                this.isLoading.set(false);
            }),
            tap(() => {
                this.refreshInstructorsCache(courseId, 'Da gui loi moi, nhung khong the lam moi danh sach giang vien.');
            }),
            map(response => {
                return {
                    message: response.message || 'Đã gửi lời mời thành công!'
                };
            }),
            catchError(error => {
                return throwError(() => error);
            })
        );
    }

    /**
     * Update instructor permissions
     */
    updatePermissions(courseId: string, userId: string, permissions: InstructorPermissions): Observable<{ message: string }> {
        this._isLoading.next(true);
        this.isLoading.set(true);

        return this.apiClient.putWithResponse<void>(`/api/v3/courses/${courseId}/instructors/${userId}`, { permissions }).pipe(
            finalize(() => {
                this._isLoading.next(false);
                this.isLoading.set(false);
            }),
            tap(() => {
                this.refreshInstructorsCache(courseId, 'Da cap nhat quyen, nhung khong the lam moi danh sach giang vien.');
            }),
            map(response => {
                return {
                    message: response.message || 'Đã cập nhật quyền thành công!'
                };
            }),
            catchError(error => {
                return throwError(() => error);
            })
        );
    }

    /**
     * Remove instructor from course
     */
    removeInstructor(courseId: string, userId: string): Observable<{ message: string }> {
        this._isLoading.next(true);
        this.isLoading.set(true);

        return this.apiClient.deleteWithResponse<void>(`/api/v3/courses/${courseId}/instructors/${userId}`).pipe(
            finalize(() => {
                this._isLoading.next(false);
                this.isLoading.set(false);
            }),
            tap(() => {
                // Remove from local cache
                this._instructors.update(list => list.filter(i => i.userId !== userId));
            }),
            map(response => {
                return {
                    message: response.message || 'Đã xóa giảng viên thành công!'
                };
            }),
            catchError(error => {
                return throwError(() => error);
            })
        );
    }

    // ============================================
    // INVITATION MANAGEMENT
    // ============================================

    /**
     * Get my pending invitations
     */
    getMyInvitations(): Observable<InvitationItem[]> {
        this._isLoading.next(true);
        this.isLoading.set(true);

        return this.apiClient.getWithResponse<InvitationItem[]>('/api/v3/teacher/invitations').pipe(
            finalize(() => {
                this._isLoading.next(false);
                this.isLoading.set(false);
            }),
            map(response => {
                const invitations = response.data ?? [];
                this._myInvitations.set(invitations);
                return invitations;
            }),
            catchError(error => {
                return throwError(() => error);
            })
        );
    }

    /**
     * Accept invitation to join course
     * Uses invitationId from backend API
     */
    acceptInvitation(invitationId: string): Observable<{ message: string }> {
        this._isLoading.next(true);
        this.isLoading.set(true);

        return this.apiClient.postWithResponse<void>(`/api/v3/teacher/invitations/${invitationId}/accept`, {}).pipe(
            finalize(() => {
                this._isLoading.next(false);
                this.isLoading.set(false);
            }),
            tap(() => {
                // Remove from local cache by invitationId
                this._myInvitations.update(list => list.filter(i => i.id !== invitationId));
            }),
            map(response => {
                return {
                    message: response.message || 'Đã chấp nhận lời mời!'
                };
            }),
            catchError(error => {
                return throwError(() => error);
            })
        );
    }

    /**
     * Decline/Reject invitation
     * Uses invitationId from backend API
     */
    declineInvitation(invitationId: string): Observable<{ message: string }> {
        this._isLoading.next(true);
        this.isLoading.set(true);

        return this.apiClient.postWithResponse<void>(`/api/v3/teacher/invitations/${invitationId}/reject`, {}).pipe(
            finalize(() => {
                this._isLoading.next(false);
                this.isLoading.set(false);
            }),
            tap(() => {
                // Remove from local cache by invitationId
                this._myInvitations.update(list => list.filter(i => i.id !== invitationId));
            }),
            map(response => {
                return {
                    message: response.message || 'Đã từ chối lời mời!'
                };
            }),
            catchError(error => {
                return throwError(() => error);
            })
        );
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    getRoleLabel(role: string): string {
        return role === 'OWNER' ? 'Chủ sở hữu' : 'Đồng giảng viên';
    }

    getRoleBadgeClass(role: string): string {
        return role === 'OWNER'
            ? 'bg-blue-50 text-blue-700 border-blue-100'
            : 'bg-[#0056D2]/5 text-[#0056D2] border-[#0056D2]/10';
    }

    getStatusLabel(status: string): string {
        switch (status) {
            case 'active': return 'Hoạt động';
            case 'pending': return 'Chờ xác nhận';
            case 'accepted': return 'Đã chấp nhận';
            case 'declined': return 'Đã từ chối';
            default: return status;
        }
    }

    getStatusBadgeClass(status: string): string {
        switch (status) {
            case 'active':
            case 'accepted':
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'declined':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    }

    formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    private refreshInstructorsCache(courseId: string, warningMessage: string): void {
        this.apiClient.getWithResponse<CourseInstructor[]>(`/api/v3/courses/${courseId}/instructors`).pipe(
            map(response => response.data ?? []),
            tap(instructors => this._instructors.set(instructors)),
            catchError(() => {
                this.toast.warning(warningMessage);
                return EMPTY;
            })
        ).subscribe();
    }
}
