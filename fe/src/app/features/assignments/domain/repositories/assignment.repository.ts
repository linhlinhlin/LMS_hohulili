import { Observable } from 'rxjs';
import { AssignmentId, StudentId, CourseId, InstructorId, AssignmentFilters, AssignmentSortOptions, PaginatedResult } from '../types';
import { Assignment } from '../entities/assignment.entity';

/**
 * Repository Interface: Assignment Repository
 * Defines the contract for assignment data access operations
 */
export interface IAssignmentRepository {
  // CRUD operations
  findById(id: AssignmentId): Observable<Assignment | null>;
  findByStudentId(studentId: StudentId, filters?: AssignmentFilters, sort?: AssignmentSortOptions): Observable<Assignment[]>;
  findByCourseId(courseId: CourseId): Observable<Assignment[]>;
  findByInstructorId(instructorId: InstructorId): Observable<Assignment[]>;
  save(assignment: Assignment): Observable<Assignment>;
  update(id: AssignmentId, updates: Partial<Assignment>): Observable<Assignment>;
  delete(id: AssignmentId): Observable<boolean>;

  // Publishing operations
  publish(id: AssignmentId): Observable<Assignment>;
  archive(id: AssignmentId): Observable<Assignment>;

  // Advanced queries
  findUpcomingDeadlines(studentId: StudentId, daysAhead?: number): Observable<Assignment[]>;
  findOverdue(studentId: StudentId): Observable<Assignment[]>;
  findByPriority(studentId: StudentId, priority: 'high' | 'urgent'): Observable<Assignment[]>;

  // Statistics
  countByStatus(studentId: StudentId): Observable<Record<string, number>>;
  getCompletionStats(studentId: StudentId, courseId?: CourseId): Observable<{
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
    completionRate: number;
  }>;
}