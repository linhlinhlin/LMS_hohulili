import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminCourseSummary } from '../../infrastructure/services/admin.service';
import { LoadingComponent } from '../../../../shared/components/loading/loading.component';

@Component({
  selector: 'app-course-management',
  imports: [CommonModule, RouterModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <!-- Loading State - Temporarily disabled -->
    <!-- <app-loading 
      [show]="adminService.isLoading()" 
      text="Đang tải dữ liệu khóa học..."
      subtext="Vui lòng chờ trong giây lát"
      variant="overlay"
      color="red">
    </app-loading> -->

    <div class="bg-gradient-to-br from-slate-50 via-red-50 to-pink-100 min-h-screen">
      <div class="max-w-7xl mx-auto px-6 py-8">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 mb-2">
                <svg class="w-8 h-8 inline-block mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                  <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                </svg>
                Quản lý khóa học hệ thống
              </h1>
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

        <!-- Courses Table -->
        <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
          @if (isLoading()) {
            <div class="p-12 text-center">
              <div class="inline-block">
                <div class="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
              <p class="mt-4 text-sm text-gray-600">Đang tải danh sách khóa học...</p>
            </div>
          } @else if (filteredCourses().length > 0) {
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Khóa học
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Giảng viên
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Giá
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Học viên
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Ngày tạo
                    </th>
                    <th class="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-100">
                  @for (course of filteredCourses(); track course.id) {
                    <tr class="hover:bg-gray-50 transition-colors">
                      <!-- Course Info -->
                      <td class="px-6 py-4">
                        <div class="flex items-center">
                          <img [src]="course.thumbnail || '/assets/images/course-placeholder.png'" 
                               [alt]="course.title"
                               class="w-12 h-12 rounded-lg object-cover mr-3 border border-gray-200">
                          <div class="max-w-xs">
                            <div class="text-sm font-medium text-gray-900 truncate">{{ course.title }}</div>
                            <div class="text-xs text-gray-500 truncate">{{ course.shortDescription || 'Chưa có mô tả' }}</div>
                            <div class="text-xs text-gray-400 mt-1">
                              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                {{ getLevelText(course.level || 'unknown') }}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <!-- Instructor -->
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                          <img src="/assets/images/default-avatar.png" 
                               [alt]="course.teacherName"
                               class="w-8 h-8 rounded-full border border-gray-200">
                          <div class="ml-3">
                            <div class="text-sm font-medium text-gray-900">{{ course.teacherName }}</div>
                            <div class="text-xs text-gray-500">{{ course.teacherEmail }}</div>
                          </div>
                        </div>
                      </td>
                      <!-- Status -->
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full"
                              [class]="getStatusClass(course.status)">
                          {{ getStatusText(course.status) }}
                        </span>
                        @if (course.rejectionReason) {
                          <div class="text-xs text-red-500 mt-1 max-w-[150px] truncate" [title]="course.rejectionReason">
                            {{ course.rejectionReason }}
                          </div>
                        }
                      </td>
                      <!-- Price -->
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-semibold text-gray-900">{{ course.price ? formatCurrency(course.price) : 'Miễn phí' }}</div>
                        <div class="text-xs text-gray-500">{{ course.revenue ? formatCurrency(course.revenue) : '0 ₫' }} doanh thu</div>
                      </td>
                      <!-- Students -->
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center text-sm text-gray-600">
                          <svg class="w-4 h-4 mr-1 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 8v1h1.5a.5.5 0 01.5.5v9a.5.5 0 01-.5.5h-13a.5.5 0 01-.5-.5v-9a.5.5 0 01.5-.5H8v-1a5 5 0 00-5 5v1h9.93z"></path>
                          </svg>
                          {{ course.enrolledCount || 0 }}
                        </div>
                        <div class="flex items-center text-xs text-gray-500 mt-1">
                          <svg class="w-3 h-3 mr-1 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                          </svg>
                          {{ course.rating || 0 }}/5
                        </div>
                      </td>
                      <!-- Created Date -->
                      <td class="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                        <div>{{ course.createdAt ? formatDate(course.createdAt) : 'N/A' }}</div>
                        @if (course.submittedAt) {
                          <div class="text-gray-400 mt-1">Nộp: {{ formatDate(course.submittedAt) }}</div>
                        }
                      </td>
                      <!-- Actions -->
                      <td class="px-6 py-4 whitespace-nowrap text-center">
                        <div class="flex items-center justify-center space-x-2">
                          @if (course.status.toUpperCase() === 'PENDING') {
                            <button (click)="approveCourse(course.id)"
                                    class="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                                    title="Phê duyệt">
                              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                              </svg>
                            </button>
                            <button (click)="openRejectModal(course)"
                                    class="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                    title="Từ chối">
                              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                              </svg>
                            </button>
                          }
                          <button (click)="viewCourse(course.id)"
                                  class="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                  title="Xem chi tiết">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path>
                              <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"></path>
                            </svg>
                          </button>
                          <button (click)="editCourse(course.id)"
                                  class="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                                  title="Chỉnh sửa">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else if (!isLoading()) {
            <!-- Empty State inside table container -->
            <div class="p-12 text-center">
              <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
              </svg>
              <h3 class="text-base font-medium text-gray-900 mb-2">Không có khóa học nào</h3>
              <p class="text-sm text-gray-600">Chưa có khóa học nào được nộp để phê duyệt hoặc phù hợp với bộ lọc</p>
            </div>
          }
        </div>
      </div>
    </div>

    <!-- Reject Course Modal -->
    @if (showRejectModal()) {
      <div class="fixed inset-0 z-50 overflow-y-auto" (click)="closeRejectModal()">
        <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          
          <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full" (click)="$event.stopPropagation()">
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
                      Giảng viên: {{ selectedCourse()?.teacherName || 'Không xác định' }}
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
                      [disabled]="!rejectionReason()"
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

    <!-- Course Detail Modal -->
    @if (showDetailModal()) {
      <div class="fixed inset-0 z-50 overflow-y-auto" (click)="closeDetailModal()">
        <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          
          <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full" (click)="$event.stopPropagation()">
            <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <!-- Header -->
              <div class="flex items-start justify-between mb-6">
                <div class="flex items-center">
                  <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg class="h-6 w-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                      <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                  <h3 class="ml-3 text-xl leading-6 font-bold text-gray-900">
                    Chi tiết khóa học
                  </h3>
                </div>
                <button (click)="closeDetailModal()" class="text-gray-400 hover:text-gray-500">
                  <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              <!-- Content -->
              <div class="max-h-[70vh] overflow-y-auto">
                <!-- Course Thumbnail -->
                @if (selectedCourse()?.thumbnail) {
                  <div class="mb-6">
                    <img [src]="selectedCourse()!.thumbnail" 
                         [alt]="selectedCourse()!.title"
                         class="w-full h-64 object-cover rounded-lg">
                  </div>
                }

                <!-- Basic Info -->
                <div class="mb-6">
                  <h4 class="text-lg font-semibold text-gray-900 mb-3">📋 Thông tin cơ bản</h4>
                  <div class="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <span class="text-sm font-medium text-gray-500">Tiêu đề:</span>
                        <p class="text-sm text-gray-900 mt-1">{{ selectedCourse()?.title }}</p>
                      </div>
                      <div>
                        <span class="text-sm font-medium text-gray-500">Trạng thái:</span>
                        <p class="text-sm mt-1">
                          <span class="px-2 py-1 rounded-full text-xs font-medium" [class]="getStatusClass(selectedCourse()?.status || '')">
                            {{ getStatusText(selectedCourse()?.status || '') }}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div>
                      <span class="text-sm font-medium text-gray-500">Mô tả:</span>
                      <p class="text-sm text-gray-900 mt-1">{{ selectedCourse()?.shortDescription || 'Chưa có mô tả' }}</p>
                    </div>
                    <div class="grid grid-cols-3 gap-4">
                      <div>
                        <span class="text-sm font-medium text-gray-500">Giá:</span>
                        <p class="text-sm text-gray-900 mt-1 font-semibold">{{ selectedCourse()?.price ? formatCurrency(selectedCourse()!.price!) : 'Miễn phí' }}</p>
                      </div>
                      <div>
                        <span class="text-sm font-medium text-gray-500">Cấp độ:</span>
                        <p class="text-sm text-gray-900 mt-1">{{ getLevelText(selectedCourse()?.level || 'unknown') }}</p>
                      </div>
                      <div>
                        <span class="text-sm font-medium text-gray-500">Danh mục:</span>
                        <p class="text-sm text-gray-900 mt-1">{{ selectedCourse()?.category || 'Chưa phân loại' }}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Teacher Info -->
                <div class="mb-6">
                  <h4 class="text-lg font-semibold text-gray-900 mb-3">👨‍🏫 Thông tin giảng viên</h4>
                  <div class="bg-gray-50 rounded-lg p-4">
                    <div class="flex items-center space-x-4">
                      <img src="/assets/images/default-avatar.png" 
                           [alt]="selectedCourse()?.teacherName"
                           class="w-16 h-16 rounded-full">
                      <div class="flex-1">
                        <p class="text-sm font-semibold text-gray-900">{{ selectedCourse()?.teacherName }}</p>
                        <p class="text-sm text-gray-500">{{ selectedCourse()?.teacherEmail }}</p>
                        <div class="flex items-center mt-2 space-x-4 text-xs text-gray-500">
                          <span>⭐ {{ selectedCourse()?.rating || 0 }}/5</span>
                          <span>👥 {{ selectedCourse()?.enrolledCount || 0 }} học viên</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Course Content -->
                <div class="mb-6">
                  <h4 class="text-lg font-semibold text-gray-900 mb-3">📚 Nội dung khóa học</h4>
                  <div class="bg-gray-50 rounded-lg p-4">
                    <div class="grid grid-cols-3 gap-4 text-center">
                      <div class="bg-white rounded-lg p-3">
                        <div class="text-2xl font-bold text-blue-600">{{ selectedCourse()?.sectionsCount || 0 }}</div>
                        <div class="text-xs text-gray-500 mt-1">Chương học</div>
                      </div>
                      <div class="bg-white rounded-lg p-3">
                        <div class="text-2xl font-bold text-green-600">{{ selectedCourse()?.lessonsCount || 0 }}</div>
                        <div class="text-xs text-gray-500 mt-1">Bài học</div>
                      </div>
                      <div class="bg-white rounded-lg p-3">
                        <div class="text-2xl font-bold text-purple-600">{{ selectedCourse()?.assignmentsCount || 0 }}</div>
                        <div class="text-xs text-gray-500 mt-1">Bài tập</div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Review Status -->
                <div class="mb-6">
                  <h4 class="text-lg font-semibold text-gray-900 mb-3">✅ Trạng thái phê duyệt</h4>
                  <div class="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <span class="text-sm font-medium text-gray-500">Ngày nộp:</span>
                        <p class="text-sm text-gray-900 mt-1">{{ selectedCourse()?.submittedAt ? formatDate(selectedCourse()!.submittedAt!) : 'Chưa nộp' }}</p>
                      </div>
                      @if (selectedCourse()?.approvedAt) {
                        <div>
                          <span class="text-sm font-medium text-gray-500">Ngày phê duyệt:</span>
                          <p class="text-sm text-gray-900 mt-1">{{ formatDate(selectedCourse()!.approvedAt!) }}</p>
                        </div>
                      }
                    </div>
                    @if (selectedCourse()?.rejectionReason) {
                      <div>
                        <span class="text-sm font-medium text-red-500">Lý do từ chối:</span>
                        <p class="text-sm text-red-600 mt-1 bg-red-50 p-2 rounded">{{ selectedCourse()!.rejectionReason }}</p>
                      </div>
                    }
                    @if (selectedCourse()?.reviewComment) {
                      <div>
                        <span class="text-sm font-medium text-gray-500">Nhận xét:</span>
                        <p class="text-sm text-gray-900 mt-1">{{ selectedCourse()!.reviewComment }}</p>
                      </div>
                    }
                  </div>
                </div>

                <!-- Statistics -->
                <div class="mb-6">
                  <h4 class="text-lg font-semibold text-gray-900 mb-3">📊 Thống kê</h4>
                  <div class="bg-gray-50 rounded-lg p-4">
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <span class="text-sm font-medium text-gray-500">Số học viên đã đăng ký:</span>
                        <p class="text-sm text-gray-900 mt-1 font-semibold">{{ selectedCourse()?.enrolledCount || 0 }} học viên</p>
                      </div>
                      <div>
                        <span class="text-sm font-medium text-gray-500">Doanh thu:</span>
                        <p class="text-sm text-gray-900 mt-1 font-semibold">{{ selectedCourse()?.revenue ? formatCurrency(selectedCourse()!.revenue!) : '0 ₫' }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Footer -->
            <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button (click)="closeDetailModal()"
                      class="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm">
                Đóng
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
      console.warn('[CourseManagement] courses is not an array:', courses);
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
    console.log('[CourseManagement] Loading courses...');
    this.isLoading.set(true);

    this.adminService.getAllCourses().subscribe({
      next: (response) => {
        console.log('[CourseManagement] Courses loaded:', response);

        // Ensure we have an array
        const coursesData = Array.isArray(response.data) ? response.data : [];
        console.log('[CourseManagement] Setting courses:', coursesData.length, 'items');

        this.courses.set(coursesData);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('[CourseManagement] Error loading courses:', error);
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
      error: (error) => {
        console.error('Error approving course:', error);
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
        error: (error) => {
          console.error('Error rejecting course:', error);
        }
      });
    }
  }

  viewCourse(courseId: string): void {
    console.log('🔍 viewCourse called with ID:', courseId);
    console.log('📚 All courses:', this.courses());
    const course = this.courses().find(c => c.id === courseId);
    console.log('✅ Found course:', course);
    if (course) {
      this.selectedCourse.set(course);
      this.showDetailModal.set(true);
      console.log('🎯 Modal should show now. showDetailModal:', this.showDetailModal());
    } else {
      console.error('❌ Course not found with ID:', courseId);
    }
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
}
