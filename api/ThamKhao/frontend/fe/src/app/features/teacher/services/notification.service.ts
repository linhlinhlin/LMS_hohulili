import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, interval } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  timestamp: Date;
  isRead: boolean;
  actionUrl?: string;
  actionText?: string;
  category: 'assignment' | 'course' | 'student' | 'system' | 'announcement';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: Record<string, any>;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  assignmentNotifications: boolean;
  courseNotifications: boolean;
  studentNotifications: boolean;
  systemNotifications: boolean;
  announcementNotifications: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);

  // API Configuration
  private readonly API_BASE_URL = 'https://api.lms-maritime.com/v1';
  private readonly ENDPOINTS = {
    notifications: '/teacher/notifications',
    preferences: '/teacher/notification-preferences',
    markRead: '/teacher/notifications/mark-read',
    markAllRead: '/teacher/notifications/mark-all-read'
  };

  // Signals for reactive state management
  private _notifications = signal<Notification[]>([]);
  private _preferences = signal<NotificationPreferences>({
    emailNotifications: true,
    pushNotifications: true,
    assignmentNotifications: true,
    courseNotifications: true,
    studentNotifications: true,
    systemNotifications: true,
    announcementNotifications: true
  });
  private _isLoading = signal<boolean>(false);
  private _lastChecked = signal<Date>(new Date());

  // Readonly signals for external consumption
  readonly notifications = this._notifications.asReadonly();
  readonly preferences = this._preferences.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly lastChecked = this._lastChecked.asReadonly();

  // Computed signals
  readonly unreadCount = computed(() => 
    this._notifications().filter(n => !n.isRead).length
  );

  readonly urgentNotifications = computed(() => 
    this._notifications().filter(n => n.priority === 'urgent' && !n.isRead)
  );

  readonly todayNotifications = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this._notifications().filter(n => n.timestamp >= today);
  });

  readonly weekNotifications = computed(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return this._notifications().filter(n => n.timestamp >= weekAgo);
  });

  readonly notificationsByCategory = computed(() => {
    const notifications = this._notifications();
    return {
      assignment: notifications.filter(n => n.category === 'assignment'),
      course: notifications.filter(n => n.category === 'course'),
      student: notifications.filter(n => n.category === 'student'),
      system: notifications.filter(n => n.category === 'system'),
      announcement: notifications.filter(n => n.category === 'announcement')
    };
  });

  constructor() {
    this.loadMockData();
    this.startAutoRefresh();
  }

  // Notification Management Methods
  async getNotifications(): Promise<Notification[]> {
    this._isLoading.set(true);
    try {
      // Try real API first, fallback to mock data
      const notifications = await this.fetchNotificationsFromAPI();
      this._notifications.set(notifications);
      this._lastChecked.set(new Date());
      return notifications;
    } catch (error) {
      console.warn('API unavailable, using mock data:', error);
      return this._notifications();
    } finally {
      this._isLoading.set(false);
    }
  }

  private async fetchNotificationsFromAPI(): Promise<Notification[]> {
    // For now, simulate API call with mock data
    // In production, this would be a real HTTP call
    await this.simulateApiCall();
    return this.loadMockNotifications();
  }

  async markAsRead(notificationId: string): Promise<void> {
    this._isLoading.set(true);
    try {
      await this.simulateApiCall();
      
      this._notifications.update(notifications =>
        notifications.map(notification =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
    } finally {
      this._isLoading.set(false);
    }
  }

  async markAllAsRead(): Promise<void> {
    this._isLoading.set(true);
    try {
      await this.simulateApiCall();
      
      this._notifications.update(notifications =>
        notifications.map(notification => ({ ...notification, isRead: true }))
      );
    } finally {
      this._isLoading.set(false);
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    this._isLoading.set(true);
    try {
      await this.simulateApiCall();
      
      this._notifications.update(notifications =>
        notifications.filter(notification => notification.id !== notificationId)
      );
    } finally {
      this._isLoading.set(false);
    }
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
      type: 'info',
      category: 'assignment',
      priority: 'medium',
      actionUrl: `/teacher/assignments/${assignmentId}/submissions`,
      actionText: 'Xem bài nộp',
      metadata: { assignmentId, studentName, courseTitle }
    });
  }

  notifyAssignmentDeadline(assignmentId: string, assignmentTitle: string, hoursLeft: number): void {
    this.createNotification({
      title: 'Cảnh báo hạn nộp bài',
      message: `Bài tập "${assignmentTitle}" sẽ hết hạn trong ${hoursLeft} giờ`,
      type: 'warning',
      category: 'assignment',
      priority: hoursLeft <= 24 ? 'urgent' : 'high',
      actionUrl: `/teacher/assignments/${assignmentId}`,
      actionText: 'Xem chi tiết',
      metadata: { assignmentId, assignmentTitle, hoursLeft }
    });
  }

  // Course-related notifications
  notifyCourseCreated(courseId: string, courseTitle: string): void {
    this.createNotification({
      title: 'Khóa học mới được tạo',
      message: `Khóa học "${courseTitle}" đã được tạo thành công và sẵn sàng để xuất bản`,
      type: 'success',
      category: 'course',
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
      type: 'success',
      category: 'course',
      priority: 'low',
      actionUrl: `/teacher/courses/${courseId}`,
      actionText: 'Xem chi tiết',
      metadata: { courseId, courseTitle, rating, studentName }
    });
  }

  // Student-related notifications
  notifyStudentEnrolled(studentId: string, studentName: string, courseTitle: string): void {
    this.createNotification({
      title: 'Học viên mới đăng ký',
      message: `${studentName} đã đăng ký khóa học "${courseTitle}"`,
      type: 'info',
      category: 'student',
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
        type: 'success',
        category: 'student',
        priority: 'medium',
        actionUrl: `/teacher/students/${studentId}`,
        actionText: 'Xem hồ sơ',
        metadata: { studentId, studentName, courseTitle, progress }
      });
    }
  }

  // System notifications
  notifySystemMaintenance(scheduledTime: Date): void {
    this.createNotification({
      title: 'Bảo trì hệ thống',
      message: `Hệ thống sẽ được bảo trì vào ${scheduledTime.toLocaleString('vi-VN')}`,
      type: 'warning',
      category: 'system',
      priority: 'high',
      metadata: { scheduledTime }
    });
  }

  notifySystemUpdate(version: string): void {
    this.createNotification({
      title: 'Cập nhật hệ thống',
      message: `Hệ thống đã được cập nhật lên phiên bản ${version}`,
      type: 'info',
      category: 'system',
      priority: 'low',
      metadata: { version }
    });
  }

  // Announcement notifications
  notifyAnnouncement(title: string, message: string, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'): void {
    this.createNotification({
      title: `Thông báo: ${title}`,
      message,
      type: 'info',
      category: 'announcement',
      priority,
      metadata: { title, message }
    });
  }

  // Preferences Management
  async getPreferences(): Promise<NotificationPreferences> {
    try {
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
  private async simulateApiCall(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  private generateId(): string {
    return 'notif_' + Math.random().toString(36).substr(2, 9);
  }

  private loadMockData(): void {
    this.loadMockNotifications();
  }

  private loadMockNotifications(): Notification[] {
    const mockNotifications: Notification[] = [
      {
        id: 'notif_1',
        title: 'Bài tập mới được nộp',
        message: 'Học viên Nguyễn Văn A đã nộp bài tập "Phân tích cấu trúc tàu" trong khóa học "Kỹ thuật Tàu biển Cơ bản"',
        type: 'info',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        isRead: false,
        category: 'assignment',
        priority: 'medium',
        actionUrl: '/teacher/assignments/assignment_1/submissions',
        actionText: 'Xem bài nộp',
        metadata: { assignmentId: 'assignment_1', studentName: 'Nguyễn Văn A', courseTitle: 'Kỹ thuật Tàu biển Cơ bản' }
      },
      {
        id: 'notif_2',
        title: 'Khóa học mới được tạo',
        message: 'Khóa học "An toàn Hàng hải" đã được tạo thành công và sẵn sàng để xuất bản',
        type: 'success',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        isRead: true,
        category: 'course',
        priority: 'medium',
        actionUrl: '/teacher/courses/course_2/edit',
        actionText: 'Chỉnh sửa',
        metadata: { courseId: 'course_2', courseTitle: 'An toàn Hàng hải' }
      },
      {
        id: 'notif_3',
        title: 'Học viên mới đăng ký',
        message: 'Trần Thị B đã đăng ký khóa học "Kỹ thuật Tàu biển Cơ bản"',
        type: 'info',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
        isRead: false,
        category: 'student',
        priority: 'medium',
        actionUrl: '/teacher/students/student_2',
        actionText: 'Xem hồ sơ',
        metadata: { studentId: 'student_2', studentName: 'Trần Thị B', courseTitle: 'Kỹ thuật Tàu biển Cơ bản' }
      },
      {
        id: 'notif_4',
        title: 'Cảnh báo hạn nộp bài',
        message: 'Bài tập "Quiz An toàn Hàng hải" sẽ hết hạn trong 24 giờ. Hiện tại có 5 học viên chưa nộp bài',
        type: 'warning',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
        isRead: false,
        category: 'assignment',
        priority: 'urgent',
        actionUrl: '/teacher/assignments/assignment_2',
        actionText: 'Xem chi tiết',
        metadata: { assignmentId: 'assignment_2', assignmentTitle: 'Quiz An toàn Hàng hải', hoursLeft: 24 }
      },
      {
        id: 'notif_5',
        title: 'Đánh giá khóa học',
        message: 'Khóa học "Kỹ thuật Tàu biển Cơ bản" đã nhận được đánh giá 5 sao từ học viên Lê Văn C',
        type: 'success',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
        isRead: true,
        category: 'course',
        priority: 'low',
        metadata: { courseId: 'course_1', courseTitle: 'Kỹ thuật Tàu biển Cơ bản', rating: 5, studentName: 'Lê Văn C' }
      },
      {
        id: 'notif_6',
        title: 'Thông báo: Cập nhật hệ thống',
        message: 'Hệ thống LMS Maritime đã được cập nhật với nhiều tính năng mới. Vui lòng làm mới trang để trải nghiệm tốt nhất.',
        type: 'info',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        isRead: false,
        category: 'announcement',
        priority: 'medium',
        metadata: { title: 'Cập nhật hệ thống', message: 'Hệ thống LMS Maritime đã được cập nhật với nhiều tính năng mới.' }
      }
    ];

    this._notifications.set(mockNotifications);
    return mockNotifications;
  }
}