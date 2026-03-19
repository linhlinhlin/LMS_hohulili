// Mapped to V3 "ContentBlock" (Section inside Lesson)
export const SECTION_ENDPOINTS = {
  CREATE: (lessonId: string) => `/api/v3/courses/lessons/${lessonId}/sections`,
  UPDATE: (lessonId: string, sectionId: string) => `/api/v3/courses/lessons/${lessonId}/sections/${sectionId}`,
  DELETE: (lessonId: string, sectionId: string) => `/api/v3/courses/lessons/${lessonId}/sections/${sectionId}`,
  GET: (lessonId: string, sectionId: string) => `/api/v3/courses/lessons/${lessonId}/sections/${sectionId}`,
  GET_STREAM_PLAY_URL: (sectionId: string) => `/api/v3/sections/${sectionId}/video/play`,
} as const;
