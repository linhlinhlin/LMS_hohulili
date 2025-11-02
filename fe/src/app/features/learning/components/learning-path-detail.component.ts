import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { LearningPathService } from '../../../core/services/learning-path.service';
import { LearningPath, LearningPathCourse, LearningPathLesson } from '../../../shared/types/learning-path.types';

@Component({
  selector: 'app-learning-path-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white shadow-sm border-b">
        <div class="max-w-7xl mx-auto px-6 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <button (click)="goBack()"
                      class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                </svg>
              </button>
              <div>
                <h1 class="text-2xl font-bold text-gray-900">{{ learningPath()?.title }}</h1>
                <p class="text-gray-600">{{ learningPath()?.description }}</p>
              </div>
            </div>
            <div class="flex items-center space-x-4">
              <div class="text-right">
                <div class="text-sm text-gray-600">Tiến độ</div>
                <div class="text-2xl font-bold text-blue-600">{{ learningPath()?.progress }}%</div>
              </div>
              <button (click)="startLearning()"
                      [disabled]="learningPath()?.isCompleted"
                      class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {{ learningPath()?.isCompleted ? 'Đã hoàn thành' : 'Bắt đầu học' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="max-w-7xl mx-auto px-6 py-8">
        <!-- Learning Path Overview -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <!-- Main Info -->
          <div class="lg:col-span-2">
            <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 class="text-xl font-semibold text-gray-900 mb-4">Tổng quan lộ trình</h2>
              
              <!-- Progress Overview -->
              <div class="mb-6">
                <div class="flex justify-between text-sm mb-2">
                  <span>Tiến độ tổng thể</span>
                  <span>{{ learningPath()?.progress }}%</span>
                </div>
                <div class="bg-gray-200 rounded-full h-3">
                  <div class="bg-blue-500 rounded-full h-3 transition-all duration-300" 
                       [style.width.%]="learningPath()?.progress || 0"></div>
                </div>
              </div>

              <!-- Learning Objectives -->
              <div class="mb-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-3">Mục tiêu học tập</h3>
                <ul class="space-y-2">
                  @for (objective of learningPath()?.learningObjectives; track objective) {
                    <li class="flex items-center text-gray-700">
                      <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                      </svg>
                      {{ objective }}
                    </li>
                  }
                </ul>
              </div>

              <!-- Skills -->
              <div class="mb-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-3">Kỹ năng sẽ học được</h3>
                <div class="flex flex-wrap gap-2">
                  @for (skill of learningPath()?.skills; track skill) {
                    <span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {{ skill }}
                    </span>
                  }
                </div>
              </div>
            </div>
          </div>

          <!-- Sidebar -->
          <div class="lg:col-span-1">
            <!-- Path Info -->
            <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Thông tin lộ trình</h3>
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <span class="text-gray-600">Thời gian</span>
                  <span class="font-medium">{{ learningPath()?.duration }} tuần</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-gray-600">Tổng giờ học</span>
                  <span class="font-medium">{{ learningPath()?.estimatedTime }} giờ</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-gray-600">Độ khó</span>
                  <div class="flex items-center">
                    @for (star of getDifficultyStars(); track star) {
                      <svg class="w-4 h-4" [class]="star <= (learningPath()?.difficulty || 0) ? 'text-yellow-400' : 'text-gray-300'" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                      </svg>
                    }
                  </div>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-gray-600">Cấp độ</span>
                  <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {{ getCategoryLabel(learningPath()?.category) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Prerequisites -->
            @if (learningPath()?.prerequisites && learningPath()!.prerequisites.length > 0) {
              <div class="bg-white rounded-xl shadow-lg p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Yêu cầu tiên quyết</h3>
                <ul class="space-y-2">
                  @for (prerequisite of learningPath()?.prerequisites; track prerequisite) {
                    <li class="flex items-center text-gray-700">
                      <svg class="w-5 h-5 text-orange-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                      </svg>
                      {{ prerequisite }}
                    </li>
                  }
                </ul>
              </div>
            }
          </div>
        </div>

        <!-- Courses -->
        <div class="bg-white rounded-xl shadow-lg p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-6">Khóa học trong lộ trình</h2>
          <div class="space-y-6">
            @for (course of learningPath()?.courses; track course.id) {
              <div class="border border-gray-200 rounded-lg p-6">
                <div class="flex items-start justify-between mb-4">
                  <div class="flex-1">
                    <div class="flex items-center mb-2">
                      <h3 class="text-lg font-semibold text-gray-900 mr-3">{{ course.title }}</h3>
                      @if (course.isRequired) {
                        <span class="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                          Bắt buộc
                        </span>
                      }
                    </div>
                    <p class="text-gray-600 text-sm mb-3">{{ course.description }}</p>
                    <div class="flex items-center space-x-4 text-sm text-gray-500">
                      <span>{{ course.estimatedTime }} giờ</span>
                      <span>Độ khó: {{ course.difficulty }}/5</span>
                      <span>{{ course.lessons.length }} bài học</span>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-2xl font-bold text-blue-600">{{ course.progress }}%</div>
                    <div class="text-sm text-gray-600">Hoàn thành</div>
                  </div>
                </div>

                <!-- Course Progress -->
                <div class="mb-4">
                  <div class="bg-gray-200 rounded-full h-2">
                    <div class="bg-blue-500 rounded-full h-2 transition-all duration-300" 
                         [style.width.%]="course.progress"></div>
                  </div>
                </div>

                <!-- Lessons -->
                <div class="space-y-3">
                  @for (lesson of course.lessons; track lesson.id) {
                    <div class="flex items-center p-3 bg-gray-50 rounded-lg"
                         [class]="lesson.isCompleted ? 'bg-green-50 border border-green-200' : ''">
                      <div class="flex items-center flex-1">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                             [class]="lesson.isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'">
                          @if (lesson.isCompleted) {
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                            </svg>
                          } @else {
                            <span class="text-sm font-medium">{{ lesson.order }}</span>
                          }
                        </div>
                        <div class="flex-1">
                          <h4 class="font-medium text-gray-900">{{ lesson.title }}</h4>
                          <p class="text-sm text-gray-600">{{ lesson.description }}</p>
                          <div class="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                            <span>{{ lesson.type }}</span>
                            <span>{{ lesson.estimatedTime }} phút</span>
                            @if (lesson.isCompleted) {
                              <span class="text-green-600 font-medium">Đã hoàn thành</span>
                            }
                          </div>
                        </div>
                      </div>
                      <button (click)="startLesson(lesson.id, course.id)"
                              [disabled]="!lesson.isUnlocked"
                              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm">
                        {{ lesson.isCompleted ? 'Xem lại' : 'Bắt đầu' }}
                      </button>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class LearningPathDetailComponent implements OnInit {
  private learningPathService = inject(LearningPathService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Signals
  learningPath = signal<LearningPath | undefined>(undefined);

  // Computed values
  getDifficultyStars = computed(() => [1, 2, 3, 4, 5]);

  ngOnInit(): void {
    const pathId = this.route.snapshot.paramMap.get('id');
    if (pathId) {
      const path = this.learningPathService.getLearningPath(pathId);
      this.learningPath.set(path);
    }
  }

  getCategoryLabel(category?: string): string {
    const labels: { [key: string]: string } = {
      'beginner': 'Cơ bản',
      'intermediate': 'Trung cấp',
      'advanced': 'Nâng cao',
      'expert': 'Chuyên gia'
    };
    return labels[category || 'beginner'] || 'Cơ bản';
  }

  startLearning(): void {
    const path = this.learningPath();
    if (path && path.courses.length > 0) {
      const firstCourse = path.courses[0];
      if (firstCourse.lessons.length > 0) {
        const firstLesson = firstCourse.lessons[0];
        this.startLesson(firstLesson.id, firstCourse.id);
      }
    }
  }

  startLesson(lessonId: string, courseId: string): void {
    // Navigate to lesson
    this.router.navigate(['/learn/course', courseId, 'lesson', lessonId]);
  }

  goBack(): void {
    this.router.navigate(['/learn/learning-paths']);
  }
}