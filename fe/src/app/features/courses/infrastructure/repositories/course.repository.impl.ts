import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { CourseRepository, CourseStatistics } from '../../domain/repositories/course.repository';
import { Course } from '../../domain/entities/course.entity';
import { CourseSpecifications } from '../../domain/value-objects/course-specifications';
import {
  CourseId,
  InstructorId,
  CourseStatus,
  CourseLevel,
  CertificateType,
  CourseFilters,
  CourseSortOptions,
  PaginationOptions,
  PaginatedResult
} from '../../domain/types';
import { CourseApi } from '../../../../api/client/course.api';
import { ApiResponse } from '../../../../api/types/common.types';
import { CourseDetail, CourseSummary } from '../../../../api/types/course.types';

/**
 * Repository Implementation: Course Repository Implementation
 * Concrete implementation of CourseRepository interface
 * Handles data access and mapping between domain and infrastructure layers
 */
@Injectable({
  providedIn: 'root'
})
export class CourseRepositoryImpl implements CourseRepository {
  private api = inject(CourseApi);

  findById(id: CourseId): Observable<Course | null> {
    return this.api.getCourseById(id as unknown as string).pipe(
      map((res: ApiResponse<CourseDetail>) => {
        const data = res?.data;
        return data ? this.mapDetailToDomain(data) : null;
      })
    );
  }

  findAll(
    filters?: CourseFilters,
    sort?: CourseSortOptions,
    pagination?: PaginationOptions
  ): Observable<PaginatedResult<Course>> {
    const page = Math.max(0, (pagination?.page ?? 1) - 1);
    const size = pagination?.limit ?? 12;
    const search = filters?.searchQuery || undefined;
    const teacher = filters?.instructorId?.[0] as unknown as string | undefined;

    const params: Record<string, any> = { page, size };
    if (search) params['search'] = search;
    if (teacher) params['teacher'] = teacher;

    return this.api.publicCourses(params).pipe(
      map((res: ApiResponse<any>) => {
        // The API response structure is: { data: { content: [...], pageable: {...}, ... }, pagination: {...} }
        // So res.data is the Spring Page object, not the courses array directly
        const pageData = res?.data;
        const pagination = res?.pagination ?? {};


        // Check if pageData exists and has content
        if (!pageData) {
          return { items: [], page: 1, limit: 12, total: 0, totalPages: 1, hasNext: false, hasPrev: false };
        }

        // If pageData is an array, it means the API returned courses directly
        if (Array.isArray(pageData)) {
          const coursesArray = pageData;
          const items = coursesArray.map((s: any) => this.mapSummaryToDomain(s)).filter((item: Course | null) => item !== null) as Course[];

          const totalPages = (pagination as any).totalPages ?? 1;
          const total = (pagination as any).totalItems ?? items.length;
          const currentPage = (pagination as any).page ?? page;
          const pageSize = (pagination as any).limit ?? size;

          const result = {
            items,
            page: currentPage,
            limit: pageSize,
            total,
            totalPages,
            hasNext: currentPage < totalPages,
            hasPrev: currentPage > 1
          } as PaginatedResult<Course>;

          return result;
        }

        // If pageData is an object with content, it's a Spring Page
        if (pageData.content) {
          const coursesArray = pageData.content;
          const items = coursesArray.map((s: any) => this.mapSummaryToDomain(s)).filter((item: Course | null) => item !== null) as Course[];

          const totalPages = pageData.totalPages ?? 1;
          const total = pageData.totalElements ?? items.length;
          const currentPage = (pageData.pageable?.pageNumber ?? 0) + 1; // Convert 0-based to 1-based
          const pageSize = pageData.pageable?.pageSize ?? size;

          const result = {
            items,
            page: currentPage,
            limit: pageSize,
            total,
            totalPages,
            hasNext: !pageData.last,
            hasPrev: !pageData.first
          } as PaginatedResult<Course>;

          return result;
        }

        // Fallback
        return { items: [], page: 1, limit: 12, total: 0, totalPages: 1, hasNext: false, hasPrev: false };
      }),
      catchError((error) => {
        // Graceful fallback when backend is down or returns an error (e.g., 403/500)
        return of({
          items: [],
          page,
          limit: size,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        } as PaginatedResult<Course>);
      })
    );
  }

  findByInstructor(
    instructorId: InstructorId,
    filters?: CourseFilters,
    sort?: CourseSortOptions,
    pagination?: PaginationOptions
  ): Observable<PaginatedResult<Course>> {
    const instructorFilters = { ...filters, instructorId: [instructorId] };
    return this.findAll(instructorFilters, sort, pagination);
  }

  findByCategory(
    category: string,
    filters?: CourseFilters,
    sort?: CourseSortOptions,
    pagination?: PaginationOptions
  ): Observable<PaginatedResult<Course>> {
    const categoryFilters = { ...filters, category: [category] };
    return this.findAll(categoryFilters, sort, pagination);
  }

  search(
    query: string,
    filters?: CourseFilters,
    sort?: CourseSortOptions,
    pagination?: PaginationOptions
  ): Observable<PaginatedResult<Course>> {
    const searchFilters = { ...filters, searchQuery: query };
    return this.findAll(searchFilters, sort, pagination);
  }

  save(course: Course): Observable<Course> {
    // Persisting courses is handled via teacher flows elsewhere; keep no-op here
    return of(course);
  }

  update(id: CourseId, updates: Partial<Course>): Observable<Course> {
    // Not used in public listing flow
    return throwError(() => new Error('Not implemented'));
  }

  delete(id: CourseId): Observable<void> {
    return throwError(() => new Error('Not implemented'));
  }

  exists(id: CourseId): Observable<boolean> {
    return of(false);
  }

  getStatistics(): Observable<CourseStatistics> {
    const stats: CourseStatistics = {
      totalCourses: 0,
      publishedCourses: 0,
      draftCourses: 0,
      archivedCourses: 0,
      totalStudents: 0,
      averageRating: 0,
      totalRevenue: 0,
      coursesByCategory: {},
      coursesByLevel: {}
    };
    return of(stats);
  }

  getPopular(limit: number = 10): Observable<Course[]> {
    return this.findAll({ status: [CourseStatus.PUBLISHED] }, { field: 'students', direction: 'desc' }, { page: 1, limit }).pipe(
      map(r => r.items)
    );
  }

  getNew(limit: number = 10): Observable<Course[]> {
    return this.findAll({ status: [CourseStatus.PUBLISHED] }, { field: 'createdAt', direction: 'desc' }, { page: 1, limit }).pipe(
      map(r => r.items)
    );
  }

  getFeatured(limit: number = 10): Observable<Course[]> {
    return this.findAll({ status: [CourseStatus.PUBLISHED] }, { field: 'rating', direction: 'desc' }, { page: 1, limit }).pipe(
      map(r => r.items)
    );
  }

  private mapSummaryToDomain(s: CourseSummary): Course | null {
    try {
      const now = new Date();
      let description = s.description ?? '';
      if (description.length < 20) description = description.padEnd(20, ' ');
      let title = s.title ?? '';
      if (title.length < 5) title = title.padEnd(5, ' ');

      // Resolve price from API (priceType + price fields)
      const price = s.priceType === 'FREE' ? 0 : (s.salePrice ?? s.price ?? 0);

      return new Course(
        (s.id as unknown as string) as CourseId,
        title,
        description,
        description.slice(0, 120),
        s.categoryName ?? 'engineering', // Use real category from API
        (s.teacherName ?? 'Giảng viên') as unknown as InstructorId,
        new CourseSpecifications(
          10,
          CourseLevel.BEGINNER,
          Math.max(s.enrolledCount ?? 0, 50),
          price, // Real price from API
          [],
          CertificateType.COMPLETION,
          s.sectionCount ?? 1,  // Real section count
          s.lessonCount ?? 1    // Real lesson count
        ),
        CourseStatus.PUBLISHED,
        [],
        [],
        s.thumbnailUrl ?? '', // Real thumbnail from API (empty = fallback gradient)
        {
          createdAt: s.createdAt ? new Date(s.createdAt as unknown as any) : now,
          updatedAt: now,
          createdBy: (s.teacherName ?? 'Giảng viên') as unknown as InstructorId,
          studentsCount: s.enrolledCount ?? 0,
          rating: 5,
          reviewsCount: s.enrolledCount ?? 0,
          isPopular: (s.enrolledCount ?? 0) > 50,
          isNew: true,
          version: 1,
          isEnrolled: s.enrolled ?? s.isEnrolled ?? false
        }
      );
    } catch (error) {
      return null;
    }
  }

  private mapDetailToDomain(d: CourseDetail): Course {
    const now = new Date();

    // Ensure title meets minimum length requirement (5 characters)
    let title = d.title ?? '';
    if (title.length < 5) {
      title = title.padEnd(5, ' ');
    }

    // Ensure description meets minimum length requirement (20 characters)
    let description = d.description ?? '';
    if (description.length < 20) {
      description = description.padEnd(20, ' ');
    }

    return new Course(
      (d.id as unknown as string) as CourseId,
      title,
      description,
      description.slice(0, 120),
      'engineering',
      (d.teacherId as unknown as string) as InstructorId,
      new CourseSpecifications(
        10,
        CourseLevel.BEGINNER,
        d.enrolledCount ?? 0,
        d.price ?? 0, // Use actual price from backend
        [],
        CertificateType.COMPLETION,
        d.chapterCount ?? 1, // Use chapters count from backend
        1
      ),
      CourseStatus.PUBLISHED,
      d.tags ?? [],
      [],
      '/assets/images/courses/placeholder.png',
      {
        createdAt: d.createdAt ? new Date(d.createdAt as unknown as any) : now,
        updatedAt: d.updatedAt ? new Date(d.updatedAt as unknown as any) : now,
        createdBy: (d.teacherId as unknown as string) as InstructorId,
        studentsCount: d.enrolledCount ?? 0,
        rating: 5,
        reviewsCount: 0,
        isPopular: (d.enrolledCount ?? 0) > 50,
        isNew: true,
        version: 1
      }
    );
  }
}
