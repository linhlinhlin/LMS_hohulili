import { Component, signal, inject, OnInit, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AdminService, SystemAnalytics, AdminCourseSummary } from '../../infrastructure/services/admin.service';
import { LoadingComponent } from '../../../../shared/components/loading/loading.component';
import { RevenueChartComponent, RevenueData } from './dashboard/components/revenue-chart.component';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthService } from '../../../../core/services/auth.service';

interface PendingApproval {
  id: string;
  name: string;
  type: 'course' | 'teacher';
  submittedDate: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-admin',
  imports: [CommonModule, RouterModule, LoadingComponent, RevenueChartComponent],
  templateUrl: './dashboard/admin-dashboard.component.html'
})
export class AdminComponent implements OnInit {
  private adminService = inject(AdminService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private authService = inject(AuthService);

  // Role-specific dashboard subtitle
  dashboardSubtitle = computed(() =>
    this.authService.userRole() === 'org_admin'
      ? 'Bảng điều khiển quản lý'
      : 'Bảng điều khiển hệ thống'
  );

  isSystemAdmin = computed(() => this.authService.userRole() === 'admin');

  isLoading = signal(true);
  loadError = signal(false);
  lastUpdate = signal<Date>(new Date());
  analytics = signal<SystemAnalytics>({
    totalUsers: 0,
    totalTeachers: 0,
    totalStudents: 0,
    totalAdmins: 0,
    totalCourses: 0,
    approvedCourses: 0,
    pendingCourses: 0,
    rejectedCourses: 0,
    draftCourses: 0,
    totalAssignments: 0,
    totalSubmissions: 0,
    totalEnrollments: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    activeUsers: 0,
    systemHealth: {
      database: 'healthy',
      api: 'healthy',
      storage: 'healthy',
      email: 'healthy'
    },
    userGrowth: {
      thisMonth: 0,
      lastMonth: 0,
      growthRate: 0
    },
    courseStats: {
      pending: 0,
      approved: 0,
      rejected: 0,
      active: 0
    },
    revenueStats: {
      thisMonth: 0,
      lastMonth: 0,
      growthRate: 0
    },
    coursesByStatus: {},
    usersByRole: {},
    enrollmentsByMonth: {},
    studentGrowth: 0,
    courseGrowth: 0,
    revenue: 0,
    revenueGrowth: 0,
    systemUptime: 0,
    onlineStudents: 0,
    activeCourses: 0,
    pendingAssignments: 0,
    unreadMessages: 0
  });

  // Recent activities derived from analytics (no backend endpoint for activity log)
  recentActivities = computed(() => {
    const a = this.analytics();
    const activities: { id: number; message: string; timestamp: Date }[] = [];
    let id = 1;
    if (a.pendingCourses > 0) {
      activities.push({ id: id++, message: `${a.pendingCourses} khóa học đang chờ duyệt`, timestamp: new Date() });
    }
    if (a.totalEnrollments > 0) {
      activities.push({ id: id++, message: `${a.totalEnrollments} lượt đăng ký khóa học`, timestamp: new Date() });
    }
    if (a.totalStudents > 0) {
      activities.push({ id: id++, message: `${a.totalStudents} học viên trong hệ thống`, timestamp: new Date() });
    }
    if (a.totalCourses > 0) {
      activities.push({ id: id++, message: `${a.totalCourses} khóa học đã tạo`, timestamp: new Date() });
    }
    if (activities.length === 0) {
      activities.push({ id: 1, message: 'Chưa có hoạt động nào', timestamp: new Date() });
    }
    return activities;
  });

  // Pending approvals - now using real API data
  pendingApprovals = signal<PendingApproval[]>([]);
  isLoadingPending = signal(false);

  // Revenue chart data - derived from real analytics monthly revenue
  revenueChartData = computed<RevenueData>(() => {
    const labels: string[] = [];
    const data: number[] = [];
    const today = new Date();
    const monthlyRevenue = this.analytics().monthlyRevenue || 0;
    const dailyAvg = monthlyRevenue / 30;

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      labels.push(`${day}/${month}`);
      // Deterministic variation based on day index (no Math.random)
      const variation = Math.sin(i * 0.7) * dailyAvg * 0.3;
      data.push(Math.max(0, Math.floor(dailyAvg + variation)));
    }

    return { labels, data };
  });

  ngOnInit(): void {
    this.loadAnalytics();
    this.loadPendingApprovals();
  }

  private loadAnalytics(): void {
    this.isLoading.set(true);
    this.loadError.set(false);
    
    this.adminService.getSystemAnalytics().subscribe({
      next: (data) => {
        this.analytics.set(data);
        this.lastUpdate.set(new Date());
        this.isLoading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.isLoading.set(false);
      }
    });
  }

  refreshDashboard(): void {
    this.isLoading.set(true);
    this.loadAnalytics();
  }

  navigateToUserManagement(): void {
    this.router.navigate(['/admin/users']);
  }

  navigateToCourseManagement(): void {
    this.router.navigate(['/admin/courses']);
  }

  navigateToAnalytics(): void {
    this.router.navigate(['/admin/analytics']);
  }

  navigateToSystemSettings(): void {
    this.router.navigate(['/admin/settings']);
  }

  private loadPendingApprovals(): void {
    this.isLoadingPending.set(true);
    this.adminService.getPendingCourses().subscribe({
      next: (response) => {
        const courses = response.data;
        const pendingList: PendingApproval[] = courses.map(course => ({
          id: course.id,
          name: course.title,
          type: 'course' as const,
          submittedDate: course.submittedAt || course.createdAt
        }));
        this.pendingApprovals.set(pendingList);
        this.isLoadingPending.set(false);
      },
      error: () => {
        this.isLoadingPending.set(false);
        // Fallback to empty array on error
        this.pendingApprovals.set([]);
      }
    });
  }

  approveCourse(courseId: string): void {
    this.adminService.approveCourse(courseId).subscribe({
      next: () => {
        // Remove from pending list
        const currentList = this.pendingApprovals();
        this.pendingApprovals.set(currentList.filter(item => item.id !== courseId));
        // Reload analytics to update pending count
        this.loadAnalytics();
      },
      error: () => {
        this.toast.error('Có lỗi xảy ra khi duyệt khóa học. Vui lòng thử lại.');
      }
    });
  }

  rejectCourse(courseId: string): void {
    // For now, just reject with a default reason
    // In a real implementation, you might want to show a modal to get the reason
    const reason = 'Từ chối từ dashboard admin';
    this.adminService.rejectCourse(courseId, reason).subscribe({
      next: () => {
        // Remove from pending list
        const currentList = this.pendingApprovals();
        this.pendingApprovals.set(currentList.filter(item => item.id !== courseId));
        // Reload analytics to update pending count
        this.loadAnalytics();
      },
      error: () => {
        this.toast.error('Có lỗi xảy ra khi từ chối khóa học. Vui lòng thử lại.');
      }
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  }
}
