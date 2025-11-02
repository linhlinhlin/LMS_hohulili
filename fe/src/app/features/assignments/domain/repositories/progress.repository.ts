import { Observable } from 'rxjs';
import { AssignmentId, StudentId } from '../types';
import { AssignmentProgress } from '../entities/progress.entity';

/**
 * Repository Interface: Progress Repository
 * Defines the contract for progress tracking data access operations
 */
export interface IProgressRepository {
  // CRUD operations
  findById(assignmentId: AssignmentId, studentId: StudentId): Observable<AssignmentProgress | null>;
  findByStudentId(studentId: StudentId): Observable<AssignmentProgress[]>;
  findByAssignmentId(assignmentId: AssignmentId): Observable<AssignmentProgress[]>;
  save(progress: AssignmentProgress): Observable<AssignmentProgress>;
  update(assignmentId: AssignmentId, studentId: StudentId, updates: Partial<AssignmentProgress>): Observable<AssignmentProgress>;
  delete(assignmentId: AssignmentId, studentId: StudentId): Observable<boolean>;

  // Status operations
  markAsStarted(assignmentId: AssignmentId, studentId: StudentId): Observable<AssignmentProgress>;
  markAsCompleted(assignmentId: AssignmentId, studentId: StudentId): Observable<AssignmentProgress>;
  markAsOverdue(assignmentId: AssignmentId, studentId: StudentId): Observable<AssignmentProgress>;

  // Progress updates
  updateProgress(assignmentId: AssignmentId, studentId: StudentId, percentage: number): Observable<AssignmentProgress>;
  addTimeSpent(assignmentId: AssignmentId, studentId: StudentId, additionalTime: number): Observable<AssignmentProgress>;

  // Statistics
  getCompletionStats(studentId: StudentId): Observable<{
    totalAssignments: number;
    completedAssignments: number;
    inProgressAssignments: number;
    overdueAssignments: number;
    averageCompletionRate: number;
    totalTimeSpent: number;
  }>;

  getTimeSpentStats(studentId: StudentId): Observable<{
    today: number;
    thisWeek: number;
    thisMonth: number;
    averagePerAssignment: number;
  }>;
}