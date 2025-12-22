import { API } from './api.config';

export const LESSON_ASSIGNMENT_ENDPOINTS = {
  BASE: `${API.BASE}/lesson-assignments`,
  ASSIGN: (lessonId: string, studentId: string) => `${API.BASE}/lesson-assignments?lessonId=${lessonId}&studentId=${studentId}`,
  LIST_BY_LESSON: (lessonId: string) => `${API.BASE}/lesson-assignments?lessonId=${lessonId}`,
  UNASSIGN: (lessonId: string, studentId: string) => `${API.BASE}/lesson-assignments?lessonId=${lessonId}&studentId=${studentId}`
} as const;
