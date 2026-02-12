/**
 * Video Progress Endpoints - Centralized API paths
 * @see VideoProgressControllerV3
 */
export const VIDEO_PROGRESS_ENDPOINTS = {
    TRACK: '/api/v3/video-progress/track',
    BY_SECTION: (sectionId: string) => `/api/v3/video-progress/${sectionId}`,
    BY_LESSON: (lessonId: string) => `/api/v3/video-progress/lesson/${lessonId}`,
    CAN_PROCEED: (sectionId: string) => `/api/v3/video-progress/${sectionId}/can-proceed`,
    RESUME: (sectionId: string) => `/api/v3/video-progress/${sectionId}/resume`,
} as const;
