import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../types/common.types';

/**
 * Centralized API Client - Angular v20 SOTA
 * 
 * Best Practices Applied:
 * - Uses `inject()` for DI (Angular v14+)
 * - Typed generics for type safety
 * - Centralized error handling
 * - No console.log (logging moved to interceptor)
 * - Single responsibility: HTTP operations only
 */
@Injectable({
  providedIn: 'root'
})
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  // ============================================
  // RAW HTTP Methods (return raw response)
  // ============================================

  get<T>(endpoint: string, options?: object): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${endpoint}`, options).pipe(
      catchError(this.handleError)
    );
  }

  post<T>(endpoint: string, data: unknown, options?: object): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, data, options).pipe(
      catchError(this.handleError)
    );
  }

  put<T>(endpoint: string, data: unknown, options?: object): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${endpoint}`, data, options).pipe(
      catchError(this.handleError)
    );
  }

  patch<T>(endpoint: string, data: unknown, options?: object): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}${endpoint}`, data, options).pipe(
      catchError(this.handleError)
    );
  }

  delete<T>(endpoint: string, options?: object): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${endpoint}`, options).pipe(
      catchError(this.handleError)
    );
  }

  // ============================================
  // ApiResponse Wrapper Methods
  // For endpoints that return { data, message, pagination }
  // ============================================

  getWithResponse<T>(endpoint: string, options?: object): Observable<ApiResponse<T>> {
    return this.get<ApiResponse<T>>(endpoint, options);
  }

  postWithResponse<T>(endpoint: string, data: unknown, options?: object): Observable<ApiResponse<T>> {
    return this.post<ApiResponse<T>>(endpoint, data, options);
  }

  putWithResponse<T>(endpoint: string, data: unknown, options?: object): Observable<ApiResponse<T>> {
    return this.put<ApiResponse<T>>(endpoint, data, options);
  }

  patchWithResponse<T>(endpoint: string, data: unknown, options?: object): Observable<ApiResponse<T>> {
    return this.patch<ApiResponse<T>>(endpoint, data, options);
  }

  deleteWithResponse<T>(endpoint: string, options?: object): Observable<ApiResponse<T>> {
    return this.delete<ApiResponse<T>>(endpoint, options);
  }

  // ============================================
  // Error Handling
  // ============================================

  private handleError = (error: HttpErrorResponse): Observable<never> => {
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

    return throwError(() => new Error(errorMessage));
  };
}
