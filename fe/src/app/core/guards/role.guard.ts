import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../services/auth.service';

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
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const userRole = authService.userRole();
    console.log('🛡️ RoleGuard: Checking access for route:', state.url);
    console.log('🛡️ RoleGuard: User role:', userRole);
    console.log('🛡️ RoleGuard: Allowed roles:', allowedRoles);

    if (userRole && allowedRoles.includes(userRole as UserRole)) {
      console.log('✅ RoleGuard: Access granted');
      return true;
    }

    console.log('❌ RoleGuard: Access denied');

    // If user is authenticated but doesn't have the right role
    if (authService.isAuthenticated()) {
      console.log('🔄 RoleGuard: User authenticated but wrong role, redirecting...');
      // Redirect to their appropriate area root, each module defaults to its own dashboard
      const role = authService.userRole();
      if (role) {
        const target = role === 'teacher' ? '/teacher' : role === 'admin' ? '/admin' : '/student';
        console.log('🔄 RoleGuard: Redirecting to:', target);
        return router.createUrlTree([target]);
      }
    }

    console.log('🔄 RoleGuard: User not authenticated, redirecting to login');
    // If not authenticated, redirect to login
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url }
    });
  };
};

/**
 * Student Guard - Only allows students
 */
export const studentGuard: CanActivateFn = roleGuard([UserRole.STUDENT]);

/**
 * Teacher Guard - Only allows teachers
 */
export const teacherGuard: CanActivateFn = roleGuard([UserRole.TEACHER]);

/**
 * Admin Guard - Only allows admins
 */
export const adminGuard: CanActivateFn = roleGuard([UserRole.ADMIN]);

/**
 * Teacher or Admin Guard - Allows both teachers and admins
 */
export const teacherOrAdminGuard: CanActivateFn = roleGuard([UserRole.TEACHER, UserRole.ADMIN]);