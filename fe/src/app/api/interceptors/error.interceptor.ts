import { HttpRequest, HttpErrorResponse, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { NetworkStatusService } from '../../core/services/network-status.service';
import { isOfflineCompatibleHttpError } from '../../core/utils/offline-http-error';

export function shouldRetryHttpRequest(
  error: unknown,
  requestUrl: string,
  networkStatus: Pick<NetworkStatusService, 'online' | 'hasRecentOfflineSignal'>,
): boolean {
  if (!(error instanceof HttpErrorResponse)) {
    return false;
  }

  if (error.status < 500) {
    return false;
  }

  return !isOfflineCompatibleHttpError(error, requestUrl, {
    navigatorOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
    appOnline: networkStatus.online(),
    hasRecentOfflineSignal: networkStatus.hasRecentOfflineSignal(),
  });
}

export const errorInterceptor = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {
  const networkStatus = inject(NetworkStatusService);

  return next(req).pipe(
    retry({
      count: 1,
      delay: (error) => shouldRetryHttpRequest(error, req.url, networkStatus)
        ? timer(1000)
        : throwError(() => error),
    }),
    catchError((error: HttpErrorResponse) => throwError(() => error)),
  );
};
