import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AdminService, AdminAnalytics } from '../../infrastructure/services/admin.service';
import { LoadingComponent } from '../../../../shared/components/loading/loading.component';

@Component({
  selector: 'app-admin',
  imports: [CommonModule, RouterModule, LoadingComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-pink-100">
      <!-- Admin Header -->
      <div class="bg-white shadow-xl border-b border-gray-800">
        <div class="max-w-7xl mx-auto px-6 py-6">
          <div class="flex items-center space-x-4">
            <div class="w-16 h-16 bg-gradient-to-br from-red-600 to-pink-700 rounded-2xl flex items-center justify-center shadow-lg">
              <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"></path>
              </svg>
            </div>
            <div>
              <h1 class="text-3xl font-bold text-gray-900">Quản trị Hệ thống</h1>
              <p class="text-lg text-gray-600">Quản lý toàn bộ hệ thống LMS Maritime</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      @if (isLoading()) {
        <div class="max-w-7xl mx-auto px-6 py-8">
          <app-loading></app-loading>
        </div>
      } @else {
        <!-- Admin Stats -->
        <div class="max-w-7xl mx-auto px-6 py-8">
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-blue-500">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-600 mb-1">Tổng học viên</p>
                  <p class="text-3xl font-bold text-gray-900">{{ analytics().totalStudents | number }}</p>
                  <p class="text-sm text-green-600 flex items-center mt-1">
                    <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                    </svg>
                    +{{ analytics().studentGrowth }}% so với tháng trước
                  </p>
                </div>
                <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </div>
            </div>

            <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-green-500">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-600 mb-1">Khóa học</p>
                  <p class="text-3xl font-bold text-gray-900">{{ analytics().totalCourses }}</p>
                  <p class="text-sm text-green-600 flex items-center mt-1">
                    <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                    </svg>
                    +{{ analytics().courseGrowth }} mới
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

            <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-yellow-500">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-600 mb-1">Doanh thu</p>
                  <p class="text-3xl font-bold text-gray-900">{{ analytics().revenue | currency:'VND':'symbol':'1.0-0' }}</p>
                  <p class="text-sm text-green-600 flex items-center mt-1">
                    <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                    </svg>
                    +{{ analytics().revenueGrowth }}% tháng này
                  </p>
                </div>
                <div class="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <svg class="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"></path>
                  </svg>
                </div>
              </div>
            </div>

            <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-purple-500">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-600 mb-1">Hoạt động</p>
                  <p class="text-3xl font-bold text-gray-900">{{ analytics().systemUptime }}%</p>
                  <p class="text-sm text-purple-600 flex items-center mt-1">
                    <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                    </svg>
                    Uptime
                  </p>
                </div>
                <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <!-- Main Content -->
          <div class="grid grid-cols-12 gap-6 mt-8">
            <!-- Left Column - Management Tools (8 columns) -->
            <div class="col-span-12 xl:col-span-8 space-y-6">
              <!-- Quick Actions -->
              <div class="bg-white rounded-xl shadow-lg p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-6">Thao tác nhanh</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <button (click)="navigateToUserManagement()" class="flex items-center space-x-3 p-4 rounded-lg border border-gray-800 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group">
                    <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                      <svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z"></path>
                      </svg>
                    </div>
                    <div class="text-left">
                      <h4 class="font-medium text-gray-900 group-hover:text-blue-700">Quản lý người dùng</h4>
                      <p class="text-sm text-gray-600">Thêm, sửa, xóa người dùng</p>
                    </div>
                  </button>

                  <button (click)="navigateToCourseManagement()" class="flex items-center space-x-3 p-4 rounded-lg border border-gray-800 hover:border-green-300 hover:bg-green-50 transition-all duration-200 group">
                    <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                      <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                        <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                      </svg>
                    </div>
                    <div class="text-left">
                      <h4 class="font-medium text-gray-900 group-hover:text-green-700">Quản lý khóa học</h4>
                      <p class="text-sm text-gray-600">Tạo và chỉnh sửa khóa học</p>
                    </div>
                  </button>

                  <button (click)="navigateToAnalytics()" class="flex items-center space-x-3 p-4 rounded-lg border border-gray-800 hover:border-purple-300 hover:bg-purple-50 transition-all duration-200 group">
                    <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                      <svg class="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path>
                      </svg>
                    </div>
                    <div class="text-left">
                      <h4 class="font-medium text-gray-900 group-hover:text-purple-700">Báo cáo & Thống kê</h4>
                      <p class="text-sm text-gray-600">Xem báo cáo chi tiết</p>
                    </div>
                  </button>

                  <button (click)="navigateToSystemSettings()" class="flex items-center space-x-3 p-4 rounded-lg border border-gray-800 hover:border-yellow-300 hover:bg-yellow-50 transition-all duration-200 group">
                    <div class="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center group-hover:bg-yellow-200 transition-colors">
                      <svg class="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"></path>
                      </svg>
                    </div>
                    <div class="text-left">
                      <h4 class="font-medium text-gray-900 group-hover:text-yellow-700">Cài đặt hệ thống</h4>
                      <p class="text-sm text-gray-600">Cấu hình và bảo trì</p>
                    </div>
                  </button>

                  <button class="flex items-center space-x-3 p-4 rounded-lg border border-gray-800 hover:border-red-300 hover:bg-red-50 transition-all duration-200 group">
                    <div class="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center group-hover:bg-red-200 transition-colors">
                      <svg class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                      </svg>
                    </div>
                    <div class="text-left">
                      <h4 class="font-medium text-gray-900 group-hover:text-red-700">Bảo mật</h4>
                      <p class="text-sm text-gray-600">Quản lý bảo mật hệ thống</p>
                    </div>
                  </button>

                  <button class="flex items-center space-x-3 p-4 rounded-lg border border-gray-800 hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 group">
                    <div class="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                      <svg class="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                        <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                      </svg>
                    </div>
                    <div class="text-left">
                      <h4 class="font-medium text-gray-900 group-hover:text-indigo-700">Backup & Restore</h4>
                      <p class="text-sm text-gray-600">Sao lưu dữ liệu</p>
                    </div>
                  </button>
                </div>
              </div>

              <!-- System Status -->
              <div class="bg-white rounded-xl shadow-lg p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-6">Trạng thái hệ thống</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div class="space-y-4">
                    <div class="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div class="flex items-center space-x-3">
                        <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span class="font-medium text-gray-900">Database</span>
                      </div>
                      <span class="text-sm text-green-600 font-medium">Online</span>
                    </div>
                    <div class="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div class="flex items-center space-x-3">
                        <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span class="font-medium text-gray-900">API Server</span>
                      </div>
                      <span class="text-sm text-green-600 font-medium">Healthy</span>
                    </div>
                    <div class="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div class="flex items-center space-x-3">
                        <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span class="font-medium text-gray-900">File Storage</span>
                      </div>
                      <span class="text-sm text-green-600 font-medium">Available</span>
                    </div>
                  </div>
                  <div class="space-y-4">
                    <div class="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                      <div class="flex items-center space-x-3">
                        <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span class="font-medium text-gray-900">Email Service</span>
                      </div>
                      <span class="text-sm text-yellow-600 font-medium">Slow</span>
                    </div>
                    <div class="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div class="flex items-center space-x-3">
                        <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span class="font-medium text-gray-900">CDN</span>
                      </div>
                      <span class="text-sm text-green-600 font-medium">Fast</span>
                    </div>
                    <div class="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div class="flex items-center space-x-3">
                        <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span class="font-medium text-gray-900">SSL Certificate</span>
                      </div>
                      <span class="text-sm text-green-600 font-medium">Valid</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Sidebar (4 columns) -->
            <div class="col-span-12 xl:col-span-4 space-y-6">
              <!-- Recent Activity -->
              <div class="bg-white rounded-xl shadow-lg p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Hoạt động gần đây</h3>
                <div class="space-y-3">
                  @for (activity of recentActivities(); track activity.id) {
                    <div class="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div class="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div class="flex-1">
                        <p class="text-sm text-gray-900">{{ activity.message }}</p>
                        <p class="text-xs text-gray-500">{{ activity.timestamp | date:'short' }}</p>
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- Quick Stats -->
              <div class="bg-white rounded-xl shadow-lg p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Thống kê nhanh</h3>
                <div class="space-y-4">
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Học viên online</span>
                    <span class="text-lg font-semibold text-gray-900">{{ analytics().onlineStudents }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Khóa học đang diễn ra</span>
                    <span class="text-lg font-semibold text-gray-900">{{ analytics().activeCourses }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Bài tập chưa chấm</span>
                    <span class="text-lg font-semibold text-gray-900">{{ analytics().pendingAssignments }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Tin nhắn chưa đọc</span>
                    <span class="text-lg font-semibold text-gray-900">{{ analytics().unreadMessages }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminComponent implements OnInit {
  private adminService = inject(AdminService);
  private router = inject(Router);

  isLoading = signal(true);
  analytics = signal<AdminAnalytics>({
    totalUsers: 0,
    totalTeachers: 0,
    totalStudents: 0,
    totalCourses: 0,
    pendingCourses: 0,
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

  ngOnInit(): void {
    this.loadAnalytics();
  }

  private loadAnalytics(): void {
    this.adminService.getAnalytics().then((data) => {
      this.analytics.set(data);
      this.isLoading.set(false);
    }).catch((error) => {
      console.error('Error loading analytics:', error);
      this.isLoading.set(false);
    });
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