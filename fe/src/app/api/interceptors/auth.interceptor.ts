import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpHandlerFn } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';

/**
 * Auth Interceptor - Angular v20 SOTA
 * 
 * Responsibilities:
 * - Add JWT Bearer token to requests
 * - Handle 401 Unauthorized (logout + redirect)
 * - No logging (handled by logging interceptor)
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) { }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
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
          this.authService.logout();
          window.location.href = '/login';
        }
        return throwError(() => error);
      })
    );
  }
}

/**
 * Functional Auth Interceptor - Angular v20+ Style
 * Preferred for new Angular apps using standalone components
 */
export const authInterceptor = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);

  // Get token from primary or fallback sources
  let token = authService.getToken();
  if (!token) {
    token = localStorage.getItem('token') ??
      localStorage.getItem('access_token') ??
      localStorage.getItem('auth_token');
  }

  // Clone request with Authorization header if token exists
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error) => {
      if (error?.status === 401) {
        authService.logout();
        window.location.href = '/login';
      }
      return throwError(() => error);
    })
  );
};
