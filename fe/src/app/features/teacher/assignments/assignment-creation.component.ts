import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CreateAssignmentRequest } from '../../../api/client/assignment.api';
import { CourseApi } from '../../../api/client/course.api';
import { CourseSummary } from '../../../api/types/course.types';
import { FileUploadComponent, FileUploadConfig } from '../../../shared/components/file-upload/enhanced-file-upload.component';
import { UploadedFile } from '../../../shared/models/uploaded-file.model';
import { AssignmentStateService } from './services/assignment-state.service';
import { validateAssignmentCreation, validateMaxScore } from './utils/assignment-validators';
import { DistributionSelectorComponent, DistributionSettings } from '../assignment-hub/components/distribution-selector.component';
import { DistributionService } from '../../../core/services/distribution.service';

// Interface for enrolled student (matches EnrolledStudent from allocation-utils)
interface EnrolledStudentData {
  id: string;
  name: string;
  email: string;
  enrolledAt: string;
}

/**
 * Assignment Creation Component
 * 
 * Form for creating new assignments with validation and file upload.
 * Integrates with AssignmentStateService for state management.
 * 
 * @requirements 2.1, 2.2, 2.3, 2.4, 2.5
 */
@Component({
  selector: 'app-assignment-creation',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, FileUploadComponent, DistributionSelectorComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="max-w-3xl mx-auto p-6 space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Tạo bài tập mới</h1>
          <p class="text-sm text-gray-500 mt-1">Điền thông tin bài tập cho học viên</p>
        </div>
        <a routerLink="/teacher/assignments" 
           class="text-gray-600 hover:text-gray-900 flex items-center gap-1">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
          Quay lại
        </a>
      </div>

      <!-- Form -->
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="bg-white rounded-xl shadow-sm border">
        <!-- Basic Info Section -->
        <div class="p-6 space-y-5 border-b">
          <h2 class="text-lg font-semibold text-gray-900">Thông tin cơ bản</h2>
          
          <!-- Title -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Tiêu đề <span class="text-red-500">*</span>
            </label>
            <input 
              formControlName="title" 
              type="text" 
              class="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
              placeholder="VD: Bài tập An toàn Hàng hải - Chương 1" />
            @if (form.controls.title.invalid && form.controls.title.touched) {
              <p class="text-sm text-red-600 mt-1">
                @if (form.controls.title.errors?.['required']) {
                  Tiêu đề bài tập là bắt buộc
                } @else if (form.controls.title.errors?.['maxlength']) {
                  Tiêu đề không được vượt quá 255 ký tự
                }
              </p>
            }
          </div>

          <!-- Course Selection -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Khóa học <span class="text-red-500">*</span>
            </label>
            @if (loadingCourses()) {
              <div class="w-full border rounded-lg px-3 py-2 bg-gray-50 text-gray-500">
                Đang tải danh sách khóa học...
              </div>
            } @else {
              <select 
                formControlName="courseId" 
                class="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                <option value="" disabled>Chọn khóa học</option>
                @for (course of courses(); track course.id) {
                  <option [value]="course.id">{{ course.title }}</option>
                }
              </select>
            }
            @if (form.controls.courseId.invalid && form.controls.courseId.touched) {
              <p class="text-sm text-red-600 mt-1">Vui lòng chọn khóa học</p>
            }
          </div>

          <!-- Due Date & Max Score Row -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Hạn nộp <span class="text-red-500">*</span>
              </label>
              <input 
                formControlName="dueDate" 
                type="datetime-local" 
                class="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
              @if (form.controls.dueDate.invalid && form.controls.dueDate.touched) {
                <p class="text-sm text-red-600 mt-1">Vui lòng chọn hạn nộp</p>
              }
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Điểm tối đa <span class="text-red-500">*</span>
              </label>
              <input 
                formControlName="maxScore" 
                type="number" 
                min="1" 
                max="1000" 
                class="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
              @if (form.controls.maxScore.invalid && form.controls.maxScore.touched) {
                <p class="text-sm text-red-600 mt-1">
                  @if (form.controls.maxScore.errors?.['required']) {
                    Điểm tối đa là bắt buộc
                  } @else if (form.controls.maxScore.errors?.['min'] || form.controls.maxScore.errors?.['max']) {
                    Điểm tối đa phải từ 1 đến 1000
                  }
                </p>
              }
            </div>
          </div>
        </div>

        <!-- Content Section -->
        <div class="p-6 space-y-5 border-b">
          <h2 class="text-lg font-semibold text-gray-900">Nội dung bài tập</h2>
          
          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
            <textarea 
              formControlName="description" 
              rows="3" 
              class="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
              placeholder="Mô tả ngắn gọn về bài tập..."></textarea>
          </div>

          <!-- Instructions -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Hướng dẫn làm bài</label>
            <textarea 
              formControlName="instructions" 
              rows="6" 
              class="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
              placeholder="Hướng dẫn chi tiết cách làm bài tập, yêu cầu nộp bài..."></textarea>
          </div>
        </div>

        <!-- Attachments Section -->
        <div class="p-6 space-y-4 border-b">
          <h2 class="text-lg font-semibold text-gray-900">Tài liệu đính kèm</h2>
          <p class="text-sm text-gray-500">Đính kèm file tài liệu, bản đồ hàng hải, hoặc file mô phỏng cho học viên tham khảo.</p>
          <app-file-upload
            [config]="fileUploadConfig()"
            [existingFiles]="attachedFiles()"
            (filesUploaded)="onFilesUploaded($event)"
            (fileDeleted)="onFileDeleted($event)"
            (uploadError)="onFileUploadError($event)">
          </app-file-upload>
        </div>

        <!-- Distribution Section -->
        @if (form.controls.courseId.value && enrolledStudents().length > 0) {
          <div class="p-6 border-b">
            <app-distribution-selector
              #distributionSelector
              [enrolledStudents]="enrolledStudents"
              [initialDistributionType]="'ALL_STUDENTS'"
              [initialStudentIds]="[]"
              (distributionChange)="onDistributionChange($event)"
            ></app-distribution-selector>
          </div>
        } @else if (form.controls.courseId.value && loadingStudents()) {
          <div class="p-6 border-b">
            <div class="flex items-center gap-2 text-gray-500">
              <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Đang tải danh sách học viên...
            </div>
          </div>
        }

        <!-- Actions -->
        <div class="p-6 bg-gray-50 rounded-b-xl flex items-center justify-between">
          <a routerLink="/teacher/assignments" class="text-gray-600 hover:text-gray-900">
            Hủy
          </a>
          <div class="flex items-center gap-4">
            @if (success()) {
              <span class="text-green-600 flex items-center gap-1">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                {{ success() }}
              </span>
            }
            @if (error()) {
              <span class="text-red-600">{{ error() }}</span>
            }
            <button 
              type="submit" 
              [disabled]="form.invalid || submitting()" 
              class="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              @if (submitting()) {
                <span class="flex items-center gap-2">
                  <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang tạo...
                </span>
              } @else {
                Tạo bài tập
              }
            </button>
          </div>
        </div>
      </form>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignmentCreationComponent implements OnInit {
  private assignmentState = inject(AssignmentStateService);
  private courseApi = inject(CourseApi);
  private distributionService = inject(DistributionService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  @ViewChild('distributionSelector') distributionSelector?: DistributionSelectorComponent;

  // State signals
  submitting = signal(false);
  success = signal('');
  error = signal('');
  courses = signal<CourseSummary[]>([]);
  loadingCourses = signal(false);
  attachedFiles = signal<UploadedFile[]>([]);
  
  // Distribution state
  enrolledStudents = signal<EnrolledStudentData[]>([]);
  loadingStudents = signal(false);
  distributionSettings = signal<DistributionSettings>({
    distributionType: 'ALL_STUDENTS',
    studentIds: null
  });

  // File upload configuration - supports maritime files
  fileUploadConfig = signal<FileUploadConfig>({
    category: 'assignment',
    maxSize: 50, // 50MB for large maritime files
    maxFiles: 10,
    allowedTypes: [
      '.pdf', 'application/pdf',
      '.doc', 'application/msword',
      '.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt', 'text/plain',
      '.jpg', '.jpeg', 'image/jpeg',
      '.png', 'image/png',
      '.zip', 'application/zip',
      '.sim', // Simulation files
      '.dwg', '.dxf', // CAD files
    ],
    acceptMultiple: true
  });

  // Reactive form with validation
  form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    courseId: ['', [Validators.required]],
    dueDate: ['', [Validators.required]],
    maxScore: [100, [Validators.required, Validators.min(1), Validators.max(1000)]],
    description: [''],
    instructions: ['']
  });

  ngOnInit(): void {
    this.loadCourses();
    
    // Watch for course selection changes
    this.form.controls.courseId.valueChanges.subscribe(courseId => {
      if (courseId) {
        this.loadEnrolledStudents(courseId);
      } else {
        this.enrolledStudents.set([]);
      }
    });
  }

  /**
   * Loads available courses for the teacher
   */
  private loadCourses(): void {
    this.loadingCourses.set(true);
    
    this.courseApi.myCourses().subscribe({
      next: (response: { data?: CourseSummary[] }) => {
        if (response.data) {
          this.courses.set(response.data);
        }
      },
      error: (err: unknown) => {
        console.error('Error loading courses:', err);
        this.error.set('Không thể tải danh sách khóa học');
      },
      complete: () => {
        this.loadingCourses.set(false);
      }
    });
  }

  /**
   * Loads enrolled students for the selected course
   */
  private loadEnrolledStudents(courseId: string): void {
    this.loadingStudents.set(true);
    
    this.courseApi.getEnrolledStudents(courseId).subscribe({
      next: (response: { data?: any[] }) => {
        if (response.data) {
          const students: EnrolledStudentData[] = response.data.map(s => ({
            id: s.id,
            name: s.fullName || s.name || 'Unknown',
            email: s.email || '',
            enrolledAt: s.enrolledAt || new Date().toISOString()
          }));
          this.enrolledStudents.set(students);
        }
      },
      error: (err: unknown) => {
        console.error('Error loading enrolled students:', err);
        // Set empty array on error
        this.enrolledStudents.set([]);
      },
      complete: () => {
        this.loadingStudents.set(false);
      }
    });
  }

  /**
   * Handles distribution settings change
   */
  onDistributionChange(settings: DistributionSettings): void {
    this.distributionSettings.set(settings);
  }

  /**
   * Handles form submission
   */
  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // Clear previous messages
    this.success.set('');
    this.error.set('');

    const formValue = this.form.getRawValue();

    // Validate using utility functions
    const creationValidation = validateAssignmentCreation({
      title: formValue.title,
      courseId: formValue.courseId,
      dueDate: formValue.dueDate
    });

    if (!creationValidation.isValid) {
      this.error.set(creationValidation.errors[0]?.message || 'Dữ liệu không hợp lệ');
      return;
    }

    const maxScoreValidation = validateMaxScore(formValue.maxScore);
    if (!maxScoreValidation.isValid) {
      this.error.set(maxScoreValidation.errors[0]?.message || 'Điểm tối đa không hợp lệ');
      return;
    }

    // Convert dueDate to ISO string
    let dueDateInstant: string | undefined;
    if (formValue.dueDate) {
      try {
        const date = new Date(formValue.dueDate);
        dueDateInstant = date.toISOString();
      } catch {
        this.error.set('Định dạng ngày hạn nộp không hợp lệ');
        return;
      }
    }

    this.submitting.set(true);

    const request: CreateAssignmentRequest = {
      title: formValue.title!,
      description: formValue.description || undefined,
      instructions: formValue.instructions || undefined,
      dueDate: dueDateInstant,
      maxScore: formValue.maxScore || 100,
      attachments: this.attachedFiles().map((file: UploadedFile) => ({
        fileId: file.id,
        fileName: file.originalName,
        fileUrl: file.url || ''
      }))
    };

    // Use AssignmentStateService for creation
    this.assignmentState.createAssignment(formValue.courseId!, request).subscribe({
      next: (result: any) => {
        if (result) {
          // Save distribution settings if assignment created successfully
          const assignmentId = result.id || result.data?.id;
          if (assignmentId) {
            this.saveDistributionSettings(assignmentId, formValue.courseId!);
          }
          
          this.success.set('Tạo bài tập thành công!');
          // Navigate after short delay to show success message
          setTimeout(() => {
            this.router.navigate(['/teacher/assignments']);
          }, 1000);
        } else {
          this.error.set(this.assignmentState.error() || 'Tạo bài tập thất bại');
        }
      },
      error: (err: unknown) => {
        console.error('Error creating assignment:', err);
        this.error.set('Tạo bài tập thất bại');
      },
      complete: () => {
        this.submitting.set(false);
      }
    });
  }

  /**
   * Saves distribution settings after assignment creation
   */
  private saveDistributionSettings(assignmentId: string, courseId: string): void {
    const settings = this.distributionSettings();
    
    this.distributionService.createAllocation(
      assignmentId,
      courseId,
      settings.distributionType,
      settings.studentIds,
      'current-teacher' // TODO: Get from auth service
    ).subscribe({
      next: () => {
        console.log('Distribution settings saved successfully');
      },
      error: (err) => {
        console.error('Error saving distribution settings:', err);
        // Don't show error to user since assignment was created successfully
      }
    });
  }

  // File upload handlers
  onFilesUploaded(files: UploadedFile[]): void {
    this.attachedFiles.set(files);
  }

  onFileDeleted(fileId: string): void {
    const updated = this.attachedFiles().filter((f: UploadedFile) => f.id !== fileId);
    this.attachedFiles.set(updated);
  }

  onFileUploadError(errorMsg: string): void {
    this.error.set(`Lỗi tải file: ${errorMsg}`);
  }
}
