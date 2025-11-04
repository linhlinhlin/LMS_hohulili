import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface LessonAttachment {
  id: string;
  fileName: string;
  originalFileName: string;
  fileUrl: string;
  fileSize: number;
  contentType: string;
  fileType: string;
  displayOrder: number;
  uploadedAt: string;
}

export interface AttachmentUploadResponse {
  success: boolean;
  data: LessonAttachment;
  message: string;
}

export interface UploadProgress {
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class LessonAttachmentApi {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/v1/lessons`;

  /**
   * Add attachment to a lesson
   * @param lessonId The lesson ID
   * @param file File to upload
   * @param displayOrder Optional display order
   * @returns Observable with upload progress and final result
   */
  addAttachment(lessonId: string, file: File, displayOrder?: number): Observable<AttachmentUploadResponse | UploadProgress> {
    const formData = new FormData();
    formData.append('file', file);
    if (displayOrder !== undefined) {
      formData.append('displayOrder', displayOrder.toString());
    }

    return this.http.post<AttachmentUploadResponse>(`${this.baseUrl}/${lessonId}/attachments`, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      map(event => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            const progress = event.total ? Math.round(100 * event.loaded / event.total) : 0;
            return {
              progress,
              status: 'uploading' as const,
              message: `Uploading... ${progress}%`
            } as UploadProgress;

          case HttpEventType.Response:
            if (event.body) {
              // Handle backend ApiResponse format
              const backendResponse = event.body as any;
              return {
                success: true,
                data: backendResponse.data,
                message: backendResponse.message || 'Upload successful'
              } as AttachmentUploadResponse;
            }
            throw new Error('No response body');

          default:
            return {
              progress: 0,
              status: 'processing' as const,
              message: 'Processing attachment...'
            } as UploadProgress;
        }
      })
    );
  }

  /**
   * Get all attachments for a lesson
   * @param lessonId The lesson ID
   * @returns Observable with list of attachments
   */
  getAttachments(lessonId: string): Observable<LessonAttachment[]> {
    return this.http.get<{ data: LessonAttachment[]; message?: string }>(`${this.baseUrl}/${lessonId}/attachments`)
      .pipe(
        map(response => response.data || [])
      );
  }

  /**
   * Delete an attachment
   * @param attachmentId The attachment ID
   * @returns Observable with delete result
   */
  deleteAttachment(attachmentId: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ data?: string; message?: string }>(`${this.baseUrl}/attachments/${attachmentId}`)
      .pipe(
        map(response => ({
          success: true,
          message: response.message || 'Attachment deleted successfully'
        }))
      );
  }

  /**
   * Reorder attachment
   * @param attachmentId The attachment ID
   * @param displayOrder New display order
   * @returns Observable with updated attachment
   */
  reorderAttachment(attachmentId: string, displayOrder: number): Observable<LessonAttachment> {
    return this.http.put<{ data: LessonAttachment; message?: string }>(`${this.baseUrl}/attachments/${attachmentId}/reorder`, {
      displayOrder
    }).pipe(
      map(response => response.data)
    );
  }
}