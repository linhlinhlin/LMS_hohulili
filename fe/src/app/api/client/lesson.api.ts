import { Injectable, inject } from '@angular/core';
import { ApiClient } from './api-client';
import { LESSON_ENDPOINTS } from '../endpoints/lesson.endpoints';
import { ApiResponse } from '../types/common.types';
import { CreateLessonRequest, LessonDetail, UpdateLessonRequest } from '../types/course.types';
import { CreateAssignmentLessonRequest, AssignmentLessonDetail } from '../types/assignment.types';

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
    return this.api.getWithResponse<LessonDetail>(LESSON_ENDPOINTS.BY_ID(lessonId));
  }

  listBySection(sectionId: string) {
    return this.api.getWithResponse<any>(LESSON_ENDPOINTS.LIST_BY_SECTION(sectionId));
  }

  listByCourse(courseId: string) {
    return this.api.getWithResponse<any>(LESSON_ENDPOINTS.LIST_BY_COURSE(courseId));
  }

  // ========================================
  // ASSIGNMENT API METHODS
  // ========================================
  
  createAssignmentLesson(sectionId: string, payload: CreateAssignmentLessonRequest) {
    return this.api.postWithResponse<AssignmentLessonDetail>(`/api/v1/courses/sections/${sectionId}/lessons/assignment`, payload);
  }

  getLessonAssignment(lessonId: string) {
    return this.api.getWithResponse<any>(`/api/v1/courses/sections/lessons/${lessonId}/assignment`);
  }

  updateAssignmentLesson(lessonId: string, payload: any) {
    return this.api.put<ApiResponse<any>>(`/api/v1/courses/sections/lessons/${lessonId}/assignment`, payload);
  }

  toggleAssignmentStatus(assignmentId: string, status: string) {
    return this.api.put<ApiResponse<any>>(`/api/v1/assignments/${assignmentId}/status`, { status });
  }

  getAssignmentSubmissions(assignmentId: string) {
    return this.api.getWithResponse<any>(`/api/v1/assignments/${assignmentId}/submissions`);
  }

  getAssignmentDetails(assignmentId: string) {
    return this.api.getWithResponse<any>(`/api/v1/assignments/${assignmentId}`);
  }

  gradeSubmission(submissionId: string, payload: { grade: number; feedback: string }) {
    return this.api.put<ApiResponse<any>>(`/api/v1/assignments/submissions/${submissionId}/grade`, payload);
  }

  // Student Assignment APIs
  getAssignmentForStudent(assignmentId: string) {
    return this.api.getWithResponse<any>(`/api/v1/student/assignments/${assignmentId}`);
  }

  getStudentSubmission(assignmentId: string) {
    return this.api.getWithResponse<any>(`/api/v1/student/assignments/${assignmentId}/submission`);
  }

  submitAssignment(formData: FormData) {
    return this.api.post<ApiResponse<any>>(`/api/v1/student/assignments/submit`, formData);
  }

  updateSubmission(submissionId: string, formData: FormData) {
    return this.api.put<ApiResponse<any>>(`/api/v1/student/assignments/submissions/${submissionId}`, formData);
  }
}
