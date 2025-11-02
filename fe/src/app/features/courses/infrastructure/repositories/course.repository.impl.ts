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
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 12;
    const search = filters?.searchQuery ?? undefined;
    const teacher = filters?.instructorId?.[0] as unknown as string | undefined;

    return this.api.publicCourses({ page, limit, search, teacher }).pipe(
      map((res: ApiResponse<any>) => {
        // THÊM DEBUG Ở ĐÂY
        console.log('[REPOSITORY LOG] 1. Dữ liệu API thô:', res);

        // The API response structure is: { data: { content: [...], pageable: {...}, ... }, pagination: {...} }
        // So res.data is the Spring Page object, not the courses array directly
        const pageData = res?.data;
        const pagination = res?.pagination ?? {};

        console.log('[REPOSITORY LOG] 2. pageData:', pageData);
        console.log('[REPOSITORY LOG] 3. pagination:', pagination);

        // Check if pageData exists and has content
        if (!pageData) {
            console.error('[REPOSITORY LOG] Lỗi ánh xạ: pageData không tồn tại');
            return { items: [], page: 1, limit: 12, total: 0, totalPages: 1, hasNext: false, hasPrev: false };
        }

        // If pageData is an array, it means the API returned courses directly
        if (Array.isArray(pageData)) {
            console.log('[REPOSITORY LOG] pageData là mảng, sử dụng pagination từ res.pagination');
            const coursesArray = pageData;
            const items = coursesArray.map((s: any) => this.mapSummaryToDomain(s)).filter((item: Course | null) => item !== null) as Course[];

            const totalPages = (pagination as any).totalPages ?? 1;
            const total = (pagination as any).totalItems ?? items.length;
            const currentPage = (pagination as any).page ?? page;
            const pageSize = (pagination as any).limit ?? limit;

            const result = {
              items,
              page: currentPage,
              limit: pageSize,
              total,
              totalPages,
              hasNext: currentPage < totalPages,
              hasPrev: currentPage > 1
            } as PaginatedResult<Course>;

            console.log('[REPOSITORY LOG] 4. Dữ liệu đã ánh xạ (array case):', result);
            return result;
        }

        // If pageData is an object with content, it's a Spring Page
        if (pageData.content) {
            console.log('[REPOSITORY LOG] pageData là Spring Page object');
            const coursesArray = pageData.content;
            const items = coursesArray.map((s: any) => this.mapSummaryToDomain(s)).filter((item: Course | null) => item !== null) as Course[];

            const totalPages = pageData.totalPages ?? 1;
            const total = pageData.totalElements ?? items.length;
            const currentPage = (pageData.pageable?.pageNumber ?? 0) + 1; // Convert 0-based to 1-based
            const pageSize = pageData.pageable?.pageSize ?? limit;

            const result = {
              items,
              page: currentPage,
              limit: pageSize,
              total,
              totalPages,
              hasNext: !pageData.last,
              hasPrev: !pageData.first
            } as PaginatedResult<Course>;

            console.log('[REPOSITORY LOG] 5. Dữ liệu đã ánh xạ (Spring Page case):', result);
            return result;
        }

        // Fallback
        console.error('[REPOSITORY LOG] Lỗi ánh xạ: Cấu trúc pageData không nhận dạng được');
        return { items: [], page: 1, limit: 12, total: 0, totalPages: 1, hasNext: false, hasPrev: false };
      }),
      catchError((error) => {
        console.error('CourseRepositoryImpl.findAll() error:', error);
        // Graceful fallback when backend is down or returns an error (e.g., 403/500)
        return of({
          items: [],
          page,
          limit,
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

      // Ensure description meets minimum length requirement (20 characters)
      let description = s.description ?? '';
      if (description.length < 20) {
        description = description.padEnd(20, ' '); // Pad with spaces to meet minimum length
      }

      return new Course(
        (s.id as unknown as string) as CourseId,
        s.title ?? '',
        description,
        (description).slice(0, 120),
        'engineering', // backend doesn't provide category yet
        (s.teacherName ?? 'teacher') as unknown as InstructorId,
        new CourseSpecifications(
          10, // durationHours - default value
          CourseLevel.BEGINNER,
          Math.max(s.enrolledCount ?? 0, 50), // maxStudents - ensure positive, default to 50
          0, // price
          [], // prerequisites
          CertificateType.COMPLETION,
          1, // modulesCount - must be at least 1
          1  // lessonsCount - must be at least 1
        ),
        CourseStatus.PUBLISHED,
        [],
        [],
        '/assets/images/courses/placeholder.png',
        {
          createdAt: s.createdAt ? new Date(s.createdAt as unknown as any) : now,
          updatedAt: now,
          createdBy: (s.teacherName ?? 'teacher') as unknown as InstructorId,
          studentsCount: s.enrolledCount ?? 0,
          rating: 5,
          reviewsCount: 0,
          isPopular: (s.enrolledCount ?? 0) > 50,
          isNew: true,
          version: 1,
          isEnrolled: s.enrolled ?? s.isEnrolled ?? false // Map enrollment status from API (support both 'enrolled' and 'isEnrolled' fields)
        }
      );
    } catch (error) {
      console.error('Error mapping course summary to domain:', error, s);
      return null;
    }
  }

  private mapDetailToDomain(d: CourseDetail): Course {
    const now = new Date();
    return new Course(
      (d.id as unknown as string) as CourseId,
      d.title ?? '',
      d.description ?? '',
      (d.description ?? '').slice(0, 120),
      'engineering',
      (d.teacherId as unknown as string) as InstructorId,
      new CourseSpecifications(
        10,
        CourseLevel.BEGINNER,
        d.enrolledCount ?? 0,
        0,
        [],
        CertificateType.COMPLETION,
        0,
        0
      ),
      CourseStatus.PUBLISHED,
      [],
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