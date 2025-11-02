import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole, UserRole as UserRoleType } from '../../shared/types/user.types';

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
export const roleGuard = (allowedRoles: UserRoleType[]): CanActivateFn => {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const userRole = authService.userRole();

    if (userRole && allowedRoles.includes(userRole)) {
      return true;
    }

    // If user is authenticated but doesn't have the right role
    if (authService.isAuthenticated()) {
      // Redirect to their appropriate area root, each module defaults to its own dashboard
      const role = authService.userRole();
      if (role) {
        const target = role === 'teacher' ? '/teacher' : role === 'admin' ? '/admin' : '/student';
        return router.createUrlTree([target]);
      }
    }

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