import {
  Component,
  signal,
  inject,
  OnInit,
  ChangeDetectionStrategy,
  computed,
  effect,
  ElementRef,
  viewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  AdminService,
  AdminCourseSummary,
  COURSE_REJECTION_CATEGORIES,
  CourseRejectionCategory,
  PendingCourseSummary,
  ReviewEvent
} from '../../infrastructure/services/admin.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { AuthService } from '../../../../core/services/auth.service';
import { getAdminPortalBase } from '../../../../core/utils/portal-route.util';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

type ReviewableCourseState =
  | Pick<AdminCourseSummary, 'status' | 'reviewState'>
  | Pick<PendingCourseSummary, 'status' | 'reviewState'>;

type CourseListItem = AdminCourseSummary | PendingCourseSummary;

/** Mobile-only switch: which pane fills the viewport. Desktop ignores this. */
type MobilePane = 'queue' | 'detail';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-course-review',
  imports: [CommonModule, FormsModule, DialogComponent, EmptyStateComponent],
  templateUrl: './course-review.component.html',
  styleUrl: './course-review.component.scss'
})
export class CourseReviewComponent implements OnInit {
  private adminService = inject(AdminService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);
  private authService = inject(AuthService);
  private sanitizer = inject(DomSanitizer);

  courses = signal<CourseListItem[]>([]);
  loading = signal(false);
  error = signal('');
  searchKeyword = '';
  statusFilter = 'PENDING';

  currentPage = 1;
  pageSize = 10;
  totalItems = 0;

  approving = signal<string | null>(null);
  rejecting = signal(false);
  rejectModalOpen = signal(false);
  rejectComment = '';
  rejectCategory: CourseRejectionCategory = 'INSUFFICIENT_CONTENT';
  readonly rejectionCategoryOptions = COURSE_REJECTION_CATEGORIES;
  /** Course being targeted by the reject modal (independent of right-pane selection). */
  rejectTargetCourse: CourseListItem | null = null;

  // F-CR2 — selected course for the right preview pane.
  selectedCourseId = signal<string | null>(null);
  /** Convenience derived signal — the full course object behind `selectedCourseId`. */
  selectedCourse = computed<CourseListItem | null>(() => {
    const id = this.selectedCourseId();
    if (!id) return null;
    return this.courses().find(c => c.id === id) ?? null;
  });

  reviewHistory = signal<ReviewEvent[]>([]);
  loadingHistory = signal(false);

  /** Newest rejection category (from history) — used to enrich the rejection banner in the right pane. */
  latestRejectionCategory = computed<CourseRejectionCategory | null>(() => {
    const history = this.reviewHistory();
    for (let i = history.length - 1; i >= 0; i--) {
      const e = history[i];
      if (e.action === 'REJECTED' || e.action === 'CHANGES_REQUESTED') {
        return e.rejectionCategory ?? null;
      }
    }
    return null;
  });

  // Mobile pane switch (queue vs detail). Desktop layout shows both side-by-side.
  mobilePane = signal<MobilePane>('queue');

  // F-CR2 — anti-skip review (Coursera UX).
  // Approve disabled until reviewer confirms they've read the content.
  // Two ways to satisfy: (a) scroll the detail body to within 32px of the
  // bottom, or (b) tick the checkbox manually. Either flips this signal
  // to true and stays true until the reviewer changes selection.
  hasReadFully = signal(false);
  /** Two-way bound to the checkbox — kept separate so unchecking doesn't
   *  re-disable the button if the user already scrolled. */
  readConfirmed = signal(false);

  detailBodyRef = viewChild<ElementRef<HTMLElement>>('detailBody');

  // F-CR1 — empty state CTA. Helper to detect whether the current view is
  // empty because of an applied filter (so we offer to clear it) versus
  // genuinely no data (no CTA — there's nothing to clear).
  hasActiveFilter = computed(() => {
    return this.statusFilter !== '' || this.searchKeyword.trim() !== '';
  });

  emptyStateTitle = computed(() => {
    if (this.statusFilter === 'PENDING') return 'Không có khóa học chờ duyệt';
    if (this.statusFilter === 'APPROVED') return 'Chưa có khóa học nào được duyệt';
    if (this.statusFilter === 'REJECTED') return 'Chưa có khóa học bị từ chối';
    if (this.statusFilter === 'DRAFT') return 'Chưa có khóa học nháp';
    return 'Không tìm thấy khóa học nào';
  });

  emptyStateDescription = computed(() => {
    if (this.hasActiveFilter()) {
      return 'Thử điều chỉnh từ khóa tìm kiếm hoặc chọn bộ lọc khác.';
    }
    return 'Khi giảng viên gửi khóa học mới, danh sách sẽ hiển thị ở đây.';
  });

  /** SafeResourceUrl for the right-pane preview iframe — re-derived when selection changes. */
  previewSafeUrl = computed<SafeResourceUrl | null>(() => {
    const course = this.selectedCourse();
    if (!course) return null;
    const base = getAdminPortalBase(this.authService.userRole());
    // `?embed=1` is a marker the preview component can later consume to hide its own chrome.
    return this.sanitizer.bypassSecurityTrustResourceUrl(`${base}/courses/${course.id}/preview?embed=1`);
  });

  constructor() {
    // Keep history in sync + reset anti-skip state whenever selection changes.
    effect(() => {
      const id = this.selectedCourseId();
      if (id) {
        this.loadReviewHistory(id);
        // Fresh course → reviewer must scroll/confirm again.
        this.hasReadFully.set(false);
        this.readConfirmed.set(false);
      } else {
        this.reviewHistory.set([]);
      }
    });
  }

  /**
   * Scroll handler on the detail body — flips hasReadFully → true once
   * the reviewer reaches the bottom (within 32px tolerance for touch
   * fling overshoot). Once true, stays true for this selection.
   */
  onDetailScroll(event: Event): void {
    if (this.hasReadFully()) {
      return; // already satisfied — no need to recompute
    }
    const target = event.target as HTMLElement;
    const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    if (distanceFromBottom <= 32) {
      this.hasReadFully.set(true);
    }
  }

  /** Combined gate — approve enabled only when read confirmed AND not already approving. */
  canApprove = computed<boolean>(() => {
    const course = this.selectedCourse();
    if (!course) return false;
    if (this.approving() === course.id) return false;
    return this.hasReadFully() || this.readConfirmed();
  });

  clearFilters(): void {
    this.searchKeyword = '';
    this.statusFilter = '';
    this.currentPage = 1;
    this.loadCourses();
  }

  // F-CR3 — SLA badge.
  // Days since the teacher submitted for review. Reviewer sees urgency at a
  // glance instead of clicking into each row.
  getSlaDays(course: CourseListItem): number {
    if (!course.submittedAt) return 0;
    const submitted = new Date(course.submittedAt).getTime();
    if (Number.isNaN(submitted)) return 0;
    const diffMs = Date.now() - submitted;
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }

  // < 3 days = ok (gray), 3-7 = watch (amber), > 7 = overdue (red).
  // Thresholds picked from internal SLA discussion — easy to tune later.
  getSlaUrgency(course: CourseListItem): 'ok' | 'watch' | 'overdue' {
    const days = this.getSlaDays(course);
    if (days >= 7) return 'overdue';
    if (days >= 3) return 'watch';
    return 'ok';
  }

  ngOnInit() {
    this.loadCourses();
  }

  loadCourses() {
    this.loading.set(true);
    this.error.set('');

    const params: Record<string, unknown> = {
      page: this.currentPage - 1,
      size: this.pageSize
    };

    if (this.searchKeyword.trim()) {
      params['search'] = this.searchKeyword.trim();
    }

    if (this.statusFilter) {
      params['status'] = this.statusFilter;
    }

    if (this.statusFilter === 'PENDING') {
      this.adminService.getPendingCourses(params).subscribe({
        next: (response) => {
          const list = response.data || [];
          this.courses.set(list);
          this.totalItems = response.pagination?.totalElements || response.pagination?.totalItems || 0;
          this.autoSelectFirst(list);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Không thể tải danh sách khóa học. Vui lòng thử lại.');
          this.loading.set(false);
        }
      });
      return;
    }

    this.adminService.getAllCourses(params).subscribe({
      next: (response) => {
        const list = response.data || [];
        this.courses.set(list);
        this.totalItems = response.pagination?.totalElements || response.pagination?.totalItems || 0;
        this.autoSelectFirst(list);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Không thể tải danh sách khóa học. Vui lòng thử lại.');
        this.loading.set(false);
      }
    });
  }

  /** Auto-select the first item if nothing selected or selection no longer in list. */
  private autoSelectFirst(list: CourseListItem[]): void {
    const current = this.selectedCourseId();
    if (current && list.some(c => c.id === current)) {
      return;
    }
    this.selectedCourseId.set(list.length > 0 ? list[0].id : null);
  }

  /** Click a row → load right pane + (mobile only) flip to detail tab. */
  selectCourse(course: CourseListItem): void {
    this.selectedCourseId.set(course.id);
    this.mobilePane.set('detail');
  }

  /** Mobile back-to-queue button. */
  showMobileQueue(): void {
    this.mobilePane.set('queue');
  }

  /** Open the standalone preview surface (full chrome) — kept for accessibility / deep dive. */
  previewContentFull(courseId: string) {
    this.router.navigateByUrl(`${getAdminPortalBase(this.authService.userRole())}/courses/${courseId}/preview`);
  }

  loadReviewHistory(courseId: string) {
    this.loadingHistory.set(true);
    this.adminService.getReviewHistory(courseId).subscribe({
      next: (events) => {
        this.reviewHistory.set(events);
        this.loadingHistory.set(false);
      },
      error: () => this.loadingHistory.set(false)
    });
  }

  getActionText(action: string): string {
    const map: Record<string, string> = {
      SUBMITTED: 'Gửi duyệt',
      APPROVED: 'Phê duyệt',
      REJECTED: 'Từ chối',
      REVOKED: 'Thu hồi',
      CHANGES_REQUESTED: 'Yêu cầu sửa',
      RESUBMITTED: 'Gửi lại'
    };
    return map[action] || action;
  }

  getActionColor(action: string): string {
    const map: Record<string, string> = {
      SUBMITTED: 'text-blue-600',
      APPROVED: 'text-green-600',
      REJECTED: 'text-red-600',
      REVOKED: 'text-orange-600',
      CHANGES_REQUESTED: 'text-amber-600',
      RESUBMITTED: 'text-blue-600'
    };
    return map[action] || 'text-gray-600';
  }

  getRejectionCategoryLabel(code?: string | null): string {
    if (!code) return '';
    return COURSE_REJECTION_CATEGORIES.find(o => o.value === code)?.label ?? '';
  }

  formatDateTime(dateStr: string): string {
    if (!dateStr) {
      return '';
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  async approveCourse(id: string) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Duyệt khóa học',
      message: 'Bạn có chắc chắn muốn duyệt khóa học này?',
      confirmText: 'Duyệt',
      variant: 'warning'
    });
    if (!confirmed) {
      return;
    }

    this.approving.set(id);
    this.adminService.approveCourse(id).subscribe({
      next: (response) => {
        this.toast.success(response.message || 'Đã duyệt khóa học thành công');
        this.approving.set(null);
        this.loadCourses();
      },
      error: (err) => {
        this.toast.error('Không thể duyệt khóa học: ' + (err.error?.message || err.message || 'Lỗi không xác định'));
        this.approving.set(null);
      }
    });
  }

  showRejectModal(course: CourseListItem) {
    this.rejectTargetCourse = course;
    this.rejectComment = '';
    this.rejectCategory = 'INSUFFICIENT_CONTENT';
    this.rejectModalOpen.set(true);
  }

  closeRejectModal() {
    this.rejectModalOpen.set(false);
    this.rejectTargetCourse = null;
    this.rejectComment = '';
    this.rejectCategory = 'INSUFFICIENT_CONTENT';
  }

  confirmReject() {
    const trimmed = this.rejectComment.trim();
    if (trimmed.length < 10) {
      this.toast.warning('Vui lòng nhập tối thiểu 10 ký tự cho lý do từ chối');
      return;
    }

    if (!this.rejectTargetCourse) {
      return;
    }

    this.rejecting.set(true);
    this.adminService.rejectCourse(this.rejectTargetCourse.id, {
      reason: trimmed,
      category: this.rejectCategory
    }).subscribe({
      next: (response) => {
        this.toast.success(response.message || 'Đã từ chối khóa học');
        this.rejecting.set(false);
        this.closeRejectModal();
        this.loadCourses();
      },
      error: (err) => {
        this.toast.error('Không thể từ chối khóa học: ' + (err.error?.message || err.message || 'Lỗi không xác định'));
        this.rejecting.set(false);
      }
    });
  }

  getStatusText(status: string): string {
    const map: Record<string, string> = {
      DRAFT: 'Nháp',
      PENDING: 'Chờ duyệt',
      APPROVED: 'Đã duyệt',
      REJECTED: 'Bị từ chối'
    };
    return map[status] || status;
  }

  getWorkflowStatus(course: ReviewableCourseState): string {
    return (course.reviewState || course.status || '').toLowerCase();
  }

  getCourseStatusText(course: ReviewableCourseState): string {
    const status = this.getWorkflowStatus(course);
    switch (status) {
      case 'pending':
        return 'Chờ duyệt';
      case 'pending_changes':
        return 'Chờ duyệt cập nhật';
      case 'approved':
        return 'Đã duyệt';
      case 'active':
        return 'Đang hoạt động';
      case 'rejected':
        return 'Bị từ chối';
      case 'changes_requested':
        return 'Yêu cầu chỉnh sửa';
      case 'draft_changes':
        return 'Có thay đổi chưa gửi';
      case 'draft':
        return 'Nháp';
      default:
        return 'Không xác định';
    }
  }

  getCourseStatusClass(course: ReviewableCourseState): string {
    const status = this.getWorkflowStatus(course);
    switch (status) {
      case 'pending':
        return 'status-badge status-pending';
      case 'pending_changes':
        // Khóa đã được phê duyệt trước đó, giảng viên vừa gửi chỉnh sửa — ưu tiên phân biệt với lần đầu.
        return 'status-badge status-pending-changes';
      case 'approved':
      case 'active':
        return 'status-badge status-approved';
      case 'rejected':
      case 'changes_requested':
        return 'status-badge status-rejected';
      default:
        return 'status-badge status-draft';
    }
  }

  canReviewCourse(course: ReviewableCourseState): boolean {
    const status = this.getWorkflowStatus(course);
    return status === 'pending' || status === 'pending_changes';
  }

  /** Type-guard helper — narrows `CourseListItem` to the richer `AdminCourseSummary` shape. */
  asAdminCourse(course: CourseListItem | null): AdminCourseSummary | null {
    return course && 'createdAt' in course ? (course as AdminCourseSummary) : null;
  }

  getDisplayEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) {
      return;
    }
    this.currentPage = page;
    this.loadCourses();
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadCourses();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadCourses();
    }
  }
}
