import { Component, signal, inject, computed, ChangeDetectionStrategy, DestroyRef, effect } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { EMPTY } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { ClassService } from '../../../../../state/class.service';
import { ClassSummary } from '../../../../../shared/types/course.types';
import { ClassDialogComponent } from './class-dialog/class-dialog.component';
import { Page } from '../../../../../api/types/common.types';
import { AddStudentDrawerComponent } from './class-students/add-student-drawer/add-student-drawer.component';
import { ClassTeachersDrawerComponent } from './class-teachers/class-teachers-drawer.component';
import { VersionPickerDrawerComponent } from './version-picker/version-picker-drawer.component';
import { VersionHistoryDrawerComponent } from './version-picker/version-history-drawer.component';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { CourseEditorStore } from '../../store/course-editor.store';
import { ClassSelectionDialogComponent, ClassSelectionResult } from './class-selection-dialog/class-selection-dialog.component';
import { getInitials, formatVietnameseDate } from '../../../../../core/utils/format.util';

/**
 * CourseClassesComponent - Quản lý lớp học cho khóa học dạng INSTRUCTOR_LED
 *
 * Responsibilities (Single Responsibility):
 * - Hiển thị danh sách lớp học với filter và pagination
 * - Quản lý các dialog (tạo/sửa/xóa lớp, quản lý học viên, giảng viên)
 * - Hiển thị và xử lý học viên đã thanh toán chưa xếp lớp (Option B)
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-course-classes',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatIconModule,
    AddStudentDrawerComponent,
    ClassTeachersDrawerComponent,
    ClassSelectionDialogComponent,
    VersionPickerDrawerComponent,
    VersionHistoryDrawerComponent
  ],
  templateUrl: './course-classes.component.html',
  styleUrl: './course-classes.component.scss',
})
export class CourseClassesComponent {
  private classService = inject(ClassService);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private store = inject(CourseEditorStore);
  private confirmDialog = inject(ConfirmDialogService);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  // ============ Inputs/State ============

  // Course context
  courseId = signal('');

  // Classes list
  classes = signal<ClassSummary[]>([]);
  isLoading = signal(true);

  // Pagination
  currentPage = signal(0);
  pageSize = 10;
  totalElements = signal(0);
  totalPages = signal(0);

  // Search & Filter
  searchControl = new FormControl('');
  statusFilter = signal('');
  selectedYear = signal(new Date().getFullYear());
  selectedSemester = signal('');

  // Drawer State
  isDrawerOpen = signal(false);
  selectedClassId = signal('');
  studentDrawerDefaultTab = signal(0);

  // Co-teacher Drawer State
  isTeacherDrawerOpen = signal(false);
  teacherDrawerClassId = signal('');

  // Version Picker State (per-class)
  isVersionPickerOpen = signal(false);
  versionPickerClass = signal<ClassSummary | null>(null);

  // Version History State (course-level, bulk adopt)
  isVersionHistoryOpen = signal(false);

  // Paid Unenrolled Students (Option B)
  paidUnenrolledStudents = signal<any[]>([]);
  isLoadingPaidStudents = signal(false);
  isPaidStudentsSectionExpanded = signal(false);
  isEnrollingPaid = signal(false);
  selectedPaidStudentIds = signal<Set<string>>(new Set());

  // ============ Computed State (Derived) ============

  /** Years for filter (current - 1, current, current + 1) */
  readonly years = computed(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1];
  });

  /** Semester options */
  readonly semesters = ['HK1', 'HK2', 'Hè'];

  /** Pagination info display */
  readonly pageInfo = computed(() => {
    const total = this.totalElements();
    const current = this.currentPage();
    const start = total === 0 ? 0 : current * this.pageSize + 1;
    const end = Math.min((current + 1) * this.pageSize, total);
    return { start, end };
  });

  /** Is current page the last page? */
  readonly isLastPage = computed(() => {
    return this.currentPage() >= this.totalPages() - 1;
  });

  /** Number of selected students */
  readonly selectedStudentCount = computed(() => this.selectedPaidStudentIds().size);

  /** Are all students selected? */
  readonly isAllPaidStudentsSelected = computed(() => {
    const ids = this.selectedPaidStudentIds();
    const students = this.paidUnenrolledStudents();
    return students.length > 0 && ids.size === students.length;
  });

  /** Available classes for enrollment (not CLOSED) */
  readonly availableClasses = computed(() => {
    return this.classes().filter(c => c.status !== 'CLOSED' && c.status !== 'CANCELLED');
  });

  /** Has paid students waiting? */
  readonly hasPaidStudentsWaiting = computed(() => this.paidUnenrolledStudents().length > 0);

  // ============ Private State ============

  private lastLoadedCourseId = '';
  private lastBlockedCourseId = '';

  // ============ Lifecycle ============

  constructor() {
    this.setupCourseEffect();
    this.setupParamsSubscription();
    this.setupSearchSubscription();
  }

  /** Effect: React to courseId changes and load classes */
  private setupCourseEffect() {
    effect(() => {
      const courseId = this.courseId();
      const tree = this.store.courseTree();

      if (!courseId || !tree || tree.id !== courseId) {
        return;
      }

      // Block non-INSTRUCTOR_LED courses
      if (tree.deliveryMode !== 'INSTRUCTOR_LED') {
        this.isLoading.set(false);
        if (this.lastBlockedCourseId !== courseId) {
          this.lastBlockedCourseId = courseId;
          queueMicrotask(() => {
            this.toast.warning('Quản lý lớp chỉ áp dụng cho khóa học dạng "Lớp học".');
            void this.router.navigate(['/teacher/courses', courseId, 'editor', 'info']);
          });
        }
        return;
      }

      this.lastBlockedCourseId = '';
      if (this.lastLoadedCourseId !== courseId) {
        this.lastLoadedCourseId = courseId;
        this.loadClasses();
      }
    });
  }

  /** Subscribe to route params */
  private setupParamsSubscription() {
    this.route.parent?.params.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(params => {
      const nextCourseId = params['id'] ?? '';
      if (nextCourseId !== this.courseId()) {
        this.lastLoadedCourseId = '';
        this.courseId.set(nextCourseId);
      }
    });
  }

  /** Debounce search input */
  private setupSearchSubscription() {
    this.searchControl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.currentPage.set(0);
      this.loadClasses();
    });
  }

  // ============ Actions: Classes ============

  /** Load classes with current filters */
  loadClasses() {
    const courseId = this.courseId();
    const tree = this.store.courseTree();

    if (!courseId || !tree || tree.id !== courseId || tree.deliveryMode !== 'INSTRUCTOR_LED') {
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    const search = this.searchControl.value || '';

    // Construct semester filter (e.g., "HK1-2024")
    let semesterFilter = '';
    if (this.selectedSemester() && this.selectedYear()) {
      semesterFilter = `${this.selectedSemester()}-${this.selectedYear()}`;
    }

    this.classService.searchClasses(
      courseId,
      search,
      this.statusFilter(),
      semesterFilter,
      this.currentPage(),
      this.pageSize
    ).subscribe({
      next: (page: Page<ClassSummary>) => {
        this.classes.set(page.content);
        this.totalElements.set(page.totalElements);
        this.totalPages.set(page.totalPages);
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('Không thể tải danh sách lớp học');
        this.isLoading.set(false);
      }
    });

    // Load paid but unenrolled students
    this.loadPaidUnenrolledStudents(courseId);
  }

  /** Open create class dialog */
  openCreateDialog() {
    const dialogRef = this.dialog.open(ClassDialogComponent, {
      width: '600px',
      data: { mode: 'create', courseId: this.courseId() }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadClasses();
    });
  }

  /** Open edit class dialog */
  editClass(cls: ClassSummary) {
    const dialogRef = this.dialog.open(ClassDialogComponent, {
      width: '600px',
      data: { mode: 'edit', classData: cls, courseId: this.courseId() }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadClasses();
    });
  }

  /** Delete class with confirmation */
  async deleteClass(classId: string) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa lớp học',
      message: 'Bạn có chắc chắn muốn xóa lớp này? Học viên sẽ bị hủy đăng ký trong lớp này.',
      variant: 'danger',
      confirmText: 'Xóa',
      cancelText: 'Hủy'
    });
    if (!confirmed) return;

    this.classService.deleteClass(classId).pipe(
      catchError(() => {
        this.toast.error('Không thể xóa lớp học. Vui lòng thử lại.');
        return EMPTY;
      })
    ).subscribe(() => {
      this.loadClasses();
    });
  }

  /** View students in class */
  viewStudents(cls: ClassSummary) {
    this.selectedClassId.set(cls.id);
    this.studentDrawerDefaultTab.set(0);
    this.isDrawerOpen.set(true);
  }

  /** Quick enroll student to class */
  quickEnroll(cls: ClassSummary) {
    this.selectedClassId.set(cls.id);
    this.studentDrawerDefaultTab.set(1);
    this.isDrawerOpen.set(true);
  }

  /** Manage co-teachers */
  manageTeachers(cls: ClassSummary) {
    this.teacherDrawerClassId.set(cls.id);
    this.isTeacherDrawerOpen.set(true);
  }

  // ============ Actions: Version Management ============

  openVersionPicker(cls: ClassSummary) {
    this.versionPickerClass.set(cls);
    this.isVersionPickerOpen.set(true);
  }

  closeVersionPicker() {
    this.isVersionPickerOpen.set(false);
    // Defer clearing class data so the drawer's exit animation has the data still in scope
    setTimeout(() => this.versionPickerClass.set(null), 400);
  }

  openVersionHistory() {
    this.isVersionHistoryOpen.set(true);
  }

  closeVersionHistory() {
    this.isVersionHistoryOpen.set(false);
  }

  /** Called after version picker or history bulk adopt — refresh class list to reflect new pin state */
  onVersionAdopted() {
    this.loadClasses();
  }

  // ============ Actions: Filters ============

  onYearChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedYear.set(Number(target.value));
    this.currentPage.set(0);
    this.loadClasses();
  }

  onSemesterChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedSemester.set(target.value);
    this.currentPage.set(0);
    this.loadClasses();
  }

  onStatusChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.statusFilter.set(target.value);
    this.currentPage.set(0);
    this.loadClasses();
  }

  changePage(newPage: number) {
    if (newPage >= 0 && newPage < this.totalPages()) {
      this.currentPage.set(newPage);
      this.loadClasses();
    }
  }

  // ============ Actions: Paid Unenrolled Students (Option B) ============

  /** Load paid but unenrolled students */
  private loadPaidUnenrolledStudents(courseId: string) {
    this.isLoadingPaidStudents.set(true);
    this.classService.getPaidUnenrolledStudents(courseId).subscribe({
      next: (students) => {
        this.paidUnenrolledStudents.set(students);
        this.isLoadingPaidStudents.set(false);
        // Auto-expand if there are students waiting
        if (students.length > 0) {
          this.isPaidStudentsSectionExpanded.set(true);
        }
      },
      error: () => {
        this.paidUnenrolledStudents.set([]);
        this.isLoadingPaidStudents.set(false);
      }
    });
  }

  /** Toggle student selection */
  togglePaidStudentSelection(studentId: string) {
    this.selectedPaidStudentIds.update(ids => {
      const newSet = new Set(ids);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  }

  /** Toggle select all students */
  selectAllPaidStudents() {
    const current = this.selectedPaidStudentIds();
    const allIds = this.paidUnenrolledStudents().map(s => s.studentId);

    if (current.size === allIds.length) {
      this.selectedPaidStudentIds.set(new Set());
    } else {
      this.selectedPaidStudentIds.set(new Set(allIds));
    }
  }

  /** Check if student is selected */
  isPaidStudentSelected(studentId: string): boolean {
    return this.selectedPaidStudentIds().has(studentId);
  }

  /** Enroll selected paid students into a class */
  async enrollSelectedPaidStudents() {
    const selectedIds = Array.from(this.selectedPaidStudentIds());
    if (selectedIds.length === 0) {
      this.toast.warning('Vui lòng chọn học viên cần xếp lớp');
      return;
    }

    const available = this.availableClasses();
    if (available.length === 0) {
      this.toast.warning('Không có lớp học đang mở để xếp học viên');
      return;
    }

    // Open class selection dialog
    const dialogRef = this.dialog.open(ClassSelectionDialogComponent, {
      width: '500px',
      data: {
        classes: this.classes(),
        studentCount: selectedIds.length
      }
    });

    const result = await firstValueFrom(dialogRef.afterClosed());

    if (!result) return;

    this.isEnrollingPaid.set(true);
    try {
      await firstValueFrom(this.classService.enrollPaidStudents(result.classId, selectedIds));
      this.toast.success(`Đã xếp ${selectedIds.length} học viên vào ${result.className}`);
      this.selectedPaidStudentIds.set(new Set());
      this.loadPaidUnenrolledStudents(this.courseId());
      this.loadClasses();
    } catch (err: any) {
      this.toast.error(err.error?.message || 'Không thể xếp học viên');
    } finally {
      this.isEnrollingPaid.set(false);
    }
  }

  // ============ Utilities (delegated to format.util.ts) ============

  /** Get initials for avatar display */
  getStudentInitials(name: string | null, email: string | null): string {
    return getInitials(name || email || '');
  }

  /** Format payment date for display */
  formatPaymentDate(dateStr: string | null): string {
    return formatVietnameseDate(dateStr);
  }
}
