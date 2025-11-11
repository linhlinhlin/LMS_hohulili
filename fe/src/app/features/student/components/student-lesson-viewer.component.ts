import { Component, signal, computed, inject, OnInit, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LessonApi } from '../../../api/client/lesson.api';
import { LessonAttachmentApi, LessonAttachment as ApiLessonAttachment } from '../../../api/client/lesson-attachment.api';
import { ErrorHandlingService } from '../../../shared/services/error-handling.service';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { firstValueFrom } from 'rxjs';

// Types for Lesson Content
interface LessonDetailForStudent {
  id: string;
  courseId: string;
  title: string;
  description: string;
  type: 'LECTURE' | 'ASSIGNMENT' | 'QUIZ';
  content: string;
  duration: number;
  isCompleted: boolean;
  order: number;
  resources?: LessonResource[];
  attachments?: LessonAttachment[];
  videoUrl?: string;
  createdDate: string;
  lastModified: string;
}

interface LessonResource {
  id: string;
  title: string;
  type: string;
  url: string;
  size: string;
}

// Use the imported LessonAttachment type
type LessonAttachment = ApiLessonAttachment;

/**
 * Student Lesson Viewer Component
 * 
 * Cho phép student xem và tiến bộ qua các lessons được tạo bởi teachers
 * - Clean UI for lesson content consumption
 * - Progress tracking and completion
 * - Support multiple lesson types: LECTURE, ASSIGNMENT, QUIZ
 * - Navigation between lessons
 */
@Component({
  selector: 'app-student-lesson-viewer',
  imports: [CommonModule, RouterModule, LoadingComponent],
  standalone: true,
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Loading State -->
      <app-loading 
        [show]="isLoading()" 
        text="Đang tải bài học..."
        subtext="Vui lòng chờ trong giây lát"
        variant="overlay"
        color="blue">
      </app-loading>

      <!-- Header Navigation -->
      <div class="bg-white shadow-sm border-b">
        <div class="max-w-7xl mx-auto px-6 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <button (click)="goBack()" 
                class="text-gray-600 hover:text-gray-900 flex items-center space-x-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                </svg>
                <span>Quay lại khóa học</span>
              </button>
            </div>
            
            @if (currentLesson(); as lesson) {
              <div class="text-center">
                <h1 class="text-xl font-bold text-gray-900">{{ lesson.title }}</h1>
                <p class="text-sm text-gray-600 mt-1">{{ lesson.description }}</p>
              </div>
              
              <div class="flex items-center space-x-3">
                <span class="px-3 py-1 rounded-full text-xs font-medium {{ getLessonTypeClass(lesson.type) }}">
                  {{ getLessonTypeLabel(lesson.type) }}
                </span>
                <span class="text-sm text-gray-500">
                  {{ formatDuration(lesson.duration) }}
                </span>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Error State -->
      @if (error(); as errorMsg) {
        <div class="max-w-4xl mx-auto px-6 py-12">
          <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div class="text-red-600 mb-4">
              <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-red-900 mb-2">Có lỗi xảy ra</h3>
            <p class="text-red-700 mb-4">{{ errorMsg }}</p>
            <button (click)="retryLoading()" 
              class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
              Thử lại
            </button>
          </div>
        </div>
      }

      <!-- Main Content -->
      @if (currentLesson(); as lesson) {
        <div class="max-w-7xl mx-auto px-6 py-8">
          <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">

            <!-- Main Lesson Content -->
            <div class="lg:col-span-3">
              <div class="bg-white rounded-xl shadow-lg overflow-hidden">
                
                <!-- Video Content (if available) -->
                
                <!-- Lesson Content -->
                <div class="p-8">
                  <!-- Video Render (simple, giống teacher) -->
                  <ng-container *ngIf="lesson.videoUrl && lesson.videoUrl.trim() !== ''; else noVideoBlock">
                    <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
                      <h2 class="text-3xl font-bold text-gray-900 mb-6">Video bài học</h2>
                      <div style="color: #888; font-size: 12px; margin-bottom: 4px;">Video URL: {{ lesson.videoUrl }}</div>
                      <ng-container *ngIf="lesson.videoUrl.includes('youtube.com') || lesson.videoUrl.includes('youtu.be'); else normalVideoBlock">
                        <div class="aspect-video w-full rounded overflow-hidden">
                          <iframe class="w-full h-full" [src]="getSafeVideoUrl(getYouTubeEmbedUrl(lesson.videoUrl))" frameborder="0" allowfullscreen></iframe>
                        </div>
                      </ng-container>
                      <ng-template #normalVideoBlock>
                        <video class="w-full rounded" controls [src]="lesson.videoUrl" (loadedmetadata)="onVideoLoad()" (error)="onVideoError()"></video>
                      </ng-template>
                    </div>
                  </ng-container>
                  <ng-template #noVideoBlock>
                    <!-- Empty block: required for Angular template reference, but no message shown -->
                  </ng-template>
                  <div class="flex items-center justify-between mb-6">
                    <div>
                      <h2 class="text-2xl font-bold text-gray-900 mb-2">{{ lesson.title }}</h2>
                      <div class="flex items-center space-x-4 text-sm text-gray-600">
                        <span class="flex items-center space-x-1">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          <span>{{ formatDuration(lesson.duration) }}</span>
                        </span>
                        <span class="px-2 py-1 rounded-full text-xs font-medium {{ getLessonTypeClass(lesson.type) }}">
                          {{ getLessonTypeLabel(lesson.type) }}
                        </span>
                      </div>
                    </div>
                    
                    @if (lesson.isCompleted) {
                      <div class="flex items-center space-x-2 text-green-600">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                        </svg>
                        <span class="text-sm font-medium">Đã hoàn thành</span>
                      </div>
                    }
                  </div>
                  
                  <!-- Content Body -->
                  <div class="prose max-w-none">
                    <div [innerHTML]="getSafeContent(lesson.content)"></div>
                  </div>
                  
                  <!-- Action Buttons -->
                  <div class="mt-8 pt-6 border-t border-gray-200">
                    <div class="flex items-center justify-between">
                      <button 
                        [disabled]="!hasPreviousLesson()"
                        class="flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 text-gray-700 hover:bg-gray-200">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                        </svg>
                        <span>Bài trước</span>
                      </button>
                      
                      @if (!lesson.isCompleted) {
                        <button 
                          (click)="markAsCompleted()"
                          class="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors">
                          Đánh dấu hoàn thành
                        </button>
                      }
                      
                      <button 
                        [disabled]="!hasNextLesson()"
                        class="flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700">
                        <span>Bài tiếp theo</span>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Sidebar - Resources & Progress -->
            <div class="lg:col-span-1 space-y-6">
              
              <!-- Lesson Attachments -->
              @if (lesson.attachments && lesson.attachments.length > 0) {
                <div class="bg-white rounded-xl shadow-lg p-6">
                  <h3 class="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <span>Tài liệu đính kèm ({{ lesson.attachments.length }})</span>
                  </h3>

                  <div class="space-y-4">
                    @for (attachment of lesson.attachments; track attachment.id; let i = $index) {
                      <div class="border rounded-lg overflow-hidden">
                        <!-- Attachment Header -->
                        <div class="flex items-center justify-between bg-gray-50 p-4 border-b">
                          <div class="flex items-center gap-3">
                            <div class="text-xs px-2 py-1 rounded font-medium" [class]="getFileTypeClass(attachment.originalFileName)">
                              {{ getFileExtension(attachment.originalFileName) }}
                            </div>
                            <div>
                              <div class="font-medium text-sm">{{ attachment.originalFileName }}</div>
                              <div class="text-xs text-gray-500">{{ formatFileSize(attachment.fileSize) }} • {{ attachment.fileType }}</div>
                            </div>
                          </div>
                          <div class="flex items-center gap-2">
                            @if (isPdfFile(attachment.originalFileName)) {
                              <button (click)="toggleAttachmentViewer(i)"
                                      class="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700">
                                {{ expandedAttachment === i ? 'Thu gọn' : 'Xem PDF' }}
                              </button>
                            }
                            <a [href]="attachment.fileUrl" target="_blank"
                               class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                              Tải về
                            </a>
                          </div>
                        </div>

                        <!-- Inline PDF Viewer -->
                        @if (expandedAttachment === i && isPdfFile(attachment.originalFileName)) {
                          <div class="p-4 bg-white">
                            <!-- Debug info -->
                            <div class="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded text-sm">
                              <strong>🔍 Debug Info:</strong><br>
                              File: {{ attachment.originalFileName }}<br>
                              URL: {{ attachment.fileUrl }}<br>
                              Size: {{ formatFileSize(attachment.fileSize) }}
                            </div>

                            <!-- Direct PDF Object (Recommended) -->
                            <div class="border rounded-lg overflow-hidden">
                              <div class="bg-blue-100 p-3 font-medium text-blue-800">📖 Direct PDF Viewer</div>
                              <object [data]="attachment.fileUrl"
                                      type="application/pdf"
                                      class="w-full border-0"
                                      style="height: 600px;">
                                <p>Trình duyệt không hỗ trợ xem PDF.
                                  <a [href]="attachment.fileUrl" target="_blank" class="text-blue-600 underline ml-2">Tải về để xem</a>
                                </p>
                              </object>
                            </div>

                            <!-- Google Docs Viewer -->
                            <div class="border rounded-lg overflow-hidden mt-4">
                              <div class="bg-green-100 p-3 font-medium text-green-800">📄 Google Docs Viewer</div>
                              <iframe [src]="getGoogleDocsPdfUrl(attachment.fileUrl)"
                                      class="w-full border-0"
                                      style="height: 600px;"
                                      frameborder="0">
                              </iframe>
                            </div>

                            <!-- Fallback options -->
                            <div class="border rounded-lg overflow-hidden mt-4">
                              <div class="bg-red-100 p-3 font-medium text-red-800">Fallback Options</div>
                              <div class="p-6 text-center bg-gray-50">
                                <div class="space-x-3">
                                  <a [href]="attachment.fileUrl" target="_blank"
                                     class="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                                    Mở tab mới
                                  </a>
                                  <a [href]="attachment.fileUrl" download
                                     class="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                                    Tải xuống
                                  </a>
                                </div>
                              </div>
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </div>
                </div>
              }
              
              <!-- Progress Info -->
              <div class="bg-white rounded-xl shadow-lg p-6">
                <h3 class="font-semibold text-gray-900 mb-4">Tiến độ học tập</h3>
                <div class="space-y-4">
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-gray-600">Trạng thái</span>
                    <span class="font-medium {{ lesson.isCompleted ? 'text-green-600' : 'text-yellow-600' }}">
                      {{ lesson.isCompleted ? 'Đã hoàn thành' : 'Đang học' }}
                    </span>
                  </div>
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-gray-600">Thời lượng</span>
                    <span class="font-medium text-gray-900">{{ formatDuration(lesson.duration) }}</span>
                  </div>
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-gray-600">Loại bài học</span>
                    <span class="font-medium text-gray-900">{{ getLessonTypeLabel(lesson.type) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
  }
    </div>
  `,
  styles: [`
    .prose {
      max-width: none;
    }
    
    .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
      color: #1f2937;
      font-weight: 700;
      line-height: 1.25;
      margin-bottom: 0.5em;
    }
    
    .prose p {
      margin-bottom: 1em;
      line-height: 1.7;
    }
    
    .prose ul, .prose ol {
      margin-bottom: 1em;
      padding-left: 1.5em;
    }
    
    .prose li {
      margin-bottom: 0.5em;
    }
    
    .prose pre {
      background-color: #1f2937;
      color: #f9fafb;
      padding: 1em;
      border-radius: 0.5em;
      overflow-x: auto;
      margin: 1em 0;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentLessonViewerComponent implements OnInit {
  // Dependencies
  private lessonApi = inject(LessonApi);
  private lessonAttachmentApi = inject(LessonAttachmentApi);
  private errorService = inject(ErrorHandlingService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private sanitizer = inject(DomSanitizer);

  // Attachment viewer state
  expandedAttachment: number | null = null;

  // Reactive state
  private _currentLesson = signal<LessonDetailForStudent | null>(null);
  private _isLoading = signal(false);
  private _error = signal<string | null>(null);

  // Public signals
  currentLesson = this._currentLesson.asReadonly();
  isLoading = this._isLoading.asReadonly();
  error = this._error.asReadonly();

  // Computed properties
  currentLessonIndex = computed(() => {
    // Mock: In real app, this would be calculated from course structure
    return 0;
  });

  hasNextLesson = computed(() => {
    // Mock: In real app, check if there's a next lesson in the course
    return true;
  });

  hasPreviousLesson = computed(() => {
    const currentIndex = this.currentLessonIndex();
    return currentIndex > 0;
  });

  ngOnInit() {
    // Get route parameters
    const courseId = this.route.snapshot.paramMap.get('courseId');
    const lessonId = this.route.snapshot.paramMap.get('lessonId');
    
    if (courseId && lessonId) {
      this.loadLesson(lessonId, courseId);
    } else {
      this._error.set('Không tìm thấy thông tin bài học');
    }
  }

  // Load lesson content
  private async loadLesson(lessonId: string, courseId: string): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const lesson = await firstValueFrom(this.lessonApi.getLessonById(lessonId));
      const lessonData = lesson.data;
      if (!lessonData) {
        throw new Error('Dữ liệu bài học không hợp lệ');
      }

      // Load lesson attachments
      let attachments: LessonAttachment[] = [];
      try {
        const attachmentResponse = await firstValueFrom(this.lessonAttachmentApi.getAttachments(lessonId));
        attachments = attachmentResponse || [];
        console.log('[SUCCESS] StudentLessonViewer: Attachments loaded', attachments.length);
      } catch (attachmentError) {
        console.warn('[WARNING] StudentLessonViewer: Could not load attachments', attachmentError);
        attachments = [];
      }

      this._currentLesson.set({
        id: lessonData.id,
        courseId: lessonData.courseId,
        title: lessonData.title,
        description: lessonData.description,
        type: lessonData.lessonType,
        content: lessonData.content,
        duration: lessonData.durationMinutes,
        isCompleted: false,
        order: lessonData.orderIndex,
        resources: [], // Placeholder for resources
        attachments: attachments,
        videoUrl: lessonData.videoUrl,
        createdDate: lessonData.createdAt,
        lastModified: lessonData.updatedAt || lessonData.createdAt
      });

      console.log('[SUCCESS] StudentLessonViewer: Lesson loaded successfully', this._currentLesson());
    } catch (error: any) {
      const errorMessage = error?.message || 'Không thể tải bài học';
      console.error('[ERROR] StudentLessonViewer: Error loading lesson:', error);
      this._error.set(errorMessage);
      this.errorService.handleApiError(error, 'lesson-viewer');
    } finally {
      this._isLoading.set(false);
    }
  }

  // UI Helper Methods
  getLessonTypeLabel(type: string): string {
    switch (type) {
      case 'LECTURE': return 'Bài giảng';
      case 'ASSIGNMENT': return 'Bài tập';
      case 'QUIZ': return 'Kiểm tra';
      default: return 'Bài học';
    }
  }

  getLessonTypeClass(type?: string): string {
    switch (type) {
      case 'LECTURE': return 'bg-blue-100 text-blue-800';
      case 'ASSIGNMENT': return 'bg-green-100 text-green-800';
      case 'QUIZ': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} phút`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours} giờ`;
  }

  getSafeVideoUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  getSafeContent(content: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }

  getYouTubeEmbedUrl(url: string): string {
    if (!url) return '';

    // Handle YouTube URLs
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(youtubeRegex);

    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }

    // Return original URL if not YouTube
    return url;
  }

  getFileTypeLabel(type: string): string {
    const types: Record<string, string> = {
      'pdf': 'Tài liệu PDF',
      'doc': 'Tài liệu Word',
      'docx': 'Tài liệu Word',
      'ppt': 'Bản trình bày',
      'pptx': 'Bản trình bày',
      'xlsx': 'Bảng tính Excel',
      'mp4': 'Video MP4',
      'mp3': 'Âm thanh MP3'
    };
    return types[type.toLowerCase()] || 'Tài liệu';
  }

  // File type checking methods
  isPdfFile(fileName: string): boolean {
    return fileName?.toLowerCase().endsWith('.pdf') || false;
  }

  isOfficeFile(fileName: string): boolean {
    const lower = fileName?.toLowerCase() || '';
    return lower.endsWith('.doc') || lower.endsWith('.docx') ||
           lower.endsWith('.xls') || lower.endsWith('.xlsx') ||
           lower.endsWith('.ppt') || lower.endsWith('.pptx');
  }

  isImageFile(fileName: string): boolean {
    const lower = fileName?.toLowerCase() || '';
    return lower.endsWith('.jpg') || lower.endsWith('.jpeg') ||
           lower.endsWith('.png') || lower.endsWith('.gif') ||
           lower.endsWith('.bmp') || lower.endsWith('.webp');
  }

  // File utility methods
  getFileExtension(fileName: string): string {
    if (!fileName || !fileName.includes('.')) return '';
    return fileName.substring(fileName.lastIndexOf('.') + 1).toUpperCase();
  }

  getFileTypeClass(fileName: string): string {
    const ext = this.getFileExtension(fileName).toLowerCase();
    const typeMap: { [key: string]: string } = {
      'pdf': 'bg-red-100 text-red-800',
      'doc': 'bg-blue-100 text-blue-800',
      'docx': 'bg-blue-100 text-blue-800',
      'ppt': 'bg-orange-100 text-orange-800',
      'pptx': 'bg-orange-100 text-orange-800',
      'xls': 'bg-green-100 text-green-800',
      'xlsx': 'bg-green-100 text-green-800',
      'mp4': 'bg-purple-100 text-purple-800',
      'mp3': 'bg-pink-100 text-pink-800',
      'jpg': 'bg-yellow-100 text-yellow-800',
      'png': 'bg-yellow-100 text-yellow-800'
    };
    return typeMap[ext] || 'bg-gray-100 text-gray-800';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // PDF and file viewer methods
  toggleAttachmentViewer(index: number): void {
    this.expandedAttachment = this.expandedAttachment === index ? null : index;
  }


  getGoogleDocsPdfUrl(fileUrl: string): SafeResourceUrl {
    // Sử dụng Google Docs viewer cho PDF
    const encodedUrl = encodeURIComponent(fileUrl);
    const viewerUrl = `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(viewerUrl);
  }

  getDirectPdfUrl(fileUrl: string): SafeResourceUrl {
    // Direct PDF URL - no sanitization needed for object/embed tags
    return fileUrl as any;
  }

  // Actions
  goBack(): void {
    this.router.navigate(['/student/courses']);
  }

  retryLoading(): void {
    const courseId = this.route.snapshot.paramMap.get('courseId');
    const lessonId = this.route.snapshot.paramMap.get('lessonId');
    
    if (courseId && lessonId) {
      this.loadLesson(lessonId, courseId);
    }
  }

  markAsCompleted(): void {
    const lesson = this._currentLesson();
    if (lesson) {
      const updatedLesson = { ...lesson, isCompleted: true };
      this._currentLesson.set(updatedLesson);
      console.log('[SUCCESS] Lesson marked as completed:', lesson.id);
      
      // In production, call API to update completion status
      // this.lessonApi.markLessonComplete(lesson.id).subscribe();
    }
  }

  onVideoLoad(): void {
    console.log('Video loaded successfully');
  }

  onVideoError(): void {
  console.error('Video failed to load');
  }
}