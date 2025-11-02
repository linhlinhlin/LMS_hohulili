import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AssignmentFilters, StudentId, DeadlineStatus, PriorityLevel } from '../../domain/types';
import { AssignmentDomainService } from '../../domain/services/assignment-domain.service';

/**
 * Use Case: Get Student Assignments
 * Orchestrates the retrieval of assignments for a student with progress and submission data
 *
 * Note: In a full implementation, this would inject repository interfaces.
 * For now, using mock data to demonstrate the pattern.
 */
@Injectable({
  providedIn: 'root'
})
export class GetStudentAssignmentsUseCase {
  constructor(
    private assignmentDomainService: AssignmentDomainService
  ) {}

  /**
   * Execute the use case - Get all assignments for a student
   */
  execute(studentId: StudentId, filters?: AssignmentFilters): Observable<AssignmentListView> {
    // Mock data - in real implementation, this would come from repositories
    const mockAssignments = this.getMockAssignments();

    // Apply filters
    let filteredAssignments = mockAssignments;
    if (filters) {
      filteredAssignments = this.applyFilters(mockAssignments, filters);
    }

    // Transform to view models
    const assignmentViews = filteredAssignments.map(assignment =>
      this.transformToAssignmentView(assignment)
    );

    // Calculate statistics
    const stats = this.calculateAssignmentStats(assignmentViews);

    return of({
      assignments: assignmentViews,
      stats,
      filters: filters || {},
      totalCount: assignmentViews.length
    });
  }

  /**
   * Get assignments with upcoming deadlines
   */
  getUpcomingDeadlines(studentId: StudentId, daysAhead: number = 7): Observable<AssignmentListView> {
    const mockAssignments = this.getMockAssignments();
    const upcomingAssignments = mockAssignments.filter(assignment => {
      const daysUntilDue = assignment.daysUntilDue;
      return daysUntilDue >= 0 && daysUntilDue <= daysAhead;
    });

    const assignmentViews = upcomingAssignments.map(assignment =>
      this.transformToAssignmentView(assignment)
    );

    return of({
      assignments: assignmentViews,
      stats: this.calculateAssignmentStats(assignmentViews),
      filters: { deadlineStatus: [DeadlineStatus.DUE_SOON] },
      totalCount: assignmentViews.length
    });
  }

  /**
   * Get overdue assignments
   */
  getOverdueAssignments(studentId: StudentId): Observable<AssignmentListView> {
    const mockAssignments = this.getMockAssignments();
    const overdueAssignments = mockAssignments.filter(assignment => assignment.isOverdue);

    const assignmentViews = overdueAssignments.map(assignment =>
      this.transformToAssignmentView(assignment)
    );

    return of({
      assignments: assignmentViews,
      stats: this.calculateAssignmentStats(assignmentViews),
      filters: { deadlineStatus: [DeadlineStatus.OVERDUE] },
      totalCount: assignmentViews.length
    });
  }

  /**
   * Get high priority assignments
   */
  getHighPriorityAssignments(studentId: StudentId): Observable<AssignmentListView> {
    const mockAssignments = this.getMockAssignments();
    const highPriorityAssignments = mockAssignments.filter(assignment =>
      assignment.priority === 'high' || assignment.priority === 'urgent'
    );

    const assignmentViews = highPriorityAssignments.map(assignment =>
      this.transformToAssignmentView(assignment)
    );

    return of({
      assignments: assignmentViews,
      stats: this.calculateAssignmentStats(assignmentViews),
      filters: { priority: [PriorityLevel.HIGH, PriorityLevel.URGENT] },
      totalCount: assignmentViews.length
    });
  }

  /**
   * Transform assignment entity to view model
   */
  private transformToAssignmentView(assignment: any): AssignmentView {
    return {
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      courseId: assignment.courseId,
      courseName: assignment.courseName,
      instructorName: assignment.instructorName,
      type: assignment.type,
      status: assignment.status,
      priority: assignment.priority,
      dueDate: assignment.dueDate,
      daysUntilDue: assignment.daysUntilDue,
      isOverdue: assignment.isOverdue,
      urgencyLevel: assignment.urgencyLevel,
      maxGrade: assignment.maxGrade,
      timeLimit: assignment.timeLimit,
      wordCount: assignment.wordCount,
      progressPercentage: assignment.progressPercentage,
      submissionStatus: assignment.submissionStatus,
      grade: assignment.grade,
      submittedAt: assignment.submittedAt,
      lastAccessed: assignment.lastAccessed,
      attachmentsCount: assignment.attachmentsCount,
      hasRubric: assignment.hasRubric
    };
  }

  /**
   * Get mock assignments data
   */
  private getMockAssignments(): any[] {
    const now = new Date();
    return [
      {
        id: 'assignment-1',
        title: 'Bài tập về Cấu trúc Tàu biển',
        description: 'Phân tích cấu trúc tàu container và trình bày báo cáo chi tiết',
        courseId: 'course-1',
        courseName: 'Kỹ thuật Tàu biển Cơ bản',
        instructorName: 'ThS. Nguyễn Văn Hải',
        type: 'assignment',
        status: 'published',
        priority: 'high',
        dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        daysUntilDue: 3,
        isOverdue: false,
        urgencyLevel: 'high',
        maxGrade: 100,
        timeLimit: 120,
        wordCount: 2000,
        progressPercentage: 75,
        submissionStatus: 'submitted',
        submittedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        lastAccessed: new Date(),
        attachmentsCount: 2,
        hasRubric: true
      },
      {
        id: 'assignment-2',
        title: 'Quiz về An toàn Hàng hải',
        description: 'Bài kiểm tra kiến thức an toàn hàng hải cơ bản',
        courseId: 'course-2',
        courseName: 'An toàn Hàng hải Quốc tế',
        instructorName: 'TS. Phạm Văn Nam',
        type: 'quiz',
        status: 'published',
        priority: 'medium',
        dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        daysUntilDue: 7,
        isOverdue: false,
        urgencyLevel: 'medium',
        maxGrade: 100,
        timeLimit: 45,
        progressPercentage: 0,
        submissionStatus: 'not_submitted',
        attachmentsCount: 0,
        hasRubric: false
      },
      {
        id: 'assignment-3',
        title: 'Dự án Quản lý Cảng biển',
        description: 'Thiết kế hệ thống quản lý container tại cảng biển',
        courseId: 'course-3',
        courseName: 'Quản lý Cảng biển',
        instructorName: 'ThS. Trần Thị Lan',
        type: 'project',
        status: 'published',
        priority: 'urgent',
        dueDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago (overdue)
        daysUntilDue: -2,
        isOverdue: true,
        urgencyLevel: 'critical',
        maxGrade: 100,
        timeLimit: 300,
        wordCount: 5000,
        progressPercentage: 30,
        submissionStatus: 'in_progress',
        lastAccessed: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
        attachmentsCount: 3,
        hasRubric: true
      }
    ];
  }

  /**
   * Apply filters to assignments
   */
  private applyFilters(assignments: any[], filters: AssignmentFilters): any[] {
    return assignments.filter(assignment => {
      if (filters.status && !filters.status.includes(assignment.status)) {
        return false;
      }
      if (filters.type && !filters.type.includes(assignment.type)) {
        return false;
      }
      if (filters.priority && !filters.priority.includes(assignment.priority)) {
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
    const inProgress = assignments.filter(a => a.progressPercentage > 0 && a.progressPercentage < 100).length;
    const overdue = assignments.filter(a => a.isOverdue).length;
    const submitted = assignments.filter(a => a.submissionStatus === 'submitted' || a.submissionStatus === 'graded').length;

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
  grade?: any; // Would be Grade type
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