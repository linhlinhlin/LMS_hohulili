import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface DocumentUploadResponse {
  success: boolean;
  content: string;
  filename: string;
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
export class DocumentService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/v1/documents`;

  /**
   * Upload and parse document file (.doc/.docx)
   * @param file Document file to upload
   * @returns Observable with upload progress and final result
   */
  uploadDocument(file: File): Observable<DocumentUploadResponse | UploadProgress> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<DocumentUploadResponse>(`${this.baseUrl}/upload`, formData, {
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
              return event.body as DocumentUploadResponse;
            }
            throw new Error('No response body');

          default:
            return {
              progress: 0,
              status: 'processing' as const,
              message: 'Processing document...'
            } as UploadProgress;
        }
      })
    );
  }

  /**
   * Get supported file formats and limits
   */
  getSupportedFormats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/supported-formats`);
  }

  /**
   * Validate file before upload (legacy method for document parsing)
   */
  validateFile(file: File): { isValid: boolean; error?: string } {
    // Check file size (10MB limit for document parsing)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'File size exceeds 10MB limit'
      };
    }

    // Check file extension
    const allowedExtensions = ['.doc', '.docx'];
    const fileName = file.name.toLowerCase();
    const isValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

    if (!isValidExtension) {
      return {
        isValid: false,
        error: 'Only .doc and .docx files are supported for text extraction'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate file for attachment upload (supports multiple file types)
   */
  validateAttachmentFile(file: File): { isValid: boolean; error?: string } {
    // Check file size (100MB limit for attachments)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'File size exceeds 100MB limit'
      };
    }

    // Check file extension
    const allowedExtensions = [
      '.pdf', '.doc', '.docx', '.ppt', '.pptx',
      '.xls', '.xlsx', '.mp4', '.avi', '.mov',
      '.mp3', '.wav'
    ];
    const fileName = file.name.toLowerCase();
    const isValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

    if (!isValidExtension) {
      return {
        isValid: false,
        error: 'Unsupported file type. Supported: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, MP4, AVI, MOV, MP3, WAV'
      };
    }

    return { isValid: true };
  }

  /**
   * Get file type category for display
   */
  getFileTypeCategory(fileName: string): string {
    const fileNameLower = fileName.toLowerCase();

    if (fileNameLower.endsWith('.pdf') || fileNameLower.endsWith('.doc') || fileNameLower.endsWith('.docx')) {
      return 'document';
    } else if (fileNameLower.endsWith('.ppt') || fileNameLower.endsWith('.pptx')) {
      return 'presentation';
    } else if (fileNameLower.endsWith('.xls') || fileNameLower.endsWith('.xlsx')) {
      return 'spreadsheet';
    } else if (fileNameLower.endsWith('.mp4') || fileNameLower.endsWith('.avi') || fileNameLower.endsWith('.mov')) {
      return 'video';
    } else if (fileNameLower.endsWith('.mp3') || fileNameLower.endsWith('.wav')) {
      return 'audio';
    }
    return 'other';
  }

  /**
   * Get supported attachment formats
   */
  getSupportedAttachmentFormats(): { formats: string[]; maxSize: string; description: string } {
    return {
      formats: ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.mp4', '.avi', '.mov', '.mp3', '.wav'],
      maxSize: '100MB',
      description: 'Documents, presentations, spreadsheets, videos, and audio files'
    };
  }

  /**
   * Get scanned documents for a specific section
   * @param sectionId The section ID to get documents for
   * @returns Observable with scanned documents
   */
  getScannedDocumentsBySection(sectionId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/scanned-documents/section/${sectionId}`);
  }

  /**
   * Get all scanned documents
   * @returns Observable with all scanned documents
   */
  getAllScannedDocuments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/scanned-documents`);
  }
}