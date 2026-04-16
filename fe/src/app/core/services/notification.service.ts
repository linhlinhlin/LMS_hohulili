/**
 * Notification Service
 *
 * Quản lý thông báo cho học viên và giảng viên.
 * Features:
 * - Gửi thông báo khi có bài tập mới
 * - Gửi nhắc nhở deadline
 * - Gửi thông báo khi có điểm mới
 * - Đánh dấu đã đọc
 * - Real-time updates
 *
 * @requirements 7.1, 7.2, 7.3
 */
import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, of, delay, tap, interval, Subject, map, catchError, Subscription, throwError } from 'rxjs';
import { ApiClient } from '../../api/client/api-client';

export type NotificationType =
  | 'ASSIGNMENT_NEW'
  | 'ASSIGNMENT_REMINDER'
  | 'GRADE_PUBLISHED'
  | 'DEADLINE_EXTENDED'
  | 'FEEDBACK_RECEIVED'
  | 'SUBMISSION_RECEIVED'
  | 'MESSAGE_RECEIVED'
  | 'COURSE_APPROVED'
  | 'COURSE_REJECTED';

export type NotificationPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  recipientId: string;
  senderId?: string;
  senderName?: string;
  relatedEntityId?: string; // assignmentId, submissionId, etc.
  relatedEntityType?: 'ASSIGNMENT' | 'SUBMISSION' | 'COURSE';
  priority: NotificationPriority;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
  actionUrl?: string; // URL to navigate when clicked
  metadata?: Record<string, unknown>;
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
  assignmentNotifications: boolean;
  reminderNotifications: boolean;
  gradeNotifications: boolean;
  reminderDaysBefore: number[]; // e.g., [3, 1, 0] for D-3, D-1, D-0
}

export interface SendNotificationRequest {
  type: NotificationType;
  recipientIds: string[];
  title: string;
  message: string;
  relatedEntityId?: string;
  relatedEntityType?: 'ASSIGNMENT' | 'SUBMISSION' | 'COURSE';
  priority?: NotificationPriority;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private apiClient = inject(ApiClient);

  // State
  private notifications = signal<Notification[]>([]);
  private loading = signal(false);
  private error = signal<string | null>(null);
  private currentUserId = signal<string>('');

  // Real-time updates subject
  private newNotification$ = new Subject<Notification>();
  private pollingSubscription: Subscription | null = null;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private visibilityHandler: (() => void) | null = null;
  private isPollingInFlight = false;

  // Computed
  readonly allNotifications = computed(() => this.notifications());
  readonly unreadNotifications = computed(() =>
    this.notifications().filter((n) => !n.isRead)
  );
  readonly unreadCount = computed(() => this.unreadNotifications().length);
  readonly isLoading = computed(() => this.loading());
  readonly hasError = computed(() => this.error() !== null);
  readonly errorMessage = computed(() => this.error());

  // Observable for new notifications (for real-time updates)
  readonly onNewNotification = this.newNotification$.asObservable();

  /**
   * Initialize notification service for a user
   */
  initialize(userId: string): void {
    this.currentUserId.set(userId);
    // Subscribe to actually execute the cold Observable
    this.loadNotifications().subscribe();
    // Start polling for new notifications (replace with WebSocket in production)
    this.startPolling();
  }

  /**
   * Load notifications for current user from gamification API
   */
  loadNotifications(): Observable<Notification[]> {
    this.loading.set(true);
    this.error.set(null);

    return this.apiClient.get<any>('/api/v3/gamification/notifications?page=0&size=20').pipe(
      map((response: any) => {
        const items = response?.data?.content || response?.data || [];
        return items.map((n: any) => ({
          id: n.id || n.notificationId || '',
          type: n.type || 'MESSAGE_RECEIVED',
          title: n.title || '',
          message: n.message || '',
          recipientId: n.recipientId || n.userId || '',
          senderId: n.senderId,
          senderName: n.senderName,
          relatedEntityId: n.relatedEntityId,
          relatedEntityType: n.relatedEntityType,
          priority: n.priority || 'MEDIUM',
          isRead: n.isRead ?? n.read ?? false,
          createdAt: n.createdAt || new Date().toISOString(),
          readAt: n.readAt,
          actionUrl: n.actionUrl,
          metadata: n.metadata,
        } as Notification));
      }),
      tap((result) => {
        this.notifications.set(result);
        this.loading.set(false);
      }),
      catchError(() => {
        this.error.set('Khong the tai thong bao');
        this.loading.set(false);
        return of([]);
      })
    );
  }

  /**
   * Send notification to one or more recipients
   * @requirements 7.1
   */
  sendNotification(request: SendNotificationRequest): Observable<Notification[]> {
    this.loading.set(true);

    const notifications: Notification[] = request.recipientIds.map(
      (recipientId) => ({
        id: generateNotificationId(),
        type: request.type,
        title: request.title,
        message: request.message,
        recipientId,
        relatedEntityId: request.relatedEntityId,
        relatedEntityType: request.relatedEntityType,
        priority: request.priority || 'MEDIUM',
        isRead: false,
        createdAt: new Date().toISOString(),
        actionUrl: request.actionUrl,
        metadata: request.metadata,
      })
    );

    return of(notifications).pipe(
      delay(300),
      tap((result) => {
        // If current user is a recipient, add to local state
        const forCurrentUser = result.filter(
          (n) => n.recipientId === this.currentUserId()
        );
        if (forCurrentUser.length > 0) {
          this.notifications.update((current) => [
            ...forCurrentUser,
            ...current,
          ]);
          forCurrentUser.forEach((n) => this.newNotification$.next(n));
        }
        this.loading.set(false);
      })
    );
  }

  /**
   * Send assignment notification to students
   * @requirements 7.1
   */
  sendAssignmentNotification(
    assignmentId: string,
    assignmentTitle: string,
    courseTitle: string,
    studentIds: string[],
    teacherName: string
  ): Observable<Notification[]> {
    return this.sendNotification({
      type: 'ASSIGNMENT_NEW',
      recipientIds: studentIds,
      title: 'Bài tập mới',
      message: `Bạn có bài tập mới: "${assignmentTitle}" trong khóa học "${courseTitle}"`,
      relatedEntityId: assignmentId,
      relatedEntityType: 'ASSIGNMENT',
      priority: 'MEDIUM',
      actionUrl: '/student/my-tasks',
      metadata: { assignmentTitle, courseTitle, teacherName },
    });
  }

  /**
   * Send reminder notification for upcoming deadline
   * @requirements 7.2
   */
  sendReminderNotification(
    assignmentId: string,
    assignmentTitle: string,
    daysUntilDeadline: number,
    studentIds: string[]
  ): Observable<Notification[]> {
    const urgencyText =
      daysUntilDeadline === 0
        ? 'hôm nay'
        : daysUntilDeadline === 1
          ? 'ngày mai'
          : `trong ${daysUntilDeadline} ngày`;

    return this.sendNotification({
      type: 'ASSIGNMENT_REMINDER',
      recipientIds: studentIds,
      title: 'Nhắc nhở deadline',
      message: `Bài tập "${assignmentTitle}" sẽ hết hạn ${urgencyText}`,
      relatedEntityId: assignmentId,
      relatedEntityType: 'ASSIGNMENT',
      priority: daysUntilDeadline <= 1 ? 'HIGH' : 'MEDIUM',
      actionUrl: '/student/my-tasks',
      metadata: { assignmentTitle, daysUntilDeadline },
    });
  }

  /**
   * Send grade notification to student
   * @requirements 7.3
   */
  sendGradeNotification(
    assignmentId: string,
    assignmentTitle: string,
    studentId: string,
    score: number,
    maxScore: number,
    teacherName: string,
    feedback?: string
  ): Observable<Notification[]> {
    return this.sendNotification({
      type: 'GRADE_PUBLISHED',
      recipientIds: [studentId],
      title: 'Điểm mới',
      message: `Bài tập "${assignmentTitle}" đã được chấm điểm: ${score}/${maxScore}`,
      relatedEntityId: assignmentId,
      relatedEntityType: 'ASSIGNMENT',
      priority: 'MEDIUM',
      actionUrl: '/student/my-tasks',
      metadata: { assignmentTitle, score, maxScore, teacherName, feedback },
    });
  }

  /**
   * Send deadline extension notification
   */
  sendDeadlineExtendedNotification(
    assignmentId: string,
    assignmentTitle: string,
    studentId: string,
    newDeadline: string,
    teacherName: string
  ): Observable<Notification[]> {
    const formattedDeadline = new Date(newDeadline).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return this.sendNotification({
      type: 'DEADLINE_EXTENDED',
      recipientIds: [studentId],
      title: 'Gia hạn deadline',
      message: `Deadline bài tập "${assignmentTitle}" đã được gia hạn đến ${formattedDeadline}`,
      relatedEntityId: assignmentId,
      relatedEntityType: 'ASSIGNMENT',
      priority: 'MEDIUM',
      actionUrl: '/student/my-tasks',
      metadata: { assignmentTitle, newDeadline, teacherName },
    });
  }

  /**
   * Send submission received notification to teacher
   */
  sendSubmissionReceivedNotification(
    assignmentId: string,
    assignmentTitle: string,
    teacherId: string,
    studentName: string
  ): Observable<Notification[]> {
    return this.sendNotification({
      type: 'SUBMISSION_RECEIVED',
      recipientIds: [teacherId],
      title: 'Bài nộp mới',
      message: `${studentName} đã nộp bài tập "${assignmentTitle}"`,
      relatedEntityId: assignmentId,
      relatedEntityType: 'SUBMISSION',
      priority: 'LOW',
      actionUrl: `/teacher/assignment-hub/${assignmentId}/submissions`,
      metadata: { assignmentTitle, studentName },
    });
  }

  /**
   * Send message notification to recipient
   * @requirements 3.1, 3.2
   */
  sendMessageNotification(
    conversationId: string,
    recipientId: string,
    senderName: string,
    messagePreview: string,
    senderRole: 'TEACHER' | 'STUDENT'
  ): Observable<Notification[]> {
    // Truncate message preview to 100 characters
    const truncatedPreview = messagePreview.length > 100
      ? messagePreview.substring(0, 100) + '...'
      : messagePreview;

    // Determine action URL based on recipient role
    const actionUrl = senderRole === 'TEACHER'
      ? `/student/messages/${conversationId}`
      : `/teacher/students`;

    return this.sendNotification({
      type: 'MESSAGE_RECEIVED',
      recipientIds: [recipientId],
      title: 'Tin nhắn mới',
      message: `${senderName}: ${truncatedPreview}`,
      relatedEntityId: conversationId,
      priority: 'MEDIUM',
      actionUrl,
      metadata: { conversationId, senderName, senderRole, messagePreview: truncatedPreview },
    });
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): Observable<void> {
    const previousNotifications = this.notifications();
    this.error.set(null);

    // Optimistic local update
    this.notifications.update((current) =>
      current.map((n) =>
        n.id === notificationId
          ? { ...n, isRead: true, readAt: new Date().toISOString() }
          : n
      )
    );

    return this.apiClient.patch<void>(`/api/v3/gamification/notifications/${notificationId}/read`, {}).pipe(
      catchError((error) => {
        this.notifications.set(previousNotifications);
        this.error.set('Khong the cap nhat thong bao');
        return throwError(() => error);
      })
    );
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): Observable<void> {
    const previousNotifications = this.notifications();
    this.error.set(null);

    // Optimistic local update
    const now = new Date().toISOString();
    this.notifications.update((current) =>
      current.map((n) => (n.isRead ? n : { ...n, isRead: true, readAt: now }))
    );

    return this.apiClient.patch<void>('/api/v3/gamification/notifications/read-all', {}).pipe(
      catchError((error) => {
        this.notifications.set(previousNotifications);
        this.error.set('Khong the danh dau tat ca thong bao da doc');
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete notification
   */
  deleteNotification(notificationId: string): Observable<void> {
    const previousNotifications = this.notifications();
    this.error.set(null);

    // Optimistic local remove
    this.notifications.update((current) =>
      current.filter((n) => n.id !== notificationId)
    );

    return this.apiClient.delete<void>(`/api/v3/gamification/notifications/${notificationId}`).pipe(
      catchError((error) => {
        this.notifications.set(previousNotifications);
        this.error.set('Khong the xoa thong bao');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get notifications by type
   */
  getNotificationsByType(type: NotificationType): Notification[] {
    return this.notifications().filter((n) => n.type === type);
  }

  /**
   * Get recent notifications (last 7 days)
   */
  getRecentNotifications(limit: number = 10): Notification[] {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return this.notifications()
      .filter((n) => new Date(n.createdAt) >= sevenDaysAgo)
      .slice(0, limit);
  }

  /**
   * SOTA polling: Visibility API + adaptive interval (Slack/Discord pattern).
   * - Tab visible: poll every 60s
   * - Tab hidden: poll every 5 minutes (save connections)
   * - Prevents HikariCP pool exhaustion from multiple tabs
   */
  private startPolling(): void {
    this.stopPolling();

    const poll = () => {
      if (this.pollTimer) clearTimeout(this.pollTimer);
      const delay = document.hidden ? 300_000 : 60_000; // 5min hidden, 60s visible
      this.pollTimer = setTimeout(() => {
        this.checkForNewNotifications();
        poll(); // schedule next
      }, delay);
    };

    // Re-schedule when tab visibility changes
    this.visibilityHandler = () => poll();
    document.addEventListener('visibilitychange', this.visibilityHandler);
    poll();
  }

  private stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }

  private checkForNewNotifications(): void {
    // Guard: skip if a request is already in flight (prevents connection stacking)
    if (this.isPollingInFlight) return;
    this.isPollingInFlight = true;

    this.apiClient.get<{ data?: { count?: number }; count?: number }>('/api/v3/gamification/notifications/unread-count')
      .subscribe({
        next: (response: any) => {
          this.isPollingInFlight = false;
          const count = response?.data?.count ?? response?.count ?? 0;
          if (count > this.unreadCount()) {
            this.loadNotifications().subscribe();
          }
        },
        error: () => { this.isPollingInFlight = false; }
      });
  }

  /**
   * Clear all state
   */
  clearState(): void {
    this.stopPolling();
    this.notifications.set([]);
    this.currentUserId.set('');
    this.loading.set(false);
    this.error.set(null);
  }
}

// Helper function to generate unique notification ID
function generateNotificationId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
