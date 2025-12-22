import { API } from './api.config';

export const COURSE_ENDPOINTS = {
  BASE: `${API.BASE}/courses`,
  CREATE: `${API.BASE}/courses`,
  MY_COURSES: `${API.BASE}/courses/my-courses`,
  ENROLLED_COURSES: `${API.BASE}/courses/enrolled-courses`,
  BY_ID: (id: string) => `${API.BASE}/courses/${id}`,
  CONTENT: (id: string) => `${API.BASE}/courses/${id}/content`,
  PUBLISH: (id: string) => `${API.BASE}/courses/${id}/publish`,
  ENROLLMENTS: (id: string) => `${API.BASE}/courses/${id}/enrollments`
} as const;
