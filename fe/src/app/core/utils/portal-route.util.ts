import type { UserRole } from '../../shared/types/user.types';

export const SYSTEM_ADMIN_PORTAL_BASE = '/admin';
export const ORG_ADMIN_PORTAL_BASE = '/org-admin';

type MaybeRole = UserRole | string | null | undefined;

const ORG_ADMIN_SHARED_SUFFIXES = [
  '/dashboard',
  '/courses',
  '/analytics',
  '/users',
  '/users/teachers',
  '/users/students'
];

export function normalizeUserRole(role: MaybeRole): string {
  return String(role || '').trim().toLowerCase();
}

export function isSystemAdminRole(role: MaybeRole): boolean {
  return normalizeUserRole(role) === 'admin';
}

export function isOrgAdminRole(role: MaybeRole): boolean {
  return normalizeUserRole(role) === 'org_admin';
}

export function isAdminFamilyRole(role: MaybeRole): boolean {
  return isSystemAdminRole(role) || isOrgAdminRole(role);
}

export function getAdminPortalBase(role: MaybeRole): string {
  return isOrgAdminRole(role) ? ORG_ADMIN_PORTAL_BASE : SYSTEM_ADMIN_PORTAL_BASE;
}

export function getPortalRootRoute(role: MaybeRole): string {
  switch (normalizeUserRole(role)) {
    case 'admin':
      return SYSTEM_ADMIN_PORTAL_BASE;
    case 'org_admin':
      return ORG_ADMIN_PORTAL_BASE;
    case 'teacher':
      return '/teacher';
    case 'student':
      return '/student';
    default:
      return '/';
  }
}

export function getPortalLandingRoute(role: MaybeRole): string {
  switch (normalizeUserRole(role)) {
    case 'admin':
      return `${SYSTEM_ADMIN_PORTAL_BASE}/dashboard`;
    case 'org_admin':
      return `${ORG_ADMIN_PORTAL_BASE}/dashboard`;
    case 'teacher':
      return '/teacher/courses';
    case 'student':
      return '/student/courses';
    default:
      return '/';
  }
}

export function mapAdminPortalPathForRole(path: string, role: MaybeRole): string {
  const normalizedPath = path || '';

  if (isSystemAdminRole(role)) {
    if (normalizedPath.startsWith(ORG_ADMIN_PORTAL_BASE)) {
      return `${SYSTEM_ADMIN_PORTAL_BASE}${normalizedPath.slice(ORG_ADMIN_PORTAL_BASE.length)}`;
    }
    return normalizedPath || SYSTEM_ADMIN_PORTAL_BASE;
  }

  if (!isOrgAdminRole(role)) {
    return normalizedPath || getPortalRootRoute(role);
  }

  if (!normalizedPath.startsWith(SYSTEM_ADMIN_PORTAL_BASE)) {
    return normalizedPath || ORG_ADMIN_PORTAL_BASE;
  }

  const suffix = normalizedPath.slice(SYSTEM_ADMIN_PORTAL_BASE.length) || '';
  if (!suffix || suffix === '/') {
    return ORG_ADMIN_PORTAL_BASE;
  }

  return isSupportedOrgAdminSuffix(suffix)
    ? `${ORG_ADMIN_PORTAL_BASE}${suffix}`
    : ORG_ADMIN_PORTAL_BASE;
}

function isSupportedOrgAdminSuffix(suffix: string): boolean {
  return ORG_ADMIN_SHARED_SUFFIXES.some(base =>
    suffix === base
    || suffix.startsWith(`${base}/`)
    || suffix.startsWith(`${base}?`)
  );
}
