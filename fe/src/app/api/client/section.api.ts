import { Injectable, inject } from '@angular/core';
import { ApiClient } from './api-client';
import { SECTION_ENDPOINTS } from '../endpoints/section.endpoints';
import { ApiResponse } from '../types/common.types';
import { CreateSectionRequest, SectionDetail, UpdateSectionRequest } from '../types/course.types';

@Injectable({ providedIn: 'root' })
export class SectionApi {
  private api = inject(ApiClient);

  createSection(lessonId: string, payload: CreateSectionRequest | FormData) {
    return this.api.postWithResponse<SectionDetail>(SECTION_ENDPOINTS.CREATE(lessonId), payload);
  }

  updateSection(lessonId: string, sectionId: string, payload: UpdateSectionRequest | FormData) {
    return this.api.putWithResponse<SectionDetail>(SECTION_ENDPOINTS.UPDATE(lessonId, sectionId), payload);
  }

  deleteSection(lessonId: string, sectionId: string) {
    return this.api.delete<ApiResponse<string>>(SECTION_ENDPOINTS.DELETE(lessonId, sectionId));
  }

  getSection(lessonId: string, sectionId: string) {
    return this.api.getWithResponse<SectionDetail>(SECTION_ENDPOINTS.GET(lessonId, sectionId));
  }

  getVideoPlayUrl(sectionId: string, format: 'hls' | 'dash' = 'hls') {
    return this.api.get<{
      playUrl: string;
      videoAssetId: string;
      videoSourceKind: string;
      format: 'hls' | 'dash';
      sectionId: string;
    }>(SECTION_ENDPOINTS.GET_STREAM_PLAY_URL(sectionId), {
      params: { format },
    });
  }
}
