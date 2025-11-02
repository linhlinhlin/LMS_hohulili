import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AssignmentNotificationService, AssignmentNotification } from '../../application/services/assignment-notification.service';

@Component({
  selector: 'app-assignment-notifications',
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg border border-gray-200 shadow-sm">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM4.868 12.683A17.925 17.925 0 0112 21c7.962 0 12-1.21 12-2.683m-12 2.683a17.925 17.925 0 01-7.132-8.317M12 21c4.411 0 8-4.03 8-9s-3.589-9-8-9-8 4.03-8 9a9.06 9.06 0 001.832 5.445L4 21l7.868-2.317z"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Thông báo bài tập</h3>
              <p class="text-sm text-gray-600">
                @if (unreadCount() > 0) {
                  {{ unreadCount() }} thông báo chưa đọc
                } @else {
                  Không có thông báo mới
                }
              </p>
            </div>
          </div>

          <div class="flex items-center space-x-2">
            @if (unreadCount() > 0) {
              <button (click)="markAllAsRead()"
                      class="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded">
                Đánh dấu tất cả đã đọc
              </button>
            }
            <button (click)="toggleExpanded()"
                    class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
              <svg class="w-5 h-5 transition-transform" [class.rotate-180]="isExpanded()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Notifications List -->
      @if (isExpanded()) {
        <div class="max-h-96 overflow-y-auto">
          @if (notifications().length === 0) {
            <div class="px-6 py-8 text-center text-gray-500">
              <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM4.868 12.683A17.925 17.925 0 0112 21c7.962 0 12-1.21 12-2.683m-12 2.683a17.925 17.925 0 01-7.132-8.317M12 21c4.411 0 8-4.03 8-9s-3.589-9-8-9-8 4.03-8 9a9.06 9.06 0 001.832 5.445L4 21l7.868-2.317z"></path>
              </svg>
              <p class="mt-2 text-sm">Chưa có thông báo nào</p>
            </div>
          } @else {
            <div class="divide-y divide-gray-200">
              @for (notification of notifications(); track notification.id) {
                <div class="px-6 py-4 hover:bg-gray-50 transition-colors"
                     [class.bg-blue-50]="!notification.read">
                  <div class="flex items-start space-x-3">
                    <!-- Notification Icon -->
                    <div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                         [class]="getNotificationIconClass(notification)">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="getNotificationIcon(notification)"></path>
                      </svg>
                    </div>

                    <!-- Notification Content -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-start justify-between">
                        <div class="flex-1">
                          <p class="text-sm font-medium text-gray-900"
                             [class.font-semibold]="!notification.read">
                            {{ notification.assignmentTitle }}
                          </p>
                          <p class="text-sm text-gray-600 mt-1">
                            {{ notification.message }}
                          </p>
                          <div class="flex items-center space-x-2 mt-2">
                            <span class="text-xs text-gray-500">{{ notification.courseName }}</span>
                            <span class="text-xs px-2 py-1 rounded-full"
                                  [class]="getPriorityClass(notification.priority)">
                              {{ getPriorityText(notification.priority) }}
                            </span>
                            <span class="text-xs text-gray-400">
                              {{ formatTimeAgo(notification.timestamp) }}
                            </span>
                          </div>
                        </div>

                        <!-- Actions -->
                        <div class="flex items-center space-x-2 ml-4">
                          @if (notification.actionUrl && notification.actionLabel) {
                            <button (click)="handleAction(notification)"
                                    class="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100">
                              {{ notification.actionLabel }}
                            </button>
                          }

                          @if (!notification.read) {
                            <button (click)="markAsRead(notification.id)"
                                    class="p-1 text-gray-400 hover:text-blue-600 rounded">
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                              </svg>
                            </button>
                          }

                          <button (click)="deleteNotification(notification.id)"
                                  class="p-1 text-gray-400 hover:text-red-600 rounded">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- Footer -->
        @if (notifications().length > 0) {
          <div class="px-6 py-3 bg-gray-50 border-t border-gray-200">
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-600">
                Hiển thị {{ notifications().length }} thông báo
              </span>
              <button (click)="clearAllNotifications()"
                      class="text-red-600 hover:text-red-800 font-medium">
                Xóa tất cả
              </button>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .rotate-180 {
      transform: rotate(180deg);
    }
  `]
})
export class AssignmentNotificationsComponent implements OnInit {
  private notificationService = inject(AssignmentNotificationService);
  private router = inject(Router);

  private isExpandedSignal = signal<boolean>(true);

  // Component state
  isExpanded = this.isExpandedSignal.asReadonly();
  notifications = this.notificationService.assignmentNotifications;
  unreadCount = this.notificationService.unreadCount;

  ngOnInit(): void {
    // Component initialization if needed
  }

  toggleExpanded(): void {
    this.isExpandedSignal.update(expanded => !expanded);
  }

  markAsRead(notificationId: string): void {
    this.notificationService.markAsRead(notificationId);
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  deleteNotification(notificationId: string): void {
    this.notificationService.deleteNotification(notificationId);
  }

  clearAllNotifications(): void {
    if (confirm('Bạn có chắc muốn xóa tất cả thông báo?')) {
      // Clear all notifications
      this.notificationService.clearExpiredNotifications();
      // In a real implementation, this would clear from the service
    }
  }

  handleAction(notification: AssignmentNotification): void {
    if (notification.actionUrl) {
      this.router.navigate([notification.actionUrl]);
      this.markAsRead(notification.id);
    }
  }

  getNotificationIconClass(notification: AssignmentNotification): string {
    switch (notification.type) {
      case 'deadline_approaching':
      case 'deadline_passed':
        return 'bg-red-100 text-red-600';
      case 'graded':
        return 'bg-green-100 text-green-600';
      case 'feedback_received':
        return 'bg-blue-100 text-blue-600';
      case 'assignment_created':
        return 'bg-purple-100 text-purple-600';
      case 'assignment_updated':
        return 'bg-yellow-100 text-yellow-600';
      case 'submission_reminder':
        return 'bg-orange-100 text-orange-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  }

  getNotificationIcon(notification: AssignmentNotification): string {
    switch (notification.type) {
      case 'deadline_approaching':
        return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z';
      case 'deadline_passed':
        return 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'graded':
        return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'feedback_received':
        return 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z';
      case 'assignment_created':
        return 'M12 6v6m0 0v6m0-6h6m-6 0H6';
      case 'assignment_updated':
        return 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z';
      case 'submission_reminder':
        return 'M15 17h5l-5 5v-5zM4.868 12.683A17.925 17.925 0 0112 21c7.962 0 12-1.21 12-2.683m-12 2.683a17.925 17.925 0 01-7.132-8.317M12 21c4.411 0 8-4.03 8-9s-3.589-9-8-9-8 4.03-8 9a9.06 9.06 0 001.832 5.445L4 21l7.868-2.317z';
      default:
        return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getPriorityText(priority: string): string {
    switch (priority) {
      case 'urgent':
        return 'Khẩn cấp';
      case 'high':
        return 'Cao';
      case 'medium':
        return 'Trung bình';
      case 'low':
        return 'Thấp';
      default:
        return 'Không xác định';
    }
  }

  formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;

    return date.toLocaleDateString('vi-VN');
  }
}