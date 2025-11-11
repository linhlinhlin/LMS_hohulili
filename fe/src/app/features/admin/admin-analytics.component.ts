import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, SystemAnalytics } from './infrastructure/services/admin.service';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-admin-analytics',
  imports: [CommonModule, LoadingComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <!-- Loading State - Temporarily disabled -->
    <!-- <app-loading 
      [show]="adminService.isLoading" 
      text="Đang tải dữ liệu phân tích..."
      subtext="Vui lòng chờ trong giây lát"
      variant="overlay"
      color="red">
    </app-loading> -->

    <div class="bg-gradient-to-br from-slate-50 via-red-50 to-pink-100 min-h-screen">
      <div class="max-w-7xl mx-auto px-6 py-8">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 mb-2">📊 Phân tích hệ thống</h1>
              <p class="text-gray-600">Theo dõi và phân tích hiệu suất tổng thể của hệ thống LMS</p>
            </div>
            <div class="flex items-center space-x-4">
              <div class="text-right">
                <div class="text-sm text-gray-600">Cập nhật lần cuối</div>
                <div class="text-sm font-medium text-gray-900">{{ getCurrentTime() }}</div>
              </div>
              <button (click)="refreshAnalytics()"
                      class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                <svg class="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"></path>
                </svg>
                Làm mới
              </button>
            </div>
          </div>
        </div>

        <!-- Main Analytics Grid -->
        <div class="grid grid-cols-12 gap-6 mb-8">
          <!-- Left Column - Key Metrics (8 columns) -->
          <div class="col-span-12 xl:col-span-8 space-y-6">
            <!-- Key Metrics -->
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-red-500">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-gray-600 mb-1">Tổng người dùng</p>
                    <p class="text-3xl font-bold text-gray-900">{{ analytics()?.totalUsers || 0 }}</p>
                    <p class="text-sm text-red-600 flex items-center mt-1">
                      <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                      </svg>
                      +{{ analytics()?.userGrowth?.growthRate || 0 }}% tháng này
                    </p>
                  </div>
                  <div class="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                    <svg class="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 8v1h1.5a.5.5 0 01.5.5v9a.5.5 0 01-.5.5h-13a.5.5 0 01-.5-.5v-9a.5.5 0 01.5-.5H8v-1a5 5 0 00-5 5v1h9.93z"></path>
                    </svg>
                  </div>
                </div>
              </div>

              <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-purple-500">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-gray-600 mb-1">Giảng viên</p>
                    <p class="text-3xl font-bold text-gray-900">{{ analytics()?.totalTeachers || 0 }}</p>
                    <p class="text-sm text-purple-600 flex items-center mt-1">
                      <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                      </svg>
                      Hoạt động
                    </p>
                  </div>
                  <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                      <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                </div>
              </div>

              <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-blue-500">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-gray-600 mb-1">Học viên</p>
                    <p class="text-3xl font-bold text-gray-900">{{ analytics()?.totalStudents || 0 }}</p>
                    <p class="text-sm text-blue-600 flex items-center mt-1">
                      <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                      </svg>
                      Đang học
                    </p>
                  </div>
                  <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 8v1h1.5a.5.5 0 01.5.5v9a.5.5 0 01-.5.5h-13a.5.5 0 01-.5-.5v-9a.5.5 0 01.5-.5H8v-1a5 5 0 00-5 5v1h9.93z"></path>
                    </svg>
                  </div>
                </div>
              </div>

              <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-green-500">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-gray-600 mb-1">Khóa học</p>
                    <p class="text-3xl font-bold text-gray-900">{{ analytics()?.totalCourses || 0 }}</p>
                    <p class="text-sm text-green-600 flex items-center mt-1">
                      <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                      </svg>
                      {{ analytics()?.pendingCourses || 0 }} chờ phê duyệt
                    </p>
                  </div>
                  <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                      <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <!-- Revenue Analytics -->
            <div class="bg-white rounded-xl shadow-lg p-6">
              <h3 class="text-xl font-semibold text-gray-900 mb-6">💰 Phân tích doanh thu</h3>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="text-center">
                  <div class="text-3xl font-bold text-green-600 mb-2">{{ formatCurrency(analytics()?.totalRevenue || 0) }}</div>
                  <div class="text-sm text-gray-600">Tổng doanh thu</div>
                </div>
                <div class="text-center">
                  <div class="text-3xl font-bold text-blue-600 mb-2">{{ formatCurrency(analytics()?.monthlyRevenue || 0) }}</div>
                  <div class="text-sm text-gray-600">Doanh thu tháng này</div>
                </div>
                <div class="text-center">
                  <div class="text-3xl font-bold text-purple-600 mb-2">+{{ analytics()?.revenueStats?.growthRate || 0 }}%</div>
                  <div class="text-sm text-gray-600">Tăng trưởng</div>
                </div>
              </div>
            </div>

            <!-- Course Statistics -->
            <div class="bg-white rounded-xl shadow-lg p-6">
              <h3 class="text-xl font-semibold text-gray-900 mb-6">📚 Thống kê khóa học</h3>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div class="text-center">
                  <div class="text-2xl font-bold text-yellow-600 mb-2">{{ analytics()?.courseStats?.pending || 0 }}</div>
                  <div class="text-sm text-gray-600">Chờ phê duyệt</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-green-600 mb-2">{{ analytics()?.courseStats?.approved || 0 }}</div>
                  <div class="text-sm text-gray-600">Đã phê duyệt</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-red-600 mb-2">{{ analytics()?.courseStats?.rejected || 0 }}</div>
                  <div class="text-sm text-gray-600">Bị từ chối</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-blue-600 mb-2">{{ analytics()?.courseStats?.active || 0 }}</div>
                  <div class="text-sm text-gray-600">Đang hoạt động</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column - System Health & Activity (4 columns) -->
          <div class="col-span-12 xl:col-span-4 space-y-6">
            <!-- System Health -->
            <div class="bg-white rounded-xl shadow-lg p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-6">🔧 Trạng thái hệ thống</h3>
              <div class="space-y-4">
                <div class="flex items-center justify-between p-3 rounded-lg"
                     [class]="getHealthClass(analytics()?.systemHealth?.database || 'healthy')">
                  <div class="flex items-center space-x-3">
                    <div class="w-3 h-3 rounded-full"
                         [class]="getHealthDotClass(analytics()?.systemHealth?.database || 'healthy')"></div>
                    <span class="font-medium text-gray-900">Database</span>
                  </div>
                  <span class="text-sm font-medium"
                        [class]="getHealthTextClass(analytics()?.systemHealth?.database || 'healthy')">
                    {{ getHealthText(analytics()?.systemHealth?.database || 'healthy') }}
                  </span>
                </div>
                <div class="flex items-center justify-between p-3 rounded-lg"
                     [class]="getHealthClass(analytics()?.systemHealth?.api || 'healthy')">
                  <div class="flex items-center space-x-3">
                    <div class="w-3 h-3 rounded-full"
                         [class]="getHealthDotClass(analytics()?.systemHealth?.api || 'healthy')"></div>
                    <span class="font-medium text-gray-900">API Server</span>
                  </div>
                  <span class="text-sm font-medium"
                        [class]="getHealthTextClass(analytics()?.systemHealth?.api || 'healthy')">
                    {{ getHealthText(analytics()?.systemHealth?.api || 'healthy') }}
                  </span>
                </div>
                <div class="flex items-center justify-between p-3 rounded-lg"
                     [class]="getHealthClass(analytics()?.systemHealth?.storage || 'healthy')">
                  <div class="flex items-center space-x-3">
                    <div class="w-3 h-3 rounded-full"
                         [class]="getHealthDotClass(analytics()?.systemHealth?.storage || 'healthy')"></div>
                    <span class="font-medium text-gray-900">File Storage</span>
                  </div>
                  <span class="text-sm font-medium"
                        [class]="getHealthTextClass(analytics()?.systemHealth?.storage || 'healthy')">
                    {{ getHealthText(analytics()?.systemHealth?.storage || 'healthy') }}
                  </span>
                </div>
                <div class="flex items-center justify-between p-3 rounded-lg"
                     [class]="getHealthClass(analytics()?.systemHealth?.email || 'warning')">
                  <div class="flex items-center space-x-3">
                    <div class="w-3 h-3 rounded-full"
                         [class]="getHealthDotClass(analytics()?.systemHealth?.email || 'warning')"></div>
                    <span class="font-medium text-gray-900">Email Service</span>
                  </div>
                  <span class="text-sm font-medium"
                        [class]="getHealthTextClass(analytics()?.systemHealth?.email || 'warning')">
                    {{ getHealthText(analytics()?.systemHealth?.email || 'warning') }}
                  </span>
                </div>
              </div>
            </div>

            <!-- User Growth -->
            <div class="bg-white rounded-xl shadow-lg p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-6">📈 Tăng trưởng người dùng</h3>
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">Tháng này</span>
                  <span class="text-lg font-semibold text-gray-900">{{ analytics()?.userGrowth?.thisMonth || 0 }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">Tháng trước</span>
                  <span class="text-lg font-semibold text-gray-900">{{ analytics()?.userGrowth?.lastMonth || 0 }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">Tỷ lệ tăng trưởng</span>
                  <span class="text-lg font-semibold text-green-600">+{{ analytics()?.userGrowth?.growthRate || 0 }}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div class="bg-green-600 h-2 rounded-full" 
                       [style.width.%]="Math.min((analytics()?.userGrowth?.growthRate || 0) * 2, 100)"></div>
                </div>
              </div>
            </div>

            <!-- Active Users -->
            <div class="bg-white rounded-xl shadow-lg p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-6">👥 Người dùng hoạt động</h3>
              <div class="text-center">
                <div class="text-4xl font-bold text-blue-600 mb-2">{{ analytics()?.activeUsers || 0 }}</div>
                <div class="text-sm text-gray-600 mb-4">Đang online</div>
                <div class="w-full bg-gray-200 rounded-full h-3">
                  <div class="bg-blue-600 h-3 rounded-full" 
                       [style.width.%]="Math.min(((analytics()?.activeUsers || 0) / (analytics()?.totalUsers || 1)) * 100, 100)"></div>
                </div>
                <div class="text-xs text-gray-500 mt-2">
                  {{ Math.round(((analytics()?.activeUsers || 0) / (analytics()?.totalUsers || 1)) * 100) }}% tổng người dùng
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Performance Charts Placeholder -->
        <div class="bg-white rounded-xl shadow-lg p-6">
          <h3 class="text-xl font-semibold text-gray-900 mb-6">📊 Biểu đồ hiệu suất</h3>
          <div class="text-center py-12">
            <svg class="w-24 h-24 text-gray-300 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"></path>
            </svg>
            <h4 class="text-lg font-medium text-gray-900 mb-2">Biểu đồ sẽ được tích hợp sớm</h4>
            <p class="text-gray-500">Chúng tôi đang phát triển các biểu đồ tương tác để hiển thị xu hướng và phân tích chi tiết</p>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminAnalyticsComponent implements OnInit {
  protected adminService = inject(AdminService);
  protected Math = Math;

  // State
  analytics = signal<SystemAnalytics | null>(null);

  ngOnInit(): void {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.adminService.getSystemAnalytics().subscribe({
      next: (data: SystemAnalytics) => {
        this.analytics.set(data);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error loading analytics:', error);
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