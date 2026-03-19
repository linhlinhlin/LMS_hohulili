import { Injectable, inject } from '@angular/core';
import { ApiClient } from './api-client';
import { ApiResponse } from '../types/common.types';
import type { OfflineVideoProfileDescriptor, VideoSourceKind } from '../../core/models/video-quality';

export interface VideoAssetResponse {
  id: string;
  status: string;
  adaptivePackagingStatus: string;
  videoSourceKind: VideoSourceKind;
  originalFileName: string;
  sourceFileSize?: number | null;
  durationSeconds?: number | null;
  width?: number | null;
  height?: number | null;
  streamVideoUid?: string | null;
  playbackUrl?: string | null;
  errorMessage?: string | null;
  hlsManifestStorageKey?: string | null;
  dashManifestStorageKey?: string | null;
  availableOfflineProfiles: OfflineVideoProfileDescriptor[];
}

@Injectable({ providedIn: 'root' })
export class VideoAssetApi {
  private readonly api = inject(ApiClient);

  createFromUpload(attachmentId: string, displayName?: string) {
    return this.api.postWithResponse<VideoAssetResponse>('/api/v3/video-assets/from-upload', {
      attachmentId,
      displayName,
    });
  }

  getById(assetId: string) {
    return this.api.getWithResponse<VideoAssetResponse>(`/api/v3/video-assets/${assetId}`);
  }

  retry(assetId: string) {
    return this.api.postWithResponse<VideoAssetResponse>(`/api/v3/video-assets/${assetId}/retry`, {});
  }
}
