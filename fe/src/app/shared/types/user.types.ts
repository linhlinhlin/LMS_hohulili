export interface User {
  id: string;           // Changed from number to string (UUID)
  username: string;     // Added - required by backend
  email: string;
  fullName: string;     // Changed from name to match backend
  // Compatibility alias for legacy templates using `name`
  name?: string;
  role: UserRole;
  enabled: boolean;     // Added - account status from backend
  organizationId?: string;   // UUID of user's organization (from BE UserResponse)
  organizationName?: string; // Org name (resolved from /me endpoint or JWT)
  avatar?: string;      // Keep for UI - not sent to backend
  department?: string;  // Keep for UI - not sent to backend
  studentId?: string;   // Keep for UI - not sent to backend
  createdAt: string;
  updatedAt: string;
}

// Runtime constants for roles (used in value positions)
export const UserRole = {
  ADMIN: 'admin',
  ORG_ADMIN: 'org_admin',
  TEACHER: 'teacher',
  STUDENT: 'student'
} as const;

// TypeScript type for roles (used in type positions)
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
  inviteCode?: string;  // Optional - for joining org during registration
}

// Organization types
export interface Organization {
  id: string;
  name: string;
  code: string;
  description: string | null;
  enabled: boolean;
  tokenExpiryDays: number;
  createdAt: string;
  updatedAt: string | null;
}

export type InviteType = 'CODE' | 'EMAIL';
export type InviteStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';

export interface OrganizationInvite {
  id: string;
  organizationId: string;
  organizationName: string;
  type: InviteType;
  code: string | null;
  email: string | null;
  maxUses: number | null;
  useCount: number;
  status: InviteStatus;
  expiresAt: string;
  createdAt: string;
}

export interface OrgMember {
  id: string;
  email: string;
  fullName: string;
  role: string;
  enabled: boolean;
  tokenExpiryDays?: number | null;
}
