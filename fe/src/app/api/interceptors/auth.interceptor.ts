import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpHandlerFn } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) { }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Add authorization header
    const token = this.authService.getToken();
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(request).pipe(
      catchError((error) => {
        if (error.status === 401) {
          // Token expired or invalid
          this.authService.logout();
          // Redirect to login page
          window.location.href = '/login';
        }
        return throwError(error);
      })
    );
  }
}

export const authInterceptor = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {
  const authService = inject(AuthService);

  // 🔍 DEBUG: Try multiple token keys
  let token = authService.getToken(); // Primary: lms_access_token

  if (!token) {
    // Fallback: check other possible keys
    token = localStorage.getItem('token') ||
      localStorage.getItem('access_token') ||
      localStorage.getItem('auth_token');
  }

  console.log('🔗 AuthInterceptor: Processing request to:', req.url);
  console.log('🔗 AuthInterceptor: Token exists:', !!token);
  console.log('🔗 AuthInterceptor: Token source:', token ? 'found' : 'NOT FOUND');

  if (token) {
    console.log('🔗 AuthInterceptor: Adding Authorization header, token length:', token.length);

    // 🔍 DEBUG: Decode JWT payload for student endpoints
    if (req.url.includes('/student/')) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('🔗 AuthInterceptor: JWT Payload for student endpoint:', {
          sub: payload.sub,
          roles: payload.roles || payload.authorities,
          exp: new Date(payload.exp * 1000).toISOString(),
          isExpired: payload.exp * 1000 < Date.now()
        });
      } catch (decodeError) {
        console.error('🔗 AuthInterceptor: Cannot decode JWT:', decodeError);
      }
    }

    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('🔗 AuthInterceptor: Request cloned with Authorization header');
  } else {
    console.log('🔗 AuthInterceptor: ⚠️  NO TOKEN FOUND - Request will be sent WITHOUT Authorization header');
    console.log('🔗 AuthInterceptor: Available localStorage keys:', Object.keys(localStorage));
  }

  return next(req).pipe(
    catchError((error) => {
      // Check if error is HttpErrorResponse before accessing status
      const status = error?.status;
      console.log('🔗 AuthInterceptor: Error response status:', status ?? 'N/A (Network/CORS error)');

      // 🔍 DEBUG: Log 403 errors for student endpoints
      if (status === 403 && req.url.includes('/student/')) {
        console.error('🔗 AuthInterceptor: 403 Forbidden on student endpoint:', req.url);
        console.error('🔗 AuthInterceptor: Check token validity and user roles');
      }

      if (status === 401) {
        console.log('🔗 AuthInterceptor: 401 Unauthorized - Logging out and redirecting to login');
        authService.logout();
        window.location.href = '/login';
      }
      return throwError(error);
    })
  );
};
