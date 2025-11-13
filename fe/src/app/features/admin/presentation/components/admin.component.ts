import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AdminService, SystemAnalytics } from '../../infrastructure/services/admin.service';
import { LoadingComponent } from '../../../../shared/components/loading/loading.component';
import { RevenueChartComponent, RevenueData } from './dashboard/components/revenue-chart.component';

@Component({
  selector: 'app-admin',
  imports: [CommonModule, RouterModule, LoadingComponent, RevenueChartComponent],
  templateUrl: './dashboard/admin-dashboard.component.html',
  styleUrl: './dashboard/admin-dashboard.component.scss'
  // Removed OnPush - signals work better with default change detection
})
export class AdminComponent implements OnInit {
  private adminService = inject(AdminService);
  private router = inject(Router);

  isLoading = signal(true);
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

  recentActivities = signal([
    { id: 1, message: 'Người dùng mới đăng ký', timestamp: new Date() },
    { id: 2, message: 'Khóa học mới được tạo', timestamp: new Date() },
    { id: 3, message: 'Cảnh báo: Email service chậm', timestamp: new Date() },
    { id: 4, message: 'Backup dữ liệu hoàn tất', timestamp: new Date() }
  ]);

  // Revenue chart data - Generate last 30 days
  revenueChartData = computed<RevenueData>(() => {
    const labels: string[] = [];
    const data: number[] = [];
    const today = new Date();
    
    // Generate last 30 days of data
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Format label as "DD/MM"
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      labels.push(`${day}/${month}`);
      
      // Generate realistic revenue data (2M - 8M per day)
      const baseRevenue = 4000000; // 4M base
      const variation = Math.random() * 4000000; // +/- 4M variation
      const trend = i * 50000; // Slight upward trend
      data.push(Math.floor(baseRevenue + variation + trend));
    }
    
    return { labels, data };
  });

  ngOnInit(): void {
    console.log('[ADMIN DASHBOARD] Component initialized, loading analytics...');
    this.loadAnalytics();
  }

  private loadAnalytics(): void {
    console.log('[ADMIN DASHBOARD] Starting to load analytics...');
    this.isLoading.set(true);
    
    this.adminService.getSystemAnalytics().subscribe({
      next: (data) => {
        console.log('[ADMIN DASHBOARD] ✅ Analytics data received:', data);
        this.analytics.set(data);
        this.lastUpdate.set(new Date());
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('[ADMIN DASHBOARD] ❌ Error loading analytics:', error);
        // Use mock data as fallback - create new object to ensure signal updates
        const mockData: SystemAnalytics = {
          totalUsers: 1234,
          totalTeachers: 45,
          totalStudents: 1150,
          totalAdmins: 39,
          totalCourses: 156,
          approvedCourses: 120,
          pendingCourses: 12,
          rejectedCourses: 8,
          draftCourses: 16,
          totalAssignments: 89,
          totalSubmissions: 456,
          totalEnrollments: 890,
          totalRevenue: 120000000,
          monthlyRevenue: 45000000,
          activeUsers: 567,
          systemHealth: {
            database: 'healthy',
            api: 'healthy',
            storage: 'healthy',
            email: 'healthy'
          },
          userGrowth: {
            thisMonth: 150,
            lastMonth: 134,
            growthRate: 12
          },
          courseStats: {
            pending: 12,
            approved: 120,
            rejected: 8,
            active: 120
          },
          revenueStats: {
            thisMonth: 45000000,
            lastMonth: 39000000,
            growthRate: 15
          },
          coursesByStatus: {},
          usersByRole: {},
          enrollmentsByMonth: {},
          studentGrowth: 12,
          courseGrowth: 8,
          revenue: 120000000,
          revenueGrowth: 15,
          systemUptime: 99.9,
          onlineStudents: 45,
          activeCourses: 120,
          pendingAssignments: 25,
          unreadMessages: 8
        };
        console.log('[ADMIN DASHBOARD] Using mock data:', mockData);
        this.analytics.set(mockData);
        this.lastUpdate.set(new Date());
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
}