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
  private readonly baseUrl = environment.apiUrl;  // ✅ Sử dụng environment

  constructor() {}

  // Generic GET request
  get<T>(endpoint: string, options?: any): Observable<T> {
    return this.http.get(`${this.baseUrl}${endpoint}`, options).pipe(
      map(response => response as T),
      catchError(this.handleError)
    );
  }

  // Generic POST request
  post<T>(endpoint: string, data: any, options?: any): Observable<T> {
    return this.http.post(`${this.baseUrl}${endpoint}`, data, options).pipe(
      map(response => response as T),
      catchError(this.handleError)
    );
  }

  // Generic PUT request
  put<T>(endpoint: string, data: any, options?: any): Observable<T> {
    return this.http.put(`${this.baseUrl}${endpoint}`, data, options).pipe(
      map(response => response as T),
      catchError(this.handleError)
    );
  }

  // Generic DELETE request
  delete<T>(endpoint: string, options?: any): Observable<T> {
    return this.http.delete(`${this.baseUrl}${endpoint}`, options).pipe(
      map(response => response as T),
      catchError(this.handleError)
    );
  }

  // PATCH method
  patch<T>(endpoint: string, data: any, options?: any): Observable<T> {
    return this.http.patch(`${this.baseUrl}${endpoint}`, data, options).pipe(
      map(response => response as T),
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
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, data, options).pipe(
      map(response => response as unknown as ApiResponse<T>),
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
    return this.http.delete<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, options).pipe(
      map(response => response as unknown as ApiResponse<T>),
      catchError(this.handleError)
    );
  }

  // Error handling
  private handleError(error: HttpErrorResponse): Observable<never> {
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

    console.error('API Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}