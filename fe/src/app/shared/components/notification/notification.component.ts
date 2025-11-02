import { Component, signal, inject, computed, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationService, Notification } from '../../services/notification.service';

@Component({
  selector: 'app-notification',
  imports: [CommonModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="relative">
      <!-- Toast Notification Popup -->
      <ng-container *ngFor="let notification of notificationService.notifications()">
        <div class="fixed top-6 right-6 z-[9999] w-96 bg-white shadow-lg rounded-lg border border-gray-200 p-4 flex items-start space-x-3 animate-fade-in" *ngIf="notificationService.isVisible()">
          <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" [ngClass]="getNotificationIconClass(notification.type)">
            <!-- Icon logic as before -->
            <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="8" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-medium text-gray-900 truncate">{{ notification.title }}</h4>
              <button (click)="removeNotification(notification.id, $event)" class="ml-2 text-gray-400 hover:text-red-600" title="Đóng">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p class="text-sm text-gray-600 mt-1">{{ notification.message }}</p>
            <span class="text-xs text-gray-500">{{ formatTime(notification.timestamp) }}</span>
          </div>
        </div>
      </ng-container>
      <!-- Notification Bell -->
      <button 
        (click)="toggleDropdown()"
        class="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        
        <!-- Unread Badge -->
        @if (notificationService.unreadCount() > 0) {
          <span class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {{ notificationService.unreadCount() > 99 ? '99+' : notificationService.unreadCount() }}
          </span>
        }
      </button>

      <!-- Notification Dropdown -->
      @if (isDropdownOpen()) {
        <div class="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-800 z-50">
          <!-- Header -->
          <div class="p-4 border-b border-gray-800">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-gray-900">Thông báo</h3>
              <div class="flex items-center space-x-2">
                @if (notificationService.unreadCount() > 0) {
                  <button 
                    (click)="markAllAsRead()"
                    class="text-sm text-blue-600 hover:text-blue-800">
                    Đọc tất cả
                  </button>
                }
                <button 
                  (click)="openSettings()"
                  class="text-gray-400 hover:text-gray-600">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Notification List -->
          <div class="max-h-96 overflow-y-auto">
            @if (notificationService.notifications().length === 0) {
              <div class="p-8 text-center text-gray-500">
                <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p>Không có thông báo nào</p>
              </div>
            } @else {
              @for (notification of notificationService.notifications(); track notification.id) {
                <div 
                  class="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  [class.bg-blue-50]="!notification.read"
                  (click)="handleNotificationClick(notification)">
                  <div class="flex items-start space-x-3">
                    <!-- Icon -->
                    <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                         [class]="getNotificationIconClass(notification.type)">
                      @if (notification.type === 'success') {
                        <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                        </svg>
                      } @else if (notification.type === 'warning') {
                        <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                        </svg>
                      } @else if (notification.type === 'error') {
                        <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                        </svg>
                      } @else {
                        <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                        </svg>
                      }
                    </div>

                    <!-- Content -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between">
                        <h4 class="text-sm font-medium text-gray-900 truncate">{{ notification.title }}</h4>
                        <div class="flex items-center space-x-2">
                          @if (!notification.read) {
                            <div class="w-2 h-2 bg-blue-600 rounded-full"></div>
                          }
                          <span class="text-xs text-gray-500">{{ formatTime(notification.timestamp) }}</span>
                        </div>
                      </div>
                      <p class="text-sm text-gray-600 mt-1 line-clamp-2">{{ notification.message }}</p>
                      
                      @if (notification.action) {
                        <button 
                          (click)="handleActionClick(notification, $event)"
                          class="text-xs text-blue-600 hover:text-blue-800 mt-2">
                          {{ notification.action.label }}
                        </button>
                      }
                    </div>

                    <!-- Actions -->
                    <div class="flex items-center space-x-1">
                      @if (!notification.read) {
                        <button 
                          (click)="markAsRead(notification.id, $event)"
                          class="text-gray-400 hover:text-gray-600"
                          title="Đánh dấu đã đọc">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                        </button>
                      }
                      <button 
                        (click)="removeNotification(notification.id, $event)"
                        class="text-gray-400 hover:text-red-600"
                        title="Xóa thông báo">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              }
            }
          </div>

          <!-- Footer -->
          <div class="p-4 border-t border-gray-800">
            <button 
              (click)="viewAllNotifications()"
              class="w-full text-center text-sm text-blue-600 hover:text-blue-800">
              Xem tất cả thông báo
            </button>
          </div>
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
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationComponent {
  protected notificationService = inject(NotificationService);
  
  isDropdownOpen = signal(false);

  toggleDropdown(): void {
    this.isDropdownOpen.update(open => !open);
  }

  handleNotificationClick(notification: Notification): void {
    if (!notification.read) {
      this.markAsRead(notification.id);
    }
    
    if (notification.action) {
      notification.action.callback();
    }
  }

  handleActionClick(notification: Notification, event: Event): void {
    event.stopPropagation();
    
    if (notification.action) {
      notification.action.callback();
    }
  }

  markAsRead(notificationId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    
    this.notificationService.markAsRead(notificationId);
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  removeNotification(notificationId: string, event: Event): void {
    event.stopPropagation();
    this.notificationService.hide(notificationId);
  }

  openSettings(): void {
    // This would open notification settings modal
    console.log('Open notification settings');
  }

  viewAllNotifications(): void {
    // This would navigate to full notifications page
    console.log('View all notifications');
  }

  getNotificationIconClass(type: string): string {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  }

  formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    
    return new Intl.DateTimeFormat('vi-VN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }
}
