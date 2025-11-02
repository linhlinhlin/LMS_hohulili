import { Component, signal, computed, inject, OnInit, OnDestroy, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { LoadingComponent } from '../../shared/components/loading/loading.component';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'assignment' | 'course' | 'system';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'assignment' | 'course' | 'system' | 'social' | 'announcement';
  isRead: boolean;
  isArchived: boolean;
  createdAt: Date;
  expiresAt?: Date;
  actionUrl?: string;
  actionText?: string;
  metadata?: {
    courseId?: string;
    assignmentId?: string;
    userId?: string;
    [key: string]: any;
  };
  sender?: {
    id: string;
    name: string;
    avatar: string;
    role: 'student' | 'teacher' | 'admin';
  };
}

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  categories: {
    assignment: boolean;
    course: boolean;
    system: boolean;
    social: boolean;
    announcement: boolean;
  };
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

interface NotificationTemplate {
  id: string;
  name: string;
  description: string;
  type: Notification['type'];
  category: Notification['category'];
  template: string;
  variables: string[];
  isActive: boolean;
}

@Component({
  selector: 'app-advanced-notification-system',
  imports: [CommonModule, RouterModule, FormsModule, LoadingComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <!-- Loading State -->
    <app-loading 
      [show]="isLoading()" 
      text="Đang tải hệ thống thông báo..."
      subtext="Vui lòng chờ trong giây lát"
      variant="overlay"
      color="blue">
    </app-loading>

    <div class="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 min-h-screen">
      <div class="max-w-7xl mx-auto px-6 py-8">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 mb-2">🔔 Hệ thống thông báo</h1>
              <p class="text-gray-600">Quản lý và theo dõi tất cả thông báo trong hệ thống</p>
            </div>
            <div class="flex items-center space-x-4">
              <button (click)="markAllAsRead()"
                      class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <svg class="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
                Đánh dấu tất cả đã đọc
              </button>
              <button (click)="openSettings()"
                      class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                <svg class="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"></path>
                </svg>
                Cài đặt
              </button>
            </div>
          </div>
        </div>

        <!-- Stats Overview -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-red-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Chưa đọc</p>
                <p class="text-3xl font-bold text-gray-900">{{ unreadNotifications() }}</p>
                <p class="text-sm text-red-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                  </svg>
                  Cần xem
                </p>
              </div>
              <div class="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-green-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Đã đọc</p>
                <p class="text-3xl font-bold text-gray-900">{{ readNotifications() }}</p>
                <p class="text-sm text-green-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                  </svg>
                  Hoàn thành
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
                    <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"></path>
                  </svg>
                  Mới
                </p>
              </div>
              <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-purple-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Ưu tiên cao</p>
                <p class="text-3xl font-bold text-gray-900">{{ highPriorityNotifications() }}</p>
                <p class="text-sm text-purple-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                  </svg>
                  Quan trọng
                </p>
              </div>
              <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Filter and Search -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div class="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
              <div class="relative">
                <input type="text" 
                       [(ngModel)]="searchQuery"
                       placeholder="Tìm kiếm thông báo..."
                       class="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <svg class="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"></path>
                </svg>
              </div>
              
              <select [(ngModel)]="selectedType" 
                      class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Tất cả loại</option>
                <option value="assignment">Bài tập</option>
                <option value="course">Khóa học</option>
                <option value="system">Hệ thống</option>
                <option value="social">Xã hội</option>
                <option value="announcement">Thông báo</option>
              </select>
              
              <select [(ngModel)]="selectedPriority" 
                      class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Tất cả mức độ</option>
                <option value="urgent">Khẩn cấp</option>
                <option value="high">Cao</option>
                <option value="medium">Trung bình</option>
                <option value="low">Thấp</option>
              </select>
              
              <select [(ngModel)]="selectedStatus" 
                      class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Tất cả trạng thái</option>
                <option value="unread">Chưa đọc</option>
                <option value="read">Đã đọc</option>
                <option value="archived">Đã lưu trữ</option>
              </select>
            </div>
            
            <div class="flex items-center space-x-2">
              <button (click)="toggleSortOrder()"
                      class="px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h4.586l-1.293-1.293a1 1 0 011.414-1.414L10 15.414l2.293-2.293a1 1 0 111.414 1.414L12.414 15H17a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
              </button>
              <span class="text-sm text-gray-600">{{ filteredNotifications().length }} thông báo</span>
            </div>
          </div>
        </div>

        <!-- Notifications List -->
        <div class="bg-white rounded-xl shadow-lg">
          <div class="p-6 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-900">Danh sách thông báo</h3>
          </div>
          
          <div class="divide-y divide-gray-200">
            @for (notification of filteredNotifications(); track notification.id) {
              <div class="p-6 hover:bg-gray-50 transition-colors"
                   [class]="notification.isRead ? 'bg-gray-50' : 'bg-white'">
                <div class="flex items-start space-x-4">
                  <!-- Notification Icon -->
                  <div class="flex-shrink-0">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center"
                         [class]="getNotificationIconClass(notification.type)">
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path [attr.d]="getNotificationIconPath(notification.type)"></path>
                      </svg>
                    </div>
                  </div>
                  
                  <!-- Notification Content -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center space-x-2">
                        <h4 class="text-lg font-semibold text-gray-900">{{ notification.title }}</h4>
                        @if (!notification.isRead) {
                          <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                        }
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                              [class]="getPriorityClass(notification.priority)">
                          {{ getPriorityText(notification.priority) }}
                        </span>
                      </div>
                      
                      <div class="flex items-center space-x-2">
                        <span class="text-sm text-gray-500">{{ formatTime(notification.createdAt) }}</span>
                        <div class="flex items-center space-x-1">
                          <button (click)="toggleRead(notification)"
                                  class="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                            @if (notification.isRead) {
                              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                              </svg>
                            } @else {
                              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                              </svg>
                            }
                          </button>
                          <button (click)="archiveNotification(notification)"
                                  class="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path>
                            </svg>
                          </button>
                          <button (click)="deleteNotification(notification)"
                                  class="p-1 text-gray-400 hover:text-red-600 transition-colors">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <p class="text-gray-600 mt-2">{{ notification.message }}</p>
                    
                    @if (notification.sender) {
                      <div class="flex items-center space-x-2 mt-3">
                        <img [src]="notification.sender.avatar" [alt]="notification.sender.name" 
                             class="w-6 h-6 rounded-full">
                        <span class="text-sm text-gray-500">{{ notification.sender.name }}</span>
                        <span class="text-xs text-gray-400">{{ getRoleText(notification.sender.role) }}</span>
                      </div>
                    }
                    
                    @if (notification.actionUrl && notification.actionText) {
                      <div class="mt-3">
                        <button (click)="performAction(notification)"
                                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                          {{ notification.actionText }}
                        </button>
                      </div>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Empty State -->
        @if (filteredNotifications().length === 0) {
          <div class="text-center py-12">
            <svg class="w-24 h-24 text-gray-300 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"></path>
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Không có thông báo nào</h3>
            <p class="text-gray-500">Bạn đã xem tất cả thông báo</p>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdvancedNotificationSystemComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Signals
  isLoading = signal(false);
  notifications = signal<Notification[]>([]);
  searchQuery = signal('');
  selectedType = signal('');
  selectedPriority = signal('');
  selectedStatus = signal('');
  sortOrder = signal<'asc' | 'desc'>('desc');

  // Computed properties
  unreadNotifications = computed(() => 
    this.notifications().filter(n => !n.isRead).length
  );

  readNotifications = computed(() => 
    this.notifications().filter(n => n.isRead).length
  );

  todayNotifications = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.notifications().filter(n => n.createdAt >= today).length;
  });

  highPriorityNotifications = computed(() => 
    this.notifications().filter(n => n.priority === 'high' || n.priority === 'urgent').length
  );

  filteredNotifications = computed(() => {
    let filtered = this.notifications();
    
    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query)
      );
    }
    
    if (this.selectedType()) {
      filtered = filtered.filter(n => n.category === this.selectedType());
    }
    
    if (this.selectedPriority()) {
      filtered = filtered.filter(n => n.priority === this.selectedPriority());
    }
    
    if (this.selectedStatus()) {
      if (this.selectedStatus() === 'unread') {
        filtered = filtered.filter(n => !n.isRead);
      } else if (this.selectedStatus() === 'read') {
        filtered = filtered.filter(n => n.isRead);
      } else if (this.selectedStatus() === 'archived') {
        filtered = filtered.filter(n => n.isArchived);
      }
    }
    
    // Sort by creation date
    return filtered.sort((a, b) => {
      const comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return this.sortOrder() === 'asc' ? comparison : -comparison;
    });
  });

  ngOnInit(): void {
    this.loadNotifications();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  private loadNotifications(): void {
    this.isLoading.set(true);
    
    // Load mock data
    setTimeout(() => {
      this.notifications.set(this.generateMockNotifications());
      this.isLoading.set(false);
    }, 1000);
  }

  private generateMockNotifications(): Notification[] {
    return [
      {
        id: '1',
        title: 'Bài tập mới: Navigation Safety Quiz',
        message: 'Bạn có bài tập mới cần hoàn thành trong khóa học Navigation Safety. Hạn nộp: 25/12/2024',
        type: 'assignment',
        priority: 'high',
        category: 'assignment',
        isRead: false,
        isArchived: false,
        createdAt: new Date(),
        actionUrl: '/student/assignments/1',
        actionText: 'Xem bài tập',
        metadata: {
          assignmentId: '1',
          courseId: 'nav-safety'
        },
        sender: {
          id: 't1',
          name: 'Thầy Nguyễn Văn A',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
          role: 'teacher'
        }
      },
      {
        id: '2',
        title: 'Khóa học mới: Marine Engineering',
        message: 'Khóa học Marine Engineering đã được mở đăng ký. Hãy đăng ký ngay để không bỏ lỡ cơ hội học tập.',
        type: 'course',
        priority: 'medium',
        category: 'course',
        isRead: true,
        isArchived: false,
        createdAt: new Date(Date.now() - 86400000), // 1 day ago
        actionUrl: '/courses/marine-engineering',
        actionText: 'Đăng ký ngay',
        metadata: {
          courseId: 'marine-eng'
        }
      },
      {
        id: '3',
        title: 'Thông báo hệ thống: Bảo trì định kỳ',
        message: 'Hệ thống sẽ được bảo trì từ 2:00 - 4:00 ngày 20/12/2024. Vui lòng lưu công việc trước thời gian này.',
        type: 'system',
        priority: 'urgent',
        category: 'system',
        isRead: false,
        isArchived: false,
        createdAt: new Date(Date.now() - 3600000), // 1 hour ago
        expiresAt: new Date(Date.now() + 86400000) // expires in 1 day
      }
    ];
  }

  markAllAsRead(): void {
    this.notifications.update(notifications => 
      notifications.map(n => ({ ...n, isRead: true }))
    );
  }

  openSettings(): void {
    this.router.navigate(['/settings/notifications']);
  }

  toggleRead(notification: Notification): void {
    this.notifications.update(notifications => 
      notifications.map(n => 
        n.id === notification.id ? { ...n, isRead: !n.isRead } : n
      )
    );
  }

  archiveNotification(notification: Notification): void {
    this.notifications.update(notifications => 
      notifications.map(n => 
        n.id === notification.id ? { ...n, isArchived: true } : n
      )
    );
  }

  deleteNotification(notification: Notification): void {
    if (confirm(`Bạn có chắc chắn muốn xóa thông báo "${notification.title}"?`)) {
      this.notifications.update(notifications => 
        notifications.filter(n => n.id !== notification.id)
      );
    }
  }

  performAction(notification: Notification): void {
    if (notification.actionUrl) {
      this.router.navigate([notification.actionUrl]);
    }
  }

  toggleSortOrder(): void {
    this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
  }

  getNotificationIconClass(type: string): string {
    switch (type) {
      case 'assignment': return 'bg-orange-100 text-orange-600';
      case 'course': return 'bg-blue-100 text-blue-600';
      case 'system': return 'bg-gray-100 text-gray-600';
      case 'social': return 'bg-green-100 text-green-600';
      case 'announcement': return 'bg-purple-100 text-purple-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  }

  getNotificationIconPath(type: string): string {
    switch (type) {
      case 'assignment': return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'course': return 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253';
      case 'system': return 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z';
      case 'social': return 'M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z';
      case 'announcement': return 'M11 5.882V17.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z';
      default: return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getPriorityText(priority: string): string {
    switch (priority) {
      case 'urgent': return 'Khẩn cấp';
      case 'high': return 'Cao';
      case 'medium': return 'Trung bình';
      case 'low': return 'Thấp';
      default: return 'Không xác định';
    }
  }

  getRoleText(role: string): string {
    switch (role) {
      case 'teacher': return 'Giảng viên';
      case 'student': return 'Học viên';
      case 'admin': return 'Quản trị viên';
      default: return 'Người dùng';
    }
  }

  formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  }
}