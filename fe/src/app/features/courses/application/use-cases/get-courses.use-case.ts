import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CourseRepository } from '../../domain/repositories/course.repository';
import { CourseRepositoryImpl } from '../../infrastructure/repositories/course.repository.impl';
import { Course } from '../../domain/entities/course.entity';
import { CourseFilters, CourseSortOptions, PaginationOptions, PaginatedResult } from '../../domain/types';

/**
 * Use Case: Get Courses
 * Orchestrates the retrieval of courses with filtering, sorting, and pagination
 */
@Injectable({
  providedIn: 'root'
})
export class GetCoursesUseCase {
  private courseRepository = inject(CourseRepositoryImpl);

  /**
   * Execute the use case - Get all courses with optional filtering
   */
  execute(
    filters?: CourseFilters,
    sort?: CourseSortOptions,
    pagination?: PaginationOptions
  ): Observable<PaginatedResult<Course>> {
    // Delegate to repository with proper error handling
    return this.courseRepository.findAll(filters, sort, pagination);
  }

  /**
   * Get courses by category
   */
  getByCategory(
    category: string,
    filters?: CourseFilters,
    sort?: CourseSortOptions,
    pagination?: PaginationOptions
  ): Observable<PaginatedResult<Course>> {
    return this.courseRepository.findByCategory(category, filters, sort, pagination);
  }

  /**
   * Get courses by instructor
   */
  getByInstructor(
    instructorId: string,
    filters?: CourseFilters,
    sort?: CourseSortOptions,
    pagination?: PaginationOptions
  ): Observable<PaginatedResult<Course>> {
    return this.courseRepository.findByInstructor(
      instructorId as any, // Type assertion for now
      filters,
      sort,
      pagination
    );
  }

  /**
   * Search courses
   */
  search(
    query: string,
    filters?: CourseFilters,
    sort?: CourseSortOptions,
    pagination?: PaginationOptions
  ): Observable<PaginatedResult<Course>> {
    return this.courseRepository.search(query, filters, sort, pagination);
  }

  /**
   * Get popular courses
   */
  getPopular(limit: number = 10): Observable<Course[]> {
    return this.courseRepository.getPopular(limit);
  }

  /**
   * Get new courses
   */
  getNew(limit: number = 10): Observable<Course[]> {
    return this.courseRepository.getNew(limit);
  }

  /**
   * Get featured courses
   */
  getFeatured(limit: number = 10): Observable<Course[]> {
    return this.courseRepository.getFeatured(limit);
  }
}