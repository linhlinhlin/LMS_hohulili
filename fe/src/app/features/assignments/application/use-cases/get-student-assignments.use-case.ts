import { Injectable, inject } from '@angular/core';
import { Observable, of, map, catchError } from 'rxjs';
import { AssignmentFilters, StudentId, DeadlineStatus, PriorityLevel } from '../../domain/types';
import { AssignmentApi, StudentAssignmentResponse } from '../../../../api/client/assignment.api';

/**
 * Use Case: Get Student Assignments
 * Retrieves assignments from real backend API (StudentAssignmentControllerV3).
 */
@Injectable({
  providedIn: 'root'
})
export class GetStudentAssignmentsUseCase {
  private assignmentApi = inject(AssignmentApi);

  /**
   * Execute the use case - Get all assignments for a student
   */
  execute(studentId: StudentId, filters?: AssignmentFilters): Observable<AssignmentListView> {
    return this.assignmentApi.getStudentAssignments().pipe(
      map(response => {
        const items = response.data || [];
        let assignmentViews = items.map(item => this.transformToAssignmentView(item));

        // Apply client-side filters
        if (filters) {
          assignmentViews = this.applyFilters(assignmentViews, filters);
        }

        const stats = this.calculateAssignmentStats(assignmentViews);

        return {
          assignments: assignmentViews,
          stats,
          filters: filters || {},
          totalCount: assignmentViews.length
        };
      }),
      catchError(() => of({
        assignments: [],
        stats: this.emptyStats(),
        filters: filters || {},
        totalCount: 0
      }))
    );
  }

  /**
   * Get assignments with upcoming deadlines
   */
  getUpcomingDeadlines(studentId: StudentId, daysAhead: number = 7): Observable<AssignmentListView> {
    return this.execute(studentId).pipe(
      map(result => {
        const upcoming = result.assignments.filter(a => {
          return a.daysUntilDue >= 0 && a.daysUntilDue <= daysAhead;
        });
        return {
          assignments: upcoming,
          stats: this.calculateAssignmentStats(upcoming),
          filters: { deadlineStatus: [DeadlineStatus.DUE_SOON] },
          totalCount: upcoming.length
        };
      })
    );
  }

  /**
   * Get overdue assignments
   */
  getOverdueAssignments(studentId: StudentId): Observable<AssignmentListView> {
    return this.execute(studentId).pipe(
      map(result => {
        const overdue = result.assignments.filter(a => a.isOverdue);
        return {
          assignments: overdue,
          stats: this.calculateAssignmentStats(overdue),
          filters: { deadlineStatus: [DeadlineStatus.OVERDUE] },
          totalCount: overdue.length
        };
      })
    );
  }

  /**
   * Get high priority assignments
   */
  getHighPriorityAssignments(studentId: StudentId): Observable<AssignmentListView> {
    return this.execute(studentId).pipe(
      map(result => {
        const highPriority = result.assignments.filter(a =>
          a.priority === 'high' || a.priority === 'urgent'
        );
        return {
          assignments: highPriority,
          stats: this.calculateAssignmentStats(highPriority),
          filters: { priority: [PriorityLevel.HIGH, PriorityLevel.URGENT] },
          totalCount: highPriority.length
        };
      })
    );
  }

  /**
   * Transform API response to view model
   */
  private transformToAssignmentView(item: StudentAssignmentResponse): AssignmentView {
    const now = new Date();
    const dueDate = item.dueDate ? new Date(item.dueDate) : null;
    const daysUntilDue = dueDate
      ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    const isOverdue = item.isLate || (dueDate !== null && dueDate < now && item.status === 'NOT_SUBMITTED');

    // Map BE status to FE submission status
    const submissionStatus = this.mapSubmissionStatus(item.status);

    // Calculate priority based on deadline proximity
    let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
    if (isOverdue) priority = 'urgent';
    else if (daysUntilDue <= 2) priority = 'high';
    else if (daysUntilDue <= 7) priority = 'medium';
    else priority = 'low';

    return {
      id: item.id,
      title: item.title,
      description: item.description || item.instructions || '',
      courseId: item.courseId,
      courseName: item.courseName,
      instructorName: '',
      type: 'assignment',
      status: 'published',
      priority,
      dueDate: dueDate || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      daysUntilDue,
      isOverdue,
      urgencyLevel: priority,
      maxGrade: item.maxScore,
      progressPercentage: submissionStatus === 'graded' ? 100 : submissionStatus === 'submitted' ? 80 : 0,
      submissionStatus,
      grade: item.score,
      submittedAt: item.submittedAt ? new Date(item.submittedAt) : undefined,
      lastAccessed: undefined,
      attachmentsCount: 0,
      hasRubric: false
    };
  }

  private mapSubmissionStatus(status: string): string {
    switch (status) {
      case 'GRADED': return 'graded';
      case 'SUBMITTED':
      case 'RESUBMITTED': return 'submitted';
      case 'LATE': return 'late';
      case 'NOT_SUBMITTED':
      default: return 'not_submitted';
    }
  }

  /**
   * Apply filters to assignments
   */
  private applyFilters(assignments: AssignmentView[], filters: AssignmentFilters): AssignmentView[] {
    return assignments.filter(assignment => {
      if (filters.status && !filters.status.includes(assignment.status as any)) {
        return false;
      }
      if (filters.type && !filters.type.includes(assignment.type as any)) {
        return false;
      }
      if (filters.priority && !filters.priority.includes(assignment.priority as any)) {
        return false;
      }
      return true;
    });
  }

  /**
   * Calculate assignment statistics
   */
  private calculateAssignmentStats(assignments: AssignmentView[]): AssignmentStats {
    const total = assignments.length;
    const completed = assignments.filter(a => a.submissionStatus === 'graded').length;
    const inProgress = assignments.filter(a => a.submissionStatus === 'submitted' || a.submissionStatus === 'late').length;
    const overdue = assignments.filter(a => a.isOverdue).length;
    const submitted = assignments.filter(a => a.submissionStatus !== 'not_submitted').length;

    return {
      total,
      completed,
      inProgress,
      overdue,
      submitted,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      submissionRate: total > 0 ? Math.round((submitted / total) * 100) : 0,
      overdueRate: total > 0 ? Math.round((overdue / total) * 100) : 0
    };
  }

  private emptyStats(): AssignmentStats {
    return { total: 0, completed: 0, inProgress: 0, overdue: 0, submitted: 0, completionRate: 0, submissionRate: 0, overdueRate: 0 };
  }
}

/**
 * View Models for the Application Layer
 */

export interface AssignmentListView {
  assignments: AssignmentView[];
  stats: AssignmentStats;
  filters: AssignmentFilters;
  totalCount: number;
}

export interface AssignmentView {
  id: string;
  title: string;
  description: string;
  courseId: string;
  courseName: string;
  instructorName: string;
  type: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: Date;
  daysUntilDue: number;
  isOverdue: boolean;
  urgencyLevel: string;
  maxGrade: number;
  timeLimit?: number;
  wordCount?: number;
  progressPercentage: number;
  submissionStatus: string;
  grade?: any;
  submittedAt?: Date;
  lastAccessed?: Date;
  attachmentsCount: number;
  hasRubric: boolean;
}

export interface AssignmentStats {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  submitted: number;
  completionRate: number;
  submissionRate: number;
  overdueRate: number;
}
