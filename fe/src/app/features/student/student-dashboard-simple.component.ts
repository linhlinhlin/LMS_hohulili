import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { StudentEnrollmentService } from './services/enrollment.service';
import { EnrolledCourse } from './types';

@Component({
  selector: 'app-student-dashboard-simple',
  imports: [CommonModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <header class="bg-white shadow-sm border-b">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center h-16">
            <div class="flex items-center">
              <h1 class="text-xl font-semibold text-gray-900">🎓 Student Dashboard</h1>
            </div>
            <div class="flex items-center space-x-4">
              <span class="text-sm text-gray-600">{{ authService.currentUser()?.name }}</span>
              <button (click)="logout()" 
                      class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Welcome Section -->
        <div class="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white mb-8">
          <h2 class="text-2xl font-bold mb-2">Chào mừng trở lại!</h2>
          <p class="text-blue-100">Bạn đang học {{ authService.currentUser()?.name }}</p>
        </div>

        <!-- Quick Stats -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center">
              <div class="p-3 rounded-full bg-blue-100 text-blue-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">Khóa học đang học</p>
                <p class="text-2xl font-semibold text-gray-900">{{ inProgressCoursesCount() }}</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center">
              <div class="p-3 rounded-full bg-green-100 text-green-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">Khóa học hoàn thành</p>
                <p class="text-2xl font-semibold text-gray-900">{{ completedCoursesCount() }}</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center">
              <div class="p-3 rounded-full bg-yellow-100 text-yellow-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">Tiến độ trung bình</p>
                <p class="text-2xl font-semibold text-gray-900">{{ averageProgress() }}%</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="bg-white rounded-lg shadow p-6 mb-8">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Thao tác nhanh</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button routerLink="/student/courses" 
                    class="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div class="p-2 rounded-full bg-blue-100 text-blue-600 mr-3">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
              </div>
              <div class="text-left">
                <p class="font-medium text-gray-900">Khóa học</p>
                <p class="text-sm text-gray-600">Xem khóa học</p>
              </div>
            </button>

            <button routerLink="/student/assignments" 
                    class="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div class="p-2 rounded-full bg-green-100 text-green-600 mr-3">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
              </div>
              <div class="text-left">
                <p class="font-medium text-gray-900">Bài tập</p>
                <p class="text-sm text-gray-600">Xem bài tập</p>
              </div>
            </button>

            <button routerLink="/student/grades" 
                    class="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div class="p-2 rounded-full bg-yellow-100 text-yellow-600 mr-3">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              </div>
              <div class="text-left">
                <p class="font-medium text-gray-900">Điểm số</p>
                <p class="text-sm text-gray-600">Xem điểm</p>
              </div>
            </button>

            <button routerLink="/student/profile" 
                    class="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div class="p-2 rounded-full bg-purple-100 text-purple-600 mr-3">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
              </div>
              <div class="text-left">
                <p class="font-medium text-gray-900">Hồ sơ</p>
                <p class="text-sm text-gray-600">Cập nhật thông tin</p>
              </div>
            </button>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Hoạt động gần đây</h3>
          @if (enrolledCourses().length > 0) {
            <div class="space-y-4">
              @for (course of enrolledCourses().slice(0, 3); track course.id) {
                <div class="flex items-center p-4 border border-gray-200 rounded-lg">
                  <div class="p-2 rounded-full bg-blue-100 text-blue-600 mr-3">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                    </svg>
                  </div>
                  <div class="flex-1">
                    <p class="font-medium text-gray-900">Đang học "{{ course.title }}"</p>
                    <p class="text-sm text-gray-600">Tiến độ: {{ course.progress }}% • {{ course.completedLessons }}/{{ course.totalLessons }} bài học</p>
                  </div>
                  <span class="text-blue-600 font-medium">{{ course.status === 'completed' ? 'Hoàn thành' : 'Đang học' }}</span>
                </div>
              }
            </div>
          } @else {
            <div class="text-center py-8">
              <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
              <h3 class="text-lg font-medium text-gray-900 mb-2">Chưa có hoạt động nào</h3>
              <p class="text-gray-600">Hãy bắt đầu bằng việc đăng ký khóa học đầu tiên của bạn.</p>
            </div>
          }
        </div>
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentDashboardSimpleComponent implements OnInit {
  protected authService = inject(AuthService);
  private enrollmentService = inject(StudentEnrollmentService);
  private router = inject(Router);

  // Reactive state
  enrolledCourses = signal<EnrolledCourse[]>([]);
  isLoading = signal(false);

  // Computed stats
  readonly enrolledCoursesCount = computed(() => this.enrolledCourses().length);
  readonly inProgressCoursesCount = computed(() =>
    this.enrolledCourses().filter(course => course.status === 'in-progress').length
  );
  readonly completedCoursesCount = computed(() =>
    this.enrolledCourses().filter(course => course.status === 'completed').length
  );
  readonly averageProgress = computed(() => {
    const courses = this.enrolledCourses();
    if (courses.length === 0) return 0;
    return Math.round(courses.reduce((sum, course) => sum + course.progress, 0) / courses.length);
  });

  ngOnInit(): void {
    this.loadDashboardData();
  }

  private async loadDashboardData(): Promise<void> {
    try {
      this.isLoading.set(true);
      await this.enrollmentService.loadEnrolledCourses();
      this.enrolledCourses.set(this.enrollmentService.enrolledCourses());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Keep empty state if loading fails
    } finally {
      this.isLoading.set(false);
    }
  }

  logout(): void {
    this.authService.logout();
  }
}