import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-knowledge-upload',
  imports: [FormsModule],
  template: `
    <div class="upload-container">
      <h3 class="upload-title">Tải lên tài liệu mới</h3>
      
      <div class="upload-form">
        <!-- Category Selection -->
        <div class="form-group">
          <label for="category">Danh mục</label>
          <select 
            id="category" 
            [(ngModel)]="selectedCategory" 
            class="form-control"
            [disabled]="isUploading()"
          >
            <option value="" disabled selected>Chọn danh mục...</option>
            <option value="COLREGs">COLREGs</option>
            <option value="SOLAS">SOLAS</option>
            <option value="MARPOL">MARPOL</option>
            <option value="STCW">STCW</option>
            <option value="Maritime Law">Luật Hàng Hải</option>
            <option value="Other">Khác</option>
          </select>
        </div>

        <!-- Drop Zone -->
        <div 
          class="drop-zone" 
          [class.drag-over]="isDragOver"
          (dragover)="onDragOver($event)"
          (dragleave)="onDragLeave($event)"
          (drop)="onDrop($event)"
          (click)="fileInput.click()"
        >
          <input 
            #fileInput 
            type="file" 
            accept=".pdf" 
            (change)="onFileSelected($event)" 
            hidden
          >
          
          @if (!selectedFile) {
            <div class="drop-content">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="upload-icon">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p class="drop-text">Kéo thả file PDF vào đây hoặc <span>nhấn để chọn</span></p>
              <p class="drop-hint">Chỉ hỗ trợ file PDF (Tối đa 50MB)</p>
            </div>
          }

          @if (selectedFile) {
            <div class="file-preview">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="file-icon">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <div class="file-info">
                <div class="file-name">{{ selectedFile.name }}</div>
                <div class="file-size">{{ formatFileSize(selectedFile.size) }}</div>
              </div>
              <button 
                class="remove-file-btn" 
                (click)="removeFile($event)"
                [disabled]="isUploading()"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          }
        </div>

        <!-- Upload Button -->
        <button 
          class="upload-btn" 
          [disabled]="!selectedFile || !selectedCategory || isUploading()"
          (click)="onUpload()"
        >
          @if (!isUploading()) {
            <span>Tải lên</span>
          }
          @if (isUploading()) {
            <span class="loading-text">
              <svg class="spinner" viewBox="0 0 50 50">
                <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
              </svg>
              Đang tải lên...
            </span>
          }
        </button>
      </div>
    </div>
  `,
  styles: [`
    .upload-container {
      background: white;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .upload-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: #111827;
      margin: 0 0 20px 0;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      font-size: 0.9rem;
      font-weight: 500;
      color: #374151;
      margin-bottom: 6px;
    }

    .form-control {
      width: 100%;
      padding: 10px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.2s;
    }

    .form-control:focus {
      border-color: #3b82f6;
    }

    .drop-zone {
      border: 2px dashed #d1d5db;
      border-radius: 8px;
      padding: 30px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      background-color: #f9fafb;
      margin-bottom: 20px;
    }

    .drop-zone:hover, .drop-zone.drag-over {
      border-color: #3b82f6;
      background-color: #eff6ff;
    }

    .upload-icon {
      width: 48px;
      height: 48px;
      color: #9ca3af;
      margin-bottom: 12px;
    }

    .drop-text {
      font-size: 1rem;
      color: #4b5563;
      margin-bottom: 4px;
    }

    .drop-text span {
      color: #3b82f6;
      font-weight: 500;
    }

    .drop-hint {
      font-size: 0.85rem;
      color: #9ca3af;
    }

    .file-preview {
      display: flex;
      align-items: center;
      gap: 12px;
      background: white;
      padding: 12px;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
      text-align: left;
    }

    .file-icon {
      width: 32px;
      height: 32px;
      color: #ef4444;
    }

    .file-info {
      flex: 1;
    }

    .file-name {
      font-weight: 500;
      color: #111827;
      font-size: 0.95rem;
    }

    .file-size {
      font-size: 0.8rem;
      color: #6b7280;
    }

    .remove-file-btn {
      background: none;
      border: none;
      color: #9ca3af;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
    }

    .remove-file-btn:hover {
      background-color: #f3f4f6;
      color: #ef4444;
    }

    .remove-file-btn svg {
      width: 20px;
      height: 20px;
    }

    .upload-btn {
      width: 100%;
      padding: 12px;
      background-color: #0a192f; /* Maritime Blue */
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .upload-btn:hover:not(:disabled) {
      background-color: #112240;
    }

    .upload-btn:disabled {
      background-color: #9ca3af;
      cursor: not-allowed;
    }

    .loading-text {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .spinner {
      animation: rotate 2s linear infinite;
      width: 20px;
      height: 20px;
    }

    .path {
      stroke: #ffffff;
      stroke-linecap: round;
      animation: dash 1.5s ease-in-out infinite;
    }

    @keyframes rotate {
      100% { transform: rotate(360deg); }
    }

    @keyframes dash {
      0% { stroke-dasharray: 1, 150; stroke-dashoffset: 0; }
      50% { stroke-dasharray: 90, 150; stroke-dashoffset: -35; }
      100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; }
    }
  `]
})
export class KnowledgeUploadComponent {
  isUploading = input(false);
  upload = output<{ file: File, category: string }>();

  selectedCategory = '';
  selectedFile: File | null = null;
  isDragOver = false;

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  handleFile(file: File) {
    if (file.type !== 'application/pdf') {
      alert('Chỉ hỗ trợ file PDF');
      return;
    }
    if (file.size > 50 * 1024 * 1024) { // 50MB
      alert('File quá lớn (Tối đa 50MB)');
      return;
    }
    this.selectedFile = file;
  }

  removeFile(event: Event) {
    event.stopPropagation();
    this.selectedFile = null;
  }

  onUpload() {
    if (this.selectedFile && this.selectedCategory) {
      this.upload.emit({
        file: this.selectedFile,
        category: this.selectedCategory
      });
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
