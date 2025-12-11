import { Injectable, inject } from '@angular/core';
import { ApiClient } from './api-client';
import { SECTION_ENDPOINTS } from '../endpoints/section.endpoints';
import { ApiResponse } from '../types/common.types';
import { CreateSectionRequest, SectionDetail, UpdateSectionRequest } from '../types/course.types';

@Injectable({ providedIn: 'root' })
export class SectionApi {
  private api = inject(ApiClient);

  createSection(payload: CreateSectionRequest | FormData) {
    // Note: If payload is FormData, HttpClient handles Content-Type automatically
    return this.api.postWithResponse<SectionDetail>(SECTION_ENDPOINTS.CREATE, payload);
  }

  updateSection(sectionId: string, payload: UpdateSectionRequest) {
    return this.api.put<ApiResponse<SectionDetail>>(SECTION_ENDPOINTS.UPDATE(sectionId), payload);
  }

  deleteSection(sectionId: string) {
    return this.api.delete<ApiResponse<string>>(SECTION_ENDPOINTS.DELETE(sectionId));
  }

  getSection(sectionId: string) {
    return this.api.getWithResponse<SectionDetail>(SECTION_ENDPOINTS.GET(sectionId));
  }
}
