import { API } from './api.config';

export const LESSON_ENDPOINTS = {
  CREATE: (sectionId: string) => `${API.BASE}/courses/sections/${sectionId}/lessons`,
  UPDATE: (lessonId: string) => `${API.BASE}/courses/sections/lessons/${lessonId}`,
  DELETE: (lessonId: string) => `${API.BASE}/courses/sections/lessons/${lessonId}`,
  BY_ID: (lessonId: string) => `${API.BASE}/courses/sections/lessons/${lessonId}`,
  LIST_BY_SECTION: (sectionId: string) => `${API.BASE}/lessons?sectionId=${encodeURIComponent(sectionId)}`,
  LIST_BY_COURSE: (courseId: string) => `${API.BASE}/lessons?courseId=${encodeURIComponent(courseId)}`
} as const;
