import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from './api-client';
import { LEARNING_ACTIVITY_ENDPOINTS } from '../endpoints/learning-activity.endpoints';

export interface HeartbeatRequest {
  lessonId: string;
  sectionId: string | null;
  timeSpentSeconds: number;
  contentType: string;
}

export interface ReadingProgressRequest {
  lessonId: string;
  sectionId: string;
  scrollPercent: number;
}

export interface InteractiveVideoEventRequest {
  lessonId: string;
  sectionId: string | null;
  interactionId: string;
  action: string;
  videoTimeSeconds: number;
  data?: Record<string, unknown>;
}

export interface ContinueWhereLeftOffResponse {
  lessonId: string;
  sectionId: string | null;
  lastEventType: string;
  lastActivityAt: string;
}

export interface StudyTimeResponse {
  todaySeconds: number;
  todayFormatted: string;
}

@Injectable({ providedIn: 'root' })
export class LearningActivityApi {
  private api = inject(ApiClient);

  recordHeartbeat(request: HeartbeatRequest): Observable<any> {
    return this.api.post(LEARNING_ACTIVITY_ENDPOINTS.HEARTBEAT, request);
  }

  recordReadingProgress(request: ReadingProgressRequest): Observable<any> {
    return this.api.post(LEARNING_ACTIVITY_ENDPOINTS.READING_PROGRESS, request);
  }

  recordInteractiveVideoEvent(request: InteractiveVideoEventRequest): Observable<any> {
    return this.api.post(LEARNING_ACTIVITY_ENDPOINTS.INTERACTIVE_VIDEO_EVENTS, request);
  }

  getContinueWhereLeftOff(): Observable<any> {
    return this.api.get<ContinueWhereLeftOffResponse>(
      LEARNING_ACTIVITY_ENDPOINTS.CONTINUE
    );
  }

  getTodayStudyTime(): Observable<any> {
    return this.api.get<StudyTimeResponse>(
      LEARNING_ACTIVITY_ENDPOINTS.STUDY_TIME_TODAY
    );
  }
}
