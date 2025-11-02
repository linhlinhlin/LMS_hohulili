import { Component, signal, computed, inject, effect, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CourseService } from '../../state/course.service';
import { AuthService } from '../../core/services/auth.service';
import { ExtendedCourse, EnrolledCourse } from '../../shared/types/course.types';
import { ErrorHandlingService } from '../../shared/services/error-handling.service';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { CourseApi } from '../../api/client/course.api';
import { CourseSummary } from '../../api/types/course.types';

interface CourseFilter {
  status: string[];
  category: string[];
  level: string[];
  sortBy: 'title' | 'progress' | 'enrolledAt' | 'lastAccessed';
  sortOrder: 'asc' | 'desc';
}

@Component({
  selector: 'app-my-courses',
  imports: [CommonModule, RouterModule, FormsModule, LoadingComponent],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  template: `

    <div class="bg-gray-50">
      <!-- Header -->
      <div class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900">Khóa học của tôi</h1>
              <p class="text-lg text-gray-600 mt-2">Quản lý và theo dõi tiến độ học tập</p>
            </div>
            <button (click)="goToBrowseCourses()"
                    class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
              <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path>
              </svg>
              Khám phá khóa học mới
            </button>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Enhanced Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div class="bg-white rounded-xl shadow-lg p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Tổng khóa học</p>
                <p class="text-3xl font-bold text-gray-900">{{ enrolledCourses().length }}</p>
              </div>
              <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                  <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Đang học</p>
                <p class="text-3xl font-bold text-gray-900">{{ inProgressCourses().length }}</p>
              </div>
              <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Hoàn thành</p>
                <p class="text-3xl font-bold text-gray-900">{{ completedCourses().length }}</p>
              </div>
              <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Chứng chỉ</p>
                <p class="text-3xl font-bold text-gray-900">{{ certificatesCount() }}</p>
              </div>
              <div class="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Study Insights & Upcoming Deadlines -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <!-- Study Insights -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg class="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
              </svg>
              Thống kê học tập
            </h3>
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Tổng thời gian học</span>
                <span class="font-semibold text-gray-900">{{ formatStudyTime(getTotalStudyTime()) }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Điểm trung bình</span>
                <span class="font-semibold text-gray-900">{{ getAverageScore().toFixed(1) }}/10</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Chuỗi học tập</span>
                <span class="font-semibold text-gray-900">{{ getStudyStreak() }} ngày</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Tổng ghi chú</span>
                <span class="font-semibold text-gray-900">{{ getTotalNotes() }}</span>
              </div>
            </div>
          </div>

          <!-- Upcoming Deadlines -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg class="w-5 h-5 text-orange-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"></path>
              </svg>
              Deadline sắp tới
            </h3>
            <div class="space-y-3">
              @if (getUpcomingDeadlines().length === 0) {
                <p class="text-sm text-gray-500 text-center py-4">Không có deadline nào trong tuần tới</p>
              } @else {
                @for (course of getUpcomingDeadlines(); track course.id) {
                  <div class="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div>
                      <p class="text-sm font-medium text-gray-900">{{ course.title }}</p>
                      <p class="text-xs text-gray-600">{{ course.upcomingDeadlines?.length || 0 }} deadline(s)</p>
                    </div>
                    <div class="text-right">
                      @for (deadline of course.upcomingDeadlines?.slice(0, 2) || []; track deadline) {
                        <p class="text-xs text-orange-600 font-medium">{{ formatDate(deadline) }}</p>
                      }
                    </div>
                  </div>
                }
              }
            </div>
          </div>
        </div>

        <!-- Filters -->
        <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div class="flex flex-wrap items-center gap-4">
            <div class="flex items-center space-x-2">
              <label class="text-sm font-medium text-gray-700">Trạng thái:</label>
              <select [(ngModel)]="filters.status[0]" 
                      (ngModelChange)="applyFilters()"
                      class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Tất cả</option>
                <option value="enrolled">Đã đăng ký</option>
                <option value="in-progress">Đang học</option>
                <option value="completed">Hoàn thành</option>
                <option value="paused">Tạm dừng</option>
              </select>
            </div>

            <div class="flex items-center space-x-2">
              <label class="text-sm font-medium text-gray-700">Danh mục:</label>
              <select [(ngModel)]="filters.category[0]" 
                      (ngModelChange)="applyFilters()"
                      class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Tất cả</option>
                <option value="safety">An toàn hàng hải</option>
                <option value="navigation">Hàng hải</option>
                <option value="engineering">Kỹ thuật tàu biển</option>
                <option value="logistics">Quản lý cảng</option>
                <option value="law">Luật hàng hải</option>
                <option value="certificates">Chứng chỉ</option>
              </select>
            </div>

            <div class="flex items-center space-x-2">
              <label class="text-sm font-medium text-gray-700">Sắp xếp:</label>
              <select [(ngModel)]="filters.sortBy" 
                      (ngModelChange)="applyFilters()"
                      class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="lastAccessed">Truy cập gần nhất</option>
                <option value="progress">Tiến độ</option>
                <option value="title">Tên khóa học</option>
                <option value="enrolledAt">Ngày đăng ký</option>
              </select>
            </div>

            <button (click)="clearFilters()"
                    class="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors">
              Xóa bộ lọc
            </button>
          </div>
        </div>

        <!-- Courses Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (course of filteredCourses(); track course.id) {
            <div class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              <!-- Course Image -->
              <div class="relative">
                <img [src]="course.thumbnail" [alt]="course.title" 
                     class="w-full h-48 object-cover">
                <div class="absolute top-4 right-4">
                  <span class="px-3 py-1 bg-white bg-opacity-90 rounded-full text-sm font-medium"
                        [class]="getStatusClass(course.status)">
                    {{ getStatusText(course.status) }}
                  </span>
                </div>
                @if (course.certificate) {
                  <div class="absolute top-4 left-4">
                    <div class="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <svg class="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                      </svg>
                    </div>
                  </div>
                }
              </div>

              <!-- Course Content -->
              <div class="p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-2">{{ course.title }}</h3>
                <p class="text-gray-600 text-sm mb-4">{{ course.shortDescription }}</p>
                
                <!-- Progress -->
                <div class="mb-4">
                  <div class="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Tiến độ</span>
                    <span>{{ course.progress }}%</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                         [style.width.%]="course.progress"></div>
                  </div>
                  <div class="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{{ course.completedLessons }}/{{ course.totalLessons }} bài học</span>
                    <span>{{ formatDate(course.lastAccessed) }}</span>
                  </div>
                </div>

                <!-- Enhanced Course Info -->
                <div class="space-y-3 mb-4">
                  <!-- Rating and Duration -->
                  <div class="flex items-center justify-between text-sm text-gray-600">
                    <div class="flex items-center space-x-1">
                      <svg class="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                      </svg>
                      <span>{{ course.rating }}</span>
                    </div>
                    <span>{{ course.duration }}</span>
                  </div>

                  <!-- Study Stats -->
                  <div class="grid grid-cols-2 gap-4 text-xs">
                    <div class="flex items-center space-x-2">
                      <svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                      </svg>
                      <span>{{ formatStudyTime(course.studyTime) }}</span>
                    </div>
                    <div class="flex items-center space-x-2">
                      <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                      </svg>
                      <span>{{ course.averageScore }}/10</span>
                    </div>
                  </div>

                  <!-- Next Lesson -->
                  @if (course.nextLesson) {
                    <div class="bg-blue-50 rounded-lg p-3">
                      <div class="flex items-center space-x-2">
                        <svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                        </svg>
                        <span class="text-sm font-medium text-blue-900">Bài tiếp theo:</span>
                      </div>
                      <p class="text-sm text-blue-700 mt-1">{{ course.nextLesson }}</p>
                    </div>
                  }

                  <!-- Study Streak -->
                  @if ((course.studyStreak || 0) > 0) {
                    <div class="flex items-center space-x-2 text-sm">
                      <span class="text-orange-600">🔥</span>
                      <span class="text-gray-600">{{ course.studyStreak }} ngày liên tiếp</span>
                    </div>
                  }
                </div>

                <!-- Enhanced Actions -->
                <div class="space-y-3">
                  <!-- Main Actions -->
                  <div class="flex space-x-2">
                    @if (course.status === 'completed') {
                      <button (click)="downloadCertificate(course.id)"
                              class="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium">
                        <svg class="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                        </svg>
                        Tải chứng chỉ
                      </button>
                    } @else if (course.status === 'paused') {
                      <button (click)="resumeCourse(course.id)"
                              class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                        <svg class="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path>
                        </svg>
                        Tiếp tục học
                      </button>
                    } @else {
                      <button (click)="continueLearning(course.id)"
                              class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                        <svg class="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                        </svg>
                        Tiếp tục học
                      </button>
                    }
                    
                    <button (click)="viewCourseDetail(course.id)"
                            class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path>
                        <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"></path>
                      </svg>
                    </button>
                  </div>

                  <!-- Secondary Actions -->
                  <div class="flex space-x-2">
                    <!-- Favorite Button -->
                    <button (click)="toggleFavorite(course.id)"
                            class="px-3 py-2 rounded-lg text-sm transition-colors"
                            [class]="course.isFavorite ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'">
                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"></path>
                      </svg>
                    </button>

                    <!-- Notes Button -->
                    <button (click)="viewNotes(course.id)"
                            class="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm">
                      <svg class="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
                      </svg>
                      {{ course.notesCount }}
                    </button>

                    <!-- Bookmarks Button -->
                    <button (click)="viewBookmarks(course.id)"
                            class="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm">
                      <svg class="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"></path>
                      </svg>
                      {{ course.bookmarksCount }}
                    </button>

                    <!-- Pause/Resume Button -->
                    @if (course.status === 'in-progress') {
                      <button (click)="pauseCourse(course.id)"
                              class="px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                        </svg>
                      </button>
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
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">Không có khóa học nào</h3>
            <p class="mt-1 text-sm text-gray-500">Bạn chưa đăng ký khóa học nào hoặc không có khóa học phù hợp với bộ lọc.</p>
            <div class="mt-6">
              <button (click)="goToBrowseCourses()"
                      class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Khám phá khóa học
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyCoursesComponent {
  protected courseService = inject(CourseService);
  protected authService = inject(AuthService);
  private router = inject(Router);
  private errorService = inject(ErrorHandlingService);
  private courseApi = inject(CourseApi);

  // Loading state
  isLoading = signal<boolean>(true);

  // Live enrolled courses data
  enrolledCourses = signal<EnrolledCourse[]>([]);

  filters: CourseFilter = {
    status: [],
    category: [],
    level: [],
    sortBy: 'lastAccessed',
    sortOrder: 'desc'
  };

  // Computed values
  inProgressCourses = computed(() => 
    this.enrolledCourses().filter(course => course.status === 'in-progress')
  );

  completedCourses = computed(() => 
    this.enrolledCourses().filter(course => course.status === 'completed')
  );

  certificatesCount = computed(() => 
    this.enrolledCourses().filter(course => course.certificate).length
  );

  filteredCourses = computed(() => {
    let courses = [...this.enrolledCourses()];

    // Apply status filter
    if (this.filters.status.length > 0 && this.filters.status[0]) {
      courses = courses.filter(course => course.status === this.filters.status[0]);
    }

    // Apply category filter
    if (this.filters.category.length > 0 && this.filters.category[0]) {
      courses = courses.filter(course => course.category === this.filters.category[0]);
    }

    // Apply sorting
    courses.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (this.filters.sortBy) {
        case 'title':
          aValue = a.title;
          bValue = b.title;
          break;
        case 'progress':
          aValue = a.progress;
          bValue = b.progress;
          break;
        case 'enrolledAt':
          aValue = a.enrolledAt;
          bValue = b.enrolledAt;
          break;
        case 'lastAccessed':
        default:
          aValue = a.lastAccessed;
          bValue = b.lastAccessed;
          break;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return this.filters.sortOrder === 'desc' 
          ? bValue.localeCompare(aValue)
          : aValue.localeCompare(bValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return this.filters.sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
      }
      
      if (aValue instanceof Date && bValue instanceof Date) {
        return this.filters.sortOrder === 'desc' 
          ? bValue.getTime() - aValue.getTime()
          : aValue.getTime() - bValue.getTime();
      }
      
      return 0;
    });

    return courses;
  });

  constructor() {
    // Initialize component data when created
    effect(() => {
      if (!this.isLoading()) {
        this.loadEnrolledCourses();
      }
    });
    // Trigger initial load
    this.loadEnrolledCourses();
  }

  private async loadEnrolledCourses(): Promise<void> {
    try {
      this.isLoading.set(true);
      // Always use page: 1 for backend API (Spring expects page >= 1)
      this.courseApi.enrolledCourses({ page: 1, limit: 10 }).subscribe({
        next: (res) => {
          const items = (res.data || []) as CourseSummary[];
          const mapped: EnrolledCourse[] = items.map((c) => this.mapCourseSummaryToEnrolled(c));
          this.enrolledCourses.set(mapped);
          // Không hiển thị thông báo tải thành công để tránh popup và log lỗi
        },
        error: (err) => {
          this.errorService.handleApiError(err, 'courses');
        },
        complete: () => this.isLoading.set(false)
      });
    } catch (error) {
      this.errorService.handleApiError(error, 'courses');
      this.isLoading.set(false);
    }
  }

  private mapCourseSummaryToEnrolled(c: CourseSummary): EnrolledCourse {
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      shortDescription: c.description,
      instructor: typeof c.teacherName === 'string' ? c.teacherName : '',
      thumbnail: '/assets/images/course-placeholder.jpg',
      progress: 0,
      totalLessons: 0,
      completedLessons: 0,
      duration: '—',
      lastAccessed: new Date(c.createdAt),
      status: c.status === 'APPROVED' ? 'enrolled' : 'not-started',
      category: undefined,
      rating: undefined
    };
  }

  formatStudyTime(minutes: number | undefined): string {
    const mins = minutes || 0;
    if (mins < 60) {
      return `${mins} phút`;
    }
    const hours = Math.floor(mins / 60);
    const remainingMinutes = mins % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  applyFilters(): void {
    // Filters are applied automatically through computed signal
    console.log('Applying filters...');
  }

  clearFilters(): void {
    this.filters = {
      status: [],
      category: [],
      level: [],
      sortBy: 'lastAccessed',
      sortOrder: 'desc'
    };
  }

  continueLearning(courseId: string): void {
    console.log('🔧 My Courses - Continue learning course:', courseId);
    this.router.navigate(['/student/learn/course', courseId]).catch(error => {
      this.errorService.handleNavigationError(error, `/student/learn/course/${courseId}`);
    });
  }

  viewCourseDetail(courseId: string): void {
    console.log('🔧 My Courses - View course detail:', courseId);
    this.router.navigate(['/courses', courseId]).catch(error => {
      this.errorService.handleNavigationError(error, `/courses/${courseId}`);
    });
  }

  viewCertificate(courseId: string): void {
    console.log('🔧 My Courses - View certificate:', courseId);
    // Open certificate in new tab
    window.open(`/certificates/${courseId}`, '_blank');
  }

  goToBrowseCourses(): void {
    console.log('🔧 My Courses - Go to browse courses');
    this.router.navigate(['/courses']).catch(error => {
      this.errorService.handleNavigationError(error, '/courses');
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'enrolled':
        return 'text-blue-800 bg-blue-100';
      case 'in-progress':
        return 'text-green-800 bg-green-100';
      case 'completed':
        return 'text-purple-800 bg-purple-100';
      case 'paused':
        return 'text-orange-800 bg-orange-100';
      default:
        return 'text-gray-800 bg-gray-100';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'enrolled':
        return 'Đã đăng ký';
      case 'in-progress':
        return 'Đang học';
      case 'completed':
        return 'Hoàn thành';
      case 'paused':
        return 'Tạm dừng';
      default:
        return 'Không xác định';
    }
  }

  formatDate(date: string | Date): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('vi-VN');
  }

  // Enhanced features
  toggleFavorite(courseId: string): void {
    const courses = this.enrolledCourses();
    const updatedCourses = courses.map(course => 
      course.id === courseId 
        ? { ...course, isFavorite: !course.isFavorite }
        : course
    );
    this.enrolledCourses.set(updatedCourses);
    const course = updatedCourses.find(c => c.id === courseId);
    if (course) {
      this.errorService.showSuccess(
        course.isFavorite ? 'Đã thêm vào yêu thích' : 'Đã xóa khỏi yêu thích',
        'favorite'
      );
    }
  }

  pauseCourse(courseId: string): void {
    const courses = this.enrolledCourses();
    const updatedCourses = courses.map(course => 
      course.id === courseId 
        ? { ...course, status: 'paused' as const }
        : course
    );
    this.enrolledCourses.set(updatedCourses);
    this.errorService.showSuccess('Khóa học đã được tạm dừng', 'course');
  }

  resumeCourse(courseId: string): void {
    const courses = this.enrolledCourses();
    const updatedCourses = courses.map(course => 
      course.id === courseId 
        ? { ...course, status: 'in-progress' as const }
        : course
    );
    this.enrolledCourses.set(updatedCourses);
    this.errorService.showSuccess('Khóa học đã được tiếp tục', 'course');
  }

  downloadCertificate(courseId: string): void {
    const course = this.enrolledCourses().find(c => c.id === courseId);
    if (course?.certificateInfo && course.certificateInfo.certificateUrl) {
      // Simulate certificate download
      const link = document.createElement('a');
      link.href = course.certificateInfo.certificateUrl;
      link.download = `certificate-${course.title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  this.errorService.showSuccess('Chứng chỉ đang được tải xuống', 'certificate');
    } else {
      this.errorService.addError({
        message: 'Không tìm thấy chứng chỉ hoặc link tải.',
        type: 'error',
        context: 'certificate'
      });
    }
  }

  viewNotes(courseId: string): void {
    this.router.navigate(['/student/notes', courseId]).catch(error => {
      this.errorService.handleNavigationError(error, `/student/notes/${courseId}`);
    });
  }

  viewBookmarks(courseId: string): void {
    this.router.navigate(['/student/bookmarks', courseId]).catch(error => {
      this.errorService.handleNavigationError(error, `/student/bookmarks/${courseId}`);
    });
  }

  getUpcomingDeadlines(): EnrolledCourse[] {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    return this.enrolledCourses().filter(course =>
      course.upcomingDeadlines?.some(deadline =>
        deadline >= today && deadline <= nextWeek
      ) || false
    );
  }

  getStudyStreak(): number {
    return Math.max(...this.enrolledCourses().map(course => course.studyStreak || 0));
  }

  getTotalStudyTime(): number {
    return this.enrolledCourses().reduce((total, course) => total + (course.studyTime || 0), 0);
  }

  getTotalNotes(): number {
    return this.enrolledCourses().reduce((total, course) => total + (course.notesCount || 0), 0);
  }

  getAverageScore(): number {
    const courses = this.enrolledCourses().filter(course => (course.averageScore || 0) > 0);
    if (courses.length === 0) return 0;
    return courses.reduce((sum, course) => sum + (course.averageScore || 0), 0) / courses.length;
  }
}