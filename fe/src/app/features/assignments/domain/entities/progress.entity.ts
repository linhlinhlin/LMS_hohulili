import {
  AssignmentId,
  StudentId,
  ProgressStatus
} from '../types';

/**
 * Domain Entity: Assignment Progress
 * Tracks a student's progress on an assignment
 */
export class AssignmentProgress {
  constructor(
    public readonly assignmentId: AssignmentId,
    public readonly studentId: StudentId,
    public readonly status: ProgressStatus,
    public readonly timeSpent: number, // in milliseconds
    public readonly completionPercentage: number, // 0-100
    public readonly lastAccessed: Date,
    public readonly startedAt?: Date,
    public readonly completedAt?: Date,
    public readonly metadata: ProgressMetadata = {}
  ) {
    this.validate();
  }

  /**
   * Business Rules Validation
   */
  private validate(): void {
    if (this.completionPercentage < 0 || this.completionPercentage > 100) {
      throw new Error('Completion percentage must be between 0 and 100');
    }

    if (this.timeSpent < 0) {
      throw new Error('Time spent cannot be negative');
    }

    if (this.completedAt && !this.startedAt) {
      throw new Error('Cannot have completed date without started date');
    }

    if (this.completedAt && this.startedAt && this.completedAt < this.startedAt) {
      throw new Error('Completed date cannot be before started date');
    }

    if (this.status === ProgressStatus.COMPLETED && this.completionPercentage !== 100) {
      throw new Error('Completed assignments must have 100% completion');
    }
  }

  /**
   * Business Logic Methods
   */

  /**
   * Check if assignment is started
   */
  public isStarted(): boolean {
    return this.status !== ProgressStatus.NOT_STARTED;
  }

  /**
   * Check if assignment is completed
   */
  public isCompleted(): boolean {
    return this.status === ProgressStatus.COMPLETED;
  }

  /**
   * Check if assignment is in progress
   */
  public isInProgress(): boolean {
    return this.status === ProgressStatus.IN_PROGRESS;
  }

  /**
   * Check if assignment is overdue
   */
  public isOverdue(dueDate: Date, currentDate: Date = new Date()): boolean {
    if (this.isCompleted()) {
      return false;
    }

    return currentDate > dueDate;
  }

  /**
   * Get formatted time spent
   */
  public getFormattedTimeSpent(): string {
    const totalMinutes = Math.floor(this.timeSpent / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    return `${minutes}m`;
  }

  /**
   * Calculate average time per percentage point
   */
  public getAverageTimePerPercent(): number {
    if (this.completionPercentage === 0) {
      return 0;
    }

    return this.timeSpent / this.completionPercentage;
  }

  /**
   * Estimate remaining time based on current progress
   */
  public estimateRemainingTime(): number {
    if (this.completionPercentage >= 100) {
      return 0;
    }

    const remainingPercentage = 100 - this.completionPercentage;
    const avgTimePerPercent = this.getAverageTimePerPercent();

    return avgTimePerPercent * remainingPercentage;
  }

  /**
   * Get progress status text
   */
  public getStatusText(): string {
    switch (this.status) {
      case ProgressStatus.NOT_STARTED:
        return 'Chưa bắt đầu';
      case ProgressStatus.IN_PROGRESS:
        return 'Đang làm';
      case ProgressStatus.COMPLETED:
        return 'Hoàn thành';
      case ProgressStatus.OVERDUE:
        return 'Quá hạn';
      default:
        return 'Không xác định';
    }
  }

  /**
   * Get progress color class
   */
  public getStatusColorClass(): string {
    switch (this.status) {
      case ProgressStatus.NOT_STARTED:
        return 'text-gray-600 bg-gray-100';
      case ProgressStatus.IN_PROGRESS:
        return 'text-blue-600 bg-blue-100';
      case ProgressStatus.COMPLETED:
        return 'text-green-600 bg-green-100';
      case ProgressStatus.OVERDUE:
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  /**
   * Update progress percentage
   */
  public withProgress(newPercentage: number): AssignmentProgress {
    const clampedPercentage = Math.max(0, Math.min(100, newPercentage));
    const newStatus = this.determineStatusFromPercentage(clampedPercentage);

    return new AssignmentProgress(
      this.assignmentId,
      this.studentId,
      newStatus,
      this.timeSpent,
      clampedPercentage,
      new Date(),
      this.startedAt,
      newStatus === ProgressStatus.COMPLETED ? new Date() : this.completedAt,
      {
        ...this.metadata,
        lastProgressUpdate: new Date()
      }
    );
  }

  /**
   * Add time spent
   */
  public addTimeSpent(additionalTime: number): AssignmentProgress {
    const newTimeSpent = this.timeSpent + Math.max(0, additionalTime);

    return new AssignmentProgress(
      this.assignmentId,
      this.studentId,
      this.status,
      newTimeSpent,
      this.completionPercentage,
      new Date(),
      this.startedAt,
      this.completedAt,
      {
        ...this.metadata,
        lastTimeUpdate: new Date()
      }
    );
  }

  /**
   * Mark as started
   */
  public markAsStarted(): AssignmentProgress {
    if (this.isStarted()) {
      return this;
    }

    const now = new Date();
    return new AssignmentProgress(
      this.assignmentId,
      this.studentId,
      ProgressStatus.IN_PROGRESS,
      this.timeSpent,
      Math.max(this.completionPercentage, 1), // At least 1% when started
      now,
      now,
      this.completedAt,
      {
        ...this.metadata,
        startedAt: now
      }
    );
  }

  /**
   * Mark as completed
   */
  public markAsCompleted(): AssignmentProgress {
    if (this.isCompleted()) {
      return this;
    }

    const now = new Date();
    return new AssignmentProgress(
      this.assignmentId,
      this.studentId,
      ProgressStatus.COMPLETED,
      this.timeSpent,
      100,
      now,
      this.startedAt,
      now,
      {
        ...this.metadata
      }
    );
  }

  /**
   * Mark as overdue
   */
  public markAsOverdue(): AssignmentProgress {
    return new AssignmentProgress(
      this.assignmentId,
      this.studentId,
      ProgressStatus.OVERDUE,
      this.timeSpent,
      this.completionPercentage,
      new Date(),
      this.startedAt,
      this.completedAt,
      {
        ...this.metadata,
        markedOverdueAt: new Date()
      }
    );
  }

  /**
   * Get progress summary
   */
  public getSummary(): ProgressSummary {
    return {
      assignmentId: this.assignmentId,
      studentId: this.studentId,
      status: this.status,
      completionPercentage: this.completionPercentage,
      timeSpent: this.timeSpent,
      formattedTimeSpent: this.getFormattedTimeSpent(),
      estimatedRemainingTime: this.estimateRemainingTime(),
      isStarted: this.isStarted(),
      isCompleted: this.isCompleted(),
      isOverdue: false, // This needs due date context
      lastAccessed: this.lastAccessed,
      startedAt: this.startedAt,
      completedAt: this.completedAt
    };
  }

  /**
   * Determine status from percentage
   */
  private determineStatusFromPercentage(percentage: number): ProgressStatus {
    if (percentage === 0) {
      return ProgressStatus.NOT_STARTED;
    }

    if (percentage === 100) {
      return ProgressStatus.COMPLETED;
    }

    return ProgressStatus.IN_PROGRESS;
  }
}

/**
 * Progress Metadata
 */
export interface ProgressMetadata {
  startedAt?: Date;
  lastProgressUpdate?: Date;
  lastTimeUpdate?: Date;
  markedOverdueAt?: Date;
  sessionCount?: number;
  averageSessionTime?: number;
  longestSessionTime?: number;
  notes?: string;
}

/**
 * Progress Summary for quick overview
 */
export interface ProgressSummary {
  assignmentId: AssignmentId;
  studentId: StudentId;
  status: ProgressStatus;
  completionPercentage: number;
  timeSpent: number;
  formattedTimeSpent: string;
  estimatedRemainingTime: number;
  isStarted: boolean;
  isCompleted: boolean;
  isOverdue: boolean;
  lastAccessed: Date;
  startedAt?: Date;
  completedAt?: Date;
}