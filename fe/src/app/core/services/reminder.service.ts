/**
 * Reminder Service
 *
 * Quản lý nhắc nhở deadline cho học viên.
 * Features:
 * - Tính toán ngày nhắc nhở (D-3, D-1, D-0)
 * - Kiểm tra xem có nên gửi nhắc nhở không
 * - Xử lý deadline override trong tính toán
 * - Tạo nội dung nhắc nhở
 *
 * @requirements 5.1, 5.2, 5.3, 5.4
 */
import { Injectable, inject } from '@angular/core';
import { Observable, of, delay, tap } from 'rxjs';
import { NotificationService } from './notification.service';

export interface ReminderConfig {
  daysBefore: number[]; // e.g., [3, 1, 0] for D-3, D-1, D-0
  sendOnDueDay: boolean;
  sendAfterDue: boolean;
}

export interface ReminderSchedule {
  assignmentId: string;
  assignmentTitle: string;
  courseTitle: string;
  studentId: string;
  studentName: string;
  dueDate: string;
  personalDeadline?: string;
  reminderDates: ReminderDate[];
}

export interface ReminderDate {
  date: string;
  daysUntilDeadline: number;
  type: 'D-3' | 'D-1' | 'D-0' | 'OVERDUE';
  sent: boolean;
  sentAt?: string;
}

export interface PendingReminder {
  assignmentId: string;
  assignmentTitle: string;
  courseTitle: string;
  studentId: string;
  studentName: string;
  dueDate: string;
  daysUntilDeadline: number;
  reminderType: 'D-3' | 'D-1' | 'D-0' | 'OVERDUE';
}

// Default reminder configuration
const DEFAULT_REMINDER_CONFIG: ReminderConfig = {
  daysBefore: [3, 1, 0],
  sendOnDueDay: true,
  sendAfterDue: false,
};

@Injectable({
  providedIn: 'root',
})
export class ReminderService {
  private notificationService = inject(NotificationService);
  private config: ReminderConfig = DEFAULT_REMINDER_CONFIG;
  private sentReminders = new Map<string, Set<string>>(); // assignmentId -> Set of studentId_reminderType

  /**
   * Calculate reminder dates for an assignment
   * @requirements 5.1, 5.2, 5.3
   */
  calculateReminderDates(
    dueDate: string,
    personalDeadline?: string
  ): ReminderDate[] {
    const effectiveDeadline = personalDeadline || dueDate;
    const deadlineDate = new Date(effectiveDeadline);
    const reminderDates: ReminderDate[] = [];

    for (const daysBefore of this.config.daysBefore) {
      const reminderDate = new Date(deadlineDate);
      reminderDate.setDate(reminderDate.getDate() - daysBefore);
      reminderDate.setHours(9, 0, 0, 0); // Send at 9 AM

      let type: ReminderDate['type'];
      if (daysBefore === 3) type = 'D-3';
      else if (daysBefore === 1) type = 'D-1';
      else type = 'D-0';

      reminderDates.push({
        date: reminderDate.toISOString(),
        daysUntilDeadline: daysBefore,
        type,
        sent: false,
      });
    }

    return reminderDates.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  /**
   * Check if a reminder should be sent
   * @requirements 5.4
   */
  shouldSendReminder(
    assignmentId: string,
    studentId: string,
    dueDate: string,
    personalDeadline: string | undefined,
    hasSubmitted: boolean,
    currentDate: Date = new Date()
  ): { shouldSend: boolean; reminderType: ReminderDate['type'] | null; daysUntilDeadline: number } {
    // Don't send reminder if already submitted
    if (hasSubmitted) {
      return { shouldSend: false, reminderType: null, daysUntilDeadline: 0 };
    }

    const effectiveDeadline = personalDeadline || dueDate;
    const deadlineDate = new Date(effectiveDeadline);
    const daysUntilDeadline = Math.ceil(
      (deadlineDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Check if already sent this reminder
    const reminderKey = `${studentId}_D-${daysUntilDeadline}`;
    const sentForAssignment = this.sentReminders.get(assignmentId);
    if (sentForAssignment?.has(reminderKey)) {
      return { shouldSend: false, reminderType: null, daysUntilDeadline };
    }

    // Determine reminder type
    let reminderType: ReminderDate['type'] | null = null;
    if (daysUntilDeadline === 3) reminderType = 'D-3';
    else if (daysUntilDeadline === 1) reminderType = 'D-1';
    else if (daysUntilDeadline === 0) reminderType = 'D-0';
    else if (daysUntilDeadline < 0 && this.config.sendAfterDue) reminderType = 'OVERDUE';

    const shouldSend = reminderType !== null && this.config.daysBefore.includes(Math.max(0, daysUntilDeadline));

    return { shouldSend, reminderType, daysUntilDeadline };
  }

  /**
   * Get pending reminders for all assignments
   */
  getPendingReminders(
    assignments: Array<{
      id: string;
      title: string;
      courseTitle: string;
      dueDate: string;
      students: Array<{
        id: string;
        name: string;
        personalDeadline?: string;
        hasSubmitted: boolean;
      }>;
    }>,
    currentDate: Date = new Date()
  ): PendingReminder[] {
    const pendingReminders: PendingReminder[] = [];

    for (const assignment of assignments) {
      for (const student of assignment.students) {
        const { shouldSend, reminderType, daysUntilDeadline } = this.shouldSendReminder(
          assignment.id,
          student.id,
          assignment.dueDate,
          student.personalDeadline,
          student.hasSubmitted,
          currentDate
        );

        if (shouldSend && reminderType) {
          pendingReminders.push({
            assignmentId: assignment.id,
            assignmentTitle: assignment.title,
            courseTitle: assignment.courseTitle,
            studentId: student.id,
            studentName: student.name,
            dueDate: student.personalDeadline || assignment.dueDate,
            daysUntilDeadline,
            reminderType,
          });
        }
      }
    }

    return pendingReminders;
  }

  /**
   * Send reminder notification
   * @requirements 5.5
   */
  sendReminder(reminder: PendingReminder): Observable<void> {
    return this.notificationService
      .sendReminderNotification(
        reminder.assignmentId,
        reminder.assignmentTitle,
        reminder.daysUntilDeadline,
        [reminder.studentId]
      )
      .pipe(
        tap(() => {
          // Mark as sent
          const reminderKey = `${reminder.studentId}_${reminder.reminderType}`;
          if (!this.sentReminders.has(reminder.assignmentId)) {
            this.sentReminders.set(reminder.assignmentId, new Set());
          }
          this.sentReminders.get(reminder.assignmentId)!.add(reminderKey);
        }),
        // Convert to void using map
        tap({ complete: () => {} })
      ) as unknown as Observable<void>;
  }

  /**
   * Send all pending reminders
   */
  sendAllPendingReminders(
    assignments: Array<{
      id: string;
      title: string;
      courseTitle: string;
      dueDate: string;
      students: Array<{
        id: string;
        name: string;
        personalDeadline?: string;
        hasSubmitted: boolean;
      }>;
    }>
  ): Observable<{ sent: number; failed: number }> {
    const pendingReminders = this.getPendingReminders(assignments);
    let sent = 0;
    let failed = 0;

    // In production, this would be batched
    for (const reminder of pendingReminders) {
      this.sendReminder(reminder).subscribe({
        next: () => sent++,
        error: () => failed++,
      });
    }

    return of({ sent, failed }).pipe(delay(100));
  }

  /**
   * Create reminder message content
   * @requirements 5.5
   */
  createReminderMessage(
    assignmentTitle: string,
    courseTitle: string,
    daysUntilDeadline: number,
    dueDate: string
  ): { title: string; message: string } {
    const formattedDate = new Date(dueDate).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    let title: string;
    let message: string;

    if (daysUntilDeadline === 0) {
      title = '⚠️ Deadline hôm nay!';
      message = `Bài tập "${assignmentTitle}" trong khóa học "${courseTitle}" sẽ hết hạn hôm nay lúc ${formattedDate}. Hãy nộp bài ngay!`;
    } else if (daysUntilDeadline === 1) {
      title = '⏰ Còn 1 ngày!';
      message = `Bài tập "${assignmentTitle}" trong khóa học "${courseTitle}" sẽ hết hạn vào ngày mai (${formattedDate}). Đừng quên nộp bài!`;
    } else if (daysUntilDeadline === 3) {
      title = '📅 Nhắc nhở deadline';
      message = `Bài tập "${assignmentTitle}" trong khóa học "${courseTitle}" sẽ hết hạn trong 3 ngày (${formattedDate}).`;
    } else if (daysUntilDeadline < 0) {
      title = '❌ Đã quá hạn!';
      message = `Bài tập "${assignmentTitle}" trong khóa học "${courseTitle}" đã quá hạn ${Math.abs(daysUntilDeadline)} ngày. Liên hệ giảng viên nếu cần gia hạn.`;
    } else {
      title = '📅 Nhắc nhở deadline';
      message = `Bài tập "${assignmentTitle}" trong khóa học "${courseTitle}" sẽ hết hạn trong ${daysUntilDeadline} ngày (${formattedDate}).`;
    }

    return { title, message };
  }

  /**
   * Get reminder schedule for an assignment
   */
  getReminderSchedule(
    assignmentId: string,
    assignmentTitle: string,
    courseTitle: string,
    dueDate: string,
    students: Array<{
      id: string;
      name: string;
      personalDeadline?: string;
    }>
  ): ReminderSchedule[] {
    return students.map((student) => ({
      assignmentId,
      assignmentTitle,
      courseTitle,
      studentId: student.id,
      studentName: student.name,
      dueDate,
      personalDeadline: student.personalDeadline,
      reminderDates: this.calculateReminderDates(dueDate, student.personalDeadline),
    }));
  }

  /**
   * Update reminder configuration
   */
  updateConfig(config: Partial<ReminderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ReminderConfig {
    return { ...this.config };
  }

  /**
   * Clear sent reminders cache (for testing or reset)
   */
  clearSentReminders(): void {
    this.sentReminders.clear();
  }

  /**
   * Check if reminder was already sent
   */
  wasReminderSent(
    assignmentId: string,
    studentId: string,
    reminderType: ReminderDate['type']
  ): boolean {
    const reminderKey = `${studentId}_${reminderType}`;
    return this.sentReminders.get(assignmentId)?.has(reminderKey) ?? false;
  }
}

