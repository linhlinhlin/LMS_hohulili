import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  AssignmentId,
  StudentId,
  CourseId,
  InstructorId,
  AssignmentFilters,
  AssignmentSortOptions,
  PaginatedResult
} from '../../domain/types';
import { IAssignmentRepository } from '../../domain/repositories/assignment.repository';
import { Assignment } from '../../domain/entities/assignment.entity';

/**
 * Infrastructure Repository: Assignment Repository Implementation
 * Mock implementation for demonstration
 * In a real application, this would connect to an API or database
 */
@Injectable({
  providedIn: 'root'
})
export class AssignmentRepositoryImpl implements IAssignmentRepository {

  private mockAssignments: Assignment[] = [];

  constructor() {
    this.initializeMockData();
  }

  findById(id: AssignmentId): Observable<Assignment | null> {
    const assignment = this.mockAssignments.find(a => a.id === id) || null;
    return of(assignment).pipe(delay(100)); // Simulate network delay
  }

  findByStudentId(
    studentId: StudentId,
    filters?: AssignmentFilters,
    sort?: AssignmentSortOptions
  ): Observable<Assignment[]> {
    let assignments = [...this.mockAssignments];

    // Apply filters
    if (filters) {
      assignments = this.applyFilters(assignments, filters);
    }

    // Apply sorting
    if (sort) {
      assignments = this.applySorting(assignments, sort);
    }

    return of(assignments).pipe(delay(150));
  }

  findByCourseId(courseId: CourseId): Observable<Assignment[]> {
    const assignments = this.mockAssignments.filter(a => a.courseId === courseId);
    return of(assignments).pipe(delay(100));
  }

  findByInstructorId(instructorId: InstructorId): Observable<Assignment[]> {
    const assignments = this.mockAssignments.filter(a => a.instructorId === instructorId);
    return of(assignments).pipe(delay(100));
  }

  save(assignment: Assignment): Observable<Assignment> {
    const existingIndex = this.mockAssignments.findIndex(a => a.id === assignment.id);
    if (existingIndex >= 0) {
      this.mockAssignments[existingIndex] = assignment;
    } else {
      this.mockAssignments.push(assignment);
    }
    return of(assignment).pipe(delay(100));
  }

  update(id: AssignmentId, updates: Partial<Assignment>): Observable<Assignment> {
    const assignment = this.mockAssignments.find(a => a.id === id);
    if (!assignment) {
      throw new Error(`Assignment with id ${id} not found`);
    }

    // In a real implementation, this would merge updates properly
    // For now, just return the existing assignment
    return of(assignment).pipe(delay(100));
  }

  delete(id: AssignmentId): Observable<boolean> {
    const index = this.mockAssignments.findIndex(a => a.id === id);
    if (index >= 0) {
      this.mockAssignments.splice(index, 1);
      return of(true).pipe(delay(100));
    }
    return of(false).pipe(delay(100));
  }

  publish(id: AssignmentId): Observable<Assignment> {
    return this.update(id, { status: 'published' as any });
  }

  archive(id: AssignmentId): Observable<Assignment> {
    return this.update(id, { status: 'archived' as any });
  }

  findUpcomingDeadlines(studentId: StudentId, daysAhead: number = 7): Observable<Assignment[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const assignments = this.mockAssignments.filter(assignment => {
      const dueDate = assignment.specifications.dueDate;
      return dueDate >= now && dueDate <= futureDate;
    });

    return of(assignments).pipe(delay(120));
  }

  findOverdue(studentId: StudentId): Observable<Assignment[]> {
    const now = new Date();
    const assignments = this.mockAssignments.filter(assignment =>
      assignment.specifications.dueDate < now
    );
    return of(assignments).pipe(delay(120));
  }

  findByPriority(studentId: StudentId, priority: 'high' | 'urgent'): Observable<Assignment[]> {
    // Mock priority filtering - in real implementation would calculate priority
    const assignments = this.mockAssignments.filter(assignment =>
      assignment.specifications.priority === priority ||
      (priority === 'urgent' && assignment.specifications.priority === 'high')
    );
    return of(assignments).pipe(delay(120));
  }

  countByStatus(studentId: StudentId): Observable<Record<string, number>> {
    const counts: Record<string, number> = {
      draft: 0,
      published: 0,
      archived: 0
    };

    this.mockAssignments.forEach(assignment => {
      counts[assignment.status] = (counts[assignment.status] || 0) + 1;
    });

    return of(counts).pipe(delay(100));
  }

  getCompletionStats(studentId: StudentId, courseId?: CourseId): Observable<{
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
    completionRate: number;
  }> {
    let assignments = this.mockAssignments;
    if (courseId) {
      assignments = assignments.filter(a => a.courseId === courseId);
    }

    const total = assignments.length;
    const completed = Math.floor(total * 0.6); // Mock: 60% completed
    const inProgress = Math.floor(total * 0.3); // Mock: 30% in progress
    const overdue = total - completed - inProgress; // Mock: rest overdue

    return of({
      total,
      completed,
      inProgress,
      overdue,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    }).pipe(delay(150));
  }

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

  private initializeMockData(): void {
    // Mock assignments data would be initialized here
    // In a real implementation, this would be loaded from an API
    this.mockAssignments = [];
  }
}