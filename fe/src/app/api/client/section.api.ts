import { Injectable, inject } from '@angular/core';
import { ApiClient } from './api-client';
import { SECTION_ENDPOINTS } from '../endpoints/section.endpoints';
import { ApiResponse } from '../types/common.types';
import { CreateSectionRequest, SectionDetail, UpdateSectionRequest } from '../types/course.types';

@Injectable({ providedIn: 'root' })
export class SectionApi {
  private api = inject(ApiClient);

  createSection(courseId: string, payload: CreateSectionRequest) {
    return this.api.postWithResponse<SectionDetail>(SECTION_ENDPOINTS.CREATE(courseId), payload);
  }

  updateSection(sectionId: string, payload: UpdateSectionRequest) {
    return this.api.put<ApiResponse<SectionDetail>>(SECTION_ENDPOINTS.UPDATE(sectionId), payload);
  }

  deleteSection(sectionId: string) {
    return this.api.delete<ApiResponse<string>>(SECTION_ENDPOINTS.DELETE(sectionId));
  }

  // Flat listing helpers
  listSectionsFlat(courseId: string) {
    return this.api.getWithResponse<any>(SECTION_ENDPOINTS.LIST_FLAT(courseId));
  }
}
