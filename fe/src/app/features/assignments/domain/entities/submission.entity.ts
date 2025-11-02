import {
  SubmissionId,
  AssignmentId,
  StudentId,
  SubmissionStatus,
  FileAttachment,
  Grade
} from '../types';

/**
 * Value Object: Submission Content
 * Contains the actual content submitted by student
 */
export class SubmissionContent {
  constructor(
    public readonly text: string,
    public readonly wordCount: number,
    public readonly lastModified: Date
  ) {
    this.validate();
  }

  private validate(): void {
    if (this.wordCount < 0) {
      throw new Error('Word count cannot be negative');
    }

    if (this.wordCount !== this.calculateActualWordCount()) {
      throw new Error('Word count does not match actual content');
    }
  }

  /**
   * Calculate actual word count from text
   */
  private calculateActualWordCount(): number {
    return this.text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Check if content meets minimum word requirement
   */
  public meetsWordRequirement(minimumWords: number): boolean {
    return this.wordCount >= minimumWords;
  }

  /**
   * Get content preview (first 100 characters)
   */
  public getPreview(maxLength: number = 100): string {
    if (this.text.length <= maxLength) {
      return this.text;
    }
    return this.text.substring(0, maxLength) + '...';
  }

  /**
   * Create updated content
   */
  public withText(newText: string): SubmissionContent {
    const wordCount = newText.trim().split(/\s+/).filter(word => word.length > 0).length;
    return new SubmissionContent(newText, wordCount, new Date());
  }
}

/**
 * Domain Entity: Assignment Submission
 * Represents a student's submission for an assignment
 */
export class AssignmentSubmission {
  constructor(
    public readonly id: SubmissionId,
    public readonly assignmentId: AssignmentId,
    public readonly studentId: StudentId,
    public readonly content: SubmissionContent,
    public readonly attachments: FileAttachment[],
    public readonly status: SubmissionStatus,
    public readonly attemptNumber: number,
    public readonly metadata: SubmissionMetadata,
    public readonly grade?: Grade
  ) {
    this.validate();
  }

  /**
   * Business Rules Validation
   */
  private validate(): void {
    if (this.attemptNumber < 1) {
      throw new Error('Attempt number must be at least 1');
    }

    if (this.attachments.length > 5) {
      throw new Error('Submission cannot have more than 5 attachments');
    }

    if (this.grade && this.status !== SubmissionStatus.GRADED) {
      throw new Error('Only graded submissions can have grades');
    }
  }

  /**
   * Business Logic Methods
   */

  /**
   * Check if submission is graded
   */
  public isGraded(): boolean {
    return this.status === SubmissionStatus.GRADED && this.grade !== undefined;
  }

  /**
   * Check if submission is late
   */
  public isLate(dueDate: Date): boolean {
    return this.metadata.submittedAt ? this.metadata.submittedAt > dueDate : false;
  }

  /**
   * Check if submission can be edited
   */
  public canBeEdited(currentDate: Date, dueDate: Date, maxAttempts: number): boolean {
    if (this.status === SubmissionStatus.SUBMITTED || this.status === SubmissionStatus.GRADED) {
      return false;
    }

    if (this.attemptNumber >= maxAttempts) {
      return false;
    }

    // Allow editing until due date or with late submission policy
    return currentDate <= dueDate;
  }

  /**
   * Calculate submission time
   */
  public getSubmissionTime(): number {
    if (!this.metadata.startedAt) {
      return 0;
    }

    const endTime = this.metadata.submittedAt || new Date();
    return endTime.getTime() - this.metadata.startedAt.getTime();
  }

  /**
   * Get formatted submission time
   */
  public getFormattedSubmissionTime(): string {
    const timeMs = this.getSubmissionTime();
    const minutes = Math.floor(timeMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }

    return `${minutes}m`;
  }

  /**
   * Check if submission meets requirements
   */
  public meetsRequirements(minWordCount?: number): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check word count
    if (minWordCount && !this.content.meetsWordRequirement(minWordCount)) {
      errors.push(`Nội dung phải có ít nhất ${minWordCount} từ (hiện tại: ${this.content.wordCount})`);
    }

    // Check content
    if (!this.content.text.trim()) {
      errors.push('Nội dung bài nộp không được để trống');
    }

    // Check attachments if required
    if (this.attachments.length === 0) {
      warnings.push('Không có tệp đính kèm');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Create a copy with updated content
   */
  public withContent(newContent: SubmissionContent): AssignmentSubmission {
    return new AssignmentSubmission(
      this.id,
      this.assignmentId,
      this.studentId,
      newContent,
      this.attachments,
      this.status,
      this.attemptNumber,
      {
        ...this.metadata,
        updatedAt: new Date()
      },
      this.grade
    );
  }

  /**
   * Create a copy with updated attachments
   */
  public withAttachments(newAttachments: FileAttachment[]): AssignmentSubmission {
    if (newAttachments.length > 5) {
      throw new Error('Cannot have more than 5 attachments');
    }

    return new AssignmentSubmission(
      this.id,
      this.assignmentId,
      this.studentId,
      this.content,
      newAttachments,
      this.status,
      this.attemptNumber,
      {
        ...this.metadata,
        updatedAt: new Date()
      },
      this.grade
    );
  }

  /**
   * Create a copy with updated status
   */
  public withStatus(newStatus: SubmissionStatus): AssignmentSubmission {
    return new AssignmentSubmission(
      this.id,
      this.assignmentId,
      this.studentId,
      this.content,
      this.attachments,
      newStatus,
      this.attemptNumber,
      {
        ...this.metadata,
        updatedAt: new Date()
      },
      this.grade
    );
  }

  /**
   * Create a copy with grade
   */
  public withGrade(newGrade: Grade): AssignmentSubmission {
    return new AssignmentSubmission(
      this.id,
      this.assignmentId,
      this.studentId,
      this.content,
      this.attachments,
      SubmissionStatus.GRADED,
      this.attemptNumber,
      {
        ...this.metadata,
        gradedAt: new Date()
      },
      newGrade
    );
  }

  /**
   * Submit the assignment
   */
  public submit(): AssignmentSubmission {
    if (this.status === SubmissionStatus.SUBMITTED) {
      throw new Error('Assignment is already submitted');
    }

    return new AssignmentSubmission(
      this.id,
      this.assignmentId,
      this.studentId,
      this.content,
      this.attachments,
      SubmissionStatus.SUBMITTED,
      this.attemptNumber,
      {
        ...this.metadata,
        submittedAt: new Date(),
        updatedAt: new Date()
      },
      this.grade
    );
  }

  /**
   * Get submission summary
   */
  public getSummary(): SubmissionSummary {
    return {
      id: this.id,
      assignmentId: this.assignmentId,
      status: this.status,
      attemptNumber: this.attemptNumber,
      submittedAt: this.metadata.submittedAt,
      gradedAt: this.metadata.gradedAt,
      grade: this.grade,
      wordCount: this.content.wordCount,
      attachmentCount: this.attachments.length,
      submissionTime: this.getSubmissionTime()
    };
  }
}

/**
 * Submission Metadata
 */
export interface SubmissionMetadata {
  startedAt?: Date;
  submittedAt?: Date;
  gradedAt?: Date;
  updatedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  timeSpent: number; // in milliseconds
}

/**
 * Submission Summary for quick overview
 */
export interface SubmissionSummary {
  id: SubmissionId;
  assignmentId: AssignmentId;
  status: SubmissionStatus;
  attemptNumber: number;
  submittedAt?: Date;
  gradedAt?: Date;
  grade?: Grade;
  wordCount: number;
  attachmentCount: number;
  submissionTime: number;
}