import { Component, ChangeDetectionStrategy, ViewEncapsulation, input, output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileUploadService, FileUploadOptions, UploadProgress } from '../../services/file-upload.service';
import { UploadedFile } from '../../models/uploaded-file.model';

export interface FileUploadConfig {
  category: 'course' | 'assignment' | 'profile' | 'document' | 'image' | 'video';
  maxSize?: number; // in MB
  maxFiles?: number;
  allowedTypes?: string[];
  acceptMultiple?: boolean;
}

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="file-upload-container">
      <!-- Drop Zone -->
      <div 
        class="border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200"
        [class.border-blue-300]="!isDragOver() && !hasError()"
        [class.bg-blue-50]="!isDragOver() && !hasError()"
        [class.border-blue-500]="isDragOver()"
        [class.bg-blue-100]="isDragOver()"
        [class.border-red-300]="hasError()"
        [class.bg-red-50]="hasError()"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
        (click)="fileInput.click()"
        style="cursor: pointer">
        
        <div class="flex flex-col items-center">
          <svg class="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          
          <div class="text-lg font-medium text-gray-700 mb-2">
            {{ isDragOver() ? 'Thả file ở đây' : 'Tải lên file' }}
          </div>
          
          <div class="text-sm text-gray-500 mb-4">
            Kéo thả hoặc nhấp để chọn file
          </div>
          
          <div class="text-xs text-gray-400" *ngIf="config().allowedTypes || config().maxSize">
            <div *ngIf="config().allowedTypes">
              Định dạng: {{ config().allowedTypes?.join(', ') }}
            </div>
            <div *ngIf="config().maxSize">
              Tối đa: {{ config().maxSize }}MB per file
            </div>
            <div *ngIf="config().maxFiles && config().maxFiles! > 1">
              Tối đa {{ config().maxFiles }} file
            </div>
          </div>
        </div>
        
        <input 
          #fileInput
          type="file"
          class="hidden"
          [accept]="acceptString()"
          [multiple]="config().acceptMultiple"
          (change)="onFileSelect($event)" />
      </div>

      <!-- Error Messages -->
      <div class="mt-3 text-sm text-red-600" *ngIf="errorMessage()">
        {{ errorMessage() }}
      </div>

      <!-- Upload Progress -->
      <div class="mt-4 space-y-2" *ngIf="uploadProgresses().length > 0">
        <h4 class="text-sm font-medium text-gray-700">Đang tải lên...</h4>
        <div *ngFor="let progress of uploadProgresses()" class="bg-white border rounded-lg p-3">
          <div class="flex items-center justify-between text-sm mb-2">
            <span class="font-medium text-gray-700 truncate">{{ progress.fileName }}</span>
            <span class="text-gray-500">{{ progress.progress }}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div 
              class="bg-blue-600 h-2 rounded-full transition-all duration-300"
              [style.width.%]="progress.progress"
              [class.bg-green-600]="progress.status === 'completed'"
              [class.bg-red-600]="progress.status === 'error'">
            </div>
          </div>
          <div class="text-xs text-red-600 mt-1" *ngIf="progress.error">
            {{ progress.error }}
          </div>
        </div>
      </div>

      <!-- Uploaded Files -->
      <div class="mt-4 space-y-2" *ngIf="uploadedFiles().length > 0">
        <h4 class="text-sm font-medium text-gray-700">File đã tải lên ({{ uploadedFiles().length }})</h4>
        <div *ngFor="let file of uploadedFiles(); trackBy: trackByFileId" 
             class="bg-white border rounded-lg p-3 flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="flex-shrink-0">
              <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-gray-900 truncate">{{ file.originalName }}</p>
              <p class="text-xs text-gray-500">{{ formatFileSize(file.size || 0) }} • {{ formatDate(file.uploadedAt) }}</p>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <a *ngIf="file.url" 
               [href]="file.url" 
               target="_blank"
               class="text-blue-600 hover:text-blue-800 text-sm">
              Xem
            </a>
            <button 
              (click)="removeFile(file.id)"
              class="text-red-600 hover:text-red-800 text-sm">
              Xóa
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FileUploadComponent {
  // Inputs
  config = input.required<FileUploadConfig>();
  existingFiles = input<UploadedFile[]>([]);

  // Outputs
  filesUploaded = output<UploadedFile[]>();
  fileDeleted = output<string>();
  uploadError = output<string>();

  // Injected services
  private fileUploadService = inject(FileUploadService);

  // State
  isDragOver = signal(false);
  errorMessage = signal('');
  uploadedFiles = signal<UploadedFile[]>([]);

  // Computed properties
  hasError = computed(() => !!this.errorMessage());
  acceptString = computed(() => this.config().allowedTypes?.join(',') || '*/*');
  uploadProgresses = computed(() => {
    const progressMap = this.fileUploadService.uploadProgress();
    return Array.from(progressMap.values());
  });

  constructor() {
    // Initialize with existing files
    this.uploadedFiles.set(this.existingFiles());
  }

  // Drag and drop handlers
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    
    const files = Array.from(event.dataTransfer?.files || []);
    this.handleFiles(files);
  }

  // File input handler
  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    this.handleFiles(files);
    
    // Reset input
    input.value = '';
  }

  // File processing
  private async handleFiles(files: File[]) {
    this.errorMessage.set('');

    // Validate files
    const validationError = this.validateFiles(files);
    if (validationError) {
      this.errorMessage.set(validationError);
      this.uploadError.emit(validationError);
      return;
    }

    try {
      const uploadOptions: FileUploadOptions = {
        category: this.config().category,
        maxSize: (this.config().maxSize || 10) * 1024 * 1024, // Convert MB to bytes
        allowedTypes: this.config().allowedTypes
      };

      const uploadedFiles = await this.fileUploadService.uploadMultipleFiles(
        files,
        uploadOptions,
        (_progress: UploadProgress) => {
          // Progress is handled by the service's reactive state
        }
      );

      // Add new files to existing list
      const currentFiles = this.uploadedFiles();
      const allFiles = [...currentFiles, ...uploadedFiles];
      this.uploadedFiles.set(allFiles);
      
      // Emit event
      this.filesUploaded.emit(allFiles);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Lỗi tải file';
      this.errorMessage.set(errorMsg);
      this.uploadError.emit(errorMsg);
    }
  }

  // File validation
  private validateFiles(files: File[]): string | null {
    const config = this.config();
    
    // Check file count
    const currentCount = this.uploadedFiles().length;
    const newCount = currentCount + files.length;
    if (config.maxFiles && newCount > config.maxFiles) {
      return `Chỉ được tải tối đa ${config.maxFiles} file. Hiện tại: ${currentCount}`;
    }

    // Check individual files
    for (const file of files) {
      // File size check
      if (config.maxSize && file.size > config.maxSize * 1024 * 1024) {
        return `File "${file.name}" vượt quá kích thước tối đa ${config.maxSize}MB`;
      }

      // File type check
      if (config.allowedTypes && config.allowedTypes.length > 0) {
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        const mimeType = file.type;
        
        const isAllowed = config.allowedTypes.some(type => {
          if (type.startsWith('.')) {
            // Extension-based check
            return type.substring(1) === fileExtension;
          } else {
            // MIME type check with support for MS Office formats
            return mimeType.includes(type) || 
                   this.isCompatibleMimeType(mimeType, type, fileExtension);
          }
        });
        
        if (!isAllowed) {
          return `File "${file.name}" không đúng định dạng. Chỉ chấp nhận: ${config.allowedTypes.join(', ')}`;
        }
      }
    }

    return null;
  }

  // File management
  async removeFile(fileId: string) {
    try {
      await this.fileUploadService.deleteFile(fileId);
      
      const updatedFiles = this.uploadedFiles().filter(f => f.id !== fileId);
      this.uploadedFiles.set(updatedFiles);
      
      this.fileDeleted.emit(fileId);
      this.filesUploaded.emit(updatedFiles);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Lỗi xóa file';
      this.errorMessage.set(errorMsg);
    }
  }

  // Utility functions
  trackByFileId(_index: number, file: UploadedFile): string {
    return file.id;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  }

  private isCompatibleMimeType(mimeType: string, allowedType: string, extension?: string): boolean {
    // Handle MS Office document MIME types
    const mimeTypeMappings: Record<string, string[]> = {
      'doc': ['application/msword', 'application/doc', 'application/vnd.ms-word'],
      'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      'pdf': ['application/pdf'],
      'txt': ['text/plain'],
      'jpg': ['image/jpeg'],
      'jpeg': ['image/jpeg'],
      'png': ['image/png'],
      'zip': ['application/zip', 'application/x-zip-compressed']
    };

    if (extension && mimeTypeMappings[extension]) {
      return mimeTypeMappings[extension].includes(mimeType);
    }

    // Fallback to partial match
    return mimeType.includes(allowedType);
  }
}