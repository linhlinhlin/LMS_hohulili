import {
  LearningSessionId,
  StudentId,
  CourseId,
  LessonId,
  LearningSessionStatus,
  SessionType,
  ValidationResult
} from '../types';
import { SessionDuration } from '../value-objects/session-duration';

/**
 * Domain Entity: Learning Session
 * Represents a learning session in the domain with rich business logic
 */
export class LearningSession {
  constructor(
    public readonly id: LearningSessionId,
    public readonly studentId: StudentId,
    public readonly courseId: CourseId,
    public readonly lessonId: LessonId,
    public readonly sessionType: SessionType,
    public readonly status: LearningSessionStatus,
    public readonly duration: SessionDuration,
    public readonly startedAt: Date,
    public readonly metadata: LearningSessionMetadata
  ) {
    const validation = this.validate();
    if (!validation.isValid) {
      throw new Error(`Invalid learning session: ${validation.errors.join(', ')}`);
    }
  }


  /**
   * Business Logic Methods
   */

  /**
   * Check if session is active
   */
  public isActive(): boolean {
    return this.status === LearningSessionStatus.ACTIVE;
  }

  /**
   * Check if session is completed
   */
  public isCompleted(): boolean {
    return this.status === LearningSessionStatus.COMPLETED;
  }

  /**
   * Check if session is paused
   */
  public isPaused(): boolean {
    return this.status === LearningSessionStatus.PAUSED;
  }

  /**
   * Check if session is abandoned
   */
  public isAbandoned(): boolean {
    return this.status === LearningSessionStatus.ABANDONED;
  }

  /**
   * Get session duration in minutes
   */
  public getDurationMinutes(): number {
    return this.duration.minutes;
  }

  /**
   * Check if session meets minimum duration requirement
   */
  public meetsMinimumDuration(minMinutes: number = 5): boolean {
    return this.duration.minutes >= minMinutes;
  }

  /**
   * Check if session is considered productive
   */
  public isProductive(minMinutes: number = 15): boolean {
    return this.isCompleted() && this.duration.minutes >= minMinutes;
  }

  /**
   * Get session end time
   */
  public getEndTime(): Date | null {
    if (!this.metadata.completedAt) return null;
    return this.metadata.completedAt;
  }

  /**
   * Get actual session duration
   */
  public getActualDuration(): number {
    if (!this.metadata.completedAt) {
      return this.duration.minutes; // Current duration if still active
    }

    const actualMinutes = Math.floor(
      (this.metadata.completedAt.getTime() - this.startedAt.getTime()) / (1000 * 60)
    );

    return actualMinutes;
  }

  /**
   * Check if session is within expected time
   */
  public isWithinExpectedTime(): boolean {
    return this.duration.isWithinExpectedTime();
  }

  /**
   * Get session efficiency ratio
   */
  public getEfficiencyRatio(): number | null {
    return this.duration.getEfficiencyRatio();
  }

  /**
   * Check if session can be resumed
   */
  public canBeResumed(): boolean {
    return this.status === LearningSessionStatus.PAUSED;
  }

  /**
   * Check if session can be completed
   */
  public canBeCompleted(): boolean {
    return this.status === LearningSessionStatus.ACTIVE;
  }

  /**
   * Get session age in days
   */
  public getAgeInDays(): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.startedAt.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if session is recent
   */
  public isRecent(daysThreshold: number = 7): boolean {
    return this.getAgeInDays() <= daysThreshold;
  }

  /**
   * Get formatted session info
   */
  public getFormattedInfo(): {
    duration: string;
    status: string;
    type: string;
    isRecent: boolean;
    efficiency: number | null;
  } {
    return {
      duration: this.duration.getFormattedDuration(),
      status: this.getStatusLabel(),
      type: this.getTypeLabel(),
      isRecent: this.isRecent(),
      efficiency: this.getEfficiencyRatio()
    };
  }

  /**
   * Get status label in Vietnamese
   */
  private getStatusLabel(): string {
    switch (this.status) {
      case LearningSessionStatus.ACTIVE: return 'Đang học';
      case LearningSessionStatus.PAUSED: return 'Tạm dừng';
      case LearningSessionStatus.COMPLETED: return 'Hoàn thành';
      case LearningSessionStatus.ABANDONED: return 'Đã bỏ';
      default: return 'Không xác định';
    }
  }

  /**
   * Get type label in Vietnamese
   */
  private getTypeLabel(): string {
    switch (this.sessionType) {
      case SessionType.LESSON: return 'Bài học';
      case SessionType.QUIZ: return 'Bài kiểm tra';
      case SessionType.ASSIGNMENT: return 'Bài tập';
      case SessionType.REVIEW: return 'Ôn tập';
      default: return 'Không xác định';
    }
  }

  /**
   * Validate session data
   */
  public validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (this.duration.minutes < 1) {
      errors.push('Session duration must be at least 1 minute');
    }

    if (this.status === LearningSessionStatus.COMPLETED && !this.metadata.completedAt) {
      errors.push('Completed session must have completion timestamp');
    }

    if (this.metadata.completedAt && this.metadata.completedAt < this.startedAt) {
      errors.push('Completion time cannot be before start time');
    }

    // Warnings
    if (this.duration.minutes < 5) {
      warnings.push('Very short session duration');
    }

    if (this.status === LearningSessionStatus.ABANDONED && this.duration.minutes > 10) {
      warnings.push('Abandoned session with significant duration');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Create a copy with updated status
   */
  public withStatus(newStatus: LearningSessionStatus): LearningSession {
    const completedAt = newStatus === LearningSessionStatus.COMPLETED ? new Date() : undefined;

    return new LearningSession(
      this.id,
      this.studentId,
      this.courseId,
      this.lessonId,
      this.sessionType,
      newStatus,
      this.duration,
      this.startedAt,
      {
        ...this.metadata,
        completedAt,
        updatedAt: new Date()
      }
    );
  }

  /**
   * Create a copy with updated duration
   */
  public withDuration(newDuration: SessionDuration): LearningSession {
    return new LearningSession(
      this.id,
      this.studentId,
      this.courseId,
      this.lessonId,
      this.sessionType,
      this.status,
      newDuration,
      this.startedAt,
      {
        ...this.metadata,
        updatedAt: new Date()
      }
    );
  }
}

/**
 * Learning Session Metadata
 */
export interface LearningSessionMetadata {
  completedAt?: Date;
  lastPausedAt?: Date;
  resumeCount: number;
  deviceInfo?: string;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}