import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * API Response Unwrap Interceptor - Angular v20 SOTA
 * 
 * Purpose: Automatically extracts `data` from backend ApiResponse wrapper
 * 
 * Backend returns:
 * ```json
 * { "success": true, "data": {...}, "message": "..." }
 * ```
 * 
 * After this interceptor, services receive:
 * ```json
 * {...}  // Just the data
 * ```
 * 
 * Benefits:
 * - Services don't need to manually extract .data
 * - Type-safe: Observable<T> instead of Observable<ApiResponse<T>>
 * - Single place to handle response unwrapping
 * 
 * @see Google Angular Team best practices (Dec 2025)
 */
export const apiResponseInterceptor: HttpInterceptorFn = (
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {

    return next(req).pipe(
        map(event => {
            // Only process successful HTTP responses
            if (event instanceof HttpResponse) {
                const body = event.body as Record<string, unknown> | null;

                // Debug logging (remove in production)
                if (req.url.includes('/api/v3/courses/')) {
                    console.log('[apiResponseInterceptor] URL:', req.url);
                    console.log('[apiResponseInterceptor] Raw body:', body);
                    console.log('[apiResponseInterceptor] Body type:', typeof body);
                    if (body && typeof body === 'object') {
                        console.log('[apiResponseInterceptor] Has success:', 'success' in body);
                        console.log('[apiResponseInterceptor] Has data:', 'data' in body);
                    }
                }

                // Check if response is an ApiResponse wrapper
                // ApiResponse has: { success: boolean, data: T, message?: string }
                // Type guard: check body is an object with required properties
                if (body && typeof body === 'object' && !Array.isArray(body)) {
                    const hasSuccess = 'success' in body;
                    const hasData = 'data' in body;

                    if (hasSuccess && hasData) {
                        if (req.url.includes('/api/v3/courses/')) {
                            console.log('[apiResponseInterceptor] UNWRAPPING - returning body.data:', body['data']);
                        }
                        // Unwrap: return only the data property
                        return event.clone({ body: body['data'] });
                    }
                }
            }

            // Return unchanged for non-ApiResponse or non-HttpResponse events
            return event;
        })
    );
};
