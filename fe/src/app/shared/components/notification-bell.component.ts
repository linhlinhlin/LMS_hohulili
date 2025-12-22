/**
 * Notification Bell Component
 *
 * Hiển thị icon chuông với badge số thông báo chưa đọc.
 * Features:
 * - Badge hiển thị số thông báo chưa đọc
 * - Dropdown danh sách thông báo gần đây
 * - Click để navigate đến trang liên quan
 * - Mark as read khi click
 * - Mark all as read
 *
 * @requirements 7.4, 7.5
 */
import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  HostListener,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  NotificationService,
  Notification,
  NotificationType,
} from '../../core/services/notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative">
      <!-- Bell Button -->
      <button
        (click)="toggleDropdown()"
        class="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        [class.text-blue-600]="isOpen()"
        aria-label="Thông báo"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          ></path>
        </svg>

        <!-- Badge -->
        @if (unreadCount() > 0) {
          <span
            class="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold text-white bg-red-500 rounded-full"
          >
            {{ unreadCount() > 99 ? '99+' : unreadCount() }}
          </span>
        }
      </button>

      <!-- Dropdown -->
      @if (isOpen()) {
        <div
          class="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50 overflow-hidden"
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <h3 class="font-semibold text-gray-900">Thông báo</h3>
            @if (unreadCount() > 0) {
              <button
                (click)="markAllAsRead()"
                class="text-sm text-blue-600 hover:text-blue-800"
              >
                Đánh dấu tất cả đã đọc
              </button>
            }
          </div>

          <!-- Notification List -->
          <div class="max-h-96 overflow-y-auto">
            @if (recentNotifications().length === 0) {
              <div class="px-4 py-8 text-center text-gray-500">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
                </svg>
                <p class="mt-2">Không có thông báo mới</p>
              </div>
            } @else {
              @for (notification of recentNotifications(); track notification.id) {
                <div
                  (click)="onNotificationClick(notification)"
                  class="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 transition-colors"
                  [class.bg-blue-50]="!notification.isRead"
                >
                  <div class="flex items-start gap-3">
                    <!-- Icon -->
                    <div
                      class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                      [class.bg-blue-100]="notification.type === 'ASSIGNMENT_NEW'"
                      [class.bg-orange-100]="notification.type === 'ASSIGNMENT_REMINDER'"
                      [class.bg-green-100]="notification.type === 'GRADE_PUBLISHED'"
                      [class.bg-purple-100]="notification.type === 'DEADLINE_EXTENDED'"
                      [class.bg-gray-100]="notification.type === 'SUBMISSION_RECEIVED'"
                      [class.bg-indigo-100]="notification.type === 'MESSAGE_RECEIVED'"
                    >
                      <svg
                        class="w-5 h-5"
                        [class.text-blue-600]="notification.type === 'ASSIGNMENT_NEW'"
                        [class.text-orange-600]="notification.type === 'ASSIGNMENT_REMINDER'"
                        [class.text-green-600]="notification.type === 'GRADE_PUBLISHED'"
                        [class.text-purple-600]="notification.type === 'DEADLINE_EXTENDED'"
                        [class.text-gray-600]="notification.type === 'SUBMISSION_RECEIVED'"
                        [class.text-indigo-600]="notification.type === 'MESSAGE_RECEIVED'"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        @switch (notification.type) {
                          @case ('ASSIGNMENT_NEW') {
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                          }
                          @case ('ASSIGNMENT_REMINDER') {
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          }
                          @case ('GRADE_PUBLISHED') {
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          }
                          @case ('DEADLINE_EXTENDED') {
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                          }
                          @case ('MESSAGE_RECEIVED') {
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                          }
                          @default {
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                          }
                        }
                      </svg>
                    </div>

                    <!-- Content -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <p class="text-sm font-medium text-gray-900 truncate">
                          {{ notification.title }}
                        </p>
                        @if (!notification.isRead) {
                          <span class="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></span>
                        }
                      </div>
                      <p class="text-sm text-gray-600 line-clamp-2">
                        {{ notification.message }}
                      </p>
                      <p class="text-xs text-gray-400 mt-1">
                        {{ formatTime(notification.createdAt) }}
                      </p>
                    </div>
                  </div>
                </div>
              }
            }
          </div>

          <!-- Footer -->
          @if (recentNotifications().length > 0) {
            <div class="px-4 py-3 border-t bg-gray-50 text-center">
              <button
                (click)="viewAllNotifications()"
                class="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Xem tất cả thông báo
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `],
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private elementRef = inject(ElementRef);
  private subscription = new Subscription();

  // State
  isOpen = signal(false);

  // Computed from service
  unreadCount = this.notificationService.unreadCount;
  recentNotifications = computed(() =>
    this.notificationService.getRecentNotifications(10)
  );

  ngOnInit(): void {
    // Subscribe to new notifications for real-time updates
    this.subscription.add(
      this.notificationService.onNewNotification.subscribe((notification) => {
        // Could show a toast or play a sound here
        console.log('New notification:', notification);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  toggleDropdown(): void {
    this.isOpen.update((v) => !v);
  }

  onNotificationClick(notification: Notification): void {
    // Mark as read
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe();
    }

    // Navigate to action URL
    if (notification.actionUrl) {
      this.router.navigateByUrl(notification.actionUrl);
    }

    // Close dropdown
    this.isOpen.set(false);
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe();
  }

  viewAllNotifications(): void {
    this.router.navigate(['/notifications']);
    this.isOpen.set(false);
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) {
      return 'Vừa xong';
    } else if (diffMins < 60) {
      return `${diffMins} phút trước`;
    } else if (diffHours < 24) {
      return `${diffHours} giờ trước`;
    } else if (diffDays < 7) {
      return `${diffDays} ngày trước`;
    } else {
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }
  }
}

