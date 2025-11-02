import { Component, signal, computed, inject, OnInit, OnDestroy, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { interval, Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { TeacherService } from '../services/teacher.service';
import { NotificationService } from '../services/notification.service';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { TeacherNotificationsComponent } from '../notifications/teacher-notifications.component';
import { TeacherAnalyticsComponent } from '../analytics/teacher-analytics.component';

@Component({
  selector: 'app-teacher-dashboard',
  imports: [CommonModule, RouterModule, FormsModule, LoadingComponent, TeacherNotificationsComponent, TeacherAnalyticsComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <!-- Loading State -->
    <app-loading 
      [show]="teacherService.isLoading()" 
      text="Đang tải dashboard..."
      subtext="Vui lòng chờ trong giây lát"
      variant="overlay"
      color="purple">
    </app-loading>

    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100">
      <!-- Hero Section -->
      <div class="bg-gradient-to-r from-indigo-600 via-purple-700 to-blue-800 text-white relative overflow-hidden">
        <!-- Animated Background Elements -->
        <div class="absolute inset-0 overflow-hidden">
          <div class="absolute -top-40 -right-40 w-80 h-80 bg-white bg-opacity-10 rounded-full animate-pulse"></div>
          <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-white bg-opacity-10 rounded-full animate-pulse" style="animation-delay: 1s;"></div>
        </div>
        
        <div class="max-w-7xl mx-auto px-6 py-12 relative z-10">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-6">
              <div class="w-20 h-20 bg-white bg-opacity-20 rounded-3xl flex items-center justify-center backdrop-blur-sm hover:bg-opacity-30 transition-all duration-300">
                <svg class="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div>
                <h1 class="text-4xl font-bold mb-2">Chào mừng trở lại, {{ authService.userName() }}!</h1>
                <p class="text-indigo-100 text-lg">Quản lý khóa học và học viên của bạn một cách chuyên nghiệp</p>
                
                <!-- Enhanced Stats with Animations -->
                <div class="flex items-center space-x-6 mt-4">
                  <div class="text-center group cursor-pointer" (click)="navigateToCourseManagement()">
                    <div class="text-2xl font-bold group-hover:scale-110 transition-transform duration-300">{{ totalCourses() }}</div>
                    <div class="text-sm text-indigo-200">Khóa học</div>
                    <div class="w-full h-1 bg-white bg-opacity-20 rounded-full mt-1 group-hover:bg-opacity-40 transition-all duration-300"></div>
                  </div>
                  <div class="text-center group cursor-pointer" (click)="navigateToStudents()">
                    <div class="text-2xl font-bold group-hover:scale-110 transition-transform duration-300">{{ totalStudents() }}</div>
                    <div class="text-sm text-indigo-200">Học viên</div>
                    <div class="w-full h-1 bg-white bg-opacity-20 rounded-full mt-1 group-hover:bg-opacity-40 transition-all duration-300"></div>
                  </div>
                  <div class="text-center group cursor-pointer" (click)="navigateToAnalytics()">
                    <div class="text-2xl font-bold group-hover:scale-110 transition-transform duration-300">{{ averageRating() }}</div>
                    <div class="text-sm text-indigo-200">Đánh giá TB</div>
                    <div class="w-full h-1 bg-white bg-opacity-20 rounded-full mt-1 group-hover:bg-opacity-40 transition-all duration-300"></div>
                  </div>
                  <div class="text-center group cursor-pointer" (click)="navigateToAnalytics()">
                    <div class="text-2xl font-bold group-hover:scale-110 transition-transform duration-300">{{ formatCurrency(totalRevenue()) }}</div>
                    <div class="text-sm text-indigo-200">Doanh thu</div>
                    <div class="w-full h-1 bg-white bg-opacity-20 rounded-full mt-1 group-hover:bg-opacity-40 transition-all duration-300"></div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Enhanced Right Panel -->
            <div class="hidden lg:block">
              <div class="text-right">
                <div class="text-sm text-indigo-200 mb-2">Hôm nay</div>
                <div class="text-3xl font-bold">{{ getCurrentDate() }}</div>
                <div class="text-sm text-indigo-200 mt-1">{{ getCurrentTime() }}</div>
                
                <!-- Weather-like Status Indicator -->
                <div class="mt-4 p-3 bg-white bg-opacity-10 rounded-lg backdrop-blur-sm">
                  <div class="flex items-center space-x-2">
                    <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span class="text-sm text-indigo-100">Hệ thống hoạt động tốt</span>
                  </div>
                  <div class="text-xs text-indigo-200 mt-1">Cập nhật lần cuối: {{ getLastUpdateTime() }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="max-w-7xl mx-auto px-6 py-8">
        <!-- Enhanced Tab Navigation with Search -->
        <div class="mb-8">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center space-x-4">
              <h2 class="text-2xl font-bold text-gray-900">Dashboard</h2>
              <div class="flex items-center space-x-2">
                <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span class="text-sm text-gray-600">Real-time</span>
              </div>
            </div>
            
            <!-- Search and Filter -->
            <div class="flex items-center space-x-4">
              <div class="relative">
                <input type="text" 
                       [(ngModel)]="searchQuery"
                       placeholder="Tìm kiếm khóa học, học viên..."
                       class="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                <svg class="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"></path>
                </svg>
              </div>
              
              <!-- Refresh Button -->
              <button (click)="refreshData()"
                      class="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      [class]="isRefreshing() ? 'animate-spin' : ''">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"></path>
                </svg>
              </button>
            </div>
          </div>
          
          <div class="border-b border-gray-200">
            <nav class="-mb-px flex space-x-8">
              <button (click)="setActiveTab('overview')"
                      class="py-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2"
                      [class]="activeTab() === 'overview' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"></path>
                </svg>
                <span>Tổng quan</span>
              </button>
              <button (click)="setActiveTab('analytics')"
                      class="py-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2"
                      [class]="activeTab() === 'analytics' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"></path>
                </svg>
                <span>Phân tích</span>
              </button>
              <button (click)="setActiveTab('notifications')"
                      class="py-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2"
                      [class]="activeTab() === 'notifications' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"></path>
                </svg>
                <span>Thông báo</span>
                @if (unreadNotifications() > 0) {
                  <span class="px-2 py-1 text-xs bg-red-500 text-white rounded-full">{{ unreadNotifications() }}</span>
                }
              </button>
            </nav>
          </div>
        </div>

        <!-- Tab Content -->
        @if (activeTab() === 'overview') {
          <!-- Quick Actions -->
        <div class="mb-8">
          <h2 class="text-2xl font-bold text-gray-900 mb-6">Thao tác nhanh</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <button (click)="navigateToCourseCreation()"
                    class="group bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-blue-500 hover:border-blue-600">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path>
                  </svg>
                </div>
                <div class="text-left">
                  <h3 class="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">Tạo khóa học</h3>
                  <p class="text-sm text-gray-600">Tạo khóa học mới</p>
                </div>
              </div>
            </button>

            <button (click)="navigateToCourseManagement()"
                    class="group bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-green-500 hover:border-green-600">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                    <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                  </svg>
                </div>
                <div class="text-left">
                  <h3 class="font-semibold text-gray-900 group-hover:text-green-600 transition-colors">Quản lý khóa học</h3>
                  <p class="text-sm text-gray-600">Xem và chỉnh sửa khóa học</p>
                </div>
              </div>
            </button>

            <button (click)="navigateToAssignments()"
                    class="group bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-purple-500 hover:border-purple-600">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
                  </svg>
                </div>
                <div class="text-left">
                  <h3 class="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">Bài tập</h3>
                  <p class="text-sm text-gray-600">Tạo và chấm bài tập</p>
                </div>
              </div>
            </button>

            <button (click)="navigateToAnalytics()"
                    class="group bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-orange-500 hover:border-orange-600">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                  <svg class="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"></path>
                  </svg>
                </div>
                <div class="text-left">
                  <h3 class="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">Phân tích</h3>
                  <p class="text-sm text-gray-600">Báo cáo và thống kê</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        <!-- Main Dashboard Grid -->
        <div class="grid grid-cols-12 gap-8">
          <!-- Left Column - Recent Activity & Courses (8 columns) -->
          <div class="col-span-12 xl:col-span-8 space-y-8">
            <!-- Recent Courses -->
            <div class="bg-white rounded-xl shadow-lg p-6">
              <div class="flex items-center justify-between mb-6">
                <h3 class="text-xl font-semibold text-gray-900">Khóa học gần đây</h3>
                <button (click)="navigateToCourseManagement()"
                        class="text-purple-600 hover:text-purple-700 font-medium">
                  Xem tất cả →
                </button>
              </div>
              
              <div class="space-y-4">
                @for (course of filteredCourses(); track course.id) {
                  <div class="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <img [src]="course.thumbnail" 
                         [alt]="course.title"
                         class="w-16 h-16 rounded-lg object-cover">
                    <div class="flex-1">
                      <h4 class="font-semibold text-gray-900">{{ course.title }}</h4>
                      <p class="text-sm text-gray-600 mb-2">{{ course.shortDescription }}</p>
                      <div class="flex items-center justify-between text-sm">
                        <div class="flex items-center space-x-4">
                          <span class="text-gray-500">{{ course.students }} học viên</span>
                          <span class="text-gray-500">{{ course.rating }}/5 ⭐</span>
                          <span class="px-2 py-1 text-xs font-medium rounded-full"
                                [class]="getStatusClass(course.status)">
                            {{ getStatusText(course.status) }}
                          </span>
                        </div>
                        <span class="font-medium text-purple-600">{{ formatCurrency(course.revenue) }}</span>
                      </div>
                    </div>
                    <button (click)="editCourse(course.id)"
                            class="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium">
                      Chỉnh sửa
                    </button>
                  </div>
                }
              </div>
            </div>

            <!-- Recent Students -->
            <div class="bg-white rounded-xl shadow-lg p-6">
              <h3 class="text-xl font-semibold text-gray-900 mb-6">Học viên gần đây</h3>
              <div class="space-y-4">
                @for (student of filteredStudents(); track student.id) {
                  <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div class="flex items-center space-x-3">
                      <img [src]="student.avatar" 
                           [alt]="student.name"
                           class="w-12 h-12 rounded-full">
                      <div>
                        <h4 class="font-medium text-gray-900">{{ student.name }}</h4>
                        <p class="text-sm text-gray-600">{{ student.courses.length }} khóa học</p>
                      </div>
                    </div>
                    <div class="text-right">
                      <p class="text-sm text-gray-500">{{ formatLastActive(student.lastActive) }}</p>
                      <div class="flex items-center space-x-2">
                        <span class="text-sm font-medium text-gray-900">{{ student.averageGrade }}/10</span>
                        <div class="w-20 bg-gray-200 rounded-full h-2">
                          <div class="bg-green-600 h-2 rounded-full" [style.width.%]="student.progress"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Right Column - Stats & Quick Info (4 columns) -->
          <div class="col-span-12 xl:col-span-4 space-y-8">
            <!-- Performance Stats -->
            <div class="bg-white rounded-xl shadow-lg p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-6">Thống kê hiệu suất</h3>
              <div class="space-y-6">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">Tỷ lệ hoàn thành</span>
                  <div class="flex items-center space-x-2">
                    <div class="w-20 bg-gray-200 rounded-full h-2">
                      <div class="bg-green-600 h-2 rounded-full" style="width: 78%"></div>
                    </div>
                    <span class="text-sm font-medium text-gray-900">78%</span>
                  </div>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">Điểm trung bình</span>
                  <span class="text-sm font-medium text-gray-900">8.7/10</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">Học viên tích cực</span>
                  <span class="text-sm font-medium text-gray-900">85%</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">Đánh giá TB</span>
                  <span class="text-sm font-medium text-gray-900">4.7/5</span>
                </div>
              </div>
            </div>

            <!-- Pending Tasks -->
            <div class="bg-white rounded-xl shadow-lg p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-6">Nhiệm vụ chờ xử lý</h3>
              <div class="space-y-4">
                @for (assignment of pendingAssignments(); track assignment.id) {
                  <div class="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                    <h4 class="font-medium text-gray-900 text-sm">{{ assignment.title }}</h4>
                    <p class="text-xs text-gray-600 mb-2">{{ assignment.courseTitle }}</p>
                    <div class="flex items-center justify-between text-xs">
                      <span class="text-gray-500">{{ assignment.submissions }}/{{ assignment.totalStudents }} nộp bài</span>
                      <span class="text-yellow-600 font-medium">{{ formatDueDate(assignment.dueDate) }}</span>
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Quick Tips -->
            <div class="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">💡 Mẹo hay</h3>
              <div class="space-y-3 text-sm text-gray-700">
                <p>• Tạo bài tập thường xuyên để tăng tương tác học viên</p>
                <p>• Sử dụng video ngắn để giữ sự chú ý</p>
                <p>• Phản hồi nhanh để tăng điểm hài lòng</p>
                <p>• Cập nhật nội dung theo xu hướng mới</p>
              </div>
            </div>
          </div>
        </div>
        }

        @if (activeTab() === 'analytics') {
          <app-teacher-analytics></app-teacher-analytics>
        }

        @if (activeTab() === 'notifications') {
          <app-teacher-notifications></app-teacher-notifications>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeacherDashboardComponent implements OnInit, OnDestroy {
  protected authService = inject(AuthService);
  protected teacherService = inject(TeacherService);
  protected notificationService = inject(NotificationService);
  private router = inject(Router);

  // Tab management
  activeTab = signal<'overview' | 'analytics' | 'notifications'>('overview');
  
  // New features
  searchQuery = signal('');
  isRefreshing = signal(false);
  lastUpdateTime = signal(new Date());
  unreadNotificationsCount = signal(5);
  private refreshInterval?: Subscription;

  // Computed properties
  totalCourses = computed(() => this.teacherService.courses().length);
  totalStudents = computed(() => this.teacherService.totalStudents());
  totalRevenue = computed(() => this.teacherService.totalRevenue());

  averageRating = computed(() => {
    const courses = this.teacherService.courses().filter(course => course.rating > 0);
    if (courses.length === 0) return 0;
    return (courses.reduce((sum, course) => sum + course.rating, 0) / courses.length).toFixed(1);
  });

  recentCourses = computed(() => 
    this.teacherService.courses().slice(0, 3)
  );

  recentStudents = computed(() => 
    this.teacherService.students().slice(0, 5)
  );

  pendingAssignments = computed(() => 
    this.teacherService.assignments().filter(assignment => assignment.status === 'active').slice(0, 3)
  );

  // New computed properties
  unreadNotifications = computed(() => this.notificationService.unreadCount());
  
  filteredCourses = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.teacherService.courses().slice(0, 3);
    
    return this.teacherService.courses().filter(course => 
      course.title.toLowerCase().includes(query) ||
      course.description.toLowerCase().includes(query) ||
      course.shortDescription.toLowerCase().includes(query)
    ).slice(0, 3);
  });
  
  filteredStudents = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.teacherService.students().slice(0, 5);
    
    return this.teacherService.students().filter(student => 
      student.name.toLowerCase().includes(query) ||
      student.email.toLowerCase().includes(query)
    ).slice(0, 5);
  });

  ngOnInit(): void {
    this.loadData();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      this.refreshInterval.unsubscribe();
    }
  }

  async loadData(): Promise<void> {
    await Promise.all([
      this.teacherService.getCourses(),
      this.teacherService.getStudents(),
      this.teacherService.getAssignments()
    ]);
    this.lastUpdateTime.set(new Date());
  }

  // New methods
  async refreshData(): Promise<void> {
    this.isRefreshing.set(true);
    try {
      await this.loadData();
    } finally {
      this.isRefreshing.set(false);
    }
  }

  startAutoRefresh(): void {
    // Auto refresh every 30 seconds
    this.refreshInterval = interval(30000).subscribe(() => {
      this.refreshData();
    });
  }

  navigateToStudents(): void {
    this.router.navigate(['/teacher/students']);
  }

  getLastUpdateTime(): string {
    return this.lastUpdateTime().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  // Navigation methods
  navigateToCourseCreation(): void {
    this.router.navigate(['/teacher/course-creation']);
  }

  navigateToCourseManagement(): void {
    this.router.navigate(['/teacher/courses']);
  }

  navigateToAssignments(): void {
    this.router.navigate(['/teacher/assignments']);
  }

  navigateToAnalytics(): void {
    this.setActiveTab('analytics');
  }

  editCourse(courseId: string): void {
    this.router.navigate(['/teacher/courses', courseId, 'edit']);
  }

  setActiveTab(tab: 'overview' | 'analytics' | 'notifications'): void {
    this.activeTab.set(tab);
  }

  // Utility methods
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getCurrentTime(): string {
    return new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'archived':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'draft':
        return 'Nháp';
      case 'active':
        return 'Đang hoạt động';
      case 'completed':
        return 'Hoàn thành';
      case 'archived':
        return 'Lưu trữ';
      default:
        return 'Không xác định';
    }
  }

  formatLastActive(date: Date): string {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Vừa xong';
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} ngày trước`;
  }

  formatDueDate(date: Date): string {
    const now = new Date();
    const diffInDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays < 0) return 'Quá hạn';
    if (diffInDays === 0) return 'Hôm nay';
    if (diffInDays === 1) return 'Ngày mai';
    return `${diffInDays} ngày`;
  }
}
