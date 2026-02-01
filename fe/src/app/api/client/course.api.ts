import { Injectable, inject } from '@angular/core';
import { ApiClient } from './api-client';
import { COURSE_ENDPOINTS } from '../endpoints/course.endpoints';
import { ApiResponse } from '../types/common.types';
import { CreateCourseRequest, CourseDetail, CourseSummary, CourseContentChapter } from '../types/course.types';
import { EnrollStudentRequest } from '../types/enrollment.types';
import { map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { ApiCacheService } from '../../core/services/api-cache.service';

@Injectable({ providedIn: 'root' })
export class CourseApi {
  private api = inject(ApiClient);
  private cache = inject(ApiCacheService);

  createCourse(payload: CreateCourseRequest) {
    return this.api.postWithResponse<CourseDetail>(COURSE_ENDPOINTS.TEACHER.BASE, payload);
  }

  getCourseById(id: string) {
    return this.api.getWithResponse<CourseDetail>(COURSE_ENDPOINTS.BY_ID(id));
  }

  updateCourse(id: string, payload: Partial<CreateCourseRequest>) {
    return this.api.put<ApiResponse<CourseDetail>>(COURSE_ENDPOINTS.TEACHER.BY_ID(id), payload);
  }

  publishCourse(id: string) {
    // Backend uses PATCH for publish endpoint
    return this.api.patch<ApiResponse<CourseDetail>>(COURSE_ENDPOINTS.AUTHORING.PUBLISH(id), {});
  }

  myCourses() {
    // Unwrap Spring Page response to a flat array while preserving pagination
    return this.api.getWithResponse<any>(COURSE_ENDPOINTS.TEACHER.MY_COURSES).pipe(
      map((res: ApiResponse<any>) => {
        const content: CourseSummary[] = res?.data?.content ?? [];
        return {
          data: content,
          pagination: res?.pagination,
          message: res?.message
        } as ApiResponse<CourseSummary[]>;
      })
    );
  }

  publicCourses(params?: { page?: number; limit?: number; search?: string; teacher?: string }): Observable<ApiResponse<CourseSummary[]>> {
    return this.api.getWithResponse<any>(COURSE_ENDPOINTS.BASE, { params }).pipe(
      map((res: ApiResponse<any>) => {
        const content: CourseSummary[] = res?.data?.content ?? [];
        return {
          data: content,
          pagination: res?.pagination,
          message: res?.message
        } as ApiResponse<CourseSummary[]>;
      })
    );
  }

  enrolledCourses(params?: { page?: number; limit?: number }): Observable<ApiResponse<CourseSummary[]>> {
    return this.api.getWithResponse<any>(COURSE_ENDPOINTS.STUDENT.ENROLLED, { params }).pipe(
      map((res: ApiResponse<any>) => {
        const content: CourseSummary[] = res?.data?.content ?? [];
        return {
          data: content,
          pagination: res?.pagination,
          message: res?.message
        } as ApiResponse<CourseSummary[]>;
      })
    );
  }

  getCourseContent(courseId: string) {
    return this.api.getWithResponse<CourseContentChapter[]>(COURSE_ENDPOINTS.CONTENT(courseId));
  }

  enrollCourse(courseId: string, classId?: string) {
    const payload = classId ? { classId } : {};
    return this.api.postWithResponse<string>(`${COURSE_ENDPOINTS.TEACHER.BY_ID(courseId)}/enroll`, payload);
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

  getNextLesson(courseId: string) {
    return this.api.getWithResponse<any>(COURSE_ENDPOINTS.STUDENT.NEXT_LESSON(courseId));
  }

  getAvailableClasses(courseId: string) {
    return this.api.getWithResponse<ClassSummary[]>(COURSE_ENDPOINTS.TEACHER.AVAILABLE_CLASSES(courseId));
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
