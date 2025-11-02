import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService, Notification } from '../services/notification.service';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

@Component({
  selector: 'app-teacher-notifications',
  imports: [CommonModule, RouterModule, LoadingComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <!-- Loading State -->
    <app-loading 
      [show]="isLoading()" 
      text="Đang tải thông báo..."
      subtext="Vui lòng chờ trong giây lát"
      variant="overlay"
      color="purple">
    </app-loading>

    <div class="bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 min-h-screen">
      <div class="max-w-7xl mx-auto px-6 py-8">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 mb-2">🔔 Thông báo</h1>
              <p class="text-gray-600">Quản lý thông báo và cập nhật hệ thống</p>
            </div>
            <div class="flex items-center space-x-4">
              <button (click)="markAllAsRead()"
                      class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                Đánh dấu tất cả đã đọc
              </button>
              <button (click)="refreshNotifications()"
                      class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
                Làm mới
              </button>
            </div>
          </div>
        </div>

        <!-- Stats Overview -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-purple-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Tổng thông báo</p>
                <p class="text-3xl font-bold text-gray-900">{{ totalNotifications() }}</p>
                <p class="text-sm text-purple-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                  </svg>
                  +{{ newNotifications() }} mới
                </p>
              </div>
              <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-green-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Chưa đọc</p>
                <p class="text-3xl font-bold text-gray-900">{{ unreadNotifications() }}</p>
                <p class="text-sm text-green-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                  </svg>
                  Cần xem
                </p>
              </div>
              <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-blue-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Hôm nay</p>
                <p class="text-3xl font-bold text-gray-900">{{ todayNotifications() }}</p>
                <p class="text-sm text-blue-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                  </svg>
                  Cập nhật
                </p>
              </div>
              <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-orange-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Tuần này</p>
                <p class="text-3xl font-bold text-gray-900">{{ weekNotifications() }}</p>
                <p class="text-sm text-orange-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                  </svg>
                  Tổng cộng
                </p>
              </div>
              <div class="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Filter Tabs -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <button (click)="setFilter('all')"
                      class="px-4 py-2 rounded-lg font-medium transition-colors"
                      [class]="filter() === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'">
                Tất cả ({{ totalNotifications() }})
              </button>
              <button (click)="setFilter('unread')"
                      class="px-4 py-2 rounded-lg font-medium transition-colors"
                      [class]="filter() === 'unread' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'">
                Chưa đọc ({{ unreadNotifications() }})
              </button>
              <button (click)="setFilter('today')"
                      class="px-4 py-2 rounded-lg font-medium transition-colors"
                      [class]="filter() === 'today' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'">
                Hôm nay ({{ todayNotifications() }})
              </button>
            </div>
            
            @if (urgentNotifications().length > 0) {
              <div class="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-800 rounded-lg">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                </svg>
                <span class="text-sm font-medium">{{ urgentNotifications().length }} thông báo khẩn cấp</span>
              </div>
            }
          </div>
        </div>

        <!-- Notifications List -->
        <div class="space-y-4">
          @for (notification of filteredNotifications(); track notification.id) {
            <div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
                 [class]="notification.isRead ? 'opacity-75' : 'border-l-4 border-purple-500'">
              <div class="p-6">
                <div class="flex items-start justify-between">
                  <div class="flex items-start space-x-4">
                    <!-- Notification Icon -->
                    <div class="flex-shrink-0">
                      <div class="w-10 h-10 rounded-lg flex items-center justify-center"
                           [class]="getNotificationIconClass(notification.type)">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path [attr.d]="getNotificationIconPath(notification.type)"></path>
                        </svg>
                      </div>
                    </div>

                    <!-- Notification Content -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center space-x-2 mb-2">
                        <h3 class="text-lg font-semibold text-gray-900">{{ notification.title }}</h3>
                        @if (!notification.isRead) {
                          <span class="w-2 h-2 bg-purple-500 rounded-full"></span>
                        }
                        @if (notification.priority === 'urgent') {
                          <span class="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                            Khẩn cấp
                          </span>
                        } @else if (notification.priority === 'high') {
                          <span class="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                            Cao
                          </span>
                        }
                        <span class="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                          {{ getCategoryText(notification.category) }}
                        </span>
                      </div>
                      <p class="text-gray-600 mb-3">{{ notification.message }}</p>
                      <div class="flex items-center justify-between">
                        <span class="text-sm text-gray-500">{{ formatTimestamp(notification.timestamp) }}</span>
                        @if (notification.actionUrl && notification.actionText) {
                          <button (click)="handleNotificationAction(notification)"
                                  class="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium">
                            {{ notification.actionText }}
                          </button>
                        }
                      </div>
                    </div>
                  </div>

                  <!-- Actions -->
                  <div class="flex items-center space-x-2">
                    @if (!notification.isRead) {
                      <button (click)="markAsRead(notification.id)"
                              class="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                              title="Đánh dấu đã đọc">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                        </svg>
                      </button>
                    }
                    <button (click)="deleteNotification(notification.id)"
                            class="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="Xóa thông báo">
                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Empty State -->
        @if (filteredNotifications().length === 0) {
          <div class="text-center py-12">
            <svg class="w-24 h-24 text-gray-300 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"></path>
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Không có thông báo nào</h3>
            <p class="text-gray-500 mb-6">Bạn đã xem tất cả thông báo</p>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeacherNotificationsComponent implements OnInit {
  protected authService = inject(AuthService);
  protected notificationService = inject(NotificationService);
  private router = inject(Router);

  // State
  filter = signal<'all' | 'unread' | 'today'>('all');

  // Computed properties from service
  isLoading = computed(() => this.notificationService.isLoading());
  notifications = computed(() => this.notificationService.notifications());
  totalNotifications = computed(() => this.notifications().length);
  unreadNotifications = computed(() => this.notificationService.unreadCount());
  urgentNotifications = computed(() => this.notificationService.urgentNotifications());
  newNotifications = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.notifications().filter(n => n.timestamp >= today).length;
  });
  todayNotifications = computed(() => this.notificationService.todayNotifications().length);
  weekNotifications = computed(() => this.notificationService.weekNotifications().length);

  filteredNotifications = computed(() => {
    const notifications = this.notifications();
    const currentFilter = this.filter();
    
    switch (currentFilter) {
      case 'unread':
        return notifications.filter(n => !n.isRead);
      case 'today':
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return notifications.filter(n => n.timestamp >= today);
      default:
        return notifications;
    }
  });

  ngOnInit(): void {
    this.loadNotifications();
  }

  async loadNotifications(): Promise<void> {
    await this.notificationService.getNotifications();
  }

  setFilter(filter: 'all' | 'unread' | 'today'): void {
    this.filter.set(filter);
  }

  async markAsRead(notificationId: string): Promise<void> {
    await this.notificationService.markAsRead(notificationId);
  }

  async markAllAsRead(): Promise<void> {
    await this.notificationService.markAllAsRead();
  }

  async deleteNotification(notificationId: string): Promise<void> {
    await this.notificationService.deleteNotification(notificationId);
  }

  handleNotificationAction(notification: Notification): void {
    if (notification.actionUrl) {
      // Navigate to notification action URL
      this.router.navigate([notification.actionUrl]);
    }
  }

  async refreshNotifications(): Promise<void> {
    await this.loadNotifications();
  }

  getNotificationIconClass(type: string): string {
    switch (type) {
      case 'info':
        return 'bg-blue-100 text-blue-600';
      case 'warning':
        return 'bg-yellow-100 text-yellow-600';
      case 'success':
        return 'bg-green-100 text-green-600';
      case 'error':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  }

  getNotificationIconPath(type: string): string {
    switch (type) {
      case 'info':
        return 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z';
      case 'warning':
        return 'M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z';
      case 'success':
        return 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z';
      case 'error':
        return 'M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z';
      default:
        return 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z';
    }
  }

  formatTimestamp(timestamp: Date): string {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Vừa xong';
    if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} ngày trước`;
    
    return timestamp.toLocaleDateString('vi-VN');
  }

  getCategoryText(category: string): string {
    switch (category) {
      case 'assignment':
        return 'Bài tập';
      case 'course':
        return 'Khóa học';
      case 'student':
        return 'Học viên';
      case 'system':
        return 'Hệ thống';
      case 'announcement':
        return 'Thông báo';
      default:
        return 'Khác';
    }
  }
}