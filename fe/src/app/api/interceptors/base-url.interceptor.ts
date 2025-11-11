import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpHandlerFn } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable()
export class BaseUrlInterceptor implements HttpInterceptor {
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Only add base URL for API requests (starting with /api/)
    if (request.url.startsWith('/api/')) {
      const apiReq = request.clone({
        url: `${environment.apiUrl}${request.url}`
      });
      return next.handle(apiReq);
    }

    return next.handle(request);
  }
}

export const baseUrlInterceptor = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {
  console.log('🔗 BaseUrlInterceptor: Original URL:', req.url);
  console.log('🔗 BaseUrlInterceptor: Method:', req.method);

  // Only add base URL for API requests (starting with /api/)
  if (req.url.startsWith('/api/')) {
    const fullUrl = `${environment.apiUrl}${req.url}`;
    console.log('🔗 BaseUrlInterceptor: Final URL:', fullUrl);

    const apiReq = req.clone({
      url: fullUrl
    });
    console.log('🔗 BaseUrlInterceptor: Request cloned successfully');
    return next(apiReq);
  }

  console.log('🔗 BaseUrlInterceptor: Not an API request, passing through');
  return next(req);
};