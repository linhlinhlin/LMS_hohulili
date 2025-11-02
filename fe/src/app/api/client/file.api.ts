import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType, HttpProgressEvent } from '@angular/common/http';
import { ApiClient } from './api-client';
import { ApiResponse } from '../types/common.types';
import { Observable } from 'rxjs';
import { map, filter } from 'rxjs/operators';

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

  // Upload file with progress tracking
  uploadFile(
    file: File,
    category: 'assignment' | 'lesson' | 'course' | 'profile' | 'document' = 'document',
    onProgress?: (progress: FileUploadProgress) => void
  ): Observable<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    return this.http.post<ApiResponse<FileUploadResponse>>(`${this.api['baseUrl']}/api/v1/files/upload`, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
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

  // Upload multiple files
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

    // Return all uploads as a single observable that emits when all complete
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

  // Get files list
  getFiles(params?: { category?: string; page?: number; limit?: number }) {
    return this.api.getWithResponse<FileUploadResponse[]>('/api/v1/files', { params });
  }

  // Get file by ID
  getFileById(fileId: string) {
    return this.api.getWithResponse<FileUploadResponse>(`/api/v1/files/${fileId}`);
  }

  // Delete file
  deleteFile(fileId: string) {
    return this.api.deleteWithResponse<string>(`/api/v1/files/${fileId}`);
  }

  // Get file download URL
  getDownloadUrl(fileId: string): string {
    return `/api/v1/files/${fileId}/download`;
  }

  // Get file thumbnail URL
  getThumbnailUrl(fileId: string): string {
    return `/api/v1/files/${fileId}/thumbnail`;
  }

  // Generate presigned upload URL (for large files)
  getPresignedUploadUrl(fileName: string, fileSize: number, contentType: string) {
    return this.api.postWithResponse<{ uploadUrl: string; fileId: string }>('/api/v1/files/presigned-url', {
      fileName,
      fileSize,
      contentType
    });
  }

  // Upload to presigned URL
  uploadToPresignedUrl(
    presignedUrl: string,
    file: File,
    onProgress?: (progress: FileUploadProgress) => void
  ): Observable<void> {
    return this.http.put(presignedUrl, file, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      map((event: HttpEvent<any>) => {
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
      filter(event => event.type === HttpEventType.Response),
      map(() => void 0)
    );
  }
}