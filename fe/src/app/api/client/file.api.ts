import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { ApiClient } from './api-client';
import { ApiResponse } from '../types/common.types';
import { Observable } from 'rxjs';
import { map, filter } from 'rxjs/operators';

/**
 * File API Endpoints - V3
 */
const FILE_ENDPOINTS = {
  UPLOAD: '/api/v3/files/upload',
  LIST: '/api/v3/files',
  DELETE: '/api/v3/files',
  UPLOAD_INIT: '/api/v3/files/upload/init',
  UPLOAD_CONFIRM: '/api/v3/files/upload/confirm',
} as const;

export interface FileUploadResponse {
  id: string;
  url: string;
  originalName: string;
  fileName: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  category?: string;
  thumbnailUrl?: string;
}

export interface FileUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

@Injectable({ providedIn: 'root' })
export class FileApi {
  private api = inject(ApiClient);
  private http = inject(HttpClient);

  /**
   * Upload file with progress tracking
   */
  uploadFile(
    file: File,
    category: 'assignment' | 'lesson' | 'course' | 'profile' | 'document' = 'document',
    onProgress?: (progress: FileUploadProgress) => void
  ): Observable<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    return this.http.post<ApiResponse<FileUploadResponse>>(
      `${this.api['baseUrl']}${FILE_ENDPOINTS.UPLOAD}`,
      formData,
      {
        reportProgress: true,
        observe: 'events'
      }
    ).pipe(
      map((event: HttpEvent<ApiResponse<FileUploadResponse>>) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          const progress: FileUploadProgress = {
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round(100 * event.loaded / event.total)
          };
          if (onProgress) {
            onProgress(progress);
          }
        }
        return event;
      }),
      filter((event): event is any => event.type === HttpEventType.Response),
      map(event => event.body.data)
    );
  }

  /**
   * Upload multiple files
   */
  uploadMultipleFiles(
    files: File[],
    category: 'assignment' | 'lesson' | 'course' | 'profile' | 'document' = 'document',
    onProgress?: (fileIndex: number, progress: FileUploadProgress) => void
  ): Observable<FileUploadResponse[]> {
    const uploads = files.map((file, index) =>
      this.uploadFile(file, category, (progress) => {
        if (onProgress) {
          onProgress(index, progress);
        }
      })
    );

    return new Observable(subscriber => {
      const results: FileUploadResponse[] = [];
      let completedCount = 0;

      uploads.forEach((upload, index) => {
        upload.subscribe({
          next: (result) => {
            results[index] = result;
            completedCount++;
            if (completedCount === files.length) {
              subscriber.next(results);
              subscriber.complete();
            }
          },
          error: (error) => subscriber.error(error)
        });
      });
    });
  }

  /**
   * Get files list
   */
  getFiles(params?: { category?: string; page?: number; limit?: number }) {
    return this.api.getWithResponse<FileUploadResponse[]>(FILE_ENDPOINTS.LIST, { params });
  }

  /**
   * Delete file by storageKey (e.g. "editor-images/uuid.png")
   */
  deleteFile(storageKey: string) {
    return this.api.deleteWithResponse<string>(
      `${FILE_ENDPOINTS.DELETE}?storageKey=${encodeURIComponent(storageKey)}`
    );
  }
}
