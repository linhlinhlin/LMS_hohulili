import {
  AssignmentId,
  CourseId,
  InstructorId,
  AssignmentStatus,
  FileAttachment
} from '../types';
import { AssignmentSpecifications } from '../value-objects/assignment-specifications';
import { Rubric } from '../value-objects/rubric';

/**
 * Domain Entity: Assignment
 * Represents an assignment in the domain
 * Immutable entity with business logic methods
 */
export class Assignment {
  constructor(
    public readonly id: AssignmentId,
    public readonly title: string,
    public readonly description: string,
    public readonly courseId: CourseId,
    public readonly instructorId: InstructorId,
    public readonly specifications: AssignmentSpecifications,
    public readonly rubric: Rubric,
    public readonly status: AssignmentStatus,
    public readonly instructions: string,
    public readonly attachments: FileAttachment[],
    public readonly metadata: AssignmentMetadata
  ) {
    this.validate();
  }

  /**
   * Business Rules Validation
   */
  private validate(): void {
    if (!this.title.trim()) {
      throw new Error('Assignment title cannot be empty');
    }

    if (!this.description.trim()) {
      throw new Error('Assignment description cannot be empty');
    }

    if (!this.instructions.trim()) {
      throw new Error('Assignment instructions cannot be empty');
    }

    if (this.attachments.length > 10) {
      throw new Error('Assignment cannot have more than 10 attachments');
    }
  }

  /**
   * Business Logic Methods
   */

  /**
   * Check if assignment is published
   */
  public isPublished(): boolean {
    return this.status === AssignmentStatus.PUBLISHED;
  }

  /**
   * Check if assignment is overdue
   */
  public isOverdue(currentDate: Date = new Date()): boolean {
    return this.specifications.isOverdue(currentDate);
  }

  /**
   * Check if assignment is due soon
   */
  public isDueSoon(daysThreshold: number = 3, currentDate: Date = new Date()): boolean {
    return this.specifications.isDueSoon(daysThreshold, currentDate);
  }

  /**
   * Get deadline status
   */
  public getDeadlineStatus(currentDate: Date = new Date()): 'upcoming' | 'due_soon' | 'overdue' | 'completed' {
    if (this.isOverdue(currentDate)) {
      return 'overdue';
    }

    if (this.isDueSoon(3, currentDate)) {
      return 'due_soon';
    }

    return 'upcoming';
  }

  /**
   * Get urgency level
   */
  public getUrgencyLevel(currentDate: Date = new Date()): 'low' | 'medium' | 'high' | 'critical' {
    return this.specifications.getUrgencyLevel(currentDate);
  }

  /**
   * Check if assignment can be submitted
   */
  public canBeSubmitted(submissionCount: number, currentDate: Date = new Date()): boolean {
    if (!this.isPublished()) {
      return false;
    }

    if (submissionCount >= this.specifications.maxAttempts) {
      return false;
    }

    // Allow late submissions if configured
    if (this.isOverdue(currentDate) && !this.specifications.allowsLateSubmission()) {
      return false;
    }

    return true;
  }

  /**
   * Calculate grade from rubric scores
   */
  public calculateGrade(scores: Map<string, number>): {
    score: number;
    percentage: number;
    breakdown: any;
    isValid: boolean;
    errors: string[];
  } {
    const validation = this.rubric.validateScores(scores);

    if (!validation.isValid) {
      return {
        score: 0,
        percentage: 0,
        breakdown: null,
        isValid: false,
        errors: validation.errors
      };
    }

    const score = this.rubric.calculateWeightedGrade(scores);
    const percentage = (score / this.specifications.maxGrade) * 100;
    const breakdown = this.rubric.getDetailedBreakdown(scores);

    return {
      score: Math.round(score * 100) / 100,
      percentage: Math.round(percentage * 100) / 100,
      breakdown,
      isValid: true,
      errors: []
    };
  }

  /**
   * Get assignment duration info
   */
  public getDurationInfo(): {
    daysUntilDue: number;
    isOverdue: boolean;
    formattedDueDate: string;
    urgencyLevel: string;
  } {
    const currentDate = new Date();
    const daysUntilDue = this.specifications.getDaysUntilDue(currentDate);
    const isOverdue = this.isOverdue(currentDate);
    const urgencyLevel = this.getUrgencyLevel(currentDate);

    return {
      daysUntilDue,
      isOverdue,
      formattedDueDate: this.formatDueDate(),
      urgencyLevel
    };
  }

  /**
   * Format due date for display
   */
  private formatDueDate(): string {
    return this.specifications.dueDate.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Create a copy with updated status
   */
  public withStatus(newStatus: AssignmentStatus): Assignment {
    return new Assignment(
      this.id,
      this.title,
      this.description,
      this.courseId,
      this.instructorId,
      this.specifications,
      this.rubric,
      newStatus,
      this.instructions,
      this.attachments,
      {
        ...this.metadata,
        updatedAt: new Date()
      }
    );
  }

  /**
   * Create a copy with updated specifications
   */
  public withSpecifications(newSpecifications: AssignmentSpecifications): Assignment {
    return new Assignment(
      this.id,
      this.title,
      this.description,
      this.courseId,
      this.instructorId,
      newSpecifications,
      this.rubric,
      this.status,
      this.instructions,
      this.attachments,
      {
        ...this.metadata,
        updatedAt: new Date()
      }
    );
  }

  /**
   * Check if assignment has time limit
   */
  public hasTimeLimit(): boolean {
    return this.specifications.timeLimitMinutes !== undefined;
  }

  /**
   * Check if assignment has word count requirement
   */
  public hasWordCountRequirement(): boolean {
    return this.specifications.wordCount !== undefined;
  }

  /**
   * Get file size limit for attachments (in MB)
   */
  public getAttachmentSizeLimit(): number {
    return 10; // 10MB default
  }

  /**
   * Get allowed file types for attachments
   */
  public getAllowedFileTypes(): string[] {
    return ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png'];
  }

  /**
   * Check if file type is allowed
   */
  public isFileTypeAllowed(fileType: string): boolean {
    return this.getAllowedFileTypes().includes(fileType.toLowerCase());
  }
}

/**
 * Assignment Metadata
 */
export interface AssignmentMetadata {
  createdAt: Date;
  updatedAt: Date;
  createdBy: InstructorId;
  version: number;
  tags: string[];
  isActive: boolean;
}