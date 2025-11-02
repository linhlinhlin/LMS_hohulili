import {
  ProgressId,
  StudentId,
  CourseId,
  LessonId,
  ProgressStatus,
  ValidationResult
} from '../types';
import { ProgressPercentage } from '../value-objects/progress-percentage';

/**
 * Domain Entity: Progress
 * Represents learning progress for a student in a course/lesson
 */
export class Progress {
  constructor(
    public readonly id: ProgressId,
    public readonly studentId: StudentId,
    public readonly courseId: CourseId,
    public readonly lessonId: LessonId,
    public readonly percentage: ProgressPercentage,
    public readonly status: ProgressStatus,
    public readonly metadata: ProgressMetadata
  ) {
    const validation = this.validate();
    if (!validation.isValid) {
      throw new Error(`Invalid progress: ${validation.errors.join(', ')}`);
    }
  }

  /**
   * Business Logic Methods
   */

  /**
   * Check if progress is complete
   */
  public isComplete(): boolean {
    return this.percentage.isComplete();
  }

  /**
   * Check if progress is started
   */
  public isStarted(): boolean {
    return this.percentage.isStarted();
  }

  /**
   * Check if progress is blocked
   */
  public isBlocked(): boolean {
    return this.status === ProgressStatus.BLOCKED;
  }

  /**
   * Check if progress is in progress
   */
  public isInProgress(): boolean {
    return this.status === ProgressStatus.IN_PROGRESS;
  }

  /**
   * Check if progress can be updated
   */
  public canBeUpdated(): boolean {
    return !this.isComplete() && !this.isBlocked();
  }

  /**
   * Get progress percentage value
   */
  public getPercentageValue(): number {
    return this.percentage.value;
  }

  /**
   * Get remaining percentage
   */
  public getRemainingPercentage(): number {
    return this.percentage.getRemaining();
  }

  /**
   * Check if progress meets completion threshold
   */
  public meetsCompletionThreshold(threshold: number = 80): boolean {
    return this.percentage.value >= threshold;
  }

  /**
   * Get progress category
   */
  public getProgressCategory(): string {
    return this.percentage.getCategory();
  }

  /**
   * Get time spent in minutes
   */
  public getTimeSpentMinutes(): number {
    return this.metadata.timeSpentMinutes;
  }

  /**
   * Get completion rate (percentage per minute)
   */
  public getCompletionRate(): number {
    if (this.metadata.timeSpentMinutes === 0) return 0;
    return this.percentage.value / this.metadata.timeSpentMinutes;
  }

  /**
   * Check if progress is recent
   */
  public isRecent(daysThreshold: number = 7): boolean {
    const now = new Date();
    const lastAccessed = this.metadata.lastAccessedAt;
    const diffTime = Math.abs(now.getTime() - lastAccessed.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= daysThreshold;
  }

  /**
   * Get days since last access
   */
  public getDaysSinceLastAccess(): number {
    const now = new Date();
    const lastAccessed = this.metadata.lastAccessedAt;
    const diffTime = Math.abs(now.getTime() - lastAccessed.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if progress is at risk (low progress, old access)
   */
  public isAtRisk(lowThreshold: number = 25, daysThreshold: number = 14): boolean {
    return this.percentage.value < lowThreshold && this.getDaysSinceLastAccess() > daysThreshold;
  }

  /**
   * Get formatted progress info
   */
  public getFormattedInfo(): {
    percentage: string;
    status: string;
    category: string;
    timeSpent: string;
    isRecent: boolean;
    isAtRisk: boolean;
  } {
    return {
      percentage: this.percentage.getFormattedPercentage(),
      status: this.getStatusLabel(),
      category: this.getProgressCategory(),
      timeSpent: this.formatTimeSpent(),
      isRecent: this.isRecent(),
      isAtRisk: this.isAtRisk()
    };
  }

  /**
   * Get status label in Vietnamese
   */
  private getStatusLabel(): string {
    switch (this.status) {
      case ProgressStatus.NOT_STARTED: return 'Chưa bắt đầu';
      case ProgressStatus.IN_PROGRESS: return 'Đang học';
      case ProgressStatus.COMPLETED: return 'Hoàn thành';
      case ProgressStatus.BLOCKED: return 'Bị khóa';
      default: return 'Không xác định';
    }
  }

  /**
   * Format time spent
   */
  private formatTimeSpent(): string {
    const minutes = this.metadata.timeSpentMinutes;
    if (minutes < 60) {
      return `${minutes} phút`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
      return `${hours} giờ`;
    }

    return `${hours} giờ ${remainingMinutes} phút`;
  }

  /**
   * Validate progress data
   */
  public validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (this.percentage.value < 0 || this.percentage.value > 100) {
      errors.push('Progress percentage must be between 0 and 100');
    }

    if (this.metadata.timeSpentMinutes < 0) {
      errors.push('Time spent cannot be negative');
    }

    if (this.metadata.lastAccessedAt > new Date()) {
      errors.push('Last accessed time cannot be in the future');
    }

    // Business rule validations
    if (this.status === ProgressStatus.COMPLETED && !this.percentage.isComplete()) {
      errors.push('Completed progress must have 100% completion');
    }

    if (this.status === ProgressStatus.NOT_STARTED && this.percentage.isStarted()) {
      errors.push('Not started progress cannot have non-zero percentage');
    }

    // Warnings
    if (this.isAtRisk()) {
      warnings.push('Progress is at risk - low completion and old access');
    }

    if (this.metadata.attemptCount > 5) {
      warnings.push('High number of attempts may indicate difficulty');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Create a copy with updated percentage
   */
  public withPercentage(newPercentage: ProgressPercentage): Progress {
    return new Progress(
      this.id,
      this.studentId,
      this.courseId,
      this.lessonId,
      newPercentage,
      this.status,
      {
        ...this.metadata,
        updatedAt: new Date()
      }
    );
  }

  /**
   * Create a copy with updated status
   */
  public withStatus(newStatus: ProgressStatus): Progress {
    return new Progress(
      this.id,
      this.studentId,
      this.courseId,
      this.lessonId,
      this.percentage,
      newStatus,
      {
        ...this.metadata,
        updatedAt: new Date()
      }
    );
  }

  /**
   * Create a copy with updated time spent
   */
  public withTimeSpent(additionalMinutes: number): Progress {
    const newTimeSpent = this.metadata.timeSpentMinutes + additionalMinutes;

    return new Progress(
      this.id,
      this.studentId,
      this.courseId,
      this.lessonId,
      this.percentage,
      this.status,
      {
        ...this.metadata,
        timeSpentMinutes: newTimeSpent,
        updatedAt: new Date()
      }
    );
  }

  /**
   * Create a copy with updated last access
   */
  public withLastAccess(): Progress {
    return new Progress(
      this.id,
      this.studentId,
      this.courseId,
      this.lessonId,
      this.percentage,
      this.status,
      {
        ...this.metadata,
        lastAccessedAt: new Date(),
        updatedAt: new Date()
      }
    );
  }
}

/**
 * Progress Metadata
 */
export interface ProgressMetadata {
  timeSpentMinutes: number;
  attemptCount: number;
  lastAccessedAt: Date;
  firstAccessedAt: Date;
  completedAt?: Date;
  score?: number;
  createdAt: Date;
  updatedAt: Date;
}