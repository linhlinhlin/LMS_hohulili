import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AssignmentDetail, UpdateAssignmentRequest } from '../../../api/client/assignment.api';
import { AssignmentStateService } from './services/assignment-state.service';
import { validateMaxScore } from './utils/assignment-validators';
import { DistributionSelectorComponent, DistributionSettings } from '../assignment-hub/components/distribution-selector.component';
import { CourseApi } from '../../../api/client/course.api';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
  templateUrl: './assignment-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignmentEditorComponent implements OnInit {
  private assignmentState = inject(AssignmentStateService);
  private courseApi = inject(CourseApi);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private confirmDialog = inject(ConfirmDialogService);
  private destroyRef = inject(DestroyRef);

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

  supportsClassDistribution = computed(
    () => this.assignment()?.deliveryMode === 'INSTRUCTOR_LED'
  );

  readonly deliveryModeLabel = computed(() => {
    switch (this.assignment()?.deliveryMode) {
      case 'INSTRUCTOR_LED':
        return 'Lớp học';
      case 'SELF_PACED':
        return 'Khóa học';
      default:
        return 'Chưa xác định';
    }
  });

  readonly canonicalContentHint = computed(() => {
    if (this.supportsClassDistribution()) {
      return 'Nội dung ở đây là phần mặc định của bài học trong khóa học. Việc giao cho lớp hoặc học viên cụ thể được cấu hình riêng ở phần phân phối bên dưới.';
    }

    return 'Phần này áp dụng trực tiếp cho toàn bộ học viên của khóa học tự học.';
  });

  readonly distributionSectionTitle = computed(() =>
    this.supportsClassDistribution()
      ? 'Phân phối theo lớp hoặc học viên'
      : 'Phân phối áp dụng cho toàn khóa học'
  );

  readonly distributionSectionHint = computed(() => {
    if (this.supportsClassDistribution()) {
      return 'Chọn lớp học hoặc nhóm học viên sẽ nhận cùng một bài tập mặc định này.';
    }

    return 'Khóa học tự học chỉ có một phạm vi duy nhất: toàn bộ học viên đã ghi danh trong khóa học.';
  });

  readonly distributionScopeLabel = computed(() => {
    switch (this.assignment()?.distributionType) {
      case 'CLASS':
        return 'Theo lớp';
      case 'SPECIFIC_STUDENTS':
        return 'Theo học viên';
      case 'ALL_STUDENTS':
        return 'Toàn khóa học';
      default:
        return this.supportsClassDistribution() ? 'Chưa cấu hình' : 'Toàn khóa học';
    }
  });

  readonly distributionTargetLabel = computed(() => {
    const assignment = this.assignment();
    if (!assignment) {
      return 'Chưa xác định';
    }

    if (assignment.distributionType === 'CLASS') {
      return assignment.className || 'Lớp học chưa được đặt tên';
    }

    if (assignment.distributionType === 'SPECIFIC_STUDENTS') {
      return `${assignment.allocatedStudentIds?.length ?? 0} học viên`;
    }

    if (assignment.deliveryMode === 'SELF_PACED') {
      return 'Toàn bộ học viên đã ghi danh';
    }

    if (assignment.distributionType === 'ALL_STUDENTS') {
      return 'Toàn bộ học viên trong khóa học';
    }

    return assignment.courseTitle || 'Chưa xác định';
  });

  // Distribution state
  enrolledStudents = signal<EnrolledStudentData[]>([]);
  loadingStudents = signal(false);
  distributionSettings = signal<DistributionSettings | null>(null);

  // Original values for change detection
  private originalValues = signal<Record<string, unknown>>({});
  private originalDistributionSettings = signal<DistributionSettings | null>(null);
  private formRevision = signal(0);

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
    this.formRevision();
    const currentForm = this.form.getRawValue();
    const originalForm = this.originalValues();
    const formChanged = JSON.stringify(currentForm) !== JSON.stringify(originalForm);

    const currentDist = this.distributionSettings();
    const originalDist = this.originalDistributionSettings();
    const distChanged = JSON.stringify(currentDist) !== JSON.stringify(originalDist);

    const result = formChanged || distChanged;

    return result;
  });

  constructor() {
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.formRevision.update(value => value + 1);
      });
  }

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

  async canDeactivate(): Promise<boolean> {
    if (!this.hasChanges() && !this.saving()) {
      return true;
    }

    return this.confirmDialog.confirm({
      title: 'Rời màn chỉnh sửa bài tập',
      message: 'Bạn có thay đổi chưa lưu trong bài tập này. Nếu rời màn này, các chỉnh sửa hiện tại sẽ bị mất.',
      variant: 'warning',
      confirmText: 'Rời màn này',
      cancelText: 'Ở lại'
    });
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
      studentIds: assignment.allocatedStudentIds ? [...assignment.allocatedStudentIds] : [],
      classId: assignment.classId || null
    };
    this.distributionSettings.set(distSettings);
    this.originalDistributionSettings.set({
      distributionType: distSettings.distributionType,
      studentIds: distSettings.studentIds ? [...distSettings.studentIds] : null,
      classId: distSettings.classId ?? null
    });
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
    if (this.form.invalid) {
      return;
    }

    this.formError.set('');
    this.success.set('');

    const formValue = this.form.getRawValue();

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

    const distSettings = this.supportsClassDistribution()
      ? this.distributionSettings()
      : {
          distributionType: 'ALL_STUDENTS' as const,
          studentIds: null,
          classId: null,
        };

    if (distSettings?.distributionType === 'CLASS' && !distSettings.classId) {
      this.formError.set('Vui lòng chọn lớp học trước khi lưu bài tập');
      this.saving.set(false);
      return;
    }

    if (
      distSettings?.distributionType === 'SPECIFIC_STUDENTS' &&
      (!distSettings.studentIds || distSettings.studentIds.length === 0)
    ) {
      this.formError.set('Vui lòng chọn ít nhất một học viên');
      this.saving.set(false);
      return;
    }

    const request: UpdateAssignmentRequest = {
      title: formValue.title || undefined,
      description: formValue.description || undefined,
      instructions: formValue.instructions || undefined,
      dueDate: dueDateInstant,
      maxScore: formValue.maxScore || undefined,
      status: formValue.status || undefined,
      classId: distSettings?.distributionType === 'CLASS' ? distSettings.classId || undefined : undefined,
      studentIds: distSettings?.distributionType === 'SPECIFIC_STUDENTS' ? distSettings.studentIds || [] : undefined,
      distributionType: distSettings?.distributionType
    };

    this.assignmentState.updateAssignment(this.assignmentId, request).subscribe({
      next: (result: unknown) => {
        if (result) {
          this.success.set('Đã lưu thay đổi!');
          // Update original values
          this.originalValues.set(this.form.getRawValue());
          const currentDistribution = this.distributionSettings();
          this.originalDistributionSettings.set(
            currentDistribution
              ? {
                  distributionType: currentDistribution.distributionType,
                  studentIds: currentDistribution.studentIds ? [...currentDistribution.studentIds] : null,
                  classId: currentDistribution.classId ?? null,
                }
              : null
          );
          // Clear success after 3 seconds
          setTimeout(() => this.success.set(''), 3000);
        } else {
          this.formError.set(this.assignmentState.error() || 'Cập nhật thất bại');
        }
      },
      error: (err: unknown) => {
        this.formError.set('Cập nhật bài tập thất bại');
      },
      complete: () => {
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
    const originalDistribution = this.originalDistributionSettings();
    this.distributionSettings.set(
      originalDistribution
        ? {
            distributionType: originalDistribution.distributionType,
            studentIds: originalDistribution.studentIds ? [...originalDistribution.studentIds] : null,
            classId: originalDistribution.classId ?? null,
          }
        : null
    );
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
          this.router.navigate(['/teacher/assessments/classes/assignments']);
        } else {
          this.formError.set(this.assignmentState.error() || 'Xóa bài tập thất bại');
          this.showDeleteConfirm.set(false);
        }
      },
      error: (err: unknown) => {
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
