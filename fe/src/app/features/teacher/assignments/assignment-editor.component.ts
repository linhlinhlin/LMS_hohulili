import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AssignmentDetail, UpdateAssignmentRequest } from '../../../api/client/assignment.api';
import { AssignmentStateService } from './services/assignment-state.service';
import { validateMaxScore } from './utils/assignment-validators';
import { DistributionSelectorComponent, DistributionSettings } from '../assignment-hub/components/distribution-selector.component';
import { CourseApi } from '../../../api/client/course.api';

type AssignmentStatus = 'pending' | 'published' | 'closed' | 'DRAFT' | 'PUBLISHED' | 'CLOSED';

interface EnrolledStudentData {
  id: string;
  name: string;
  email: string;
  enrolledAt: string;
}

/**
 * Assignment Editor Component
 * 
 * Form for editing existing assignments with status management.
 * Integrates with AssignmentStateService for state management.
 * 
 * @requirements 3.1, 3.2, 3.3, 3.4
 */
@Component({
  selector: 'app-assignment-editor',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, DistributionSelectorComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="max-w-3xl mx-auto p-6 space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Chỉnh sửa bài tập</h1>
          @if (assignment()) {
            <p class="text-sm text-gray-500 mt-1">{{ assignment()?.courseTitle }}</p>
          }
        </div>
        <div class="flex items-center gap-3">
          @if (assignmentId) {
            <a [routerLink]="['/teacher/assignments', assignmentId, 'submissions']" 
               class="px-4 py-2 border rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors">
              Xem bài nộp
            </a>
          }
          <a routerLink="/teacher/assignments" 
             class="text-gray-600 hover:text-gray-900 flex items-center gap-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            Quay lại
          </a>
        </div>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="bg-white rounded-xl shadow-sm border p-8 text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
          <p class="mt-2 text-gray-500">Đang tải thông tin bài tập...</p>
        </div>
      }

      <!-- Error State -->
      @if (error() && !loading()) {
        <div class="bg-white rounded-xl shadow-sm border p-8 text-center">
          <div class="text-red-600 mb-4">{{ error() }}</div>
          <button (click)="loadAssignment()" class="text-indigo-600 hover:text-indigo-800 underline">
            Thử lại
          </button>
        </div>
      }

      <!-- Form -->
      @if (!loading() && !error() && assignment()) {
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="bg-white rounded-xl shadow-sm border">
          <!-- Status Banner -->
          <div class="p-4 border-b" [class]="getStatusBannerClass()">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="font-medium">Trạng thái:</span>
                <span class="px-3 py-1 rounded-full text-sm font-semibold" [class]="getStatusBadgeClass()">
                  {{ getStatusLabel() }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-sm text-gray-600">Thay đổi trạng thái:</span>
                <select 
                  formControlName="status" 
                  class="border rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-indigo-500">
                  <option value="pending">Nháp</option>
                  <option value="published">Xuất bản</option>
                  <option value="closed">Đóng</option>
                </select>
              </div>
            </div>
          </div>

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
                class="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
              @if (form.controls.title.invalid && form.controls.title.touched) {
                <p class="text-sm text-red-600 mt-1">Tiêu đề bài tập là bắt buộc</p>
              }
            </div>

            <!-- Due Date & Max Score Row -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Hạn nộp</label>
                <input 
                  formControlName="dueDate" 
                  type="datetime-local" 
                  class="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Điểm tối đa</label>
                <input 
                  formControlName="maxScore" 
                  type="number" 
                  min="1" 
                  max="1000" 
                  class="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                @if (form.controls.maxScore.invalid && form.controls.maxScore.touched) {
                  <p class="text-sm text-red-600 mt-1">Điểm tối đa phải từ 1 đến 1000</p>
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
                placeholder="Hướng dẫn chi tiết cách làm bài tập..."></textarea>
            </div>
          </div>

          <!-- Distribution Section -->
          <div class="p-6 space-y-5 border-b">
            <h2 class="text-lg font-semibold text-gray-900">Phân phối học viên</h2>
            
            @if (loadingStudents()) {
              <div class="p-8 text-center text-gray-500">
                <div class="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent mb-2"></div>
                <p class="text-sm">Đang tải danh sách học viên...</p>
              </div>
            } @else {
              <app-distribution-selector
                [courseId]="assignment()?.courseId || ''"
                [enrolledStudents]="enrolledStudents"
                [initialDistributionType]="distributionSettings()?.distributionType || 'ALL_STUDENTS'"
                [initialStudentIds]="distributionSettings()?.studentIds || []"
                [initialClassId]="distributionSettings()?.classId ?? null"
                (distributionChange)="onDistributionChange($event)"
              ></app-distribution-selector>
            }
          </div>

          <!-- Metadata Section -->
          <div class="p-6 space-y-3 border-b bg-gray-50">
            <h3 class="text-sm font-medium text-gray-700">Thông tin bổ sung</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span class="text-gray-500">Số bài nộp:</span>
                <span class="ml-1 font-medium">{{ assignment()?.submissionsCount || 0 }}</span>
              </div>
              <div>
                <span class="text-gray-500">Tổng học viên:</span>
                <span class="ml-1 font-medium">{{ assignment()?.totalStudents || 0 }}</span>
              </div>
              <div>
                <span class="text-gray-500">Ngày tạo:</span>
                <span class="ml-1 font-medium">{{ assignment()?.createdAt | date:'dd/MM/yyyy' }}</span>
              </div>
              <div>
                <span class="text-gray-500">Cập nhật:</span>
                <span class="ml-1 font-medium">{{ assignment()?.updatedAt | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="p-6 bg-gray-50 rounded-b-xl flex items-center justify-between">
            <button 
              type="button"
              (click)="onDelete()"
              class="text-red-600 hover:text-red-800 text-sm">
              Xóa bài tập
            </button>
            <div class="flex items-center gap-4">
              @if (success()) {
                <span class="text-green-600 flex items-center gap-1">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                  {{ success() }}
                </span>
              }
              @if (formError()) {
                <span class="text-red-600">{{ formError() }}</span>
              }
              <button 
                type="button"
                (click)="resetForm()"
                [disabled]="!hasChanges()"
                class="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors">
                Hoàn tác
              </button>
              <button 
                type="submit" 
                [disabled]="form.invalid || saving() // || !hasChanges() allow saving if only distribution changed" 
                class="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                @if (saving()) {
                  <span class="flex items-center gap-2">
                    <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang lưu...
                  </span>
                } @else {
                  Lưu thay đổi
                }
              </button>
            </div>
          </div>
        </form>
      }

      <!-- Delete Confirmation Modal -->
      @if (showDeleteConfirm()) {
        <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-xl max-w-md w-full p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Xác nhận xóa</h3>
            <p class="text-gray-600 mb-6">
              Bạn có chắc chắn muốn xóa bài tập "{{ assignment()?.title }}"? 
              Hành động này không thể hoàn tác.
            </p>
            <div class="flex justify-end gap-3">
              <button 
                (click)="showDeleteConfirm.set(false)"
                class="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-100">
                Hủy
              </button>
              <button 
                (click)="confirmDelete()"
                [disabled]="deleting()"
                class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                @if (deleting()) {
                  Đang xóa...
                } @else {
                  Xóa
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignmentEditorComponent implements OnInit {
  private assignmentState = inject(AssignmentStateService);
  private courseApi = inject(CourseApi);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Route param
  assignmentId = '';

  // State signals
  assignment = signal<AssignmentDetail | null>(null);
  loading = signal(false);
  saving = signal(false);
  deleting = signal(false);
  error = signal('');
  formError = signal('');
  success = signal('');
  showDeleteConfirm = signal(false);

  // Distribution state
  enrolledStudents = signal<EnrolledStudentData[]>([]);
  loadingStudents = signal(false);
  distributionSettings = signal<DistributionSettings | null>(null);

  // Original values for change detection
  private originalValues = signal<Record<string, unknown>>({});
  private originalDistributionSettings = signal<DistributionSettings | null>(null);

  // Reactive form
  form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    description: [''],
    instructions: [''],
    dueDate: [''],
    maxScore: [100, [Validators.min(1), Validators.max(1000)]],
    status: ['pending' as AssignmentStatus]
  });

  // Computed: Check if form has changes
  hasChanges = computed(() => {
    const currentForm = this.form.getRawValue();
    const originalForm = this.originalValues();
    const formChanged = JSON.stringify(currentForm) !== JSON.stringify(originalForm);

    const currentDist = this.distributionSettings();
    const originalDist = this.originalDistributionSettings();
    const distChanged = JSON.stringify(currentDist) !== JSON.stringify(originalDist);

    const result = formChanged || distChanged;
    console.log('hasChanges check:', { formChanged, distChanged, result });
    
    return result;
  });

  ngOnInit(): void {
    // Check current route params first, then parent route params (since this is a child route)
    this.assignmentId = this.route.snapshot.paramMap.get('id') ||
      this.route.parent?.snapshot.paramMap.get('id') || '';

    if (this.assignmentId) {
      this.loadAssignment();
    } else {
      this.error.set('ID bài tập không hợp lệ');
    }
  }

  /**
   * Loads assignment data from API
   */
  loadAssignment(): void {
    this.loading.set(true);
    this.error.set('');

    this.assignmentState.loadAssignment(this.assignmentId).subscribe({
      next: () => {
        const assignment = this.assignmentState.currentAssignment();
        if (assignment) {
          this.assignment.set(assignment);
          this.populateForm(assignment);
          this.loadEnrolledStudents(assignment.courseId);
        } else {
          this.error.set('Không tìm thấy bài tập');
        }
      },
      error: (err: unknown) => {
        console.error('Error loading assignment:', err);
        this.error.set('Không thể tải thông tin bài tập');
      },
      complete: () => {
        this.loading.set(false);
      }
    });
  }

  /**
   * Populates form with assignment data
   */
  private populateForm(assignment: AssignmentDetail): void {
    // Format dueDate for datetime-local input
    let dueDate = '';
    if (assignment.dueDate) {
      const date = new Date(assignment.dueDate);
      dueDate = date.toISOString().slice(0, 16); // Format: yyyy-MM-ddTHH:mm
    }

    // Normalize status
    const status = this.normalizeStatus(assignment.status);

    const values = {
      title: assignment.title,
      description: assignment.description || '',
      instructions: assignment.instructions || '',
      dueDate: dueDate,
      maxScore: assignment.maxScore || 100,
      status: status
    };

    this.form.patchValue(values);
    this.originalValues.set(values);

    // Set distribution settings
    const distSettings: DistributionSettings = {
      distributionType: (assignment.distributionType as 'CLASS' | 'SPECIFIC_STUDENTS' | 'ALL_STUDENTS') || 'ALL_STUDENTS',
      studentIds: assignment.allocatedStudentIds || [],
      classId: assignment.classId || null
    };
    this.distributionSettings.set(distSettings);
    this.originalDistributionSettings.set(distSettings);
  }

  /**
   * Normalizes status to lowercase
   */
  private normalizeStatus(status: string): AssignmentStatus {
    const statusMap: Record<string, AssignmentStatus> = {
      'DRAFT': 'pending',
      'PUBLISHED': 'published',
      'CLOSED': 'closed',
      'pending': 'pending',
      'published': 'published',
      'closed': 'closed'
    };
    return statusMap[status] || 'pending';
  }

  /**
   * Handles form submission
   */
  onSubmit(): void {
    console.log('onSubmit called');
    console.log('Form valid:', this.form.valid);
    console.log('Has changes:', this.hasChanges());
    
    if (this.form.invalid) {
      console.log('Form invalid, returning');
      return;
    }

    this.formError.set('');
    this.success.set('');

    const formValue = this.form.getRawValue();
    console.log('Form value:', formValue);

    // Validate maxScore
    if (formValue.maxScore) {
      const validation = validateMaxScore(formValue.maxScore);
      if (!validation.isValid) {
        this.formError.set(validation.errors[0]?.message || 'Điểm tối đa không hợp lệ');
        return;
      }
    }

    // Convert dueDate to ISO string
    let dueDateInstant: string | undefined;
    if (formValue.dueDate) {
      try {
        const date = new Date(formValue.dueDate);
        dueDateInstant = date.toISOString();
      } catch {
        this.formError.set('Định dạng ngày hạn nộp không hợp lệ');
        return;
      }
    }

    this.saving.set(true);

    const distSettings = this.distributionSettings();
    console.log('Distribution settings:', distSettings);

    const request: UpdateAssignmentRequest = {
      title: formValue.title || undefined,
      description: formValue.description || undefined,
      instructions: formValue.instructions || undefined,
      dueDate: dueDateInstant,
      maxScore: formValue.maxScore || undefined,
      status: formValue.status || undefined,
      studentIds: distSettings?.distributionType === 'SPECIFIC_STUDENTS' ? distSettings.studentIds || [] : undefined,
      distributionType: distSettings?.distributionType
    };

    console.log('Update request:', request);
    console.log('Assignment ID:', this.assignmentId);

    this.assignmentState.updateAssignment(this.assignmentId, request).subscribe({
      next: (result: unknown) => {
        console.log('Update result:', result);
        if (result) {
          this.success.set('Đã lưu thay đổi!');
          // Update original values
          this.originalValues.set(this.form.getRawValue());
          this.originalDistributionSettings.set(this.distributionSettings());
          // Clear success after 3 seconds
          setTimeout(() => this.success.set(''), 3000);
        } else {
          console.error('Update failed:', this.assignmentState.error());
          this.formError.set(this.assignmentState.error() || 'Cập nhật thất bại');
        }
      },
      error: (err: unknown) => {
        console.error('Error updating assignment:', err);
        this.formError.set('Cập nhật bài tập thất bại');
      },
      complete: () => {
        console.log('Update complete');
        this.saving.set(false);
      }
    });
  }

  /**
   * Resets form to original values
   */
  resetForm(): void {
    const original = this.originalValues();
    this.form.patchValue(original);
    this.formError.set('');
    this.success.set('');
  }

  /**
   * Shows delete confirmation modal
   */
  onDelete(): void {
    this.showDeleteConfirm.set(true);
  }

  /**
   * Confirms and executes delete
   */
  confirmDelete(): void {
    this.deleting.set(true);

    this.assignmentState.deleteAssignment(this.assignmentId).subscribe({
      next: (success: unknown) => {
        if (success) {
          this.router.navigate(['/teacher/assignments']);
        } else {
          this.formError.set(this.assignmentState.error() || 'Xóa bài tập thất bại');
          this.showDeleteConfirm.set(false);
        }
      },
      error: (err: unknown) => {
        console.error('Error deleting assignment:', err);
        this.formError.set('Xóa bài tập thất bại');
        this.showDeleteConfirm.set(false);
      },
      complete: () => {
        this.deleting.set(false);
      }
    });
  }

  // UI Helpers
  getStatusLabel(): string {
    const status = this.form.get('status')?.value;
    const labels: Record<string, string> = {
      'pending': 'Nháp',
      'published': 'Đã xuất bản',
      'closed': 'Đã đóng'
    };
    return labels[status || ''] || 'Không xác định';
  }

  getStatusBannerClass(): string {
    const status = this.form.get('status')?.value;
    const classes: Record<string, string> = {
      'pending': 'bg-yellow-50',
      'published': 'bg-green-50',
      'closed': 'bg-gray-100'
    };
    return classes[status || ''] || 'bg-gray-50';
  }

  getStatusBadgeClass(): string {
    const status = this.form.get('status')?.value;
    const classes: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'published': 'bg-green-100 text-green-800',
      'closed': 'bg-gray-200 text-gray-800'
    };
    return classes[status || ''] || 'bg-gray-100 text-gray-800';
  }

  /**
   * Loads enrolled students for the course
   */
  private loadEnrolledStudents(courseId: string): void {
    if (!courseId) return;

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
        this.enrolledStudents.set([]);
      },
      complete: () => {
        this.loadingStudents.set(false);
      }
    });
  }

  // Distribution handlers
  onDistributionChange(settings: DistributionSettings): void {
    this.distributionSettings.set(settings);
    // You might want to update form validity or touched state here if needed
  }
}
