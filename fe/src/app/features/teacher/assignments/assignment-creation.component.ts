import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AssignmentApi, CreateAssignmentRequest } from '../../../api/client/assignment.api';
import { CourseApi } from '../../../api/client/course.api';
import { CourseSummary } from '../../../api/types/course.types';
import { FileUploadComponent, FileUploadConfig } from '../../../shared/components/file-upload/enhanced-file-upload.component';
import { UploadedFile } from '../../../shared/models/uploaded-file.model';

@Component({
  selector: 'app-assignment-creation',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, FileUploadComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="max-w-3xl mx-auto p-6 space-y-6">
      <h1 class="text-2xl font-bold text-gray-900">Tạo bài tập mới</h1>
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Tiêu đề</label>
          <input formControlName="title" type="text" class="w-full border rounded px-3 py-2" placeholder="VD: Safety Quiz" />
          <div class="text-sm text-red-600 mt-1" *ngIf="form.controls.title.invalid && form.controls.title.touched">
            Tiêu đề bắt buộc (tối đa 255 ký tự)
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Khóa học</label>
          <select formControlName="courseId" class="w-full border rounded px-3 py-2">
            <option value="" disabled>Chọn khóa học</option>
            <option *ngFor="let c of courses()" [value]="c.id">{{ c.title }}</option>
          </select>
          <div class="text-sm text-red-600 mt-1" *ngIf="form.controls.courseId.invalid && form.controls.courseId.touched">
            Vui lòng chọn khóa học
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Hạn nộp</label>
          <input formControlName="dueDate" type="datetime-local" class="w-full border rounded px-3 py-2" />
          <div class="text-sm text-red-600 mt-1" *ngIf="form.controls.dueDate.invalid && form.controls.dueDate.touched">
            Vui lòng chọn hạn nộp
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Điểm tối đa</label>
          <input formControlName="maxScore" type="number" min="1" max="1000" class="w-full border rounded px-3 py-2" />
          <div class="text-sm text-red-600 mt-1" *ngIf="form.controls.maxScore.invalid && form.controls.maxScore.touched">
            Điểm tối đa phải từ 1 đến 1000
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
          <textarea formControlName="description" rows="4" class="w-full border rounded px-3 py-2" placeholder="Mô tả bài tập..."></textarea>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Hướng dẫn làm bài</label>
          <textarea formControlName="instructions" rows="6" class="w-full border rounded px-3 py-2" placeholder="Hướng dẫn chi tiết cách làm bài tập..."></textarea>
        </div>

        <!-- File Upload Section -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Tài liệu đính kèm</label>
          <app-file-upload
            [config]="fileUploadConfig()"
            [existingFiles]="attachedFiles()"
            (filesUploaded)="onFilesUploaded($event)"
            (fileDeleted)="onFileDeleted($event)"
            (uploadError)="onFileUploadError($event)">
          </app-file-upload>
        </div>

        <div class="flex items-center gap-3">
          <button type="submit" [disabled]="form.invalid || submitting()" class="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
            {{ submitting() ? 'Đang tạo...' : 'Tạo bài tập' }}
          </button>
          <a routerLink="/teacher/assignments" class="text-sm text-gray-600 underline">Quay lại danh sách</a>
          <span class="text-green-700" *ngIf="success()">{{ success() }}</span>
          <span class="text-red-600" *ngIf="error()">{{ error() }}</span>
        </div>
      </form>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignmentCreationComponent {
  private assignmentApi = inject(AssignmentApi);
  private courseApi = inject(CourseApi);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  submitting = signal(false);
  success = signal('');
  error = signal('');
  courses = signal<CourseSummary[]>([]);
  attachedFiles = signal<UploadedFile[]>([]);

  // File upload configuration
  fileUploadConfig = signal<FileUploadConfig>({
    category: 'assignment',
    maxSize: 10, // 10MB
    maxFiles: 5,
    allowedTypes: [
      '.pdf', 'application/pdf',
      '.doc', 'application/msword', 'doc',
      '.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx',
      '.txt', 'text/plain',
      '.jpg', '.jpeg', 'image/jpeg',
      '.png', 'image/png',
      '.zip', 'application/zip'
    ],
    acceptMultiple: true
  });

  form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    courseId: ['', [Validators.required]],
    dueDate: ['', [Validators.required]],
    maxScore: [100, [Validators.required, Validators.min(1), Validators.max(1000)]],
    description: [''],
    instructions: ['']
  });

  constructor() {
    // Load teacher's courses
    this.loadCourses();
  }

  private loadCourses() {
    this.courseApi.myCourses().subscribe({
      next: (response) => {
        if (response.data) {
          this.courses.set(response.data);
        }
      },
      error: (error) => {
        console.error('Error loading courses:', error);
        this.error.set('Không thể tải danh sách khóa học');
      }
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.success.set('');
    this.error.set('');

    const formValue = this.form.getRawValue();

    // Convert dueDate string to Instant (ISO string)
    let dueDateInstant: string | undefined;
    if (formValue.dueDate) {
      try {
        const date = new Date(formValue.dueDate);
        dueDateInstant = date.toISOString();
      } catch (error) {
        console.error('Invalid due date format:', formValue.dueDate);
        this.error.set('Định dạng ngày hạn nộp không hợp lệ');
        this.submitting.set(false);
        return;
      }
    }

    const request: CreateAssignmentRequest = {
      title: formValue.title!,
      description: formValue.description || undefined,
      instructions: formValue.instructions || undefined,
      dueDate: dueDateInstant,
      maxScore: formValue.maxScore || 100,
      // Include attached files
      attachments: this.attachedFiles().map(file => ({
        fileId: file.id,
        fileName: file.originalName,
        fileUrl: file.url || ''
      }))
    };

    this.assignmentApi.createAssignment(formValue.courseId!, request).subscribe({
      next: (response) => {
        if (response.data) {
          this.success.set('Tạo bài tập thành công!');
          // Navigate to assignment editor or list
          this.router.navigate(['/teacher/assignments']);
        }
      },
      error: (error) => {
        console.error('Error creating assignment:', error);
        this.error.set(error?.error?.message || 'Tạo bài tập thất bại');
      },
      complete: () => {
        this.submitting.set(false);
      }
    });
  }

  // File upload handlers
  onFilesUploaded(files: UploadedFile[]) {
    this.attachedFiles.set(files);
    console.log('Files uploaded:', files.length);
  }

  onFileDeleted(fileId: string) {
    const updated = this.attachedFiles().filter(f => f.id !== fileId);
    this.attachedFiles.set(updated);
    console.log('File deleted:', fileId);
  }

  onFileUploadError(error: string) {
    this.error.set(`Lỗi tải file: ${error}`);
    console.error('File upload error:', error);
  }
}