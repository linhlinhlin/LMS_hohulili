import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * HTTP Logging Interceptor - Angular v20 Functional Style
 * 
 * SOTA Best Practice (Google Angular Team, Dec 2025):
 * - Uses functional interceptor pattern (not class-based)
 * - Environment-aware: only logs in development
 * - Minimal performance impact in production
 * - Structured logging for debugging
 */
export const loggingInterceptor: HttpInterceptorFn = (
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {

    // Skip logging in production
    if (environment.production) {
        return next(req);
    }

    const startTime = performance.now();
    const method = req.method;
    const url = req.url;

    // Log request (minimal)
    console.log(`🌐 [HTTP] ${method} ${url}`);

    return next(req).pipe(
        tap({
            next: (event) => {
                if (event instanceof HttpResponse) {
                    const duration = Math.round(performance.now() - startTime);
                    console.log(`✅ [HTTP] ${method} ${url} - ${event.status} (${duration}ms)`);
                }
            },
            error: (error: HttpErrorResponse) => {
                const duration = Math.round(performance.now() - startTime);
                console.error(`❌ [HTTP] ${method} ${url} - ${error.status} (${duration}ms)`);
            }
        })
    );
};
