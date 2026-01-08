export const LESSON_ENDPOINTS = {
  CREATE: (chapterId: string) => `/api/v3/courses/chapters/${chapterId}/lessons`,
  UPDATE: (lessonId: string) => `/api/v3/courses/lessons/${lessonId}`,
  DELETE: (lessonId: string) => `/api/v3/courses/lessons/${lessonId}`,
  BY_ID: (lessonId: string) => `/api/v3/courses/sections/lessons/${lessonId}`,
  // Restored for compatibility with SectionEditorComponent
  LIST_BY_SECTION: (chapterId: string) => `/api/v3/courses/chapters/${chapterId}/lessons`,
  LIST_BY_COURSE: (courseId: string) => `/api/v3/courses/${courseId}/content` // Maps to content which contains lessons
} as const;
