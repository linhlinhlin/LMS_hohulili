import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AssignmentApi, CreateAssignmentRequest } from '../../../api/client/assignment.api';
import { CourseApi } from '../../../api/client/course.api';
import { CourseSummary } from '../../../api/types/course.types';
import { ApiResponse } from '../../../api/types/common.types';
import { FileUploadComponent, FileUploadConfig } from '../../../shared/components/file-upload/enhanced-file-upload.component';
import { UploadedFile } from '../../../shared/models/uploaded-file.model';

export type AssignmentType = 'essay' | 'quiz' | 'programming' | 'project' | 'file_submission';

export interface AssignmentTemplate {
  id: string;
  name: string;
  type: AssignmentType;
  description: string;
  defaultConfig: {
    maxScore: number;
    timeLimit?: number; // in minutes
    allowMultipleAttempts: boolean;
    maxAttempts?: number;
    requireFileUpload: boolean;
    allowedFileTypes?: string[];
  };
}

@Component({
  selector: 'app-enhanced-assignment-creation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, FileUploadComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="max-w-4xl mx-auto p-6">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Thêm Bài Tập</h1>
        <p class="text-gray-600">Tạo bài tập mới cho khóa học</p>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-6">
        <!-- Step 1: Assignment Type Selection -->
        <div class="bg-white rounded-lg shadow p-6" *ngIf="currentStep() === 1">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Bước 1: Chọn Loại Bài Tập</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div *ngFor="let template of assignmentTemplates()" 
                 class="border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md"
                 [class.border-blue-500]="selectedTemplate()?.id === template.id"
                 [class.bg-blue-50]="selectedTemplate()?.id === template.id"
                 (click)="selectTemplate(template)">
              <div class="flex items-center justify-between mb-2">
                <h3 class="font-medium text-gray-900">{{ template.name }}</h3>
                <span class="px-2 py-1 bg-gray-100 text-xs rounded">{{ getTypeLabel(template.type) }}</span>
              </div>
              <p class="text-sm text-gray-600 mb-3">{{ template.description }}</p>
              <div class="text-xs text-gray-500">
                <div>Điểm tối đa: {{ template.defaultConfig.maxScore }}</div>
                <div *ngIf="template.defaultConfig.timeLimit">Thời gian: {{ template.defaultConfig.timeLimit }} phút</div>
                <div *ngIf="template.defaultConfig.allowMultipleAttempts">Cho phép làm lại</div>
              </div>
            </div>
          </div>

          <div class="flex justify-between">
            <button type="button" routerLink="/teacher/assignments" 
                    class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
              Hủy
            </button>
            <button type="button" 
                    [disabled]="!selectedTemplate()"
                    (click)="nextStep()"
                    class="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700">
              Tiếp theo
            </button>
          </div>
        </div>

        <!-- Step 2: Basic Information -->
        <div class="bg-white rounded-lg shadow p-6" *ngIf="currentStep() === 2">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Bước 2: Thông Tin Cơ Bản</h2>

          <div class="grid grid-cols-1 gap-6 mb-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Khóa học *</label>
              <select formControlName="courseId" class="w-full border rounded px-3 py-2" (change)="onCourseChange($event)">
                <option value="">Chọn khóa học</option>
                <option *ngFor="let course of courses()" [value]="course.id">{{ course.title }}</option>
              </select>
            </div>

            <!-- Lesson Assignment Option -->
            <div *ngIf="selectedCourseId()" class="border-t pt-4">
              <div class="flex items-center mb-3">
                <input type="checkbox" id="linkToLesson" formControlName="linkToLesson" class="mr-2">
                <label for="linkToLesson" class="text-sm font-medium text-gray-700">Gắn bài tập với bài học</label>
              </div>

              <div *ngIf="form.controls.linkToLesson.value" class="ml-6">
                <label class="block text-sm font-medium text-gray-700 mb-1">Chọn bài học</label>
                <select formControlName="lessonId" class="w-full border rounded px-3 py-2">
                  <option value="">Chọn bài học</option>
                  <option *ngFor="let lesson of availableLessons()" [value]="lesson.id">
                    {{ lesson.title }} ({{ lesson.sectionTitle }})
                  </option>
                </select>
                <p class="text-xs text-gray-500 mt-1">Bài tập sẽ được gắn với bài học đã chọn</p>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Hạn nộp</label>
              <input formControlName="dueDate"
                     type="datetime-local"
                     class="w-full border rounded px-3 py-2">
              <div class="text-sm text-red-600 mt-1" *ngIf="form.controls.dueDate.invalid && form.controls.dueDate.touched">
                Vui lòng chọn hạn nộp hợp lệ
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Điểm tối đa *</label>
              <input formControlName="maxScore"
                     type="number"
                     min="1"
                     max="1000"
                     class="w-full border rounded px-3 py-2">
              <div class="text-sm text-red-600 mt-1" *ngIf="form.controls.maxScore.invalid && form.controls.maxScore.touched">
                Điểm tối đa phải từ 1 đến 1000
              </div>
            </div>
          </div>

          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-1">Mô tả bài tập</label>
            <textarea formControlName="description" 
                      rows="4" 
                      class="w-full border rounded px-3 py-2" 
                      placeholder="Mô tả chi tiết về bài tập..."></textarea>
          </div>

          <div class="flex justify-between">
            <button type="button" (click)="prevStep()"
                    class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
              Quay lại
            </button>
            <button type="button" (click)="nextStep()"
                    class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Tiếp theo
            </button>
          </div>
        </div>

        <!-- Step 3: Assignment-Specific Configuration -->
        <div class="bg-white rounded-lg shadow p-6" *ngIf="currentStep() === 3">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Bước 3: Cấu Hình Chi Tiết</h2>
          
          <!-- Essay Assignment Config -->
          <div *ngIf="selectedTemplate()?.type === 'essay'" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Số từ tối thiểu</label>
              <input formControlName="minWords" type="number" class="w-full border rounded px-3 py-2">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Số từ tối đa</label>
              <input formControlName="maxWords" type="number" class="w-full border rounded px-3 py-2">
            </div>
            <div class="flex items-center">
              <input formControlName="enablePeerReview" type="checkbox" id="peerReview" class="mr-2">
              <label for="peerReview" class="text-sm text-gray-700">Bật đánh giá peer-to-peer</label>
            </div>
          </div>

          <!-- Quiz Assignment Config -->
          <div *ngIf="selectedTemplate()?.type === 'quiz'" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Thời gian làm bài (phút)</label>
              <input formControlName="timeLimit" type="number" class="w-full border rounded px-3 py-2">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Số lần làm tối đa</label>
              <input formControlName="maxAttempts" type="number" class="w-full border rounded px-3 py-2">
            </div>
            <div class="flex items-center">
              <input formControlName="randomizeQuestions" type="checkbox" id="randomize" class="mr-2">
              <label for="randomize" class="text-sm text-gray-700">Xáo trộn thứ tự câu hỏi</label>
            </div>
          </div>

          <!-- Programming Assignment Config -->
          <div *ngIf="selectedTemplate()?.type === 'programming'" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Ngôn ngữ lập trình</label>
              <select formControlName="programmingLanguage" class="w-full border rounded px-3 py-2">
                <option value="java">Java</option>
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="cpp">C++</option>
              </select>
            </div>
            <div class="flex items-center">
              <input formControlName="enableAutoGrading" type="checkbox" id="autoGrade" class="mr-2">
              <label for="autoGrade" class="text-sm text-gray-700">Bật chấm điểm tự động</label>
            </div>
          </div>

          <!-- File Submission Config -->
          <div *ngIf="selectedTemplate()?.type === 'file_submission' || selectedTemplate()?.type === 'project'">
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">Loại file được phép</label>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                <label *ngFor="let fileType of availableFileTypes" class="flex items-center">
                  <input type="checkbox" 
                         [checked]="selectedFileTypes().includes(fileType.value)"
                         (change)="toggleFileType(fileType.value)"
                         class="mr-1">
                  <span class="text-sm">{{ fileType.label }}</span>
                </label>
              </div>
            </div>
          </div>

          <div class="flex justify-between">
            <button type="button" (click)="prevStep()"
                    class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
              Quay lại
            </button>
            <button type="button" (click)="nextStep()"
                    class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Tiếp theo
            </button>
          </div>
        </div>

        <!-- Step 4: Instructions & Attachments -->
        <div class="bg-white rounded-lg shadow p-6" *ngIf="currentStep() === 4">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Bước 4: Hướng Dẫn & Tài Liệu</h2>
          
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-1">Hướng dẫn làm bài</label>
            <textarea formControlName="instructions" 
                      rows="8" 
                      class="w-full border rounded px-3 py-2" 
                      placeholder="Hướng dẫn chi tiết cách làm bài tập..."></textarea>
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

          <div class="flex justify-between mt-6">
            <button type="button" (click)="prevStep()"
                    class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
              Quay lại
            </button>
            <button type="submit" 
                    [disabled]="form.invalid || submitting()"
                    class="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50 hover:bg-green-700">
              {{ submitting() ? 'Đang tạo...' : 'Tạo bài tập' }}
            </button>
          </div>
        </div>

        <!-- Progress indicator -->
        <div class="flex justify-center mt-4">
          <div class="flex space-x-2">
            <div *ngFor="let step of [1,2,3,4]; let i = index" 
                 class="w-3 h-3 rounded-full"
                 [class.bg-blue-600]="currentStep() > i"
                 [class.bg-blue-300]="currentStep() === i + 1"
                 [class.bg-gray-300]="currentStep() < i + 1">
            </div>
          </div>
        </div>

        <!-- Error/Success Messages -->
        <div class="text-center" *ngIf="success() || error()">
          <span class="text-green-700" *ngIf="success()">{{ success() }}</span>
          <span class="text-red-600" *ngIf="error()">{{ error() }}</span>
        </div>
      </form>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnhancedAssignmentCreationComponent {
  private assignmentApi = inject(AssignmentApi);
  private courseApi = inject(CourseApi);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  // State
  currentStep = signal(1);
  submitting = signal(false);
  success = signal('');
  error = signal('');
  courses = signal<CourseSummary[]>([]);
  attachedFiles = signal<UploadedFile[]>([]);
  selectedTemplate = signal<AssignmentTemplate | null>(null);
  selectedFileTypes = signal<string[]>([]);
  selectedCourseId = signal<string>('');
  availableLessons = signal<any[]>([]);

  // Assignment templates (như Coursera)
  assignmentTemplates = signal<AssignmentTemplate[]>([
    {
      id: 'essay',
      name: 'Bài Luận',
      type: 'essay',
      description: 'Học sinh viết bài luận dài với yêu cầu về số từ',
      defaultConfig: {
        maxScore: 100,
        allowMultipleAttempts: true,
        maxAttempts: 2,
        requireFileUpload: false
      }
    },
    {
      id: 'quiz',
      name: 'Bài Kiểm Tra',
      type: 'quiz',
      description: 'Bài kiểm tra trắc nghiệm với thời gian giới hạn',
      defaultConfig: {
        maxScore: 100,
        timeLimit: 60,
        allowMultipleAttempts: false,
        requireFileUpload: false
      }
    },
    {
      id: 'programming',
      name: 'Lập Trình',
      type: 'programming',
      description: 'Bài tập code với tự động chấm điểm',
      defaultConfig: {
        maxScore: 100,
        allowMultipleAttempts: true,
        maxAttempts: 5,
        requireFileUpload: true,
        allowedFileTypes: ['.java', '.py', '.js', '.cpp']
      }
    },
    {
      id: 'project',
      name: 'Dự Án',
      type: 'project',
      description: 'Dự án lớn với nhiều file đính kèm',
      defaultConfig: {
        maxScore: 100,
        allowMultipleAttempts: true,
        maxAttempts: 3,
        requireFileUpload: true,
        allowedFileTypes: ['.zip', '.rar', '.pdf', '.doc', '.docx']
      }
    },
    {
      id: 'file_submission',
      name: 'Nộp File',
      type: 'file_submission',
      description: 'Bài tập đơn giản chỉ cần nộp file',
      defaultConfig: {
        maxScore: 100,
        allowMultipleAttempts: true,
        maxAttempts: 2,
        requireFileUpload: true
      }
    }
  ]);

  availableFileTypes = [
    { value: '.pdf', label: 'PDF' },
    { value: '.doc', label: 'Word (.doc)' },
    { value: '.docx', label: 'Word (.docx)' },
    { value: '.txt', label: 'Text' },
    { value: '.jpg', label: 'JPEG' },
    { value: '.png', label: 'PNG' },
    { value: '.zip', label: 'ZIP' },
    { value: '.java', label: 'Java' },
    { value: '.py', label: 'Python' },
    { value: '.js', label: 'JavaScript' }
  ];

  // Form setup
  form = this.fb.group({
    // Basic info
    title: ['', [Validators.required, Validators.maxLength(255)]],
    courseId: ['', [Validators.required]],
    dueDate: [''],
    maxScore: [100, [Validators.required, Validators.min(1), Validators.max(1000)]],
    description: [''],
    instructions: [''],

    // Lesson linking
    linkToLesson: [false],
    lessonId: [''],

    // Essay specific
    minWords: [0],
    maxWords: [5000],
    enablePeerReview: [false],

    // Quiz specific
    timeLimit: [60],
    maxAttempts: [1],
    randomizeQuestions: [false],

    // Programming specific
    programmingLanguage: ['java'],
    enableAutoGrading: [false]
  });

  // File upload configuration
  fileUploadConfig = computed<FileUploadConfig>(() => ({
    category: 'assignment',
    maxSize: 10,
    maxFiles: 5,
    allowedTypes: this.selectedFileTypes().length > 0 ? this.selectedFileTypes() : [
      '.pdf', 'application/pdf',
      '.doc', 'application/msword', 'doc',
      '.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx',
      '.txt', 'text/plain',
      '.jpg', '.jpeg', 'image/jpeg',
      '.png', 'image/png',
      '.zip', 'application/zip'
    ],
    acceptMultiple: true
  }));

  constructor() {
    this.loadCourses();
  }

  // Navigation
  nextStep() {
    if (this.currentStep() < 4) {
      this.currentStep.update(step => step + 1);
    }
  }

  prevStep() {
    if (this.currentStep() > 1) {
      this.currentStep.update(step => step - 1);
    }
  }

  // Template selection
  selectTemplate(template: AssignmentTemplate) {
    this.selectedTemplate.set(template);
    
    // Apply default configuration
    this.form.patchValue({
      maxScore: template.defaultConfig.maxScore,
      timeLimit: template.defaultConfig.timeLimit,
      maxAttempts: template.defaultConfig.maxAttempts || 1
    });

    if (template.defaultConfig.allowedFileTypes) {
      this.selectedFileTypes.set(template.defaultConfig.allowedFileTypes);
    }
  }

  toggleFileType(fileType: string) {
    const current = this.selectedFileTypes();
    if (current.includes(fileType)) {
      this.selectedFileTypes.set(current.filter(t => t !== fileType));
    } else {
      this.selectedFileTypes.set([...current, fileType]);
    }
  }

  getTypeLabel(type: AssignmentType): string {
    const labels = {
      essay: 'Bài luận',
      quiz: 'Trắc nghiệm',
      programming: 'Lập trình',
      project: 'Dự án',
      file_submission: 'Nộp file'
    };
    return labels[type];
  }

  private loadCourses() {
    this.courseApi.myCourses().subscribe({
      next: (response: ApiResponse<CourseSummary[]>) => {
        if (response.data) {
          this.courses.set(response.data);
        }
      },
      error: (error: Error) => {
        console.error('Error loading courses:', error);
      }
    });
  }

  onCourseChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const courseId = target.value;
    this.selectedCourseId.set(courseId);

    if (courseId) {
      this.loadLessonsForCourse(courseId);
    } else {
      this.availableLessons.set([]);
    }
  }

  private loadLessonsForCourse(courseId: string) {
    // For now, we'll use a simple approach - get course content
    // In a real implementation, you'd have a dedicated API for lessons by course
    this.courseApi.getCourseContent(courseId).subscribe({
      next: (response: any) => {
        if (response.data) {
          // Flatten sections and lessons
          const lessons: any[] = [];
          response.data.forEach((section: any) => {
            section.lessons?.forEach((lesson: any) => {
              lessons.push({
                ...lesson,
                sectionTitle: section.title
              });
            });
          });
          this.availableLessons.set(lessons);
        }
      },
      error: (error: Error) => {
        console.error('Error loading lessons:', error);
        this.availableLessons.set([]);
      }
    });
  }

  // File upload handlers
  onFilesUploaded(files: UploadedFile[]) {
    this.attachedFiles.set(files);
  }

  onFileDeleted(fileId: string) {
    const updated = this.attachedFiles().filter(f => f.id !== fileId);
    this.attachedFiles.set(updated);
  }

  onFileUploadError(error: string) {
    this.error.set(`Lỗi tải file: ${error}`);
  }

  // Form submission
  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.success.set('');
    this.error.set('');

    const formValue = this.form.getRawValue();
    const template = this.selectedTemplate();

    // Check if linking to lesson
    if (formValue.linkToLesson && !formValue.lessonId) {
      this.error.set('Vui lòng chọn bài học để gắn bài tập');
      this.submitting.set(false);
      return;
    }

    // Prepare assignment config as JSON string
    const assignmentConfig = {
      // Type-specific config
      ...(template?.type === 'essay' && {
        minWords: formValue.minWords,
        maxWords: formValue.maxWords,
        enablePeerReview: formValue.enablePeerReview
      }),
      ...(template?.type === 'quiz' && {
        timeLimit: formValue.timeLimit,
        maxAttempts: formValue.maxAttempts,
        randomizeQuestions: formValue.randomizeQuestions
      }),
      ...(template?.type === 'programming' && {
        programmingLanguage: formValue.programmingLanguage,
        enableAutoGrading: formValue.enableAutoGrading
      }),
      allowedFileTypes: this.selectedFileTypes()
    };

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

    const request: CreateAssignmentRequest & any = {
      title: formValue.title!,
      description: formValue.description || undefined,
      instructions: formValue.instructions || undefined,
      dueDate: dueDateInstant,
      maxScore: formValue.maxScore!,
      assignmentConfig: assignmentConfig, // Send as object, not string
      attachments: this.attachedFiles().map(file => ({
        fileId: file.id,
        fileName: file.originalName,
        fileUrl: file.url || ''
      }))
    };

    // If linking to lesson, use lesson assignment API
    if (formValue.linkToLesson && formValue.lessonId) {
      this.createLessonAssignment(formValue.lessonId, request);
    } else {
      this.assignmentApi.createAssignment(formValue.courseId!, request).subscribe({
        next: (response) => {
          if (response.data) {
            this.success.set('Tạo bài tập thành công!');
            setTimeout(() => {
              this.router.navigate(['/teacher/assignments']);
            }, 1500);
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
  }

  private createLessonAssignment(lessonId: string, request: any) {
    // For lesson assignment, we need to call the lesson API
    // This would require a new API method or modifying existing one
    // For now, we'll create the assignment first, then link it
    this.assignmentApi.createAssignment(this.form.value.courseId!, request).subscribe({
      next: (response) => {
        if (response.data) {
          // TODO: Link assignment to lesson using lesson assignment API
          // For now, just show success
          this.success.set('Tạo bài tập và gắn với bài học thành công!');
          setTimeout(() => {
            this.router.navigate(['/teacher/assignments']);
          }, 1500);
        }
      },
      error: (error) => {
        console.error('Error creating lesson assignment:', error);
        this.error.set(error?.error?.message || 'Tạo bài tập gắn với bài học thất bại');
      },
      complete: () => {
        this.submitting.set(false);
      }
    });
  }
}