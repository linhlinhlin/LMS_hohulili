import { Injectable, signal, computed, inject } from '@angular/core';
import { ApiClient } from '../../../../api/client/api-client';
import { Notification } from '../../types/teacher.types';

/**
 * Notification Service - Manages teacher notifications
 * Follows signal-based state management pattern
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiClient = inject(ApiClient);

  // Core signals for state management
  private _notifications = signal<Notification[]>([]);
  private _isLoading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Computed signals for external consumption
  readonly notifications = computed(() => this._notifications());
  readonly isLoading = computed(() => this._isLoading());
  readonly error = computed(() => this._error());

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

  constructor() {
    // Initialize with mock data for development
    this.initializeMockData();
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

  // API Methods (to be implemented with real backend)
  async getNotifications(): Promise<Notification[]> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // TODO: Replace with real API call
      // const response = await this.apiClient.get<Notification[]>('/api/v1/teacher/notifications');
      // this._notifications.set(response);
      await this.simulateApiCall();
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
      // TODO: Replace with real API call
      // await this.apiClient.put(`/api/v1/teacher/notifications/${notificationId}/read`, {});
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
      // TODO: Replace with real API call
      // await this.apiClient.put('/api/v1/teacher/notifications/mark-all-read', {});
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
      // TODO: Replace with real API call
      // await this.apiClient.delete(`/api/v1/teacher/notifications/${notificationId}`);
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