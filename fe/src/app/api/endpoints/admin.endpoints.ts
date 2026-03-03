/**
 * Admin API Endpoints - V3
 * Standardized RESTful endpoints for Admin operations
 * Backend: AdminCoursesControllerV3, UserControllerV3
 */
export const ADMIN_ENDPOINTS = {
  // === Analytics (BE: AdminCoursesControllerV3 only has /courses/analytics) ===
  ANALYTICS: '/api/v3/admin/courses/analytics',
  USER_ANALYTICS: '/api/v3/admin/courses/analytics',
  COURSE_ANALYTICS: '/api/v3/admin/courses/analytics',

  // === Course Management ===
  PENDING_COURSES: '/api/v3/admin/courses/pending',
  ALL_COURSES: '/api/v3/admin/courses/all',
  COURSE_BY_ID: (courseId: string) => `/api/v3/admin/courses/${courseId}`,
  APPROVE_COURSE: (courseId: string) => `/api/v3/admin/courses/${courseId}/approve`,
  REJECT_COURSE: (courseId: string) => `/api/v3/admin/courses/${courseId}/reject`,
  REVOKE_COURSE: (courseId: string) => `/api/v3/admin/courses/${courseId}/revoke`,
  DELETE_COURSE: (courseId: string) => `/api/v3/admin/courses/${courseId}`,
  BULK_APPROVE: '/api/v3/admin/courses/bulk-approve',
  BULK_REJECT: '/api/v3/admin/courses/bulk-reject',

  // === Categories (legacy flat list) ===
  CATEGORIES: '/api/v3/categories',

  // === Course Categories (new hierarchical) ===
  COURSE_CATEGORIES: '/api/v3/admin/course-categories',
  COURSE_CATEGORIES_REORDER: '/api/v3/admin/course-categories/reorder',

  // === Course Tags ===
  COURSE_TAGS: '/api/v3/admin/course-tags',

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
  USER_ENROLLED_COURSES: (userId: string) => `/api/v3/users/${userId}/enrolled-courses`,
  USER_MANAGED_COURSES: (userId: string) => `/api/v3/users/${userId}/managed-courses`,
  USER_COOP_COURSES: (userId: string) => `/api/v3/users/${userId}/coop-courses`,
  UPDATE_USER_STATUS: (userId: string) => `/api/v3/users/${userId}/status`,

  // === Settings ===
  SETTINGS: '/api/v3/admin/settings',

  // === File Upload (Admin) ===
  SIGNED_URL: '/api/v3/files/presign',
  VALIDATE_UPLOAD: '/api/v3/files/validate',
  DELETE_FILE: '/api/v3/files'
} as const;

export interface BulkActionResponse {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

export interface CategoryDTO {
  id: string;
  code: string;
  name: string;
  prefix: string;
}

// Public endpoints (no auth required)
export const PUBLIC_ENDPOINTS = {
  COURSE_CATEGORIES: '/api/v3/course-categories',
  COURSE_TAGS: '/api/v3/course-tags',
} as const;
