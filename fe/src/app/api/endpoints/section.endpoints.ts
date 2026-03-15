// Mapped to V3 "ContentBlock" (Section inside Lesson)
export const SECTION_ENDPOINTS = {
  CREATE: (lessonId: string) => `/api/v3/courses/lessons/${lessonId}/sections`,
  UPDATE: (lessonId: string, sectionId: string) => `/api/v3/courses/lessons/${lessonId}/sections/${sectionId}`,
  DELETE: (lessonId: string, sectionId: string) => `/api/v3/courses/lessons/${lessonId}/sections/${sectionId}`,
  GET: (lessonId: string, sectionId: string) => `/api/v3/courses/lessons/${lessonId}/sections/${sectionId}`,
  UPDATE_VIDEO: (lessonId: string, sectionId: string) => `/api/v3/courses/lessons/${lessonId}/sections/${sectionId}/video`,
  UPLOAD_STREAM_VIDEO: (sectionId: string) => `/api/v3/sections/${sectionId}/video`,
  GET_STREAM_PLAY_URL: (sectionId: string) => `/api/v3/sections/${sectionId}/video/play`,
  GET_STREAM_DOWNLOAD_URL: (sectionId: string) => `/api/v3/sections/${sectionId}/video/download`,
  GET_STREAM_SIZES: (sectionId: string) => `/api/v3/sections/${sectionId}/video/sizes`,
  DELETE_STREAM_VIDEO: (sectionId: string) => `/api/v3/sections/${sectionId}/video`
} as const;
