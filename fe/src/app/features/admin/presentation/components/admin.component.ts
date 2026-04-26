import { Component, signal, inject, OnInit, computed, ChangeDetectionStrategy } from '@angular/core';
import { AdminService, SystemAnalytics, PendingCourseSummary, WindowedAnalytics } from '../../infrastructure/services/admin.service';
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
        [windowDays]="windowDays()"
        (windowDaysChange)="onWindowDaysChange($event)"
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

  // F-P2: dashboard date-range toggle (7 / 30 / 90 ngày). Default 30 keeps
  // parity with the legacy "Tháng này" framing for the revenue card while
  // letting power-users zoom in (7) or out (90). Persisted in-memory only;
  // a future PR can wire to localStorage / per-user prefs.
  windowDays = signal<number>(30);

  ngOnInit(): void {
    this.loadAnalytics();
    this.loadPendingApprovals();
  }

  refreshDashboard(): void {
    this.loadAnalytics();
    this.loadPendingApprovals();
  }

  // F-P2: when the user picks a different window we re-fetch the windowed
  // analytics endpoint and merge its delta fields into the `analytics`
  // signal. The static counts (pending courses, approved courses, etc.)
  // come from the legacy `/courses/analytics` endpoint and remain stable
  // across windows — no re-fetch needed there.
  onWindowDaysChange(days: number): void {
    this.windowDays.set(days);
    this.adminService.getCoursesAnalyticsWindow(days).subscribe({
      next: (w: WindowedAnalytics) => this.applyWindowedAnalytics(w),
      // Silent failure: keep showing the legacy snapshot. The toggle UI
      // already echoes the selected window, so the user can retry by
      // clicking another value.
      error: () => {},
    });
  }

  private applyWindowedAnalytics(w: WindowedAnalytics): void {
    this.analytics.update(prev => ({
      ...prev,
      // Preserve totals as they appear in the windowed payload — for the
      // 30-day default these match the legacy snapshot. For 7 / 90 the
      // strip values shift naturally because the BE re-counts per window.
      totalUsers: w.totalUsers,
      totalCourses: w.totalCourses,
      totalEnrollments: w.totalEnrollments,
      revenue: w.revenue,
      // Growth deltas — null collapses to 0 for the dashboard's existing
      // template binding which expects a number. Loss of fidelity is
      // acceptable here because the UI still says "tăng / giảm" via the
      // arrow glyph; KPI card hides flat trends.
      revenueGrowth: w.revenueGrowth ?? 0,
      courseGrowth: w.courseGrowth.growthRate ?? 0,
      userGrowth: {
        thisMonth: w.userGrowth.thisWindow,
        lastMonth: w.userGrowth.lastWindow,
        growthRate: w.userGrowth.growthRate ?? 0,
      },
    }));
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
        // F-P2: piggy-back the windowed fetch on initial load so the
        // strip values reflect the selected window from frame 1 instead
        // of flashing legacy "this month" totals.
        if (this.isSystemAdmin()) {
          this.adminService.getCoursesAnalyticsWindow(this.windowDays()).subscribe({
            next: (w) => this.applyWindowedAnalytics(w),
            error: () => {},
          });
        }
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
      next: (response: { data: PendingCourseSummary[] }) => {
        const items: PendingApproval[] = response.data.map((course) => ({
          id: course.id,
          name: course.title,
          type: 'course',
          submittedDate: course.submittedAt || course.createdAt
        }));
        this.pendingApprovals.set(items);
        this.isLoadingPending.set(false);
      },
      error: () => {
        this.pendingApprovals.set([]);
        this.isLoadingPending.set(false);
        this.toast.error('Không thể tải danh sách chờ duyệt. Vui lòng thử lại.');
      }
    });
  }
}
