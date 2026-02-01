/**
 * Video Progress Endpoints - Centralized API paths
 * @see VideoProgressControllerV3
 */
export const VIDEO_PROGRESS_ENDPOINTS = {
    // Base
    BASE: '/api/v3/video-progress',

    // Section-based
    BY_SECTION: (sectionId: string) => `/api/v3/video-progress/sections/${sectionId}`,
    UPDATE: (sectionId: string) => `/api/v3/video-progress/sections/${sectionId}`,

    // Lesson-based (legacy support)
    BY_LESSON: (lessonId: string) => `/api/v3/video-progress/lessons/${lessonId}`,

    // Batch
    GET_BATCH: '/api/v3/video-progress/batch',
} as const;
