import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CourseApi } from '../../../api/client/course.api';
import { LessonApi } from '../../../api/client/lesson.api';
import { CourseContentSection, LessonDetail, LessonAttachment } from '../../../api/types/course.types';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../shared/types/user.types';

interface VideoLesson {
  id: string;
  title: string;
  description: string;
  content?: string; // Nội dung bài học từ backend
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
  attachments?: LessonAttachment[]; // File đính kèm
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
  sectionTitle?: string; // For breadcrumb display
}

@Component({
  selector: 'app-professional-learning-interface',
  imports: [CommonModule, RouterModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="h-screen bg-gray-50 flex flex-col">
      <!-- Professional Learning Interface -->
      <div class="flex flex-1 min-h-0">
        <!-- Left Navigation Sidebar (20-25%) -->
        <div class="w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col min-h-0">
          <!-- Course Header -->
          <div class="p-4 border-b border-gray-200">
            <div class="flex flex-col">
              <h2 class="text-lg font-semibold text-gray-900 truncate">{{ course().title }}</h2>
              <p class="text-sm text-gray-600">{{ course().instructor }}</p>
            </div>

            <!-- Progress Bar -->
            <div class="mt-4">
              <div class="flex justify-between text-sm mb-2">
                <span class="text-gray-600">Tiến độ</span>
                <span class="font-medium text-gray-900">{{ course().progress }}%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-blue-600 h-2 rounded-full transition-all duration-500"
                     [style.width.%]="course().progress"></div>
              </div>
            </div>
          </div>

          <!-- Navigation Search -->
          <div class="p-4 border-b border-gray-200">
            <div class="relative">
              <input type="text"
                     placeholder="Tìm kiếm bài học..."
                     class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     [(ngModel)]="searchQuery"
                     (input)="filterLessons()">
              <svg class="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
          </div>

          <!-- Lessons Navigation -->
          <div class="flex-1 overflow-y-auto">
            <div class="p-4">
              <h3 class="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4"
                  id="lessons-heading">Danh sách bài học</h3>
              <nav aria-labelledby="lessons-heading" role="navigation">
                <ul class="space-y-2" role="list">
                  @for (lesson of filteredLessons(); track lesson.id; let i = $index) {
                    <li role="listitem">
                      <button (click)="selectLesson(lesson)"
                              [class]="getLessonButtonClass(lesson)"
                              [attr.aria-current]="isCurrentLesson(lesson) ? 'true' : null"
                              [attr.aria-label]="'Bài học ' + (i + 1) + ': ' + lesson.title + (lesson.isCompleted ? ' - Đã hoàn thành' : '')"
                              class="w-full text-left p-3 rounded-lg transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                        <div class="flex items-center space-x-3">
                          <!-- Lesson Number -->
                          <div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                               [class]="getLessonNumberClass(lesson)">
                            {{ i + 1 }}
                          </div>

                          <!-- Lesson Info -->
                          <div class="flex-1 min-w-0">
                            <h4 class="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                              {{ lesson.title }}
                            </h4>
                            <p class="text-xs text-gray-500">{{ formatDuration(lesson.duration) }}</p>
                          </div>

                          <!-- Status Indicators -->
                          <div class="flex items-center space-x-2">
                            @if (lesson.isCompleted) {
                              <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                              </svg>
                            } @else if (lesson.watchedDuration > 0) {
                              <div class="w-5 h-5 border-2 border-blue-600 rounded-full flex items-center justify-center">
                                <div class="w-2 h-2 bg-blue-600 rounded-full"></div>
                              </div>
                            }
                          </div>
                        </div>
                      </button>
                    </li>
                  }
                </ul>
              </nav>
            </div>
          </div>
        </div>

        <!-- Main Content Area (75-80%) -->
        <div class="flex-1 flex flex-col min-h-0 min-w-0">
          <!-- Top Navigation Header -->
          <div class="bg-white border-b border-gray-200 px-8 py-4">
            <div class="flex items-center justify-between">
              <!-- Breadcrumb and Title -->
              <div class="flex items-center space-x-4">
                <button (click)="goBack()"
                        class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Quay lại">
                  <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                  </svg>
                </button>

                <div class="flex items-center space-x-2 text-sm text-gray-600">
                  <a [routerLink]="getBreadcrumbLink()" class="hover:text-blue-600 transition-colors">Học tập</a>
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                  </svg>
                  <span class="font-medium text-gray-900">{{ course().title }}</span>
                  @if (currentLesson()) {
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                    </svg>
                    <span class="text-blue-600">{{ currentLesson()!.title }}</span>
                  }
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="flex items-center space-x-3">
                @if (isStudent()) {
                  <button (click)="enrollCurrentCourse()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                    Đăng ký khóa học
                  </button>
                }
                <button class="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                        aria-label="Thông báo">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h4l4 4v-4h4a2 2 0 002-2z"></path>
                  </svg>
                </button>

                <button class="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                        aria-label="Cài đặt">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Content Area -->
          <div class="flex-1 overflow-y-auto min-h-0">
            @if (accessDenied()) {
              <!-- Access Denied / Not Enrolled State -->
              <div class="w-full max-w-none mx-auto p-8">
                <div class="bg-yellow-50 border border-yellow-200 rounded-2xl p-8 text-yellow-900">
                  <h2 class="text-2xl font-bold mb-2">Bạn chưa có quyền truy cập nội dung khóa học</h2>
                  <p class="mb-6">
                    @if (isStudent()) {
                      Bạn chưa đăng ký khóa học này. Hãy đăng ký để mở khóa tất cả bài học và video.
                    } @else if (isTeacher()) {
                      Bạn đang đăng nhập với vai trò Giảng viên. Bạn chưa được ghi danh như học viên cho khóa học này. Nếu muốn trải nghiệm như học viên, hãy sử dụng tài khoản Học viên để đăng ký.
                    } @else if (isAdmin()) {
                      Bạn đang đăng nhập với vai trò Quản trị. Chỉ học viên đã đăng ký mới có thể xem nội dung học.
                    } @else {
                      Có thể bạn chưa đăng ký khóa học này. Hãy đăng ký để mở khóa tất cả bài học và video.
                    }
                  </p>
                  <div class="flex items-center gap-3">
                    @if (isStudent()) {
                      <button (click)="enrollCurrentCourse()" [disabled]="enrolling()"
                              class="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                        {{ enrolling() ? 'Đang đăng ký...' : 'Đăng ký khóa học' }}
                      </button>
                    }
                    <button (click)="loadCourse(course().id)" class="px-5 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                      Thử tải lại
                    </button>
                  </div>
                  @if (isStudent()) {
                    <p class="mt-2 text-xs text-yellow-700">Lưu ý: Bạn cần đăng nhập bằng tài khoản Học viên đã xác thực để đăng ký.</p>
                  } @else if (isTeacher()) {
                    <p class="mt-2 text-xs text-yellow-700">Gợi ý: Sử dụng tài khoản Học viên để đăng ký và xem nội dung như học viên. Tài khoản Giảng viên không thể tự ghi danh.</p>
                  } @else if (isAdmin()) {
                    <p class="mt-2 text-xs text-yellow-700">Gợi ý: Chỉ học viên có đăng ký mới truy cập được nội dung học.</p>
                  }
                </div>
              </div>
            } @else if (currentLesson()) {
              <!-- Lesson Content -->
              <div class="w-full max-w-none mx-auto p-8">

                <!-- Prominent Lesson Title -->
                <div class="mb-8">
                  <h1 class="text-3xl font-extrabold text-blue-700 mb-2 pb-2 border-b border-blue-200">{{ currentLesson()!.title }}</h1>
                </div>

                <!-- Video Player Section -->
                <div *ngIf="currentLesson()?.videoUrl && (currentLesson()?.videoUrl + '').trim() !== ''" class="bg-white rounded-2xl shadow-lg p-8 mb-8">
                  <h2 class="text-2xl font-bold text-gray-900 mb-6">Video bài học</h2>
                  <ng-container *ngIf="isYouTube(currentLesson()?.videoUrl); else normalVideoBlock">
                    <div class="aspect-video w-full rounded overflow-hidden">
                      <iframe class="w-full h-full" [src]="getSafeYouTubeEmbedUrl(currentLesson()?.videoUrl)" frameborder="0" allowfullscreen></iframe>
                    </div>
                  </ng-container>
                  <ng-template #normalVideoBlock>
                    <video class="w-full rounded" controls [src]="currentLesson()?.videoUrl"></video>
                  </ng-template>
                </div>
                <ng-container *ngIf="!currentLesson()?.videoUrl || (currentLesson()?.videoUrl + '').trim() === ''">
                  <!-- No video block: show nothing if videoUrl is missing or invalid -->
                </ng-container>

                <!-- Interactive Content Section -->
                <div class="bg-white rounded-2xl shadow-lg p-8 mb-8">
                  <h2 class="text-2xl font-bold text-gray-900 mb-6">Nội dung bài học</h2>
                  <div class="prose prose-lg max-w-none">
                    @if (currentLesson()?.content) {
                      <div [innerHTML]="currentLesson()?.content" class="text-gray-700 leading-relaxed whitespace-pre-wrap"></div>
                    } @else if (currentLesson()?.description) {
                      <p class="text-gray-700 leading-relaxed mb-6">{{ currentLesson()?.description }}</p>
                    } @else {
                      <p class="text-gray-500 italic">Không có nội dung cho bài học này.</p>
                    }
                  </div>
                </div>

                <!-- File Attachments Section -->
                <div *ngIf="currentLesson()?.attachments && currentLesson()?.attachments!.length > 0" class="bg-white rounded-2xl shadow-lg p-8 mb-8">
                  <h2 class="text-2xl font-bold text-gray-900 mb-6">Tài liệu đính kèm ({{ currentLesson()?.attachments!.length }})</h2>
                  <div class="space-y-4">
                    <div *ngFor="let attachment of currentLesson()?.attachments; let i = index" class="border rounded-lg overflow-hidden">
                      <!-- Attachment Header -->
                      <div class="flex items-center justify-between bg-gray-50 p-4 border-b">
                        <div class="flex items-center gap-3">
                          <div class="text-xs px-2 py-1 rounded font-medium" 
                               [class]="getFileTypeClass(attachment.originalFileName)">
                            {{ getFileExtension(attachment.originalFileName) }}
                          </div>
                          <div>
                            <div class="font-medium text-sm">{{ attachment.originalFileName }}</div>
                            <div class="text-xs text-gray-500">{{ formatFileSize(attachment.fileSize) }} • {{ attachment.fileType }}</div>
                          </div>
                        </div>
                        <div class="flex items-center gap-2">
                          <button *ngIf="isPdfFile(attachment.originalFileName)" 
                                  (click)="toggleAttachmentViewer(i)"
                                  class="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700">
                            {{ expandedAttachment === i ? 'Thu gọn' : 'Xem PDF' }}
                          </button>
                          <button *ngIf="isPresentationFile(attachment.originalFileName)" 
                                  (click)="toggleAttachmentViewer(i)"
                                  class="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                            {{ expandedAttachment === i ? 'Thu gọn' : 'Xem slide' }}
                          </button>
                          <a [href]="attachment.fileUrl" target="_blank" 
                             class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                            Tải về
                          </a>
                        </div>
                      </div>
                      
                      <!-- Inline File Viewer -->
                      <div *ngIf="expandedAttachment === i" class="p-4 bg-white">
                        <!-- PDF Viewer - Simple như section-editor -->
                        <div *ngIf="isPdfFile(attachment.originalFileName)" class="w-full">
                          <iframe [src]="getSafeUrl(attachment.fileUrl)"
                                  class="w-full border-0 rounded"
                                  style="height: 600px;"
                                  frameborder="0">
                            <p>Trình duyệt không hỗ trợ xem PDF. <a [href]="attachment.fileUrl" target="_blank">Tải về để xem</a></p>
                          </iframe>
                          <!-- PDF Preview Controls -->
                          <div class="mt-2 flex items-center justify-between bg-gray-50 p-2 rounded">
                            <div class="text-sm text-gray-600">
                              <span class="font-medium">Xem trước PDF:</span> {{ attachment.originalFileName }}
                            </div>
                            <div class="flex items-center gap-2">
                              <a [href]="attachment.fileUrl" target="_blank"
                                 class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                                <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                                </svg>
                                Mở tab mới
                              </a>
                              <a [href]="attachment.fileUrl" 
                                 download
                                 class="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                                <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                                Tải xuống
                              </a>
                            </div>
                          </div>
                        </div>
                        
                        <!-- Office Document Viewer (using Office Online) -->
                        <div *ngIf="isOfficeFile(attachment.originalFileName)" class="w-full">
                          <div class="border rounded bg-gray-50">
                            <iframe [src]="getOfficeViewerUrl(attachment.fileUrl)" 
                                    class="w-full border-0 rounded"
                                    style="height: 600px;"
                                    frameborder="0"
                                    onload="this.style.display='block'"
                                    onerror="this.style.display='none'; this.nextElementSibling.style.display='block'">
                            </iframe>
                            
                            <!-- Fallback for Office files -->
                            <div style="display: none;" class="text-center p-8 bg-gray-100 rounded">
                              <svg class="w-16 h-16 mx-auto mb-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
                                </path>
                              </svg>
                              <h3 class="text-lg font-medium text-gray-900 mb-2">Không thể xem trước file Office</h3>
                              <p class="text-gray-600 mb-4">Tải xuống để mở với ứng dụng Office.</p>
                              <a [href]="attachment.fileUrl" 
                                 target="_blank" 
                                 download
                                 class="inline-flex items-center px-4 py-2 bg-orange-600 text-white text-sm rounded hover:bg-orange-700">
                                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
                                  </path>
                                </svg>
                                Tải xuống file
                              </a>
                            </div>
                          </div>
                        </div>
                        
                        <!-- Image Viewer -->
                        <div *ngIf="isImageFile(attachment.originalFileName)" class="text-center">
                          <img [src]="attachment.fileUrl" [alt]="attachment.originalFileName" 
                               class="max-w-full h-auto rounded border">
                        </div>
                        
                        <!-- Video Player -->
                        <div *ngIf="isVideoFile(attachment.originalFileName)" class="w-full">
                          <video controls class="w-full rounded">
                            <source [src]="attachment.fileUrl" [type]="getVideoMimeType(attachment.originalFileName)">
                            Trình duyệt không hỗ trợ video này.
                          </video>
                        </div>
                        
                        <!-- Audio Player -->
                        <div *ngIf="isAudioFile(attachment.originalFileName)" class="w-full">
                          <audio controls class="w-full">
                            <source [src]="attachment.fileUrl" [type]="getAudioMimeType(attachment.originalFileName)">
                            Trình duyệt không hỗ trợ audio này.
                          </audio>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Lesson Actions -->
                <div class="flex items-center justify-between bg-white rounded-2xl shadow-lg p-6">
                  <button (click)="previousLesson()"
                          [disabled]="isFirstLesson()"
                          class="flex items-center space-x-3 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                    </svg>
                    <span>Bài trước</span>
                  </button>

                  <div class="flex items-center space-x-4">
                    <button (click)="markAsComplete()"
                            [class]="currentLesson()!.isCompleted ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'"
                            class="px-6 py-3 rounded-lg hover:bg-opacity-80 transition-colors font-medium">
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
                          class="flex items-center space-x-3 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <span>Bài tiếp</span>
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                    </svg>
                  </button>
                </div>
              </div>
            } @else {
              <!-- No Lesson Selected -->
              <div class="flex items-center justify-center flex-1">
                <div class="text-center">
                  <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                  <h3 class="text-2xl font-bold text-gray-900 mb-4">Chọn bài học để bắt đầu</h3>
                  <p class="text-gray-600 mb-6">Hãy chọn một bài học từ danh sách bên trái để bắt đầu học tập.</p>
                  <button (click)="selectFirstLesson()"
                          class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Bắt đầu từ bài đầu tiên
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      </div>

    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfessionalLearningInterfaceComponent implements OnInit {
  private sanitizer = inject(DomSanitizer);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);

  // YouTube helper methods
  isYouTube(url?: string): boolean {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be');
  }

  getSafeYouTubeEmbedUrl(url?: string): SafeResourceUrl {
    if (!url) return '';
    // Extract YouTube video ID
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(youtubeRegex);
    const embedUrl = match && match[1] ? `https://www.youtube.com/embed/${match[1]}` : url;
    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }
  private courseApi = inject(CourseApi);
  private lessonApi = inject(LessonApi);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  enrolling = signal(false);
  // Flag when backend rejects access (e.g., 403 for not enrolled)
  accessDenied = signal(false);

  // Role helpers
  userRole = computed<UserRole | null>(() => this.authService.userRole() as UserRole | null);
  isStudent = computed(() => this.userRole() === 'student');
  isTeacher = computed(() => this.userRole() === 'teacher');
  isAdmin = computed(() => this.userRole() === 'admin');

  // Search and filtering
  searchQuery = signal('');
  filteredLessons = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.course().lessons;

    return this.course().lessons.filter(lesson =>
      lesson.title.toLowerCase().includes(query) ||
      lesson.description.toLowerCase().includes(query)
    );
  });

  // Attachment viewer state
  expandedAttachment: number | null = null;
  
  // Simple PDF viewer state like section-editor
  private blobUrlMap = new Map<string, string>();

  // Course state populated from backend content
  course = signal<Course>({
    id: '',
    title: '',
    description: '',
    instructor: '',
    thumbnail: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&h=200&fit=crop',
    duration: '',
    progress: 0,
    category: '',
    rating: 0,
    lessons: []
  });

  currentLesson = signal<VideoLesson | null>(null);
  currentLessonIndex = computed(() => {
    const current = this.currentLesson();
    if (!current) return 0;
    return this.course().lessons.findIndex(lesson => lesson.id === current.id);
  });

  videoPlayerConfig = signal<any>({
    src: '',
    controls: true,
    autoplay: false,
    muted: false,
    loop: false,
    preload: 'metadata',
    volume: 1,
    playbackRate: 1
  });

  ngOnInit(): void {
    // Get course ID from route params
    const courseId = this.route.snapshot.paramMap.get('id');
    if (courseId) {
      this.loadCourse(courseId);
    }
  }

  loadCourse(courseId: string): void {
    // Reset access flag before loading
    this.accessDenied.set(false);

    this.courseApi.getCourseById(courseId).subscribe({
      next: (res) => {
        const detail = res?.data;
        const title = detail?.title || '';
        const instructor = detail?.teacherName || '';
        this.course.update(c => ({ ...c, id: courseId, title, description: detail?.description || '', instructor }));
      },
      error: () => {
        // Keep minimal course shell so UI doesn't disappear
        this.course.update(c => ({ ...c, id: courseId, title: c.title || 'Khóa học', instructor: c.instructor || 'Giảng viên' }));
      }
    });

    this.courseApi.getCourseContent(courseId).subscribe({
      next: (res) => {
        const sections: CourseContentSection[] = res?.data || [];
        // Flatten lessons into ordering by section.orderIndex then lesson.orderIndex
        const lessonsFlat: VideoLesson[] = [];
        sections.sort((a,b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)).forEach((sec) => {
          sec.lessons
            ?.sort((a,b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
            .forEach((l, idx) => {
              lessonsFlat.push({
                id: l.id,
                title: l.title,
                description: l.description || '',
                videoUrl: '', // will fetch when selected
                duration: 0,
                thumbnail: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&h=200&fit=crop',
                courseId,
                order: lessonsFlat.length + 1,
                isCompleted: false,
                watchedDuration: 0,
                lastWatchedAt: new Date(),
                bookmarks: [],
                notes: []
              });
            });
        });
        this.course.update(c => ({ ...c, lessons: lessonsFlat }));
        // Auto-select first lesson
        if (lessonsFlat.length > 0) {
          this.selectLesson(lessonsFlat[0]);
        }
      },
      error: (err: any) => {
        const msg = (err?.message || '').toLowerCase();
        const forbidden = msg.includes('403') || msg.includes('không có quyền') || msg.includes('forbidden');
        if (forbidden) {
          this.accessDenied.set(true);
        } else {
          this.accessDenied.set(false);
        }
      }
    });
  }

  enrollCurrentCourse(): void {
    const courseId = this.course().id;
    if (!courseId) return;
    if (!this.isStudent()) {
      // Chỉ học viên mới có thể đăng ký khóa học
      return;
    }
    this.enrolling.set(true);
    this.courseApi.enrollCourse(courseId).subscribe({
      next: () => {
        // Đăng ký thành công - tải lại khóa học
        this.loadCourse(courseId);
      },
      error: (err) => {
        // Đăng ký thất bại - không hiển thị popup
      },
      complete: () => this.enrolling.set(false)
    });
  }

  selectLesson(lesson: VideoLesson): void {
    this.currentLesson.set(lesson);
    // Fetch lesson detail to get videoUrl and duration
    this.lessonApi.getLessonById(lesson.id).subscribe({
      next: (res) => {
        const detail: LessonDetail | undefined = res?.data as any;
        
        let videoUrl = '';
        if (detail && typeof detail.videoUrl === 'string' && detail.videoUrl.trim() !== '') {
          videoUrl = detail.videoUrl;
        }
        const updated: VideoLesson = {
          ...lesson,
          videoUrl,
          content: detail?.content || '', /* Lines 539-540 omitted */
          duration: (detail?.durationMinutes || 0) * 60,
          attachments: detail?.attachments || []
        };
        
        // Update in course lessons array
        const lessons = this.course().lessons.map(l => l.id === lesson.id ? updated : l);
        this.course.update(c => ({ ...c, lessons }));
        
        // Set current lesson với content mới
        this.currentLesson.set(updated);
        
        this.updateVideoPlayer();
      },
      error: (err: any) => {
        // If forbidden, show access denied state and clear current lesson
        const msg = (err?.message || '').toLowerCase();
        if (msg.includes('403') || msg.includes('không có quyền') || msg.includes('forbidden')) {
          this.accessDenied.set(true);
          this.currentLesson.set(null);
        } else {
          this.updateVideoPlayer();
        }
      }
    });
  }

  selectFirstLesson(): void {
    if (this.course().lessons.length > 0) {
      this.selectLesson(this.course().lessons[0]);
    }
  }

  previousLesson(): void {
    const currentIndex = this.currentLessonIndex();
    if (currentIndex > 0) {
      this.selectLesson(this.course().lessons[currentIndex - 1]);
    }
  }

  nextLesson(): void {
    const currentIndex = this.currentLessonIndex();
    if (currentIndex < this.course().lessons.length - 1) {
      this.selectLesson(this.course().lessons[currentIndex + 1]);
    }
  }

  isFirstLesson(): boolean {
    return this.currentLessonIndex() === 0;
  }

  isLastLesson(): boolean {
    return this.currentLessonIndex() === this.course().lessons.length - 1;
  }

  isCurrentLesson(lesson: VideoLesson): boolean {
    const current = this.currentLesson();
    return current ? current.id === lesson.id : false;
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

  updateVideoPlayer(): void {
    const current = this.currentLesson();
    if (current && current.videoUrl) {
      const src = current.videoUrl.startsWith('http') ? current.videoUrl : `${environment.apiUrl}${current.videoUrl}`;
      this.videoPlayerConfig.set({
        ...this.videoPlayerConfig(),
        src,
        poster: current.thumbnail
      });
    } else {
      this.videoPlayerConfig.set({
        ...this.videoPlayerConfig(),
        src: '',
        poster: current ? current.thumbnail : ''
      });
    }
  }

  filterLessons(): void {
    // The computed signal will automatically update
  }

  goBack(): void {
    // Since we're now nested under student routes, always go back to student dashboard
    this.router.navigate(['/student']);
  }

  getBreadcrumbLink(): string[] {
    // Since we're now nested under student routes, always link to student dashboard
    return ['/student'];
  }



  getLessonButtonClass(lesson: VideoLesson): string {
    const current = this.currentLesson();
    const isSelected = current && current.id === lesson.id;

    if (isSelected) {
      return 'bg-blue-50 border-2 border-blue-500 text-blue-900 shadow-md';
    } else if (lesson.isCompleted) {
      return 'bg-green-50 border border-green-200 text-green-900 hover:bg-green-100';
    } else if (lesson.watchedDuration > 0) {
      return 'bg-blue-50 border border-blue-200 text-blue-900 hover:bg-blue-100';
    } else {
      return 'bg-gray-50 border border-gray-200 text-gray-900 hover:bg-gray-100';
    }
  }

  getLessonNumberClass(lesson: VideoLesson): string {
    const current = this.currentLesson();
    const isSelected = current && current.id === lesson.id;

    if (isSelected) {
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

  // File type checking methods
  isPdfFile(fileName: string): boolean {
    return fileName?.toLowerCase().endsWith('.pdf') || false;
  }

  isPresentationFile(fileName: string): boolean {
    const lower = fileName?.toLowerCase() || '';
    return lower.endsWith('.ppt') || lower.endsWith('.pptx');
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

  isVideoFile(fileName: string): boolean {
    const lower = fileName?.toLowerCase() || '';
    return lower.endsWith('.mp4') || lower.endsWith('.avi') || 
           lower.endsWith('.mov') || lower.endsWith('.wmv') || 
           lower.endsWith('.flv') || lower.endsWith('.webm');
  }

  isAudioFile(fileName: string): boolean {
    const lower = fileName?.toLowerCase() || '';
    return lower.endsWith('.mp3') || lower.endsWith('.wav') || 
           lower.endsWith('.ogg') || lower.endsWith('.aac') || 
           lower.endsWith('.flac') || lower.endsWith('.wma');
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
    if (this.expandedAttachment === index) {
      // Thu gọn
      this.expandedAttachment = null;
      return;
    }

    // Mở rộng - đơn giản chỉ toggle
    this.expandedAttachment = index;
  }

  getSafeUrl(url?: string): SafeResourceUrl | null {
    if (!url) return null;
    
    // Check if blob URL already exists
    const existingBlobUrl = this.blobUrlMap.get(url);
    if (existingBlobUrl) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(existingBlobUrl);
    }

    // Try to create blob URL for CORS bypass (async)
    this.prefetchAndCreateBlob(url);
    
    // Return sanitized direct URL as fallback
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  private async prefetchAndCreateBlob(url: string) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        this.blobUrlMap.set(url, blobUrl);
        // Re-trigger change detection to update iframe
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.log('Could not create blob URL, using direct URL', error);
    }
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

  getOfficeViewerUrl(fileUrl: string): SafeResourceUrl {
    const encodedUrl = encodeURIComponent(fileUrl);
    const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(viewerUrl);
  }

  getVideoMimeType(fileName: string): string {
    const ext = fileName?.toLowerCase().split('.').pop();
    const mimeTypes: { [key: string]: string } = {
      'mp4': 'video/mp4',
      'avi': 'video/avi',
      'mov': 'video/quicktime',
      'wmv': 'video/x-ms-wmv',
      'flv': 'video/x-flv',
      'webm': 'video/webm'
    };
    return mimeTypes[ext || ''] || 'video/mp4';
  }

  getAudioMimeType(fileName: string): string {
    const ext = fileName?.toLowerCase().split('.').pop();
    const mimeTypes: { [key: string]: string } = {
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'aac': 'audio/aac',
      'flac': 'audio/flac',
      'wma': 'audio/x-ms-wma'
    };
    return mimeTypes[ext || ''] || 'audio/mpeg';
  }



  // Video player event handlers
  onVideoStateChange(state: any): void {
    console.log('Video state changed:', state);
  }

  onVideoTimeUpdate(time: number): void {
    if (typeof time === 'number') {
      console.log('Video time update:', time);
    } else {
      console.warn('Video time update event is not a number:', time);
    }
  }

  onVideoPlay(): void {
    console.log('Video started playing');
  }

  onVideoPause(): void {
    console.log('Video paused');
  }

  onVideoEnded(): void {
    console.log('Video ended');
    this.markAsComplete();
  }

  onVideoError(error: any): void {
    console.error('Video error:', error);
  }


  
}