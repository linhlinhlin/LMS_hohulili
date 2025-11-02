import { Injectable } from '@angular/core';
import { Assignment } from '../entities/assignment.entity';
import { AssignmentProgress } from '../entities/progress.entity';
import { AssignmentSpecifications } from '../value-objects/assignment-specifications';
import { ValidationResult, DeadlineStatus, ProgressStatus } from '../types';

/**
 * Domain Service: Assignment Domain Service
 * Contains business logic that spans multiple assignment-related entities
 */
@Injectable({
  providedIn: 'root'
})
export class AssignmentDomainService {

  /**
   * Calculate progress for an assignment based on submissions and time spent
   */
  calculateProgress(
    assignment: Assignment,
    submissions: any[], // Would be AssignmentSubmission[] in full implementation
    timeSpent: number,
    lastAccessed: Date
  ): AssignmentProgress {
    // Calculate completion percentage based on submissions
    let completionPercentage = 0;

    if (submissions.length > 0) {
      const latestSubmission = submissions[submissions.length - 1];
      if (latestSubmission.status === 'submitted' || latestSubmission.status === 'graded') {
        completionPercentage = 90; // Submitted but not graded
      }
      if (latestSubmission.status === 'graded') {
        completionPercentage = 100; // Fully completed
      }
    } else if (timeSpent > 0) {
      // Estimate progress based on time spent vs expected time
      const expectedTime = assignment.specifications.timeLimitMinutes ?
        assignment.specifications.timeLimitMinutes * 60 * 1000 : 3600000; // 1 hour default
      completionPercentage = Math.min(50, (timeSpent / expectedTime) * 50); // Max 50% without submission
    }

    // Determine status
    let status = ProgressStatus.NOT_STARTED;
    if (completionPercentage > 0) {
      status = completionPercentage === 100 ? ProgressStatus.COMPLETED : ProgressStatus.IN_PROGRESS;
    }

    // Check if overdue
    if (assignment.isOverdue() && status !== ProgressStatus.COMPLETED) {
      status = ProgressStatus.OVERDUE;
    }

    return new AssignmentProgress(
      assignment.id,
      'student-id' as any, // Would come from context
      status,
      timeSpent,
      completionPercentage,
      lastAccessed
    );
  }

  /**
   * Validate assignment submission
   */
  validateSubmission(
    assignment: Assignment,
    submission: any // Would be AssignmentSubmission in full implementation
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if assignment is published
    if (!assignment.isPublished()) {
      errors.push('Bài tập chưa được xuất bản');
    }

    // Check if assignment allows submissions
    if (!assignment.canBeSubmitted(submission.attemptNumber || 1)) {
      errors.push('Không thể nộp bài tập này');
    }

    // Check word count requirement
    if (assignment.hasWordCountRequirement()) {
      const minWords = assignment.specifications.wordCount!;
      const actualWords = submission.content?.wordCount || 0;

      if (actualWords < minWords) {
        errors.push(`Nội dung phải có ít nhất ${minWords} từ (hiện tại: ${actualWords})`);
      }
    }

    // Check file size limits
    const maxFileSize = assignment.getAttachmentSizeLimit() * 1024 * 1024; // Convert to bytes
    submission.attachments?.forEach((file: any) => {
      if (file.size > maxFileSize) {
        errors.push(`Tệp ${file.name} vượt quá kích thước cho phép (${assignment.getAttachmentSizeLimit()}MB)`);
      }
    });

    // Check file types
    const allowedTypes = assignment.getAllowedFileTypes();
    submission.attachments?.forEach((file: any) => {
      const fileType = file.name.split('.').pop()?.toLowerCase();
      if (fileType && !allowedTypes.includes(fileType)) {
        errors.push(`Loại tệp ${fileType} không được hỗ trợ`);
      }
    });

    // Warnings for best practices
    if (!submission.attachments || submission.attachments.length === 0) {
      warnings.push('Nên đính kèm tệp hỗ trợ cho bài làm');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Calculate grade for a submission
   */
  calculateGrade(
    submission: any, // Would be AssignmentSubmission
    rubricScores: Map<string, number>
  ): { score: number; percentage: number; feedback: string } {
    // This would use the rubric to calculate grades
    // For now, return a mock calculation
    const totalScore = Array.from(rubricScores.values()).reduce((sum, score) => sum + score, 0);
    const maxScore = 100; // Would come from rubric
    const percentage = (totalScore / maxScore) * 100;

    let feedback = 'Bài làm ';
    if (percentage >= 90) {
      feedback += 'xuất sắc!';
    } else if (percentage >= 80) {
      feedback += 'tốt!';
    } else if (percentage >= 70) {
      feedback += 'khá!';
    } else if (percentage >= 60) {
      feedback += 'đạt yêu cầu!';
    } else {
      feedback += 'cần cải thiện!';
    }

    return {
      score: Math.round(totalScore * 100) / 100,
      percentage: Math.round(percentage * 100) / 100,
      feedback
    };
  }

  /**
   * Check deadline status for an assignment
   */
  checkDeadlineStatus(assignment: Assignment, currentDate: Date = new Date()): DeadlineStatus {
    if (assignment.isOverdue(currentDate)) {
      return DeadlineStatus.OVERDUE;
    }

    if (assignment.isDueSoon(3, currentDate)) {
      return DeadlineStatus.DUE_SOON;
    }

    return DeadlineStatus.UPCOMING;
  }

  /**
   * Get assignment priority based on deadline and other factors
   */
  calculateAssignmentPriority(
    assignment: Assignment,
    studentProgress?: AssignmentProgress,
    currentDate: Date = new Date()
  ): 'low' | 'medium' | 'high' | 'urgent' {
    // High priority if due soon and not started
    if (assignment.isDueSoon(3, currentDate) && (!studentProgress || !studentProgress.isStarted())) {
      return 'urgent';
    }

    // High priority if overdue
    if (assignment.isOverdue(currentDate)) {
      return 'urgent';
    }

    // Medium priority if in progress
    if (studentProgress?.isInProgress()) {
      return 'high';
    }

    // Low priority for assignments due in more than a week
    if (assignment.specifications.getDaysUntilDue(currentDate) > 7) {
      return 'low';
    }

    return 'medium';
  }

  /**
   * Generate assignment recommendations for a student
   */
  generateRecommendations(
    assignments: Assignment[],
    studentProgress: Map<string, AssignmentProgress>,
    currentDate: Date = new Date()
  ): AssignmentRecommendation[] {
    const recommendations: AssignmentRecommendation[] = [];

    assignments.forEach(assignment => {
      const progress = studentProgress.get(assignment.id);
      const priority = this.calculateAssignmentPriority(assignment, progress, currentDate);

      if (priority === 'urgent' || priority === 'high') {
        let reason = '';

        if (assignment.isOverdue(currentDate)) {
          reason = 'Đã quá hạn - cần nộp ngay!';
        } else if (assignment.isDueSoon(3, currentDate)) {
          reason = `Sắp đến hạn (${assignment.specifications.getDaysUntilDue(currentDate)} ngày nữa)`;
        } else if (progress?.isInProgress()) {
          reason = 'Đang làm dở - tiếp tục hoàn thành';
        }

        recommendations.push({
          assignmentId: assignment.id,
          priority,
          reason,
          suggestedAction: this.getSuggestedAction(assignment, progress)
        });
      }
    });

    // Sort by priority
    recommendations.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    return recommendations;
  }

  /**
   * Get suggested action for an assignment
   */
  private getSuggestedAction(
    assignment: Assignment,
    progress?: AssignmentProgress
  ): string {
    if (!progress || !progress.isStarted()) {
      return 'Bắt đầu làm bài';
    }

    if (progress.isInProgress()) {
      return 'Tiếp tục làm bài';
    }

    if (progress.isCompleted()) {
      return 'Xem kết quả';
    }

    return 'Bắt đầu làm bài';
  }

  /**
   * Calculate study time estimates
   */
  estimateStudyTime(assignment: Assignment): {
    estimatedMinutes: number;
    breakdown: { preparation: number; work: number; review: number };
  } {
    // Base estimation based on assignment type and specifications
    let baseMinutes = 60; // 1 hour default

    // Adjust based on type
    switch (assignment.specifications.type) {
      case 'quiz':
        baseMinutes = 45;
        break;
      case 'assignment':
        baseMinutes = 120;
        break;
      case 'project':
        baseMinutes = 300;
        break;
      case 'discussion':
        baseMinutes = 30;
        break;
    }

    // Adjust based on difficulty (from rubric complexity)
    const rubricComplexity = assignment.rubric.criteria.length;
    if (rubricComplexity > 5) {
      baseMinutes *= 1.3;
    }

    // Adjust based on time limit
    if (assignment.specifications.timeLimitMinutes) {
      baseMinutes = Math.max(baseMinutes, assignment.specifications.timeLimitMinutes * 0.8);
    }

    // Breakdown
    const preparation = Math.round(baseMinutes * 0.2);
    const work = Math.round(baseMinutes * 0.7);
    const review = Math.round(baseMinutes * 0.1);

    return {
      estimatedMinutes: preparation + work + review,
      breakdown: { preparation, work, review }
    };
  }
}

/**
 * Assignment Recommendation
 */
export interface AssignmentRecommendation {
  assignmentId: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reason: string;
  suggestedAction: string;
}