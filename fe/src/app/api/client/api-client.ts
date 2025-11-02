import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../types/common.types';

@Injectable({
  providedIn: 'root'
})
export class ApiClient {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  constructor() {}

  get<T>(endpoint: string, options?: any): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${endpoint}`, options).pipe(
      map(response => response as unknown as T),
      catchError(this.handleError)
    );
  }

  post<T>(endpoint: string, data: any, options?: any): Observable<T> {
    const opts = { responseType: 'json' as const, ...options };
    return this.http.post(`${this.baseUrl}${endpoint}`, data, opts).pipe(
      map((response: any) => response as T),
      catchError(this.handleError)
    );
  }

  put<T>(endpoint: string, data: any, options?: any): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${endpoint}`, data, options).pipe(
      map(response => response as unknown as T),
      catchError(this.handleError)
    );
  }

  patch<T>(endpoint: string, data: any, options?: any): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}${endpoint}`, data, options).pipe(
      map(response => response as unknown as T),
      catchError(this.handleError)
    );
  }

  delete<T>(endpoint: string, options?: any): Observable<T> {
    const opts = { responseType: 'json' as const, ...options };
    return this.http.delete(`${this.baseUrl}${endpoint}`, opts).pipe(
      map((response: any) => response as T),
      catchError(this.handleError)
    );
  }

  // Helper method for API responses with standard format
  getWithResponse<T>(endpoint: string, options?: any): Observable<ApiResponse<T>> {
    return this.http.get<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, options).pipe(
      map(response => response as unknown as ApiResponse<T>),
      catchError(this.handleError)
    );
  }

  postWithResponse<T>(endpoint: string, data: any, options?: any): Observable<ApiResponse<T>> {
    const opts = { responseType: 'json' as const, ...options };
    return this.http.post(`${this.baseUrl}${endpoint}`, data, opts).pipe(
      map((response: any) => response as ApiResponse<T>),
      catchError(this.handleError)
    );
  }

  putWithResponse<T>(endpoint: string, data: any, options?: any): Observable<ApiResponse<T>> {
    return this.http.put<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, data, options).pipe(
      map(response => response as unknown as ApiResponse<T>),
      catchError(this.handleError)
    );
  }

  patchWithResponse<T>(endpoint: string, data: any, options?: any): Observable<ApiResponse<T>> {
    return this.http.patch<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, data, options).pipe(
      map(response => response as unknown as ApiResponse<T>),
      catchError(this.handleError)
    );
  }

  deleteWithResponse<T>(endpoint: string, options?: any): Observable<ApiResponse<T>> {
    const opts = { responseType: 'json' as const, ...options };
    return this.http.delete(`${this.baseUrl}${endpoint}`, opts).pipe(
      map((response: any) => response as ApiResponse<T>),
      catchError(this.handleError)
    );
  }

  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (typeof error.error === 'string') {
        errorMessage = error.error;
      } else if (error.status === 200 && error.statusText === 'OK') {
        errorMessage = '';
      } else {
        errorMessage = `Server Error: ${error.status} - ${error.message}`;
      }
    }

    // Preserve HTTP status code for downstream handlers
    const enrichedError: any = new Error(errorMessage);
    enrichedError.status = error.status;
    enrichedError.statusText = error.statusText;
    enrichedError.url = error.url;
    enrichedError.original = error;

    console.error('API Error:', { status: error.status, url: error.url, message: errorMessage });
    return throwError(() => enrichedError);
  };
}