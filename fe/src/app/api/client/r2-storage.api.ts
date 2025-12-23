import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface R2PresignUploadRequest {
  objectKey?: string;
  contentType: string;
}

export interface R2PresignUploadResponse {
  uploadUrl: string;
  headers: Record<string, string>;
  objectKey: string;
  publicUrl?: string;
}

export interface R2PresignDownloadRequest {
  objectKey: string;
}

export interface R2PresignDownloadResponse {
  downloadUrl: string;
  headers: Record<string, string>;
  objectKey: string;
  publicUrl?: string;
}

export interface R2PublicUrlResponse {
  publicUrl: string;
  objectKey: string;
}

@Injectable({
  providedIn: 'root'
})
export class R2StorageApi {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/v1/storage/r2`;

  /**
   * Get presigned URL for uploading to R2
   */
  getPresignedUploadUrl(request: R2PresignUploadRequest): Observable<R2PresignUploadResponse> {
    return this.http.post<R2PresignUploadResponse>(`${this.baseUrl}/presign-upload`, request);
  }

  /**
   * Upload file directly to R2 using presigned URL
   */
  uploadToR2(file: File, contentType?: string): Observable<{
    objectKey: string;
    publicUrl: string;
    uploadUrl: string;
  }> {
    const fileName = `videos/${Date.now()}-${file.name}`;
    const request: R2PresignUploadRequest = {
      objectKey: fileName,
      contentType: contentType || file.type
    };

    return this.getPresignedUploadUrl(request).pipe(
      switchMap(presignResponse => {
        // Upload file to presigned URL
        const headers: Record<string, string> = {
          'Content-Type': presignResponse.headers['Content-Type'] || contentType || file.type
        };

        return from(
          fetch(presignResponse.uploadUrl, {
            method: 'PUT',
            body: file,
            headers: headers
          })
        ).pipe(
          map(response => {
            if (!response.ok) {
              throw new Error(`Upload failed: ${response.statusText}`);
            }
            return {
              objectKey: presignResponse.objectKey,
              publicUrl: presignResponse.publicUrl || '',
              uploadUrl: presignResponse.uploadUrl
            };
          })
        );
      })
    );
  }

  /**
   * Upload file with progress tracking
   */
  uploadToR2WithProgress(
    file: File,
    onProgress?: (progress: number) => void,
    contentType?: string
  ): Observable<{
    objectKey: string;
    publicUrl: string;
  }> {
    const fileName = `videos/${Date.now()}-${file.name}`;
    const request: R2PresignUploadRequest = {
      objectKey: fileName,
      contentType: contentType || file.type
    };

    return this.getPresignedUploadUrl(request).pipe(
      switchMap((presignResponse): Observable<{ objectKey: string; publicUrl: string }> => {
        return new Observable(observer => {
          const xhr = new XMLHttpRequest();

          // Track upload progress
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable && onProgress) {
              const progress = Math.round((e.loaded / e.total) * 100);
              onProgress(progress);
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              observer.next({
                objectKey: presignResponse.objectKey,
                publicUrl: presignResponse.publicUrl || ''
              });
              observer.complete();
            } else {
              observer.error(new Error(`Upload failed: ${xhr.statusText}`));
            }
          });

          xhr.addEventListener('error', () => {
            observer.error(new Error('Upload failed'));
          });

          xhr.addEventListener('abort', () => {
            observer.error(new Error('Upload cancelled'));
          });

          xhr.open('PUT', presignResponse.uploadUrl);
          xhr.setRequestHeader('Content-Type', contentType || file.type);
          xhr.send(file);

          // Return cleanup function
          return () => xhr.abort();
        });
      })
    );
  }

  /**
   * Get presigned URL for downloading from R2
   */
  getPresignedDownloadUrl(objectKey: string): Observable<R2PresignDownloadResponse> {
    return this.http.post<R2PresignDownloadResponse>(`${this.baseUrl}/presign-download`, {
      objectKey
    });
  }

  /**
   * Delete object from R2
   */
  deleteObject(objectKey: string): Observable<{ deleted: boolean; objectKey: string }> {
    return this.http.delete<{ deleted: boolean; objectKey: string }>(
      `${this.baseUrl}/object/${encodeURIComponent(objectKey)}`
    );
  }

  /**
   * Get public URL for an object
   */
  getPublicUrl(objectKey: string): Observable<R2PublicUrlResponse> {
    return this.http.get<R2PublicUrlResponse>(`${this.baseUrl}/public-url`, {
      params: { objectKey }
    });
  }
}
