import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { GetCoursesUseCase, CreateCourseUseCase, CreateCourseData } from './application/use-cases';
import { Course } from './domain/entities/course.entity';
import { CourseFilters, CourseSortOptions, PaginationOptions, PaginatedResult, CourseId } from './domain/types';

/**
 * Course Service - Application Service Layer
 * Orchestrates course-related operations using domain use cases
 * Acts as a facade for the presentation layer
 */
@Injectable({
  providedIn: 'root'
})
export class CourseService {
  private getCoursesUseCase = inject(GetCoursesUseCase);
  private createCourseUseCase = inject(CreateCourseUseCase);

  /**
   * Get courses with filtering, sorting, and pagination
   */
  getCourses(
    filters?: CourseFilters,
    sort?: CourseSortOptions,
    pagination?: PaginationOptions
  ): Observable<PaginatedResult<Course>> {
    return this.getCoursesUseCase.execute(filters, sort, pagination);
  }

  /**
   * Get courses by category
   */
  getCoursesByCategory(
    category: string,
    filters?: CourseFilters,
    sort?: CourseSortOptions,
    pagination?: PaginationOptions
  ): Observable<PaginatedResult<Course>> {
    return this.getCoursesUseCase.getByCategory(category, filters, sort, pagination);
  }

  /**
   * Get courses by instructor
   */
  getCoursesByInstructor(
    instructorId: string,
    filters?: CourseFilters,
    sort?: CourseSortOptions,
    pagination?: PaginationOptions
  ): Observable<PaginatedResult<Course>> {
    return this.getCoursesUseCase.getByInstructor(instructorId, filters, sort, pagination);
  }

  /**
   * Search courses
   */
  searchCourses(
    query: string,
    filters?: CourseFilters,
    sort?: CourseSortOptions,
    pagination?: PaginationOptions
  ): Observable<PaginatedResult<Course>> {
    return this.getCoursesUseCase.search(query, filters, sort, pagination);
  }

  /**
   * Get popular courses
   */
  getPopularCourses(limit: number = 10): Observable<Course[]> {
    return this.getCoursesUseCase.getPopular(limit);
  }

  /**
   * Get new courses
   */
  getNewCourses(limit: number = 10): Observable<Course[]> {
    return this.getCoursesUseCase.getNew(limit);
  }

  /**
   * Get featured courses
   */
  getFeaturedCourses(limit: number = 10): Observable<Course[]> {
    return this.getCoursesUseCase.getFeatured(limit);
  }

  /**
   * Create a new course
   */
  createCourse(courseData: CreateCourseData): Observable<Course> {
    return this.createCourseUseCase.execute(courseData);
  }

  /**
   * Create and publish a course immediately
   */
  createAndPublishCourse(courseData: CreateCourseData): Observable<Course> {
    return this.createCourseUseCase.createAndPublish(courseData);
  }

  /**
   * Legacy methods for backward compatibility
   * TODO: Remove these once all components are updated
   */
  getCoursesLegacy(params?: { page?: number; size?: number; category?: string }): Observable<PaginatedResult<Course>> {
    const filters: CourseFilters = {};
    if (params?.category) {
      filters.category = [params.category];
    }

    const pagination: PaginationOptions = {
      page: params?.page || 1,
      limit: params?.size || 10
    };

    return this.getCourses(filters, undefined, pagination);
  }

  getCourseById(id: CourseId): Observable<Course | null> {
    // This would need a specific use case for getting single course
    // For now, we'll use the repository directly
    return this.getCoursesUseCase['courseRepository'].findById(id);
  }
}