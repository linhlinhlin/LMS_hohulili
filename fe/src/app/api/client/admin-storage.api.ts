import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

/** Bucket reachability + size sample (capped at 5000 objects). */
export interface BucketStats {
  name: string;
  reachable: boolean;
  reason?: string;
  error?: string;
  objectCount?: number;
  totalBytes?: number;
  truncated?: boolean;
}

export interface StorageHealth {
  checkedAt: string;
  publicBucket: BucketStats;
  videoBucket: BucketStats;
  db: {
    totalAttachments: number;
    currentOrphans: number;
  };
}

export interface PendingReviewItem {
  id: string;
  fileName: string;
  originalName: string;
  category: string;
  fileUrl: string;
  size: number;
  contentType: string;
  uploadedBy: string | null;
  uploadedAt: string | null;
}

interface ApiEnvelope<T> { success: boolean; data: T; message?: string }

@Injectable({ providedIn: 'root' })
export class AdminStorageApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v3/admin/storage';

  health(): Observable<StorageHealth> {
    return this.http.get<ApiEnvelope<StorageHealth>>(`${this.base}/health`).pipe(map(r => r.data));
  }

  pendingReview(): Observable<PendingReviewItem[]> {
    return this.http.get<ApiEnvelope<PendingReviewItem[]>>(`${this.base}/orphans`).pipe(map(r => r.data ?? []));
  }

  releaseOrphan(id: string): Observable<{ id: string; status: string }> {
    return this.http.post<ApiEnvelope<{ id: string; status: string }>>(`${this.base}/orphans/${id}/release`, {})
      .pipe(map(r => r.data));
  }
}
