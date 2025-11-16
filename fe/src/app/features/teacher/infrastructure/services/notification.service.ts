import { Injectable, signal, computed, inject } from '@angular/core';
import { interval } from 'rxjs';
import { ApiClient } from '../../../../api/client/api-client';
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
  private apiClient = inject(ApiClient);

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
    // Initialize with mock data for development
    this.initializeMockData();
    // Start auto-refresh for notifications
    this.startAutoRefresh();
  }

  private initializeMockData(): void {
    // Mock notifications data
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'assignment',
        title: 'New Assignment Submission',
        message: 'Student Nguyễn Văn An submitted "Safety Procedures Quiz"',
        isRead: false,
        timestamp: new Date('2024-09-15T10:30:00'),
        priority: 'medium',
        actionUrl: '/teacher/assignments/1/submissions',
        metadata: { assignmentId: '1', studentId: '1' }
      },
      {
        id: '2',
        type: 'course',
        title: 'Course Enrollment',
        message: 'New student enrolled in "Maritime Safety Fundamentals"',
        isRead: false,
        timestamp: new Date('2024-09-15T09:15:00'),
        priority: 'low',
        actionUrl: '/teacher/students',
        metadata: { courseId: '1', studentId: '2' }
      },
      {
        id: '3',
        type: 'system',
        title: 'System Maintenance',
        message: 'Scheduled maintenance will occur tonight from 2-4 AM',
        isRead: true,
        timestamp: new Date('2024-09-14T16:00:00'),
        priority: 'high',
        metadata: { maintenanceStart: '2024-09-16T02:00:00' }
      },
      {
        id: '4',
        type: 'grade',
        title: 'Grade Review Request',
        message: 'Student Trần Thị Bình requested grade review for Quiz #2',
        isRead: false,
        timestamp: new Date('2024-09-14T14:20:00'),
        priority: 'medium',
        actionUrl: '/teacher/assignments/2/submissions',
        metadata: { assignmentId: '2', studentId: '2', reviewRequest: true }
      },
      {
        id: '5',
        type: 'assignment',
        title: 'Assignment Due Soon',
        message: 'Assignment "Navigation Project" is due in 2 days',
        isRead: false,
        timestamp: new Date('2024-09-13T08:00:00'),
        priority: 'urgent',
        actionUrl: '/teacher/assignments/2',
        metadata: { assignmentId: '2', dueDate: '2024-09-20' }
      }
    ];

    this._notifications.set(mockNotifications);
  }

  // API Methods
  async getNotifications(): Promise<Notification[]> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await this.simulateApiCall();
      this._lastChecked.set(new Date());
      return this._notifications();
    } catch (error) {
      this._error.set('Failed to load notifications');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await this.simulateApiCall();
      this._notifications.update(notifications =>
        notifications.map(notification =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
    } catch (error) {
      this._error.set('Failed to mark notification as read');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  async markAllAsRead(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await this.simulateApiCall();
      this._notifications.update(notifications =>
        notifications.map(notification => ({ ...notification, isRead: true }))
      );
    } catch (error) {
      this._error.set('Failed to mark all notifications as read');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await this.simulateApiCall();
      this._notifications.update(notifications =>
        notifications.filter(notification => notification.id !== notificationId)
      );
    } catch (error) {
      this._error.set('Failed to delete notification');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
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

  // Utility methods
  private async simulateApiCall(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
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

  // Preferences Management
  async getPreferences(): Promise<NotificationPreferences> {
    try {
      // TODO: Replace with real API call
      await this.simulateApiCall();
      return this._preferences();
    } catch (error) {
      console.warn('API unavailable, using default preferences:', error);
      return this._preferences();
    }
  }

  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<void> {
    this._isLoading.set(true);
    try {
      // TODO: Replace with real API call
      await this.simulateApiCall();
      
      this._preferences.update(current => ({ ...current, ...preferences }));
    } finally {
      this._isLoading.set(false);
    }
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