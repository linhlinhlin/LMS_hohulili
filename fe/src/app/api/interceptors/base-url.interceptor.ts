import { HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { isPlatformServer } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

export const baseUrlInterceptor = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {
  if (req.url.startsWith('/api/')) {
    const platformId = inject(PLATFORM_ID);
    const base = isPlatformServer(platformId) ? 'http://backend:8080' : environment.apiUrl;
    const apiReq = req.clone({
      url: `${base}${req.url}`
    });
    return next(apiReq);
  }
  return next(req);
};
