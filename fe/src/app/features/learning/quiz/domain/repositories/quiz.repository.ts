import { Observable } from 'rxjs';
import { Quiz, QuizAttempt, QuizResult, QuizFilter, QuizSearchParams, QuizStatistics } from '../../types';

/**
 * Quiz Repository Interface
 *
 * Defines the contract for quiz data access operations.
 * Implemented by QuizInfrastructureService using real QuizApi.
 */
export interface IQuizRepository {
  // Quiz CRUD operations
  findById(id: string): Observable<Quiz | null>;
  findAll(params?: QuizSearchParams): Observable<Quiz[]>;
  findByCourseId(courseId: string): Observable<Quiz[]>;
  findByInstructorId(instructorId: string): Observable<Quiz[]>;
  create(quiz: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'>): Observable<Quiz>;
  update(id: string, quiz: Partial<Quiz>): Observable<Quiz>;
  delete(id: string): Observable<boolean>;

  // Quiz publishing
  publish(id: string): Observable<Quiz>;
  archive(id: string): Observable<Quiz>;

  // Quiz attempts
  findAttemptsByQuizId(quizId: string): Observable<QuizAttempt[]>;
  findAttemptsByStudentId(studentId: string): Observable<QuizAttempt[]>;
  findAttemptById(attemptId: string): Observable<QuizAttempt | null>;
  createAttempt(attempt: Omit<QuizAttempt, 'id'>): Observable<QuizAttempt>;
  updateAttempt(id: string, attempt: Partial<QuizAttempt>): Observable<QuizAttempt>;
  completeAttempt(id: string, result: QuizResult): Observable<QuizAttempt>;

  // Statistics and analytics
  getQuizStatistics(quizId: string): Observable<QuizStatistics>;
  getStudentQuizHistory(studentId: string, courseId?: string): Observable<QuizAttempt[]>;
}
