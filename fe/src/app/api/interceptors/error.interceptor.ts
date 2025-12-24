import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse, HttpHandlerFn } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'An unknown error occurred';

        if (error.error instanceof ErrorEvent) {
          // Client-side error
          errorMessage = `Client Error: ${error.error.message}`;
        } else {
          // Server-side error
          if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else {
            errorMessage = `Server Error: ${error.status} - ${error.message}`;
          }
        }

        // Show error notification
        console.error(errorMessage);

        console.error('API Error:', error);
        return throwError(() => new Error(errorMessage));
      })
    );
  }
}

export const errorInterceptor = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unknown error occurred';

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `Client Error: ${error.error.message}`;
      } else {
        // Server-side error
        // ✅ FIXED: Handle various response types (JSON objects, strings, plain text)
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (typeof error.error === 'string') {
          // Handle plain text responses (like "Đăng xuất thành công")
          errorMessage = error.error;
        } else if (error.status === 200 && typeof error.error === 'string') {
          // 200 status with text body is actually success (treat gracefully)
          console.warn('⚠️ HTTP 200 but parsed as error with text body:', error.error);
          return throwError(() => new Error('Success: ' + error.error));
        } else {
          errorMessage = `Server Error: ${error.status} - ${error.message}`;
        }
      }

      console.error(errorMessage);
      console.error('API Error:', error);
      return throwError(() => new Error(errorMessage));
    })
  );
};
