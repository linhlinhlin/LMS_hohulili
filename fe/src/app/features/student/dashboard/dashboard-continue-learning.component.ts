import { Component, input, output } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { EnrolledCourse } from '../types';

@Component({
  selector: 'app-dashboard-continue-learning',
  imports: [CommonModule, NgOptimizedImage],
  template: `
    <!-- Continue Learning -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-lg font-bold text-gray-900">Tiếp tục học tập</h3>
        <button (click)="goToLearning.emit()"
                class="text-blue-600 hover:text-blue-700 font-medium transition-colors">
          Xem tất cả →
        </button>
      </div>

      @if (enrolledCourses().length > 0) {
        <div class="space-y-4">
          @for (course of enrolledCourses().slice(0, 3); track course.id) {
            <div class="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 cursor-pointer"
                  [class.opacity-75]="isNavigating()"
                  [class.pointer-events-none]="isNavigating()"
                  (click)="continueLearning.emit(course.id)">
              <img [ngSrc]="course.thumbnail || 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=96&h=64&fit=crop'" width="96" height="64" [alt]="course.title"
                    class="w-24 h-16 rounded-lg object-cover">
              <div class="flex-1">
                <h4 class="font-semibold text-gray-900 mb-1">{{ course.title }}</h4>
                <p class="text-sm text-gray-600 mb-2">{{ course.instructor }}</p>
                <div class="flex items-center justify-between text-sm">
                  <span class="text-gray-500">{{ course.completedLessons || 0 }}/{{ course.totalLessons || 0 }} bài học</span>
                  <div class="flex items-center space-x-2">
                    <div class="w-24 bg-gray-200 rounded-full h-2">
                      <div class="bg-blue-600 h-2 rounded-full transition-all duration-500"
                            [style.width.%]="course.progress || 0"></div>
                    </div>
                    <span class="font-medium text-gray-900">{{ course.progress || 0 }}%</span>
                  </div>
                </div>
              </div>
              <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2"
                      [disabled]="isNavigating()">
                      <span>{{ course.status === 'completed' ? 'Xem lại' : 'Tiếp tục' }}</span>
              </button>
            </div>
          }
        </div>
      } @else {
        <div class="text-center py-8">
          <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
          </svg>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Chưa có khóa học nào</h3>
          <p class="text-gray-600">Bạn chưa đăng ký khóa học nào. Hãy bắt đầu bằng việc khám phá các khóa học có sẵn.</p>
        </div>
      }
    </div>
  `,
})
export class DashboardContinueLearningComponent {
  enrolledCourses = input<EnrolledCourse[]>([]);
  isNavigating = input<boolean>(false);

  continueLearning = output<string>();
  goToLearning = output<void>();
}