/**
 * Admin API Endpoints - V3
 * Standardized RESTful endpoints for Admin operations
 * Backend: AdminCoursesControllerV3, UserControllerV3
 */
export const ADMIN_ENDPOINTS = {
  // === Analytics ===
  ANALYTICS: '/api/v3/admin/analytics',
  USER_ANALYTICS: '/api/v3/admin/users/analytics',
  COURSE_ANALYTICS: '/api/v3/admin/courses/analytics',

  // === Course Management ===
  PENDING_COURSES: '/api/v3/admin/courses/pending',
  ALL_COURSES: '/api/v3/admin/courses/all',
  COURSE_BY_ID: (courseId: string) => `/api/v3/admin/courses/${courseId}`,
  APPROVE_COURSE: (courseId: string) => `/api/v3/admin/courses/${courseId}/approve`,
  REJECT_COURSE: (courseId: string) => `/api/v3/admin/courses/${courseId}/reject`,
  REVOKE_COURSE: (courseId: string) => `/api/v3/admin/courses/${courseId}/revoke`,
  DELETE_COURSE: (courseId: string) => `/api/v3/admin/courses/${courseId}`,

  // === User Management ===
  USERS: '/api/v3/users',
  ALL_USERS_NO_PAGINATION: '/api/v3/users/list/all',
  USER_SEARCH: '/api/v3/users/search',
  USER_DETAIL: (userId: string) => `/api/v3/users/${userId}`,
  CREATE_USER: '/api/v3/users',
  UPDATE_USER: (userId: string) => `/api/v3/users/${userId}`,
  DELETE_USER: (userId: string) => `/api/v3/users/${userId}`,
  TOGGLE_USER_STATUS: (userId: string) => `/api/v3/users/${userId}/toggle-status`,
  BULK_IMPORT_USERS: '/api/v3/users/bulk-import',
  IMPORT_TEMPLATE: '/api/v3/users/bulk-import/template',

  // === User Courses (Admin View) ===
  USER_ENROLLED_COURSES: (userId: string) => `/api/v3/admin/users/${userId}/enrolled-courses`,
  USER_MANAGED_COURSES: (userId: string) => `/api/v3/admin/users/${userId}/managed-courses`,
  USER_COOP_COURSES: (userId: string) => `/api/v3/admin/users/${userId}/coop-courses`,
  UPDATE_USER_STATUS: (userId: string) => `/api/v3/admin/users/${userId}/status`,

  // === File Upload (Admin) ===
  SIGNED_URL: '/api/v3/files/presign',
  VALIDATE_UPLOAD: '/api/v3/files/validate',
  DELETE_FILE: '/api/v3/files'
} as const;
