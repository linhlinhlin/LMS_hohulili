export const LESSON_ENDPOINTS = {
  CREATE: (sectionId: string) => `/api/v1/courses/sections/${sectionId}/lessons`,
  UPDATE: (lessonId: string) => `/api/v1/courses/sections/lessons/${lessonId}`,
  DELETE: (lessonId: string) => `/api/v1/courses/sections/lessons/${lessonId}`,
  BY_ID: (lessonId: string) => `/api/v1/courses/sections/lessons/${lessonId}`,
  LIST_BY_SECTION: (sectionId: string) => `/api/v1/lessons?sectionId=${encodeURIComponent(sectionId)}`,
  LIST_BY_COURSE: (courseId: string) => `/api/v1/lessons?courseId=${encodeURIComponent(courseId)}`
} as const;
