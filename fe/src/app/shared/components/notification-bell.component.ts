import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  Notification,
  NotificationService,
} from '../../core/services/notification.service';

@Component({
  selector: 'app-notification-bell',
  imports: [],
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
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef);
  private readonly subscription = new Subscription();

  readonly isOpen = signal(false);

  readonly unreadCount = this.notificationService.unreadCount;
  readonly isLoading = this.notificationService.isLoading;
  readonly hasError = this.notificationService.hasError;
  readonly errorMessage = this.notificationService.errorMessage;
  readonly recentNotifications = computed(() =>
    this.notificationService.getRecentNotifications(10)
  );
  readonly staleErrorMessage = computed(() => {
    const errorMessage = this.errorMessage();
    if (!errorMessage) {
      return null;
    }

    if (this.recentNotifications().length > 0) {
      return 'Khong the lam moi thong bao. Dang hien thi du lieu gan nhat.';
    }

    return errorMessage;
  });

  ngOnInit(): void {
    this.subscription.add(
      this.notificationService.onNewNotification.subscribe(() => {
        // Future enhancement: toast or subtle sound cue.
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  toggleDropdown(): void {
    this.isOpen.update((value) => !value);
  }

  onNotificationClick(notification: Notification): void {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe({
        error: () => {
          // Service rollback + error state already handled centrally.
        },
      });
    }

    if (notification.actionUrl) {
      this.router.navigateByUrl(notification.actionUrl);
    }

    this.isOpen.set(false);
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      error: () => {
        // Service rollback + error state already handled centrally.
      },
    });
  }

  refreshNotifications(): void {
    this.notificationService.loadNotifications().subscribe();
  }

  viewAllNotifications(): void {
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
      return 'Vua xong';
    }
    if (diffMins < 60) {
      return `${diffMins} phut truoc`;
    }
    if (diffHours < 24) {
      return `${diffHours} gio truoc`;
    }
    if (diffDays < 7) {
      return `${diffDays} ngay truoc`;
    }

    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}
