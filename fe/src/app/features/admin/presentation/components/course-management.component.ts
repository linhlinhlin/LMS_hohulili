import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminCourseSummary } from '../../infrastructure/services/admin.service';
import { CourseCategoryDTO } from '../../../../api/types/course.types';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { AuthService } from '../../../../core/services/auth.service';
import { exportToCsv } from '../../../../shared/utils/csv-export';

@Component({
  selector: 'app-course-management',
  imports: [RouterModule, FormsModule],
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

  // Role check
  isSystemAdmin = computed(() => this.authService.userRole() === 'admin');

  // Filter states
  searchQuery = signal('');
  statusFilter = signal('');
  categoryFilter = signal('');
  fromDate = signal('');
  toDate = signal('');

  // Data signals
  courses = signal<AdminCourseSummary[]>([]);
  isLoading = signal(true);
  categoryTree = signal<CourseCategoryDTO[]>([]);

  // Bulk selection
  selectedCourses = signal<Set<string>>(new Set());
  selectedCount = computed(() => this.selectedCourses().size);

  // Bulk reject modal
  showBulkRejectModal = signal(false);
  bulkRejectReason = signal('');

  pendingVisibleCourses = computed(() =>
    this.courses().filter(c => c.status?.toLowerCase() === 'pending')
  );
  allPendingSelected = computed(() => {
    const pending = this.pendingVisibleCourses();
    if (pending.length === 0) return false;
    const selected = this.selectedCourses();
    return pending.every(c => selected.has(c.id));
  });

  // Pagination
  currentPage = signal(0);
  pageSize = signal(10);
  totalElements = signal(0);
  totalPages = computed(() => Math.ceil(this.totalElements() / this.pageSize()));

  // Stats from analytics API (system-wide, not page-level)
  totalCourses = computed(() => this.totalElements());
  pendingCourses = signal(0);
  approvedCourses = signal(0);
  totalRevenue = signal(0);

  // Modal state
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
    const params: any = {
      page: this.currentPage(),
      size: this.pageSize()
    };
    if (this.statusFilter()) {
      params.status = this.statusFilter().toUpperCase();
    }
    if (this.searchQuery()) {
      params.search = this.searchQuery();
    }
    if (this.categoryFilter()) {
      params.categoryId = this.categoryFilter();
    }
    if (this.fromDate()) {
      params.fromDate = this.fromDate();
    }
    if (this.toDate()) {
      params.toDate = this.toDate();
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
      error: () => { /* Categories unavailable — filter dropdown shows only "Tất cả danh mục" */ }
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
    if (this.selectedCourse() && this.rejectionReason()) {
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
  }

  viewCourse(courseId: string): void {
    const course = this.courses().find(c => c.id === courseId);
    if (course) {
      this.selectedCourse.set(course);
      this.showDetailModal.set(true);
    }
  }

  openFullCourseView(courseId: string): void {
    window.open(`/teacher/courses/${courseId}/editor`, '_blank');
  }

  previewContent(courseId: string): void {
    this.router.navigate(['/admin/courses', courseId, 'preview']);
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedCourse.set(null);
  }

  editCourse(courseId: string): void {
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
    if (!reason.trim() || !courseId) return;

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

  // Pagination
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

  // Formatting
  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'pending': return 'badge badge-pending';
      case 'approved': return 'badge badge-approved';
      case 'rejected': return 'badge badge-rejected';
      case 'active': return 'badge badge-active';
      case 'draft': return 'badge badge-draft';
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

  getLevelText(level: string): string {
    switch (level) {
      case 'beginner': return 'Cơ bản';
      case 'intermediate': return 'Trung cấp';
      case 'advanced': return 'Nâng cao';
      default: return 'Không xác định';
    }
  }

  // ============================================
  // BULK SELECTION
  // ============================================

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

  // ============================================
  // BULK ACTIONS
  // ============================================

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

  // ============================================
  // CSV EXPORT
  // ============================================

  exportCoursesToCsv(): void {
    const headers = ['Mã', 'Tên', 'Giảng viên', 'Trạng thái', 'Học viên', 'Ngày tạo'];
    const rows = this.courses().map(c => [
      c.code || '',
      c.title || '',
      c.teacherName || '',
      this.getStatusText(c.status),
      String(c.enrolledCount || 0),
      c.createdAt ? this.formatDate(c.createdAt) : ''
    ]);
    const today = new Date().toISOString().slice(0, 10);
    exportToCsv(headers, rows, `courses_${today}.csv`);
    this.toast.success('Đã xuất CSV thành công');
  }

  isPendingStatus(status: string): boolean {
    return status?.toLowerCase() === 'pending';
  }

  isApprovedStatus(status: string): boolean {
    const s = status?.toLowerCase();
    return s === 'approved' || s === 'active';
  }
}
