import { Component, ChangeDetectionStrategy, inject, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-video-upload',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="video-upload-container">
      @if (!uploadedUrl()) {
        <div class="drop-zone" [class.dragging]="isDragging()"
             (dragover)="onDragOver($event)"
             (dragleave)="onDragLeave($event)"
             (drop)="onDrop($event)"
             (click)="fileInput.click()">
          <input #fileInput type="file"
                 [accept]="acceptTypes()"
                 (change)="onFileSelected($event)"
                 style="display: none">
          <div class="drop-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <p class="drop-text">Keo va tha video vao day</p>
          <p class="drop-hint">hoac click de chon file</p>
          <p class="drop-formats">MP4, WebM - Toi da {{ maxSizeMb() }}MB</p>
        </div>
      } @else {
        <div class="preview-container">
          <video [src]="uploadedUrl()" controls class="video-preview"></video>
          <div class="preview-actions">
            <span class="file-name">{{ fileName() }}</span>
            <button class="remove-btn" (click)="removeVideo()">Xoa</button>
          </div>
        </div>
      }

      @if (isUploading()) {
        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="uploadProgress()"></div>
          </div>
          <span class="progress-text">{{ uploadProgress() }}%</span>
        </div>
      }

      @if (error()) {
        <div class="error-message">{{ error() }}</div>
      }
    </div>
  `,
  styles: [`
    .video-upload-container { width: 100%; }
    .drop-zone {
      border: 2px dashed #d1d5db; border-radius: 12px; padding: 40px 20px;
      text-align: center; cursor: pointer; transition: all 0.2s;
      background: #f9fafb;
      &:hover, &.dragging { border-color: #3b82f6; background: #eff6ff; }
    }
    .drop-icon { color: #9ca3af; margin-bottom: 12px; display: flex; justify-content: center; }
    .drop-text { font-weight: 600; color: #374151; margin: 0 0 4px; }
    .drop-hint { color: #9ca3af; font-size: 13px; margin: 0 0 8px; }
    .drop-formats { color: #6b7280; font-size: 12px; margin: 0; }
    .preview-container { border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
    .video-preview { width: 100%; max-height: 300px; display: block; }
    .preview-actions {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 12px; background: #f9fafb;
    }
    .file-name { font-size: 13px; color: #6b7280; overflow: hidden; text-overflow: ellipsis; }
    .remove-btn {
      background: #ef4444; color: white; border: none; border-radius: 6px;
      padding: 4px 12px; font-size: 12px; cursor: pointer;
      &:hover { background: #dc2626; }
    }
    .progress-container {
      display: flex; align-items: center; gap: 8px; margin-top: 8px;
    }
    .progress-bar {
      flex: 1; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden;
    }
    .progress-fill { height: 100%; background: #3b82f6; transition: width 0.3s; border-radius: 4px; }
    .progress-text { font-size: 12px; color: #6b7280; min-width: 36px; }
    .error-message { margin-top: 8px; color: #ef4444; font-size: 13px; }
  `]
})
export class VideoUploadComponent {
  private http = inject(HttpClient);

  acceptTypes = input<string>('video/mp4,video/webm');
  maxSizeMb = input<number>(500);

  uploaded = output<string>();

  isDragging = signal(false);
  isUploading = signal(false);
  uploadProgress = signal(0);
  uploadedUrl = signal<string | null>(null);
  fileName = signal('');
  error = signal('');

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.uploadFile(files[0]);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadFile(input.files[0]);
    }
  }

  removeVideo() {
    this.uploadedUrl.set(null);
    this.fileName.set('');
    this.uploaded.emit('');
  }

  private uploadFile(file: File) {
    this.error.set('');

    // Validate file type
    const validTypes = this.acceptTypes().split(',');
    if (!validTypes.some(t => file.type === t.trim())) {
      this.error.set('Định dạng không hợp lệ. Chỉ chấp nhận: ' + this.acceptTypes());
      return;
    }

    // Validate file size
    const maxBytes = this.maxSizeMb() * 1024 * 1024;
    if (file.size > maxBytes) {
      this.error.set(`File quá lớn. Tối đa ${this.maxSizeMb()}MB`);
      return;
    }

    this.isUploading.set(true);
    this.uploadProgress.set(0);
    this.fileName.set(file.name);

    const formData = new FormData();
    formData.append('file', file);

    this.http.post(`${environment.apiUrl}/files/upload`, formData, {
      reportProgress: true,
      observe: 'events'
    }).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadProgress.set(Math.round(100 * event.loaded / event.total));
        } else if (event.type === HttpEventType.Response) {
          const body = event.body as any;
          const url = body?.data?.url || body?.data?.fileUrl || '';
          this.uploadedUrl.set(url);
          this.isUploading.set(false);
          this.uploaded.emit(url);
        }
      },
      error: (err) => {
        this.error.set('Upload thất bại: ' + (err.error?.message || err.message));
        this.isUploading.set(false);
      }
    });
  }
}
