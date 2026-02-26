import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminCourseSummary } from '../../infrastructure/services/admin.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-course-management',
  imports: [RouterModule, FormsModule],
  templateUrl: './course-management.component.html',
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

  // Data signals
  courses = signal<AdminCourseSummary[]>([]);
  isLoading = signal(true);
  categories = signal<string[]>([]);

  // Pagination
  currentPage = signal(0);
  pageSize = signal(10);
  totalElements = signal(0);
  totalPages = computed(() => Math.ceil(this.totalElements() / this.pageSize()));

  // Stats from pagination metadata (server-side)
  totalCourses = computed(() => this.totalElements());
  pendingCourses = computed(() => {
    return this.courses().filter(c => c.status?.toLowerCase() === 'pending').length;
  });
  approvedCourses = computed(() => {
    return this.courses().filter(c => c.status?.toLowerCase() === 'approved').length;
  });
  totalRevenue = computed(() => {
    return this.courses().reduce((sum, c) => sum + (c.revenue || 0), 0);
  });

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
  }

  loadCourses(): void {
    this.isLoading.set(true);
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
    // Categories loaded from API when endpoint is available.
    // For now, categories signal stays empty — filter dropdown shows only "Tất cả danh mục".
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
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'active': return 'bg-[#0056D2]/10 text-[#004BB5]';
      case 'draft': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-800';
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

  isPendingStatus(status: string): boolean {
    return status?.toLowerCase() === 'pending';
  }

  isApprovedStatus(status: string): boolean {
    const s = status?.toLowerCase();
    return s === 'approved' || s === 'active';
  }
}
