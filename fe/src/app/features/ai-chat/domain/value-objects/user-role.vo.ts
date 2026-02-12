/**
 * UserRole Value Object
 * Defines user roles for AI behavior customization
 */
import { UserRole } from '../types';

/**
 * All valid user roles
 */
export const USER_ROLES: readonly UserRole[] = [
  'student',
  'teacher',
  'admin',
  'org_admin',
  'guest',
] as const;

/**
 * Default role for unauthenticated users
 */
export const DEFAULT_ROLE: UserRole = 'guest';

/**
 * Check if a string is a valid UserRole
 */
export function isValidRole(role: unknown): role is UserRole {
  return (
    typeof role === 'string' && USER_ROLES.includes(role as UserRole)
  );
}

/**
 * Get role from string with fallback to guest
 */
export function parseRole(role: string | undefined | null): UserRole {
  if (role && isValidRole(role)) {
    return role;
  }
  return DEFAULT_ROLE;
}

/**
 * Check if role has elevated privileges (teacher or admin)
 */
export function isElevatedRole(role: UserRole): boolean {
  return role === 'teacher' || role === 'admin' || role === 'org_admin';
}

/**
 * Check if role is authenticated (not guest)
 */
export function isAuthenticatedRole(role: UserRole): boolean {
  return role !== 'guest';
}

/**
 * Get display name for role (Vietnamese)
 */
export function getRoleDisplayName(role: UserRole): string {
  const displayNames: Record<UserRole, string> = {
    student: 'Học viên',
    teacher: 'Giảng viên',
    admin: 'Quản trị viên',
    org_admin: 'Chuyên viên quản lý',
    guest: 'Khách',
  };
  return displayNames[role];
}

/**
 * Get role priority (higher = more privileges)
 */
export function getRolePriority(role: UserRole): number {
  const priorities: Record<UserRole, number> = {
    guest: 0,
    student: 1,
    teacher: 2,
    org_admin: 3,
    admin: 4,
  };
  return priorities[role];
}

// Re-export type
export type { UserRole };
