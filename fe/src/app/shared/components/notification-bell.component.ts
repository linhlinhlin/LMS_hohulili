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
  templateUrl: './notification-bell.component.html',
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
