import { Injectable, inject } from '@angular/core';
import { ApiClient } from './api-client';
import { COURSE_ENDPOINTS } from '../endpoints/course.endpoints';
import { ApiResponse, PaginationInfo } from '../types/common.types';
import { CreateCourseRequest, CourseDetail, CourseSummary, CourseContentChapter, DeliveryMode } from '../types/course.types';
import { EnrollStudentRequest } from '../types/enrollment.types';
import { map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { ApiCacheService } from '../../core/services/api-cache.service';

function mapSpringPagePagination(page: any): PaginationInfo | undefined {
  if (!page || typeof page !== 'object' || !Array.isArray(page.content)) {
    return undefined;
  }

  return {
    totalItems: page.totalElements ?? page.content.length ?? 0,
    totalPages: page.totalPages ?? 0,
    page: (page.number ?? 0) + 1,
    limit: page.size ?? page.content.length ?? 0,
    first: !!page.first,
    last: !!page.last
  };
}

function firstNonEmptyString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return '';
}

function normalizeCourseThumbnail<T extends Record<string, any>>(course: T): T {
  const thumbnailUrl = firstNonEmptyString(
    course['thumbnailUrl'],
    course['thumbnail'],
    course['coverImageUrl'],
    course['imageUrl']
  );

  return {
    ...course,
    thumbnailUrl
  };
}

@Injectable({ providedIn: 'root' })
export class CourseApi {
  private api = inject(ApiClient);
  private cache = inject(ApiCacheService);

  createCourse(payload: CreateCourseRequest) {
    return this.api.postWithResponse<CourseDetail>(COURSE_ENDPOINTS.TEACHER.BASE, payload);
  }

  getCourseById(id: string) {
    return this.api.getWithResponse<CourseDetail>(COURSE_ENDPOINTS.BY_ID(id)).pipe(
      map((res: ApiResponse<CourseDetail>) => ({
        ...res,
        data: res?.data ? normalizeCourseThumbnail(res.data as any) : res?.data
      }) as ApiResponse<CourseDetail>)
    );
  }

  updateCourse(id: string, payload: Partial<CreateCourseRequest>) {
    return this.api.put<ApiResponse<CourseDetail>>(COURSE_ENDPOINTS.TEACHER.BY_ID(id), payload);
  }

  publishCourse(id: string) {
    // Backend uses POST for publish endpoint (CourseAuthoringController)
    return this.api.post<ApiResponse<CourseDetail>>(COURSE_ENDPOINTS.AUTHORING.PUBLISH(id), {});
  }

  myCourses() {
    // Unwrap Spring Page response to a flat array - fetch all for client-side pagination
    return this.api.getWithResponse<any>(`${COURSE_ENDPOINTS.TEACHER.MY_COURSES}?page=0&size=100`).pipe(
      map((res: ApiResponse<any>) => {
        const content: CourseSummary[] = (res?.data?.content ?? []).map((c: any) => {
          const course = normalizeCourseThumbnail(c);
          return {
            ...course,
            enrolledCount: course.enrolledCount ?? course.studentsCount ?? 0,
            deliveryMode: course.deliveryMode,
            sectionCount: course.sectionCount ?? 0,
            lessonCount: course.lessonCount ?? 0,
            categoryName: course.categoryName,
            updatedAt: course.updatedAt,
            maxStudents: course.maxStudents,
            teacherRole: course.teacherRole
          };
        });
        return {
          data: content,
          pagination: res?.pagination,
          message: res?.message
        } as ApiResponse<CourseSummary[]>;
      })
    );
  }

  publicCourses(params?: { page?: number; size?: number; search?: string; teacher?: string; category?: string; sort?: string; order?: string; deliveryMode?: DeliveryMode }): Observable<ApiResponse<CourseSummary[]>> {
    return this.api.getWithResponse<any>(COURSE_ENDPOINTS.BASE, { params }).pipe(
      map((res: ApiResponse<any>) => {
        const page = res?.data;
        const content: CourseSummary[] = (page?.content ?? []).map((course: any) =>
          normalizeCourseThumbnail(course)
        );
        return {
          data: content,
          pagination: mapSpringPagePagination(page) ?? res?.pagination,
          message: res?.message
        } as ApiResponse<CourseSummary[]>;
      })
    );
  }

  enrolledCourses(params?: { page?: number; size?: number; search?: string; category?: string; sort?: string; order?: string; deliveryMode?: DeliveryMode }): Observable<ApiResponse<CourseSummary[]>> {
    return this.api.getWithResponse<any>(COURSE_ENDPOINTS.STUDENT.ENROLLED, { params }).pipe(
      map((res: ApiResponse<any>) => {
        const page = res?.data;
        const content: CourseSummary[] = (page?.content ?? []).map((course: any) =>
          normalizeCourseThumbnail(course)
        );
        return {
          data: content,
          pagination: mapSpringPagePagination(page) ?? res?.pagination,
          message: res?.message
        } as ApiResponse<CourseSummary[]>;
      })
    );
  }

  getCourseContent(courseId: string) {
    return this.api.getWithResponse<CourseContentChapter[]>(COURSE_ENDPOINTS.CONTENT(courseId));
  }

  enrollCourse(courseId: string) {
    return this.api.postWithResponse<any>(`/api/v3/student/courses/${courseId}/enroll`, {});
  }

  enrollStudentAsTeacher(courseId: string, payload: EnrollStudentRequest) {
    return this.api.postWithResponse<string>(COURSE_ENDPOINTS.TEACHER.ENROLLMENTS(courseId), payload).pipe(
      tap(() => this.invalidateEnrolledStudentsCache(courseId))
    );
  }

  bulkEnrollStudents(courseId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.postWithResponse<any>(COURSE_ENDPOINTS.TEACHER.BULK_ENROLL(courseId), formData).pipe(
      tap(() => this.invalidateEnrolledStudentsCache(courseId))
    );
  }

  deleteCourse(id: string) {
    return this.api.delete<ApiResponse<string>>(COURSE_ENDPOINTS.TEACHER.BY_ID(id));
  }

  submitForApproval(id: string) {
    return this.api.postWithResponse<CourseDetail>(COURSE_ENDPOINTS.TEACHER.SUBMIT_APPROVAL(id), {});
  }

  cancelApprovalRequest(id: string) {
    return this.api.postWithResponse<CourseDetail>(COURSE_ENDPOINTS.TEACHER.CANCEL_APPROVAL(id), {});
  }

  getReviewStatus(id: string) {
    return this.api.getWithResponse<CourseReviewStatus>(COURSE_ENDPOINTS.TEACHER.REVIEW_STATUS(id));
  }

  getCourseProgress(courseId: string) {
    return this.api.getWithResponse<any>(COURSE_ENDPOINTS.STUDENT.PROGRESS(courseId));
  }

  getCompletedLessonIds(courseId: string) {
    return this.api.getWithResponse<string[]>(`/api/v3/student/progress/courses/${courseId}/completed-ids`);
  }

  getNextLesson(courseId: string) {
    return this.api.getWithResponse<any>(COURSE_ENDPOINTS.STUDENT.NEXT_LESSON(courseId));
  }

  // Get available students for enrollment (not yet enrolled in this course)
  getAvailableStudents(courseId: string, params?: { page?: number; size?: number; search?: string }): Observable<ApiResponse<AvailableStudent[]>> {
    return this.api.getWithResponse<any>(COURSE_ENDPOINTS.TEACHER.AVAILABLE_STUDENTS(courseId), { params }).pipe(
      map((res: ApiResponse<any>) => {
        const content: AvailableStudent[] = res?.data?.content ?? [];
        return {
          data: content,
          pagination: res?.pagination,
          message: res?.message
        } as ApiResponse<AvailableStudent[]>;
      })
    );
  }

  // Get enrolled students in this course (with caching)
  getEnrolledStudents(courseId: string, params?: { page?: number; size?: number; search?: string }): Observable<ApiResponse<EnrolledStudent[]>> {
    const cacheKey = `enrolled-students-${courseId}-${JSON.stringify(params || {})}`;

    return this.cache.get(
      cacheKey,
      () => this.api.getWithResponse<any>(COURSE_ENDPOINTS.TEACHER.ENROLLED_STUDENTS(courseId), { params }).pipe(
        map((res: ApiResponse<any>) => {
          const content: EnrolledStudent[] = res?.data?.content ?? res?.data ?? [];
          return {
            data: content,
            pagination: res?.pagination,
            message: res?.message
          } as ApiResponse<EnrolledStudent[]>;
        })
      ),
      30000 // Cache for 30 seconds
    );
  }

  // Call this after enrolling students to refresh the list
  invalidateEnrolledStudentsCache(courseId: string): void {
    this.cache.invalidatePattern(`enrolled-students-${courseId}`);
  }
}

export interface AvailableStudent {
  id: string;
  fullName: string;
  email: string;
}

export interface EnrolledStudent {
  id: string;
  fullName: string;
  email: string;
  enrolledAt?: string;
  status?: string;
  progressPercentage?: number;
}

export interface CourseReviewStatus {
  courseId: string;
  status: string;
  /**
   * Draft change-set status on APPROVED courses (PENDING_REVIEW / CHANGES_REQUESTED / DRAFT).
   * Null when the course itself is the unit under review (e.g., DRAFT/PENDING/REJECTED).
   */
  draftChangeStatus?: string | null;
  reviewComment?: string;
  reviewedAt?: string;
  reviewedByName?: string;
  /** Latest rejection category code (matches CourseRejectionCategory enum on BE). */
  rejectionCategory?: string;
}
