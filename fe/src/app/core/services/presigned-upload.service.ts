import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
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
}

interface ConfirmResponse {
  success: boolean;
  id: string;
  url: string;
  storageKey: string;
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
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (event: ProgressEvent) => {
        if (event.lengthComputable) {
          const progress = Math.round(100 * event.loaded / event.total);
          subscriber.next({ type: 'progress', progress });
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Step 3: Confirm upload
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
        } else {
          subscriber.error(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => subscriber.error(new Error('Upload network error'));

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);

      // Teardown: abort XHR on unsubscribe
      return () => {
        if (xhr.readyState !== XMLHttpRequest.DONE) {
          xhr.abort();
        }
      };
    });
  }

  /**
   * Fallback: POST file to server relay endpoint with progress tracking.
   */
  private serverRelayUpload(file: File, folder: string): Observable<UploadEvent> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    return this.http.post<any>(`${this.baseUrl}/upload/editor`, formData, {
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
