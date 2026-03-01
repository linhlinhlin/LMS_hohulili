import { inject } from '@angular/core';
import { HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { NetworkStatusService } from '../../core/services/network-status.service';
import { SessionExpiredService } from '../../core/services/session-expired.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {
  const authService = inject(AuthService);

  const token = authService.getToken();

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/auth/login') && !req.url.includes('/auth/refresh')) {
        return handleTokenRefresh(req, next, authService);
      }
      return throwError(() => error);
    })
  );
};

function handleTokenRefresh(
  req: HttpRequest<any>,
  next: HttpHandlerFn,
  authService: AuthService
): Observable<HttpEvent<any>> {
  const networkService = inject(NetworkStatusService);
  const sessionService = inject(SessionExpiredService);

  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    // Soft logout: if offline, degrade instead of attempting refresh
    if (!networkService.online()) {
      isRefreshing = false;
      sessionService.transitionToDegraded();
      return throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Offline — session degraded' }));
    }

    return authService.refreshToken().pipe(
      switchMap((response) => {
        isRefreshing = false;
        refreshTokenSubject.next(response.accessToken);
        sessionService.transitionToAuthenticated();
        // Retry original request with new token
        return next(req.clone({
          setHeaders: { Authorization: `Bearer ${response.accessToken}` }
        }));
      }),
      catchError((err) => {
        isRefreshing = false;
        if (!networkService.online()) {
          // Network went down during refresh — soft degrade
          sessionService.transitionToDegraded();
        } else {
          // Online but refresh failed — hard logout
          authService.logout();
        }
        return throwError(() => err);
      })
    );
  }

  // If already refreshing, wait for the new token then retry
  return refreshTokenSubject.pipe(
    filter(token => token !== null),
    take(1),
    switchMap(token => {
      return next(req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      }));
    })
  );
}
