import { API } from './api.config';

export const SECTION_ENDPOINTS = {
  CREATE: `${API.BASE}/sections`,
  UPDATE: (sectionId: string) => `${API.BASE}/sections/${sectionId}`,
  DELETE: (sectionId: string) => `${API.BASE}/sections/${sectionId}`,
  GET: (sectionId: string) => `${API.BASE}/sections/${sectionId}`
} as const;
