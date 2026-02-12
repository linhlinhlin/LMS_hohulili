import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from './api-client';
import { ApiResponse } from '../types/common.types';

export interface TrackSegmentsRequest {
  lessonId: string;
  sectionId: string;
  durationSeconds: number;
  fromSecond: number;
  toSecond: number;
  lastPosition: number;
}

export interface VideoProgressResponse {
  id: string | null;
  studentId: string | null;
  lessonId: string | null;
  sectionId: string;
  durationSeconds: number;
  watchedSeconds: number;
  progressPercent: number;
  completed: boolean;
  lastPosition: number;
}

export interface CanProceedResponse {
  canProceed: boolean;
}

export interface ResumePositionResponse {
  position: number;
}

@Injectable({ providedIn: 'root' })
export class VideoProgressApi {
  private apiClient = inject(ApiClient);

  trackSegments(request: TrackSegmentsRequest): Observable<ApiResponse<VideoProgressResponse>> {
    return this.apiClient.post('/api/v3/video-progress/track', request);
  }

  getProgress(sectionId: string): Observable<ApiResponse<VideoProgressResponse>> {
    return this.apiClient.get(`/api/v3/video-progress/${sectionId}`);
  }

  canProceedToNext(sectionId: string): Observable<ApiResponse<CanProceedResponse>> {
    return this.apiClient.get(`/api/v3/video-progress/${sectionId}/can-proceed`);
  }

  getResumePosition(sectionId: string): Observable<ApiResponse<ResumePositionResponse>> {
    return this.apiClient.get(`/api/v3/video-progress/${sectionId}/resume`);
  }

  getLessonProgress(lessonId: string): Observable<ApiResponse<VideoProgressResponse[]>> {
    return this.apiClient.get(`/api/v3/video-progress/lesson/${lessonId}`);
  }
}
