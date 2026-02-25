import { inject } from '@angular/core';
import { HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';

export const authInterceptor = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {
  const authService = inject(AuthService);

  const isBrowser = typeof localStorage !== 'undefined';
  let token = authService.getToken();

  if (!token && isBrowser) {
    token = localStorage.getItem('token') ||
      localStorage.getItem('access_token') ||
      localStorage.getItem('auth_token');
  }

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error) => {
      const status = error?.status;

      if (status === 401) {
        authService.logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
      return throwError(error);
    })
  );
};
