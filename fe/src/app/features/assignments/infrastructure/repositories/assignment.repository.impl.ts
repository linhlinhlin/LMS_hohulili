import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  AssignmentId,
  StudentId,
  CourseId,
  InstructorId,
  AssignmentFilters,
  AssignmentSortOptions,
  AssignmentStatus,
  AssignmentType,
  PriorityLevel
} from '../../domain/types';
import { IAssignmentRepository } from '../../domain/repositories/assignment.repository';
import { Assignment, AssignmentMetadata } from '../../domain/entities/assignment.entity';
import { AssignmentSpecifications } from '../../domain/value-objects/assignment-specifications';
import { Rubric, RubricCriterion } from '../../domain/value-objects/rubric';
import { AssignmentApi, AssignmentDetail, AssignmentSummary } from '../../../../api/client/assignment.api';

/**
 * Infrastructure Repository: Assignment Repository Implementation
 * Real API implementation connecting to backend
 */
@Injectable({
  providedIn: 'root'
})
export class AssignmentRepositoryImpl implements IAssignmentRepository {
  private assignmentApi = inject(AssignmentApi);

  findById(id: AssignmentId): Observable<Assignment | null> {
    return this.assignmentApi.getAssignmentById(id).pipe(
      map(response => {
        if (response.data) {
          return this.mapDetailToEntity(response.data);
        }
        return null;
      }),
      catchError(err => {
        console.error('Error fetching assignment by id:', err);
        return of(null);
      })
    );
  }

  findByStudentId(
    studentId: StudentId,
    filters?: AssignmentFilters,
    sort?: AssignmentSortOptions
  ): Observable<Assignment[]> {
    // Use teacher-summary endpoint and filter client-side for now
    // TODO: Backend should provide student-specific endpoint
    return this.assignmentApi.getTeacherAssignments({
      status: filters?.status?.[0]
    }).pipe(
      map(response => {
        if (!response.data) return [];
        let assignments = response.data.map(item => this.mapSummaryToEntity(item));
        
        // Apply client-side filters if needed
        if (filters) {
          assignments = this.applyFilters(assignments, filters);
        }
        
        // Apply client-side sorting if needed
        if (sort) {
          assignments = this.applySorting(assignments, sort);
        }
        
        return assignments;
      }),
      catchError(err => {
        console.error('Error fetching assignments by student:', err);
        return of([]);
      })
    );
  }

  findByCourseId(courseId: CourseId): Observable<Assignment[]> {
    return this.assignmentApi.getAssignmentsByCourse(courseId).pipe(
      map(response => {
        if (!response.data) return [];
        return response.data.map(item => this.mapSummaryToEntity(item));
      }),
      catchError(err => {
        console.error('Error fetching assignments by course:', err);
        return of([]);
      })
    );
  }

  findByInstructorId(instructorId: InstructorId): Observable<Assignment[]> {
    return this.assignmentApi.getTeacherAssignments().pipe(
      map(response => {
        if (!response.data) return [];
        return response.data.map(item => this.mapSummaryToEntity(item));
      }),
      catchError(err => {
        console.error('Error fetching assignments by instructor:', err);
        return of([]);
      })
    );
  }

  save(assignment: Assignment): Observable<Assignment> {
    const payload = {
      title: assignment.title,
      description: assignment.description,
      instructions: assignment.instructions,
      dueDate: assignment.specifications.dueDate.toISOString(),
      maxScore: assignment.specifications.maxGrade
    };

    return this.assignmentApi.createAssignment(assignment.courseId, payload).pipe(
      map(response => {
        if (response.data) {
          return this.mapDetailToEntity(response.data);
        }
        throw new Error('Failed to create assignment');
      }),
      catchError(err => {
        console.error('Error saving assignment:', err);
        return throwError(() => new Error('Không thể lưu bài tập. Vui lòng thử lại.'));
      })
    );
  }

  update(id: AssignmentId, updates: Partial<Assignment>): Observable<Assignment> {
    const payload: any = {};
    
    if (updates.title) payload.title = updates.title;
    if (updates.description) payload.description = updates.description;
    if (updates.instructions) payload.instructions = updates.instructions;
    if (updates.specifications?.dueDate) {
      payload.dueDate = updates.specifications.dueDate.toISOString();
    }

    return this.assignmentApi.updateAssignment(id, payload).pipe(
      map(response => {
        if (response.data) {
          return this.mapDetailToEntity(response.data);
        }
        throw new Error('Failed to update assignment');
      }),
      catchError(err => {
        console.error('Error updating assignment:', err);
        return throwError(() => new Error('Không thể cập nhật bài tập. Vui lòng thử lại.'));
      })
    );
  }

  delete(id: AssignmentId): Observable<boolean> {
    return this.assignmentApi.deleteAssignment(id).pipe(
      map(() => true),
      catchError(err => {
        console.error('Error deleting assignment:', err);
        return of(false);
      })
    );
  }

  publish(id: AssignmentId): Observable<Assignment> {
    return this.update(id, { status: AssignmentStatus.PUBLISHED } as any);
  }

  archive(id: AssignmentId): Observable<Assignment> {
    return this.update(id, { status: AssignmentStatus.ARCHIVED } as any);
  }

  findUpcomingDeadlines(studentId: StudentId, daysAhead: number = 7): Observable<Assignment[]> {
    return this.findByStudentId(studentId).pipe(
      map(assignments => {
        const now = new Date();
        const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
        
        return assignments.filter(assignment => {
          const dueDate = assignment.specifications.dueDate;
          return dueDate >= now && dueDate <= futureDate;
        });
      })
    );
  }

  findOverdue(studentId: StudentId): Observable<Assignment[]> {
    return this.findByStudentId(studentId).pipe(
      map(assignments => {
        const now = new Date();
        return assignments.filter(assignment =>
          assignment.specifications.dueDate < now
        );
      })
    );
  }

  findByPriority(studentId: StudentId, priority: 'high' | 'urgent'): Observable<Assignment[]> {
    return this.findByStudentId(studentId).pipe(
      map(assignments => {
        return assignments.filter(assignment =>
          assignment.specifications.priority === priority ||
          (priority === 'urgent' && assignment.specifications.priority === 'high')
        );
      })
    );
  }

  countByStatus(studentId: StudentId): Observable<Record<string, number>> {
    return this.findByStudentId(studentId).pipe(
      map(assignments => {
        const counts: Record<string, number> = {
          draft: 0,
          published: 0,
          archived: 0
        };

        assignments.forEach(assignment => {
          counts[assignment.status] = (counts[assignment.status] || 0) + 1;
        });

        return counts;
      })
    );
  }

  getCompletionStats(studentId: StudentId, courseId?: CourseId): Observable<{
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
    completionRate: number;
  }> {
    const source$ = courseId 
      ? this.findByCourseId(courseId)
      : this.findByStudentId(studentId);

    return source$.pipe(
      map(assignments => {
        const total = assignments.length;
        const now = new Date();
        
        // Calculate based on status and due dates
        const overdue = assignments.filter(a => 
          a.specifications.dueDate < now && a.status !== AssignmentStatus.ARCHIVED
        ).length;
        
        const completed = assignments.filter(a => 
          a.status === AssignmentStatus.ARCHIVED
        ).length;
        
        const inProgress = total - completed - overdue;

        return {
          total,
          completed,
          inProgress: Math.max(0, inProgress),
          overdue,
          completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
        };
      })
    );
  }

  // Helper: Map API AssignmentSummary to Domain Entity
  private mapSummaryToEntity(summary: AssignmentSummary): Assignment {
    const now = new Date();
    // Set due date to future to avoid validation error
    const dueDate = summary.dueDate 
      ? new Date(summary.dueDate) 
      : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Ensure due date is in the future for validation
    const safeDueDate = dueDate > now ? dueDate : new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    const specifications = new AssignmentSpecifications(
      AssignmentType.ASSIGNMENT, // default type
      safeDueDate,
      100, // default max grade
      1, // default max attempts
      undefined, // time limit
      undefined, // word count
      PriorityLevel.MEDIUM // default priority
    );

    // Create rubric with default criterion
    const defaultCriterion = new RubricCriterion('default', 'Điểm tổng', 100, 1);
    const rubric = new Rubric([defaultCriterion]);

    const metadata: AssignmentMetadata = {
      createdAt: new Date(summary.createdAt),
      updatedAt: summary.updatedAt ? new Date(summary.updatedAt) : new Date(summary.createdAt),
      createdBy: 'unknown' as InstructorId,
      version: 1,
      tags: [],
      isActive: true
    };

    return new Assignment(
      summary.id as AssignmentId,
      summary.title,
      summary.description || 'Không có mô tả',
      summary.courseId as CourseId,
      'unknown' as InstructorId,
      specifications,
      rubric,
      this.mapStatus(summary.status),
      'Xem chi tiết bài tập', // default instructions
      [],
      metadata
    );
  }

  // Helper: Map API AssignmentDetail to Domain Entity
  private mapDetailToEntity(detail: AssignmentDetail): Assignment {
    const now = new Date();
    const dueDate = detail.dueDate 
      ? new Date(detail.dueDate) 
      : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Ensure due date is in the future for validation
    const safeDueDate = dueDate > now ? dueDate : new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    const specifications = new AssignmentSpecifications(
      AssignmentType.ASSIGNMENT,
      safeDueDate,
      detail.maxPoints || 100,
      1,
      undefined, // time limit
      undefined, // word count
      PriorityLevel.MEDIUM
    );

    // Create rubric with default criterion
    const defaultCriterion = new RubricCriterion('default', 'Điểm tổng', detail.maxPoints || 100, 1);
    const rubric = new Rubric([defaultCriterion]);

    const metadata: AssignmentMetadata = {
      createdAt: new Date(detail.createdAt),
      updatedAt: detail.updatedAt ? new Date(detail.updatedAt) : new Date(detail.createdAt),
      createdBy: 'unknown' as InstructorId,
      version: 1,
      tags: [],
      isActive: true
    };

    const attachments = (detail.attachments || []).map(att => ({
      id: att.fileId,
      name: att.fileName,
      url: att.fileUrl,
      type: 'pdf' as const,
      size: 0,
      uploadedAt: new Date()
    }));

    return new Assignment(
      detail.id as AssignmentId,
      detail.title,
      detail.description || 'Không có mô tả',
      detail.courseId as CourseId,
      'unknown' as InstructorId,
      specifications,
      rubric,
      this.mapStatus(detail.status),
      detail.instructions || 'Xem chi tiết bài tập',
      attachments,
      metadata
    );
  }

  // Helper: Map API status to domain status
  private mapStatus(apiStatus: string): AssignmentStatus {
    switch (apiStatus) {
      case 'published':
        return AssignmentStatus.PUBLISHED;
      case 'closed':
      case 'archived':
        return AssignmentStatus.ARCHIVED;
      case 'pending':
      case 'draft':
      default:
        return AssignmentStatus.DRAFT;
    }
  }

  // Client-side filtering (for cases where server doesn't support all filters)
  private applyFilters(assignments: Assignment[], filters: AssignmentFilters): Assignment[] {
    return assignments.filter(assignment => {
      if (filters.status && !filters.status.includes(assignment.status)) {
        return false;
      }
      if (filters.type && !filters.type.includes(assignment.specifications.type)) {
        return false;
      }
      if (filters.courseId && !filters.courseId.includes(assignment.courseId)) {
        return false;
      }
      if (filters.instructorId && !filters.instructorId.includes(assignment.instructorId)) {
        return false;
      }
      return true;
    });
  }

  // Client-side sorting (for cases where server doesn't support all sort options)
  private applySorting(assignments: Assignment[], sort: AssignmentSortOptions): Assignment[] {
    return [...assignments].sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sort.field) {
        case 'dueDate':
          aValue = a.specifications.dueDate.getTime();
          bValue = b.specifications.dueDate.getTime();
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        default:
          aValue = a.metadata.createdAt.getTime();
          bValue = b.metadata.createdAt.getTime();
      }

      if (sort.direction === 'desc') {
        return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });
  }
}
