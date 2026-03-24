import { Injectable, inject } from '@angular/core';
import { ApiClient } from './api-client';
import { LESSON_ENDPOINTS } from '../endpoints/lesson.endpoints';
import { ApiResponse } from '../types/common.types';
import { CreateLessonRequest, LessonDetail, UpdateLessonRequest } from '../types/course.types';
import { CreateAssignmentLessonRequest, AssignmentLessonDetail } from '../types/assignment.types';

/**
 * Assignment API Endpoints - V3
 */
const ASSIGNMENT_ENDPOINTS = {
  // Teacher Assignment Management
  CREATE_ASSIGNMENT_LESSON: (sectionId: string) => `/api/v3/courses/sections/${sectionId}/lessons/assignment`,
  GET_LESSON_ASSIGNMENT: (lessonId: string) => `/api/v3/courses/sections/lessons/${lessonId}/assignment`,
  UPDATE_ASSIGNMENT_LESSON: (lessonId: string) => `/api/v3/courses/sections/lessons/${lessonId}/assignment`,
  TOGGLE_STATUS: (assignmentId: string) => `/api/v3/assignments/${assignmentId}/status`,
  GET_SUBMISSIONS: (assignmentId: string) => `/api/v3/assignments/${assignmentId}/submissions`,
  GET_DETAILS: (assignmentId: string) => `/api/v3/assignments/${assignmentId}`,
  GRADE_SUBMISSION: (submissionId: string) => `/api/v3/assignments/submissions/${submissionId}/grade`,

  // Student Assignment
  STUDENT_ASSIGNMENT: (assignmentId: string) => `/api/v3/student/assignments/${assignmentId}`,
  STUDENT_SUBMISSION: (assignmentId: string) => `/api/v3/student/assignments/${assignmentId}/submission`,
  SUBMIT_ASSIGNMENT: '/api/v3/student/assignments/submit',
  UPDATE_SUBMISSION: (submissionId: string) => `/api/v3/student/assignments/submissions/${submissionId}`,

  // Progress
  MARK_COMPLETE: (lessonId: string) => `/api/v3/student/progress/lessons/${lessonId}/complete`
} as const;

@Injectable({ providedIn: 'root' })
export class LessonApi {
  private api = inject(ApiClient);

  // ========================================
  // LESSON CRUD
  // ========================================

  createLesson(sectionId: string, payload: CreateLessonRequest) {
    const requestPayload = {
      ...payload,
      type: payload.type ?? payload.lessonType
    };
    return this.api.postWithResponse<LessonDetail>(LESSON_ENDPOINTS.CREATE(sectionId), requestPayload);
  }

  updateLesson(lessonId: string, payload: UpdateLessonRequest) {
    return this.api.put<ApiResponse<LessonDetail>>(LESSON_ENDPOINTS.UPDATE(lessonId), payload);
  }

  deleteLesson(lessonId: string, courseId: string) {
    return this.api.delete<ApiResponse<string>>(`${LESSON_ENDPOINTS.DELETE(lessonId)}?courseId=${courseId}`);
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
  // PROGRESS TRACKING
  // ========================================

  markLessonComplete(lessonId: string, payload: Record<string, unknown> = {}) {
    return this.api.postWithResponse<any>(ASSIGNMENT_ENDPOINTS.MARK_COMPLETE(lessonId), payload);
  }

  getLessonProgress(lessonId: string) {
    return this.api.getWithResponse<any>(`/api/v3/student/lessons/${lessonId}/progress`);
  }

  // ========================================
  // TEACHER ASSIGNMENT API
  // ========================================

  createAssignmentLesson(sectionId: string, payload: CreateAssignmentLessonRequest) {
    return this.api.postWithResponse<AssignmentLessonDetail>(
      ASSIGNMENT_ENDPOINTS.CREATE_ASSIGNMENT_LESSON(sectionId),
      payload
    );
  }

  getLessonAssignment(lessonId: string) {
    return this.api.getWithResponse<any>(ASSIGNMENT_ENDPOINTS.GET_LESSON_ASSIGNMENT(lessonId));
  }

  updateAssignmentLesson(lessonId: string, payload: any) {
    return this.api.put<ApiResponse<any>>(ASSIGNMENT_ENDPOINTS.UPDATE_ASSIGNMENT_LESSON(lessonId), payload);
  }

  toggleAssignmentStatus(assignmentId: string, status: string) {
    return this.api.put<ApiResponse<any>>(ASSIGNMENT_ENDPOINTS.TOGGLE_STATUS(assignmentId), { status });
  }

  getAssignmentSubmissions(assignmentId: string) {
    return this.api.getWithResponse<any>(ASSIGNMENT_ENDPOINTS.GET_SUBMISSIONS(assignmentId));
  }

  getAssignmentDetails(assignmentId: string) {
    return this.api.getWithResponse<any>(ASSIGNMENT_ENDPOINTS.GET_DETAILS(assignmentId));
  }

  gradeSubmission(submissionId: string, payload: { grade: number; feedback: string }) {
    return this.api.put<ApiResponse<any>>(ASSIGNMENT_ENDPOINTS.GRADE_SUBMISSION(submissionId), payload);
  }

  // ========================================
  // STUDENT ASSIGNMENT API
  // ========================================

  getAssignmentForStudent(assignmentId: string) {
    return this.api.getWithResponse<any>(ASSIGNMENT_ENDPOINTS.STUDENT_ASSIGNMENT(assignmentId));
  }

  getStudentSubmission(assignmentId: string) {
    return this.api.getWithResponse<any>(ASSIGNMENT_ENDPOINTS.STUDENT_SUBMISSION(assignmentId));
  }

  submitAssignment(formData: FormData) {
    return this.api.post<ApiResponse<any>>(ASSIGNMENT_ENDPOINTS.SUBMIT_ASSIGNMENT, formData);
  }

  updateSubmission(submissionId: string, formData: FormData) {
    return this.api.put<ApiResponse<any>>(ASSIGNMENT_ENDPOINTS.UPDATE_SUBMISSION(submissionId), formData);
  }
}
