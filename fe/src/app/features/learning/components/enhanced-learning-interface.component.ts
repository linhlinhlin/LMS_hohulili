import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RealVideoPlayerComponent, VideoPlayerConfig } from '../../../shared/components/video-player/real-video-player.component';

interface VideoLesson {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  duration: number; // in seconds
  thumbnail: string;
  courseId: string;
  order: number;
  isCompleted: boolean;
  watchedDuration: number;
  lastWatchedAt: Date;
  bookmarks: VideoBookmark[];
  notes: VideoNote[];
}

interface VideoBookmark {
  id: string;
  timestamp: number;
  title: string;
  description: string;
  createdAt: Date;
}

interface VideoNote {
  id: string;
  timestamp: number;
  content: string;
  createdAt: Date;
}

interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  thumbnail: string;
  duration: string;
  lessons: VideoLesson[];
  progress: number;
  category: string;
  rating: number;
}

@Component({
  selector: 'app-enhanced-learning-interface',
  imports: [CommonModule, RouterModule, FormsModule, RealVideoPlayerComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <!-- Enhanced Learning Header -->
      <div class="bg-white shadow-xl border-b border-gray-200 sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-6 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <button (click)="goBack()" 
                      class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
              </button>
              
              <div class="flex items-center space-x-4">
                <img [src]="course().thumbnail" [alt]="course().title" 
                     class="w-12 h-12 rounded-lg object-cover">
                <div>
                  <h1 class="text-xl font-bold text-gray-900">{{ course().title }}</h1>
                  <p class="text-sm text-gray-600">{{ course().instructor }}</p>
                </div>
              </div>
            </div>
            
            <!-- Course Progress -->
            <div class="flex items-center space-x-6">
              <div class="text-center">
                <div class="text-sm text-gray-500 mb-1">Tiến độ</div>
                <div class="text-lg font-bold text-blue-600">{{ course().progress }}%</div>
              </div>
              
              <div class="text-center">
                <div class="text-sm text-gray-500 mb-1">Bài học</div>
                <div class="text-lg font-bold text-gray-900">
                  {{ completedLessons() }}/{{ course().lessons.length }}
                </div>
              </div>
              
              <div class="text-center">
                <div class="text-sm text-gray-500 mb-1">Thời gian</div>
                <div class="text-lg font-bold text-gray-900">{{ course().duration }}</div>
              </div>
            </div>
          </div>
          
          <!-- Progress Bar -->
          <div class="mt-4">
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500" 
                   [style.width.%]="course().progress"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-6 py-8">
        <div class="grid grid-cols-12 gap-8">
          <!-- Main Content (8 columns) -->
          <div class="col-span-12 xl:col-span-8 space-y-6">
            <!-- Video Player Section -->
            @if (currentLesson()) {
              <div class="bg-white rounded-2xl shadow-lg overflow-hidden">
                <!-- Real Video Player -->
                <div class="aspect-video">
                  <app-real-video-player
                    [config]="videoPlayerConfig"
                    (stateChange)="onVideoStateChange($event)"
                    (timeUpdate)="onVideoTimeUpdate($event)"
                    (playEvent)="onVideoPlay()"
                    (pauseEvent)="onVideoPause()"
                    (endedEvent)="onVideoEnded()"
                    (errorEvent)="onVideoError($event)">
                  </app-real-video-player>
                </div>
                
                <!-- Video Controls -->
                <div class="p-6 bg-gray-50 border-t border-gray-200">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                      <button (click)="rewindVideo()"
                              class="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                        </svg>
                        <span class="text-sm">Tua lại 10s</span>
                      </button>
                      
                      <button (click)="fastForwardVideo()"
                              class="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                        </svg>
                        <span class="text-sm">Tua tới 10s</span>
                      </button>
                    </div>
                    
                    <div class="flex items-center space-x-4">
                      <div class="flex items-center space-x-2">
                        <span class="text-sm text-gray-600">Tốc độ:</span>
                        <select [(ngModel)]="playbackRate" 
                                (ngModelChange)="changePlaybackRate($event)"
                                class="text-sm border border-gray-300 rounded px-2 py-1">
                          <option value="0.5">0.5x</option>
                          <option value="0.75">0.75x</option>
                          <option value="1">1x</option>
                          <option value="1.25">1.25x</option>
                          <option value="1.5">1.5x</option>
                          <option value="2">2x</option>
                        </select>
                      </div>
                      
                      <button (click)="toggleFullscreen()"
                              class="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                        <svg class="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15.586 13H14a1 1 0 01-1-1z" clip-rule="evenodd"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Lesson Content -->
              <div class="bg-white rounded-2xl shadow-lg p-8">
                <div class="flex items-start justify-between mb-6">
                  <div>
                    <h2 class="text-2xl font-bold text-gray-900 mb-2">{{ currentLesson()!.title }}</h2>
                    <p class="text-gray-600">{{ currentLesson()!.description }}</p>
                  </div>
                  
                  <div class="flex items-center space-x-3">
                    <button (click)="toggleBookmark()"
                            [class]="isBookmarked() ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-600'"
                            class="px-4 py-2 rounded-lg hover:bg-opacity-80 transition-colors">
                      <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                      </svg>
                      Bookmark
                    </button>
                    
                    <button (click)="toggleNotes()"
                            [class]="showNotes() ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'"
                            class="px-4 py-2 rounded-lg hover:bg-opacity-80 transition-colors">
                      <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                      </svg>
                      Ghi chú
                    </button>
                  </div>
                </div>
                
                <!-- Notes Panel -->
                @if (showNotes()) {
                  <div class="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
                    <h3 class="text-lg font-semibold text-blue-900 mb-4">Ghi chú của bạn</h3>
                    <div class="space-y-4">
                      @for (note of currentLesson()!.notes; track note.id) {
                        <div class="bg-white p-4 rounded-lg border border-blue-200">
                          <div class="flex items-center justify-between mb-2">
                            <span class="text-sm text-blue-600 font-medium">
                              {{ formatTime(note.timestamp) }}
                            </span>
                            <button (click)="deleteNote(note.id)"
                                    class="text-red-500 hover:text-red-700">
                              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                              </svg>
                            </button>
                          </div>
                          <p class="text-gray-900">{{ note.content }}</p>
                        </div>
                      }
                      
                      <!-- Add New Note -->
                      <div class="bg-white p-4 rounded-lg border border-blue-200">
                        <textarea [(ngModel)]="newNoteContent"
                                  placeholder="Thêm ghi chú mới..."
                                  rows="3"
                                  class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                        <div class="flex justify-end mt-3">
                          <button (click)="addNote()"
                                  [disabled]="!newNoteContent().trim()"
                                  class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                            Thêm ghi chú
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                }
                
                <!-- Lesson Navigation -->
                <div class="flex items-center justify-between pt-6 border-t border-gray-200">
                  <button (click)="previousLesson()"
                          [disabled]="isFirstLesson()"
                          class="flex items-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                    </svg>
                    <span>Bài trước</span>
                  </button>
                  
                  <div class="flex items-center space-x-4">
                    <button (click)="markAsComplete()"
                            [class]="currentLesson()!.isCompleted ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'"
                            class="px-6 py-3 rounded-lg hover:bg-opacity-80 transition-colors">
                      @if (currentLesson()!.isCompleted) {
                        <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                        </svg>
                        Đã hoàn thành
                      } @else {
                        Đánh dấu hoàn thành
                      }
                    </button>
                  </div>
                  
                  <button (click)="nextLesson()"
                          [disabled]="isLastLesson()"
                          class="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <span>Bài tiếp</span>
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                    </svg>
                  </button>
                </div>
              </div>
            } @else {
              <!-- No Lesson Selected -->
              <div class="bg-white rounded-2xl shadow-lg p-12 text-center">
                <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <h3 class="text-2xl font-bold text-gray-900 mb-4">Chọn bài học để bắt đầu</h3>
                <p class="text-gray-600 mb-6">Hãy chọn một bài học từ danh sách bên phải để bắt đầu học tập.</p>
                <button (click)="selectFirstLesson()"
                        class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Bắt đầu từ bài đầu tiên
                </button>
              </div>
            }
          </div>

          <!-- Right Sidebar (4 columns) -->
          <div class="col-span-12 xl:col-span-4 space-y-6">
            <!-- Course Progress -->
            <div class="bg-white rounded-2xl shadow-lg p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Tiến độ khóa học</h3>
              <div class="space-y-4">
                <div class="flex justify-between text-sm">
                  <span class="text-gray-600">Tổng bài học:</span>
                  <span class="font-medium">{{ course().lessons.length }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-gray-600">Đã hoàn thành:</span>
                  <span class="font-medium text-green-600">{{ completedLessons() }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-gray-600">Còn lại:</span>
                  <span class="font-medium text-orange-600">{{ remainingLessons() }}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-3">
                  <div class="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500" 
                       [style.width.%]="course().progress"></div>
                </div>
              </div>
            </div>

            <!-- Course Lessons -->
            <div class="bg-white rounded-2xl shadow-lg p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Danh sách bài học</h3>
              <div class="space-y-3">
                @for (lesson of course().lessons; track lesson.id; let i = $index) {
                  <div (click)="selectLesson(lesson)"
                       class="p-4 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md"
                       [class]="getLessonClass(lesson)">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
                             [class]="getLessonNumberClass(lesson)">
                          {{ i + 1 }}
                        </div>
                        <div>
                          <h4 class="font-medium text-gray-900">{{ lesson.title }}</h4>
                          <p class="text-sm text-gray-500">{{ formatDuration(lesson.duration) }}</p>
                        </div>
                      </div>
                      <div class="flex items-center space-x-2">
                        @if (lesson.isCompleted) {
                          <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                          </svg>
                        } @else if (lesson.watchedDuration > 0) {
                          <div class="w-6 h-6 border-2 border-blue-600 rounded-full flex items-center justify-center">
                            <div class="w-3 h-3 bg-blue-600 rounded-full"></div>
                          </div>
                        }
                        
                        @if (lesson.bookmarks.length > 0) {
                          <svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                          </svg>
                        }
                        
                        @if (lesson.notes.length > 0) {
                          <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                          </svg>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Resources -->
            <div class="bg-white rounded-2xl shadow-lg p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Tài liệu tham khảo</h3>
              <div class="space-y-3">
                <a href="#" class="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div class="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                  <div class="flex-1">
                    <h4 class="font-medium text-gray-900">COLREG 1972.pdf</h4>
                    <p class="text-sm text-gray-600">2.4 MB</p>
                  </div>
                </a>

                <a href="#" class="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                  <div class="flex-1">
                    <h4 class="font-medium text-gray-900">Hướng dẫn An toàn.pdf</h4>
                    <p class="text-sm text-gray-600">1.8 MB</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnhancedLearningInterfaceComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Mock course data
  course = signal<Course>({
    id: 'course-1',
    title: 'Kỹ thuật Tàu biển Cơ bản',
    description: 'Khóa học cung cấp kiến thức cơ bản về kỹ thuật tàu biển',
    instructor: 'ThS. Nguyễn Văn Hải',
    thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300&h=200&fit=crop',
    duration: '8 tuần',
    progress: 75,
    category: 'engineering',
    rating: 4.7,
    lessons: [
      {
        id: 'lesson-1',
        title: 'Giới thiệu về Kỹ thuật Tàu biển',
        description: 'Tổng quan về ngành kỹ thuật tàu biển và các thành phần cơ bản',
        videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
        duration: 1800, // 30 minutes
        thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300&h=200&fit=crop',
        courseId: 'course-1',
        order: 1,
        isCompleted: true,
        watchedDuration: 1800,
        lastWatchedAt: new Date(),
        bookmarks: [],
        notes: []
      },
      {
        id: 'lesson-2',
        title: 'Cấu trúc Tàu biển',
        description: 'Phân tích chi tiết các thành phần cấu trúc của tàu biển',
        videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4',
        duration: 2400, // 40 minutes
        thumbnail: 'https://images.unsplash.com/photo-1506905925346-14b1e3d71e51?w=300&h=200&fit=crop',
        courseId: 'course-1',
        order: 2,
        isCompleted: false,
        watchedDuration: 1200,
        lastWatchedAt: new Date(),
        bookmarks: [
          {
            id: 'bookmark-1',
            timestamp: 300,
            title: 'Cấu trúc thân tàu',
            description: 'Phần quan trọng về cấu trúc thân tàu',
            createdAt: new Date()
          }
        ],
        notes: [
          {
            id: 'note-1',
            timestamp: 600,
            content: 'Cấu trúc tàu được chia thành nhiều phần khác nhau',
            createdAt: new Date()
          }
        ]
      },
      {
        id: 'lesson-3',
        title: 'Hệ thống Động lực',
        description: 'Tìm hiểu về các hệ thống động lực trên tàu biển',
        videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_5mb.mp4',
        duration: 2700, // 45 minutes
        thumbnail: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=300&h=200&fit=crop',
        courseId: 'course-1',
        order: 3,
        isCompleted: false,
        watchedDuration: 0,
        lastWatchedAt: new Date(),
        bookmarks: [],
        notes: []
      }
    ]
  });

  currentLesson = signal<VideoLesson | null>(null);
  showNotes = signal(false);
  playbackRate = 1;
  newNoteContent = signal('');
  videoPlayerConfig = signal<VideoPlayerConfig>({
    src: '',
    controls: true,
    autoplay: false,
    muted: false,
    loop: false,
    preload: 'metadata',
    volume: 1,
    playbackRate: 1
  });

  completedLessons = computed(() => 
    this.course().lessons.filter(lesson => lesson.isCompleted).length
  );

  remainingLessons = computed(() => 
    this.course().lessons.length - this.completedLessons()
  );

  ngOnInit(): void {
    // Get course ID from route params
    const courseId = this.route.snapshot.paramMap.get('id');
    if (courseId) {
      // Load course data based on ID
      this.loadCourse(courseId);
    }
  }

  loadCourse(courseId: string): void {
    // In real app, this would load from service
    // For now, we'll use mock data
  }

  selectLesson(lesson: VideoLesson): void {
    this.currentLesson.set(lesson);
  }

  selectFirstLesson(): void {
    if (this.course().lessons.length > 0) {
      this.selectLesson(this.course().lessons[0]);
    }
  }

  previousLesson(): void {
    const current = this.currentLesson();
    if (current) {
      const currentIndex = this.course().lessons.findIndex(l => l.id === current.id);
      if (currentIndex > 0) {
        this.selectLesson(this.course().lessons[currentIndex - 1]);
      }
    }
  }

  nextLesson(): void {
    const current = this.currentLesson();
    if (current) {
      const currentIndex = this.course().lessons.findIndex(l => l.id === current.id);
      if (currentIndex < this.course().lessons.length - 1) {
        this.selectLesson(this.course().lessons[currentIndex + 1]);
      }
    }
  }

  isFirstLesson(): boolean {
    const current = this.currentLesson();
    if (!current) return true;
    return this.course().lessons[0].id === current.id;
  }

  isLastLesson(): boolean {
    const current = this.currentLesson();
    if (!current) return true;
    return this.course().lessons[this.course().lessons.length - 1].id === current.id;
  }

  markAsComplete(): void {
    const current = this.currentLesson();
    if (current) {
      // Update lesson completion status
      const lessons = this.course().lessons.map(lesson => 
        lesson.id === current.id ? { ...lesson, isCompleted: true } : lesson
      );
      
      this.course.update(course => ({
        ...course,
        lessons,
        progress: Math.round((lessons.filter(l => l.isCompleted).length / lessons.length) * 100)
      }));
    }
  }

  toggleBookmark(): void {
    // Toggle bookmark functionality
    console.log('Toggle bookmark');
  }

  toggleNotes(): void {
    this.showNotes.set(!this.showNotes());
  }

  addNote(): void {
    if (this.newNoteContent().trim()) {
      const current = this.currentLesson();
      if (current) {
        const newNote: VideoNote = {
          id: 'note-' + Date.now(),
          timestamp: 0, // Current video time
          content: this.newNoteContent().trim(),
          createdAt: new Date()
        };

        const lessons = this.course().lessons.map(lesson => 
          lesson.id === current.id 
            ? { ...lesson, notes: [...lesson.notes, newNote] }
            : lesson
        );

        this.course.update(course => ({ ...course, lessons }));
        this.newNoteContent.set('');
      }
    }
  }

  deleteNote(noteId: string): void {
    const current = this.currentLesson();
    if (current) {
      const lessons = this.course().lessons.map(lesson => 
        lesson.id === current.id 
          ? { ...lesson, notes: lesson.notes.filter(note => note.id !== noteId) }
          : lesson
      );

      this.course.update(course => ({ ...course, lessons }));
    }
  }

  playVideo(): void {
    // Update video player config with current lesson
    if (this.currentLesson()) {
      this.videoPlayerConfig.set({
        ...this.videoPlayerConfig(),
        src: this.currentLesson()!.videoUrl,
        poster: this.currentLesson()!.thumbnail
      });
    }
  }

  rewindVideo(): void {
    // Video player will handle this internally
    console.log('Rewind video');
  }

  fastForwardVideo(): void {
    // Video player will handle this internally
    console.log('Fast forward video');
  }

  changePlaybackRate(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const rate = parseFloat(target.value);
    this.playbackRate = rate;
    
    // Update video player config
    this.videoPlayerConfig.set({
      ...this.videoPlayerConfig(),
      playbackRate: rate
    });
  }

  toggleFullscreen(): void {
    // Video player will handle this internally
    console.log('Toggle fullscreen');
  }

  onVideoPlayerReady(): void {
    console.log('Video player is ready');
  }

  onVideoPlayerError(error: any): void {
    console.error('Video player error:', error);
  }

  onVideoPlayerProgress(progress: number): void {
    // Update learning progress
    console.log('Video progress:', progress);
  }

  onVideoStateChange(state: any): void {
    console.log('Video state changed:', state);
  }

  onVideoTimeUpdate(time: number): void {
    console.log('Video time update:', time);
  }

  onVideoPlay(): void {
    console.log('Video started playing');
  }

  onVideoPause(): void {
    console.log('Video paused');
  }

  onVideoEnded(): void {
    console.log('Video ended');
    // Mark lesson as completed
    this.markLessonCompleted();
  }

  onVideoError(error: any): void {
    console.error('Video error:', error);
  }

  markLessonCompleted(): void {
    const current = this.currentLesson();
    if (current) {
      const lessons = this.course().lessons.map(lesson => 
        lesson.id === current.id 
          ? { ...lesson, isCompleted: true, watchedDuration: lesson.duration }
          : lesson
      );

      this.course.update(course => ({ ...course, lessons }));
    }
  }

  goBack(): void {
    this.router.navigate(['/learn']);
  }

  isBookmarked(): boolean {
    const current = this.currentLesson();
    return current ? current.bookmarks.length > 0 : false;
  }

  getLessonClass(lesson: VideoLesson): string {
    const current = this.currentLesson();
    if (current && current.id === lesson.id) {
      return 'bg-blue-50 border-2 border-blue-200';
    } else if (lesson.isCompleted) {
      return 'bg-green-50 border border-green-200 hover:bg-green-100';
    } else if (lesson.watchedDuration > 0) {
      return 'bg-blue-50 border border-blue-200 hover:bg-blue-100';
    } else {
      return 'bg-gray-50 border border-gray-200 hover:bg-gray-100';
    }
  }

  getLessonNumberClass(lesson: VideoLesson): string {
    const current = this.currentLesson();
    if (current && current.id === lesson.id) {
      return 'bg-blue-600 text-white';
    } else if (lesson.isCompleted) {
      return 'bg-green-600 text-white';
    } else if (lesson.watchedDuration > 0) {
      return 'bg-blue-100 text-blue-800';
    } else {
      return 'bg-gray-200 text-gray-600';
    }
  }

  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}