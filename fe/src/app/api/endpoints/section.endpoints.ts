// Mapped to V3 "ContentBlock" (Section inside Lesson)
export const SECTION_ENDPOINTS = {
  CREATE: (lessonId: string) => `/api/v3/courses/lessons/${lessonId}/sections`,
  UPDATE: (lessonId: string, sectionId: string) => `/api/v3/courses/lessons/${lessonId}/sections/${sectionId}`,
  DELETE: (lessonId: string, sectionId: string) => `/api/v3/courses/lessons/${lessonId}/sections/${sectionId}`,
  GET: (lessonId: string, sectionId: string) => `/api/v3/courses/lessons/${lessonId}/sections/${sectionId}`,
  UPDATE_VIDEO: (lessonId: string, sectionId: string) => `/api/v3/courses/lessons/${lessonId}/sections/${sectionId}/video`
} as const;
