import { Component, signal, computed, inject, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';

import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';

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
  imports: [RouterModule, FormsModule, LoadingComponent],
  templateUrl: './advanced-notification-system.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdvancedNotificationSystemComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private confirmDialog = inject(ConfirmDialogService);

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
    // No notification API exists yet — show empty state
    this.notifications.set([]);
    this.isLoading.set(false);
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

  async deleteNotification(notification: Notification): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa thông báo',
      message: `Bạn có chắc chắn muốn xóa thông báo "${notification.title}"?`,
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      variant: 'danger'
    });
    if (confirmed) {
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
      case 'course': return 'bg-[#0056D2]/10 text-[#0056D2]';
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

