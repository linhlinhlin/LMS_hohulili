import { Component, Input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ExtendedCourse, CourseModule, EnhancedLesson } from '../../../../shared/types/course.types';
import { CourseDetailService } from '../services/course-detail.service';

@Component({
  selector: 'app-course-curriculum',
  imports: [CommonModule, RouterModule],
  template: `
    <div id="curriculum" class="bg-white rounded-lg shadow-sm p-6 mb-8">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-gray-900">Nội dung khóa học</h2>
        <div class="text-sm text-gray-500">
          {{ courseDetailService.modules().length }} chương • {{ getTotalLessons() }} bài học • {{ course()?.duration }}
        </div>
      </div>

      @if (courseDetailService.isLoading()) {
        <!-- Loading State -->
        <div class="space-y-4">
          @for (item of [1,2,3]; track item) {
            <div class="animate-pulse">
              <div class="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div class="space-y-2">
                @for (lesson of [1,2,3]; track lesson) {
                  <div class="h-4 bg-gray-200 rounded w-full"></div>
                }
              </div>
            </div>
          }
        </div>
      } @else if (courseDetailService.modules().length === 0) {
        <!-- Empty State -->
        <div class="text-center py-8">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">Chưa có nội dung</h3>
          <p class="mt-1 text-sm text-gray-500">Nội dung khóa học đang được cập nhật</p>
        </div>
      } @else {
        <!-- Curriculum Content -->
        <div class="space-y-6">
          @for (module of courseDetailService.modules(); track module.id) {
            <div class="border border-gray-200 rounded-lg overflow-hidden">
              <!-- Module Header -->
              <div class="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span class="text-sm font-semibold text-blue-600">{{ module.order }}</span>
                    </div>
                    <div>
                      <h3 class="text-lg font-semibold text-gray-900">{{ module.title }}</h3>
                      <p class="text-sm text-gray-600">{{ module.description }}</p>
                    </div>
                  </div>
                  <div class="text-sm text-gray-500">
                    {{ module.lessons.length }} bài • {{ formatDuration(module.duration) }}
                  </div>
                </div>
              </div>

              <!-- Module Lessons -->
              <div class="divide-y divide-gray-200">
                @for (lesson of module.lessons; track lesson.id) {
                  <div class="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center space-x-4">
                        <!-- Lesson Icon -->
                        <div class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          @switch (lesson.type) {
                            @case ('video') {
                              <svg class="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
                              </svg>
                            }
                            @case ('text') {
                              <svg class="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/>
                              </svg>
                            }
                            @case ('quiz') {
                              <svg class="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
                              </svg>
                            }
                            @case ('assignment') {
                              <svg class="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/>
                              </svg>
                            }
                          }
                        </div>

                        <!-- Lesson Info -->
                        <div>
                          <h4 class="text-sm font-medium text-gray-900">{{ lesson.title }}</h4>
                          <div class="flex items-center space-x-2 text-xs text-gray-500">
                            <span>{{ formatDuration(lesson.duration) }}</span>
                            <span>•</span>
                            <span class="capitalize">{{ getLessonTypeLabel(lesson.type) }}</span>
                          </div>
                        </div>
                      </div>

                      <!-- Lesson Actions -->
                      <div class="flex items-center space-x-2">
                        @if (lesson.isCompleted) {
                          <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                            </svg>
                            Hoàn thành
                          </span>
                        } @else {
                          @if (courseDetailService.enrollmentStatus() === 'enrolled') {
                            <button 
                              [routerLink]="['/learn', course()?.id, 'lesson', lesson.id]"
                              class="text-blue-600 hover:text-blue-700 text-sm font-medium">
                              Bắt đầu
                            </button>
                          } @else {
                            <span class="text-gray-400 text-sm">Khóa học</span>
                          }
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <!-- Curriculum Summary -->
        <div class="mt-8 p-6 bg-blue-50 rounded-lg">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Tóm tắt khóa học</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="text-center">
              <div class="text-2xl font-bold text-blue-600">{{ courseDetailService.modules().length }}</div>
              <div class="text-sm text-gray-600">Chương học</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-blue-600">{{ getTotalLessons() }}</div>
              <div class="text-sm text-gray-600">Bài học</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-blue-600">{{ getTotalDuration() }}</div>
              <div class="text-sm text-gray-600">Tổng thời lượng</div>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class CourseCurriculumComponent {
  @Input() course = computed<ExtendedCourse | null>(() => null);
  
  protected courseDetailService = inject(CourseDetailService);

  getTotalLessons(): number {
    return this.courseDetailService.modules().reduce((total, module) => total + module.lessons.length, 0);
  }

  getTotalDuration(): string {
    const totalMinutes = this.courseDetailService.modules().reduce((total, module) => total + module.duration, 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  getLessonTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'video': 'Video',
      'text': 'Tài liệu',
      'quiz': 'Bài tập',
      'assignment': 'Bài tập lớn'
    };
    return labels[type] || type;
  }
}