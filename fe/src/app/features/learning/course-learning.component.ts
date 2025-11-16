import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { LessonApi } from '../../api/client/lesson.api';
import { firstValueFrom } from 'rxjs';

interface CourseModule {
  id: string;
  title: string;
  description: string;
  order: number;
  lessons: CourseLesson[];
  duration: number; // in minutes
  isCompleted: boolean;
  isUnlocked: boolean;
}

interface CourseLesson {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  type: 'video' | 'text' | 'quiz' | 'assignment' | 'resource';
  duration: number; // in minutes
  content?: string;
  videoUrl?: string;
  resources: CourseResource[];
  isCompleted: boolean;
  isUnlocked: boolean;
  isPreview: boolean;
  order: number;
}

interface CourseResource {
  id: string;
  lessonId: string;
  title: string;
  type: 'pdf' | 'video' | 'audio' | 'document' | 'link';
  url: string;
  size?: number;
  downloadCount: number;
}

interface CourseLearning {
  id: string;
  title: string;
  description: string;
  instructor: {
    name: string;
    avatar: string;
    title: string;
  };
  thumbnail: string;
  modules: CourseModule[];
  totalDuration: number;
  progress: number;
  currentLesson?: string;
  lastAccessed: Date;
}

interface LearningProgress {
  courseId: string;
  userId: string;
  completedLessons: string[];
  currentModule: string;
  currentLesson: string;
  totalTimeSpent: number; // in minutes
  lastAccessed: Date;
}

@Component({
  selector: 'app-course-learning',
  imports: [CommonModule, RouterModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  template: `
    <div class="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 min-h-screen">
      <!-- Course Header -->
      <div class="bg-white shadow-xl border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-6 py-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <button (click)="goBack()"
                      class="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"></path>
                </svg>
                <span>Quay lại</span>
              </button>
              <div>
                <h1 class="text-3xl font-bold text-gray-900">{{ course()?.title }}</h1>
                <p class="text-gray-600">{{ course()?.instructor?.name }}</p>
              </div>
            </div>
            
            <div class="flex items-center space-x-6">
              <!-- Progress -->
              <div class="text-center">
                <div class="text-sm text-gray-600">Tiến độ</div>
                <div class="text-2xl font-bold text-gray-900">{{ course()?.progress }}%</div>
              </div>
              
              <!-- Duration -->
              <div class="text-center">
                <div class="text-sm text-gray-600">Thời gian</div>
                <div class="text-lg font-semibold text-gray-900">{{ formatDuration(course()?.totalDuration!) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-6 py-8">
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <!-- Course Content -->
          <div class="lg:col-span-3 space-y-6">
            @if (currentLesson()) {
              <!-- Current Lesson -->
              <div class="bg-white rounded-2xl shadow-lg p-8">
                <div class="flex items-center justify-between mb-6">
                  <div>
                    <h2 class="text-2xl font-bold text-gray-900">{{ currentLesson()?.title }}</h2>
                    <p class="text-gray-600">{{ currentLesson()?.description }}</p>
                  </div>
                  <div class="flex items-center space-x-3">
                    <span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      {{ getLessonTypeText(currentLesson()?.type!) }}
                    </span>
                    <span class="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                      {{ currentLesson()?.duration }} phút
                    </span>
                  </div>
                </div>

                <!-- Lesson Content -->
                <div class="mb-8">
                  @if (currentLesson()?.type === 'video') {
                    <!-- Video Player -->
                    <div class="relative bg-black rounded-xl overflow-hidden mb-6">
                      <div class="aspect-video bg-gray-900 flex items-center justify-center">
                        <div class="text-center text-white">
                          <svg class="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M8 5v10l8-5-8-5z"></path>
                          </svg>
                          <p class="text-lg font-medium">Video Player</p>
                          <p class="text-sm text-gray-300">{{ currentLesson()?.videoUrl }}</p>
                        </div>
                      </div>
                    </div>
                  }

                  @if (currentLesson()?.type === 'text') {
                    <!-- Text Content -->
                    <div class="prose max-w-none">
                      <div [innerHTML]="currentLesson()?.content"></div>
                    </div>
                  }

                  @if (currentLesson()?.type === 'quiz') {
                    <!-- Quiz Content -->
                    <div class="p-6 bg-blue-50 rounded-xl">
                      <div class="flex items-center space-x-3 mb-4">
                        <svg class="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
                        </svg>
                        <h3 class="text-lg font-semibold text-blue-900">Bài kiểm tra</h3>
                      </div>
                      <p class="text-blue-800 mb-4">{{ currentLesson()?.description }}</p>
                      <button (click)="startQuiz(currentLesson()?.id!)"
                              class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Bắt đầu làm bài
                      </button>
                    </div>
                  }

                  @if (currentLesson()?.type === 'assignment') {
                    <!-- Assignment Content -->
                    <div class="p-6 bg-green-50 rounded-xl">
                      <div class="flex items-center space-x-3 mb-4">
                        <svg class="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
                        </svg>
                        <h3 class="text-lg font-semibold text-green-900">Bài tập</h3>
                      </div>
                      <p class="text-green-800 mb-4">{{ currentLesson()?.description }}</p>
                      <button (click)="startAssignment(currentLesson()?.id!)"
                              class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                        Bắt đầu làm bài
                      </button>
                    </div>
                  }
                </div>

                <!-- Lesson Resources -->
                @if (currentLesson()?.resources && currentLesson()!.resources.length > 0) {
                  <div class="border-t border-gray-200 pt-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">📎 Tài liệu tham khảo</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      @for (resource of currentLesson()!.resources; track resource.id) {
                        <div class="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                          <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
                            </svg>
                          </div>
                          <div class="flex-1">
                            <h4 class="font-medium text-gray-900">{{ resource.title }}</h4>
                            <p class="text-sm text-gray-600">{{ getResourceTypeText(resource.type) }}</p>
                          </div>
                          <button (click)="downloadResource(resource.id)"
                                  class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            Tải xuống
                          </button>
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- Navigation -->
                <div class="flex items-center justify-between pt-6 border-t border-gray-200 mt-8">
                  <button (click)="previousLesson()"
                          [disabled]="!canGoPrevious()"
                          class="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors">
                    <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"></path>
                    </svg>
                    Bài trước
                  </button>

                  <div class="flex space-x-3">
                    <button (click)="markAsCompleted()"
                            [disabled]="currentLesson()?.isCompleted"
                            class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
                      @if (currentLesson()?.isCompleted) {
                        <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                        </svg>
                        Đã hoàn thành
                      } @else {
                        <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                        </svg>
                        Đánh dấu hoàn thành
                      }
                    </button>
                  </div>

                  <button (click)="nextLesson()"
                          [disabled]="!canGoNext()"
                          class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
                    Bài tiếp
                    <svg class="w-5 h-5 inline ml-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                  </button>
                </div>
              </div>
            } @else {
              <!-- Course Overview -->
              <div class="bg-white rounded-2xl shadow-lg p-8">
                <h2 class="text-2xl font-bold text-gray-900 mb-4">📚 Tổng quan khóa học</h2>
                <div class="prose max-w-none">
                  <p class="text-gray-700 leading-relaxed">{{ course()?.description }}</p>
                </div>
                
                <div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div class="p-6 bg-blue-50 rounded-xl">
                    <h3 class="font-semibold text-blue-900 mb-2">Thông tin khóa học</h3>
                    <ul class="text-sm text-blue-800 space-y-1">
                      <li>Số module: {{ getTotalModules() }}</li>
                      <li>Tổng bài học: {{ getTotalLessons() }}</li>
                      <li>Thời gian: {{ formatDuration(course()?.totalDuration!) }}</li>
                      <li>Tiến độ: {{ course()?.progress }}%</li>
                    </ul>
                  </div>
                  
                  <div class="p-6 bg-green-50 rounded-xl">
                    <h3 class="font-semibold text-green-900 mb-2">Giảng viên</h3>
                    <div class="flex items-center space-x-3">
                       <img [src]="course()?.instructor?.avatar"
                            [alt]="course()?.instructor?.name"
                           class="w-12 h-12 rounded-full object-cover">
                      <div>
                        <p class="font-medium text-green-900">{{ course()?.instructor?.name }}</p>
                        <p class="text-sm text-green-800">{{ course()?.instructor?.title }}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div class="p-6 bg-purple-50 rounded-xl">
                    <h3 class="font-semibold text-purple-900 mb-2">Bắt đầu học</h3>
                    <p class="text-sm text-purple-800 mb-4">Chọn bài học đầu tiên để bắt đầu khóa học</p>
                    <button (click)="startCourse()"
                            class="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                      Bắt đầu học
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Course Sidebar -->
          <div class="space-y-6">
            <!-- Course Progress -->
            <div class="bg-white rounded-2xl shadow-lg p-6">
              <h3 class="text-lg font-bold text-gray-900 mb-4">📊 Tiến độ khóa học</h3>
              <div class="space-y-4">
                <div>
                  <div class="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Tiến độ tổng thể</span>
                    <span>{{ course()?.progress }}%</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-3">
                    <div class="bg-blue-600 h-3 rounded-full transition-all duration-500" 
                         [style.width.%]="course()?.progress"></div>
                  </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div class="text-2xl font-bold text-gray-900">{{ getCompletedLessons() }}</div>
                    <div class="text-sm text-gray-600">Đã hoàn thành</div>
                  </div>
                  <div>
                    <div class="text-2xl font-bold text-gray-900">{{ getTotalLessons() - getCompletedLessons() }}</div>
                    <div class="text-sm text-gray-600">Còn lại</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Course Modules -->
            <div class="bg-white rounded-2xl shadow-lg p-6">
              <h3 class="text-lg font-bold text-gray-900 mb-4">📚 Nội dung khóa học</h3>
              <div class="space-y-3">
                @for (module of course()?.modules; track module.id) {
                  <div class="border border-gray-200 rounded-xl overflow-hidden">
                    <div class="p-4 bg-gray-50 border-b border-gray-200">
                      <div class="flex items-center justify-between">
                        <h4 class="font-semibold text-gray-900">{{ module.title }}</h4>
                        <span class="text-sm text-gray-600">{{ module.duration }} phút</span>
                      </div>
                      <p class="text-sm text-gray-600 mt-1">{{ module.description }}</p>
                    </div>
                    
                    <div class="p-4">
                      <div class="space-y-2">
                        @for (lesson of module.lessons; track lesson.id) {
                          <button (click)="selectLesson(lesson.id)"
                                  [disabled]="!lesson.isUnlocked"
                                  [class]="getLessonButtonClass(lesson)">
                            <div class="flex items-center space-x-3">
                              <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs">
                                @if (lesson.isCompleted) {
                                  <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                  </svg>
                                } @else {
                                  {{ lesson.order }}
                                }
                              </div>
                              <div class="flex-1 text-left">
                                <p class="font-medium">{{ lesson.title }}</p>
                                <p class="text-sm text-gray-600">{{ lesson.duration }} phút</p>
                              </div>
                              <span class="px-2 py-1 rounded-full text-xs font-medium"
                                    [class]="getLessonTypeClass(lesson.type)">
                                {{ getLessonTypeText(lesson.type) }}
                              </span>
                            </div>
                          </button>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseLearningComponent implements OnInit {
  protected authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private lessonApi = inject(LessonApi);

  // Component state
  course = signal<CourseLearning | null>(null);
  currentLessonId = signal<string | null>(null);
  learningProgress = signal<LearningProgress | null>(null);

  ngOnInit(): void {
    this.loadCourse();
    console.log('🔧 Course Learning - Component initialized');
  }

  private loadCourse(): void {
    // Mock course data
    const mockCourse: CourseLearning = {
      id: 'course-1',
      title: 'Kỹ thuật Tàu biển Cơ bản',
      description: 'Khóa học cung cấp kiến thức cơ bản về kỹ thuật tàu biển, bao gồm cấu trúc tàu, hệ thống động lực, và quy trình vận hành. Khóa học được thiết kế để giúp học viên hiểu rõ về các thành phần chính của tàu biển và cách thức hoạt động của chúng.',
      instructor: {
        name: 'ThS. Nguyễn Văn Hải',
        avatar: 'https://via.placeholder.com/150',
        title: 'Giảng viên Khoa Hàng hải'
      },
      thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop',
      modules: [
        {
          id: 'module-1',
          title: 'Giới thiệu về Tàu biển',
          description: 'Tổng quan về tàu biển và các thành phần cơ bản',
          order: 1,
          duration: 120,
          isCompleted: true,
          isUnlocked: true,
          lessons: [
            {
              id: 'lesson-1',
              moduleId: 'module-1',
              title: 'Lịch sử phát triển tàu biển',
              description: 'Tìm hiểu về lịch sử phát triển của tàu biển từ xưa đến nay',
              type: 'video',
              duration: 30,
              videoUrl: 'https://example.com/video1.mp4',
              resources: [],
              isCompleted: true,
              isUnlocked: true,
              isPreview: false,
              order: 1
            },
            {
              id: 'lesson-2',
              moduleId: 'module-1',
              title: 'Phân loại tàu biển',
              description: 'Các loại tàu biển và đặc điểm của từng loại',
              type: 'text',
              duration: 45,
              content: '<h3>Phân loại tàu biển</h3><p>Tàu biển được phân loại theo nhiều tiêu chí khác nhau...</p>',
              resources: [
                {
                  id: 'res-1',
                  lessonId: 'lesson-2',
                  title: 'Tài liệu phân loại tàu.pdf',
                  type: 'pdf',
                  url: '/resources/ship-classification.pdf',
                  size: 1024000,
                  downloadCount: 150
                }
              ],
              isCompleted: true,
              isUnlocked: true,
              isPreview: false,
              order: 2
            },
            {
              id: 'lesson-3',
              moduleId: 'module-1',
              title: 'Kiểm tra kiến thức',
              description: 'Bài kiểm tra về lịch sử và phân loại tàu biển',
              type: 'quiz',
              duration: 15,
              resources: [],
              isCompleted: false,
              isUnlocked: true,
              isPreview: false,
              order: 3
            }
          ]
        },
        {
          id: 'module-2',
          title: 'Cấu trúc Tàu biển',
          description: 'Các thành phần cấu trúc chính của tàu biển',
          order: 2,
          duration: 180,
          isCompleted: false,
          isUnlocked: true,
          lessons: [
            {
              id: 'lesson-4',
              moduleId: 'module-2',
              title: 'Thân tàu và boong',
              description: 'Cấu trúc thân tàu và hệ thống boong',
              type: 'video',
              duration: 60,
              videoUrl: 'https://example.com/video2.mp4',
              resources: [],
              isCompleted: false,
              isUnlocked: true,
              isPreview: false,
              order: 1
            },
            {
              id: 'lesson-5',
              moduleId: 'module-2',
              title: 'Bài tập về cấu trúc tàu',
              description: 'Bài tập thực hành về cấu trúc tàu biển',
              type: 'assignment',
              duration: 120,
              resources: [],
              isCompleted: false,
              isUnlocked: true,
              isPreview: false,
              order: 2
            }
          ]
        }
      ],
      totalDuration: 300,
      progress: 45,
      currentLesson: 'lesson-3',
      lastAccessed: new Date()
    };

    this.course.set(mockCourse);
    this.currentLessonId.set(mockCourse.currentLesson || null);
    console.log('🔧 Course Learning - Course loaded:', mockCourse.title);
  }

  currentLesson(): CourseLesson | null {
    const course = this.course();
    const lessonId = this.currentLessonId();
    if (!course || !lessonId) return null;

    for (const module of course.modules) {
      const lesson = module.lessons.find(l => l.id === lessonId);
      if (lesson) return lesson;
    }
    return null;
  }

  getTotalLessons(): number {
    const course = this.course();
    if (!course) return 0;
    return course.modules.reduce((total, module) => total + module.lessons.length, 0);
  }

  getTotalModules(): number {
    const course = this.course();
    if (!course) return 0;
    return course.modules.length;
  }

  getCompletedLessons(): number {
    const course = this.course();
    if (!course) return 0;
    return course.modules.reduce((total, module) => 
      total + module.lessons.filter(lesson => lesson.isCompleted).length, 0);
  }

  getLessonTypeText(type: string): string {
    switch (type) {
      case 'video': return 'Video';
      case 'text': return 'Lý thuyết';
      case 'quiz': return 'Quiz';
      case 'assignment': return 'Bài tập';
      case 'resource': return 'Tài liệu';
      default: return 'Không xác định';
    }
  }

  getLessonTypeClass(type: string): string {
    switch (type) {
      case 'video': return 'bg-blue-100 text-blue-800';
      case 'text': return 'bg-green-100 text-green-800';
      case 'quiz': return 'bg-purple-100 text-purple-800';
      case 'assignment': return 'bg-orange-100 text-orange-800';
      case 'resource': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getLessonButtonClass(lesson: CourseLesson): string {
    const isCurrent = lesson.id === this.currentLessonId();
    const baseClass = 'w-full p-3 rounded-lg transition-colors text-left';
    
    if (isCurrent) {
      return `${baseClass} bg-blue-100 border-2 border-blue-300`;
    } else if (lesson.isCompleted) {
      return `${baseClass} bg-green-50 hover:bg-green-100`;
    } else if (lesson.isUnlocked) {
      return `${baseClass} bg-white hover:bg-gray-50 border border-gray-200`;
    } else {
      return `${baseClass} bg-gray-50 text-gray-400 cursor-not-allowed`;
    }
  }

  getResourceTypeText(type: string): string {
    switch (type) {
      case 'pdf': return 'PDF Document';
      case 'video': return 'Video File';
      case 'audio': return 'Audio File';
      case 'document': return 'Document';
      case 'link': return 'External Link';
      default: return 'File';
    }
  }

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  selectLesson(lessonId: string): void {
    this.currentLessonId.set(lessonId);
    console.log('🔧 Course Learning - Select lesson:', lessonId);
  }

  startCourse(): void {
    const course = this.course();
    if (course && course.modules.length > 0 && course.modules[0].lessons.length > 0) {
      this.currentLessonId.set(course.modules[0].lessons[0].id);
      console.log('🔧 Course Learning - Start course');
    }
  }

  previousLesson(): void {
    const course = this.course();
    const currentLesson = this.currentLesson();
    if (!course || !currentLesson) return;

    // Find previous lesson
    for (let i = 0; i < course.modules.length; i++) {
      const module = course.modules[i];
      const lessonIndex = module.lessons.findIndex(l => l.id === currentLesson.id);
      
      if (lessonIndex > 0) {
        // Previous lesson in same module
        this.currentLessonId.set(module.lessons[lessonIndex - 1].id);
        console.log('🔧 Course Learning - Previous lesson:', module.lessons[lessonIndex - 1].id);
        return;
      } else if (i > 0) {
        // Last lesson in previous module
        const prevModule = course.modules[i - 1];
        this.currentLessonId.set(prevModule.lessons[prevModule.lessons.length - 1].id);
        console.log('🔧 Course Learning - Previous lesson:', prevModule.lessons[prevModule.lessons.length - 1].id);
        return;
      }
    }
  }

  nextLesson(): void {
    const course = this.course();
    const currentLesson = this.currentLesson();
    if (!course || !currentLesson) return;

    // Find next lesson
    for (let i = 0; i < course.modules.length; i++) {
      const module = course.modules[i];
      const lessonIndex = module.lessons.findIndex(l => l.id === currentLesson.id);
      
      if (lessonIndex < module.lessons.length - 1) {
        // Next lesson in same module
        this.currentLessonId.set(module.lessons[lessonIndex + 1].id);
        console.log('🔧 Course Learning - Next lesson:', module.lessons[lessonIndex + 1].id);
        return;
      } else if (i < course.modules.length - 1) {
        // First lesson in next module
        const nextModule = course.modules[i + 1];
        this.currentLessonId.set(nextModule.lessons[0].id);
        console.log('🔧 Course Learning - Next lesson:', nextModule.lessons[0].id);
        return;
      }
    }
  }

  canGoPrevious(): boolean {
    const course = this.course();
    const currentLesson = this.currentLesson();
    if (!course || !currentLesson) return false;

    // Check if there's a previous lesson
    for (let i = 0; i < course.modules.length; i++) {
      const module = course.modules[i];
      const lessonIndex = module.lessons.findIndex(l => l.id === currentLesson.id);
      
      if (lessonIndex > 0) return true;
      if (i > 0) return true;
    }
    return false;
  }

  canGoNext(): boolean {
    const course = this.course();
    const currentLesson = this.currentLesson();
    if (!course || !currentLesson) return false;

    // Check if there's a next lesson
    for (let i = 0; i < course.modules.length; i++) {
      const module = course.modules[i];
      const lessonIndex = module.lessons.findIndex(l => l.id === currentLesson.id);
      
      if (lessonIndex < module.lessons.length - 1) return true;
      if (i < course.modules.length - 1) return true;
    }
    return false;
  }

  markAsCompleted(): void {
    const currentLesson = this.currentLesson();
    if (!currentLesson || currentLesson.isCompleted) return;

    console.log('🔧 Course Learning - Mark lesson as completed:', currentLesson.id);
    
    // Mock completion
    alert('Đã đánh dấu bài học hoàn thành!');
    
    // Update progress
    this.course.update(course => {
      if (!course) return course;
      
      const updatedCourse = { ...course };
      updatedCourse.modules = updatedCourse.modules.map(module => ({
        ...module,
        lessons: module.lessons.map(lesson => 
          lesson.id === currentLesson.id ? { ...lesson, isCompleted: true } : lesson
        )
      }));
      
      // Recalculate progress
      const totalLessons = updatedCourse.modules.reduce((total, module) => total + module.lessons.length, 0);
      const completedLessons = updatedCourse.modules.reduce((total, module) => 
        total + module.lessons.filter(lesson => lesson.isCompleted).length, 0);
      updatedCourse.progress = Math.round((completedLessons / totalLessons) * 100);
      
      return updatedCourse;
    });
  }

  startQuiz(lessonId: string): void {
    console.log('🔧 Course Learning - Start quiz:', lessonId);
    // Navigate to quiz taking interface
    this.router.navigate(['/student/quiz/take', lessonId]).then(success => {
      if (success) {
        console.log('🔧 Course Learning - Navigation to quiz successful');
      } else {
        console.error('🔧 Course Learning - Navigation to quiz failed');
      }
    });
  }

  startAssignment(lessonId: string): void {
    console.log('🔧 Course Learning - Start assignment:', lessonId);
    // Navigate to assignment work interface
    this.router.navigate(['/student/assignments/work', lessonId]).then(success => {
      if (success) {
        console.log('🔧 Course Learning - Navigation to assignment successful');
      } else {
        console.error('🔧 Course Learning - Navigation to assignment failed');
      }
    });
  }

  downloadResource(resourceId: string): void {
    console.log('🔧 Course Learning - Download resource:', resourceId);
    // Mock download functionality
    alert(`Tải xuống tài liệu: ${resourceId}`);
  }

  goBack(): void {
    console.log('🔧 Course Learning - Go back');
    this.router.navigate(['/student/courses']).then(success => {
      if (success) {
        console.log('🔧 Course Learning - Navigation back successful');
      } else {
        console.error('🔧 Course Learning - Navigation back failed');
      }
    });
  }

  async onMarkComplete(): Promise<void> {
    const lesson = this.currentLesson();
    if (!lesson) {
      console.log('[CourseLearning] onMarkComplete: no current lesson');
      return;
    }

    // Nếu đã completed thì không gọi lại
    if (lesson.isCompleted) {
      console.log('[CourseLearning] onMarkComplete: lesson already completed');
      return;
    }

    console.log('[CourseLearning] onMarkComplete: START, lessonId =', lesson.id);

    const token = localStorage.getItem('lms_access_token');
    console.log('[CourseLearning] Token check:', {
      tokenExists: !!token,
      tokenLength: token?.length,
      tokenPrefix: token?.substring(0, 20) + '...'
    });

    if (token) {
      try {
        // Decode JWT để kiểm tra payload
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('[CourseLearning] JWT Payload:', {
          sub: payload.sub,
          roles: payload.roles || payload.authorities,
          exp: new Date(payload.exp * 1000).toISOString(),
          isExpired: payload.exp * 1000 < Date.now()
        });
      } catch (e) {
        console.error('[CourseLearning] Cannot decode JWT:', e);
      }
    }

    try {
      console.log('[CourseLearning] BEFORE API CALL');

      const res = await firstValueFrom(
        this.lessonApi.markLessonComplete(lesson.id)
      );

      console.log('[CourseLearning] API success:', res);

      // Cập nhật trạng thái hoàn thành ở FE
      this.course.update(course => {
        if (!course) return course;

        const updatedCourse = { ...course };
        updatedCourse.modules = updatedCourse.modules.map(module => ({
          ...module,
          lessons: module.lessons.map(l =>
            l.id === lesson.id ? { ...l, isCompleted: true } : l
          )
        }));

        // Tính lại progress
        const totalLessons = updatedCourse.modules.reduce((total, module) => total + module.lessons.length, 0);
        const completedLessons = updatedCourse.modules.reduce((total, module) =>
          total + module.lessons.filter(l => l.isCompleted).length, 0);
        updatedCourse.progress = Math.round((completedLessons / totalLessons) * 100);

        return updatedCourse;
      });

    } catch (error: any) {
      console.error('[CourseLearning] API error:', {
        status: error?.status,
        statusText: error?.statusText,
        message: error?.message,
        url: error?.url,
        error: error?.error
      });
    }
  }

}