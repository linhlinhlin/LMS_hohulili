export const ADMIN_ENDPOINTS = {
  // Analytics
  ANALYTICS: '/api/v1/admin/analytics',
  USER_ANALYTICS: '/api/v1/admin/users/analytics',
  COURSE_ANALYTICS: '/api/v1/admin/courses/analytics',

  // Course Management
  PENDING_COURSES: '/api/v1/admin/courses/pending',
  ALL_COURSES: '/api/v1/admin/courses/all',
  APPROVE_COURSE: (courseId: string) => `/api/v1/admin/courses/${courseId}/approve`,
  REJECT_COURSE: (courseId: string) => `/api/v1/admin/courses/${courseId}/reject`,
  DELETE_COURSE: (courseId: string) => `/api/v1/admin/courses/${courseId}`,

  // User Management
  USERS: '/api/v1/users',
  ALL_USERS_NO_PAGINATION: '/api/v1/users/list/all',
  USER_DETAIL: (userId: string) => `/api/v1/users/${userId}`,
  CREATE_USER: '/api/v1/users',
  UPDATE_USER: (userId: string) => `/api/v1/users/${userId}`,
  DELETE_USER: (userId: string) => `/api/v1/users/${userId}`,
  TOGGLE_USER_STATUS: (userId: string) => `/api/v1/users/${userId}/toggle-status`,
  BULK_IMPORT_USERS: '/api/v1/users/bulk-import',
  IMPORT_TEMPLATE: '/api/v1/users/bulk-import/template',

  // File Upload
  SIGNED_URL: '/api/v1/uploads/signed-url',
  VALIDATE_UPLOAD: '/api/v1/uploads/validate',
  DELETE_FILE: '/api/v1/uploads/file'
} as const;