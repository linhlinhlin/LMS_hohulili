import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LessonApi } from '../../../api/client/lesson.api';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { DocumentService, DocumentUploadResponse, UploadProgress } from '../../../api/client/document.service';
import { LessonAttachmentApi } from '../../../api/client/lesson-attachment.api';
import { CreateAssignmentLessonRequest } from '../../../api/types/assignment.types';
import { CreateLessonRequest } from '../../../api/types/course.types';
import { QuizApi } from '../../../api/endpoints/quiz.api';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-section-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  encapsulation: ViewEncapsulation.None,
  template: `
  <div class="max-w-5xl mx-auto p-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Nội dung chương</h1>
        <a class="px-4 py-2 border rounded hover:bg-gray-50 transition-colors flex items-center gap-2" [routerLink]="['/teacher/courses', courseId, 'sections']">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          Quay lại chương
        </a>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        
        <div class="p-6 text-gray-500" *ngIf="!loading() && lessons().length === 0">Chưa có bài học nào.</div>
        <div class="p-6 text-red-600" *ngIf="error()">{{ error() }}</div>

        <ul class="divide-y">
          <li *ngFor="let l of lessons()" class="py-3 flex items-center justify-between">
            <div class="pr-3 flex items-center gap-3">
              <div>
                <div class="font-medium">{{ l.title }}</div>
                <div class="text-sm font-medium">
                  <ng-container *ngIf="l.lessonType === 'ASSIGNMENT'">
                    <span class="text-green-600">Bài tập</span>
                  </ng-container>
                  <ng-container *ngIf="!l.lessonType || l.lessonType === 'LECTURE'">
                    <span class="text-blue-600">Bài học</span>
                  </ng-container>
                  <ng-container *ngIf="l.lessonType === 'QUIZ'">
                    <span class="text-purple-600">Trắc nghiệm</span>
                  </ng-container>
                </div>
              </div>
            </div>
            <div class="inline-flex items-center gap-2">
              <button class="px-3 py-1 border rounded" (click)="viewLesson(l)">Xem</button>
              <button class="px-3 py-1 border rounded" (click)="startEdit(l)">Sửa</button>
              <button class="px-3 py-1 border rounded text-red-600" (click)="deleteLesson(l.id)">Xóa</button>
            </div>
          </li>
        </ul>
      </div>

      <!-- Video viewer -->
      <div class="bg-white rounded-lg shadow p-6 mt-6" *ngIf="selected() as s">
        <div class="flex items-center justify-between mb-3">
          <div class="font-semibold">Xem bài học: {{ s.title }}</div>
          <div class="inline-flex items-center gap-2">
            <button class="px-3 py-1 border rounded" (click)="closeViewer()">Đóng</button>
          </div>
        </div>
        <div class="text-sm text-gray-600 mb-3" *ngIf="s.description">{{ s.description }}</div>
        
        <!-- Video Section - Only show if video URL exists and is valid -->
        <div *ngIf="hasValidVideoUrl(s)" class="mb-4">
          <div class="font-semibold mb-2">Video bài học</div>
          <ng-container *ngIf="s.videoUrl">
            <div *ngIf="isYouTube(s.videoUrl); else nativeVideo">
              <div class="aspect-video w-full rounded overflow-hidden">
                <iframe class="w-full h-full" [src]="sanitizedEmbed()" frameborder="0" allowfullscreen></iframe>
              </div>
            </div>
            <ng-template #nativeVideo>
              <video class="w-full rounded" controls [src]="s.videoUrl"></video>
            </ng-template>
          </ng-container>
        </div>

        <!-- Lesson content displayed in viewer -->
        <div class="mt-4">
          <!-- LECTURE Content -->
          <ng-container *ngIf="s.lessonType === 'LECTURE' || !s.lessonType">
            <div class="font-semibold mb-1">Nội dung bài học</div>
            <div class="text-gray-800 whitespace-pre-line">{{ s.content || 'Chưa có nội dung.' }}</div>
          </ng-container>

          <!-- ASSIGNMENT Content -->
          <ng-container *ngIf="s.lessonType === 'ASSIGNMENT'">
            <div class="font-semibold mb-1">Thông tin bài tập</div>
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <!-- Assignment Description -->
              <div class="bg-white rounded p-3 border border-blue-300">
                <h4 class="font-medium text-blue-900 mb-2">Mô tả bài tập</h4>
                <div class="text-blue-800 whitespace-pre-line">{{ s.content || 'Chưa có mô tả.' }}</div>
              </div>
              
              <!-- Assignment Instructions (if available) -->
              <div *ngIf="s.assignment?.instructions" class="bg-white rounded p-3 border border-blue-300">
                <h4 class="font-medium text-blue-900 mb-2">🧾 Hướng dẫn chi tiết</h4>
                <div class="text-blue-800 whitespace-pre-line">{{ s.assignment.instructions }}</div>
              </div>
              
              <!-- Assignment Info Grid -->
              <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div class="bg-white rounded p-3 text-center border border-blue-300">
                  <div class="text-lg font-bold text-blue-600">{{ getAssignmentStatus(s) }}</div>
                  <div class="text-xs text-blue-500">Trạng thái</div>
                </div>
                
                <div *ngIf="getAssignmentMaxScore(s)" class="bg-white rounded p-3 text-center border border-blue-300">
                  <div class="text-lg font-bold text-green-600">{{ getAssignmentMaxScore(s) }}</div>
                  <div class="text-xs text-green-500">Điểm tối đa</div>
                </div>
                
                <div *ngIf="getAssignmentDueDate(s)" class="bg-white rounded p-3 text-center border border-blue-300">
                  <div class="text-sm font-bold text-orange-600">{{ getAssignmentDueDate(s) }}</div>
                  <div class="text-xs text-orange-500">Hạn nộp</div>
                </div>
                
                <div class="bg-white rounded p-3 text-center border border-blue-300">
                  <div class="text-lg font-bold text-purple-600">{{ getAssignmentSubmissionCount(s) }}</div>
                  <div class="text-xs text-purple-500">Bài nộp</div>
                </div>
              </div>

              <!-- Assignment Management Actions -->
              <div class="flex gap-2 pt-2 border-t border-blue-300">
                <button class="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                  Chỉnh sửa bài tập
                </button>
                
                <button class="px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center gap-2" 
                        (click)="viewAssignmentSubmissions(s)">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  Xem bài nộp ({{ getAssignmentSubmissionCount(s) }})
                </button>
                
                <button class="px-3 py-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 flex items-center gap-2"
                        (click)="toggleAssignmentStatus(s)">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                  </svg>
                  {{ s.assignment?.status === 'PUBLISHED' ? 'Đóng bài tập' : 'Mở bài tập' }}
                </button>
              </div>
            </div>
          </ng-container>

          <!-- QUIZ Content -->
          <ng-container *ngIf="s.lessonType === 'QUIZ'">
            <div class="font-semibold mb-3">Thông tin bài trắc nghiệm</div>
            <div class="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
              <!-- Quiz Info Grid -->
              <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div class="bg-white rounded p-3 text-center border border-purple-300">
                  <div class="text-lg font-bold text-purple-600">{{ s.quizTimeLimit || 30 }}</div>
                  <div class="text-xs text-purple-500">Thời gian (phút)</div>
                </div>
                
                <div class="bg-white rounded p-3 text-center border border-purple-300">
                  <div class="text-lg font-bold text-green-600">{{ s.quizMaxScore || 100 }}</div>
                  <div class="text-xs text-green-500">Điểm tối đa</div>
                </div>
                
                <div class="bg-white rounded p-3 text-center border border-purple-300">
                  <div class="text-lg font-bold text-orange-600">{{ s.quizMaxAttempts || 1 }}</div>
                  <div class="text-xs text-orange-500">Số lần làm</div>
                </div>
                
                <div class="bg-white rounded p-3 text-center border border-purple-300">
                  <div class="text-lg font-bold text-blue-600">
                    {{ currentViewingQuizId() === s.id ? quizQuestions().length : '...' }}
                  </div>
                  <div class="text-xs text-blue-500">Số câu hỏi</div>
                </div>
              </div>

              <!-- Quiz Questions -->
              <div class="bg-white rounded-lg p-4 border border-purple-300">
                <div class="flex items-center justify-between mb-4">
                  <h4 class="font-semibold text-purple-900">Danh sách câu hỏi</h4>
                  <div class="flex gap-2">
                    <button (click)="loadQuizQuestions(s.id)"
                            class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2">
                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"></path>
                      </svg>
                      Xem câu hỏi
                    </button>
                    <button (click)="openQuizBankToAddQuestions(s.id, s.title)"
                            class="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 flex items-center gap-2">
                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path>
                      </svg>
                      Thêm câu hỏi
                    </button>
                  </div>
                </div>

                <!-- Loading state -->
                <div *ngIf="isLoadingQuizQuestions() && currentViewingQuizId() === s.id" class="text-center py-8">
                  <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <p class="text-gray-500 mt-2">Đang tải câu hỏi...</p>
                </div>

                <!-- Empty state -->
                <div *ngIf="!isLoadingQuizQuestions() && currentViewingQuizId() === s.id && quizQuestions().length === 0" 
                     class="text-center py-8 text-gray-500">
                  <svg class="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <p class="text-sm">Chưa có câu hỏi nào. Click "Thêm câu hỏi" để bắt đầu.</p>
                </div>

                <!-- Question List -->
                <div *ngIf="!isLoadingQuizQuestions() && currentViewingQuizId() === s.id && quizQuestions().length > 0" 
                     class="space-y-4">
                  <div *ngFor="let question of quizQuestions(); let idx = index" 
                       class="border border-gray-200 rounded-lg p-4">
                    <div class="flex items-start gap-3">
                      <div class="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-semibold">
                        {{ idx + 1 }}
                      </div>
                      <div class="flex-1">
                        <div class="font-medium text-gray-900 mb-3">{{ question.content }}</div>
                        <div class="space-y-2">
                          <div *ngFor="let option of question.options" 
                               class="flex items-center gap-2 p-2 rounded"
                               [class.bg-green-50]="option.key === question.correctOption"
                               [class.border-green-200]="option.key === question.correctOption"
                               [class.bg-gray-50]="option.key !== question.correctOption"
                               [class.border-gray-200]="option.key !== question.correctOption"
                               [class.border]="true">
                            <div class="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-sm font-semibold"
                                 [class.bg-green-500]="option.key === question.correctOption"
                                 [class.text-white]="option.key === question.correctOption"
                                 [class.bg-gray-400]="option.key !== question.correctOption"
                                 [class.text-white]="option.key !== question.correctOption">
                              {{ option.key }}
                            </div>
                            <span [class.text-green-900]="option.key === question.correctOption"
                                  [class.font-medium]="option.key === question.correctOption"
                                  [class.text-gray-700]="option.key !== question.correctOption">
                              {{ option.content }}
                            </span>
                            <svg *ngIf="option.key === question.correctOption" 
                                 class="w-5 h-5 text-green-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                            </svg>
                          </div>
                        </div>
                        <div class="mt-2 flex items-center gap-4">
                          <span class="text-xs px-2 py-1 rounded-full font-medium"
                                [class.bg-green-100]="question.difficulty === 'EASY'"
                                [class.text-green-700]="question.difficulty === 'EASY'"
                                [class.bg-yellow-100]="question.difficulty === 'MEDIUM'"
                                [class.text-yellow-700]="question.difficulty === 'MEDIUM'"
                                [class.bg-red-100]="question.difficulty === 'HARD'"
                                [class.text-red-700]="question.difficulty === 'HARD'">
                            {{ question.difficulty === 'EASY' ? 'Dễ' : question.difficulty === 'MEDIUM' ? 'Trung bình' : 'Khó' }}
                          </span>
                          <span class="text-xs text-gray-500">Tags: {{ question.tags }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ng-container>
        </div>

        <!-- Lesson attachments with direct viewing -->
        <div class="mt-4" *ngIf="s.attachments && s.attachments.length > 0">
          <div class="font-semibold mb-2">Tài liệu bài học ({{ s.attachments.length }})</div>
          <div class="space-y-3">
            <div *ngFor="let attachment of s.attachments; let i = index" class="border rounded-lg overflow-hidden">
              <!-- Attachment Header -->
              <div class="flex items-center justify-between bg-gray-50 p-3 border-b">
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
                  <button *ngIf="isPresentationFile(attachment.originalFileName)" 
                          (click)="toggleAttachmentViewer(i)"
                          class="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                    {{ expandedAttachment === i ? 'Thu gọn' : 'Xem slide' }}
                  </button>
                  <button *ngIf="isPdfFile(attachment.originalFileName)" 
                          (click)="toggleAttachmentViewer(i)"
                          class="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700">
                    {{ expandedAttachment === i ? 'Thu gọn' : 'Xem PDF' }}
                  </button>
                  <a [href]="attachment.fileUrl" target="_blank" 
                     class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                    Tải về
                  </a>
                  <button class="px-3 py-1 border text-sm rounded hover:bg-gray-50" 
                          (click)="removeAttachmentFromLesson(s.id, attachment.id)">
                    Xóa
                  </button>
                </div>
              </div>
              
              <!-- Inline File Viewer -->
              <div *ngIf="expandedAttachment === i" class="p-4 bg-white">
                <!-- PDF Viewer -->
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
                      <button class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                              (click)="openPdfFullscreen(attachment)">
                        <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path>
                        </svg>
                        Phóng to
                      </button>
                    </div>
                  </div>
                </div>
                
                <!-- Office Document Viewer (using Office Online) -->
                <div *ngIf="isOfficeFile(attachment.originalFileName)" class="w-full">
                  <iframe [src]="getOfficeViewerUrl(attachment.fileUrl)" 
                          class="w-full border-0 rounded"
                          style="height: 600px;"
                          frameborder="0">
                    <p>Không thể hiển thị file. <a [href]="attachment.fileUrl" target="_blank">Tải về để xem</a></p>
                  </iframe>
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
      </div>

      <!-- PDF Fullscreen Viewer Modal - TRUE FULLSCREEN -->
      <div *ngIf="pdfFullscreenAttachment" 
           class="fixed inset-0 bg-black z-50"
           (mousemove)="onFullscreenMouseMove()">
        <!-- Header overlay với controls - Auto hide -->
        <div class="absolute top-0 left-0 right-0 bg-black bg-opacity-80 text-white p-4 z-10 
                    transition-all duration-500 hover:bg-opacity-100"
             [ngClass]="{'opacity-100 translate-y-0': showFullscreenHeader, 'opacity-0 -translate-y-full pointer-events-none': !showFullscreenHeader}">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="text-red-400">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-white">{{ pdfFullscreenAttachment.originalFileName }}</h3>
                <p class="text-sm text-gray-300">{{ formatFileSize(pdfFullscreenAttachment.fileSize) }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <a [href]="pdfFullscreenAttachment.fileUrl" target="_blank"
                 class="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                Tải về
              </a>
              <button (click)="closePdfFullscreen()"
                      class="px-4 py-2 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                Thoát
              </button>
            </div>
          </div>
        </div>

        <!-- PDF Viewer - Full screen -->
        <div class="w-full h-full transition-all duration-500"
             [ngClass]="{'pt-20': showFullscreenHeader, 'pt-4': !showFullscreenHeader}">
          <iframe [src]="getSafeUrl(pdfFullscreenAttachment.fileUrl)"
                  class="w-full h-full border-0"
                  frameborder="0">
            <div class="flex items-center justify-center h-full text-white">
              <div class="text-center">
                <p class="text-lg mb-4">Trình duyệt không hỗ trợ xem PDF.</p>
                <a [href]="pdfFullscreenAttachment.fileUrl" target="_blank" 
                   class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  Tải về để xem
                </a>
              </div>
            </div>
          </iframe>
        </div>
      </div>

      <div class="mt-4 w-full flex justify-end">
        <button 
          (click)="toggleCreateForm()"
          class="ml-auto inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path *ngIf="!showCreateForm()" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            <path *ngIf="showCreateForm()" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
          {{ showCreateForm() ? 'Đóng form' : 'Thêm nội dung mới' }}
        </button>
      </div>

      <!-- Create new lesson form (collapsible) -->
      <div class="bg-white rounded-lg shadow p-6 mt-4" *ngIf="showCreateForm()">
        <div class="font-semibold mb-3">Thêm bài học mới</div>
        <form [formGroup]="createForm" class="space-y-4">
          <!-- Basic Info -->
          <div class="flex flex-wrap items-center gap-2">
            <input class="border rounded px-3 py-2 w-64" formControlName="title" placeholder="Tiêu đề" />
            <select class="border rounded px-3 py-2 w-48" formControlName="lessonType">
              <option *ngFor="let option of lessonTypeOptions" [value]="option.value">
                {{ option.label }}
              </option>
            </select>
            <!-- Video URL - Only for LECTURE type -->
            <input *ngIf="!isAssignmentType && !isQuizType" class="border rounded px-3 py-2 w-64" formControlName="videoUrl" placeholder="URL video (tùy chọn)" />
          </div>

          <!-- Assignment-specific fields (conditional) -->
          <div *ngIf="isAssignmentType" class="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50">
            <div class="font-medium text-blue-800 mb-3">Thông tin bài tập</div>
            <div class="space-y-3">
              <textarea class="border rounded px-3 py-2 w-full min-h-[80px]" formControlName="assignmentDescription" placeholder="Mô tả bài tập"></textarea>
              <textarea class="border rounded px-3 py-2 w-full min-h-[80px]" formControlName="assignmentInstructions" placeholder="Hướng dẫn chi tiết"></textarea>
              <div class="flex gap-2">
                <div class="flex-1">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Ngày hết hạn</label>
                  <input type="datetime-local" class="border rounded px-3 py-2 w-full" formControlName="dueDate" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Điểm tối đa</label>
                  <input type="number" class="border rounded px-3 py-2 w-24" formControlName="maxScore" placeholder="100" />
                </div>
              </div>
            </div>
          </div>

          <!-- File Attachments Section - Hidden for Quiz type -->
          <div *ngIf="!isQuizType" class="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
            <div class="text-sm font-medium text-gray-700 mb-2">
              <span *ngIf="!isAssignmentType">📎 File đính kèm (PDF, Word, Excel, PowerPoint, Video, Audio):</span>
              <span *ngIf="isAssignmentType">📎 File đính kèm và mẫu/template cho sinh viên:</span>
            </div>
            <div class="flex items-center gap-2">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.mp4,.avi,.mov,.mp3,.wav,.zip,.rar"
                multiple
                (change)="onFileAttachmentsUpload($event)"
                class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            <div class="text-xs text-gray-500 mt-1">
              <span *ngIf="!isAssignmentType">Hỗ trợ: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, MP4, AVI, MOV, MP3, WAV (tối đa 100MB/file)</span>
              <span *ngIf="isAssignmentType">File đính kèm, mẫu/template cho sinh viên tham khảo và tải về. Hỗ trợ: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, MP4, AVI, MOV, MP3, WAV, ZIP, RAR (tối đa 100MB/file)</span>
            </div>

            <!-- Upload Progress -->
            <div *ngIf="attachmentUploadProgress()" class="mt-3">
              <div class="flex items-center justify-between text-sm">
                <span class="text-blue-600">{{ attachmentUploadProgress()?.message }}</span>
                <span class="text-blue-600">{{ attachmentUploadProgress()?.progress }}%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                     [style.width.%]="attachmentUploadProgress()?.progress"></div>
              </div>
            </div>

            <!-- Upload Success Message -->
            <div *ngIf="attachmentUploadSuccess()" class="mt-2 p-2 bg-green-100 text-green-700 rounded text-sm">
              ✅ {{ attachmentUploadSuccess() }}
            </div>

            <!-- Selected Attachments List -->
            <div *ngIf="tempAttachments.length > 0" class="mt-3">
              <div class="text-sm font-medium text-gray-700 mb-2">File đã chọn ({{ tempAttachments.length }}):</div>
              <div class="space-y-1">
                <div *ngFor="let file of tempAttachments; let i = index" class="flex items-center justify-between bg-white p-2 rounded border">
                  <div class="flex items-center gap-2">
                    <div class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{{ getFileExtension(file.name) }}</div>
                    <span class="text-sm">{{ file.name }}</span>
                    <span class="text-xs text-gray-500">({{ formatFileSize(file.size) }})</span>
                  </div>
                  <button type="button" (click)="removeAttachment(i)" class="text-red-600 hover:text-red-800">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Assignment Instructions Document Upload -->
          <div *ngIf="isAssignmentType" class="border-2 border-dashed border-green-300 rounded-lg p-4 bg-green-50">
            <div class="text-sm font-medium text-green-800 mb-2">📄 Tải file Word để tự động điền hướng dẫn chi tiết:</div>
            <div class="flex items-center gap-2">
              <input
                type="file"
                accept=".doc,.docx"
                (change)="onInstructionsDocumentUpload($event)"
                class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />
            </div>
            <div class="text-xs text-green-600 mt-1">Hỗ trợ: .doc, .docx (tối đa 10MB) - Nội dung sẽ được điền vào "Hướng dẫn chi tiết"</div>

            <!-- Upload Progress -->
            <div *ngIf="uploadProgress()" class="mt-3">
              <div class="flex items-center justify-between text-sm">
                <span class="text-blue-600">{{ uploadProgress()?.message }}</span>
                <span class="text-blue-600">{{ uploadProgress()?.progress }}%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                     [style.width.%]="uploadProgress()?.progress"></div>
              </div>
            </div>

            <!-- Upload Success Message -->
            <div *ngIf="uploadSuccess()" class="mt-2 p-2 bg-green-100 text-green-700 rounded text-sm">
              ✅ Đã tải và xử lý file thành công: <strong>{{ uploadSuccess() }}</strong>
            </div>
          </div>

          <!-- Content Document Upload - Only for LECTURE type -->
          <div *ngIf="createForm.get('lessonType')?.value === 'LECTURE'" class="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50">
            <div class="text-sm font-medium text-blue-800 mb-2">📄 Tải file Word (.doc/.docx) để tự động điền nội dung:</div>
            <div class="flex items-center gap-2">
              <input
                type="file"
                accept=".doc,.docx"
                (change)="onDocumentUpload($event)"
                class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            <div class="text-xs text-blue-600 mt-1">Hỗ trợ: .doc, .docx (tối đa 10MB) - Nội dung sẽ được điền vào "Nội dung bài học"</div>
            
            <!-- Upload Progress -->
            <div *ngIf="uploadProgress()" class="mt-3">
              <div class="flex items-center justify-between text-sm">
                <span class="text-blue-600">{{ uploadProgress()?.message }}</span>
                <span class="text-blue-600">{{ uploadProgress()?.progress }}%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                     [style.width.%]="uploadProgress()?.progress"></div>
              </div>
            </div>
          </div>

          <!-- Content Textarea - Only for LECTURE type -->
          <div *ngIf="createForm.get('lessonType')?.value === 'LECTURE'">
            <label class="block text-sm font-medium text-gray-700 mb-1">Nội dung bài học:</label>
            <textarea 
              class="border rounded px-3 py-2 w-full min-h-[200px]" 
              formControlName="content" 
              placeholder="Nhập nội dung bài học hoặc tải file .doc/.docx ở trên để tự động điền...">
            </textarea>
          </div>

          <!-- Quiz Configuration Section -->
          <div *ngIf="isQuizType" class="border-2 border-dashed border-purple-300 rounded-lg p-6 bg-purple-50 space-y-4">
            <div class="flex items-start gap-3">
              <span class="text-3xl">❓</span>
              <div class="flex-1">
                <div class="text-base font-semibold text-purple-800 mb-4">Cấu hình trắc nghiệm</div>
                
                <div class="bg-white rounded-lg p-4 mb-4">
                  <label class="block text-sm font-medium text-gray-700 mb-2">Thời gian làm bài (phút):</label>
                  <input type="number" formControlName="quizTimeLimit" class="w-full md:w-48 border-2 border-gray-300 rounded-lg px-4 py-3 text-base focus:border-purple-500 focus:outline-none" placeholder="30" min="1" />
                </div>

                <div class="bg-white rounded-lg p-4 mb-4">
                  <label class="block text-sm font-medium text-gray-700 mb-2">Điểm tối đa:</label>
                  <input type="number" formControlName="quizMaxScore" class="w-full md:w-48 border-2 border-gray-300 rounded-lg px-4 py-3 text-base focus:border-purple-500 focus:outline-none" placeholder="100" min="1" />
                </div>

                <div class="bg-white rounded-lg p-4 mb-4">
                  <label class="block text-sm font-medium text-gray-700 mb-2">Số lần làm bài tối đa:</label>
                  <input type="number" formControlName="quizMaxAttempts" class="w-full md:w-48 border-2 border-gray-300 rounded-lg px-4 py-3 text-base focus:border-purple-500 focus:outline-none" placeholder="1" min="1" />
                </div>

                <div class="bg-yellow-100 border-l-4 border-yellow-500 p-4 mt-4">
                  <div class="flex items-start gap-2">
                    <span class="text-yellow-700 text-base">⚠️</span>
                    <div class="text-sm text-yellow-700">
                      <strong>Lưu ý:</strong> Sau khi tạo bài trắc nghiệm, bạn cần vào <strong>Quiz Bank</strong> để thêm câu hỏi cho quiz này.
                      <br />Hoặc có thể link quiz này với các câu hỏi đã có sẵn trong Question Bank.
                    </div>
                  </div>
                </div>

                <div class="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mt-4">
                  <div class="text-sm text-blue-800 mb-3">
                    <strong>💡 Gợi ý:</strong> Sau khi tạo quiz, bạn cần thêm câu hỏi từ Quiz Bank.
                  </div>
                  <button type="button"
                          (click)="openQuizBankInNewTab()"
                          class="inline-flex items-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors">
                    <span class="text-lg">➕</span>
                    <span>Thêm/Chọn câu hỏi từ Quiz Bank</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Submit Button -->
          <div class="flex items-center gap-2">
            <button type="button" class="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50" [disabled]="createForm.invalid || uploadProgress()" (click)="createLesson()">
              + {{ isAssignmentType ? 'Tạo bài tập' : isQuizType ? 'Tạo bài trắc nghiệm' : 'Tạo bài học' }}
            </button>
            <button type="button" class="px-4 py-2 border rounded" (click)="resetForm()">
              Xóa form
            </button>
          </div>
        </form>
        <div class="text-red-600 mt-2" *ngIf="opError()">{{ opError() }}</div>
      </div>

      <!-- Edit lesson modalish (simple inline) -->
      <div class="bg-white rounded-lg shadow p-6 mt-6" *ngIf="editingId() as id">
        <div class="font-semibold mb-3">Sửa bài học</div>
        <form [formGroup]="editForm" class="space-y-4">
          <div class="flex flex-wrap items-center gap-2">
            <input class="border rounded px-3 py-2 w-64" formControlName="title" placeholder="Tiêu đề" />
            <input class="border rounded px-3 py-2 w-64" formControlName="videoUrl" placeholder="URL video" />
          </div>

          <!-- Document Upload for Edit -->
          <div class="border border-gray-300 rounded-lg p-3 bg-gray-50">
            <div class="text-sm font-medium text-gray-700 mb-2">Tải file Word để thay thế nội dung:</div>
            <input 
              type="file" 
              accept=".doc,.docx"
              (change)="onDocumentUploadEdit($event)"
              class="block w-full text-sm text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700"
            />
          </div>

          <!-- File Attachments Management for Edit -->
          <div class="border border-gray-300 rounded-lg p-3 bg-blue-50">
            <div class="text-sm font-medium text-gray-700 mb-2">Quản lý tệp đính kèm:</div>
            
            <!-- Add New Attachments -->
            <div class="mb-3">
              <div class="text-xs text-gray-600 mb-1">Thêm tệp đính kèm mới:</div>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.mp4,.avi,.mov,.mp3,.wav"
                multiple
                (change)="onEditAttachmentsUpload($event)"
                class="block w-full text-sm text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <div class="text-xs text-gray-500 mt-1">Hỗ trợ: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, MP4, AVI, MOV, MP3, WAV (tối đa 100MB/file)</div>
            </div>

            <!-- Upload Progress for Edit -->
            <div *ngIf="editAttachmentUploadProgress()" class="mb-3">
              <div class="flex items-center justify-between text-sm">
                <span class="text-blue-600">{{ editAttachmentUploadProgress()?.message }}</span>
                <span class="text-blue-600">{{ editAttachmentUploadProgress()?.progress }}%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                     [style.width.%]="editAttachmentUploadProgress()?.progress"></div>
              </div>
            </div>

            <!-- Upload Success Message for Edit -->
            <div *ngIf="editAttachmentUploadSuccess()" class="mb-2 p-2 bg-green-100 text-green-700 rounded text-sm">
              ✅ {{ editAttachmentUploadSuccess() }}
            </div>

            <!-- Current Attachments List -->
            <div *ngIf="getCurrentLessonForEdit()?.attachments?.length > 0" class="mt-2">
              <div class="text-xs text-gray-600 mb-2">Tệp đính kèm hiện có ({{ getCurrentLessonForEdit()?.attachments?.length }}):</div>
              <div class="space-y-1">
                <div *ngFor="let attachment of getCurrentLessonForEdit()?.attachments; let i = index" 
                     class="flex items-center justify-between bg-white p-2 rounded border text-sm">
                  <div class="flex items-center gap-2">
                    <div class="text-xs px-2 py-1 rounded font-medium" 
                         [class]="getFileTypeClass(attachment.originalFileName)">
                      {{ getFileExtension(attachment.originalFileName) }}
                    </div>
                    <div>
                      <div class="font-medium">{{ attachment.originalFileName }}</div>
                      <div class="text-xs text-gray-500">{{ formatFileSize(attachment.fileSize) }}</div>
                    </div>
                  </div>
                  <div class="flex items-center gap-1">
                    <a [href]="attachment.fileUrl" target="_blank" 
                       class="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">
                      Xem
                    </a>
                    <button class="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700" 
                            (click)="removeAttachmentFromEditingLesson(attachment.id)">
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <textarea class="border rounded px-3 py-2 w-full min-h-[200px]" formControlName="content" placeholder="Nội dung bài học"></textarea>
          <div class="inline-flex items-center gap-2">
            <button type="button" class="px-3 py-1 border rounded" (click)="saveEdit(id)">Lưu</button>
            <button type="button" class="px-3 py-1 border rounded" (click)="cancelEdit()">Hủy</button>
          </div>
        </form>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SectionEditorComponent implements OnDestroy {

  // Cache of sanitized SafeResourceUrls created from fetched blobs (keyed by original URL)
  safeUrls = signal<Record<string, SafeResourceUrl | null>>({});
  // Keep raw blob URLs so we can revoke them when no longer needed
  private blobUrlMap: Record<string, string> = {};

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private lessonApi = inject(LessonApi);
  private lessonAttachmentApi = inject(LessonAttachmentApi);
  private fb = inject(FormBuilder);
  private sanitizer = inject(DomSanitizer);
  private documentService = inject(DocumentService);
  private quizApi = inject(QuizApi);

  courseId: string = '';
  lessons = signal<any[]>([]);
  loading = signal<boolean>(true);
  error = signal<string>('');
  opError = signal<string>('');
  editingId = signal<string | null>(null);
  selected = signal<any | null>(null);
  private _sanitizedEmbed = signal<SafeResourceUrl | null>(null);

  // Document upload signals
  uploadProgress = signal<UploadProgress | null>(null);
  uploadSuccess = signal<string>('');

  // File attachments signals
  attachmentUploadProgress = signal<UploadProgress | null>(null);
  attachmentUploadSuccess = signal<string>('');
  
  // PDF upload for current lesson signals
  currentLessonUploadProgress = signal<UploadProgress | null>(null);
  currentLessonUploadSuccess = signal<string>('');
  
  // Edit attachments signals
  editAttachmentUploadProgress = signal<UploadProgress | null>(null);
  editAttachmentUploadSuccess = signal<string>('');
  
  // Show/hide create lesson form
  showCreateForm = signal<boolean>(false);
  
  // Store recently created quiz ID for Quiz Bank navigation
  lastCreatedQuizId = signal<string | null>(null);
  lastCreatedQuizTitle = signal<string>('');

  // Quiz viewer data
  currentViewingQuizId = signal<string | null>(null);
  quizQuestions = signal<any[]>([]);
  isLoadingQuizQuestions = signal<boolean>(false);
  
  // Temporary storage for attachments before lesson creation
  tempAttachments: File[] = [];
  
  // Attachment viewer state
  expandedAttachment: number | null = null;

  // PDF fullscreen viewer state
  pdfFullscreenAttachment: any = null;
  showFullscreenHeader = true;
  fullscreenHeaderTimeout: any;



  lessonTypeOptions = [
    { value: 'LECTURE', label: '📖 Bài giảng', icon: 'book' },
    { value: 'ASSIGNMENT', label: '📋 Bài tập', icon: 'assignment' },
    { value: 'QUIZ', label: '❓ Trắc nghiệm', icon: 'quiz' }
  ];

  createForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    lessonType: ['LECTURE', [Validators.required]],
    content: [''], // Validation will be set dynamically based on lessonType
    videoUrl: [''],
    // Assignment-specific fields
    assignmentTitle: [''],
    assignmentDescription: [''],
    assignmentInstructions: [''],
    dueDate: [''],
    maxScore: [100],
    // Quiz-specific fields
    quizTimeLimit: [30],      // minutes
    quizMaxScore: [100],       // points
    quizMaxAttempts: [1]       // number of attempts
  });

  get isAssignmentType(): boolean {
    return this.createForm.get('lessonType')?.value === 'ASSIGNMENT';
  }

  get isQuizType(): boolean {
    return this.createForm.get('lessonType')?.value === 'QUIZ';
  }

  editForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    content: [''],
    videoUrl: ['']
  });

  constructor() {
    // Set initial validation for LECTURE (default type)
    this.createForm.get('content')?.setValidators([Validators.required]);
    
    const sectionId = this.route.snapshot.paramMap.get('sectionId')!;
    // Resolve courseId to support back navigation
    this.courseId = this.route.snapshot.paramMap.get('id')
      || this.route.parent?.snapshot.paramMap.get('id')
      || this.route.parent?.parent?.snapshot.paramMap.get('id')
      || '';
    this.lessonApi.listBySection(sectionId).subscribe({
      next: (res) => this.lessons.set(res?.data || []),
      error: (err) => this.error.set(err?.message || 'Không tải được danh sách bài học'),
      complete: () => this.loading.set(false)
    });

    // Watch lesson type changes and update field validation
    this.createForm.get('lessonType')?.valueChanges.subscribe(lessonType => {
      const contentControl = this.createForm.get('content');
      const assignmentDescriptionControl = this.createForm.get('assignmentDescription');
      
      if (lessonType === 'LECTURE') {
        // Content is required for LECTURE
        contentControl?.setValidators([Validators.required]);
        assignmentDescriptionControl?.clearValidators();
      } else if (lessonType === 'ASSIGNMENT') {
        // Content is optional for ASSIGNMENT, but assignmentDescription is required
        contentControl?.clearValidators();
        assignmentDescriptionControl?.setValidators([Validators.required]);
      } else if (lessonType === 'QUIZ') {
        // Quiz doesn't need content or assignment description
        contentControl?.clearValidators();
        assignmentDescriptionControl?.clearValidators();
      } else {
        // Other types - both optional
        contentControl?.clearValidators();
        assignmentDescriptionControl?.clearValidators();
      }
      
      contentControl?.updateValueAndValidity();
      assignmentDescriptionControl?.updateValueAndValidity();
    });

    // Add keyboard listener for ESC key to exit fullscreen
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.pdfFullscreenAttachment) {
        this.closePdfFullscreen();
      }
      // Space key to toggle header visibility in fullscreen
      if (event.key === ' ' && this.pdfFullscreenAttachment) {
        event.preventDefault();
        this.showFullscreenHeader = !this.showFullscreenHeader;
        if (this.showFullscreenHeader) {
          this.startHeaderAutoHide();
        }
      }
    });
  }

  createLesson() {
    const sectionId = this.route.snapshot.paramMap.get('sectionId')!;
    if (this.createForm.invalid) return;

    const lessonType = this.createForm.value.lessonType;

    if (lessonType === 'ASSIGNMENT') {
      // Create assignment lesson using typed payload
      const payload: CreateAssignmentLessonRequest = {
        title: this.createForm.value.title ?? '',
        content: this.createForm.value.content || undefined,
        videoUrl: this.createForm.value.videoUrl || undefined,
        assignmentTitle: this.createForm.value.assignmentTitle ?? this.createForm.value.title ?? '',
        assignmentDescription: this.createForm.value.assignmentDescription ?? '',
        assignmentInstructions: this.createForm.value.assignmentInstructions || undefined,
        dueDate: this.createForm.value.dueDate ? new Date(this.createForm.value.dueDate).toISOString() : undefined,
        maxScore: Number(this.createForm.value.maxScore) || 100
      };

      // Use assignment endpoint
      this.lessonApi.createAssignmentLesson(sectionId, payload).subscribe({
        next: (res) => {
          const l = res?.data;
          if (l) {
            this.lessons.update(list => [...list, l]);

            // Upload attachments if any
            if (this.tempAttachments.length > 0) {
              this.uploadAttachmentsToLesson(l.id);
            }

            this.createForm.reset({
              title: '',
              lessonType: 'LECTURE',
              content: '',
              videoUrl: '',
              assignmentTitle: '',
              assignmentDescription: '',
              assignmentInstructions: '',
              dueDate: '',
              maxScore: 100
            });
            this.resetAttachments();

            // Close the form after successful creation
            this.showCreateForm.set(false);
          }
        },
        error: (err) => this.opError.set(err?.message || 'Tạo bài tập thất bại')
      });
    } else if (lessonType === 'QUIZ') {
      // Create quiz lesson
      const payload: CreateLessonRequest = {
        title: this.createForm.value.title ?? '',
        lessonType: 'QUIZ',
        quizTimeLimit: Number(this.createForm.value.quizTimeLimit) || 30,
        quizMaxScore: Number(this.createForm.value.quizMaxScore) || 100,
        quizMaxAttempts: Number(this.createForm.value.quizMaxAttempts) || 1
      };

      this.lessonApi.createLesson(sectionId, payload).subscribe({
        next: (res) => {
          const l = res?.data;
          if (l) {
            this.lessons.update(list => [...list, l]);
            
            // Save quiz ID and title for Quiz Bank navigation
            this.lastCreatedQuizId.set(l.id);
            this.lastCreatedQuizTitle.set(l.title);

            this.createForm.reset({
              title: '',
              lessonType: 'LECTURE',
              content: '',
              videoUrl: '',
              assignmentTitle: '',
              assignmentDescription: '',
              assignmentInstructions: '',
              dueDate: '',
              maxScore: 100,
              quizTimeLimit: 30,
              quizMaxScore: 100,
              quizMaxAttempts: 1
            });

            // Close the form after successful creation
            this.showCreateForm.set(false);
            
            // Show success message
            this.opError.set('');
            alert(`✅ Đã tạo bài trắc nghiệm "${l.title}" thành công!\n\n💡 Click nút "➕ Thêm/Chọn câu hỏi từ Quiz Bank" để thêm câu hỏi cho quiz này.`);
          }
        },
        error: (err) => this.opError.set(err?.message || 'Tạo bài trắc nghiệm thất bại')
      });
    } else {
      // Create regular lesson (LECTURE)
      const payload: CreateLessonRequest = {
        title: this.createForm.value.title!,
        content: this.createForm.value.content || undefined,
        videoUrl: this.createForm.value.videoUrl || undefined,
        lessonType: 'LECTURE'
      };

      this.lessonApi.createLesson(sectionId, payload).subscribe({
        next: (res) => {
          const l = res?.data;
          if (l) {
            this.lessons.update(list => [...list, l]);

            // Upload attachments if any
            if (this.tempAttachments.length > 0) {
              this.uploadAttachmentsToLesson(l.id);
            }

            this.createForm.reset({
              title: '',
              lessonType: 'LECTURE',
              content: '',
              videoUrl: '',
              assignmentTitle: '',
              assignmentDescription: '',
              assignmentInstructions: '',
              dueDate: '',
              maxScore: 100
            });
            this.resetAttachments();

            // Close the form after successful creation
            this.showCreateForm.set(false);
          }
        },
        error: (err) => this.opError.set(err?.message || 'Tạo bài học thất bại')
      });
    }
  }

  startEdit(l: any) {
    this.editingId.set(l.id);
    this.editForm.patchValue({ title: l.title || '', content: l.content || '', videoUrl: l.videoUrl || '' });
  }

  cancelEdit() { this.editingId.set(null); }

  saveEdit(id: string) {
    if (this.editForm.invalid) return;
    const payload: any = {
      title: this.editForm.value.title || undefined,
      content: this.editForm.value.content || undefined,
      videoUrl: this.editForm.value.videoUrl || undefined
    };
    this.lessonApi.updateLesson(id, payload).subscribe({
      next: () => {
        this.lessons.update(list => list.map(it => it.id === id ? { ...it, ...payload } : it));
        this.cancelEdit();
      },
      error: (err) => this.opError.set(err?.message || 'Cập nhật bài học thất bại')
    });
  }

  deleteLesson(id: string) {
    const sectionId = this.route.snapshot.paramMap.get('sectionId')!;
    this.lessonApi.deleteLesson(id).subscribe({
      next: () => this.lessons.update(list => list.filter(i => i.id !== id)),
      error: (err) => this.opError.set(err?.message || 'Xóa bài học thất bại')
    });
  }

  // --- Viewer helpers ---
  viewLesson(l: any) {
    console.log('🎯 viewLesson called for:', l);
    console.log('🎥 Video URL check:', {
      raw: l?.videoUrl,
      hasValid: this.hasValidVideoUrl(l)
    });
    
    this.selected.set(l);
    
    // Only setup video embed if video URL exists and is valid
    if (this.hasValidVideoUrl(l)) {
      const url = l.videoUrl.trim();
      if (this.isYouTube(url)) {
        const embed = this.toYouTubeEmbed(url);
        this._sanitizedEmbed.set(this.sanitizer.bypassSecurityTrustResourceUrl(embed));
        console.log('✅ YouTube embed setup for:', url);
      } else {
        this._sanitizedEmbed.set(null);
        console.log('📹 Non-YouTube video URL:', url);
      }
    } else {
      // No valid video URL, clear any previous embed
      this._sanitizedEmbed.set(null);
      console.log('❌ No valid video URL, clearing embed');
    }
    
    // Load attachments for this lesson - THIS IS CRITICAL!
    console.log('📎 Loading attachments for lesson:', l.id);
    this.loadLessonAttachments(l.id);
  }

  closeViewer() {
    this.selected.set(null);
    this._sanitizedEmbed.set(null);
    this.expandedAttachment = null;
    this.closePdfFullscreen();
  }

  sanitizedEmbed() {
    return this._sanitizedEmbed();
  }

  isYouTube(url: string): boolean {
    if (!url) return false;
    try {
      const u = new URL(url);
      return u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be');
    } catch { return false; }
  }

  hasValidVideoUrl(lesson: any): boolean {
    const url = lesson?.videoUrl;
    // Check for null, undefined, empty string, or whitespace-only string
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return false;
    }
    
    // Additional check for common invalid values
    const cleanUrl = url.trim().toLowerCase();
    if (cleanUrl === 'null' || cleanUrl === 'undefined' || cleanUrl === '') {
      return false;
    }
    
    // Try to create URL to validate format
    try {
      new URL(url.trim());
      return true;
    } catch {
      return false;
    }
  }

  toYouTubeEmbed(url: string): string {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtu.be')) {
        const id = u.pathname.replace('/', '');
        return `https://www.youtube.com/embed/${id}`;
      }
      if (u.hostname.includes('youtube.com')) {
        const id = u.searchParams.get('v');
        if (id) return `https://www.youtube.com/embed/${id}`;
        // handle /shorts/ or /embed/
        const parts = u.pathname.split('/').filter(Boolean);
        const idx = parts.findIndex(p => p === 'embed' || p === 'shorts' || p === 'watch');
        if (idx >= 0 && parts[idx + 1]) return `https://www.youtube.com/embed/${parts[idx + 1]}`;
      }
    } catch {}
    return url; // fallback
  }

  // --- Document Upload Methods ---
  onDocumentUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;
    
    this.processDocumentUpload(file, this.createForm);
  }

  onDocumentUploadEdit(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;
    
    this.processDocumentUpload(file, this.editForm);
  }

  // Handle instructions document upload for assignments
  onInstructionsDocumentUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;
    
    this.processInstructionsDocumentUpload(file);
  }

  // Handle file attachments upload for edit
  onEditAttachmentsUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    
    if (!files || files.length === 0) return;

    const lesson = this.getCurrentLessonForEdit();
    if (!lesson) {
      this.opError.set('Không tìm thấy bài học để chỉnh sửa');
      return;
    }

    // Process each file
    Array.from(files).forEach(file => {
      this.uploadAttachmentForEdit(file, lesson.id);
    });

    // Clear file input
    input.value = '';
  }

  // Upload single attachment for editing lesson
  private uploadAttachmentForEdit(file: File, lessonId: string) {
    // Validate file
    const validation = this.validateAttachmentFile(file);
    if (!validation.isValid) {
      this.opError.set(validation.error || 'File không hợp lệ');
      return;
    }

    console.log('📤 Uploading attachment to lesson (edit):', lessonId, 'File:', file.name);

    // Reset states
    this.editAttachmentUploadProgress.set(null);
    this.editAttachmentUploadSuccess.set('');
    this.opError.set('');

    // Upload attachment to lesson
    this.lessonAttachmentApi.addAttachment(lessonId, file, 0).subscribe({
      next: (result) => {
        if ('progress' in result) {
          // Progress update
          this.editAttachmentUploadProgress.set(result);
        } else {
          // Upload completed
          this.editAttachmentUploadProgress.set(null);
          this.editAttachmentUploadSuccess.set(`Đã thêm: ${file.name}`);
          
          // Reload attachments for this lesson
          console.log('🔄 Reloading attachments after edit upload...');
          this.loadLessonAttachments(lessonId);
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            this.editAttachmentUploadSuccess.set('');
          }, 3000);
        }
      },
      error: (error) => {
        console.error('📤 Edit upload error:', error);
        this.editAttachmentUploadProgress.set(null);
        
        let errorMsg = `Lỗi upload: ${file.name}`;
        if (error?.status === 403) {
          errorMsg += ' - Không có quyền upload';
        } else if (error?.status === 401) {
          errorMsg += ' - Phiên đăng nhập hết hạn';
        } else {
          errorMsg += ` - ${error?.message || 'Lỗi không xác định'}`;
        }
        
        this.opError.set(errorMsg);
      }
    });
  }

  // Get current lesson being edited
  getCurrentLessonForEdit(): any {
    const editId = this.editingId();
    if (!editId) return null;
    return this.lessons().find(l => l.id === editId);
  }

  // Remove attachment from editing lesson
  removeAttachmentFromEditingLesson(attachmentId: string) {
    const lesson = this.getCurrentLessonForEdit();
    if (!lesson) return;

    this.lessonAttachmentApi.deleteAttachment(attachmentId).subscribe({
      next: () => {
        console.log('🗑️ Attachment deleted successfully');
        // Reload attachments for this lesson
        this.loadLessonAttachments(lesson.id);
      },
      error: (error) => {
        console.error('🗑️ Delete attachment error:', error);
        this.opError.set('Lỗi xóa tệp đính kèm: ' + (error?.message || 'Lỗi không xác định'));
      }
    });
  }

  private processDocumentUpload(file: File, targetForm: any) {
    // Reset states
    this.uploadProgress.set(null);
    this.uploadSuccess.set('');
    this.opError.set('');

    // Validate file
    const validation = this.documentService.validateFile(file);
    if (!validation.isValid) {
      this.opError.set(validation.error || 'Invalid file');
      return;
    }

    // Upload and process
    this.documentService.uploadDocument(file).subscribe({
      next: (result) => {
        if ('progress' in result) {
          // Progress update
          this.uploadProgress.set(result as UploadProgress);
        } else {
          // Final result
          const response = result as DocumentUploadResponse;
          if (response.success) {
            // Update form content
            targetForm.patchValue({ 
              content: response.content 
            });
            this.uploadSuccess.set(response.filename);
            this.uploadProgress.set(null);
          } else {
            this.opError.set(response.message || 'Upload failed');
            this.uploadProgress.set(null);
          }
        }
      },
      error: (error) => {
        console.error('Document upload error:', error);
        this.opError.set(error?.error?.message || 'Có lỗi xảy ra khi tải file');
        this.uploadProgress.set(null);
      }
    });
  }

  // Process instructions document upload specifically for assignments
  private processInstructionsDocumentUpload(file: File) {
    // Reset states
    this.uploadProgress.set(null);
    this.uploadSuccess.set('');
    this.opError.set('');

    // Validate file
    const validation = this.documentService.validateFile(file);
    if (!validation.isValid) {
      this.opError.set(validation.error || 'Invalid file');
      return;
    }

    // Upload and process
    this.documentService.uploadDocument(file).subscribe({
      next: (result) => {
        if ('progress' in result) {
          // Progress update
          this.uploadProgress.set(result as UploadProgress);
        } else {
          // Final result
          const response = result as DocumentUploadResponse;
          if (response.success) {
            // Update assignment instructions field specifically
            this.createForm.patchValue({ 
              assignmentInstructions: response.content 
            });
            this.uploadSuccess.set(`Đã điền hướng dẫn từ: ${response.filename}`);
            this.uploadProgress.set(null);
          } else {
            this.opError.set(response.message || 'Upload failed');
            this.uploadProgress.set(null);
          }
        }
      },
      error: (error) => {
        console.error('Instructions document upload error:', error);
        this.opError.set(error?.error?.message || 'Có lỗi xảy ra khi tải file hướng dẫn');
        this.uploadProgress.set(null);
      }
    });
  }

  // --- File Attachments Upload Methods ---
  onFileAttachmentsUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (!files || files.length === 0) return;

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      this.uploadFileAttachment(file);
    }
  }

  private uploadFileAttachment(file: File) {
    // Reset states
    this.attachmentUploadProgress.set(null);
    this.attachmentUploadSuccess.set('');
    this.opError.set('');

    // Validate file
    const validation = this.validateAttachmentFile(file);
    if (!validation.isValid) {
      this.opError.set(validation.error || 'Invalid file');
      return;
    }

    // Store file temporarily to attach to the next created lesson
    if (!this.tempAttachments) {
      this.tempAttachments = [];
    }
    this.tempAttachments.push(file);
    this.attachmentUploadSuccess.set(`Đã thêm file: ${file.name}. File sẽ được đính kèm khi tạo bài học.`);
  }

  private validateAttachmentFile(file: File): { isValid: boolean; error?: string } {
    // Check file size (100MB limit)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'File size exceeds 100MB limit'
      };
    }

    // Check file extension
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.mp4', '.avi', '.mov', '.mp3', '.wav'];
    const fileName = file.name.toLowerCase();
    const isValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

    if (!isValidExtension) {
      return {
        isValid: false,
        error: 'Only PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, MP4, AVI, MOV, MP3, WAV files are supported'
      };
    }

    return { isValid: true };
  }

  private refreshLessons() {
    const sectionId = this.route.snapshot.paramMap.get('sectionId')!;
    this.lessonApi.listBySection(sectionId).subscribe({
      next: (res) => this.lessons.set(res?.data || []),
      error: (err) => this.error.set(err?.message || 'Không tải được danh sách bài học')
    });
  }

  resetForm() {
    this.createForm.reset();
    this.uploadSuccess.set('');
    this.uploadProgress.set(null);
    this.attachmentUploadSuccess.set('');
    this.attachmentUploadProgress.set(null);
    this.opError.set('');
    this.resetAttachments();
  }

  openQuizBankInNewTab() {
    // Navigate to Quiz Bank in same tab with quiz context if available
    const quizId = this.lastCreatedQuizId();
    const quizTitle = this.lastCreatedQuizTitle();
    
    if (quizId && quizTitle) {
      // Pass quiz context via URL query params
      this.router.navigate(['/teacher/quiz-bank'], {
        queryParams: {
          quizId: quizId,
          quizTitle: quizTitle,
          returnUrl: this.router.url // Save current URL to return later
        }
      });
    } else {
      // Open without context
      this.router.navigate(['/teacher/quiz-bank']);
    }
  }

  async loadQuizQuestions(quizId: string): Promise<void> {
    try {
      this.isLoadingQuizQuestions.set(true);
      this.currentViewingQuizId.set(quizId);
      
      // Fetch real questions from API
      const questions = await firstValueFrom(this.quizApi.getQuizQuestions(quizId));
      
      // Transform to display format
      this.quizQuestions.set(questions.map((q: any) => ({
        id: q.id,
        content: q.content,
        difficulty: q.difficulty,
        tags: q.tags,
        correctOption: q.correctOption,
        options: q.options.sort((a: any, b: any) => a.displayOrder - b.displayOrder).map((opt: any) => ({
          key: opt.optionKey,
          content: opt.content
        }))
      })));
      
    } catch (error) {
      console.error('Error loading quiz questions:', error);
      this.quizQuestions.set([]);
    } finally {
      this.isLoadingQuizQuestions.set(false);
    }
  }

  openQuizBankToAddQuestions(quizId: string, quizTitle: string) {
    // Navigate to Quiz Bank to add questions to an existing quiz
    this.router.navigate(['/teacher/quiz-bank'], {
      queryParams: {
        quizId: quizId,
        quizTitle: quizTitle,
        returnUrl: this.router.url
      }
    });
  }

  toggleCreateForm() {
    this.showCreateForm.update(show => !show);
    // Reset form when opening
    if (this.showCreateForm()) {
      this.resetForm();
    }
  }

  private uploadAttachmentsToLesson(lessonId: string) {
    if (this.tempAttachments.length === 0) return;

    // Debug authentication
    const token = localStorage.getItem('access_token');
    const userStr = localStorage.getItem('lms_user');
    console.log('🔐 Debug Auth Status:', {
      hasToken: !!token,
      tokenLength: token?.length || 0,
      hasUser: !!userStr,
      user: userStr ? JSON.parse(userStr) : null
    });

    this.attachmentUploadProgress.set({
      progress: 0,
      status: 'uploading',
      message: `Uploading ${this.tempAttachments.length} attachments...`
    });

    // Upload each attachment
    let completedUploads = 0;
    const totalUploads = this.tempAttachments.length;

    this.tempAttachments.forEach((file, index) => {
      this.lessonAttachmentApi.addAttachment(lessonId, file, index).subscribe({
        next: (result) => {
          if ('progress' in result) {
            // Progress update
            this.attachmentUploadProgress.set(result);
          } else {
            // Upload completed for this file
            completedUploads++;
            const overallProgress = Math.round((completedUploads / totalUploads) * 100);
            
            if (completedUploads === totalUploads) {
              // All uploads completed
              this.attachmentUploadProgress.set(null);
              this.attachmentUploadSuccess.set(`Successfully uploaded ${totalUploads} attachments`);
            } else {
              this.attachmentUploadProgress.set({
                progress: overallProgress,
                status: 'uploading',
                message: `Uploaded ${completedUploads}/${totalUploads} attachments`
              });
            }
          }
        },
        error: (error) => {
          console.error('📤 Attachment upload error:', {
            file: file.name,
            error: error,
            status: error?.status,
            message: error?.message,
            details: error?.error
          });
          
          let errorMsg = `Lỗi upload ${file.name}`;
          if (error?.status === 403) {
            errorMsg += ': Không có quyền. Vui lòng đăng nhập với tài khoản TEACHER.';
          } else if (error?.status === 401) {
            errorMsg += ': Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
          } else {
            errorMsg += `: ${error?.message || 'Lỗi không xác định'}`;
          }
          
          this.opError.set(errorMsg);
          this.attachmentUploadProgress.set(null);
        }
      });
    });
  }

  private resetAttachments() {
    this.tempAttachments = [];
    this.attachmentUploadSuccess.set('');
    this.attachmentUploadProgress.set(null);
  }

  removeAttachment(index: number) {
    this.tempAttachments.splice(index, 1);
    if (this.tempAttachments.length === 0) {
      this.attachmentUploadSuccess.set('');
    }
  }

  getFileExtension(fileName: string): string {
    const ext = fileName.split('.').pop()?.toUpperCase() || '';
    return ext;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // File type detection methods
  isPdfFile(fileName: string): boolean {
    return fileName.toLowerCase().endsWith('.pdf');
  }

  isPresentationFile(fileName: string): boolean {
    const ext = fileName.toLowerCase();
    return ext.endsWith('.ppt') || ext.endsWith('.pptx');
  }

  isOfficeFile(fileName: string): boolean {
    const ext = fileName.toLowerCase();
    return ext.endsWith('.doc') || ext.endsWith('.docx') || 
           ext.endsWith('.xls') || ext.endsWith('.xlsx') ||
           ext.endsWith('.ppt') || ext.endsWith('.pptx');
  }

  isImageFile(fileName: string): boolean {
    const ext = fileName.toLowerCase();
    return ext.endsWith('.jpg') || ext.endsWith('.jpeg') || 
           ext.endsWith('.png') || ext.endsWith('.gif') || 
           ext.endsWith('.bmp') || ext.endsWith('.webp');
  }

  isVideoFile(fileName: string): boolean {
    const ext = fileName.toLowerCase();
    return ext.endsWith('.mp4') || ext.endsWith('.avi') || 
           ext.endsWith('.mov') || ext.endsWith('.wmv') || 
           ext.endsWith('.webm');
  }

  isAudioFile(fileName: string): boolean {
    const ext = fileName.toLowerCase();
    return ext.endsWith('.mp3') || ext.endsWith('.wav') || 
           ext.endsWith('.aac') || ext.endsWith('.ogg');
  }

  getFileTypeClass(fileName: string): string {
    if (this.isPdfFile(fileName)) return 'bg-red-100 text-red-800';
    if (this.isPresentationFile(fileName)) return 'bg-green-100 text-green-800';
    if (this.isOfficeFile(fileName)) return 'bg-blue-100 text-blue-800';
    if (this.isImageFile(fileName)) return 'bg-purple-100 text-purple-800';
    if (this.isVideoFile(fileName)) return 'bg-yellow-100 text-yellow-800';
    if (this.isAudioFile(fileName)) return 'bg-pink-100 text-pink-800';
    return 'bg-gray-100 text-gray-800';
  }

  getVideoMimeType(fileName: string): string {
    const ext = fileName.toLowerCase();
    if (ext.endsWith('.mp4')) return 'video/mp4';
    if (ext.endsWith('.webm')) return 'video/webm';
    if (ext.endsWith('.avi')) return 'video/avi';
    if (ext.endsWith('.mov')) return 'video/quicktime';
    return 'video/mp4';
  }

  getAudioMimeType(fileName: string): string {
    const ext = fileName.toLowerCase();
    if (ext.endsWith('.mp3')) return 'audio/mpeg';
    if (ext.endsWith('.wav')) return 'audio/wav';
    if (ext.endsWith('.aac')) return 'audio/aac';
    if (ext.endsWith('.ogg')) return 'audio/ogg';
    return 'audio/mpeg';
  }

  toggleAttachmentViewer(index: number) {
    const newVal = this.expandedAttachment === index ? null : index;
    this.expandedAttachment = newVal;
    if (newVal !== null && this.selected() && this.selected().attachments) {
      const attachment = this.selected().attachments[newVal];
      if (attachment && attachment.fileUrl) {
        this.prefetchAndCreateBlob(attachment.fileUrl).catch(() => {});
      }
    }
  }


  getSafeUrl(url: string): any {
    // Prefer blob-based object URLs (works around servers that forbid framing via X-Frame-Options)
    const cache = this.safeUrls();
    if (cache[url]) return cache[url];

    // If we already created a blob URL for this original URL, use it
    const existingBlob = this.blobUrlMap[url];
    if (existingBlob) {
      const safe = this.sanitizer.bypassSecurityTrustResourceUrl(existingBlob);
      this.safeUrls.set({ ...cache, [url]: safe });
      return safe;
    }

    // Fallback: return sanitized remote URL immediately, and start a background prefetch to create blob URL
    const sanitized = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.safeUrls.set({ ...cache, [url]: sanitized });
    
    // Try prefetch in background - but don't wait for it
    this.prefetchAndCreateBlob(url).catch(err => {
      console.warn('Prefetch PDF failed for', url, '- using direct URL fallback', err);
    });
    
    return sanitized;
  }

  getOfficeViewerUrl(fileUrl: string): any {
    // Use Microsoft Office Online Viewer
    const encodedUrl = encodeURIComponent(fileUrl);
    const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(viewerUrl);
  }

  /**
   * Try to fetch a remote PDF and create a blob URL so it can be embedded even if the remote site
   * sends X-Frame-Options that would block direct framing. This only works if the server allows
   * CORS (Access-Control-Allow-Origin) for the resource. If not possible, the original remote URL
   * will remain the fallback.
   */
  private async prefetchAndCreateBlob(url: string) {
    try {
      // Use fetch to get the resource as a blob. The server must allow cross-origin requests.
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const blob = await res.blob();
      // Create object URL and sanitize it
      const blobUrl = URL.createObjectURL(blob);
      this.blobUrlMap[url] = blobUrl;
      const safe = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl);
      const cache = this.safeUrls();
      this.safeUrls.set({ ...cache, [url]: safe });
    } catch (err) {
      // If CORS prevents fetching, we leave the remote URL as fallback.
      console.warn('Could not prefetch PDF as blob for', url, err);
    }
  }

  ngOnDestroy(): void {
    // Revoke any created blob URLs
    for (const k of Object.keys(this.blobUrlMap)) {
      try { URL.revokeObjectURL(this.blobUrlMap[k]); } catch {}
    }
    this.blobUrlMap = {};
  }

  openPdfFullscreen(attachment: any) {
    this.pdfFullscreenAttachment = attachment;
    // Auto-hide header after 3 seconds
    this.startHeaderAutoHide();
  }

  closePdfFullscreen() {
    // Clear auto-hide timeout
    this.clearHeaderTimeout();
    this.showFullscreenHeader = true;
    
    // Revoke blob URL associated with this attachment if we created one
    if (this.pdfFullscreenAttachment && this.pdfFullscreenAttachment.fileUrl) {
      const original = this.pdfFullscreenAttachment.fileUrl;
      const blob = this.blobUrlMap[original];
      if (blob) {
        try { URL.revokeObjectURL(blob); } catch {}
        delete this.blobUrlMap[original];
        const cache = this.safeUrls();
        delete cache[original];
        this.safeUrls.set({ ...cache });
      }
    }
    this.pdfFullscreenAttachment = null;
  }

  // Auto-hide header functionality for fullscreen PDF viewer
  startHeaderAutoHide(): void {
    this.showFullscreenHeader = true;
    this.clearHeaderTimeout();
    this.fullscreenHeaderTimeout = setTimeout(() => {
      this.showFullscreenHeader = false;
    }, 3000);
  }

  clearHeaderTimeout(): void {
    if (this.fullscreenHeaderTimeout) {
      clearTimeout(this.fullscreenHeaderTimeout);
      this.fullscreenHeaderTimeout = null;
    }
  }

  onFullscreenMouseMove(): void {
    this.startHeaderAutoHide();
  }



  removeAttachmentFromLesson(lessonId: string, attachmentId: string) {
    this.lessonAttachmentApi.deleteAttachment(attachmentId).subscribe({
      next: () => {
        // Refresh lesson attachments
        this.loadLessonAttachments(lessonId);
      },
      error: (err) => this.opError.set(err?.message || 'Xóa file đính kèm thất bại')
    });
  }

  private loadLessonAttachments(lessonId: string) {
    console.log('📎 loadLessonAttachments called for lesson:', lessonId);
    
    this.lessonAttachmentApi.getAttachments(lessonId).subscribe({
      next: (attachments) => {
        console.log('✅ Attachments loaded:', attachments);
        console.log('📊 Attachment details:', {
          count: attachments?.length || 0,
          attachments: attachments
        });
        
        // Update the selected lesson with attachments
        this.selected.update(lesson => {
          if (lesson && lesson.id === lessonId) {
            const updatedLesson = { ...lesson, attachments };
            console.log('🔄 Updated selected lesson with attachments:', updatedLesson);
            return updatedLesson;
          }
          return lesson;
        });
        
        // Also update the lesson in the lessons list for future reference
        this.lessons.update(lessonList => 
          lessonList.map(l => 
            l.id === lessonId ? { ...l, attachments } : l
          )
        );
      },
      error: (err) => {
        console.error('❌ Failed to load attachments for lesson', lessonId, ':', err);
        console.error('❌ Error details:', {
          status: err?.status,
          message: err?.message,
          error: err?.error
        });
        // Show error in UI
        this.opError.set(`Không thể tải attachments: ${err?.message || 'Lỗi không xác định'}`);
      }
    });
  }

  // Scanned Documents Methods - DEPRECATED (now using real lesson attachments)
  /*
  private loadScannedDocuments() {
    // No longer needed - using real lesson attachments
  }

  private fetchScannedDocumentsFromAPI() {
    // No longer needed - using real lesson attachments  
  }

  private loadFallbackScannedDocuments() {
    // No longer needed - using real lesson attachments
  }

  toggleScannedDocumentViewer(index: number) {
    // No longer needed - using togglePdfAttachmentViewer instead
  }

  openScannedDocumentFullscreen(doc: any) {
    // No longer needed - using openPdfAttachmentFullscreen instead
  }
  */

  // New methods for PDF attachments from lessons
  // Lesson PDF Methods (updated to use real attachments)
  getLessonPdfs(lessonId: string): any[] {
    const lesson = this.lessons().find(l => l.id === lessonId);
    if (!lesson || !lesson.attachments) return [];

    return lesson.attachments.filter((attachment: any) =>
      this.isPdfFile(attachment.originalFileName)
    );
  }

  // Assignment helper methods
  getAssignmentStatus(lesson: any): string {
    if (lesson.lessonType !== 'ASSIGNMENT' || !lesson.assignment) {
      return 'Không áp dụng';
    }
    
    const assignment = lesson.assignment;
    const now = new Date();
    const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
    
    switch (assignment.status) {
      case 'DRAFT':
        return 'Đang soạn thảo';
      case 'PUBLISHED':
        if (dueDate && now > dueDate) {
          return 'Đã hết hạn';
        }
        return 'Đang mở';
      case 'CLOSED':
        return 'Đã đóng';
      default:
        return 'Không xác định';
    }
  }

  getAssignmentDueDate(lesson: any): string | null {
    if (lesson.lessonType !== 'ASSIGNMENT' || !lesson.assignment?.dueDate) {
      return null;
    }
    
    const dueDate = new Date(lesson.assignment.dueDate);
    return dueDate.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getAssignmentMaxScore(lesson: any): number | null {
    if (lesson.lessonType !== 'ASSIGNMENT' || !lesson.assignment?.maxScore) {
      return null;
    }
    
    return lesson.assignment.maxScore;
  }

  // Get assignment submission count (for teacher)
  getAssignmentSubmissionCount(lesson: any): string {
    if (lesson.lessonType !== 'ASSIGNMENT' || !lesson.assignment) {
      return '0';
    }
    
    const submissionCount = lesson.assignment.submissionCount || 0;
    const totalStudents = lesson.assignment.totalStudents || 0;
    
    return `${submissionCount}/${totalStudents}`;
  }

  // Assignment management methods
  viewAssignmentSubmissions(lesson: any): void {
    if (lesson.lessonType !== 'ASSIGNMENT') return;
    
    // TODO: Navigate to assignment submissions page
    // this.router.navigate(['/teacher/assignments', lesson.assignment.id, 'submissions']);
    console.log('Viewing submissions for assignment:', lesson.assignment?.id);
    
    // For now, show an alert with placeholder info
    alert(`Xem bài nộp cho bài tập: ${lesson.title}\n\nTính năng này sẽ được phát triển trong phase tiếp theo.`);
  }

  toggleAssignmentStatus(lesson: any): void {
    if (lesson.lessonType !== 'ASSIGNMENT' || !lesson.assignment) return;
    
    const newStatus = lesson.assignment.status === 'PUBLISHED' ? 'CLOSED' : 'PUBLISHED';
    
    // TODO: Call API to update assignment status
    // this.lessonApi.updateAssignmentStatus(lesson.assignment.id, newStatus).subscribe({
    //   next: () => {
    //     lesson.assignment.status = newStatus;
    //   },
    //   error: (err) => this.opError.set(err?.message || 'Cập nhật trạng thái thất bại')
    // });
    
    // For now, update locally
    lesson.assignment.status = newStatus;
    console.log('Assignment status updated:', newStatus);
  }

  editAssignment(lesson: any): void {
    if (lesson.lessonType !== 'ASSIGNMENT') return;
    
    // TODO: Open assignment edit modal or navigate to edit page
    console.log('Edit assignment:', lesson.assignment?.id);
    
    // For now, show an alert
    alert(`Chỉnh sửa bài tập: ${lesson.title}\n\nTính năng này sẽ được phát triển trong phase tiếp theo.`);
  }
}
