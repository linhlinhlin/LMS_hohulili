import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ErrorHandlingService } from '../../shared/services/error-handling.service';
import { UserRole } from '../../shared/types/user.types';

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
    const errorService = inject(ErrorHandlingService);

    const userRole = authService.userRole();

    console.log('🛡️ ROLE GUARD CHECK');
    console.log('   - Current user role:', userRole);
    console.log('   - Required roles:', allowedRoles);
    console.log('   - Role check passed:', userRole && allowedRoles.includes(userRole));
    console.log('   - Is authenticated:', authService.isAuthenticated());

    if (userRole && allowedRoles.includes(userRole)) {
      return true;
    }

    // If user is authenticated but doesn't have the right role
    if (authService.isAuthenticated()) {
      // Show error message based on required roles
      let errorMessage = 'Bạn không có quyền truy cập tính năng này.';
      
      if (allowedRoles.includes(UserRole.TEACHER)) {
        errorMessage = 'Tính năng này chỉ dành cho giảng viên. Vui lòng đăng ký khóa học để xem nội dung.';
      } else if (allowedRoles.includes(UserRole.ADMIN)) {
        errorMessage = 'Tính năng này chỉ dành cho quản trị viên.';
      } else if (allowedRoles.includes(UserRole.STUDENT)) {
        errorMessage = 'Tính năng này chỉ dành cho học viên.';
      }
      
      errorService.addError({
        message: errorMessage,
        type: 'error',
        context: 'authorization'
      });

      // Redirect to their appropriate area root
      const role = authService.userRole();
      if (role) {
        const target = role === UserRole.TEACHER ? '/teacher' : role === UserRole.ADMIN ? '/admin' : '/courses';
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