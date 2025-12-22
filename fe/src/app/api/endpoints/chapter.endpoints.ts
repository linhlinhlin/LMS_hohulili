import { API } from './api.config';

export const CHAPTER_ENDPOINTS = {
    CREATE: (courseId: string) => `${API.BASE}/courses/${courseId}/chapters`,
    UPDATE: (chapterId: string) => `${API.BASE}/courses/chapters/${chapterId}`,
    DELETE: (chapterId: string) => `${API.BASE}/courses/chapters/${chapterId}`,
    LIST_FLAT: (courseId: string) => `${API.BASE}/chapters?courseId=${encodeURIComponent(courseId)}`
} as const;
