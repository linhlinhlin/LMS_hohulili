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
import { Injectable, signal, computed } from '@angular/core';
import { Observable, of, delay, tap, interval, Subject } from 'rxjs';

export type NotificationType =
  | 'ASSIGNMENT_NEW'
  | 'ASSIGNMENT_REMINDER'
  | 'GRADE_PUBLISHED'
  | 'DEADLINE_EXTENDED'
  | 'FEEDBACK_RECEIVED'
  | 'SUBMISSION_RECEIVED'
  | 'MESSAGE_RECEIVED';

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
  // State
  private notifications = signal<Notification[]>([]);
  private loading = signal(false);
  private error = signal<string | null>(null);
  private currentUserId = signal<string>('');

  // Real-time updates subject
  private newNotification$ = new Subject<Notification>();

  // Computed
  readonly allNotifications = computed(() => this.notifications());
  readonly unreadNotifications = computed(() =>
    this.notifications().filter((n) => !n.isRead)
  );
  readonly unreadCount = computed(() => this.unreadNotifications().length);
  readonly isLoading = computed(() => this.loading());
  readonly hasError = computed(() => this.error() !== null);

  // Observable for new notifications (for real-time updates)
  readonly onNewNotification = this.newNotification$.asObservable();

  /**
   * Initialize notification service for a user
   */
  initialize(userId: string): void {
    this.currentUserId.set(userId);
    this.loadNotifications();
    // Start polling for new notifications (replace with WebSocket in production)
    this.startPolling();
  }

  /**
   * Load notifications for current user
   */
  loadNotifications(): Observable<Notification[]> {
    this.loading.set(true);

    // Mock data - replace with real API call
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'ASSIGNMENT_NEW',
        title: 'Bài tập mới',
        message: 'Bạn có bài tập mới: "An toàn Hàng hải - Chương 3"',
        recipientId: this.currentUserId(),
        senderId: 'teacher-1',
        senderName: 'Giảng viên Nguyễn Văn A',
        relatedEntityId: 'a1',
        relatedEntityType: 'ASSIGNMENT',
        priority: 'MEDIUM',
        isRead: false,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        actionUrl: '/student/my-tasks',
      },
      {
        id: '2',
        type: 'ASSIGNMENT_REMINDER',
        title: 'Nhắc nhở deadline',
        message: 'Bài tập "Thực hành Radar" sẽ hết hạn trong 1 ngày',
        recipientId: this.currentUserId(),
        relatedEntityId: 'a2',
        relatedEntityType: 'ASSIGNMENT',
        priority: 'HIGH',
        isRead: false,
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 mins ago
        actionUrl: '/student/my-tasks',
      },
      {
        id: '3',
        type: 'GRADE_PUBLISHED',
        title: 'Điểm mới',
        message: 'Bài tập "Điều hướng cơ bản" đã được chấm điểm: 85/100',
        recipientId: this.currentUserId(),
        senderId: 'teacher-1',
        senderName: 'Giảng viên Nguyễn Văn A',
        relatedEntityId: 'a3',
        relatedEntityType: 'ASSIGNMENT',
        priority: 'MEDIUM',
        isRead: true,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        readAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
        actionUrl: '/student/my-tasks',
        metadata: { score: 85, maxScore: 100 },
      },
    ];

    return of(mockNotifications).pipe(
      delay(300),
      tap((result) => {
        this.notifications.set(result);
        this.loading.set(false);
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
    return of(undefined).pipe(
      delay(100),
      tap(() => {
        this.notifications.update((current) =>
          current.map((n) =>
            n.id === notificationId
              ? { ...n, isRead: true, readAt: new Date().toISOString() }
              : n
          )
        );
      })
    );
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): Observable<void> {
    return of(undefined).pipe(
      delay(100),
      tap(() => {
        const now = new Date().toISOString();
        this.notifications.update((current) =>
          current.map((n) => (n.isRead ? n : { ...n, isRead: true, readAt: now }))
        );
      })
    );
  }

  /**
   * Delete notification
   */
  deleteNotification(notificationId: string): Observable<void> {
    return of(undefined).pipe(
      delay(100),
      tap(() => {
        this.notifications.update((current) =>
          current.filter((n) => n.id !== notificationId)
        );
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
   * Start polling for new notifications
   * In production, replace with WebSocket connection
   */
  private startPolling(): void {
    // Poll every 30 seconds
    interval(30000).subscribe(() => {
      this.checkForNewNotifications();
    });
  }

  /**
   * Check for new notifications (mock implementation)
   */
  private checkForNewNotifications(): void {
    // In production, this would be an API call
    // For now, just a placeholder
  }

  /**
   * Clear all state
   */
  clearState(): void {
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
