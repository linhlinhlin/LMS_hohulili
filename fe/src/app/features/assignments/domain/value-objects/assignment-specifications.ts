import { AssignmentType, PriorityLevel } from '../types';

/**
 * Value Object: Assignment Specifications
 * Contains all the rules and constraints for an assignment
 */
export class AssignmentSpecifications {
  constructor(
    public readonly type: AssignmentType,
    public readonly dueDate: Date,
    public readonly maxGrade: number,
    public readonly maxAttempts: number,
    public readonly timeLimitMinutes?: number,
    public readonly wordCount?: number,
    public readonly priority: PriorityLevel = PriorityLevel.MEDIUM,
    public readonly allowLateSubmission: boolean = false,
    public readonly latePenalty?: number // percentage deduction per day
  ) {
    this.validate();
  }

  /**
   * Business Rules Validation
   */
  private validate(): void {
    if (this.maxGrade <= 0) {
      throw new Error('Maximum grade must be greater than 0');
    }

    if (this.maxAttempts <= 0) {
      throw new Error('Maximum attempts must be greater than 0');
    }

    if (this.timeLimitMinutes !== undefined && this.timeLimitMinutes <= 0) {
      throw new Error('Time limit must be greater than 0 minutes');
    }

    if (this.wordCount !== undefined && this.wordCount <= 0) {
      throw new Error('Word count must be greater than 0');
    }

    if (this.latePenalty !== undefined && (this.latePenalty < 0 || this.latePenalty > 100)) {
      throw new Error('Late penalty must be between 0 and 100 percent');
    }

    if (this.dueDate <= new Date()) {
      throw new Error('Due date must be in the future');
    }
  }

  /**
   * Check if assignment allows late submissions
   */
  public allowsLateSubmission(): boolean {
    return this.allowLateSubmission;
  }

  /**
   * Calculate late penalty for given days late
   */
  public calculateLatePenalty(daysLate: number): number {
    if (!this.latePenalty || daysLate <= 0) {
      return 0;
    }
    return Math.min(daysLate * this.latePenalty, 100); // Max 100% penalty
  }

  /**
   * Check if assignment is overdue
   */
  public isOverdue(currentDate: Date = new Date()): boolean {
    return currentDate > this.dueDate;
  }

  /**
   * Get days until due date
   */
  public getDaysUntilDue(currentDate: Date = new Date()): number {
    const diffTime = this.dueDate.getTime() - currentDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if assignment is due soon (within specified days)
   */
  public isDueSoon(daysThreshold: number = 3, currentDate: Date = new Date()): boolean {
    const daysUntilDue = this.getDaysUntilDue(currentDate);
    return daysUntilDue >= 0 && daysUntilDue <= daysThreshold;
  }

  /**
   * Get urgency level based on time remaining
   */
  public getUrgencyLevel(currentDate: Date = new Date()): 'low' | 'medium' | 'high' | 'critical' {
    const daysUntilDue = this.getDaysUntilDue(currentDate);

    if (this.isOverdue(currentDate)) {
      return 'critical';
    }

    if (daysUntilDue <= 1) {
      return 'critical';
    }

    if (daysUntilDue <= 3) {
      return 'high';
    }

    if (daysUntilDue <= 7) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Check if time limit is exceeded
   */
  public isTimeLimitExceeded(startTime: Date, currentTime: Date = new Date()): boolean {
    if (!this.timeLimitMinutes) {
      return false;
    }

    const elapsedMinutes = (currentTime.getTime() - startTime.getTime()) / (1000 * 60);
    return elapsedMinutes > this.timeLimitMinutes;
  }

  /**
   * Check if word count requirement is met
   */
  public isWordCountMet(actualWordCount: number): boolean {
    if (!this.wordCount) {
      return true;
    }
    return actualWordCount >= this.wordCount;
  }

  /**
   * Get formatted time limit
   */
  public getFormattedTimeLimit(): string {
    if (!this.timeLimitMinutes) {
      return 'Không giới hạn';
    }

    const hours = Math.floor(this.timeLimitMinutes / 60);
    const minutes = this.timeLimitMinutes % 60;

    if (hours > 0) {
      return `${hours} giờ ${minutes > 0 ? `${minutes} phút` : ''}`.trim();
    }

    return `${minutes} phút`;
  }

  /**
   * Create a copy with updated due date
   */
  public withDueDate(newDueDate: Date): AssignmentSpecifications {
    return new AssignmentSpecifications(
      this.type,
      newDueDate,
      this.maxGrade,
      this.maxAttempts,
      this.timeLimitMinutes,
      this.wordCount,
      this.priority,
      this.allowLateSubmission,
      this.latePenalty
    );
  }

  /**
   * Create a copy with updated priority
   */
  public withPriority(newPriority: PriorityLevel): AssignmentSpecifications {
    return new AssignmentSpecifications(
      this.type,
      this.dueDate,
      this.maxGrade,
      this.maxAttempts,
      this.timeLimitMinutes,
      this.wordCount,
      newPriority,
      this.allowLateSubmission,
      this.latePenalty
    );
  }
}