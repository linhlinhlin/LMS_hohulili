import { API } from './api.config';

export const ADMIN_ENDPOINTS = {
  // Analytics
  ANALYTICS: `${API.BASE}/admin/analytics`,
  USER_ANALYTICS: `${API.BASE}/admin/users/analytics`,
  COURSE_ANALYTICS: `${API.BASE}/admin/courses/analytics`,

  // Course Management
  PENDING_COURSES: `${API.BASE}/admin/courses/pending`,
  ALL_COURSES: `${API.BASE}/admin/courses/all`,
  APPROVE_COURSE: (courseId: string) => `${API.BASE}/admin/courses/${courseId}/approve`,
  REJECT_COURSE: (courseId: string) => `${API.BASE}/admin/courses/${courseId}/reject`,
  REVOKE_COURSE: (courseId: string) => `${API.BASE}/admin/courses/${courseId}/revoke`,
  DELETE_COURSE: (courseId: string) => `${API.BASE}/admin/courses/${courseId}`,

  // User Management
  USERS: `${API.BASE}/users`,
  ALL_USERS_NO_PAGINATION: `${API.BASE}/users/list/all`,
  USER_DETAIL: (userId: string) => `${API.BASE}/users/${userId}`,
  CREATE_USER: `${API.BASE}/users`,
  UPDATE_USER: (userId: string) => `${API.BASE}/users/${userId}`,
  DELETE_USER: (userId: string) => `${API.BASE}/users/${userId}`,
  TOGGLE_USER_STATUS: (userId: string) => `${API.BASE}/users/${userId}/toggle-status`,
  BULK_IMPORT_USERS: `${API.BASE}/users/bulk-import`,
  IMPORT_TEMPLATE: `${API.BASE}/users/bulk-import/template`,

  // File Upload
  SIGNED_URL: `${API.BASE}/uploads/signed-url`,
  VALIDATE_UPLOAD: `${API.BASE}/uploads/validate`,
  DELETE_FILE: `${API.BASE}/uploads/file`
} as const;
