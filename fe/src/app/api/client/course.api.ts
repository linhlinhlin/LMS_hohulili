import { Injectable, inject } from '@angular/core';
import { ApiClient } from './api-client';
import { COURSE_ENDPOINTS } from '../endpoints/course.endpoints';
import { ApiResponse } from '../types/common.types';
import { CreateCourseRequest, CourseDetail, CourseSummary, CourseContentChapter, EnrollStudentRequest } from '../types/course.types';
import { map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { ApiCacheService } from '../../core/services/api-cache.service';

@Injectable({ providedIn: 'root' })
export class CourseApi {
  private api = inject(ApiClient);
  private cache = inject(ApiCacheService);

  createCourse(payload: CreateCourseRequest) {
    return this.api.postWithResponse<CourseDetail>(COURSE_ENDPOINTS.CREATE, payload);
  }

  getCourseById(id: string): Observable<ApiResponse<CourseDetail>> {
    // apiResponseInterceptor unwraps response, we re-wrap for consumers
    return this.api.get<CourseDetail>(COURSE_ENDPOINTS.BY_ID(id)).pipe(
      map((data: CourseDetail) => ({
        success: true,
        data,
        message: 'Course loaded'
      } as ApiResponse<CourseDetail>))
    );
  }

  updateCourse(id: string, payload: Partial<CreateCourseRequest>) {
    return this.api.put<ApiResponse<CourseDetail>>(COURSE_ENDPOINTS.BY_ID(id), payload);
  }

  publishCourse(id: string) {
    // Backend uses PATCH for publish endpoint
    return this.api.patch<ApiResponse<CourseDetail>>(COURSE_ENDPOINTS.PUBLISH(id), {});
  }

  myCourses() {
    // apiResponseInterceptor unwraps response, so we receive raw Spring Page
    return this.api.get<any>(COURSE_ENDPOINTS.MY_COURSES).pipe(
      map((res: any) => {
        const content: CourseSummary[] = res?.content ?? res?.data?.content ?? [];
        const pagination = res?.totalElements !== undefined ? {
          page: (res?.number ?? 0) + 1,
          totalPages: res?.totalPages ?? 1,
          totalItems: res?.totalElements ?? 0,
          limit: res?.size ?? 10
        } : res?.pagination;
        return {
          data: content,
          pagination,
          message: res?.message
        } as ApiResponse<CourseSummary[]>;
      })
    );
  }

  publicCourses(params?: { page?: number; limit?: number; search?: string; teacher?: string }): Observable<ApiResponse<CourseSummary[]>> {
    return this.api.get<any>(COURSE_ENDPOINTS.BASE, { params }).pipe(
      map((res: any) => {
        const content: CourseSummary[] = res?.content ?? res?.data?.content ?? [];
        const pagination = res?.totalElements !== undefined ? {
          page: (res?.number ?? 0) + 1,
          totalPages: res?.totalPages ?? 1,
          totalItems: res?.totalElements ?? 0,
          limit: res?.size ?? 10
        } : res?.pagination;
        return {
          data: content,
          pagination,
          message: res?.message
        } as ApiResponse<CourseSummary[]>;
      })
    );
  }

  enrolledCourses(params?: { page?: number; limit?: number }): Observable<ApiResponse<CourseSummary[]>> {
    // Note: apiResponseInterceptor unwraps {data} from backend
    // So we receive raw Page<CourseSummary> directly
    return this.api.get<any>(COURSE_ENDPOINTS.ENROLLED_COURSES, { params }).pipe(
      map((res: any) => {
        // Handle both: 
        // 1. Unwrapped Spring Page: { content: [...], totalElements, ... }
        // 2. Still wrapped (fallback): { data: { content: [...] } }
        const content: CourseSummary[] = res?.content ?? res?.data?.content ?? [];
        const pagination = res?.totalElements !== undefined ? {
          page: (res?.number ?? 0) + 1,
          totalPages: res?.totalPages ?? 1,
          totalItems: res?.totalElements ?? 0,
          limit: res?.size ?? 10
        } : res?.pagination;

        return {
          data: content,
          pagination,
          message: res?.message
        } as ApiResponse<CourseSummary[]>;
      })
    );
  }

  getCourseContent(courseId: string): Observable<ApiResponse<CourseContentChapter[]>> {
    // apiResponseInterceptor unwraps response, we re-wrap for consumers
    return this.api.get<CourseContentChapter[]>(COURSE_ENDPOINTS.CONTENT(courseId)).pipe(
      map((data: CourseContentChapter[]) => ({
        success: true,
        data,
        message: 'Course content loaded'
      } as ApiResponse<CourseContentChapter[]>))
    );
  }

  enrollCourse(courseId: string, classId?: string) {
    const payload = classId ? { classId } : {};
    return this.api.postWithResponse<string>(`${COURSE_ENDPOINTS.BY_ID(courseId)}/enroll`, payload);
  }

  enrollStudentAsTeacher(courseId: string, payload: EnrollStudentRequest) {
    return this.api.postWithResponse<string>(COURSE_ENDPOINTS.ENROLLMENTS(courseId), payload).pipe(
      tap(() => this.invalidateEnrolledStudentsCache(courseId))
    );
  }

  bulkEnrollStudents(courseId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.postWithResponse<any>(`/api/v3/courses/${courseId}/bulk-enroll`, formData).pipe(
      tap(() => this.invalidateEnrolledStudentsCache(courseId))
    );
  }

  deleteCourse(id: string) {
    return this.api.delete<ApiResponse<string>>(COURSE_ENDPOINTS.BY_ID(id));
  }

  submitForApproval(id: string) {
    return this.api.postWithResponse<CourseDetail>(`/api/v3/courses/${id}/submit-for-approval`, {});
  }

  cancelApprovalRequest(id: string) {
    return this.api.postWithResponse<CourseDetail>(`/api/v3/courses/${id}/cancel-approval`, {});
  }

  getReviewStatus(id: string) {
    return this.api.getWithResponse<CourseReviewStatus>(`/api/v3/courses/${id}/review-status`);
  }

  getCourseProgress(courseId: string) {
    // apiResponseInterceptor unwraps response, returns raw data
    return this.api.get<any>(`/api/v3/student/progress/courses/${courseId}`);
  }

  getNextLesson(courseId: string) {
    // apiResponseInterceptor unwraps response, returns raw data  
    return this.api.get<any>(`/api/v3/student/progress/courses/${courseId}/next-lesson`);
  }

  getAvailableClasses(courseId: string) {
    return this.api.getWithResponse<ClassSummary[]>(`/api/v3/courses/${courseId}/classes/available`);
  }

  // Get available students for enrollment (not yet enrolled in this course)
  getAvailableStudents(courseId: string, params?: { page?: number; size?: number; search?: string }): Observable<ApiResponse<AvailableStudent[]>> {
    return this.api.getWithResponse<any>(`/api/v3/courses/${courseId}/available-students`, { params }).pipe(
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
      () => this.api.getWithResponse<any>(`/api/v3/courses/${courseId}/students`, { params }).pipe(
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
  reviewComment?: string;
  reviewedAt?: string;
  reviewedByName?: string;
}

export interface ClassSummary {
  id: string;
  name: string;
  code: string;
  teacherName: string;
  startDate?: string;
  endDate?: string;
  maxStudents: number;
}

