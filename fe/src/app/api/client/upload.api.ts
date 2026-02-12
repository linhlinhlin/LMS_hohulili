import { Injectable, inject } from '@angular/core';
import { ApiClient } from './api-client';
import { UPLOAD_ENDPOINTS } from '../endpoints/upload.endpoints';
import { ApiResponse } from '../types/common.types';
import { FileUploadResponse } from '../types/course.types';

@Injectable({ providedIn: 'root' })
export class UploadApi {
  private api = inject(ApiClient);

  uploadFile(file: File, type: 'video' | 'image' | 'doc' = 'video') {
    const form = new FormData();
    form.append('file', file);
    // type is sent as query param per backend signature
    return this.api.postWithResponse<FileUploadResponse>(`${UPLOAD_ENDPOINTS.MULTIPART}?type=${encodeURIComponent(type)}`, form, {
      // Let browser set correct Content-Type with boundary
      headers: { }
    });
  }

  deleteFile(fileUrl: string) {
    return this.api.delete<ApiResponse<string>>(UPLOAD_ENDPOINTS.DELETE, {
      body: { fileUrl }
    });
  }
}
