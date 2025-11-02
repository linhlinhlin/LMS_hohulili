export interface User {
  id: string;           // Changed from number to string (UUID)
  username: string;     // Added - required by backend
  email: string;
  fullName: string;     // Changed from name to match backend
  // Compatibility alias for legacy templates using `name`
  name?: string;
  role: UserRole;
  enabled: boolean;     // Added - account status from backend
  avatar?: string;      // Keep for UI - not sent to backend
  department?: string;  // Keep for UI - not sent to backend
  studentId?: string;   // Keep for UI - not sent to backend
  createdAt: string;
  updatedAt: string;
}

// Runtime constants for roles (used in value positions)
export const UserRole = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student'
} as const;

// Type alias for role values (used in type positions)
export type UserRole = typeof UserRole[keyof typeof UserRole];

export interface LoginRequest {
  email: string;        // Use email as login identifier (backend accepts email or username)
  password: string;
}

export interface RegisterRequest {
  username: string;     // Added - required by backend
  email: string;
  password: string;
  fullName: string;     // Changed from name to match backend
  role?: UserRole;      // Made optional - backend has default STUDENT
}