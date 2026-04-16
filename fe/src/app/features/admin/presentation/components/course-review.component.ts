import { Component, signal, inject, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService, AdminCourseSummary, PendingCourseSummary, ReviewEvent } from '../../infrastructure/services/admin.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';

// Union type for courses that can be either pending or full course summary
type CourseListItem = AdminCourseSummary | (PendingCourseSummary & { status: string });

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-course-review',
  imports: [CommonModule, FormsModule],
  templateUrl: './course-review.component.html',
  styleUrl: './course-review.component.scss'
})
export class CourseReviewComponent implements OnInit {
  private adminService = inject(AdminService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);
  
  courses = signal<CourseListItem[]>([]);
  loading = signal(false);
  error = signal('');
  searchKeyword = '';
  statusFilter = 'PENDING';
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  
  approving = signal<string | null>(null);
  rejecting = signal(false);
  rejectModalOpen = signal(false);
  rejectComment = '';
  selectedCourse: CourseListItem | null = null;
  
  // Course detail modal
  detailModalOpen = signal(false);
  courseDetails: any = null;
  loadingDetails = signal(false);

  // Review history
  reviewHistory = signal<ReviewEvent[]>([]);
  loadingHistory = signal(false);

  // Content preview
  showPreview = signal(false);
  previewContent$ = signal<any[]>([]);
  loadingPreview = signal(false);

  ngOnInit() {
    this.loadCourses();
  }

  loadCourses() {
    this.loading.set(true);
    this.error.set('');
    
    const params: any = {
      page: this.currentPage - 1, // Backend uses 0-based indexing
      size: this.pageSize
    };
    
    if (this.searchKeyword.trim()) {
      params.search = this.searchKeyword.trim();
    }
    
    if (this.statusFilter) {
      params.status = this.statusFilter;
    }
    
    // Use appropriate endpoint based on filter
    if (this.statusFilter === 'PENDING') {
      this.adminService.getPendingCourses(params).subscribe({
        next: (response) => {
          // Add status field to pending courses
          const coursesWithStatus = (response.data || []).map(course => ({
            ...course,
            status: 'PENDING'
          }));
          this.courses.set(coursesWithStatus);
          this.totalItems = response.pagination?.totalElements || response.pagination?.totalItems || 0;
          this.loading.set(false);
        },
        error: (err: any) => {
          this.error.set('Không thể tải danh sách khóa học. Vui lòng thử lại.');
          this.loading.set(false);
        }
      });
    } else {
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
  }

  previewContent(courseId: string) {
    this.router.navigate(['/admin/courses', courseId, 'preview']);
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
      'SUBMITTED': 'Gửi duyệt',
      'APPROVED': 'Phê duyệt',
      'REJECTED': 'Từ chối',
      'REVOKED': 'Thu hồi',
      'CHANGES_REQUESTED': 'Yêu cầu sửa',
      'RESUBMITTED': 'Gửi lại'
    };
    return map[action] || action;
  }

  getActionColor(action: string): string {
    const map: Record<string, string> = {
      'SUBMITTED': 'text-blue-600',
      'APPROVED': 'text-green-600',
      'REJECTED': 'text-red-600',
      'REVOKED': 'text-orange-600',
      'CHANGES_REQUESTED': 'text-amber-600',
      'RESUBMITTED': 'text-blue-600'
    };
    return map[action] || 'text-gray-600';
  }

  formatDateTime(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  
  closeDetailModal() {
    this.detailModalOpen.set(false);
    this.courseDetails = null;
    this.selectedCourse = null;
  }
  
  approveCourseFromModal() {
    if (!this.courseDetails) return;
    const courseId = this.courseDetails.id;
    this.closeDetailModal(); // Đóng modal trước khi approve
    this.approveCourse(courseId);
  }
  
  showRejectModalFromDetail() {
    if (!this.courseDetails) return;
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
    if (!confirmed) return;

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
    this.rejectModalOpen.set(true);
  }

  closeRejectModal() {
    this.rejectModalOpen.set(false);
    this.selectedCourse = null;
    this.rejectComment = '';
  }

  confirmReject() {
    if (!this.rejectComment.trim()) {
      this.toast.warning('Vui lòng nhập lý do từ chối');
      return;
    }

    if (!this.selectedCourse) {
      return;
    }

    this.rejecting.set(true);
    this.adminService.rejectCourse(this.selectedCourse.id, this.rejectComment.trim()).subscribe({
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
      'DRAFT': 'Nháp',
      'PENDING': 'Chờ duyệt',
      'APPROVED': 'Đã duyệt',
      'REJECTED': 'Bị từ chối'
    };
    return map[status] || status;
  }
  
  getDisplayEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }

  // Pagination methods
  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }
  
  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
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
