import { Injectable } from '@angular/core';
import { AssignmentSubmission } from '../entities/submission.entity';
import { SubmissionContent } from '../entities/submission.entity';
import { AssignmentId, StudentId, SubmissionId, FileAttachment, ValidationResult, SubmissionStatus } from '../types';

/**
 * Domain Service: Submission Domain Service
 * Contains business logic for assignment submissions
 */
@Injectable({
  providedIn: 'root'
})
export class SubmissionDomainService {

  /**
   * Create a new submission for an assignment
   */
  createSubmission(
    assignmentId: AssignmentId,
    studentId: StudentId,
    attemptNumber: number = 1
  ): AssignmentSubmission {
    const submissionId = this.generateSubmissionId();
    const now = new Date();

    const content = new SubmissionContent('', 0, now);
    const metadata = {
      startedAt: now,
      updatedAt: now,
      timeSpent: 0
    };

    return new AssignmentSubmission(
      submissionId,
      assignmentId,
      studentId,
      content,
      [],
      SubmissionStatus.DRAFT,
      attemptNumber,
      metadata
    );
  }

  /**
   * Update submission content
   */
  updateSubmissionContent(
    submission: AssignmentSubmission,
    newText: string
  ): AssignmentSubmission {
    const updatedContent = submission.content.withText(newText);
    return submission.withContent(updatedContent);
  }

  /**
   * Add attachment to submission
   */
  addAttachment(
    submission: AssignmentSubmission,
    attachment: FileAttachment
  ): AssignmentSubmission {
    const updatedAttachments = [...submission.attachments, attachment];
    return submission.withAttachments(updatedAttachments);
  }

  /**
   * Remove attachment from submission
   */
  removeAttachment(
    submission: AssignmentSubmission,
    attachmentId: string
  ): AssignmentSubmission {
    const updatedAttachments = submission.attachments.filter(
      att => att.id !== attachmentId
    );
    return submission.withAttachments(updatedAttachments);
  }

  /**
   * Submit the assignment
   */
  submitAssignment(submission: AssignmentSubmission): {
    submission: AssignmentSubmission;
    result: SubmissionResult;
  } {
    const submittedSubmission = submission.submit();

    const result: SubmissionResult = {
      success: true,
      submissionId: submittedSubmission.id,
      submittedAt: submittedSubmission.metadata.submittedAt!,
      attemptNumber: submittedSubmission.attemptNumber,
      timeSpent: submittedSubmission.getSubmissionTime(),
      message: 'Bài tập đã được nộp thành công!'
    };

    return {
      submission: submittedSubmission,
      result
    };
  }

  /**
   * Validate submission before submission
   */
  validateForSubmission(
    submission: AssignmentSubmission,
    minWordCount?: number
  ): ValidationResult {
    return submission.meetsRequirements(minWordCount);
  }

  /**
   * Calculate word count for text
   */
  calculateWordCount(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Check if file is valid for submission
   */
  validateFile(file: File, maxSizeMB: number = 10): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    const allowedTypes = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png'];

    // Check file size
    if (file.size > maxSizeBytes) {
      errors.push(`Kích thước tệp vượt quá ${maxSizeMB}MB`);
    }

    // Check file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension && !allowedTypes.includes(fileExtension)) {
      errors.push(`Loại tệp ${fileExtension} không được hỗ trợ`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create file attachment from File object
   */
  createFileAttachment(file: File): FileAttachment {
    return {
      id: this.generateFileId(),
      name: file.name,
      url: '', // Would be set after upload
      type: file.type.split('/')[1] as any || 'other',
      size: file.size,
      uploadedAt: new Date()
    };
  }

  /**
   * Auto-save draft submission
   */
  autoSaveDraft(submission: AssignmentSubmission): AssignmentSubmission {
    // In a real implementation, this would save to local storage or server
    // For now, just update the timestamp
    const updatedMetadata = {
      ...submission.metadata,
      updatedAt: new Date()
    };

    return new AssignmentSubmission(
      submission.id,
      submission.assignmentId,
      submission.studentId,
      submission.content,
      submission.attachments,
      submission.status,
      submission.attemptNumber,
      updatedMetadata,
      submission.grade
    );
  }

  /**
   * Get submission statistics
   */
  getSubmissionStatistics(submissions: AssignmentSubmission[]): SubmissionStatistics {
    const totalSubmissions = submissions.length;
    const submittedCount = submissions.filter(s => s.status === SubmissionStatus.SUBMITTED || s.status === SubmissionStatus.GRADED).length;
    const gradedCount = submissions.filter(s => s.status === SubmissionStatus.GRADED).length;

    const averageWordCount = submissions.length > 0
      ? submissions.reduce((sum, s) => sum + s.content.wordCount, 0) / submissions.length
      : 0;

    const averageTimeSpent = submissions.length > 0
      ? submissions.reduce((sum, s) => sum + s.getSubmissionTime(), 0) / submissions.length
      : 0;

    const grades = submissions
      .filter(s => s.grade)
      .map(s => s.grade!.score);

    const averageGrade = grades.length > 0
      ? grades.reduce((sum, grade) => sum + grade, 0) / grades.length
      : 0;

    return {
      totalSubmissions,
      submittedCount,
      gradedCount,
      averageWordCount: Math.round(averageWordCount),
      averageTimeSpent: Math.round(averageTimeSpent),
      averageGrade: Math.round(averageGrade * 100) / 100,
      submissionRate: totalSubmissions > 0 ? (submittedCount / totalSubmissions) * 100 : 0,
      gradingRate: totalSubmissions > 0 ? (gradedCount / totalSubmissions) * 100 : 0
    };
  }

  /**
   * Check if student can make another attempt
   */
  canMakeAnotherAttempt(
    existingSubmissions: AssignmentSubmission[],
    maxAttempts: number
  ): boolean {
    return existingSubmissions.length < maxAttempts;
  }

  /**
   * Get next attempt number
   */
  getNextAttemptNumber(existingSubmissions: AssignmentSubmission[]): number {
    return existingSubmissions.length + 1;
  }

  /**
   * Get best submission based on grade
   */
  getBestSubmission(submissions: AssignmentSubmission[]): AssignmentSubmission | null {
    const gradedSubmissions = submissions.filter(s => s.grade);

    if (gradedSubmissions.length === 0) {
      return null;
    }

    return gradedSubmissions.reduce((best, current) =>
      (current.grade!.score > best.grade!.score) ? current : best
    );
  }

  /**
   * Get latest submission
   */
  getLatestSubmission(submissions: AssignmentSubmission[]): AssignmentSubmission | null {
    if (submissions.length === 0) {
      return null;
    }

    return submissions.reduce((latest, current) => {
      const latestTime = latest.metadata.submittedAt || latest.metadata.updatedAt;
      const currentTime = current.metadata.submittedAt || current.metadata.updatedAt;
      return currentTime > latestTime ? current : latest;
    });
  }

  /**
   * Format submission time
   */
  formatSubmissionTime(milliseconds: number): string {
    const totalMinutes = Math.floor(milliseconds / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    return `${minutes}m`;
  }

  /**
   * Generate unique submission ID
   */
  private generateSubmissionId(): SubmissionId {
    return `submission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` as SubmissionId;
  }

  /**
   * Generate unique file ID
   */
  private generateFileId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Submission Result
 */
export interface SubmissionResult {
  success: boolean;
  submissionId: SubmissionId;
  submittedAt: Date;
  attemptNumber: number;
  timeSpent: number;
  message: string;
  errors?: string[];
}

/**
 * Submission Statistics
 */
export interface SubmissionStatistics {
  totalSubmissions: number;
  submittedCount: number;
  gradedCount: number;
  averageWordCount: number;
  averageTimeSpent: number;
  averageGrade: number;
  submissionRate: number;
  gradingRate: number;
}