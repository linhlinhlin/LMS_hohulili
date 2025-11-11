import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpHandlerFn } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

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
  const token = authService.getToken();

  console.log('🔗 AuthInterceptor: Processing request to:', req.url);
  console.log('🔗 AuthInterceptor: Token exists:', !!token);
  
  if (token) {
    console.log('🔗 AuthInterceptor: Adding Authorization header, token length:', token.length);
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('🔗 AuthInterceptor: Request cloned with Authorization header');
  } else {
    console.log('🔗 AuthInterceptor: ⚠️  NO TOKEN FOUND - Request will be sent WITHOUT Authorization header');
  }

  return next(req).pipe(
    catchError((error) => {
      console.log('🔗 AuthInterceptor: Error response status:', error.status);
      if (error.status === 401) {
        console.log('🔗 AuthInterceptor: 401 Unauthorized - Logging out and redirecting to login');
        authService.logout();
        window.location.href = '/login';
      }
      return throwError(error);
    })
  );
};