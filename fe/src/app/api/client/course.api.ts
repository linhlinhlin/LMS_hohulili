import { Injectable, inject } from '@angular/core';
import { ApiClient } from './api-client';
import { COURSE_ENDPOINTS } from '../endpoints/course.endpoints';
import { ApiResponse } from '../types/common.types';
import { CreateCourseRequest, CourseDetail, CourseSummary, CourseContentSection, EnrollStudentRequest } from '../types/course.types';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CourseApi {
  private api = inject(ApiClient);

  createCourse(payload: CreateCourseRequest) {
    return this.api.postWithResponse<CourseDetail>(COURSE_ENDPOINTS.CREATE, payload);
  }

  getCourseById(id: string) {
    return this.api.getWithResponse<CourseDetail>(COURSE_ENDPOINTS.BY_ID(id));
  }

  updateCourse(id: string, payload: Partial<CreateCourseRequest>) {
    return this.api.put<ApiResponse<CourseDetail>>(COURSE_ENDPOINTS.BY_ID(id), payload);
  }

  publishCourse(id: string) {
    // Backend uses PATCH for publish endpoint
    return this.api.patch<ApiResponse<CourseDetail>>(COURSE_ENDPOINTS.PUBLISH(id), {});
  }

  myCourses() {
    // Unwrap Spring Page response to a flat array while preserving pagination
    return this.api.getWithResponse<any>(COURSE_ENDPOINTS.MY_COURSES).pipe(
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
    return this.api.getWithResponse<any>(COURSE_ENDPOINTS.ENROLLED_COURSES, { params }).pipe(
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
    return this.api.getWithResponse<CourseContentSection[]>(COURSE_ENDPOINTS.CONTENT(courseId));
  }

  enrollCourse(courseId: string) {
    return this.api.postWithResponse<string>(`${COURSE_ENDPOINTS.BY_ID(courseId)}/enroll`, {});
  }

  enrollStudentAsTeacher(courseId: string, payload: EnrollStudentRequest) {
    return this.api.postWithResponse<string>(COURSE_ENDPOINTS.ENROLLMENTS(courseId), payload);
  }

  bulkEnrollStudents(courseId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.postWithResponse<any>(`/api/v1/courses/${courseId}/bulk-enroll`, formData);
  }

  deleteCourse(id: string) {
    return this.api.delete<ApiResponse<string>>(COURSE_ENDPOINTS.BY_ID(id));
  }
}
