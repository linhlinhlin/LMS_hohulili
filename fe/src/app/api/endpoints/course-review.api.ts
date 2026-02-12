import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../client/api-client';

export interface ReviewDTO {
  id: string;
  courseId: string;
  studentId: string;
  studentName?: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
}

export interface SubmitReviewRequest {
  rating: number;
  comment?: string;
}

@Injectable({ providedIn: 'root' })
export class CourseReviewApi {
  private api = inject(ApiClient);

  submitReview(courseId: string, request: SubmitReviewRequest): Observable<any> {
    return this.api.post(`/api/v3/courses/${courseId}/reviews`, request);
  }

  getReviews(courseId: string): Observable<any> {
    return this.api.get(`/api/v3/courses/${courseId}/reviews`);
  }

  getReviewSummary(courseId: string): Observable<any> {
    return this.api.get(`/api/v3/courses/${courseId}/reviews/summary`);
  }

  getMyReview(courseId: string): Observable<any> {
    return this.api.get(`/api/v3/courses/${courseId}/reviews/my-review`);
  }

  deleteReview(courseId: string, reviewId: string): Observable<any> {
    return this.api.delete(`/api/v3/courses/${courseId}/reviews/${reviewId}`);
  }
}
