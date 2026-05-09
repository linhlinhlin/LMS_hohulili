import { Component, ChangeDetectionStrategy, computed, inject, signal, OnInit, viewChild } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CreateAssignmentRequest } from '../../../api/client/assignment.api';
import { CourseApi } from '../../../api/client/course.api';
import { CourseSummary } from '../../../api/types/course.types';
import { FileUploadComponent, FileUploadConfig } from '../../../shared/components/file-upload/enhanced-file-upload.component';
import { UploadedFile } from '../../../shared/models/uploaded-file.model';
import { AssignmentStateService } from './services/assignment-state.service';
import { validateAssignmentCreation, validateMaxScore } from './utils/assignment-validators';
import { DistributionSelectorComponent, DistributionSettings } from '../assignment-hub/components/distribution-selector.component';
import { RubricApi, RubricDTO } from '../../../api/endpoints/rubric.api';

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
  imports: [ReactiveFormsModule, FormsModule, RouterModule, FileUploadComponent, DistributionSelectorComponent],
  template: `
    <div class="max-w-10xl mx-auto pb-20 p-8">
      
      <!-- Top Navigation & Header -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <nav class="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <a routerLink="/teacher/assessments/classes/assignments" class="hover:text-[#0056D2] transition-colors">Bài tập</a>
            <span>/</span>
            <span class="text-gray-900 font-medium">Tạo mới</span>
          </nav>
          <h1 class="text-2xl font-bold text-gray-900">Thiết lập bài tập mới</h1>
        </div>
        <a routerLink="/teacher/assessments/classes/assignments" 
           class="px-5 py-2.5 rounded-lg border border-gray-300 font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm">
          Hủy bỏ
        </a>
      </div>

      <div class="mb-6 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3">
        <p class="text-[10px] font-black uppercase tracking-[0.16em] text-[#0056D2]">Ngữ cảnh vận hành</p>
        <p class="mt-1 text-sm font-medium leading-6 text-slate-700">
          {{ operationalContextLabel() }} Nội dung gốc vẫn gắn với <span class="font-semibold text-slate-900">khóa học</span>; phần phân phối,
          hạn nộp, bài nộp và chấm điểm thuộc về không gian <span class="font-semibold text-slate-900">vận hành assessment</span>.
        </p>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <!-- LEFT COLUMN: Primary Fields (8 cols) -->
          <div class="lg:col-span-8 space-y-6">
            
            <!-- Section: Primary Info -->
            <div class="space-y-4">
              <h2 class="text-sm font-bold text-gray-900 uppercase tracking-tight">Thông tin chính bài tập</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                
                <!-- Title -->
                <div class="md:col-span-2 space-y-2">
                    <label class="block text-sm font-semibold text-gray-700">Tiêu đề bài tập <span class="text-red-500">*</span></label>
                    <input 
                      formControlName="title" 
                      type="text" 
                      class="w-full h-11 px-4 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2] outline-none transition-all placeholder:text-gray-400 text-sm" 
                      placeholder="VD: Phân tích An toàn Hàng hải - Chương III" />
                    @if (form.controls.title.invalid && form.controls.title.touched) {
                      <p class="text-xs text-red-500 mt-1 italic">Vui lòng nhập tiêu đề bài tập</p>
                    }
                </div>

                <!-- Course Selection -->
                <div class="space-y-2">
                    <label class="block text-sm font-semibold text-gray-700">Khóa học <span class="text-red-500">*</span></label>
                    <select 
                      formControlName="courseId" 
                      class="w-full h-11 px-4 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2] outline-none transition-all cursor-pointer text-sm">
                      <option value="" disabled>-- Chọn khóa học --</option>
                      @for (course of courses(); track course.id) {
                        <option [value]="course.id">{{ course.title }}</option>
                      }
                    </select>
                    @if (form.controls.courseId.invalid && form.controls.courseId.touched) {
                      <p class="text-xs text-red-500 mt-1 italic">Vui lòng chọn khóa học</p>
                    }
                </div>

                <!-- Points/Max Score -->
                <div class="space-y-2">
                    <label class="block text-sm font-semibold text-gray-700">Cách tính điểm <span class="text-red-500">*</span></label>
                    <div class="relative">
                      <input 
                        formControlName="maxScore" 
                        type="number" 
                        class="w-full h-11 px-4 pr-12 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2] outline-none transition-all text-sm" />
                      <span class="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 uppercase">Điểm</span>
                    </div>
                </div>
              </div>
            </div>

            <hr class="border-gray-100 my-2">

            <!-- Section: Requirements -->
            <div class="space-y-4">
              <h2 class="text-sm font-bold text-gray-900 uppercase tracking-tight">Nội dung & Yêu cầu</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <!-- Description -->
                <div class="md:col-span-2 space-y-2">
                    <label class="block text-sm font-semibold text-gray-700">Tóm tắt mô tả</label>
                    <textarea 
                      formControlName="description" 
                      rows="2" 
                      class="w-full p-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2] outline-none transition-all placeholder:text-gray-400 resize-none text-sm" 
                      placeholder="Giới thiệu nội dung bài tập..."></textarea>
                </div>

                <!-- Instructions -->
                <div class="md:col-span-2 space-y-2">
                    <label class="block text-sm font-semibold text-gray-700">Hướng dẫn chi tiết</label>
                    <textarea 
                      formControlName="instructions" 
                      rows="8" 
                      class="w-full p-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2] outline-none transition-all placeholder:text-gray-400 text-sm" 
                      placeholder="Quy trình thực hiện, yêu cầu kỹ thuật và cách thức nộp bài..."></textarea>
                </div>

                <!-- Attachments -->
                <div class="md:col-span-2 space-y-4">
                   <div>
                      <label class="block text-sm font-semibold text-gray-700">Tài liệu bổ trợ</label>
                      <p class="text-[11px] text-gray-500 mt-1 leading-relaxed">
                        Tải lên tài liệu hướng dẫn. Chấp nhận các định dạng: .pdf, .doc, .docx, .txt, .jpg, .png, .zip, .dwg, .dxf (Tối đa 50MB/file, tối đa 10 file)
                      </p>
                   </div>
                   <app-file-upload
                      [config]="fileUploadConfig()"
                      [existingFiles]="attachedFiles()"
                      (filesUploaded)="onFilesUploaded($event)"
                      (fileDeleted)="onFileDeleted($event)"
                      (uploadError)="onFileUploadError($event)">
                    </app-file-upload>
                </div>
              </div>
            </div>

            <hr class="border-gray-100 my-2">

            <!-- Section: Distribution -->
            <div class="space-y-4">
              <h2 class="text-sm font-bold text-gray-900 uppercase tracking-tight">Cấu hình phân phối</h2>
              
              @if (form.controls.courseId.value) {
                @if (loadingStudents()) {
                  <div class="p-10 bg-gray-50 border border-gray-200 rounded-lg flex flex-col items-center justify-center gap-3">
                    <div class="w-6 h-6 border-2 border-[#0056D2] border-t-transparent rounded-full animate-spin"></div>
                    <span class="text-xs font-medium text-gray-500">Đang tải danh sách học viên...</span>
                  </div>
                } @else {
                  <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <app-distribution-selector
                      #distributionSelector
                      [courseId]="form.controls.courseId.value"
                      [enrolledStudents]="enrolledStudents()"
                      [supportsClassDistribution]="supportsClassDistribution()"
                      [initialViewMode]="'manage'"
                      [initialDistributionType]="'ALL_STUDENTS'"
                      [initialStudentIds]="[]"
                      (distributionChange)="onDistributionChange($event)"
                    ></app-distribution-selector>
                  </div>
                }
              } @else {
                 <div class="p-12 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center text-center">
                    <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                      </svg>
                    </div>
                    <p class="text-sm font-medium text-gray-500 max-w-xs">
                      Chọn khóa học để tải danh sách lớp học và học viên
                    </p>
                 </div>
              }
            </div>
          </div>

          <!-- RIGHT COLUMN: Settings & Actions (4 cols) -->
          <div class="lg:col-span-4 space-y-6">
            
            <!-- Schedule Settings -->
            <div class="space-y-4">
              <h2 class="text-sm font-bold text-gray-900 uppercase tracking-tight">Thời gian thực hiện</h2>
              <div class="p-5 bg-gray-50 rounded-lg border border-gray-200 space-y-6">
                 
                 <!-- Due Date -->
                 <div class="space-y-2">
                    <label class="block text-xs font-bold text-gray-600 uppercase tracking-tight">Hạn chót nộp bài <span class="text-red-500">*</span></label>
                    <input 
                      formControlName="dueDate" 
                      type="datetime-local" 
                      class="w-full h-11 px-4 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2] outline-none transition-all text-sm" />
                    @if (form.controls.dueDate.invalid && form.controls.dueDate.touched) {
                      <p class="text-[10px] font-bold text-red-500 mt-1 uppercase">Vui lòng chọn hạn nộp</p>
                    }
                 </div>

                 <!-- Options -->
                 <div class="space-y-4 pt-2">
                    <label class="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" formControlName="allowLateSubmission" 
                             class="w-5 h-5 rounded border-gray-300 text-[#0056D2] focus:ring-[#0056D2]">
                      <span class="text-sm text-gray-700 font-medium group-hover:text-[#0056D2] transition-colors">Cho phép nộp muộn</span>
                    </label>
                    
                    <label class="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" formControlName="isDraft" 
                             class="w-5 h-5 rounded border-gray-300 text-[#0056D2] focus:ring-[#0056D2]">
                      <div class="flex flex-col">
                        <span class="text-sm text-gray-700 font-medium group-hover:text-[#0056D2] transition-colors">Lưu dưới dạng nháp</span>
                        <span class="text-[10px] text-gray-400 font-bold tracking-tight uppercase">Ẩn bài tập với học viên</span>
                      </div>
                    </label>
                 </div>
              </div>
            </div>

            <!-- Rubric Selection -->
            <div class="space-y-3">
              <h2 class="text-sm font-bold text-gray-900 uppercase tracking-tight">Tiêu chí đánh giá</h2>
              @if (loadingRubrics()) {
                <div class="p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center gap-2">
                  <div class="w-4 h-4 border-2 border-[#0056D2] border-t-transparent rounded-full animate-spin"></div>
                  <span class="text-xs text-gray-500">Đang tải...</span>
                </div>
              } @else {
                <div class="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                  <select [value]="selectedRubricId()" (change)="selectedRubricId.set($any($event.target).value)"
                          class="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2] outline-none transition-all">
                    <option value="">-- Không dùng tiêu chí --</option>
                    @for (r of availableRubrics(); track r.id) {
                      <option [value]="r.id">{{ r.title }} ({{ r.maxPoints }}đ)</option>
                    }
                  </select>
                  @if (availableRubrics().length === 0) {
                    <p class="text-xs text-gray-400">Chưa có tiêu chí nào. <a routerLink="/teacher/assessments/shared/rubrics" class="text-[#0056D2] hover:underline">Tạo tiêu chí</a></p>
                  }
                </div>
              }
            </div>

            <!-- Feedback Messages -->
            @if (error()) {
              <div class="p-4 bg-red-50 border border-red-100 rounded-lg text-red-700 text-xs font-semibold flex items-start gap-3">
                <svg class="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                <span>{{ error() }}</span>
              </div>
            }

            @if (success()) {
              <div class="p-4 bg-green-50 border border-green-100 rounded-lg text-green-700 text-xs font-semibold flex items-start gap-3">
                <svg class="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>
                <span>{{ success() }}</span>
              </div>
            }

            <!-- Primary Action -->
            <div class="pt-4">
              <button 
                type="submit" 
                [disabled]="form.invalid || submitting()"
                class="w-full h-12 rounded-lg bg-[#0056D2] text-white font-semibold hover:bg-[#004BB5] transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase text-xs tracking-wider">
                @if (submitting()) {
                  <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Đang xử lý...</span>
                } @else {
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                  <span>Hoàn tất & Lưu bài tập</span>
                }
              </button>
              <p class="mt-3 text-[11px] text-gray-400 text-center leading-relaxed">
                Hệ thống sẽ tự động gán bài tập cho học viên đã chọn sau khi lưu thành công.
              </p>
            </div>
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
  private rubricApi = inject(RubricApi);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly distributionSelector = viewChild<DistributionSelectorComponent>('distributionSelector');

  // State signals
  submitting = signal(false);
  success = signal('');
  error = signal('');
  courses = signal<CourseSummary[]>([]);
  loadingCourses = signal(false);
  attachedFiles = signal<UploadedFile[]>([]);
  selectedCourseId = signal('');
  selectedCourse = computed(() => {
    const courseId = this.selectedCourseId();
    return this.courses().find((course) => course.id === courseId) ?? null;
  });
  supportsClassDistribution = computed(() => this.selectedCourse()?.deliveryMode === 'INSTRUCTOR_LED');
  operationalContextLabel = computed(() => {
    const course = this.selectedCourse();

    if (!course) {
      return 'Chọn khóa học để xác định bài tập này sẽ được vận hành theo lớp hay trên toàn khóa học.';
    }

    if (course.deliveryMode === 'INSTRUCTOR_LED') {
      return 'Bài tập này sẽ được vận hành theo lớp học, nhóm học viên, hoặc toàn bộ học viên trong khóa học.';
    }

    return 'Bài tập này sẽ áp dụng cho toàn bộ học viên đã ghi danh trong khóa học, không chia theo lớp.';
  });

  // Rubric state
  availableRubrics = signal<RubricDTO[]>([]);
  selectedRubricId = signal('');
  loadingRubrics = signal(false);

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
    instructions: [''],
    isDraft: [false],
    allowLateSubmission: [false]
  });

  ngOnInit(): void {
    this.form.controls.courseId.valueChanges.subscribe((courseId: string | null) => {
      this.selectedCourseId.set(courseId ?? '');

      if (courseId) {
        this.loadEnrolledStudents(courseId);
      } else {
        this.enrolledStudents.set([]);
      }

      this.distributionSettings.set({
        distributionType: 'ALL_STUDENTS',
        studentIds: null,
        classId: null
      });
    });

    const preselectedCourseId = this.route.snapshot.queryParamMap.get('courseId');
    this.loadCourses(preselectedCourseId);
    this.selectedCourseId.set(this.form.controls.courseId.value ?? preselectedCourseId ?? '');
    this.loadRubrics();
  }

  private loadRubrics(): void {
    this.loadingRubrics.set(true);
    this.rubricApi.list().subscribe({
      next: (res: any) => this.availableRubrics.set(res?.data ?? res ?? []),
      error: () => {},
      complete: () => this.loadingRubrics.set(false)
    });
  }

  /**
   * Loads available courses for the teacher
   */
  private loadCourses(preselectedCourseId?: string | null): void {
    this.loadingCourses.set(true);

    this.courseApi.myCourses().subscribe({
      next: (response: { data?: CourseSummary[] }) => {
        if (response.data) {
          this.courses.set(response.data);

          if (
            preselectedCourseId &&
            !this.form.controls.courseId.value &&
            response.data.some(course => course.id === preselectedCourseId)
          ) {
            this.form.controls.courseId.setValue(preselectedCourseId);
          }
        }
      },
      error: (err: unknown) => {
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

    const settings = this.distributionSettings();

    // ENFORCE CLASS SELECTION: If distribution type is CLASS, classId MUST be provided
    if (settings.distributionType === 'CLASS' && !settings.classId) {
      this.error.set('VUI LÒNG CHỌN LỚP HỌC ĐỂ GIAO BÀI TẬP');
      // Scroll to selector for visibility
      this.distributionSelector()?.validate();
      return;
    }

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
      })),
      classId: settings.distributionType === 'CLASS' ? (settings.classId || undefined) : undefined,
      distributionType: settings.distributionType,
      studentIds: settings.distributionType === 'SPECIFIC_STUDENTS' ? (settings.studentIds || []) : undefined,
      status: formValue.isDraft ? 'DRAFT' : 'PUBLISHED',
      assignmentConfig: {
        allowLateSubmission: formValue.allowLateSubmission
      }
    };

    this.submitting.set(true); // Ensure submitting is set BEFORE the call

    // Use AssignmentStateService for creation
    this.assignmentState.createAssignment(formValue.courseId!, request).subscribe({
      next: (result: any) => {
        if (result) {
          const newId = result?.data?.id;
          const rubricId = this.selectedRubricId();
          const navigate = () => setTimeout(() => this.router.navigate(['/teacher/assessments/classes/assignments']), 1000);
          if (newId && rubricId) {
            this.rubricApi.assignToAssignment(rubricId, newId).subscribe({
              next: () => { this.success.set('Tạo bài tập thành công!'); navigate(); },
              error: () => { this.success.set('Bài tập đã tạo nhưng không thể gán tiêu chí'); navigate(); }
            });
          } else {
            this.success.set('Tạo bài tập thành công!');
            navigate();
          }
        } else {
          this.error.set(this.assignmentState.error() || 'Tạo bài tập thất bại');
        }
      },
      error: (err: unknown) => {
        this.error.set('Tạo bài tập thất bại');
      },
      complete: () => {
        this.submitting.set(false);
      }
    });
  }

  // File upload handlers

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
