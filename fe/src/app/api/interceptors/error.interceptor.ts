import { HttpRequest, HttpErrorResponse, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';

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
        } else {
          errorMessage = `Server Error: ${error.status} - ${error.message}`;
        }
      }

      return throwError(() => new Error(errorMessage));
    })
  );
};
