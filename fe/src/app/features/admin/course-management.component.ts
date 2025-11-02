import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminCourse } from './services/admin.service';
import { LoadingComponent } from '../../shared/components/loading/loading.component';

@Component({
  selector: 'app-course-management',
  imports: [CommonModule, RouterModule, FormsModule, LoadingComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <!-- Loading State -->
    <app-loading 
      [show]="adminService.isLoading()" 
      text="Đang tải dữ liệu khóa học..."
      subtext="Vui lòng chờ trong giây lát"
      variant="overlay"
      color="red">
    </app-loading>

    <div class="bg-gradient-to-br from-slate-50 via-red-50 to-pink-100 min-h-screen">
      <div class="max-w-7xl mx-auto px-6 py-8">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 mb-2">📚 Quản lý khóa học hệ thống</h1>
              <p class="text-gray-600">Phê duyệt và quản lý tất cả khóa học trong hệ thống</p>
            </div>
            <div class="flex items-center space-x-4">
              <div class="text-right">
                <div class="text-sm text-gray-600">Khóa học chờ phê duyệt</div>
                <div class="text-2xl font-bold text-red-600">{{ pendingCourses() }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Stats Overview -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-red-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Tổng khóa học</p>
                <p class="text-3xl font-bold text-gray-900">{{ totalCourses() }}</p>
                <p class="text-sm text-red-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                  </svg>
                  +{{ approvedCourses() }} đã phê duyệt
                </p>
              </div>
              <div class="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                  <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-yellow-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Chờ phê duyệt</p>
                <p class="text-3xl font-bold text-gray-900">{{ pendingCourses() }}</p>
                <p class="text-sm text-yellow-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                  </svg>
                  Cần xem xét
                </p>
              </div>
              <div class="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-green-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Đã phê duyệt</p>
                <p class="text-3xl font-bold text-gray-900">{{ approvedCourses() }}</p>
                <p class="text-sm text-green-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                  </svg>
                  Hoạt động
                </p>
              </div>
              <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-blue-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Tổng doanh thu</p>
                <p class="text-3xl font-bold text-gray-900">{{ formatCurrency(totalRevenue()) }}</p>
                <p class="text-sm text-blue-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                  </svg>
                  +15% tháng này
                </p>
              </div>
              <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"></path>
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Filter and Search -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div class="flex flex-col md:flex-row gap-4">
            <div class="flex-1">
              <input type="text" 
                     [(ngModel)]="searchQuery"
                     placeholder="Tìm kiếm khóa học..."
                     class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
            </div>
            <div class="flex gap-4">
              <select [(ngModel)]="statusFilter" 
                      class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
                <option value="">Tất cả trạng thái</option>
                <option value="pending">Chờ phê duyệt</option>
                <option value="approved">Đã phê duyệt</option>
                <option value="rejected">Bị từ chối</option>
                <option value="active">Đang hoạt động</option>
                <option value="archived">Lưu trữ</option>
              </select>
              <select [(ngModel)]="categoryFilter" 
                      class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
                <option value="">Tất cả danh mục</option>
                <option value="safety">An toàn hàng hải</option>
                <option value="navigation">Điều khiển tàu</option>
                <option value="engineering">Kỹ thuật tàu biển</option>
                <option value="logistics">Quản lý cảng</option>
                <option value="law">Luật hàng hải</option>
                <option value="certificates">Chứng chỉ</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Courses Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          @for (course of filteredCourses(); track course.id) {
            <div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
              <!-- Course Thumbnail -->
              <div class="relative h-48 overflow-hidden">
                <img [src]="course.thumbnail" 
                     [alt]="course.title"
                     class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                <div class="absolute top-4 right-4">
                  <span class="px-3 py-1 text-xs font-medium rounded-full"
                        [class]="getStatusClass(course.status)">
                    {{ getStatusText(course.status) }}
                  </span>
                </div>
                <div class="absolute bottom-4 left-4">
                  <span class="px-3 py-1 text-xs font-medium bg-white bg-opacity-90 rounded-full">
                    {{ getLevelText(course.level) }}
                  </span>
                </div>
              </div>

              <!-- Course Content -->
              <div class="p-6">
                <h3 class="text-xl font-semibold text-gray-900 mb-2 group-hover:text-red-600 transition-colors">
                  {{ course.title }}
                </h3>
                <p class="text-gray-600 text-sm mb-4 line-clamp-2">
                  {{ course.shortDescription }}
                </p>

                <!-- Instructor Info -->
                <div class="flex items-center mb-4">
                  <img [src]="course.instructor.avatar" 
                       [alt]="course.instructor.name"
                       class="w-8 h-8 rounded-full mr-3">
                  <div>
                    <div class="text-sm font-medium text-gray-900">{{ course.instructor.name }}</div>
                    <div class="text-xs text-gray-500">{{ course.instructor.email }}</div>
                  </div>
                </div>

                <!-- Course Stats -->
                <div class="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div class="flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 8v1h1.5a.5.5 0 01.5.5v9a.5.5 0 01-.5.5h-13a.5.5 0 01-.5-.5v-9a.5.5 0 01.5-.5H8v-1a5 5 0 00-5 5v1h9.93z"></path>
                    </svg>
                    {{ course.students }} học viên
                  </div>
                  <div class="flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                    </svg>
                    {{ course.rating }}/5
                  </div>
                </div>

                <!-- Course Price -->
                <div class="flex items-center justify-between mb-4">
                  <span class="text-2xl font-bold text-red-600">{{ formatCurrency(course.price) }}</span>
                  <span class="text-sm text-gray-500">{{ formatCurrency(course.revenue) }} doanh thu</span>
                </div>

                <!-- Course Actions -->
                <div class="flex gap-2">
                  @if (course.status === 'pending') {
                    <button (click)="approveCourse(course.id)"
                            class="flex-1 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium">
                      Phê duyệt
                    </button>
                    <button (click)="openRejectModal(course)"
                            class="flex-1 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium">
                      Từ chối
                    </button>
                  } @else {
                    <button (click)="viewCourse(course.id)"
                            class="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                      Xem chi tiết
                    </button>
                    <button (click)="editCourse(course.id)"
                            class="flex-1 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium">
                      Chỉnh sửa
                    </button>
                  }
                </div>

                <!-- Submission Info -->
                <div class="mt-4 pt-4 border-t border-gray-200">
                  <div class="text-xs text-gray-500">
                    <div>Nộp lúc: {{ formatDate(course.submittedAt) }}</div>
                    @if (course.approvedAt) {
                      <div>Phê duyệt: {{ formatDate(course.approvedAt) }}</div>
                    }
                    @if (course.rejectionReason) {
                      <div class="text-red-500">Lý do từ chối: {{ course.rejectionReason }}</div>
                    }
                  </div>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Empty State -->
        @if (filteredCourses().length === 0) {
          <div class="text-center py-12">
            <svg class="w-24 h-24 text-gray-300 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
              <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Không có khóa học nào</h3>
            <p class="text-gray-500 mb-6">Chưa có khóa học nào được nộp để phê duyệt</p>
          </div>
        }
      </div>
    </div>

    <!-- Reject Course Modal -->
    @if (showRejectModal()) {
      <div class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" (click)="closeRejectModal()"></div>
          
          <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div class="sm:flex sm:items-start">
                <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </div>
                <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Từ chối khóa học
                  </h3>
                  
                  <div class="mb-4">
                    <div class="text-sm text-gray-600 mb-2">
                      <strong>{{ selectedCourse()?.title }}</strong>
                    </div>
                    <div class="text-sm text-gray-500">
                      Giảng viên: {{ selectedCourse()?.instructor?.name || 'Không xác định' }}
                    </div>
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Lý do từ chối *</label>
                    <textarea [(ngModel)]="rejectionReason"
                              name="rejectionReason"
                              rows="4"
                              required
                              placeholder="Vui lòng giải thích lý do từ chối khóa học này..."
                              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"></textarea>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button (click)="rejectCourse()"
                      [disabled]="!rejectionReason"
                      class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                Từ chối khóa học
              </button>
              <button (click)="closeRejectModal()"
                      class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                Hủy
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseManagementComponent implements OnInit {
  protected adminService = inject(AdminService);

  // Filter states
  searchQuery = signal('');
  statusFilter = signal('');
  categoryFilter = signal('');

  // Modal state
  showRejectModal = signal(false);
  selectedCourse = signal<AdminCourse | null>(null);
  rejectionReason = signal('');

  // Computed properties
  totalCourses = computed(() => this.adminService.courses().length);
  pendingCourses = computed(() => this.adminService.pendingCourses());
  approvedCourses = computed(() => this.adminService.approvedCourses());
  totalRevenue = computed(() => this.adminService.totalRevenue());

  filteredCourses = computed(() => {
    let courses = this.adminService.courses();
    
    // Filter by search query
    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      courses = courses.filter(course => 
        course.title.toLowerCase().includes(query) ||
        course.description.toLowerCase().includes(query) ||
        course.shortDescription.toLowerCase().includes(query) ||
        course.instructor.name.toLowerCase().includes(query)
      );
    }
    
    // Filter by status
    if (this.statusFilter()) {
      courses = courses.filter(course => course.status === this.statusFilter());
    }
    
    // Filter by category
    if (this.categoryFilter()) {
      courses = courses.filter(course => course.category === this.categoryFilter());
    }
    
    return courses;
  });

  ngOnInit(): void {
    this.loadCourses();
  }

  async loadCourses(): Promise<void> {
    await this.adminService.getCourses();
  }

  async approveCourse(courseId: string): Promise<void> {
    await this.adminService.approveCourse(courseId);
  }

  openRejectModal(course: AdminCourse): void {
    this.selectedCourse.set(course);
    this.showRejectModal.set(true);
    this.rejectionReason.set('');
  }

  closeRejectModal(): void {
    this.showRejectModal.set(false);
    this.selectedCourse.set(null);
    this.rejectionReason.set('');
  }

  async rejectCourse(): Promise<void> {
    if (this.selectedCourse() && this.rejectionReason()) {
      await this.adminService.rejectCourse(this.selectedCourse()!.id, this.rejectionReason());
      this.closeRejectModal();
    }
  }

  viewCourse(courseId: string): void {
    // Navigate to course detail page
    window.open(`/courses/${courseId}`, '_blank');
  }

  editCourse(courseId: string): void {
    // Navigate to teacher course editor
    window.open(`/teacher/courses/${courseId}/edit`, '_blank');
  }

  formatDate(date: Date): string {
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
    switch (status) {
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
    switch (status) {
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
}