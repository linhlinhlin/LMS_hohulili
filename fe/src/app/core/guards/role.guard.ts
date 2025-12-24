import { inject, Injector } from '@angular/core';
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
  return async (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const injector = inject(Injector);

    const userRole = authService.userRole();
    console.log('🛡️ RoleGuard: Checking access for route:', state.url);
    console.log('🛡️ RoleGuard: User role:', userRole);
    console.log('🛡️ RoleGuard: Allowed roles:', allowedRoles);

    if (userRole && allowedRoles.includes(userRole as UserRole)) {
      console.log('✅ RoleGuard: Access granted');
      
      // ✅ FIXED: Ensure role-specific service is initialized before component loads
      try {
        await ensureRoleServiceInitialized(userRole as UserRole, injector);
        console.log('✅ RoleGuard: Service initialization completed');
      } catch (error) {
        console.error('⚠️ RoleGuard: Service initialization failed:', error);
        // Continue anyway - component will handle missing data
      }
      
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
        console.log('🔄 RoleGuard: Loading teacher service data...');
        await teacherService.loadMyCourses();
      }
    } catch (err) {
      console.warn('⚠️ RoleGuard: Failed to initialize TeacherService:', err);
    }
  } else if (normalizedRole === 'admin' || normalizedRole === UserRole.ADMIN) {
    // AdminService will initialize on component init, but we can trigger it here if needed
    console.log('🔄 RoleGuard: Admin role detected, service will initialize in component');
  } else if (normalizedRole === 'student' || normalizedRole === UserRole.STUDENT) {
    // StudentEnrollmentService will initialize on component init
    console.log('🔄 RoleGuard: Student role detected, service will initialize in component');
  }
}

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
