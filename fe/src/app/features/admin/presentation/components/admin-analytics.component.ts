import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';

import { AdminService, SystemAnalytics } from '../../infrastructure/services/admin.service';
import { LoadingComponent } from '../../../../shared/components/loading/loading.component';

@Component({
  selector: 'app-admin-analytics',
  imports: [],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './admin-analytics.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminAnalyticsComponent implements OnInit {
  protected adminService = inject(AdminService);
  protected Math = Math;

  // State
  analytics = signal<SystemAnalytics | null>(null);
  isLoading = signal(false);

  ngOnInit(): void {
    this.loadAnalytics();
  }

  async loadAnalytics(): Promise<void> {
    this.isLoading.set(true);
    try {
      const data = await this.adminService.getSystemAnalytics().toPromise();
      this.analytics.set(data || null);
    } catch (error) {
    } finally {
      this.isLoading.set(false);
    }
  }

  async refreshAnalytics(): Promise<void> {
    await this.loadAnalytics();
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

