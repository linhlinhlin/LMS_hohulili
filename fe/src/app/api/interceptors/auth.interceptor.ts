import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Add authorization header if user is authenticated
  let authReq = req;

  const isAuthEndpoint = req.url.includes('/api/v1/auth/');

  // Do NOT attach Authorization header for auth endpoints (login/register/refresh/logout)
  // Attach token if available, regardless of whether currentUser state is hydrated yet.
  if (!isAuthEndpoint) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    console.log('🔍 Auth Interceptor Debug:', {
      url: req.url,
      isAuthEndpoint,
      tokenExists: !!token,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'NO_TOKEN'
    });
    if (token) {
      authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('✅ Authorization header added to request');
    } else {
      console.log('❌ No token found - request will be sent without Authorization header');
    }
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isAuthEndpoint) {
        // Token expired or invalid
        authService.logout();
        router.navigate(['/auth/login']);
      } else if (error.status === 403 && !isAuthEndpoint) {
        // Permission denied - redirect based on user role
        const userRole = authService.userRole();
        if (userRole === 'student') {
          // Students should be redirected to courses to enroll
          router.navigate(['/courses']);
        } else if (userRole === 'teacher') {
          // Teachers should go to teacher dashboard
          router.navigate(['/teacher']);
        } else {
          // Unknown role, go to home
          router.navigate(['/']);
        }
      }
      return throwError(() => error);
    })
  );
};