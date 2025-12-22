import { Injectable, inject } from '@angular/core';
import { ApiClient } from './api-client';
import { LESSON_ENDPOINTS } from '../endpoints/lesson.endpoints';
import { ApiResponse } from '../types/common.types';
import { CreateLessonRequest, LessonDetail, UpdateLessonRequest } from '../types/course.types';
import { CreateAssignmentLessonRequest, AssignmentLessonDetail } from '../types/assignment.types';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class LessonApi {
  private api = inject(ApiClient);

  createLesson(sectionId: string, payload: CreateLessonRequest) {
    return this.api.postWithResponse<LessonDetail>(LESSON_ENDPOINTS.CREATE(sectionId), payload);
  }

  updateLesson(lessonId: string, payload: UpdateLessonRequest) {
    return this.api.put<ApiResponse<LessonDetail>>(LESSON_ENDPOINTS.UPDATE(lessonId), payload);
  }

  deleteLesson(lessonId: string) {
    return this.api.delete<ApiResponse<string>>(LESSON_ENDPOINTS.DELETE(lessonId));
  }

  getLessonById(lessonId: string) {
    // apiResponseInterceptor unwraps response, re-wrap for consumers
    return this.api.get<LessonDetail>(LESSON_ENDPOINTS.BY_ID(lessonId)).pipe(
      map((data: LessonDetail) => ({
        success: true,
        data,
        message: 'Lesson loaded'
      } as ApiResponse<LessonDetail>))
    );
  }

  listBySection(sectionId: string) {
    return this.api.getWithResponse<any>(LESSON_ENDPOINTS.LIST_BY_SECTION(sectionId));
  }

  listByCourse(courseId: string) {
    return this.api.getWithResponse<any>(LESSON_ENDPOINTS.LIST_BY_COURSE(courseId));
  }

  markLessonComplete(lessonId: string) {
    const url = `/api/v3/student/progress/lessons/${lessonId}/complete`;
    console.log('[API] lesson.api.markLessonComplete: Calling', url);
    return this.api.postWithResponse<any>(url, {});
  }

  // ========================================
  // ASSIGNMENT API METHODS
  // ========================================

  createAssignmentLesson(sectionId: string, payload: CreateAssignmentLessonRequest) {
    return this.api.postWithResponse<AssignmentLessonDetail>(`/api/v3/courses/sections/${sectionId}/lessons/assignment`, payload);
  }

  getLessonAssignment(lessonId: string) {
    return this.api.getWithResponse<any>(`/api/v3/courses/sections/lessons/${lessonId}/assignment`);
  }

  updateAssignmentLesson(lessonId: string, payload: any) {
    return this.api.put<ApiResponse<any>>(`/api/v3/courses/sections/lessons/${lessonId}/assignment`, payload);
  }

  toggleAssignmentStatus(assignmentId: string, status: string) {
    return this.api.put<ApiResponse<any>>(`/api/v3/assignments/${assignmentId}/status`, { status });
  }

  getAssignmentSubmissions(assignmentId: string) {
    return this.api.getWithResponse<any>(`/api/v3/assignments/${assignmentId}/submissions`);
  }

  getAssignmentDetails(assignmentId: string) {
    return this.api.getWithResponse<any>(`/api/v3/assignments/${assignmentId}`);
  }

  gradeSubmission(submissionId: string, payload: { grade: number; feedback: string }) {
    return this.api.put<ApiResponse<any>>(`/api/v3/assignments/submissions/${submissionId}/grade`, payload);
  }

  // Student Assignment APIs
  getAssignmentForStudent(assignmentId: string) {
    return this.api.getWithResponse<any>(`/api/v3/student/assignments/${assignmentId}`);
  }

  getStudentSubmission(assignmentId: string) {
    return this.api.getWithResponse<any>(`/api/v3/student/assignments/${assignmentId}/submission`);
  }

  submitAssignment(formData: FormData) {
    return this.api.post<ApiResponse<any>>(`/api/v3/student/assignments/submit`, formData);
  }

  updateSubmission(submissionId: string, formData: FormData) {
    return this.api.put<ApiResponse<any>>(`/api/v3/student/assignments/submissions/${submissionId}`, formData);
  }
}

