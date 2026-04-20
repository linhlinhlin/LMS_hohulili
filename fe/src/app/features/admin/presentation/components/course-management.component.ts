import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminCourseSummary } from '../../infrastructure/services/admin.service';
import { CourseCategoryDTO } from '../../../../api/types/course.types';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { AuthService } from '../../../../core/services/auth.service';
import { exportToCsv } from '../../../../shared/utils/csv-export';
import { getAdminPortalBase } from '../../../../core/utils/portal-route.util';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';

@Component({
  selector: 'app-course-management',
  imports: [RouterModule, FormsModule, DialogComponent],
  templateUrl: './course-management.component.html',
  styleUrl: './course-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseManagementComponent implements OnInit {
  protected adminService = inject(AdminService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);
  private authService = inject(AuthService);

  isSystemAdmin = computed(() => this.authService.userRole() === 'admin');
  adminPortalBase = computed(() => getAdminPortalBase(this.authService.userRole()));
  organizationName = computed(() => this.authService.currentUser()?.organizationName || '');

  pageTitle = computed(() =>
    this.isSystemAdmin() ? 'Quản lý khóa học hệ thống' : 'Khóa học của tổ chức'
  );

  pageSubtitle = computed(() =>
    this.isSystemAdmin()
      ? 'Phê duyệt và quản lý tất cả khóa học trong hệ thống'
      : 'Duyệt, theo dõi và hỗ trợ các khóa học do giảng viên trong tổ chức phụ trách'
  );

  totalCoursesLabel = computed(() =>
    this.isSystemAdmin() ? 'Tổng khóa học' : 'Khóa học của tổ chức'
  );

  totalCoursesSubLabel = computed(() =>
    this.isSystemAdmin() ? `${this.approvedCourses()} đã phê duyệt` : `${this.approvedCourses()} đang vận hành`
  );

  revenueLabel = computed(() =>
    this.isSystemAdmin() ? 'Tổng doanh thu' : 'Doanh thu tổ chức'
  );

  revenueSubLabel = computed(() =>
    this.isSystemAdmin() ? 'Từ các khóa học' : 'Trong phạm vi tổ chức'
  );

  emptyTitle = computed(() =>
    this.isSystemAdmin() ? 'Không có khóa học nào' : 'Chưa có khóa học phù hợp'
  );

  emptyDescription = computed(() =>
    this.isSystemAdmin()
      ? 'Chưa có khóa học nào được nộp để phê duyệt hoặc phù hợp với bộ lọc'
      : 'Chưa có khóa học nào trong tổ chức khớp với bộ lọc hiện tại'
  );

  searchPlaceholder = computed(() =>
    this.isSystemAdmin() ? 'Tìm kiếm khóa học...' : 'Tìm kiếm khóa học trong tổ chức...'
  );

  searchQuery = signal('');
  statusFilter = signal('');
  categoryFilter = signal('');
  fromDate = signal('');
  toDate = signal('');

  courses = signal<AdminCourseSummary[]>([]);
  isLoading = signal(true);
  categoryTree = signal<CourseCategoryDTO[]>([]);

  selectedCourses = signal<Set<string>>(new Set());
  selectedCount = computed(() => this.selectedCourses().size);

  showBulkRejectModal = signal(false);
  bulkRejectReason = signal('');

  pendingVisibleCourses = computed(() =>
    this.courses().filter(course => this.canReviewCourse(course))
  );

  allPendingSelected = computed(() => {
    const pending = this.pendingVisibleCourses();
    if (pending.length === 0) return false;
    const selected = this.selectedCourses();
    return pending.every(c => selected.has(c.id));
  });

  currentPage = signal(0);
  pageSize = signal(10);
  totalElements = signal(0);
  totalPages = computed(() => Math.ceil(this.totalElements() / this.pageSize()));

  totalCourses = computed(() => this.totalElements());
  pendingCourses = signal(0);
  approvedCourses = signal(0);
  totalRevenue = signal(0);

  showRejectModal = signal(false);
  showDetailModal = signal(false);
  selectedCourse = signal<AdminCourseSummary | null>(null);
  rejectionReason = signal('');
  revokeReasonInput = signal('');
  showRevokeModal = signal(false);
  revokingCourseId = signal('');

  ngOnInit(): void {
    this.loadCourses();
    this.loadCategories();
    this.loadStats();
  }

  private loadStats(): void {
    this.adminService.getSystemAnalytics().subscribe({
      next: (analytics) => {
        this.pendingCourses.set(analytics.pendingCourses);
        this.approvedCourses.set(analytics.approvedCourses);
        this.totalRevenue.set(analytics.totalRevenue);
      }
    });
  }

  loadCourses(): void {
    this.isLoading.set(true);
    this.clearSelection();

    const params: Record<string, unknown> = {
      page: this.currentPage(),
      size: this.pageSize()
    };

    if (this.statusFilter()) {
      params['status'] = this.statusFilter().toUpperCase();
    }
    if (this.searchQuery()) {
      params['search'] = this.searchQuery();
    }
    if (this.categoryFilter()) {
      params['categoryId'] = this.categoryFilter();
    }
    if (this.fromDate()) {
      params['fromDate'] = this.fromDate();
    }
    if (this.toDate()) {
      params['toDate'] = this.toDate();
    }

    this.adminService.getAllCourses(params).subscribe({
      next: (response) => {
        const coursesData = Array.isArray(response.data) ? response.data : [];
        this.courses.set(coursesData);
        this.totalElements.set(response.pagination?.totalElements || coursesData.length);
        this.isLoading.set(false);
      },
      error: () => {
        this.courses.set([]);
        this.isLoading.set(false);
        this.toast.error('Không thể tải danh sách khóa học. Vui lòng thử lại.');
      }
    });
  }

  onFilterChange(): void {
    this.currentPage.set(0);
    this.loadCourses();
  }

  private loadCategories(): void {
    this.adminService.getCourseCategories().subscribe({
      next: (tree) => this.categoryTree.set(tree),
      error: () => { /* noop */ }
    });
  }

  async approveCourse(courseId: string): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Phê duyệt khóa học',
      message: 'Bạn có chắc chắn muốn phê duyệt khóa học này? Khóa học sẽ được xuất bản cho học viên.',
      confirmText: 'Phê duyệt',
      variant: 'warning'
    });
    if (!confirmed) return;

    this.adminService.approveCourse(courseId).subscribe({
      next: () => {
        this.toast.success('Đã phê duyệt khóa học thành công');
        this.loadCourses();
      },
      error: (err) => {
        this.toast.error('Không thể phê duyệt: ' + (err.error?.message || 'Vui lòng thử lại'));
      }
    });
  }

  openRejectModal(course: AdminCourseSummary): void {
    this.selectedCourse.set(course);
    this.showRejectModal.set(true);
    this.rejectionReason.set('');
  }

  closeRejectModal(): void {
    this.showRejectModal.set(false);
    this.selectedCourse.set(null);
    this.rejectionReason.set('');
  }

  rejectCourse(): void {
    if (!this.selectedCourse() || !this.rejectionReason()) {
      return;
    }

    this.adminService.rejectCourse(this.selectedCourse()!.id, this.rejectionReason()).subscribe({
      next: () => {
        this.toast.success('Đã từ chối khóa học');
        this.closeRejectModal();
        this.loadCourses();
      },
      error: (err) => {
        this.toast.error('Không thể từ chối: ' + (err.error?.message || 'Vui lòng thử lại'));
      }
    });
  }

  viewCourse(courseId: string): void {
    const course = this.courses().find(c => c.id === courseId);
    if (!course) {
      return;
    }

    this.selectedCourse.set(course);
    this.showDetailModal.set(true);
  }

  openFullCourseView(courseId: string): void {
    if (this.isSystemAdmin()) {
      window.open(`/teacher/courses/${courseId}/editor`, '_blank');
      return;
    }

    window.open(`${this.adminPortalBase()}/courses/${courseId}/preview`, '_blank');
  }

  previewContent(courseId: string): void {
    this.router.navigateByUrl(`${this.adminPortalBase()}/courses/${courseId}/preview`);
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedCourse.set(null);
  }

  editCourse(courseId: string): void {
    if (!this.isSystemAdmin()) {
      this.previewContent(courseId);
      return;
    }

    window.open(`/teacher/courses/${courseId}/editor`, '_blank');
  }

  async deleteCourse(course: AdminCourseSummary): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa khóa học',
      message: `Bạn có chắc chắn muốn xóa khóa học "${course.title}"? Hành động này không thể hoàn tác.`,
      confirmText: 'Xóa',
      variant: 'danger'
    });
    if (!confirmed) return;

    this.adminService.deleteCourse(course.id).subscribe({
      next: () => {
        this.toast.success('Đã xóa khóa học thành công');
        this.loadCourses();
      },
      error: (err) => {
        this.toast.error('Không thể xóa: ' + (err.error?.message || 'Vui lòng thử lại'));
      }
    });
  }

  openRevokeModal(courseId: string): void {
    this.revokingCourseId.set(courseId);
    this.revokeReasonInput.set('Cần xem xét lại nội dung khóa học');
    this.showRevokeModal.set(true);
  }

  closeRevokeModal(): void {
    this.showRevokeModal.set(false);
    this.revokingCourseId.set('');
    this.revokeReasonInput.set('');
  }

  confirmRevokeCourse(): void {
    const reason = this.revokeReasonInput();
    const courseId = this.revokingCourseId();
    if (!reason.trim() || !courseId) {
      return;
    }

    this.adminService.revokeCourse(courseId, reason).subscribe({
      next: () => {
        this.toast.success('Đã thu hồi phê duyệt khóa học');
        this.closeRevokeModal();
        this.loadCourses();
      },
      error: (error) => {
        this.toast.error('Lỗi khi thu hồi phê duyệt: ' + (error.error?.message || error.message || 'Không xác định'));
      }
    });
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages()) return;
    this.currentPage.set(page);
    this.loadCourses();
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages() - 1) {
      this.currentPage.update(p => p + 1);
      this.loadCourses();
    }
  }

  previousPage(): void {
    if (this.currentPage() > 0) {
      this.currentPage.update(p => p - 1);
      this.loadCourses();
    }
  }

  getDisplayStart(): number {
    return this.currentPage() * this.pageSize() + 1;
  }

  getDisplayEnd(): number {
    return Math.min((this.currentPage() + 1) * this.pageSize(), this.totalElements());
  }

  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'pending':
      case 'pending_changes':
        return 'badge badge-pending';
      case 'approved':
      case 'active':
        return 'badge badge-approved';
      case 'rejected':
      case 'changes_requested':
        return 'badge badge-rejected';
      case 'draft':
      case 'draft_changes':
        return 'badge badge-draft';
      default: return 'badge badge-default';
    }
  }

  getStatusText(status: string): string {
    switch (status?.toLowerCase()) {
      case 'pending': return 'Chờ phê duyệt';
      case 'approved': return 'Đã phê duyệt';
      case 'rejected': return 'Bị từ chối';
      case 'active': return 'Đang hoạt động';
      case 'draft': return 'Nháp';
      default: return 'Không xác định';
    }
  }

  getWorkflowStatus(course: Pick<AdminCourseSummary, 'status' | 'reviewState'>): string {
    return course.reviewState || course.status || '';
  }

  getCourseStatusClass(course: Pick<AdminCourseSummary, 'status' | 'reviewState'>): string {
    const normalizedStatus = this.getWorkflowStatus(course).toLowerCase();
    switch (normalizedStatus) {
      case 'pending':
      case 'pending_changes':
        return 'badge badge-pending';
      case 'approved':
      case 'active':
        return 'badge badge-approved';
      case 'rejected':
      case 'changes_requested':
        return 'badge badge-rejected';
      case 'draft':
      case 'draft_changes':
        return 'badge badge-draft';
      default:
        return 'badge badge-default';
    }
  }

  getCourseStatusText(course: Pick<AdminCourseSummary, 'status' | 'reviewState'>): string {
    const normalizedStatus = this.getWorkflowStatus(course).toLowerCase();
    switch (normalizedStatus) {
      case 'pending':
        return 'Chờ phê duyệt';
      case 'pending_changes':
        return 'Chờ duyệt cập nhật';
      case 'approved':
        return 'Đã phê duyệt';
      case 'rejected':
        return 'Bị từ chối';
      case 'changes_requested':
        return 'Yêu cầu chỉnh sửa';
      case 'active':
        return 'Đang hoạt động';
      case 'draft':
        return 'Nháp';
      case 'draft_changes':
        return 'Có thay đổi chưa gửi';
      default:
        return 'Không xác định';
    }
  }

  canReviewCourse(course: Pick<AdminCourseSummary, 'status' | 'reviewState'>): boolean {
    const normalizedStatus = this.getWorkflowStatus(course).toLowerCase();
    return normalizedStatus === 'pending' || normalizedStatus === 'pending_changes';
  }

  canRevokeCourse(course: Pick<AdminCourseSummary, 'status' | 'reviewState'>): boolean {
    const normalizedStatus = this.getWorkflowStatus(course).toLowerCase();
    return normalizedStatus === 'approved' || normalizedStatus === 'active';
  }

  getLevelText(level: string): string {
    switch (level) {
      case 'beginner': return 'Cơ bản';
      case 'intermediate': return 'Trung cấp';
      case 'advanced': return 'Nâng cao';
      default: return 'Không xác định';
    }
  }

  toggleSelectAll(): void {
    const pending = this.pendingVisibleCourses();
    if (this.allPendingSelected()) {
      this.selectedCourses.set(new Set());
    } else {
      this.selectedCourses.set(new Set(pending.map(c => c.id)));
    }
  }

  toggleCourseSelection(courseId: string): void {
    const current = new Set(this.selectedCourses());
    if (current.has(courseId)) {
      current.delete(courseId);
    } else {
      current.add(courseId);
    }
    this.selectedCourses.set(current);
  }

  isCourseSelected(courseId: string): boolean {
    return this.selectedCourses().has(courseId);
  }

  clearSelection(): void {
    this.selectedCourses.set(new Set());
  }

  async bulkApprove(): Promise<void> {
    const ids = Array.from(this.selectedCourses());
    if (ids.length === 0) return;

    const confirmed = await this.confirmDialog.confirm({
      title: 'Phê duyệt hàng loạt',
      message: `Bạn có chắc chắn muốn phê duyệt ${ids.length} khóa học đã chọn?`,
      confirmText: 'Phê duyệt',
      variant: 'warning'
    });
    if (!confirmed) return;

    this.adminService.bulkApproveCourses(ids).subscribe({
      next: (result) => {
        if (result.failed > 0) {
          this.toast.warning(`Đã duyệt ${result.success}/${result.total} khóa học. ${result.failed} thất bại.`);
        } else {
          this.toast.success(`Đã duyệt ${result.success}/${result.total} khóa học`);
        }
        this.clearSelection();
        this.loadCourses();
      },
      error: (err) => {
        this.toast.error('Không thể duyệt hàng loạt: ' + (err.error?.message || 'Vui lòng thử lại'));
      }
    });
  }

  openBulkRejectModal(): void {
    if (this.selectedCourses().size === 0) return;
    this.bulkRejectReason.set('');
    this.showBulkRejectModal.set(true);
  }

  closeBulkRejectModal(): void {
    this.showBulkRejectModal.set(false);
    this.bulkRejectReason.set('');
  }

  async confirmBulkReject(): Promise<void> {
    const ids = Array.from(this.selectedCourses());
    const reason = this.bulkRejectReason();
    if (ids.length === 0 || !reason.trim()) return;

    const confirmed = await this.confirmDialog.confirm({
      title: 'Từ chối hàng loạt',
      message: `Bạn có chắc chắn muốn từ chối ${ids.length} khóa học đã chọn?`,
      confirmText: 'Từ chối',
      variant: 'danger'
    });
    if (!confirmed) return;

    this.adminService.bulkRejectCourses(ids, reason).subscribe({
      next: (result) => {
        if (result.failed > 0) {
          this.toast.warning(`Đã từ chối ${result.success}/${result.total} khóa học. ${result.failed} thất bại.`);
        } else {
          this.toast.success(`Đã từ chối ${result.success}/${result.total} khóa học`);
        }
        this.closeBulkRejectModal();
        this.clearSelection();
        this.loadCourses();
      },
      error: (err) => {
        this.toast.error('Không thể từ chối hàng loạt: ' + (err.error?.message || 'Vui lòng thử lại'));
      }
    });
  }

  exportCoursesToCsv(): void {
    const headers = ['Mã', 'Tên', 'Giảng viên', 'Trạng thái', 'Học viên', 'Ngày tạo'];
    const rows = this.courses().map(c => [
      c.code || '',
      c.title || '',
      c.teacherName || '',
      this.getCourseStatusText(c),
      String(c.enrolledCount || 0),
      c.createdAt ? this.formatDate(c.createdAt) : ''
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const filePrefix = this.isSystemAdmin() ? 'courses' : 'org_courses';
    exportToCsv(headers, rows, `${filePrefix}_${today}.csv`);
    this.toast.success('Đã xuất CSV thành công');
  }

}
