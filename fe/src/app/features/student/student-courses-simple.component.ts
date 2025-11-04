import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { StudentEnrollmentService } from './services/enrollment.service';
import { EnrolledCourse } from './types';

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
        @if (enrolledCourses().length > 0) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (course of enrolledCourses(); track course.id) {
              <div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div class="h-48 bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white">
                  <div class="flex items-center justify-between mb-4">
                    <span class="bg-blue-400 bg-opacity-50 px-3 py-1 rounded-full text-sm font-medium">
                      {{ course.status === 'completed' ? 'Hoàn thành' : course.status === 'in-progress' ? 'Đang học' : 'Mới' }}
                    </span>
                    <span class="text-sm opacity-90">{{ course.progress }}% hoàn thành</span>
                  </div>
                  <h3 class="text-xl font-bold mb-2">{{ course.title }}</h3>
                  <p class="text-blue-100 text-sm">{{ course.description }}</p>
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
                        <p class="font-medium text-gray-900">{{ course.instructor }}</p>
                        <p class="text-sm text-gray-600">Giảng viên</p>
                      </div>
                    </div>
                  </div>

                  <div class="mb-4">
                    <div class="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Tiến độ</span>
                      <span>{{ course.progress }}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                      <div class="bg-blue-500 h-2 rounded-full" [style.width.%]="course.progress"></div>
                    </div>
                  </div>

                  <div class="flex items-center justify-between">
                    <div class="text-sm text-gray-600">
                      <span class="flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        {{ course.totalLessons }} bài học
                      </span>
                    </div>
                    <button
                      (click)="course.status === 'completed' ? reviewCourse(course.id) : continueCourse(course.id)"
                      class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      [class]="course.status === 'completed' ? 'bg-gray-500 hover:bg-gray-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'"
                    >
                      {{ course.status === 'completed' ? 'Xem lại' : 'Tiếp tục học' }}
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="text-center py-12">
            <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Chưa có khóa học nào</h3>
            <p class="text-gray-600">Bạn chưa đăng ký khóa học nào. Hãy khám phá các khóa học có sẵn bên dưới.</p>
          </div>
        }

        <!-- Available Courses -->
        <div class="mt-12">
          <h3 class="text-xl font-bold text-gray-900 mb-6">Khóa học có sẵn</h3>
          @if (availableCourses().length > 0) {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              @for (course of availableCourses(); track course.id) {
                <div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <div class="h-32 bg-gradient-to-br from-yellow-500 to-orange-500 p-6 text-white">
                    <h4 class="text-lg font-bold mb-2">{{ course.title }}</h4>
                    <p class="text-yellow-100 text-sm">{{ course.description }}</p>
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
                          <p class="font-medium text-gray-900">{{ course.teacherName }}</p>
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
                          {{ course.enrolledCount || 0 }} học viên
                        </span>
                      </div>
                      <button
                        class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        [class.bg-gray-200]="course.enrolled"
                        [class.text-gray-700]="course.enrolled"
                        [class.bg-yellow-500]="!course.enrolled"
                        [class.text-white]="!course.enrolled"
                        [class.hover:bg-yellow-600]="!course.enrolled"
                        [class.cursor-not-allowed]="course.enrolled"
                        [disabled]="course.enrolled"
                        (click)="!course.enrolled && enrollCourse(course.id)">
                        {{ course.enrolled ? 'Đã đăng ký' : 'Đăng ký' }}
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="text-center py-8">
              <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
              </svg>
              <h3 class="text-lg font-medium text-gray-900 mb-2">Không có khóa học nào</h3>
              <p class="text-gray-600">Hiện tại chưa có khóa học nào có sẵn để đăng ký.</p>
            </div>
          }
        </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentCoursesSimpleComponent implements OnInit {
  protected authService = inject(AuthService);
  private router = inject(Router);
  private enrollmentService = inject(StudentEnrollmentService);

  // Reactive state
  enrolledCourses = signal<EnrolledCourse[]>([]);
  availableCourses = signal<any[]>([]);
  isLoading = signal(false);

  // Computed properties
  readonly inProgressCourses = computed(() =>
    this.enrolledCourses().filter(course => course.status === 'in-progress')
  );

  readonly completedCourses = computed(() =>
    this.enrolledCourses().filter(course => course.status === 'completed')
  );

  ngOnInit(): void {
    this.loadCourses();
  }

  private async loadCourses(): Promise<void> {
    try {
      this.isLoading.set(true);
      await Promise.all([
        this.enrollmentService.loadEnrolledCourses(),
        this.enrollmentService.loadAvailableCourses()
      ]);

      this.enrolledCourses.set(this.enrollmentService.enrolledCourses());
      this.availableCourses.set(this.enrollmentService.availableCourses());
    } catch (error) {
      console.error('Error loading courses:', error);
      // Keep empty state if loading fails
    } finally {
      this.isLoading.set(false);
    }
  }

  // Navigate to learning interface for a specific course
  continueCourse(courseId: string): void {
    console.log('Continue course:', courseId);
    this.router.navigate(['/learn/course', courseId]).catch(error => {
      console.error('Navigation error:', error);
    });
  }

  // Navigate to course detail for enrollment
  async enrollCourse(courseId: string): Promise<void> {
    console.log('Enroll course:', courseId);
    const success = await this.enrollmentService.enrollInCourse(courseId);
    if (success) {
      // Reload courses after successful enrollment
      await this.loadCourses();
    }
  }

  // Navigate to course start (for new courses)
  startCourse(courseId: string): void {
    console.log('Start course:', courseId);
    this.router.navigate(['/learn/course', courseId]).catch(error => {
      console.error('Navigation error:', error);
    });
  }

  // Review completed course
  reviewCourse(courseId: string): void {
    console.log('Review course:', courseId);
    this.router.navigate(['/learn/course', courseId]).catch(error => {
      console.error('Navigation error:', error);
    });
  }
}