export const COURSE_ENDPOINTS = {
  BASE: '/api/v1/courses',
  CREATE: '/api/v1/courses',
  MY_COURSES: '/api/v1/courses/my-courses',
  ENROLLED_COURSES: '/api/v1/courses/enrolled-courses',
  BY_ID: (id: string) => `/api/v1/courses/${id}`,
  CONTENT: (id: string) => `/api/v1/courses/${id}/content`,
  PUBLISH: (id: string) => `/api/v1/courses/${id}/publish`,
  ENROLLMENTS: (id: string) => `/api/v1/courses/${id}/enrollments`
} as const;
