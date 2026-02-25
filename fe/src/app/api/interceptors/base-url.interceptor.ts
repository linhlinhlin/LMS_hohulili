import { HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export const baseUrlInterceptor = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {
  if (req.url.startsWith('/api/')) {
    const apiReq = req.clone({
      url: `${environment.apiUrl}${req.url}`
    });
    return next(apiReq);
  }
  return next(req);
};
