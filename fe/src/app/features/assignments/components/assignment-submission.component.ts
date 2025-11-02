import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FileUploadComponent } from '../../../shared/components/file-upload/file-upload.component';

interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  maxFileSize: number;
  maxFiles: number;
  allowedFileTypes: string[];
  instructions: string;
}

@Component({
  selector: 'app-assignment-submission',
  imports: [CommonModule, ReactiveFormsModule, FileUploadComponent],
  template: `
    <div class="max-w-4xl mx-auto p-6">
      <!-- Assignment Info -->
      <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h1 class="text-2xl font-bold text-gray-900 mb-4">{{ assignment()?.title }}</h1>
        <p class="text-gray-600 mb-4">{{ assignment()?.description }}</p>
        
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 class="font-semibold text-blue-900 mb-2">Yêu cầu nộp bài:</h3>
          <ul class="text-sm text-blue-800 space-y-1">
            <li>• Hạn nộp: {{ formatDate(assignment()?.dueDate!) }}</li>
            <li>• Kích thước tối đa: {{ formatFileSize(assignment()?.maxFileSize!) }}</li>
            <li>• Số file tối đa: {{ assignment()?.maxFiles }}</li>
            <li>• Định dạng cho phép: {{ assignment()?.allowedFileTypes?.join(', ') || 'N/A' }}</li>
          </ul>
        </div>
      </div>

      <!-- Submission Form -->
      <div class="bg-white rounded-xl shadow-lg p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-6">Nộp bài tập</h2>
        
        <form [formGroup]="submissionForm" (ngSubmit)="onSubmit()">
          <!-- File Upload -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Tải lên file bài làm
            </label>
            <app-file-upload>
            </app-file-upload>
          </div>

          <!-- Comments -->
          <div class="mb-6">
            <label for="comments" class="block text-sm font-medium text-gray-700 mb-2">
              Nhận xét (tùy chọn)
            </label>
            <textarea
              id="comments"
              formControlName="comments"
              rows="4"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nhập nhận xét hoặc ghi chú về bài làm của bạn...">
            </textarea>
          </div>

          <!-- Submit Button -->
          <div class="flex justify-end space-x-4">
            <button
              type="button"
              (click)="saveDraft()"
              class="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
              Lưu nháp
            </button>
            <button
              type="submit"
              [disabled]="submissionForm.invalid || isSubmitting()"
              class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
              @if (isSubmitting()) {
                <span class="flex items-center">
                  <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang nộp...
                </span>
              } @else {
                Nộp bài
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class AssignmentSubmissionComponent implements OnInit {
  private fb = inject(FormBuilder);

  assignment = signal<Assignment | null>(null);
  submissionForm!: FormGroup;
  isSubmitting = signal<boolean>(false);

  ngOnInit(): void {
    this.initializeForm();
    this.loadAssignment();
  }

  private initializeForm(): void {
    this.submissionForm = this.fb.group({
      comments: ['', [Validators.maxLength(1000)]]
    });
  }

  private loadAssignment(): void {
    // Mock assignment data
    const mockAssignment: Assignment = {
      id: '1',
      title: 'Bài tập Kỹ thuật Tàu biển',
      description: 'Thiết kế hệ thống động lực cho tàu container 5000 TEU',
      dueDate: new Date('2024-02-15'),
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      allowedFileTypes: ['pdf', 'doc', 'docx', 'jpg', 'png'],
      instructions: 'Vui lòng đọc kỹ yêu cầu và nộp bài đúng hạn'
    };
    
    this.assignment.set(mockAssignment);
  }

  onSubmit(): void {
    if (this.submissionForm.valid) {
      this.isSubmitting.set(true);
      
      // Mock submission
      setTimeout(() => {
        this.isSubmitting.set(false);
        console.log('Assignment submitted:', this.submissionForm.value);
        // Show success message
      }, 2000);
    }
  }

  saveDraft(): void {
    // Mock save draft
    console.log('Draft saved:', this.submissionForm.value);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('vi-VN');
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}