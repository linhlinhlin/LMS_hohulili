import { Injectable } from '@angular/core';
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

  constructor(
    private getAssignmentsUseCase: GetStudentAssignmentsUseCase,
    private submitAssignmentUseCase: SubmitAssignmentUseCase
  ) {}

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
        return {
          totalAssignments: stats.total,
          completedAssignments: stats.completed,
          inProgressAssignments: stats.inProgress,
          overdueAssignments: stats.overdue,
          averageGrade: 85, // Mock data
          completionRate: stats.completionRate,
          averageTimeSpent: 120, // Mock data in minutes
          streakDays: 5 // Mock data
        };
      })
    );
  }

  /**
   * Get assignment recommendations for a student
   */
  getAssignmentRecommendations(studentId: StudentId): Observable<AssignmentRecommendation[]> {
    // Would use domain service to generate recommendations
    // For now, return mock data
    return new Observable(observer => {
      const recommendations: AssignmentRecommendation[] = [
        {
          assignmentId: 'assignment-1',
          priority: 'high',
          reason: 'Due in 3 days',
          suggestedAction: 'Continue working'
        },
        {
          assignmentId: 'assignment-3',
          priority: 'urgent',
          reason: 'Overdue - submit immediately',
          suggestedAction: 'Submit now'
        }
      ];

      observer.next(recommendations);
      observer.complete();
    });
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