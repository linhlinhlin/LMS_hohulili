import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from '../../../../shared/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';

export interface AssignmentNotification {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  courseName: string;
  type: 'deadline_approaching' | 'deadline_passed' | 'graded' | 'feedback_received' | 'assignment_created' | 'assignment_updated' | 'submission_reminder';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  timestamp: Date;
  read: boolean;
  expiresAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AssignmentNotificationService {
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private router = inject(Router);

  private _assignmentNotifications = signal<AssignmentNotification[]>([]);
  private _notificationSettings = signal({
    deadlineReminders: true,
    gradeNotifications: true,
    assignmentUpdates: true,
    reminderHours: [24, 6, 1] // Hours before deadline to remind
  });

  // Computed signals
  readonly assignmentNotifications = this._assignmentNotifications.asReadonly();
  readonly unreadCount = computed(() =>
    this._assignmentNotifications().filter(n => !n.read).length
  );

  readonly urgentNotifications = computed(() =>
    this._assignmentNotifications().filter(n => n.priority === 'urgent' && !n.read)
  );

  readonly upcomingDeadlines = computed(() =>
    this._assignmentNotifications().filter(n =>
      n.type === 'deadline_approaching' &&
      n.expiresAt &&
      n.expiresAt > new Date() &&
      !n.read
    )
  );

  constructor() {
    this.initializeNotifications();
    this.setupDeadlineMonitoring();
  }

  // ========================================
  // NOTIFICATION MANAGEMENT
  // ========================================

  notifyDeadlineApproaching(assignmentId: string, assignmentTitle: string, courseName: string, hoursLeft: number): void {
    if (!this._notificationSettings().deadlineReminders) return;

    const priority = hoursLeft <= 1 ? 'urgent' : hoursLeft <= 6 ? 'high' : 'medium';
    const message = hoursLeft === 1
      ? `Bài tập "${assignmentTitle}" sẽ hết hạn trong 1 giờ!`
      : `Bài tập "${assignmentTitle}" sẽ hết hạn trong ${hoursLeft} giờ.`;

    const notification: AssignmentNotification = {
      id: this.generateId(),
      assignmentId,
      assignmentTitle,
      courseName,
      type: 'deadline_approaching',
      priority,
      message,
      actionUrl: `/student/assignments/${assignmentId}/work`,
      actionLabel: 'Làm bài ngay',
      timestamp: new Date(),
      read: false,
      expiresAt: new Date(Date.now() + hoursLeft * 60 * 60 * 1000)
    };

    this.addNotification(notification);

    // Also show in global notification system
    this.notificationService.warning(
      `⚠️ Hạn nộp bài tập sắp đến`,
      message,
      {
        action: {
          label: 'Làm bài ngay',
          callback: () => this.router.navigate(['/student/assignments', assignmentId, 'work'])
        },
        duration: priority === 'urgent' ? 0 : 10000
      }
    );
  }

  notifyDeadlinePassed(assignmentId: string, assignmentTitle: string, courseName: string): void {
    const notification: AssignmentNotification = {
      id: this.generateId(),
      assignmentId,
      assignmentTitle,
      courseName,
      type: 'deadline_passed',
      priority: 'urgent',
      message: `Bài tập "${assignmentTitle}" đã quá hạn nộp!`,
      actionUrl: `/student/assignments/${assignmentId}/work`,
      actionLabel: 'Nộp bài muộn',
      timestamp: new Date(),
      read: false
    };

    this.addNotification(notification);

    this.notificationService.error(
      `⏰ Bài tập đã quá hạn`,
      `Bài tập "${assignmentTitle}" đã quá thời hạn nộp.`,
      {
        action: {
          label: 'Nộp bài muộn',
          callback: () => this.router.navigate(['/student/assignments', assignmentId, 'work'])
        }
      }
    );
  }

  notifyGraded(assignmentId: string, assignmentTitle: string, courseName: string, score: number, maxScore: number): void {
    if (!this._notificationSettings().gradeNotifications) return;

    const percentage = Math.round((score / maxScore) * 100);
    const message = `Bài tập "${assignmentTitle}" đã được chấm điểm: ${score}/${maxScore} (${percentage}%)`;

    const notification: AssignmentNotification = {
      id: this.generateId(),
      assignmentId,
      assignmentTitle,
      courseName,
      type: 'graded',
      priority: 'high',
      message,
      actionUrl: `/student/assignments/${assignmentId}/work`,
      actionLabel: 'Xem điểm',
      timestamp: new Date(),
      read: false
    };

    this.addNotification(notification);

    this.notificationService.success(
      `🎉 Bài tập đã được chấm điểm`,
      message,
      {
        action: {
          label: 'Xem chi tiết',
          callback: () => this.router.navigate(['/student/assignments', assignmentId, 'work'])
        }
      }
    );
  }

  notifyFeedbackReceived(assignmentId: string, assignmentTitle: string, courseName: string, instructorName: string): void {
    if (!this._notificationSettings().gradeNotifications) return;

    const message = `Giảng viên ${instructorName} đã gửi nhận xét cho bài tập "${assignmentTitle}"`;

    const notification: AssignmentNotification = {
      id: this.generateId(),
      assignmentId,
      assignmentTitle,
      courseName,
      type: 'feedback_received',
      priority: 'medium',
      message,
      actionUrl: `/student/assignments/${assignmentId}/work`,
      actionLabel: 'Xem nhận xét',
      timestamp: new Date(),
      read: false
    };

    this.addNotification(notification);

    this.notificationService.info(
      `💬 Nhận xét từ giảng viên`,
      message,
      {
        action: {
          label: 'Xem nhận xét',
          callback: () => this.router.navigate(['/student/assignments', assignmentId, 'work'])
        }
      }
    );
  }

  notifyAssignmentCreated(assignmentId: string, assignmentTitle: string, courseName: string, dueDate: Date): void {
    if (!this._notificationSettings().assignmentUpdates) return;

    const message = `Bài tập mới: "${assignmentTitle}" - Hạn nộp: ${this.formatDate(dueDate)}`;

    const notification: AssignmentNotification = {
      id: this.generateId(),
      assignmentId,
      assignmentTitle,
      courseName,
      type: 'assignment_created',
      priority: 'medium',
      message,
      actionUrl: `/student/assignments/${assignmentId}/work`,
      actionLabel: 'Bắt đầu làm',
      timestamp: new Date(),
      read: false
    };

    this.addNotification(notification);

    this.notificationService.info(
      `📝 Bài tập mới`,
      message,
      {
        action: {
          label: 'Bắt đầu làm',
          callback: () => this.router.navigate(['/student/assignments', assignmentId, 'work'])
        },
        duration: 8000
      }
    );
  }

  notifyAssignmentUpdated(assignmentId: string, assignmentTitle: string, courseName: string, changes: string[]): void {
    if (!this._notificationSettings().assignmentUpdates) return;

    const message = `Bài tập "${assignmentTitle}" đã được cập nhật: ${changes.join(', ')}`;

    const notification: AssignmentNotification = {
      id: this.generateId(),
      assignmentId,
      assignmentTitle,
      courseName,
      type: 'assignment_updated',
      priority: 'low',
      message,
      actionUrl: `/student/assignments/${assignmentId}/work`,
      actionLabel: 'Xem chi tiết',
      timestamp: new Date(),
      read: false
    };

    this.addNotification(notification);

    this.notificationService.info(
      `🔄 Bài tập được cập nhật`,
      message,
      {
        action: {
          label: 'Xem chi tiết',
          callback: () => this.router.navigate(['/student/assignments', assignmentId, 'work'])
        },
        duration: 6000
      }
    );
  }

  notifySubmissionReminder(assignmentId: string, assignmentTitle: string, courseName: string, daysLeft: number): void {
    if (!this._notificationSettings().deadlineReminders) return;

    const message = daysLeft === 1
      ? `Nhắc nhở: Bài tập "${assignmentTitle}" sẽ hết hạn vào ngày mai!`
      : `Nhắc nhở: Bài tập "${assignmentTitle}" sẽ hết hạn trong ${daysLeft} ngày.`;

    const notification: AssignmentNotification = {
      id: this.generateId(),
      assignmentId,
      assignmentTitle,
      courseName,
      type: 'submission_reminder',
      priority: daysLeft <= 1 ? 'high' : 'medium',
      message,
      actionUrl: `/student/assignments/${assignmentId}/work`,
      actionLabel: 'Làm bài ngay',
      timestamp: new Date(),
      read: false
    };

    this.addNotification(notification);

    this.notificationService.warning(
      `⏰ Nhắc nhở nộp bài`,
      message,
      {
        action: {
          label: 'Làm bài ngay',
          callback: () => this.router.navigate(['/student/assignments', assignmentId, 'work'])
        },
        duration: 8000
      }
    );
  }

  // ========================================
  // NOTIFICATION MANAGEMENT
  // ========================================

  markAsRead(notificationId: string): void {
    this._assignmentNotifications.update(notifications =>
      notifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  }

  markAllAsRead(): void {
    this._assignmentNotifications.update(notifications =>
      notifications.map(n => ({ ...n, read: true }))
    );
  }

  deleteNotification(notificationId: string): void {
    this._assignmentNotifications.update(notifications =>
      notifications.filter(n => n.id !== notificationId)
    );
  }

  clearExpiredNotifications(): void {
    const now = new Date();
    this._assignmentNotifications.update(notifications =>
      notifications.filter(n => !n.expiresAt || n.expiresAt > now)
    );
  }

  // ========================================
  // SETTINGS MANAGEMENT
  // ========================================

  updateSettings(settings: Partial<typeof this._notificationSettings>): void {
    this._notificationSettings.update(current => ({ ...current, ...settings }));
    // Persist to localStorage
    localStorage.setItem('assignment_notifications_settings', JSON.stringify(this._notificationSettings()));
  }

  getSettings() {
    return this._notificationSettings();
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  private addNotification(notification: AssignmentNotification): void {
    this._assignmentNotifications.update(notifications => [notification, ...notifications]);

    // Auto-cleanup expired notifications
    this.clearExpiredNotifications();
  }

  private initializeNotifications(): void {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('assignment_notifications_settings');
    if (savedSettings) {
      try {
        this._notificationSettings.set(JSON.parse(savedSettings));
      } catch (error) {
        console.error('Error loading notification settings:', error);
      }
    }

    // Load existing notifications from localStorage
    const savedNotifications = localStorage.getItem('assignment_notifications');
    if (savedNotifications) {
      try {
        const notifications = JSON.parse(savedNotifications).map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp),
          expiresAt: n.expiresAt ? new Date(n.expiresAt) : undefined
        }));
        this._assignmentNotifications.set(notifications);
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    }

    // Auto-save notifications
    effect(() => {
      const notifications = this._assignmentNotifications();
      localStorage.setItem('assignment_notifications', JSON.stringify(notifications));
    });
  }

  private setupDeadlineMonitoring(): void {
    // In a real app, this would connect to a WebSocket or Server-Sent Events
    // For demo purposes, we'll simulate deadline monitoring
    setInterval(() => {
      this.checkUpcomingDeadlines();
    }, 60000); // Check every minute
  }

  private checkUpcomingDeadlines(): void {
    // Mock deadline checking - in real app, this would come from backend
    const mockAssignments = [
      {
        id: 'assignment-1',
        title: 'Bài tập Kỹ thuật Tàu biển',
        courseName: 'Kỹ thuật Tàu biển Cơ bản',
        dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now
      },
      {
        id: 'assignment-2',
        title: 'Bài tập An toàn Hàng hải',
        courseName: 'An toàn Hàng hải',
        dueDate: new Date(Date.now() + 25 * 60 * 60 * 1000) // 25 hours from now
      }
    ];

    const now = new Date();
    mockAssignments.forEach(assignment => {
      const hoursLeft = Math.floor((assignment.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60));

      if (hoursLeft > 0 && this._notificationSettings().reminderHours.includes(hoursLeft)) {
        // Check if we already notified for this assignment and timeframe
        const existingNotification = this._assignmentNotifications().find(n =>
          n.assignmentId === assignment.id &&
          n.type === 'deadline_approaching' &&
          Math.abs(n.timestamp.getTime() - now.getTime()) < 60 * 60 * 1000 // Within last hour
        );

        if (!existingNotification) {
          this.notifyDeadlineApproaching(assignment.id, assignment.title, assignment.courseName, hoursLeft);
        }
      }
    });
  }

  private generateId(): string {
    return `assignment-notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}