import { Observable } from 'rxjs';
import { AssignmentId, StudentId, SubmissionId } from '../types';
import { AssignmentSubmission } from '../entities/submission.entity';

/**
 * Repository Interface: Submission Repository
 * Defines the contract for submission data access operations
 */
export interface ISubmissionRepository {
  // CRUD operations
  findById(id: SubmissionId): Observable<AssignmentSubmission | null>;
  findByAssignmentId(assignmentId: AssignmentId): Observable<AssignmentSubmission[]>;
  findByStudentId(studentId: StudentId): Observable<AssignmentSubmission[]>;
  findByStudentAndAssignment(studentId: StudentId, assignmentId: AssignmentId): Observable<AssignmentSubmission[]>;
  save(submission: AssignmentSubmission): Observable<AssignmentSubmission>;
  update(id: SubmissionId, updates: Partial<AssignmentSubmission>): Observable<AssignmentSubmission>;
  delete(id: SubmissionId): Observable<boolean>;

  // Status operations
  markAsSubmitted(id: SubmissionId): Observable<AssignmentSubmission>;
  markAsGraded(id: SubmissionId, grade: any): Observable<AssignmentSubmission>; // Would be Grade type

  // Advanced queries
  findLatestByAssignment(studentId: StudentId, assignmentId: AssignmentId): Observable<AssignmentSubmission | null>;
  findGradedSubmissions(studentId: StudentId, assignmentId?: AssignmentId): Observable<AssignmentSubmission[]>;
  findPendingSubmissions(studentId: StudentId): Observable<AssignmentSubmission[]>;

  // Statistics
  countByStatus(studentId: StudentId, assignmentId?: AssignmentId): Observable<Record<string, number>>;
  getSubmissionHistory(studentId: StudentId, limit?: number): Observable<AssignmentSubmission[]>;
  getAverageGrade(studentId: StudentId, assignmentId?: AssignmentId): Observable<number>;
}