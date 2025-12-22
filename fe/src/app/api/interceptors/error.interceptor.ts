import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * Error Interceptor - Angular v20 SOTA
 * 
 * Centralized HTTP error handling
 * - Extracts error message from various response formats
 * - Logs errors for debugging (could integrate with error tracking service)
 */
export const errorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unknown error occurred';

      if (error.error instanceof ErrorEvent) {
        // Client-side error (network, etc.)
        errorMessage = `Network Error: ${error.error.message}`;
      } else {
        // Server-side error
        if (error.error?.message) {
          // Backend ApiResponse error format
          errorMessage = error.error.message;
        } else if (typeof error.error === 'string') {
          // Plain text response
          errorMessage = error.error;
        } else {
          errorMessage = `Error ${error.status}: ${error.statusText}`;
        }
      }

      // Log for debugging (in production, send to error tracking)
      console.error(`[HTTP Error] ${req.method} ${req.url}:`, errorMessage);

      return throwError(() => new Error(errorMessage));
    })
  );
};
