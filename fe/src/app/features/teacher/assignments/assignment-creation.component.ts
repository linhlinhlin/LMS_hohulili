import { Component, ChangeDetectionStrategy, inject, signal, OnInit, viewChild } from '@angular/core';

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
import { LucideAngularModule } from 'lucide-angular';

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
  imports: [ReactiveFormsModule, FormsModule, RouterModule, FileUploadComponent, DistributionSelectorComponent, LucideAngularModule],
  template: `
    <div class="max-w-[1400px] mx-auto pb-20 p-4 sm:p-8 animate-in fade-in duration-500">
      
      <!-- Top Navigation & Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
        <div>
          <nav class="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
            <a routerLink="/teacher/assignments" class="hover:text-[#0056D2] transition-colors">Bài tập</a>
            <lucide-icon name="chevron-right" [size]="10"></lucide-icon>
            <span class="text-slate-900">Thiết lập mới</span>
          </nav>
          <h1 class="text-3xl font-black text-slate-900 tracking-tight">Tạo bài tập tự luận mới</h1>
          <p class="text-sm text-slate-500 font-medium mt-1.5 flex items-center gap-2">
            <lucide-icon name="info" [size]="14" class="text-blue-500"></lucide-icon>
            Điền thông tin và cấu hình phân phối cho bài tập
          </p>
        </div>
        <div class="flex items-center gap-3">
          <a routerLink="/teacher/assignments" 
             class="h-11 px-6 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">
            <lucide-icon name="x" [size]="14" class="mr-2"></lucide-icon>
            Hủy bỏ
          </a>
        </div>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-0">
          
          <!-- LEFT COLUMN: Primary Fields (8 cols) -->
          <div class="lg:col-span-8 p-6 sm:p-10 space-y-10 border-r border-slate-100">
            
            <!-- Section: Primary Info -->
            <div class="space-y-8">
              <div class="flex items-center gap-3">
                <div class="w-1.5 h-6 bg-[#0056D2] rounded-full"></div>
                <h2 class="text-sm font-black text-slate-800 uppercase tracking-widest">Thông tin chính bài tập</h2>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                <!-- Title -->
                <div class="md:col-span-2 group/field">
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within/field:text-[#0056D2] transition-colors">
                      Tiêu đề bài tập <span class="text-rose-500">*</span>
                    </label>
                    <input 
                      formControlName="title" 
                      type="text" 
                      class="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:bg-white focus:ring-4 focus:ring-[#0056D2]/5 focus:border-[#0056D2] outline-none transition-all shadow-inner placeholder:text-slate-300" 
                      placeholder="VD: Phân tích An toàn Hàng hải - Chương III" />
                    @if (form.controls.title.invalid && form.controls.title.touched) {
                      <p class="text-[10px] font-black text-rose-600 uppercase tracking-wider mt-2 flex items-center gap-1">
                        <lucide-icon name="alert-circle" [size]="12"></lucide-icon>
                        Tiêu đề bài tập là bắt buộc
                      </p>
                    }
                </div>

                <!-- Course Selection -->
                <div class="group/field">
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within/field:text-[#0056D2] transition-colors">Khóa học áp dụng <span class="text-rose-500">*</span></label>
                    <div class="relative">
                      <select 
                        formControlName="courseId" 
                        class="w-full h-12 appearance-none pl-4 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-800 focus:bg-white focus:ring-4 focus:ring-[#0056D2]/5 focus:border-[#0056D2] outline-none transition-all cursor-pointer shadow-sm">
                        <option value="" disabled>-- Chọn khóa học --</option>
                        @for (course of courses(); track course.id) {
                          <option [value]="course.id">{{ course.title }}</option>
                        }
                      </select>
                      <lucide-icon name="chevron-down" [size]="14" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></lucide-icon>
                    </div>
                    @if (form.controls.courseId.invalid && form.controls.courseId.touched) {
                      <p class="text-[10px] font-black text-rose-600 uppercase tracking-wider mt-2">Vui lòng chọn khóa học</p>
                    }
                </div>

                <!-- Points/Max Score -->
                <div class="group/field">
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within/field:text-[#0056D2] transition-colors">Thang điểm tối đa <span class="text-rose-500">*</span></label>
                    <div class="relative">
                      <input 
                        formControlName="maxScore" 
                        type="number" 
                        class="w-full h-12 pl-4 pr-16 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:bg-white focus:ring-4 focus:ring-[#0056D2]/5 focus:border-[#0056D2] outline-none transition-all shadow-inner" />
                      <span class="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 uppercase tracking-widest">Điểm</span>
                    </div>
                </div>
              </div>
            </div>

            <!-- Section: Requirements -->
            <div class="space-y-8">
              <div class="flex items-center gap-3">
                <div class="w-1.5 h-6 bg-slate-300 rounded-full"></div>
                <h2 class="text-sm font-black text-slate-800 uppercase tracking-widest">Nội dung & Yêu cầu</h2>
              </div>
              
              <div class="space-y-8">
                <!-- Description -->
                <div class="group/field">
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within/field:text-[#0056D2] transition-colors">Tóm tắt mô tả</label>
                    <textarea 
                      formControlName="description" 
                      rows="2" 
                      class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:bg-white focus:ring-4 focus:ring-[#0056D2]/5 focus:border-[#0056D2] outline-none transition-all shadow-inner resize-none placeholder:text-slate-300" 
                      placeholder="Giới thiệu nhanh nội dung bài tập..."></textarea>
                </div>

                <!-- Instructions -->
                <div class="group/field">
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within/field:text-[#0056D2] transition-colors">Hướng dẫn làm bài chi tiết</label>
                    <textarea 
                      formControlName="instructions" 
                      rows="10" 
                      class="w-full p-6 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:bg-white focus:ring-4 focus:ring-[#0056D2]/5 focus:border-[#0056D2] outline-none transition-all shadow-inner resize-none placeholder:text-slate-300" 
                      placeholder="Quy trình thực hiện, yêu cầu kỹ thuật và cách thức chấm điểm..."></textarea>
                </div>

                <!-- Attachments -->
                <div class="space-y-4">
                   <div class="flex items-center gap-3">
                      <lucide-icon name="paperclip" [size]="16" class="text-slate-400"></lucide-icon>
                      <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tài liệu bổ trợ & Tài nguyên</label>
                   </div>
                   <div class="p-6 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-2xl transition-all hover:bg-white hover:border-[#0056D2]/30 group">
                     <app-file-upload
                        [config]="fileUploadConfig()"
                        [existingFiles]="attachedFiles()"
                        (filesUploaded)="onFilesUploaded($event)"
                        (fileDeleted)="onFileDeleted($event)"
                        (uploadError)="onFileUploadError($event)">
                      </app-file-upload>
                      <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-4 text-center">
                        Hỗ trợ PDF, DOCX, ZIP, DWG (Tối đa 50MB)
                      </p>
                   </div>
                </div>
              </div>
            </div>

            <!-- Section: Distribution -->
            <div class="space-y-8">
              <div class="flex items-center gap-3">
                <div class="w-1.5 h-6 bg-slate-300 rounded-full"></div>
                <h2 class="text-sm font-black text-slate-800 uppercase tracking-widest">Cấu hình phân phối học viên</h2>
              </div>
              
              <div class="p-1 px-1">
                @if (form.controls.courseId.value) {
                  @if (loadingStudents()) {
                    <div class="p-16 border-2 border-slate-100 rounded-2xl flex flex-col items-center justify-center gap-4 animate-pulse">
                      <div class="w-12 h-12 bg-slate-50 rounded-2xl"></div>
                      <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang tải danh sách học viên...</span>
                    </div>
                  } @else {
                    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <app-distribution-selector
                        #distributionSelector
                        [courseId]="form.controls.courseId.value"
                        [enrolledStudents]="enrolledStudents()"
                        [initialDistributionType]="'ALL_STUDENTS'"
                        [initialStudentIds]="[]"
                        (distributionChange)="onDistributionChange($event)"
                      ></app-distribution-selector>
                    </div>
                  }
                } @else {
                   <div class="p-16 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center text-center group transition-all hover:bg-white hover:border-[#0056D2]/30">
                      <div class="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mb-6 text-slate-300 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                        <lucide-icon name="users" [size]="28"></lucide-icon>
                      </div>
                      <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] max-w-[200px]">
                        Hãy chọn khóa học phía trên để thiết lập đối tượng bài tập
                      </p>
                   </div>
                }
              </div>
            </div>
          </div>

          <!-- RIGHT COLUMN: Settings & Actions (4 cols) -->
          <div class="lg:col-span-4 p-6 sm:p-10 bg-slate-50/50 space-y-10">
            
            <!-- Schedule Settings -->
            <div class="space-y-6">
              <div class="flex items-center gap-3">
                <lucide-icon name="calendar" [size]="16" class="text-slate-400"></lucide-icon>
                <h2 class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thời hạn & Tùy chọn</h2>
              </div>

              <div class="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-8">
                 <!-- Due Date -->
                 <div class="group/field">
                    <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 group-focus-within/field:text-[#0056D2] transition-colors">Hạn chót nộp bài <span class="text-rose-500">*</span></label>
                    <input 
                      formControlName="dueDate" 
                      type="datetime-local" 
                      class="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:bg-white focus:ring-4 focus:ring-[#0056D2]/5 focus:border-[#0056D2] outline-none transition-all shadow-inner" />
                    @if (form.controls.dueDate.invalid && form.controls.dueDate.touched) {
                      <p class="text-[9px] font-black text-rose-500 mt-2 uppercase tracking-tight italic">Hạn nộp không được để trống</p>
                    }
                 </div>

                 <!-- Options -->
                 <div class="space-y-6 pt-2">
                    <label class="flex items-center gap-4 cursor-pointer group/opt">
                      <div class="relative flex items-center">
                        <input type="checkbox" formControlName="allowLateSubmission" 
                               class="w-5 h-5 rounded border-slate-300 text-[#0056D2] focus:ring-[#0056D2]/20 transition-all cursor-pointer">
                      </div>
                      <div class="flex flex-col">
                        <span class="text-xs font-black text-slate-700 uppercase tracking-tight group-hover/opt:text-[#0056D2] transition-colors">Cho phép nộp muộn</span>
                        <span class="text-[9px] text-slate-400 font-bold tracking-tight uppercase mt-0.5">Ghi nhận nhưng đánh dấu trễ hạn</span>
                      </div>
                    </label>
                    
                    <label class="flex items-center gap-4 cursor-pointer group/opt">
                      <div class="relative flex items-center">
                        <input type="checkbox" formControlName="isDraft" 
                               class="w-5 h-5 rounded border-slate-300 text-[#0056D2] focus:ring-[#0056D2]/20 transition-all cursor-pointer">
                      </div>
                      <div class="flex flex-col">
                        <span class="text-xs font-black text-slate-700 uppercase tracking-tight group-hover/opt:text-[#0056D2] transition-colors">Lưu bản nháp</span>
                        <span class="text-[9px] text-slate-400 font-bold tracking-tight uppercase mt-0.5">Học viên chưa thể thấy bài tập này</span>
                      </div>
                    </label>
                 </div>
              </div>
            </div>

            <!-- Validation/Status Messages -->
            <div class="space-y-3">
              @if (error()) {
                <div class="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-[10px] font-black uppercase tracking-wider flex items-start gap-3 animate-in shake duration-300">
                  <lucide-icon name="alert-circle" [size]="14" class="mt-0.5 shrink-0"></lucide-icon>
                  <span>{{ error() }}</span>
                </div>
              }

              @if (success()) {
                <div class="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-[10px] font-black uppercase tracking-wider flex items-start gap-3 animate-in zoom-in duration-300">
                  <lucide-icon name="check-circle" [size]="14" class="mt-0.5 shrink-0"></lucide-icon>
                  <span>{{ success() }}</span>
                </div>
              }
            </div>

            <!-- Primary Action -->
            <div class="pt-4 space-y-4">
              <button 
                type="submit" 
                [disabled]="form.invalid || submitting()"
                class="w-full h-14 rounded-2xl bg-[#0056D2] text-white font-black text-[11px] uppercase tracking-widest hover:bg-[#004BB5] transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group">
                @if (submitting()) {
                  <lucide-icon name="loader-2" [size]="16" class="animate-spin"></lucide-icon>
                  <span>ĐANG XỬ LÝ...</span>
                } @else {
                  <lucide-icon name="save" [size]="16" class="group-hover:scale-110 transition-transform"></lucide-icon>
                  <span>HOÀN TẤT & LƯU BÀI TẬP</span>
                }
              </button>
              <div class="p-4 bg-blue-50/50 rounded-xl">
                 <p class="text-[9px] text-slate-400 font-bold text-center leading-relaxed uppercase tracking-widest">
                  Lưu ý: Sau khi lưu, bài tập sẽ tự động được gán và thông báo đến các học viên/lớp học đã chọn.
                </p>
              </div>
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
  private distributionService = inject(DistributionService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  readonly distributionSelector = viewChild<DistributionSelectorComponent>('distributionSelector');

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
    instructions: [''],
    isDraft: [false],
    allowLateSubmission: [false]
  });

  ngOnInit(): void {
    this.loadCourses();

    // Watch for course selection changes
    this.form.controls.courseId.valueChanges.subscribe((courseId: string | null) => {
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
