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

  uploadStreamVideo(sectionId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.post<{ sectionId: string; lessonId: string; streamVideoUid: string; playbackUrl: string }>(
      SECTION_ENDPOINTS.UPLOAD_STREAM_VIDEO(sectionId),
      formData
    );
  }

  getStreamPlayUrl(sectionId: string) {
    return this.api.get<{ playUrl: string; uid: string; sectionId: string }>(
      SECTION_ENDPOINTS.GET_STREAM_PLAY_URL(sectionId)
    );
  }

  getStreamDownloadUrl(sectionId: string, quality: '360p' | '720p' | '1080p') {
    return this.api.get<{ downloadUrl: string; quality: string; uid: string; sectionId: string }>(
      SECTION_ENDPOINTS.GET_STREAM_DOWNLOAD_URL(sectionId),
      { params: { quality } }
    );
  }

  getStreamSizes(sectionId: string) {
    return this.api.get<{ sizes: Record<string, number>; uid?: string; sectionId: string }>(
      SECTION_ENDPOINTS.GET_STREAM_SIZES(sectionId)
    );
  }

  deleteStreamVideo(sectionId: string) {
    return this.api.delete<void>(SECTION_ENDPOINTS.DELETE_STREAM_VIDEO(sectionId));
  }
}
