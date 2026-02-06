import { Component, input, output, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';

import { R2StorageApi } from '../../../api/client/r2-storage.api';

export interface VideoUploadResult {
  objectKey: string;
  publicUrl: string;
  fileName: string;
  fileSize: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-video-upload',
  imports: [],
  template: `
    <div class="video-upload-container">
      <!-- Upload Area -->
      @if (!videoUrl() && !isUploading()) {
        <div class="upload-zone"
             [class.drag-over]="isDragOver()"
             (click)="triggerFileInput()"
             (dragover)="onDragOver($event)"
             (dragleave)="onDragLeave($event)"
             (drop)="onDrop($event)">
          <div class="upload-content">
            <div class="icon-wrapper">
              <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
              </svg>
              <svg class="video-icon" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
              </svg>
            </div>
            <p class="upload-text">
              Kéo thả video vào đây hoặc
              <span class="upload-link">chọn file</span>
            </p>
            <p class="upload-hint">
              Hỗ trợ: MP4, AVI, MOV, MKV (Tối đa {{ maxFileSizeMB() }}MB)
            </p>
          </div>
          <input #fileInput
                 type="file"
                 class="hidden-input"
                 accept="video/mp4,video/avi,video/mov,video/x-matroska"
                 (change)="onFileSelected($event)">
        </div>
      }

      <!-- Upload Progress -->
      @if (isUploading()) {
        <div class="upload-progress">
          <div class="progress-header">
            <div class="progress-icon">
              <svg class="animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <div class="progress-info">
              <p class="progress-title">Đang upload video...</p>
              <p class="progress-filename">{{ uploadingFileName() }}</p>
            </div>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar" [style.width.%]="uploadProgress()"></div>
          </div>
          <p class="progress-text">{{ uploadProgress() }}%</p>
        </div>
      }

      <!-- Video Preview -->
      @if (videoUrl() && !isUploading()) {
        <div class="video-preview">
          <div class="video-wrapper">
            <video [src]="videoUrl()" controls class="video-player"></video>
          </div>
          <div class="video-info">
            <div class="info-row">
              <svg class="info-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"/>
              </svg>
              <span class="info-text">{{ videoFileName() }}</span>
            </div>
            @if (videoFileSize() > 0) {
              <div class="info-row">
                <svg class="info-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
                </svg>
                <span class="info-text">{{ formatFileSize(videoFileSize()) }}</span>
              </div>
            }
          </div>
          <div class="video-actions">
            <button type="button" class="btn btn-danger" (click)="removeVideo()">
              <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
              Xóa video
            </button>
            <button type="button" class="btn btn-secondary" (click)="triggerFileInput()">
              <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Thay đổi
            </button>
          </div>
        </div>
      }

      <!-- Error Message -->
      @if (errorMessage()) {
        <div class="error-message">
          <svg class="error-icon" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
          </svg>
          <span>{{ errorMessage() }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .video-upload-container {
      width: 100%;
    }

    .upload-zone {
      border: 2px dashed #d1d5db;
      border-radius: 0.5rem;
      padding: 3rem 2rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
      background-color: #f9fafb;
    }

    .upload-zone:hover, .upload-zone.drag-over {
      border-color: #3b82f6;
      background-color: #eff6ff;
    }

    .upload-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .icon-wrapper {
      position: relative;
      width: 4rem;
      height: 4rem;
    }

    .upload-icon {
      width: 4rem;
      height: 4rem;
      color: #9ca3af;
    }

    .video-icon {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 1.5rem;
      height: 1.5rem;
      color: #3b82f6;
      background: white;
      border-radius: 50%;
      padding: 0.125rem;
    }

    .upload-text {
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0;
    }

    .upload-link {
      color: #3b82f6;
      font-weight: 600;
      cursor: pointer;
    }

    .upload-link:hover {
      color: #2563eb;
    }

    .upload-hint {
      font-size: 0.75rem;
      color: #9ca3af;
      margin: 0;
    }

    .hidden-input {
      display: none;
    }

    .upload-progress {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      padding: 1.5rem;
    }

    .progress-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .progress-icon svg {
      width: 2rem;
      height: 2rem;
      color: #3b82f6;
    }

    .progress-info {
      flex: 1;
      text-align: left;
    }

    .progress-title {
      font-weight: 600;
      color: #111827;
      margin: 0 0 0.25rem 0;
    }

    .progress-filename {
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0;
    }

    .progress-bar-container {
      width: 100%;
      height: 0.5rem;
      background-color: #e5e7eb;
      border-radius: 9999px;
      overflow: hidden;
      margin-bottom: 0.5rem;
    }

    .progress-bar {
      height: 100%;
      background-color: #3b82f6;
      transition: width 0.3s ease;
    }

    .progress-text {
      text-align: right;
      font-size: 0.875rem;
      font-weight: 600;
      color: #3b82f6;
      margin: 0;
    }

    .video-preview {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      overflow: hidden;
    }

    .video-wrapper {
      position: relative;
      width: 100%;
      background: #000;
    }

    .video-player {
      width: 100%;
      max-height: 400px;
      display: block;
    }

    .video-info {
      padding: 1rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .info-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .info-row:last-child {
      margin-bottom: 0;
    }

    .info-icon {
      width: 1.25rem;
      height: 1.25rem;
      color: #6b7280;
    }

    .info-text {
      font-size: 0.875rem;
      color: #374151;
    }

    .video-actions {
      display: flex;
      gap: 0.75rem;
      padding: 1rem;
    }

    .btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.625rem 1rem;
      border: none;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-icon {
      width: 1.25rem;
      height: 1.25rem;
    }

    .btn-danger {
      background-color: #ef4444;
      color: white;
    }

    .btn-danger:hover {
      background-color: #dc2626;
    }

    .btn-secondary {
      background-color: #f3f4f6;
      color: #374151;
    }

    .btn-secondary:hover {
      background-color: #e5e7eb;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 0.5rem;
      color: #991b1b;
      margin-top: 1rem;
    }

    .error-icon {
      width: 1.5rem;
      height: 1.5rem;
      flex-shrink: 0;
    }

    .animate-spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class VideoUploadComponent {
  private r2StorageApi = inject(R2StorageApi);

  // Inputs
  maxFileSize = input<number>(500 * 1024 * 1024); // 500MB default
  initialVideoUrl = input<string>('');
  disabled = input<boolean>(false);

  // Outputs
  videoUploaded = output<VideoUploadResult>();
  videoRemoved = output<void>();

  // State
  videoUrl = signal<string>('');
  videoFileName = signal<string>('');
  videoFileSize = signal<number>(0);
  videoObjectKey = signal<string>('');
  isUploading = signal<boolean>(false);
  uploadProgress = signal<number>(0);
  uploadingFileName = signal<string>('');
  isDragOver = signal<boolean>(false);
  errorMessage = signal<string>('');

  // Computed
  maxFileSizeMB = computed(() => Math.round(this.maxFileSize() / (1024 * 1024)));

  constructor() {
    // Set initial video URL if provided
    if (this.initialVideoUrl()) {
      this.videoUrl.set(this.initialVideoUrl());
    }
  }

  triggerFileInput(): void {
    if (this.disabled()) return;
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fileInput?.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.handleFile(input.files[0]);
      input.value = ''; // Clear input
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.disabled()) {
      this.isDragOver.set(true);
    }
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    if (this.disabled()) return;

    const files = event.dataTransfer?.files;
    if (files && files[0]) {
      this.handleFile(files[0]);
    }
  }

  private handleFile(file: File): void {
    this.errorMessage.set('');

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/x-matroska', 'video/quicktime'];
    if (!allowedTypes.includes(file.type)) {
      this.errorMessage.set('Định dạng video không được hỗ trợ. Vui lòng chọn file MP4, AVI, MOV hoặc MKV.');
      return;
    }

    // Validate file size
    if (file.size > this.maxFileSize()) {
      this.errorMessage.set(`Kích thước video vượt quá giới hạn ${this.maxFileSizeMB()}MB.`);
      return;
    }

    // Start upload
    this.uploadVideo(file);
  }

  private uploadVideo(file: File): void {
    this.isUploading.set(true);
    this.uploadProgress.set(0);
    this.uploadingFileName.set(file.name);
    this.errorMessage.set('');

    this.r2StorageApi.uploadToR2WithProgress(
      file,
      (progress) => this.uploadProgress.set(progress),
      file.type
    ).subscribe({
      next: (result) => {
        this.isUploading.set(false);
        this.videoUrl.set(result.publicUrl);
        this.videoFileName.set(file.name);
        this.videoFileSize.set(file.size);
        this.videoObjectKey.set(result.objectKey);

        // Emit result
        this.videoUploaded.emit({
          objectKey: result.objectKey,
          publicUrl: result.publicUrl,
          fileName: file.name,
          fileSize: file.size
        });
      },
      error: (error) => {
        this.isUploading.set(false);
        this.errorMessage.set('Upload video thất bại. Vui lòng thử lại.');
      }
    });
  }

  removeVideo(): void {
    if (this.disabled()) return;

    const objectKey = this.videoObjectKey();
    if (objectKey) {
      // Delete from R2
      this.r2StorageApi.deleteObject(objectKey).subscribe({
        next: () => {
          this.resetVideo();
          this.videoRemoved.emit();
        },
        error: () => {
          // Reset anyway
          this.resetVideo();
          this.videoRemoved.emit();
        }
      });
    } else {
      this.resetVideo();
      this.videoRemoved.emit();
    }
  }

  private resetVideo(): void {
    this.videoUrl.set('');
    this.videoFileName.set('');
    this.videoFileSize.set(0);
    this.videoObjectKey.set('');
    this.uploadProgress.set(0);
    this.errorMessage.set('');
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
