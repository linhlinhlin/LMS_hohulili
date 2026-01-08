export const CHAPTER_ENDPOINTS = {
    CREATE: (courseId: string) => `/api/v3/courses/${courseId}/chapters`,
    UPDATE: (chapterId: string) => `/api/v3/courses/chapters/${chapterId}`,
    DELETE: (chapterId: string) => `/api/v3/courses/chapters/${chapterId}`,
    BY_ID: (chapterId: string) => `/api/v3/courses/chapters/${chapterId}`,
    LIST_FLAT: (courseId: string) => `/api/v3/courses/${courseId}/content`
} as const;
