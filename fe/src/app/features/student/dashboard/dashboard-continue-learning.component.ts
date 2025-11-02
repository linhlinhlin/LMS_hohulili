import { Component, input, output } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { EnrolledCourse } from '../../../shared/types/course.types';

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

      <div class="space-y-4">
        @for (course of enrolledCourses().slice(0, 3); track course.id) {
          <div class="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 cursor-pointer"
                [class.opacity-75]="isNavigating()"
                [class.pointer-events-none]="isNavigating()"
                (click)="continueLearning.emit(course.id)">
            <img [ngSrc]="course.thumbnail" width="96" height="64" [alt]="course.title"
                  class="w-24 h-16 rounded-lg object-cover">
            <div class="flex-1">
              <h4 class="font-semibold text-gray-900 mb-1">{{ course.title }}</h4>
              <p class="text-sm text-gray-600 mb-2">{{ course.instructor }}</p>
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-500">{{ course.completedLessons }}/{{ course.totalLessons }} bài học</span>
                <div class="flex items-center space-x-2">
                  <div class="w-24 bg-gray-200 rounded-full h-2">
                    <div class="bg-blue-600 h-2 rounded-full transition-all duration-500"
                          [style.width.%]="course.progress"></div>
                  </div>
                  <span class="font-medium text-gray-900">{{ course.progress }}%</span>
                </div>
              </div>
            </div>
            <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2"
                    [disabled]="isNavigating()">
                    <span>Tiếp tục</span>
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class DashboardContinueLearningComponent {
  enrolledCourses = input<EnrolledCourse[]>([]);
  isNavigating = input<boolean>(false);

  continueLearning = output<string>();
  goToLearning = output<void>();
}