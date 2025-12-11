export const CHAPTER_ENDPOINTS = {
    CREATE: (courseId: string) => `/api/v1/courses/${courseId}/chapters`,
    UPDATE: (chapterId: string) => `/api/v1/courses/chapters/${chapterId}`,
    DELETE: (chapterId: string) => `/api/v1/courses/chapters/${chapterId}`,
    LIST_FLAT: (courseId: string) => `/api/v1/chapters?courseId=${encodeURIComponent(courseId)}`
} as const;
