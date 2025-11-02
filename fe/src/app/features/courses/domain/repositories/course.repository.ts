import { Observable } from 'rxjs';
import { CourseId, InstructorId, CourseFilters, CourseSortOptions, PaginationOptions, PaginatedResult } from '../types';
import { Course } from '../entities/course.entity';

/**
 * Repository Interface: Course Repository
 * Defines the contract for course data access operations
 * Following Domain-Driven Design repository pattern
 */
export interface CourseRepository {
  /**
   * Find a course by its ID
   */
  findById(id: CourseId): Observable<Course | null>;

  /**
   * Find multiple courses with optional filtering, sorting, and pagination
   */
  findAll(
    filters?: CourseFilters,
    sort?: CourseSortOptions,
    pagination?: PaginationOptions
  ): Observable<PaginatedResult<Course>>;

  /**
   * Find courses by instructor
   */
  findByInstructor(
    instructorId: InstructorId,
    filters?: CourseFilters,
    sort?: CourseSortOptions,
    pagination?: PaginationOptions
  ): Observable<PaginatedResult<Course>>;

  /**
   * Find courses by category
   */
  findByCategory(
    category: string,
    filters?: CourseFilters,
    sort?: CourseSortOptions,
    pagination?: PaginationOptions
  ): Observable<PaginatedResult<Course>>;

  /**
   * Search courses by query
   */
  search(
    query: string,
    filters?: CourseFilters,
    sort?: CourseSortOptions,
    pagination?: PaginationOptions
  ): Observable<PaginatedResult<Course>>;

  /**
   * Save a new course or update existing one
   */
  save(course: Course): Observable<Course>;

  /**
   * Update an existing course
   */
  update(id: CourseId, updates: Partial<Course>): Observable<Course>;

  /**
   * Delete a course
   */
  delete(id: CourseId): Observable<void>;

  /**
   * Check if a course exists
   */
  exists(id: CourseId): Observable<boolean>;

  /**
   * Get course statistics
   */
  getStatistics(): Observable<CourseStatistics>;

  /**
   * Get popular courses
   */
  getPopular(limit?: number): Observable<Course[]>;

  /**
   * Get new courses (recently added)
   */
  getNew(limit?: number): Observable<Course[]>;

  /**
   * Get featured courses
   */
  getFeatured(limit?: number): Observable<Course[]>;
}

/**
 * Course Statistics Interface
 */
export interface CourseStatistics {
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  archivedCourses: number;
  totalStudents: number;
  averageRating: number;
  totalRevenue: number;
  coursesByCategory: Record<string, number>;
  coursesByLevel: Record<string, number>;
}