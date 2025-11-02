import { Observable } from 'rxjs';
import { LearningSessionId, StudentId, CourseId, LessonId, LearningSessionStatus, SessionType } from '../types';
import { LearningSession } from '../entities/learning-session.entity';
import { ProgressFilters, LearningSortOptions, PaginationOptions, PaginatedResult } from '../types';

/**
 * Repository Interface: Learning Session Repository
 * Defines the contract for learning session data access operations
 */
export interface LearningSessionRepository {
  /**
   * Find a learning session by its ID
   */
  findById(id: LearningSessionId): Observable<LearningSession | null>;

  /**
   * Find learning sessions by student
   */
  findByStudent(
    studentId: StudentId,
    filters?: ProgressFilters,
    sort?: LearningSortOptions,
    pagination?: PaginationOptions
  ): Observable<PaginatedResult<LearningSession>>;

  /**
   * Find learning sessions by course
   */
  findByCourse(
    courseId: CourseId,
    filters?: ProgressFilters,
    sort?: LearningSortOptions,
    pagination?: PaginationOptions
  ): Observable<PaginatedResult<LearningSession>>;

  /**
   * Find learning sessions by lesson
   */
  findByLesson(
    lessonId: LessonId,
    filters?: ProgressFilters,
    sort?: LearningSortOptions,
    pagination?: PaginationOptions
  ): Observable<PaginatedResult<LearningSession>>;

  /**
   * Find active learning sessions for a student
   */
  findActiveByStudent(studentId: StudentId): Observable<LearningSession[]>;

  /**
   * Find completed learning sessions within date range
   */
  findCompletedInDateRange(
    studentId: StudentId,
    startDate: Date,
    endDate: Date
  ): Observable<LearningSession[]>;

  /**
   * Save a new learning session or update existing one
   */
  save(session: LearningSession): Observable<LearningSession>;

  /**
   * Update an existing learning session
   */
  update(id: LearningSessionId, updates: Partial<LearningSession>): Observable<LearningSession>;

  /**
   * Update session status
   */
  updateStatus(id: LearningSessionId, status: LearningSessionStatus): Observable<LearningSession>;

  /**
   * Delete a learning session
   */
  delete(id: LearningSessionId): Observable<void>;

  /**
   * Check if a learning session exists
   */
  exists(id: LearningSessionId): Observable<boolean>;

  /**
   * Get learning statistics for a student
   */
  getStudentStatistics(studentId: StudentId): Observable<LearningSessionStatistics>;

  /**
   * Get learning statistics for a course
   */
  getCourseStatistics(courseId: CourseId): Observable<CourseSessionStatistics>;

  /**
   * Get recent learning sessions
   */
  getRecentSessions(studentId: StudentId, limit: number): Observable<LearningSession[]>;
}

/**
 * Learning Session Statistics
 */
export interface LearningSessionStatistics {
  totalSessions: number;
  completedSessions: number;
  activeSessions: number;
  abandonedSessions: number;
  totalDurationMinutes: number;
  averageSessionDuration: number;
  completionRate: number;
  sessionsByType: Record<SessionType, number>;
  sessionsByStatus: Record<LearningSessionStatus, number>;
  learningStreak: number;
  mostActiveDay: string;
  totalLearningTime: string; // formatted
}

/**
 * Course Session Statistics
 */
export interface CourseSessionStatistics {
  totalStudents: number;
  totalSessions: number;
  averageSessionsPerStudent: number;
  completionRate: number;
  averageSessionDuration: number;
  mostPopularLesson: {
    lessonId: LessonId;
    sessionCount: number;
  };
}