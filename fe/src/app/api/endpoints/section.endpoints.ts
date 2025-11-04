export const SECTION_ENDPOINTS = {
  CREATE: (courseId: string) => `/api/v1/courses/${courseId}/sections`,
  UPDATE: (sectionId: string) => `/api/v1/courses/sections/${sectionId}`,
  DELETE: (sectionId: string) => `/api/v1/courses/sections/${sectionId}`,
  LIST_FLAT: (courseId: string) => `/api/v1/sections?courseId=${encodeURIComponent(courseId)}`
} as const;
