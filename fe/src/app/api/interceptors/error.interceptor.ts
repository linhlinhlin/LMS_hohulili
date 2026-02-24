import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse, HttpHandlerFn } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'Đã xảy ra lỗi không xác định';

        if (error.error instanceof ErrorEvent) {
          errorMessage = `Client Error: ${error.error.message}`;
        } else {
          if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else {
            errorMessage = `Server Error: ${error.status} - ${error.message}`;
          }
        }

        return throwError(() => new Error(errorMessage));
      })
    );
  }
}

export const errorInterceptor = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {
  return next(req).pipe(
    retry({ count: 1, delay: (error) => error.status >= 500 ? timer(1000) : throwError(() => error) }),
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'Đã xảy ra lỗi không xác định';

      if (error.error instanceof ErrorEvent) {
        errorMessage = `Client Error: ${error.error.message}`;
      } else {
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (typeof error.error === 'string') {
          errorMessage = error.error;
        } else if (error.status === 200 && typeof error.error === 'string') {
          return throwError(() => new Error('Success: ' + error.error));
        } else {
          errorMessage = `Server Error: ${error.status} - ${error.message}`;
        }
      }

      return throwError(() => new Error(errorMessage));
    })
  );
};
