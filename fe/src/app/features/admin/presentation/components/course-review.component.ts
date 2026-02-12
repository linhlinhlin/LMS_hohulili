import { Component, signal, inject, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminCourseSummary, PendingCourseSummary } from '../../infrastructure/services/admin.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';

// Union type for courses that can be either pending or full course summary
type CourseListItem = AdminCourseSummary | (PendingCourseSummary & { status: string });

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-course-review',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-7xl mx-auto">
        <h1 class="text-3xl font-bold text-gray-900 mb-6">Duyệt khóa học</h1>
    
        <!-- Search & Filter -->
        <div class="bg-white rounded-lg shadow mb-6 p-4">
          <div class="flex gap-3">
            <input
              [(ngModel)]="searchKeyword"
              (keyup.enter)="loadCourses()"
              class="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0056D2]"
              placeholder="Tìm kiếm theo tên khóa học hoặc giảng viên..." />
              <select
                [(ngModel)]="statusFilter"
                (ngModelChange)="loadCourses()"
                class="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0056D2]">
                <option value="">Tất cả trạng thái</option>
                <option value="PENDING">Chờ duyệt</option>
                <option value="APPROVED">Đã duyệt</option>
                <option value="REJECTED">Bị từ chối</option>
                <option value="DRAFT">Nháp</option>
              </select>
              <button
                (click)="loadCourses()"
                class="px-5 py-2 bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5]">
                Tìm kiếm
              </button>
            </div>
          </div>
    
          <!-- Courses Table -->
          <div class="bg-white rounded-lg shadow overflow-hidden">
            @if (loading()) {
              <div class="p-8 text-center text-gray-500">
                Đang tải...
              </div>
            }
    
            @if (error()) {
              <div class="p-8 text-center text-red-600">
                {{ error() }}
              </div>
            }
    
            @if (!loading() && !error()) {
              <table class="min-w-full">
                <thead class="bg-gray-50 border-b">
                  <tr>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Khóa học</th>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Giảng viên</th>
                    <th class="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                    <th class="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">Thao tác</th>
                  </tr>
                </thead>
                <tbody class="divide-y">
                  @for (course of courses(); track course) {
                    <tr class="hover:bg-gray-50">
                      <td class="px-6 py-4">
                        <div class="font-semibold text-gray-900">{{ course.title }}</div>
                        <div class="text-sm text-gray-500">{{ course.code }}</div>
                      </td>
                      <td class="px-6 py-4">
                        <div class="text-sm text-gray-900">{{ course.teacherName }}</div>
                        <div class="text-xs text-gray-500">{{ course.teacherEmail }}</div>
                      </td>
                      <td class="px-6 py-4 text-center">
                        <span class="inline-flex px-2 py-1 rounded-full text-xs font-medium"
                        [ngClass]="{
                          'bg-green-100 text-green-700': course.status === 'APPROVED',
                          'bg-amber-100 text-amber-700': course.status === 'PENDING',
                          'bg-red-100 text-red-700': course.status === 'REJECTED',
                          'bg-gray-100 text-gray-600': course.status === 'DRAFT'
                        }">
                          {{ getStatusText(course.status) }}
                        </span>
                      </td>
                      <td class="px-6 py-4 text-center">
                        <div class="flex justify-center gap-2">
                          <button
                            (click)="viewDetails(course)"
                            class="px-3 py-1 bg-[#0056D2]/5 text-[#0056D2] hover:bg-[#0056D2]/10 rounded text-xs font-medium">
                            Xem chi tiết
                          </button>
                          @if (course.status === 'PENDING') {
                            <button
                              (click)="approveCourse(course.id)"
                              [disabled]="approving() === course.id"
                              class="px-3 py-1 bg-green-50 text-green-600 hover:bg-green-100 rounded text-xs font-medium disabled:opacity-50">
                              Duyệt
                            </button>
                          }
                          @if (course.status === 'PENDING') {
                            <button
                              (click)="showRejectModal(course)"
                              class="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded text-xs font-medium">
                              Từ chối
                            </button>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            }
    
            @if (!loading() && !error() && courses().length === 0) {
              <div class="p-8 text-center text-gray-500">
                Không tìm thấy khóa học nào
              </div>
            }
    
            <!-- Pagination -->
            @if (!loading() && !error() && courses().length > 0) {
              <div class="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
                <div class="text-sm text-gray-600">
                  Hiển thị {{ (currentPage - 1) * pageSize + 1 }} - {{ getDisplayEnd() }} trong tổng số {{ totalItems }} khóa học
                </div>
                <div class="flex gap-2">
                  <button
                    (click)="previousPage()"
                    [disabled]="currentPage === 1"
                    class="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                    Trước
                  </button>
                  <span class="px-3 py-1 text-sm text-gray-600">
                    Trang {{ currentPage }} / {{ totalPages }}
                  </span>
                  <button
                    (click)="nextPage()"
                    [disabled]="currentPage >= totalPages"
                    class="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                    Sau
                  </button>
                </div>
              </div>
            }
          </div>
    
          <!-- Course Detail Modal -->
          @if (detailModalOpen()) {
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <!-- Modal Header -->
                <div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                  <h3 class="text-xl font-semibold">Chi tiết khóa học</h3>
                  <button
                    (click)="closeDetailModal()"
                    class="text-gray-400 hover:text-gray-600">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
                <!-- Modal Body -->
                @if (courseDetails) {
                  <div class="p-6">
                    <!-- Course Info -->
                    <div class="mb-6">
                      <div class="flex items-start justify-between mb-4">
                        <div class="flex-1">
                          <h4 class="text-2xl font-bold text-gray-900 mb-2">{{ courseDetails.title }}</h4>
                          <p class="text-sm text-gray-500 mb-2">Mã khóa học: {{ courseDetails.code }}</p>
                        </div>
                        <span class="inline-flex px-3 py-1 rounded-full text-sm font-medium ml-4"
                        [ngClass]="{
                          'bg-green-100 text-green-700': courseDetails.status === 'APPROVED',
                          'bg-amber-100 text-amber-700': courseDetails.status === 'PENDING',
                          'bg-red-100 text-red-700': courseDetails.status === 'REJECTED',
                          'bg-gray-100 text-gray-600': courseDetails.status === 'DRAFT'
                        }">
                          {{ getStatusText(courseDetails.status) }}
                        </span>
                      </div>
                      <div class="prose max-w-none">
                        <p class="text-gray-700">{{ courseDetails.description }}</p>
                      </div>
                    </div>
                    <!-- Teacher Info -->
                    <div class="bg-gray-50 rounded-lg p-4 mb-6">
                      <h5 class="font-semibold text-gray-900 mb-2">Thông tin giảng viên</h5>
                      <div class="text-sm text-gray-700">
                        <p><strong>Tên:</strong> {{ courseDetails.teacherName }}</p>
                        @if (courseDetails.teacherEmail) {
                          <p><strong>Email:</strong> {{ courseDetails.teacherEmail }}</p>
                        }
                      </div>
                    </div>
                    <!-- Course Stats -->
                    <div class="grid grid-cols-3 gap-4 mb-6">
                      <div class="bg-[#0056D2]/5 rounded-lg p-4 text-center">
                        <div class="text-2xl font-bold text-[#0056D2]">{{ courseDetails.sectionsCount || 0 }}</div>
                        <div class="text-sm text-gray-600">Chương</div>
                      </div>
                      @if (courseDetails.enrolledCount !== undefined) {
                        <div class="bg-green-50 rounded-lg p-4 text-center">
                          <div class="text-2xl font-bold text-green-600">{{ courseDetails.enrolledCount }}</div>
                          <div class="text-sm text-gray-600">Học viên</div>
                        </div>
                      }
                      @if (courseDetails.assignmentsCount !== undefined) {
                        <div class="bg-purple-50 rounded-lg p-4 text-center">
                          <div class="text-2xl font-bold text-purple-600">{{ courseDetails.assignmentsCount }}</div>
                          <div class="text-sm text-gray-600">Bài tập</div>
                        </div>
                      }
                    </div>
                    <!-- Dates -->
                    <div class="border-t pt-4 text-sm text-gray-600">
                      <p><strong>Ngày tạo:</strong> {{ courseDetails.createdAt | date:'dd/MM/yyyy HH:mm' }}</p>
                      @if (courseDetails.submittedAt) {
                        <p><strong>Ngày gửi duyệt:</strong> {{ courseDetails.submittedAt | date:'dd/MM/yyyy HH:mm' }}</p>
                      }
                      @if (courseDetails.approvedAt) {
                        <p><strong>Ngày duyệt:</strong> {{ courseDetails.approvedAt | date:'dd/MM/yyyy HH:mm' }}</p>
                      }
                      @if (courseDetails.rejectionReason) {
                        <p class="mt-2 p-3 bg-red-50 border border-red-200 rounded">
                          <strong class="text-red-700">Lý do từ chối:</strong><br>
                          <span class="text-red-600">{{ courseDetails.rejectionReason }}</span>
                        </p>
                      }
                    </div>
                  </div>
                }
                <!-- Modal Footer with Actions -->
                <div class="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
                  <button
                    (click)="closeDetailModal()"
                    class="px-4 py-2 border rounded-lg hover:bg-gray-100">
                    Đóng
                  </button>
                  @if (courseDetails?.status === 'PENDING') {
                    <button
                      (click)="approveCourseFromModal()"
                      [disabled]="approving() === courseDetails.id"
                      class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                      Duyệt khóa học
                    </button>
                  }
                  @if (courseDetails?.status === 'PENDING') {
                    <button
                      (click)="showRejectModalFromDetail()"
                      class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                      Từ chối
                    </button>
                  }
                </div>
              </div>
            </div>
          }
    
          <!-- Reject Modal -->
          @if (rejectModalOpen()) {
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
              <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 relative z-[61]">
                <h3 class="text-lg font-semibold mb-4">Từ chối khóa học</h3>
                <textarea
                  [(ngModel)]="rejectComment"
                  class="w-full border rounded-lg p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-[#0056D2]"
                  rows="4"
                placeholder="Nhập lý do từ chối (bắt buộc)..."></textarea>
                <div class="flex gap-3 justify-end">
                  <button
                    (click)="closeRejectModal()"
                    class="px-4 py-2 border rounded-lg hover:bg-gray-50">
                    Hủy
                  </button>
                  <button
                    (click)="confirmReject()"
                    [disabled]="!rejectComment.trim() || rejecting()"
                    class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                    Từ chối
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    `
})
export class CourseReviewComponent implements OnInit {
  private adminService = inject(AdminService);
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

  viewDetails(course: CourseListItem) {
    this.selectedCourse = course;
    this.courseDetails = course; // For now, use the summary data
    this.detailModalOpen.set(true);
    
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
