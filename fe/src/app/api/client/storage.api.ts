import { Injectable, inject } from '@angular/core';
import { ApiClient } from './api-client';
import { STORAGE_ENDPOINTS } from '../endpoints/storage.endpoints';

export interface R2PresignRequest {
  objectKey?: string;
  contentType: string;
}

export interface R2PresignResponse {
  uploadUrl: string;
  headers: Record<string, string>;
  objectKey: string;
  publicUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class StorageApi {
  private api = inject(ApiClient);

  presignR2Upload(payload: R2PresignRequest) {
    return this.api.postWithResponse<R2PresignResponse>(STORAGE_ENDPOINTS.R2_PRESIGN_UPLOAD, payload);
  }
}
