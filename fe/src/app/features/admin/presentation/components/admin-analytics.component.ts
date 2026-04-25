import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { AdminService, SystemAnalytics } from '../../infrastructure/services/admin.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-admin-analytics',
  imports: [],
  templateUrl: './admin-analytics.component.html',
  // CC-03 (mega audit 2026-04-25): styleUrl was missing — main SCSS never
  // loaded so .stat-icon stretched to full content width (1136×1136).
  // Same root-cause class as PR #168 / F-ST1.
  styleUrl: './admin-analytics.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminAnalyticsComponent implements OnInit {
  private adminService = inject(AdminService);
  private toast = inject(ToastService);
  private authService = inject(AuthService);

  isSystemAdmin = computed(() => this.authService.userRole() === 'admin');
  pageTitle = computed(() => this.isSystemAdmin() ? 'Phân tích hệ thống' : 'Phân tích tổ chức');
  pageSubtitle = computed(() => this.isSystemAdmin()
    ? 'Theo dõi và phân tích hiệu suất tổng thể của hệ thống LMS'
    : 'Theo dõi và phân tích hiệu suất của tổ chức bạn quản lý'
  );

  // State
  analytics = signal<SystemAnalytics | null>(null);
  isLoading = signal(false);

  ngOnInit(): void {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.isLoading.set(true);
    this.adminService.getSystemAnalytics().subscribe({
      next: (data) => {
        this.analytics.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('Không thể tải dữ liệu phân tích');
        this.isLoading.set(false);
      }
    });
  }

  refreshAnalytics(): void {
    this.loadAnalytics();
  }

  getCurrentTime(): string {
    return new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  getGrowthBarWidth(): number {
    return Math.min((this.analytics()?.userGrowth?.growthRate || 0) * 2, 100);
  }

  getActiveUserPercent(): number {
    const active = this.analytics()?.activeUsers || 0;
    const total = this.analytics()?.totalUsers || 1;
    return Math.min((active / total) * 100, 100);
  }

  getActiveUserPercentText(): number {
    const active = this.analytics()?.activeUsers || 0;
    const total = this.analytics()?.totalUsers || 1;
    return Math.round((active / total) * 100);
  }

  getHealthClass(status: string): string {
    switch (status) {
      case 'healthy':
        return 'bg-green-50';
      case 'warning':
        return 'bg-yellow-50';
      case 'error':
        return 'bg-red-50';
      default:
        return 'bg-gray-50';
    }
  }

  getHealthDotClass(status: string): string {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  }

  getHealthTextClass(status: string): string {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  }

  getHealthText(status: string): string {
    switch (status) {
      case 'healthy':
        return 'Hoạt động tốt';
      case 'warning':
        return 'Cảnh báo';
      case 'error':
        return 'Lỗi';
      default:
        return 'Không xác định';
    }
  }
}
