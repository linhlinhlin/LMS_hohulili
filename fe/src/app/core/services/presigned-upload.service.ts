import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Observable } from 'rxjs';
import { switchMap, map, filter } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { HttpEventType, HttpEvent } from '@angular/common/http';

export type UploadEvent =
  | { type: 'progress'; progress: number }
  | { type: 'complete'; url: string; key: string; id: string };

interface InitResponse {
  success: boolean;
  uploadUrl: string | null;
  storageKey: string | null;
  expiresAt: string | null;
  isServerRelay: boolean;
  uploadStrategy?: 'SINGLE_PUT' | 'MULTIPART' | 'SERVER_RELAY' | null;
  multipartUploadId?: string | null;
  multipartPartSizeBytes?: number | null;
}

interface ConfirmResponse {
  success: boolean;
  id: string;
  url: string;
  storageKey: string;
}

interface MultipartPartUrlResponse {
  success: boolean;
  uploadUrl: string;
  partNumber: number;
}

/**
 * 3-step presigned upload service:
 * 1. POST /upload/init → get presigned PUT URL
 * 2. PUT file to presigned URL via XHR (progress tracking, no JWT needed)
 * 3. POST /upload/confirm → get final public URL
 *
 * Dev fallback: if isServerRelay=true, falls back to existing POST /upload/editor.
 */
@Injectable({ providedIn: 'root' })
export class PresignedUploadService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/v3/files`;
  private readonly defaultMultipartPartSizeBytes = 64 * 1024 * 1024;

  /**
   * Upload a file using the presigned URL flow.
   * Returns an Observable that emits progress events and completes with the final URL.
   * Cancellable: unsubscribing aborts the XHR upload.
   */
  upload(file: File, folder: string): Observable<UploadEvent> {
    return this.http.post<InitResponse>(`${this.baseUrl}/upload/init`, {
      contentType: file.type,
      fileSize: file.size,
      folder
    }).pipe(
      switchMap(initRes => {
        if (initRes.isServerRelay || !initRes.uploadUrl) {
          if (initRes.uploadStrategy === 'MULTIPART' && initRes.storageKey && initRes.multipartUploadId) {
            return this.multipartUpload(
              file,
              initRes.storageKey,
              initRes.multipartUploadId,
              initRes.multipartPartSizeBytes ?? this.defaultMultipartPartSizeBytes
            );
          }
          // Dev fallback: use server relay
          return this.serverRelayUpload(file, folder);
        }
        // Presigned flow: PUT to R2 via XHR, then confirm
        return this.presignedUpload(file, initRes.uploadUrl, initRes.storageKey!);
      })
    );
  }

  private presignedUpload(file: File, uploadUrl: string, storageKey: string): Observable<UploadEvent> {
    return new Observable<UploadEvent>(subscriber => {
      let attempt = 0;
      const maxRetries = 2;
      let activeXhr: XMLHttpRequest | null = null;

      const tryUpload = () => {
        const xhr = new XMLHttpRequest();
        activeXhr = xhr;

        xhr.upload.onprogress = (event: ProgressEvent) => {
          if (event.lengthComputable) {
            const progress = Math.round(100 * event.loaded / event.total);
            subscriber.next({ type: 'progress', progress });
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            this.http.post<ConfirmResponse>(`${this.baseUrl}/upload/confirm`, {
              storageKey,
              originalName: file.name
            }).subscribe({
              next: (confirmRes) => {
                subscriber.next({
                  type: 'complete',
                  url: confirmRes.url,
                  key: confirmRes.storageKey,
                  id: confirmRes.id
                });
                subscriber.complete();
              },
              error: (err) => subscriber.error(err)
            });
          } else if (xhr.status === 403) {
            const err: any = new Error('Presigned URL đã hết hạn hoặc không có quyền. Vui lòng thử tải lại.');
            err.status = 403;
            subscriber.error(err);
          } else if (xhr.status >= 500 && attempt < maxRetries) {
            attempt++;
            setTimeout(tryUpload, 1000 * Math.pow(2, attempt));
          } else {
            subscriber.error(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => {
          if (attempt < maxRetries) {
            attempt++;
            setTimeout(tryUpload, 1000 * Math.pow(2, attempt));
          } else {
            subscriber.error(new Error('Upload network error'));
          }
        };

        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      };

      tryUpload();

      return () => {
        if (activeXhr && activeXhr.readyState !== XMLHttpRequest.DONE) {
          activeXhr.abort();
        }
      };
    });
  }

  private multipartUpload(
    file: File,
    storageKey: string,
    uploadId: string,
    partSizeBytes: number
  ): Observable<UploadEvent> {
    return new Observable<UploadEvent>(subscriber => {
      const activeXhrs = new Set<XMLHttpRequest>();
      let aborted = false;

      const run = async () => {
        const completedParts: Array<{ partNumber: number; eTag: string }> = [];
        const totalParts = Math.max(1, Math.ceil(file.size / partSizeBytes));
        let uploadedBytes = 0;

        for (let partIndex = 0; partIndex < totalParts; partIndex++) {
          if (aborted) {
            return;
          }

          const partNumber = partIndex + 1;
          const start = partIndex * partSizeBytes;
          const end = Math.min(file.size, start + partSizeBytes);
          const blob = file.slice(start, end);

          const partUrlResponse = await this.requestMultipartPartUrl(storageKey, uploadId, partNumber);
          const eTag = await this.uploadMultipartPart(
            blob,
            file.type,
            partUrlResponse.uploadUrl,
            (loadedBytes) => {
              const progress = Math.round(100 * Math.min(file.size, uploadedBytes + loadedBytes) / file.size);
              subscriber.next({ type: 'progress', progress });
            },
            activeXhrs
          );

          uploadedBytes += blob.size;
          subscriber.next({ type: 'progress', progress: Math.round(100 * uploadedBytes / file.size) });
          completedParts.push({ partNumber, eTag });
        }

        await firstValueFrom(this.http.post<{ success: boolean }>(`${this.baseUrl}/upload/multipart/complete`, {
          storageKey,
          uploadId,
          parts: completedParts,
        }));

        if (aborted) {
          return;
        }

        this.http.post<ConfirmResponse>(`${this.baseUrl}/upload/confirm`, {
          storageKey,
          originalName: file.name
        }).subscribe({
          next: (confirmRes) => {
            subscriber.next({
              type: 'complete',
              url: confirmRes.url,
              key: confirmRes.storageKey,
              id: confirmRes.id
            });
            subscriber.complete();
          },
          error: (err) => subscriber.error(err)
        });
      };

      void run().catch(error => subscriber.error(error));

      return () => {
        aborted = true;
        activeXhrs.forEach(xhr => {
          if (xhr.readyState !== XMLHttpRequest.DONE) {
            xhr.abort();
          }
        });
        activeXhrs.clear();
      };
    });
  }

  private async requestMultipartPartUrl(
    storageKey: string,
    uploadId: string,
    partNumber: number
  ): Promise<MultipartPartUrlResponse> {
    const response = await firstValueFrom(this.http.post<MultipartPartUrlResponse>(`${this.baseUrl}/upload/multipart/part-url`, {
      storageKey,
      uploadId,
      partNumber,
    }));

    if (!response?.uploadUrl) {
      throw new Error(`Missing upload URL for part ${partNumber}`);
    }

    return response;
  }

  private uploadMultipartPart(
    blob: Blob,
    contentType: string,
    uploadUrl: string,
    onProgress: (loadedBytes: number) => void,
    activeXhrs: Set<XMLHttpRequest>
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      activeXhrs.add(xhr);

      xhr.upload.onprogress = (event: ProgressEvent) => {
        if (event.lengthComputable) {
          onProgress(event.loaded);
        }
      };

      xhr.onload = () => {
        activeXhrs.delete(xhr);
        if (xhr.status >= 200 && xhr.status < 300) {
          const eTag = xhr.getResponseHeader('ETag') || xhr.getResponseHeader('etag');
          if (!eTag) {
            reject(new Error('Multipart upload part completed without ETag response header'));
            return;
          }
          resolve(eTag);
        } else {
          reject(new Error(`Multipart upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        activeXhrs.delete(xhr);
        reject(new Error('Multipart upload network error'));
      };

      xhr.onabort = () => {
        activeXhrs.delete(xhr);
        reject(new Error('Multipart upload aborted'));
      };

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', contentType || 'application/octet-stream');
      xhr.send(blob);
    });
  }

  /**
   * Fallback: POST file to server relay endpoint with progress tracking.
   * Routes video files to /upload/video (500MB, video MIME types)
   * and other files to /upload/editor (50MB, image/doc types).
   */
  private serverRelayUpload(file: File, folder: string): Observable<UploadEvent> {
    const isVideo = folder === 'videos' || file.type.startsWith('video/');
    const endpoint = isVideo ? `${this.baseUrl}/upload/video` : `${this.baseUrl}/upload/editor`;

    const formData = new FormData();
    formData.append('file', file);
    if (!isVideo) {
      formData.append('folder', folder);
    }

    return this.http.post<any>(endpoint, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      filter((event: HttpEvent<any>) =>
        event.type === HttpEventType.UploadProgress || event.type === HttpEventType.Response
      ),
      map((event: HttpEvent<any>): UploadEvent => {
        if (event.type === HttpEventType.UploadProgress) {
          const progress = event.total ? Math.round(100 * event.loaded / event.total) : 0;
          return { type: 'progress', progress };
        }
        const body = (event as any).body;
        return {
          type: 'complete',
          url: body?.file?.url || '',
          key: body?.file?.storageKey || '',
          id: body?.file?.uuid || ''
        };
      })
    );
  }
}
