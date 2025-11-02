import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AssignmentId, StudentId, SubmissionId } from '../../domain/types';
import { SubmissionDomainService } from '../../domain/services/submission-domain.service';

/**
 * Use Case: Submit Assignment
 * Handles the submission of assignments by students
 */
@Injectable({
  providedIn: 'root'
})
export class SubmitAssignmentUseCase {
  constructor(
    private submissionDomainService: SubmissionDomainService
  ) {}

  /**
   * Execute assignment submission
   */
  execute(
    assignmentId: AssignmentId,
    studentId: StudentId,
    content: string,
    attachments: any[] = []
  ): Observable<SubmissionResult> {
    // Validate submission requirements
    const validation = this.validateSubmission(content, attachments);
    if (!validation.isValid) {
      return of({
        success: false,
        assignmentId,
        studentId,
        errors: validation.errors,
        message: 'Submission validation failed'
      });
    }

    // Create submission content
    const submissionContent = this.submissionDomainService.calculateWordCount(content);

    // Create submission
    const submission = this.submissionDomainService.createSubmission(
      assignmentId,
      studentId,
      1 // attempt number - would be calculated in real implementation
    );

    // Update content
    const updatedSubmission = this.submissionDomainService.updateSubmissionContent(
      submission,
      content
    );

    // Add attachments if any
    let finalSubmission = updatedSubmission;
    if (attachments.length > 0) {
      // Convert attachments to proper format
      const fileAttachments = attachments.map(att => ({
        id: `file_${Date.now()}_${Math.random()}`,
        name: att.name,
        url: att.url || '',
        type: att.type,
        size: att.size,
        uploadedAt: new Date()
      }));

      finalSubmission = this.submissionDomainService.addAttachment(
        updatedSubmission,
        fileAttachments[0] // Simplified - would handle multiple
      );
    }

    // Submit the assignment
    const result = this.submissionDomainService.submitAssignment(finalSubmission);

    return of({
      success: true,
      assignmentId,
      studentId,
      submissionId: result.submission.id,
      submittedAt: result.result.submittedAt,
      attemptNumber: result.result.attemptNumber,
      timeSpent: result.result.timeSpent,
      message: result.result.message
    });
  }

  /**
   * Save draft submission
   */
  saveDraft(
    assignmentId: AssignmentId,
    studentId: StudentId,
    content: string,
    attachments: any[] = []
  ): Observable<DraftResult> {
    // Create or update draft submission
    const submission = this.submissionDomainService.createSubmission(
      assignmentId,
      studentId,
      1
    );

    const updatedSubmission = this.submissionDomainService.updateSubmissionContent(
      submission,
      content
    );

    // Auto-save draft
    const savedSubmission = this.submissionDomainService.autoSaveDraft(updatedSubmission);

    return of({
      success: true,
      assignmentId,
      studentId,
      submissionId: savedSubmission.id,
      savedAt: savedSubmission.metadata.updatedAt!,
      message: 'Draft saved successfully'
    });
  }

  /**
   * Validate submission before processing
   */
  private validateSubmission(content: string, attachments: any[]): ValidationResult {
    const errors: string[] = [];

    // Check content
    if (!content || content.trim().length === 0) {
      errors.push('Submission content cannot be empty');
    }

    // Check minimum word count (would be configurable)
    const wordCount = this.submissionDomainService.calculateWordCount(content);
    if (wordCount < 10) { // Minimum 10 words
      errors.push('Submission must contain at least 10 words');
    }

    // Check file sizes
    attachments.forEach(att => {
      if (att.size > 10 * 1024 * 1024) { // 10MB limit
        errors.push(`File ${att.name} exceeds size limit of 10MB`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Result interfaces
 */

export interface SubmissionResult {
  success: boolean;
  assignmentId: AssignmentId;
  studentId: StudentId;
  submissionId?: SubmissionId;
  submittedAt?: Date;
  attemptNumber?: number;
  timeSpent?: number;
  message: string;
  errors?: string[];
}

export interface DraftResult {
  success: boolean;
  assignmentId: AssignmentId;
  studentId: StudentId;
  submissionId: SubmissionId;
  savedAt: Date;
  message: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}