import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Base URL Interceptor - Angular v20 SOTA
 * 
 * Adds environment.apiUrl to relative API paths (/api/*)
 * 
 * @example
 * Request: /api/v3/auth/login
 * After:   http://localhost:8088/api/v3/auth/login
 */
export const baseUrlInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {

  // Only prefix relative API paths
  if (req.url.startsWith('/api/')) {
    const apiReq = req.clone({
      url: `${environment.apiUrl}${req.url}`
    });
    return next(apiReq);
  }

  return next(req);
};
