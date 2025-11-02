import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType, HttpProgressEvent } from '@angular/common/http';
import { UploadedFile } from '../models/uploaded-file.model';
import { Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { FileApi, FileUploadResponse } from '../../api/client/file.api';

// Use shared UploadedFile model

export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface FileUploadOptions {
  category: 'course' | 'assignment' | 'profile' | 'document' | 'image' | 'video';
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  generateThumbnail?: boolean;
  compress?: boolean;
  quality?: number; // for image compression
}

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
  private http = inject(HttpClient);
  private fileApi = inject(FileApi);

  // Signals for reactive state management
  private _uploadedFiles = signal<UploadedFile[]>([]);
  private _uploadProgress = signal<Map<string, UploadProgress>>(new Map());
  private _isUploading = signal<boolean>(false);
  private _uploadQueue = signal<string[]>([]);

  // Readonly signals for external consumption
  readonly uploadedFiles = this._uploadedFiles.asReadonly();
  readonly uploadProgress = this._uploadProgress.asReadonly();
  readonly isUploading = this._isUploading.asReadonly();
  readonly uploadQueue = this._uploadQueue.asReadonly();

  // Computed signals
  readonly totalUploadedFiles = computed(() => this._uploadedFiles().length);
  readonly totalUploadSize = computed(() => 
    this._uploadedFiles().reduce((sum, file) => sum + (file.size || 0), 0)
  );

  readonly filesByCategory = computed(() => {
    const files = this._uploadedFiles();
    return {
    course: files.filter(f => (f as any).category === 'course'),
    assignment: files.filter(f => (f as any).category === 'assignment'),
    profile: files.filter(f => (f as any).category === 'profile'),
    document: files.filter(f => (f as any).category === 'document'),
    image: files.filter(f => (f as any).category === 'image'),
    video: files.filter(f => (f as any).category === 'video')
    };
  });

  readonly activeUploads = computed(() => {
    const progressMap = this._uploadProgress();
    return Array.from(progressMap.values()).filter(p => p.status === 'uploading');
  });

  constructor() {
    this.loadMockFiles();
  }

  // File Upload Methods
  async uploadFile(
    file: File, 
    options: FileUploadOptions,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadedFile> {
    // Validate file
    this.validateFile(file, options);

    const fileId = this.generateFileId();
    this._isUploading.set(true);

    // Add to upload queue
    this._uploadQueue.update(queue => [...queue, fileId]);

    // Initialize progress tracking
    const initialProgress: UploadProgress = {
      fileId,
      fileName: file.name,
      progress: 0,
      status: 'uploading'
    };
    
    this._uploadProgress.update(progressMap => {
      const newMap = new Map(progressMap);
      newMap.set(fileId, initialProgress);
      return newMap;
    });

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', options.category);
      formData.append('generateThumbnail', String(options.generateThumbnail || false));
      formData.append('compress', String(options.compress || false));
      formData.append('quality', String(options.quality || 80));

      // Upload file
  const uploadedFile = await this.performUpload(formData, fileId, onProgress);

      // Add to uploaded files
      this._uploadedFiles.update(files => [uploadedFile, ...files]);

      // Update progress to completed
      this._uploadProgress.update(progressMap => {
        const newMap = new Map(progressMap);
        newMap.set(fileId, {
          ...initialProgress,
          progress: 100,
          status: 'completed'
        });
        return newMap;
      });

      // Remove from queue
      this._uploadQueue.update(queue => queue.filter(id => id !== fileId));

      return uploadedFile;

    } catch (error) {
      // Update progress to error
      this._uploadProgress.update(progressMap => {
        const newMap = new Map(progressMap);
        newMap.set(fileId, {
          ...initialProgress,
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed'
        });
        return newMap;
      });

      // Remove from queue
      this._uploadQueue.update(queue => queue.filter(id => id !== fileId));

      throw error;
    } finally {
      this._isUploading.set(false);
    }
  }

  async uploadMultipleFiles(
    files: File[],
    options: FileUploadOptions,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadedFile[]> {
    const uploadPromises = files.map(file => 
      this.uploadFile(file, options, onProgress)
    );

    return Promise.all(uploadPromises);
  }

  private async performUpload(
    formData: FormData,
    fileId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadedFile> {
    return new Promise((resolve, reject) => {
      const file = formData.get('file') as File;
      const category = formData.get('category') as 'assignment' | 'lesson' | 'course' | 'profile' | 'document' || 'document';

      this.fileApi.uploadFile(file, category, (uploadProgress) => {
        // Update progress
        this._uploadProgress.update(progressMap => {
          const newMap = new Map(progressMap);
          const currentProgress = newMap.get(fileId);
          if (currentProgress) {
            newMap.set(fileId, {
              ...currentProgress,
              progress: uploadProgress.percentage
            });
          }
          return newMap;
        });

        // Call progress callback
        const currentProgress = this._uploadProgress().get(fileId);
        if (currentProgress && onProgress) {
          onProgress(currentProgress);
        }
      }).subscribe({
        next: (response: FileUploadResponse) => {
          const uploadedFile: UploadedFile = {
            id: response.id,
            url: response.url,
            originalName: response.originalName,
            size: response.size,
            mimeType: response.mimeType,
            uploadedAt: response.uploadedAt,
            thumbnailUrl: response.thumbnailUrl
          } as UploadedFile;

          resolve(uploadedFile);
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }

  // File Management Methods
  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.fileApi.deleteFile(fileId).toPromise();
      
      this._uploadedFiles.update(files => 
        files.filter(file => file.id !== fileId)
      );
      
      this._uploadProgress.update(progressMap => {
        const newMap = new Map(progressMap);
        newMap.delete(fileId);
        return newMap;
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  async getFiles(category?: string): Promise<UploadedFile[]> {
    try {
      await this.simulateApiCall();
      
      if (category) {
        return this._uploadedFiles().filter(file => (file as any).category === category);
      }
      
      return this._uploadedFiles();
    } catch (error) {
      console.error('Error fetching files:', error);
      return this._uploadedFiles();
    }
  }

  // File Validation Methods
  private validateFile(file: File, options: FileUploadOptions): void {
    // Check file size
    if (options.maxSize && file.size > options.maxSize) {
      throw new Error(`File size exceeds maximum allowed size of ${this.formatFileSize(options.maxSize)}`);
    }

    // Check file type
    if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed. Allowed types: ${options.allowedTypes.join(', ')}`);
    }

    // Additional validation based on category
    switch (options.category) {
      case 'image':
        if (!file.type.startsWith('image/')) {
          throw new Error('File must be an image');
        }
        break;
      case 'video':
        if (!file.type.startsWith('video/')) {
          throw new Error('File must be a video');
        }
        break;
      case 'document':
        const documentTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain'
        ];
        if (!documentTypes.includes(file.type)) {
          throw new Error('File must be a document (PDF, Word, Excel, or text)');
        }
        break;
    }
  }

  // Utility Methods
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileIcon(fileType: string): string {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.startsWith('video/')) return '🎥';
    if (fileType.startsWith('audio/')) return '🎵';
    if (fileType === 'application/pdf') return '📄';
    if (fileType.includes('word')) return '';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📽️';
    if (fileType.includes('zip') || fileType.includes('rar')) return '📦';
    return '📎';
  }

  getFileCategoryIcon(category: string): string {
    switch (category) {
      case 'course': return '';
      case 'assignment': return '';
      case 'profile': return '👤';
      case 'document': return '📄';
      case 'image': return '🖼️';
      case 'video': return '🎥';
      default: return '📎';
    }
  }

  // Mock Data Methods
  private loadMockFiles(): void {
    const mockFiles: UploadedFile[] = [
      {
        id: 'file_1',
        originalName: 'maritime-safety-guide.pdf',
        size: 2048576, // 2MB
        mimeType: 'application/pdf',
        url: 'https://storage.lms-maritime.com/files/file_1'
      },
      {
        id: 'file_2',
        originalName: 'ship-engineering-diagram.jpg',
        size: 1024768, // 1MB
        mimeType: 'image/jpeg',
        url: 'https://storage.lms-maritime.com/files/file_2'
      },
      {
        id: 'file_3',
        originalName: 'navigation-procedures.mp4',
        size: 52428800, // 50MB
        mimeType: 'video/mp4',
        url: 'https://storage.lms-maritime.com/files/file_3'
      }
    ];

    this._uploadedFiles.set(mockFiles);
  }

  private generateFileId(): string {
    return 'file_' + Math.random().toString(36).substr(2, 9);
  }

  private async simulateApiCall(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Clear upload progress after completion
  clearUploadProgress(fileId: string): void {
    this._uploadProgress.update(progressMap => {
      const newMap = new Map(progressMap);
      newMap.delete(fileId);
      return newMap;
    });
  }

  // Clear all upload progress
  clearAllUploadProgress(): void {
    this._uploadProgress.set(new Map());
  }
}