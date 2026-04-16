import { Component, signal, inject, OnInit, computed, ChangeDetectionStrategy } from '@angular/core';
import { AdminService, SystemAnalytics } from '../../infrastructure/services/admin.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthService } from '../../../../core/services/auth.service';
import { PendingApproval } from './dashboard/dashboard.types';
import { AdminSystemDashboardComponent } from './dashboard/admin-system-dashboard.component';
import { AdminOrgDashboardComponent } from './dashboard/admin-org-dashboard.component';

const EMPTY_ANALYTICS: SystemAnalytics = {
  totalUsers: 0, totalTeachers: 0, totalStudents: 0, totalAdmins: 0,
  totalCourses: 0, approvedCourses: 0, pendingCourses: 0, rejectedCourses: 0, draftCourses: 0,
  totalAssignments: 0, totalSubmissions: 0, totalEnrollments: 0,
  totalRevenue: 0, monthlyRevenue: 0, activeUsers: 0,
  systemHealth: { database: 'healthy', api: 'healthy', storage: 'healthy', email: 'healthy' },
  userGrowth: { thisMonth: 0, lastMonth: 0, growthRate: 0 },
  courseStats: { pending: 0, approved: 0, rejected: 0, active: 0 },
  revenueStats: { thisMonth: 0, lastMonth: 0, growthRate: 0 },
  coursesByStatus: {}, usersByRole: {}, enrollmentsByMonth: {},
  studentGrowth: 0, courseGrowth: 0, revenue: 0, revenueGrowth: 0,
  systemUptime: 0, onlineStudents: 0, activeCourses: 0,
  pendingAssignments: 0, unreadMessages: 0
};

@Component({
  selector: 'app-admin',
  imports: [AdminSystemDashboardComponent, AdminOrgDashboardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './admin.component.scss',
  template: `
    @if (loadError()) {
      <div class="error-page">
        <div class="error-content">
          <svg class="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3>Không thể tải dữ liệu bảng điều khiển</h3>
          <p>Vui lòng kiểm tra kết nối và thử lại</p>
          <button class="retry-btn" (click)="refreshDashboard()">Thử lại</button>
        </div>
      </div>
    } @else if (isSystemAdmin()) {
      <app-admin-system-dashboard
        [analytics]="analytics()"
        [pendingApprovals]="pendingApprovals()"
        [isLoading]="isLoading()"
        [isLoadingPending]="isLoadingPending()"
        (courseApproved)="onCourseApproved($event)"
        (courseRejected)="onCourseRejected($event)" />
    } @else {
      <app-admin-org-dashboard
        [analytics]="analytics()"
        [pendingApprovals]="pendingApprovals()"
        [isLoading]="isLoading()"
        [isLoadingPending]="isLoadingPending()"
        (courseApproved)="onCourseApproved($event)"
        (courseRejected)="onCourseRejected($event)" />
    }
  `
})
export class AdminComponent implements OnInit {
  private adminService = inject(AdminService);
  private toast = inject(ToastService);
  private authService = inject(AuthService);

  isSystemAdmin = computed(() => this.authService.userRole() === 'admin');
  isLoading = signal(true);
  loadError = signal(false);
  analytics = signal<SystemAnalytics>(EMPTY_ANALYTICS);
  pendingApprovals = signal<PendingApproval[]>([]);
  isLoadingPending = signal(false);

  ngOnInit(): void {
    this.loadAnalytics();
    this.loadPendingApprovals();
  }

  refreshDashboard(): void {
    this.loadAnalytics();
    this.loadPendingApprovals();
  }

  onCourseApproved(courseId: string): void {
    this.adminService.approveCourse(courseId).subscribe({
      next: () => {
        this.pendingApprovals.update(list => list.filter(item => item.id !== courseId));
        this.loadAnalytics();
      },
      error: () => this.toast.error('Có lỗi xảy ra khi duyệt khóa học. Vui lòng thử lại.')
    });
  }

  onCourseRejected(event: { id: string; reason: string }): void {
    this.adminService.rejectCourse(event.id, event.reason).subscribe({
      next: () => {
        this.pendingApprovals.update(list => list.filter(item => item.id !== event.id));
        this.loadAnalytics();
        this.toast.success('Đã từ chối khóa học');
      },
      error: () => this.toast.error('Có lỗi xảy ra khi từ chối khóa học. Vui lòng thử lại.')
    });
  }

  private loadAnalytics(): void {
    this.isLoading.set(true);
    this.loadError.set(false);
    this.adminService.getSystemAnalytics().subscribe({
      next: (data) => {
        this.analytics.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.isLoading.set(false);
      }
    });
  }

  private loadPendingApprovals(): void {
    this.isLoadingPending.set(true);
    this.adminService.getPendingCourses().subscribe({
      next: (response) => {
        this.pendingApprovals.set(
          response.data.map(course => ({
            id: course.id,
            name: course.title,
            type: 'course' as const,
            submittedDate: course.submittedAt || course.createdAt
          }))
        );
        this.isLoadingPending.set(false);
      },
      error: () => {
        this.pendingApprovals.set([]);
        this.isLoadingPending.set(false);
      }
    });
  }
}
