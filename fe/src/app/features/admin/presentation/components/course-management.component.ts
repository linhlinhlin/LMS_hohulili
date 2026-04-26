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
import { BulkActionBarComponent, BulkAction } from '../../../../shared/components/admin/bulk-action-bar/bulk-action-bar.component';
import { KebabMenuComponent, KebabAction } from '../../../../shared/components/admin/kebab-menu/kebab-menu.component';

@Component({
  selector: 'app-course-management',
  imports: [RouterModule, FormsModule, DialogComponent, BulkActionBarComponent, KebabMenuComponent],
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

  // Reject reason taxonomy — picks one of these (Inspire / Coursera /
  // Udemy review pattern) and the chosen text becomes the seed of the
  // freeform reason field. Keeps reviewers consistent across batches.
  readonly REJECT_REASON_PRESETS = [
    { key: 'INSUFFICIENT_CONTENT', label: 'Nội dung chưa đủ phong phú', text: 'Nội dung khóa học chưa đáp ứng yêu cầu tối thiểu về độ phong phú và đầy đủ. Vui lòng bổ sung tài liệu, video, bài tập và đánh giá để học viên có trải nghiệm học tập trọn vẹn.' },
    { key: 'POOR_QUALITY', label: 'Chất lượng video / âm thanh thấp', text: 'Chất lượng video, âm thanh hoặc tài liệu chưa đạt chuẩn. Vui lòng kiểm tra ánh sáng, âm thanh, hình ảnh và đảm bảo tất cả tài liệu đều rõ ràng.' },
    { key: 'COPYRIGHT', label: 'Vi phạm bản quyền', text: 'Khóa học có sử dụng nội dung không có quyền hợp pháp. Vui lòng thay thế bằng tài liệu do bạn sở hữu hoặc có giấy phép sử dụng.' },
    { key: 'METADATA', label: 'Thông tin / mô tả không đầy đủ', text: 'Tiêu đề, mô tả, danh mục hoặc mục tiêu học tập chưa rõ ràng. Vui lòng cập nhật thông tin chi tiết để học viên dễ dàng tìm và lựa chọn.' },
    { key: 'OTHER', label: 'Lý do khác', text: '' },
  ] as const;

  selectedRejectPreset = signal<string>('INSUFFICIENT_CONTENT');

  // CC-06 — bulk action bar. Per audit guidance, bulk approve is NOT exposed
  // (too high stakes; reviewers must inspect each course individually). Only
  // "Reject" with reason taxonomy + Clear are surfaced.
  bulkActions = computed<BulkAction[]>(() => [
    {
      key: 'reject',
      label: 'Từ chối',
      variant: 'danger',
      ariaLabel: 'Từ chối các khóa học đã chọn',
      icon: 'M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z',
    },
  ]);

  onBulkAction(key: string): void {
    if (key === 'reject') {
      this.openBulkRejectModal();
    }
  }

  onSelectRejectPreset(presetKey: string): void {
    this.selectedRejectPreset.set(presetKey);
    const preset = this.REJECT_REASON_PRESETS.find(p => p.key === presetKey);
    if (preset && preset.text) {
      this.bulkRejectReason.set(preset.text);
    } else if (presetKey === 'OTHER') {
      this.bulkRejectReason.set('');
    }
  }

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

  // --- Per-row kebab menu (CC-10) ---
  // Replaces the 5–7 icon-button stripe per row with a single overflow
  // surface. Navigation actions (preview, detail) come first, then review
  // actions (approve/reject/revoke), then destructive (delete) at the
  // bottom — matches the standard menu hierarchy used in Stripe/Linear.
  rowActions(course: AdminCourseSummary): KebabAction[] {
    const items: KebabAction[] = [];

    // View / preview — always available.
    items.push({
      key: 'preview',
      label: 'Xem trước nội dung',
      ariaLabel: `Xem trước nội dung khóa học ${course.title}`,
      icon: 'M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z',
    });
    items.push({
      key: 'detail',
      label: 'Xem chi tiết',
      ariaLabel: `Xem chi tiết khóa học ${course.title}`,
      icon: 'M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z',
    });

    // Review actions — only when course is in pending state.
    if (this.canReviewCourse(course)) {
      items.push({
        key: 'approve',
        label: 'Phê duyệt',
        ariaLabel: `Phê duyệt khóa học ${course.title}`,
        icon: 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z',
      });
      items.push({
        key: 'reject',
        label: 'Từ chối',
        variant: 'danger',
        ariaLabel: `Từ chối khóa học ${course.title}`,
        icon: 'M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z',
      });
    }

    // Revoke approval — only when already approved/active.
    if (this.canRevokeCourse(course)) {
      items.push({
        key: 'revoke',
        label: 'Thu hồi phê duyệt',
        variant: 'danger',
        ariaLabel: `Thu hồi phê duyệt khóa học ${course.title}`,
        icon: 'M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z',
      });
    }

    // System-admin only — open editor + destructive delete.
    if (this.isSystemAdmin()) {
      items.push({
        key: 'edit',
        label: 'Mở trình biên tập',
        ariaLabel: `Mở trình biên tập khóa học ${course.title}`,
        icon: 'M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z',
      });
      items.push({
        key: 'delete',
        label: 'Xóa khóa học',
        variant: 'danger',
        ariaLabel: `Xóa khóa học ${course.title}`,
        icon: 'M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z',
      });
    }

    return items;
  }

  onRowAction(course: AdminCourseSummary, key: string): void {
    switch (key) {
      case 'preview':
        this.previewContent(course.id);
        break;
      case 'detail':
        this.viewCourse(course.id);
        break;
      case 'approve':
        this.approveCourse(course.id);
        break;
      case 'reject':
        this.openRejectModal(course);
        break;
      case 'revoke':
        this.openRevokeModal(course.id);
        break;
      case 'edit':
        this.editCourse(course.id);
        break;
      case 'delete':
        this.deleteCourse(course);
        break;
    }
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
