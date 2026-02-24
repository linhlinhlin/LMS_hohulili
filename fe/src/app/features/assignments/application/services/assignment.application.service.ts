import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { AssignmentFilters, StudentId, AssignmentId } from '../../domain/types';
import { GetStudentAssignmentsUseCase, AssignmentListView } from '../use-cases/get-student-assignments.use-case';
import { SubmitAssignmentUseCase, SubmissionResult, DraftResult } from '../use-cases/submit-assignment.use-case';

/**
 * Application Service: Assignment Application Service
 * Orchestrates assignment-related operations using use cases
 * Acts as a facade for the assignment domain
 */
@Injectable({
  providedIn: 'root'
})
export class AssignmentApplicationService {
  private getAssignmentsUseCase = inject(GetStudentAssignmentsUseCase);
  private submitAssignmentUseCase = inject(SubmitAssignmentUseCase);


  /**
   * Get all assignments for a student
   */
  getStudentAssignments(
    studentId: StudentId,
    filters?: AssignmentFilters
  ): Observable<AssignmentListView> {
    return this.getAssignmentsUseCase.execute(studentId, filters);
  }

  /**
   * Get assignments with upcoming deadlines
   */
  getUpcomingDeadlines(
    studentId: StudentId,
    daysAhead: number = 7
  ): Observable<AssignmentListView> {
    return this.getAssignmentsUseCase.getUpcomingDeadlines(studentId, daysAhead);
  }

  /**
   * Get overdue assignments
   */
  getOverdueAssignments(studentId: StudentId): Observable<AssignmentListView> {
    return this.getAssignmentsUseCase.getOverdueAssignments(studentId);
  }

  /**
   * Get high priority assignments
   */
  getHighPriorityAssignments(studentId: StudentId): Observable<AssignmentListView> {
    return this.getAssignmentsUseCase.getHighPriorityAssignments(studentId);
  }

  /**
   * Submit an assignment
   */
  submitAssignment(
    assignmentId: AssignmentId,
    studentId: StudentId,
    content: string,
    attachments: any[] = []
  ): Observable<SubmissionResult> {
    return this.submitAssignmentUseCase.execute(assignmentId, studentId, content, attachments);
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
    return this.submitAssignmentUseCase.saveDraft(assignmentId, studentId, content, attachments);
  }

  /**
   * Get assignment statistics for a student
   */
  getAssignmentStats(studentId: StudentId): Observable<StudentAssignmentStats> {
    return this.getAssignmentsUseCase.execute(studentId).pipe(
      map(assignmentList => {
        const stats = assignmentList.stats;
        const gradedAssignments = assignmentList.assignments.filter(a => a.grade != null);
        const avgGrade = gradedAssignments.length > 0
          ? gradedAssignments.reduce((sum, a) => sum + (a.grade ?? 0), 0) / gradedAssignments.length
          : 0;
        return {
          totalAssignments: stats.total,
          completedAssignments: stats.completed,
          inProgressAssignments: stats.inProgress,
          overdueAssignments: stats.overdue,
          averageGrade: Math.round(avgGrade * 100) / 100,
          completionRate: stats.completionRate,
          averageTimeSpent: 0,
          streakDays: 0
        };
      })
    );
  }

  /**
   * Get assignment recommendations for a student
   */
  getAssignmentRecommendations(studentId: StudentId): Observable<AssignmentRecommendation[]> {
    // Generate recommendations from actual assignment data
    return this.getStudentAssignments(studentId).pipe(
      map(result => {
        return result.assignments
          .filter(a => a.submissionStatus === 'not_submitted')
          .map(a => ({
            assignmentId: a.id,
            priority: a.isOverdue ? 'urgent' : (a.daysUntilDue <= 3 ? 'high' : 'medium'),
            reason: a.isOverdue ? 'Quá hạn - cần nộp ngay' : `Còn ${a.daysUntilDue} ngày`,
            suggestedAction: a.isOverdue ? 'Nộp ngay' : 'Tiếp tục làm bài'
          }) as AssignmentRecommendation)
          .slice(0, 5);
      })
    );
  }
}

/**
 * Application Layer DTOs
 */

export interface StudentAssignmentStats {
  totalAssignments: number;
  completedAssignments: number;
  inProgressAssignments: number;
  overdueAssignments: number;
  averageGrade?: number;
  completionRate: number;
  averageTimeSpent: number;
  streakDays: number;
}

export interface AssignmentRecommendation {
  assignmentId: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reason: string;
  suggestedAction: string;
}
