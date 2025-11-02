import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-student-courses-simple',
  imports: [CommonModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="p-6">
        <!-- Page Header -->
        <div class="mb-8">
          <h2 class="text-2xl font-bold text-gray-900 mb-2">Khóa học đang học</h2>
          <p class="text-gray-600">Quản lý và theo dõi tiến độ học tập của bạn</p>
        </div>

        <!-- Course Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- Course 1 -->
          <div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <div class="h-48 bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white">
              <div class="flex items-center justify-between mb-4">
                <span class="bg-blue-400 bg-opacity-50 px-3 py-1 rounded-full text-sm font-medium">Đang học</span>
                <span class="text-sm opacity-90">75% hoàn thành</span>
              </div>
              <h3 class="text-xl font-bold mb-2">Navigation Basics</h3>
              <p class="text-blue-100 text-sm">Học các kỹ năng điều hướng cơ bản trong hàng hải</p>
            </div>
            <div class="p-6">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center">
                  <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                    </svg>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">Thầy Nguyễn Văn A</p>
                    <p class="text-sm text-gray-600">Giảng viên</p>
                  </div>
                </div>
              </div>
              
              <div class="mb-4">
                <div class="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Tiến độ</span>
                  <span>75%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div class="bg-blue-500 h-2 rounded-full" style="width: 75%"></div>
                </div>
              </div>

              <div class="flex items-center justify-between">
                <div class="text-sm text-gray-600">
                  <span class="flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    12 bài học
                  </span>
                </div>
                <button (click)="continueCourse(1)" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  Tiếp tục học
                </button>
              </div>
            </div>
          </div>

          <!-- Course 2 -->
          <div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <div class="h-48 bg-gradient-to-br from-green-500 to-green-600 p-6 text-white">
              <div class="flex items-center justify-between mb-4">
                <span class="bg-green-400 bg-opacity-50 px-3 py-1 rounded-full text-sm font-medium">Mới</span>
                <span class="text-sm opacity-90">25% hoàn thành</span>
              </div>
              <h3 class="text-xl font-bold mb-2">Maritime Safety</h3>
              <p class="text-green-100 text-sm">An toàn hàng hải và các quy định quốc tế</p>
            </div>
            <div class="p-6">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center">
                  <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">Thầy Trần Thị B</p>
                    <p class="text-sm text-gray-600">Giảng viên</p>
                  </div>
                </div>
              </div>
              
              <div class="mb-4">
                <div class="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Tiến độ</span>
                  <span>25%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div class="bg-green-500 h-2 rounded-full" style="width: 25%"></div>
                </div>
              </div>

              <div class="flex items-center justify-between">
                <div class="text-sm text-gray-600">
                  <span class="flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    8 bài học
                  </span>
                </div>
                <button (click)="startCourse(2)" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  Bắt đầu học
                </button>
              </div>
            </div>
          </div>

          <!-- Course 3 -->
          <div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <div class="h-48 bg-gradient-to-br from-purple-500 to-purple-600 p-6 text-white">
              <div class="flex items-center justify-between mb-4">
                <span class="bg-purple-400 bg-opacity-50 px-3 py-1 rounded-full text-sm font-medium">Hoàn thành</span>
                <span class="text-sm opacity-90">100% hoàn thành</span>
              </div>
              <h3 class="text-xl font-bold mb-2">Ship Operations</h3>
              <p class="text-purple-100 text-sm">Vận hành tàu và quản lý đội ngũ</p>
            </div>
            <div class="p-6">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center">
                  <div class="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                    <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">Thầy Lê Văn C</p>
                    <p class="text-sm text-gray-600">Giảng viên</p>
                  </div>
                </div>
              </div>
              
              <div class="mb-4">
                <div class="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Tiến độ</span>
                  <span>100%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div class="bg-purple-500 h-2 rounded-full" style="width: 100%"></div>
                </div>
              </div>

              <div class="flex items-center justify-between">
                <div class="text-sm text-gray-600">
                  <span class="flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    15 bài học
                  </span>
                </div>
                <button class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  Xem lại
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Available Courses -->
        <div class="mt-12">
          <h3 class="text-xl font-bold text-gray-900 mb-6">Khóa học có sẵn</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div class="h-32 bg-gradient-to-br from-yellow-500 to-orange-500 p-6 text-white">
                <h4 class="text-lg font-bold mb-2">Weather Forecasting</h4>
                <p class="text-yellow-100 text-sm">Dự báo thời tiết cho hàng hải</p>
              </div>
              <div class="p-6">
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center">
                    <div class="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                      <svg class="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path>
                      </svg>
                    </div>
                    <div>
                      <p class="font-medium text-gray-900">Thầy Phạm Thị D</p>
                      <p class="text-sm text-gray-600">Giảng viên</p>
                    </div>
                  </div>
                </div>
                <div class="flex items-center justify-between">
                  <div class="text-sm text-gray-600">
                    <span class="flex items-center">
                      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      10 bài học
                    </span>
                  </div>
                  <button (click)="enrollCourse(3)" class="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    Đăng ký
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentCoursesSimpleComponent {
  protected authService = inject(AuthService);
  private router = inject(Router);

  // Navigate to learning interface for a specific course
  continueCourse(courseId: number): void {
    console.log('Continue course:', courseId);
    this.router.navigate(['/learn/course', courseId]).catch(error => {
      console.error('Navigation error:', error);
    });
  }

  // Navigate to course detail for enrollment
  enrollCourse(courseId: number): void {
    console.log('Enroll course:', courseId);
    this.router.navigate(['/courses', courseId]).catch(error => {
      console.error('Navigation error:', error);
    });
  }

  // Navigate to course start (for new courses)
  startCourse(courseId: number): void {
    console.log('Start course:', courseId);
    this.router.navigate(['/learn/course', courseId]).catch(error => {
      console.error('Navigation error:', error);
    });
  }
}