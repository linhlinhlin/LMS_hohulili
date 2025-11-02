import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from './api-client';
import { LESSON_ASSIGNMENT_ENDPOINTS } from '../endpoints/lesson-assignment.endpoints';
import { ApiResponse } from '../types/common.types';

export interface LessonAssignmentItem {
  id: string;
  lessonId: string;
  studentId: string;
  studentName?: string;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class LessonAssignmentApi {
  private api = inject(ApiClient);

  assign(lessonId: string, studentId: string) {
    return this.api.postWithResponse<LessonAssignmentItem>(LESSON_ASSIGNMENT_ENDPOINTS.ASSIGN(lessonId, studentId), {});
  }

  unassign(lessonId: string, studentId: string) {
    return this.api.delete<ApiResponse<string>>(LESSON_ASSIGNMENT_ENDPOINTS.UNASSIGN(lessonId, studentId));
  }

  listByLesson(lessonId: string) {
    return this.api.getWithResponse<LessonAssignmentItem[]>(LESSON_ASSIGNMENT_ENDPOINTS.LIST_BY_LESSON(lessonId));
  }
}
