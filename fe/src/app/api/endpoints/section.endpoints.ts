export const SECTION_ENDPOINTS = {
  CREATE: '/api/v1/sections',
  UPDATE: (sectionId: string) => `/api/v1/sections/${sectionId}`,
  DELETE: (sectionId: string) => `/api/v1/sections/${sectionId}`,
  GET: (sectionId: string) => `/api/v1/sections/${sectionId}`,
  UPDATE_VIDEO: (sectionId: string) => `/api/v1/sections/${sectionId}/video`
} as const;
