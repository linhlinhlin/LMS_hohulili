import { Observable } from 'rxjs';
import { ProgressId, StudentId, CourseId, LessonId, ProgressStatus } from '../types';
import { Progress } from '../entities/progress.entity';
import { ProgressFilters, LearningSortOptions, PaginationOptions, PaginatedResult } from '../types';

/**
 * Repository Interface: Progress Repository
 * Defines the contract for progress data access operations
 */
export interface ProgressRepository {
  /**
   * Find progress by its ID
   */
  findById(id: ProgressId): Observable<Progress | null>;

  /**
   * Find progress by student
   */
  findByStudent(
    studentId: StudentId,
    filters?: ProgressFilters,
    sort?: LearningSortOptions,
    pagination?: PaginationOptions
  ): Observable<PaginatedResult<Progress>>;

  /**
   * Find progress by course
   */
  findByCourse(
    courseId: CourseId,
    filters?: ProgressFilters,
    sort?: LearningSortOptions,
    pagination?: PaginationOptions
  ): Observable<PaginatedResult<Progress>>;

  /**
   * Find progress by lesson
   */
  findByLesson(
    lessonId: LessonId,
    filters?: ProgressFilters,
    sort?: LearningSortOptions,
    pagination?: PaginationOptions
  ): Observable<PaginatedResult<Progress>>;

  /**
   * Find progress for a specific student-course combination
   */
  findByStudentAndCourse(studentId: StudentId, courseId: CourseId): Observable<Progress[]>;

  /**
   * Find progress for a specific student-lesson combination
   */
  findByStudentAndLesson(studentId: StudentId, lessonId: LessonId): Observable<Progress | null>;

  /**
   * Find incomplete progress items
   */
  findIncompleteByStudent(studentId: StudentId): Observable<Progress[]>;

  /**
   * Find progress at risk (low completion, old access)
   */
  findAtRiskProgress(studentId: StudentId, thresholdDays: number): Observable<Progress[]>;

  /**
   * Save a new progress or update existing one
   */
  save(progress: Progress): Observable<Progress>;

  /**
   * Update an existing progress
   */
  update(id: ProgressId, updates: Partial<Progress>): Observable<Progress>;

  /**
   * Update progress percentage
   */
  updatePercentage(id: ProgressId, percentage: number): Observable<Progress>;

  /**
   * Update progress status
   */
  updateStatus(id: ProgressId, status: ProgressStatus): Observable<Progress>;

  /**
   * Add time spent to progress
   */
  addTimeSpent(id: ProgressId, additionalMinutes: number): Observable<Progress>;

  /**
   * Update last access time
   */
  updateLastAccess(id: ProgressId): Observable<Progress>;

  /**
   * Delete a progress
   */
  delete(id: ProgressId): Observable<void>;

  /**
   * Check if progress exists
   */
  exists(id: ProgressId): Observable<boolean>;

  /**
   * Get progress statistics for a student
   */
  getStudentProgressStatistics(studentId: StudentId): Observable<StudentProgressStatistics>;

  /**
   * Get progress statistics for a course
   */
  getCourseProgressStatistics(courseId: CourseId): Observable<CourseProgressStatistics>;

  /**
   * Get overall progress for a student's enrolled courses
   */
  getStudentCourseProgress(studentId: StudentId): Observable<StudentCourseProgress[]>;
}

/**
 * Student Progress Statistics
 */
export interface StudentProgressStatistics {
  totalCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  notStartedCourses: number;
  blockedCourses: number;
  overallCompletionRate: number;
  averageProgress: number;
  totalTimeSpent: number;
  coursesAtRisk: number;
  recentActivity: {
    lastAccessDate: Date;
    activeCourses: number;
  };
}

/**
 * Course Progress Statistics
 */
export interface CourseProgressStatistics {
  totalStudents: number;
  completedStudents: number;
  inProgressStudents: number;
  notStartedStudents: number;
  averageCompletionRate: number;
  averageProgress: number;
  totalTimeSpent: number;
  completionTrend: {
    completedLastWeek: number;
    completedLastMonth: number;
  };
}

/**
 * Student Course Progress Summary
 */
export interface StudentCourseProgress {
  courseId: CourseId;
  courseName: string;
  progressPercentage: number;
  status: ProgressStatus;
  timeSpent: number;
  lastAccessed: Date;
  lessonsCompleted: number;
  totalLessons: number;
  isAtRisk: boolean;
}