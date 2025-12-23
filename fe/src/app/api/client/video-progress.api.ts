import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TrackProgressRequest {
  sectionId: string;
  currentPosition: number;
  duration: number;
}

export interface VideoProgressResponse {
  id: string;
  userId: string;
  sectionId: string;
  currentPosition: number;
  duration: number;
  progressPercentage: number;
  completed: boolean;
  completionDate: string | null;
}

export interface CanProceedResponse {
  canProceed: boolean;
  currentProgress: number;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string | null;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class VideoProgressApi {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/video-progress`;

  /**
   * Track video viewing progress
   */
  trackProgress(request: TrackProgressRequest): Observable<ApiResponse<VideoProgressResponse>> {
    return this.http.post<ApiResponse<VideoProgressResponse>>(`${this.apiUrl}/track`, request);
  }

  /**
   * Get progress for a specific video section
   */
  getProgress(sectionId: string): Observable<ApiResponse<VideoProgressResponse>> {
    return this.http.get<ApiResponse<VideoProgressResponse>>(`${this.apiUrl}/${sectionId}`);
  }

  /**
   * Get all progress for current user
   */
  getMyProgress(): Observable<ApiResponse<VideoProgressResponse[]>> {
    return this.http.get<ApiResponse<VideoProgressResponse[]>>(`${this.apiUrl}/my-progress`);
  }

  /**
   * Check if user can proceed to next lesson (75% rule)
   */
  canProceedToNext(sectionId: string): Observable<ApiResponse<CanProceedResponse>> {
    return this.http.get<ApiResponse<CanProceedResponse>>(`${this.apiUrl}/${sectionId}/can-proceed`);
  }

  /**
   * Reset progress for a section
   */
  resetProgress(sectionId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${sectionId}`);
  }
}
