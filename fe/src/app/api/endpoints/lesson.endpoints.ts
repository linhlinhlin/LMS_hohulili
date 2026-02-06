export const LESSON_ENDPOINTS = {
  CREATE: (chapterId: string) => `/api/v3/courses/chapters/${chapterId}/lessons`,
  UPDATE: (lessonId: string) => `/api/v3/courses/lessons/${lessonId}`,
  DELETE: (lessonId: string) => `/api/v3/courses/lessons/${lessonId}`,
  BY_ID: (lessonId: string) => `/api/v3/courses/lessons/${lessonId}`,
  LIST_BY_CHAPTER: (chapterId: string) => `/api/v3/courses/chapters/${chapterId}/lessons`,
  LIST_BY_COURSE: (courseId: string) => `/api/v3/courses/${courseId}/content`,
  // FE "section" = BE "chapter" - map to chapters endpoint
  LIST_BY_SECTION: (sectionId: string) => `/api/v3/courses/chapters/${sectionId}/lessons`
} as const;
