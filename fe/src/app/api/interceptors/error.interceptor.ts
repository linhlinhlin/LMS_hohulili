import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ErrorHandlingService } from '../../shared/services/error-handling.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorService = inject(ErrorHandlingService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {

      let message = 'Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.';
      let type: 'error' | 'warning' | 'info' = 'error';

      if (err.error instanceof ErrorEvent) {
        // Client-side error
        message = `Lỗi kết nối: ${err.error.message}`;
      } else {
        // Server-side error
        if (err.error?.message) {
          message = err.error.message;
        } else if (typeof err.error === 'string') {
          message = err.error;
        } else {
          switch (err.status) {
            case 400:
              message = 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.';
              break;
            case 401:
              message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
              type = 'warning';
              break;
            case 403:
              message = '403: Bạn không có quyền truy cập tính năng này. Vui lòng đăng ký khóa học để xem nội dung.';
              break;
            case 404:
              message = 'Không tìm thấy tài nguyên yêu cầu.';
              break;
            case 500:
              message = 'Lỗi máy chủ. Vui lòng thử lại sau.';
              break;
            default:
              message = `Lỗi ${err.status}: ${err.statusText}`;
          }
        }
      }

      // Add error to global error service
      errorService.addError({
        message,
        type,
        context: 'api'
      });

      // Re-throw the error for component handling
      return throwError(() => ({
        status: err.status,
        message,
        originalError: err
      }));
    })
  );
};