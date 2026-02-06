import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';

import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminCourseSummary } from '../../infrastructure/services/admin.service';
import { LoadingComponent } from '../../../../shared/components/loading/loading.component';

@Component({
  selector: 'app-course-management',
  imports: [RouterModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './course-management.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseManagementComponent implements OnInit {
  protected adminService = inject(AdminService);

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
        this.courses.set([]); // Set empty array on error
        this.isLoading.set(false);
        alert('Không thể tải danh sách khóa học. Vui lòng thử lại.');
      }
    });
  }

  approveCourse(courseId: string): void {
    this.adminService.approveCourse(courseId).subscribe({
      next: () => {
        // Reload courses after approval
        this.loadCourses();
      },
      error: () => {
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
        error: () => {
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

  revokeCourse(courseId: string): void {
    const reason = window.prompt('Nhập lý do thu hồi phê duyệt:', 'Cần xem xét lại nội dung khóa học');
    if (reason) {
      this.adminService.revokeCourse(courseId, reason).subscribe({
        next: () => {
          alert('Đã thu hồi phê duyệt khóa học');
          this.loadCourses();
        },
        error: (error) => {
          alert('Lỗi khi thu hồi phê duyệt: ' + (error.error?.message || error.message || 'Không xác định'));
        }
      });
    }
  }
}
