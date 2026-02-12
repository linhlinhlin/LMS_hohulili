import { Injectable, signal, computed } from '@angular/core';
import { interval } from 'rxjs';
import { Notification, NotificationPreferences } from '../../types/teacher.types';

/**
 * Notification Service - Manages teacher notifications
 * Follows signal-based state management pattern
 * Enhanced with auto-refresh and notification creation methods
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  // Core signals for state management
  private _notifications = signal<Notification[]>([]);
  private _preferences = signal<NotificationPreferences>({
    emailNotifications: true,
    pushNotifications: true,
    assignmentReminders: true,
    courseUpdates: true,
    systemAnnouncements: true,
    gradeNotifications: true
  });
  private _isLoading = signal<boolean>(false);
  private _error = signal<string | null>(null);
  private _lastChecked = signal<Date>(new Date());

  // Computed signals for external consumption
  readonly notifications = computed(() => this._notifications());
  readonly preferences = computed(() => this._preferences());
  readonly isLoading = computed(() => this._isLoading());
  readonly error = computed(() => this._error());
  readonly lastChecked = computed(() => this._lastChecked());

  // Computed analytics
  readonly unreadCount = computed(() =>
    this._notifications().filter(n => !n.isRead).length
  );

  readonly urgentNotifications = computed(() =>
    this._notifications().filter(n => n.priority === 'urgent' && !n.isRead)
  );

  readonly todayNotifications = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.notifications().filter(n => n.timestamp >= today);
  });

  readonly weekNotifications = computed(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return this.notifications().filter(n => n.timestamp >= weekAgo);
  });

  readonly notificationsByCategory = computed(() => {
    const notifications = this._notifications();
    return {
      assignment: notifications.filter(n => n.type === 'assignment'),
      course: notifications.filter(n => n.type === 'course'),
      system: notifications.filter(n => n.type === 'system'),
      grade: notifications.filter(n => n.type === 'grade')
    };
  });

  constructor() {
    this.startAutoRefresh();
  }

  // API Methods
  getNotifications(): Notification[] {
    this._lastChecked.set(new Date());
    return this._notifications();
  }

  markAsRead(notificationId: string): void {
    this._notifications.update(notifications =>
      notifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification
      )
    );
  }

  markAllAsRead(): void {
    this._notifications.update(notifications =>
      notifications.map(notification => ({ ...notification, isRead: true }))
    );
  }

  deleteNotification(notificationId: string): void {
    this._notifications.update(notifications =>
      notifications.filter(notification => notification.id !== notificationId)
    );
  }

  // Business logic methods
  getNotificationById(notificationId: string): Notification | undefined {
    return this._notifications().find(notification => notification.id === notificationId);
  }

  getNotificationsByType(type: Notification['type']): Notification[] {
    return this._notifications().filter(notification => notification.type === type);
  }

  getUnreadNotifications(): Notification[] {
    return this._notifications().filter(notification => !notification.isRead);
  }

  getNotificationsByPriority(priority: Notification['priority']): Notification[] {
    return this._notifications().filter(notification => notification.priority === priority);
  }

  // Notification Creation Methods (for system-generated notifications)
  createNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>): Notification {
    const newNotification: Notification = {
      ...notification,
      id: this.generateId(),
      timestamp: new Date(),
      isRead: false
    };

    this._notifications.update(notifications => [newNotification, ...notifications]);
    return newNotification;
  }

  // Assignment-related notifications
  notifyAssignmentSubmitted(assignmentId: string, studentName: string, courseTitle: string): void {
    this.createNotification({
      title: 'Bài tập mới được nộp',
      message: `Học viên ${studentName} đã nộp bài tập trong khóa học "${courseTitle}"`,
      type: 'assignment',
      priority: 'medium',
      metadata: { assignmentId, studentName, courseTitle }
    });
  }

  notifyAssignmentDeadline(assignmentId: string, assignmentTitle: string, hoursLeft: number): void {
    this.createNotification({
      title: 'Cảnh báo hạn nộp bài',
      message: `Bài tập "${assignmentTitle}" sẽ hết hạn trong ${hoursLeft} giờ`,
      type: 'assignment',
      priority: hoursLeft <= 24 ? 'urgent' : 'high',
      actionUrl: `/teacher/assignments/${assignmentId}`,
      actionText: 'Xem chi tiết',
      metadata: { assignmentId, assignmentTitle, hoursLeft }
    });
  }

  notifyCourseCreated(courseId: string, courseTitle: string): void {
    this.createNotification({
      title: 'Khóa học mới được tạo',
      message: `Khóa học "${courseTitle}" đã được tạo thành công và sẵn sàng để xuất bản`,
      type: 'course',
      priority: 'medium',
      actionUrl: `/teacher/courses/${courseId}/edit`,
      actionText: 'Chỉnh sửa',
      metadata: { courseId, courseTitle }
    });
  }

  notifyCourseRating(courseId: string, courseTitle: string, rating: number, studentName: string): void {
    this.createNotification({
      title: 'Đánh giá khóa học',
      message: `Khóa học "${courseTitle}" đã nhận được đánh giá ${rating} sao từ học viên ${studentName}`,
      type: 'course',
      priority: 'low',
      actionUrl: `/teacher/courses/${courseId}`,
      actionText: 'Xem chi tiết',
      metadata: { courseId, courseTitle, rating, studentName }
    });
  }

  notifyStudentEnrolled(studentId: string, studentName: string, courseTitle: string): void {
    this.createNotification({
      title: 'Học viên mới đăng ký',
      message: `${studentName} đã đăng ký khóa học "${courseTitle}"`,
      type: 'course',
      priority: 'medium',
      actionUrl: `/teacher/students/${studentId}`,
      actionText: 'Xem hồ sơ',
      metadata: { studentId, studentName, courseTitle }
    });
  }

  notifyStudentProgress(studentId: string, studentName: string, courseTitle: string, progress: number): void {
    if (progress === 100) {
      this.createNotification({
        title: 'Học viên hoàn thành khóa học',
        message: `${studentName} đã hoàn thành khóa học "${courseTitle}"`,
        type: 'course',
        priority: 'medium',
        actionUrl: `/teacher/students/${studentId}`,
        actionText: 'Xem hồ sơ',
        metadata: { studentId, studentName, courseTitle, progress }
      });
    }
  }

  notifySystemMaintenance(scheduledTime: Date): void {
    this.createNotification({
      title: 'Bảo trì hệ thống',
      message: `Hệ thống sẽ được bảo trì vào ${scheduledTime.toLocaleString('vi-VN')}`,
      type: 'system',
      priority: 'high',
      metadata: { scheduledTime }
    });
  }

  notifySystemUpdate(version: string): void {
    this.createNotification({
      title: 'Cập nhật hệ thống',
      message: `Hệ thống đã được cập nhật lên phiên bản ${version}`,
      type: 'system',
      priority: 'low',
      metadata: { version }
    });
  }

  // Preferences Management (client-side until backend notification API is available)
  getPreferences(): NotificationPreferences {
    return this._preferences();
  }

  updatePreferences(preferences: Partial<NotificationPreferences>): void {
    this._preferences.update(current => ({ ...current, ...preferences }));
  }

  // Auto-refresh functionality
  private startAutoRefresh(): void {
    // Check for new notifications every 30 seconds
    interval(30000).subscribe(() => {
      this.getNotifications();
    });
  }

  // Helper methods
  private generateId(): string {
    return 'notif_' + Math.random().toString(36).substr(2, 9);
  }

  // Add new notification (for real-time updates)
  addNotification(notification: Omit<Notification, 'id' | 'timestamp'>): string {
    const id = Date.now().toString();
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date()
    };

    this._notifications.update(notifications => [newNotification, ...notifications]);
    return id;
  }

  // Clear all notifications
  clearAllNotifications(): void {
    this._notifications.set([]);
  }
}
