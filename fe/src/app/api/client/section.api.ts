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

  updateVideo(lessonId: string, sectionId: string, params: { videoType?: string; videoUrl?: string; cfObjectKey?: string }) {
    const query = new URLSearchParams();
    if (params.videoType) query.set('videoType', params.videoType);
    if (params.videoUrl) query.set('videoUrl', params.videoUrl);
    if (params.cfObjectKey) query.set('cfObjectKey', params.cfObjectKey);
    return this.api.patchWithResponse<SectionDetail>(`${SECTION_ENDPOINTS.UPDATE_VIDEO(lessonId, sectionId)}?${query.toString()}`, {});
  }
}
