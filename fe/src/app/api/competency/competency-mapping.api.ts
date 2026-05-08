import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiClient } from '../client/api-client';
import { ApiResponse } from '../types/common.types';
import { COMPETENCY_ENDPOINTS } from './competency-mapping.endpoints';
import {
  MaritimeStandard,
  StandardCompetency,
  CompetencyMapResponse,
  UpdateLessonCompetenciesRequest,
  UpdateLessonCompetenciesResponse,
} from './competency-mapping.types';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CompetencyMappingApi {
  private api = inject(ApiClient);
  private http = inject(HttpClient);

  getStandards(activeOnly = true): Observable<MaritimeStandard[]> {
    return this.api
      .getWithResponse<MaritimeStandard[]>(
        `${COMPETENCY_ENDPOINTS.STANDARDS}?active=${activeOnly}`
      )
      .pipe(map((r) => r.data ?? []));
  }

  getCompetencies(
    standardId: string,
    category?: string
  ): Observable<StandardCompetency[]> {
    const params = category ? `?category=${encodeURIComponent(category)}` : '';
    return this.api
      .getWithResponse<StandardCompetency[]>(
        `${COMPETENCY_ENDPOINTS.COMPETENCIES_BY_STANDARD(standardId)}${params}`
      )
      .pipe(map((r) => r.data ?? []));
  }

  getCourseCompetencyMap(courseId: string): Observable<CompetencyMapResponse> {
    return this.api
      .getWithResponse<CompetencyMapResponse>(
        COMPETENCY_ENDPOINTS.COURSE_COMPETENCY_MAP(courseId)
      )
      .pipe(map((r) => r.data));
  }

  getLessonCompetencies(lessonId: string): Observable<StandardCompetency[]> {
    return this.api
      .getWithResponse<StandardCompetency[]>(
        COMPETENCY_ENDPOINTS.LESSON_COMPETENCIES(lessonId)
      )
      .pipe(map((r) => r.data ?? []));
  }

  updateLessonCompetencies(
    lessonId: string,
    request: UpdateLessonCompetenciesRequest
  ): Observable<UpdateLessonCompetenciesResponse> {
    return this.api
      .putWithResponse<UpdateLessonCompetenciesResponse>(
        COMPETENCY_ENDPOINTS.LESSON_COMPETENCIES(lessonId),
        request
      )
      .pipe(map((r) => r.data));
  }

  exportCsv(courseId: string): Observable<Blob> {
    return this.http.get(
      `${environment.apiUrl}${COMPETENCY_ENDPOINTS.EXPORT_CSV(courseId)}`,
      { responseType: 'blob' }
    );
  }
}
