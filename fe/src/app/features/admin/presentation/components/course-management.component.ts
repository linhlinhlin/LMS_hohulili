import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminCourseSummary } from '../../infrastructure/services/admin.service';
import { LoadingComponent } from '../../../../shared/components/loading/loading.component';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-course-management',
  imports: [RouterModule, FormsModule],
  templateUrl: './course-management.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseManagementComponent implements OnInit {
  protected adminService = inject(AdminService);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);

  // Filter states
  searchQuery = signal('');
  statusFilter = signal('');
  // Data signals
  courses = signal<AdminCourseSummary[]>([]);
  isLoading = signal(true);
  categoryFilter = signal('');

  // Modal state
  showRejectModal = signal(false);
  showDetailModal = signal(false);
  selectedCourse = signal<AdminCourseSummary | null>(null);
  rejectionReason = signal('');

  // Computed properties
  totalCourses = computed(() => {
    const courses = this.courses();
    return Array.isArray(courses) ? courses.length : 0;
  });

  pendingCourses = computed(() => {
    const courses = this.courses();
    return Array.isArray(courses) ? courses.filter(c => c.status === 'pending' || c.status === 'PENDING').length : 0;
  });

  approvedCourses = computed(() => {
    const courses = this.courses();
    return Array.isArray(courses) ? courses.filter(c => c.status === 'approved' || c.status === 'APPROVED').length : 0;
  });

  totalRevenue = computed(() => {
    const courses = this.courses();
    if (!Array.isArray(courses)) return 0;
    return courses.reduce((sum, c) => sum + (c.revenue || 0), 0);
  });

  filteredCourses = computed(() => {
    const courses = this.courses();

    // Safety check: ensure courses is an array
    if (!Array.isArray(courses)) {
      return [];
    }

    let filtered = [...courses];

    // Filter by search query
    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      filtered = filtered.filter((course: AdminCourseSummary) =>
        course.title?.toLowerCase().includes(query) ||
        course.teacherName?.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (this.statusFilter()) {
      const status = this.statusFilter().toUpperCase();
      filtered = filtered.filter((course: AdminCourseSummary) =>
        course.status?.toUpperCase() === status
      );
    }

    // Filter by category
    if (this.categoryFilter()) {
      filtered = filtered.filter((course: AdminCourseSummary) =>
        course.category?.toLowerCase() === this.categoryFilter().toLowerCase()
      );
    }

    return filtered;
  });

  ngOnInit(): void {
    this.loadCourses();
  }

  private loadCourses(): void {
    this.isLoading.set(true);

    this.adminService.getAllCourses().subscribe({
      next: (response) => {
        // Ensure we have an array
        const coursesData = Array.isArray(response.data) ? response.data : [];

        this.courses.set(coursesData);
        this.isLoading.set(false);
      },
      error: () => {
        this.courses.set([]);
        this.isLoading.set(false);
        this.toast.error('Không thể tải danh sách khóa học. Vui lòng thử lại.');
      }
    });
  }

  approveCourse(courseId: string): void {
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

  /**
   * Open course in teacher editor for FULL content view
   * This provides 100% course details: chapters, lessons, students, quiz, etc.
   */
  openFullCourseView(courseId: string): void {
    // Navigate to teacher course editor which has ALL course content
    window.open(`/teacher/courses/${courseId}/editor`, '_blank');
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedCourse.set(null);
  }

  editCourse(courseId: string): void {
    // Navigate to teacher course editor
    window.open(`/teacher/courses/${courseId}/edit`, '_blank');
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
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  getStatusClass(status: string): string {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusText(status: string): string {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case 'pending':
        return 'Chờ phê duyệt';
      case 'approved':
        return 'Đã phê duyệt';
      case 'rejected':
        return 'Bị từ chối';
      case 'active':
        return 'Đang hoạt động';
      case 'archived':
        return 'Lưu trữ';
      default:
        return 'Không xác định';
    }
  }

  getLevelText(level: string): string {
    switch (level) {
      case 'beginner':
        return 'Cơ bản';
      case 'intermediate':
        return 'Trung cấp';
      case 'advanced':
        return 'Nâng cao';
      default:
        return 'Không xác định';
    }
  }

  // Helper methods for status checking (handles various status naming conventions)
  isPendingStatus(status: string): boolean {
    const s = status?.toUpperCase() || '';
    return s === 'PENDING' || s === 'PENDING_APPROVAL' || s === 'PENDING_REVIEW';
  }

  isApprovedStatus(status: string): boolean {
    const s = status?.toUpperCase() || '';
    return s === 'APPROVED' || s === 'ACTIVE' || s === 'PUBLISHED';
  }

  revokeReasonInput = signal('');
  showRevokeModal = signal(false);
  revokingCourseId = signal('');

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
}
