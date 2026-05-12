import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

/**
 * Instruction attachment cho assignment (Google Classroom-style standalone files).
 * Phân biệt với student submission attachments qua `submission_id IS NULL` (BE).
 */
export interface InstructionAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  fileType: string | null;
  storageKey: string | null;
  displayOrder: number;
  uploadedAt: string | null;
}

export interface CreateInstructionAttachmentRequest {
  fileName: string;
  fileUrl: string;
  storageKey?: string | null;
  fileSize?: number | null;
  fileType?: string | null;
  displayOrder?: number | null;
}

@Injectable({ providedIn: 'root' })
export class AssignmentInstructionAttachmentApi {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/v3/teacher/assignments`;

  /**
   * Đăng ký metadata file đã upload qua presigned URL.
   * Pattern Google Classroom: 2-step
   *   1. presignedUpload.upload(file, 'assignment-instructions') → returns {url, key}
   *   2. add(assignmentId, {fileName, fileUrl: url, storageKey: key, fileSize, fileType})
   */
  add(assignmentId: string, req: CreateInstructionAttachmentRequest): Observable<InstructionAttachment> {
    return this.http
      .post<{ data: InstructionAttachment }>(`${this.baseUrl}/${assignmentId}/instruction-attachments`, req)
      .pipe(map((r) => r.data));
  }

  list(assignmentId: string): Observable<InstructionAttachment[]> {
    return this.http
      .get<{ data: InstructionAttachment[] }>(`${this.baseUrl}/${assignmentId}/instruction-attachments`)
      .pipe(map((r) => r.data ?? []));
  }

  delete(assignmentId: string, attachmentId: string): Observable<void> {
    return this.http
      .delete<{ data: void }>(`${this.baseUrl}/${assignmentId}/instruction-attachments/${attachmentId}`)
      .pipe(map(() => undefined));
  }
}
