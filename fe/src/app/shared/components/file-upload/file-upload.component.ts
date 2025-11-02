import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadedFile } from '../../models/uploaded-file.model';

@Component({
  selector: 'app-file-upload',
  imports: [CommonModule],
  template: `
    <div class="file-upload-container">
      <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
        <div class="space-y-4">
          <div class="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
          </div>

          <div>
            <p class="text-sm text-gray-600">
              Kéo thả file vào đây hoặc
              <button type="button"
                      class="text-blue-600 hover:text-blue-500 font-medium"
                      (click)="triggerFileInput()">
                chọn file
              </button>
            </p>
            @if (showRestrictions()) {
              <p class="text-xs text-gray-500 mt-2">
                Dung lượng tối đa: {{ formatFileSize(maxFileSize()) }}
                @if (category() === 'assignment') {
                  (PDF, DOC, DOCX, JPG, PNG)
                } @else if (category() === 'course') {
                  (PDF, MP4, ZIP)
                }
              </p>
            }
          </div>

          <input #fileInput
                 type="file"
                 class="hidden"
                 [multiple]="multiple()"
                 [accept]="getAcceptTypes()"
                 (change)="onFileSelected($event)">
        </div>
      </div>

      @if (uploadedFiles().length > 0) {
        <div class="mt-4 space-y-2">
          <h4 class="text-sm font-medium text-gray-900">Files đã tải lên:</h4>
          @for (file of uploadedFiles(); track file.id) {
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div class="flex items-center space-x-3">
                <svg class="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"/>
                </svg>
                <div>
                  <p class="text-sm font-medium text-gray-900">{{ file.originalName }}</p>
                  <p class="text-xs text-gray-500">{{ formatFileSize(file.size || 0) }}</p>
                </div>
              </div>
              <button type="button"
                      class="text-red-600 hover:text-red-500"
                      (click)="removeFile(file.id)">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .file-upload-container {
      width: 100%;
    }
  `]
})
export class FileUploadComponent {
  // Inputs
  category = input<string>('general');
  maxFileSize = input<number>(10 * 1024 * 1024); // 10MB default
  multiple = input<boolean>(false);
  showRestrictions = input<boolean>(true);

  // Outputs
  filesUploaded = output<UploadedFile[]>();
  fileRemoved = output<string>();

  // Internal state
  uploadedFiles = signal<UploadedFile[]>([]);

  triggerFileInput(): void {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fileInput?.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (!files) return;

  const uploadedFiles: UploadedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Check file size
      if (file.size > this.maxFileSize()) {
        console.warn(`File ${file.name} exceeds maximum size`);
        continue;
      }

      const uploadedFile: UploadedFile = {
        id: Date.now().toString() + '-' + i,
        originalName: file.name,
        size: file.size,
        mimeType: file.type,
        url: URL.createObjectURL(file)
      };

      uploadedFiles.push(uploadedFile);
    }

    // Add to uploaded files
    this.uploadedFiles.update(current => [...current, ...uploadedFiles]);

    // Emit event
    this.filesUploaded.emit(uploadedFiles);

    // Clear input
    input.value = '';
  }

  removeFile(fileId: string): void {
    this.uploadedFiles.update(current =>
      current.filter(file => file.id !== fileId)
    );
    this.fileRemoved.emit(fileId);
  }

  getAcceptTypes(): string {
    switch (this.category()) {
      case 'assignment':
        return '.pdf,.doc,.docx,.jpg,.jpeg,.png';
      case 'course':
        return '.pdf,.mp4,.zip,.rar';
      default:
        return '*';
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