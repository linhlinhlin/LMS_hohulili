import { Component, signal, inject, OnInit, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  selectedCourse: CourseListItem | null = null;

  detailModalOpen = signal(false);
  courseDetails: any = null;
  loadingDetails = signal(false);

  reviewHistory = signal<ReviewEvent[]>([]);
  loadingHistory = signal(false);

  /** Newest rejection category (from history) — used to enrich rejection banner in detail modal. */
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

  showPreview = signal(false);
  previewContent$ = signal<any[]>([]);
  loadingPreview = signal(false);

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
          this.courses.set(response.data || []);
          this.totalItems = response.pagination?.totalElements || response.pagination?.totalItems || 0;
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
        this.courses.set(response.data || []);
        this.totalItems = response.pagination?.totalElements || response.pagination?.totalItems || 0;
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Không thể tải danh sách khóa học. Vui lòng thử lại.');
        this.loading.set(false);
      }
    });
  }

  previewContent(courseId: string) {
    this.router.navigateByUrl(`${getAdminPortalBase(this.authService.userRole())}/courses/${courseId}/preview`);
  }

  viewDetails(course: CourseListItem) {
    this.selectedCourse = course;
    this.courseDetails = course;
    this.detailModalOpen.set(true);
    this.showPreview.set(false);
    this.loadReviewHistory(course.id);
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

  togglePreview() {
    this.showPreview.update(v => !v);
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

  closeDetailModal() {
    this.detailModalOpen.set(false);
    this.courseDetails = null;
    this.selectedCourse = null;
  }

  approveCourseFromModal() {
    if (!this.courseDetails) {
      return;
    }
    const courseId = this.courseDetails.id;
    this.closeDetailModal();
    this.approveCourse(courseId);
  }

  showRejectModalFromDetail() {
    if (!this.courseDetails) {
      return;
    }
    const course = this.courseDetails;
    this.closeDetailModal();
    this.showRejectModal(course);
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
        if (this.detailModalOpen()) {
          this.closeDetailModal();
        }
        this.loadCourses();
      },
      error: (err) => {
        this.toast.error('Không thể duyệt khóa học: ' + (err.error?.message || err.message || 'Lỗi không xác định'));
        this.approving.set(null);
      }
    });
  }

  showRejectModal(course: CourseListItem) {
    this.selectedCourse = course;
    this.rejectComment = '';
    this.rejectCategory = 'INSUFFICIENT_CONTENT';
    this.rejectModalOpen.set(true);
  }

  closeRejectModal() {
    this.rejectModalOpen.set(false);
    this.selectedCourse = null;
    this.rejectComment = '';
    this.rejectCategory = 'INSUFFICIENT_CONTENT';
  }

  confirmReject() {
    if (!this.rejectComment.trim()) {
      this.toast.warning('Vui lòng nhập chi tiết lý do từ chối');
      return;
    }

    if (!this.selectedCourse) {
      return;
    }

    this.rejecting.set(true);
    this.adminService.rejectCourse(this.selectedCourse.id, {
      reason: this.rejectComment.trim(),
      category: this.rejectCategory
    }).subscribe({
      next: (response) => {
        this.toast.success(response.message || 'Đã từ chối khóa học');
        this.rejecting.set(false);
        this.closeRejectModal();
        if (this.detailModalOpen()) {
          this.closeDetailModal();
        }
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
