import { inject, Injector } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../services/auth.service';
import { getPortalRootRoute, mapAdminPortalPathForRole } from '../utils/portal-route.util';

/**
 * General Auth Guard - Ensures user is authenticated
 * Redirects to login page if not authenticated
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Store the attempted URL for redirecting after login
  const returnUrl = state.url;
  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl }
  });
};

/**
 * Role Guard Factory - Creates a guard that checks for specific roles
 * @param allowedRoles Array of roles that can access the route
 * @returns CanActivateFn guard function
 */
export const roleGuard = (allowedRoles: UserRole[]): CanActivateFn => {
  return async (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const injector = inject(Injector);

    const userRole = authService.userRole();

    if (userRole && allowedRoles.includes(userRole as UserRole)) {
      // ✅ FIXED: Ensure role-specific service is initialized before component loads
      try {
        await ensureRoleServiceInitialized(userRole as UserRole, injector);
      } catch (error) {
        // Continue anyway - component will handle missing data
      }

      return true;
    }

    // If user is authenticated but doesn't have the right role
    if (authService.isAuthenticated()) {
      // Redirect to their appropriate area root, each module defaults to its own dashboard
      const role = authService.userRole();
      if (role) {
        const target = getPortalRootRoute(role);
        return router.createUrlTree([target]);
      }
    }

    // If not authenticated, redirect to login
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url }
    });
  };
};

// ✅ FIXED: Helper function to initialize role-specific services
// Uses Injector.get() instead of inject() to avoid NG0203 error
async function ensureRoleServiceInitialized(role: UserRole | string, injector: Injector): Promise<void> {
  const normalizedRole = typeof role === 'string' ? role.toLowerCase() : role;

  if (normalizedRole === 'teacher' || normalizedRole === UserRole.TEACHER) {
    try {
      // Lazy import to avoid circular dependencies
      const { TeacherService } = await import('../../features/teacher/infrastructure/services/teacher.service');
      // ✅ Use injector.get() instead of inject() - valid in async function
      const teacherService = injector.get(TeacherService);

      if (!teacherService.courses().length && !teacherService.isLoading()) {
        await teacherService.loadMyCourses();
      }
    } catch (err) {
      // Failed to initialize TeacherService - component will handle missing data
    }
  } else if (normalizedRole === 'admin' || normalizedRole === UserRole.ADMIN
    || normalizedRole === 'org_admin' || normalizedRole === UserRole.ORG_ADMIN) {
    // AdminService will initialize on component init
  } else if (normalizedRole === 'student' || normalizedRole === UserRole.STUDENT) {
    // StudentEnrollmentService will initialize on component init
  }
}

/**
 * Student Guard - Only allows students
 */
export const studentGuard: CanActivateFn = roleGuard([UserRole.STUDENT]);

/**
 * Teacher Only Guard - ONLY teachers (Admin blocked)
 * Use for: dashboard, courses list, revenue - teacher-specific features
 */
export const teacherOnlyGuard: CanActivateFn = roleGuard([UserRole.TEACHER]);

/**
 * Teacher Guard - Allows teachers AND system admins
 * ORG_ADMIN stays in the org-admin operations portal and should not enter teacher authoring flows.
 * Use for: teacher authoring/editor routes where system admin may still inspect as needed.
 */
export const teacherGuard: CanActivateFn = roleGuard([UserRole.TEACHER, UserRole.ADMIN]);

/**
 * Admin Guard - Allows both ADMIN and ORG_ADMIN (operations + system)
 */
export const adminGuard: CanActivateFn = roleGuard([UserRole.ADMIN, UserRole.ORG_ADMIN]);

/**
 * System Admin Guard - Only ADMIN (system-level: settings, logs, AI knowledge)
 */
export const systemAdminGuard: CanActivateFn = roleGuard([UserRole.ADMIN]);

/**
 * Teacher or Admin Guard - Alias for teacherGuard
 */
export const teacherOrAdminGuard: CanActivateFn = roleGuard([UserRole.TEACHER, UserRole.ADMIN]);

export const systemAdminPortalGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url }
    });
  }

  const role = authService.userRole();
  if (role === UserRole.ADMIN) {
    return true;
  }

  if (role) {
    return router.createUrlTree([mapAdminPortalPathForRole(state.url, role)]);
  }

  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl: state.url }
  });
};

export const orgAdminPortalGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url }
    });
  }

  const role = authService.userRole();
  if (role === UserRole.ORG_ADMIN) {
    return true;
  }

  if (role) {
    return router.createUrlTree([mapAdminPortalPathForRole(state.url, role)]);
  }

  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl: state.url }
  });
};
