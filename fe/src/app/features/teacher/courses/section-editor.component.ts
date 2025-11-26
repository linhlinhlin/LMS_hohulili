import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, signal, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LessonApi } from '../../../api/client/lesson.api';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { DocumentService, DocumentUploadResponse, UploadProgress } from '../../../api/client/document.service';
import { LessonAttachmentApi } from '../../../api/client/lesson-attachment.api';
import { CreateAssignmentLessonRequest } from '../../../api/types/assignment.types';
import { CreateLessonRequest } from '../../../api/types/course.types';
import { QuizApi } from '../../../api/endpoints/quiz.api';
import { QuestionApi, Question } from '../../../api/endpoints/question.api';
import { PackageApi } from '../../../api/endpoints/package.api';
import { firstValueFrom } from 'rxjs';
import { QuizEditModalComponent } from './components/quiz-edit-modal.component';

@Component({
  selector: 'app-section-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, QuizEditModalComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto p-6">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <a [routerLink]="['/teacher/courses']" class="hover:text-blue-600">Khóa học</a>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
          <a [routerLink]="['/teacher/courses', courseId, 'edit']" class="hover:text-blue-600">Chi tiết khóa học</a>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
          <span class="text-gray-900">Nội dung chương</span>
        </div>
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Nội dung chương</h1>
            <p class="text-gray-500 mt-1">Quản lý bài học và bài trắc nghiệm</p>
          </div>
          <div class="flex items-center gap-3">
            <a class="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm" 
               [routerLink]="['/teacher/courses', courseId, 'edit']">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
              </svg>
              Quay lại
            </a>
          </div>
        </div>
      </div>

      <!-- Lessons Card -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <!-- Card Header -->
        <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
            </svg>
            <span class="font-semibold text-gray-900">Danh sách bài học</span>
            <span class="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">{{ lessons().length }} bài</span>
          </div>
          <button (click)="toggleCreateForm()" 
                  class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            Thêm nội dung mới
          </button>
        </div>
        
        <!-- Empty State -->
        <div class="p-12 text-center" *ngIf="lessons().length === 0">
          <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-1">Chưa có bài học</h3>
          <p class="text-gray-500 mb-4">Bắt đầu thêm nội dung cho chương này</p>
          <button (click)="toggleCreateForm()" 
                  class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Thêm bài học đầu tiên
          </button>
        </div>
        <div class="p-6 text-red-600" *ngIf="error()">{{ error() }}</div>

        <!-- Lessons Table -->
        <div *ngIf="lessons().length > 0">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-4 text-left text-sm md:text-base font-medium text-gray-600 uppercase tracking-wider">STT</th>
                <th class="px-6 py-4 text-left text-sm md:text-base font-medium text-gray-600 uppercase tracking-wider">Tên bài học</th>
                <th class="px-6 py-4 text-left text-sm md:text-base font-medium text-gray-600 uppercase tracking-wider">Loại</th>
                <th class="px-6 py-4 text-left text-sm md:text-base font-medium text-gray-600 uppercase tracking-wider">Trạng thái</th>
                <th class="px-6 py-4 text-right text-sm md:text-base font-medium text-gray-600 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let l of lessons(); let i = index" class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {{ i + 1 }}
                </td>
                <td class="px-6 py-4">
                  <div class="font-medium text-gray-900">{{ l.title }}</div>
                  <div class="text-sm text-gray-500" *ngIf="l.description">{{ l.description | slice:0:100 }}{{ l.description?.length > 100 ? '...' : '' }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex px-2 py-1 text-xs font-semibold leading-5"
                        [ngClass]="{
                          'bg-blue-100 text-blue-800': !l.lessonType || l.lessonType === 'LECTURE',
                          'bg-green-100 text-green-800': l.lessonType === 'ASSIGNMENT',
                          'bg-purple-100 text-purple-800': l.lessonType === 'QUIZ'
                        }">
                    <ng-container *ngIf="l.lessonType === 'ASSIGNMENT'">Bài tập</ng-container>
                    <ng-container *ngIf="!l.lessonType || l.lessonType === 'LECTURE'">Bài học</ng-container>
                    <ng-container *ngIf="l.lessonType === 'QUIZ'">Trắc nghiệm</ng-container>
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex px-2 py-1 text-xs font-semibold leading-5 bg-green-100 text-green-800">
                    Đã xuất bản
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="inline-flex items-center gap-2">
                    <!-- View button - for all lesson types -->
                    <button (click)="viewLesson(l)"
                            class="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors flex items-center gap-1.5 border border-blue-200">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                      </svg>
                      Xem
                    </button>
                    
                    <!-- Quiz-specific: Try quiz button -->
                    <button *ngIf="l.lessonType === 'QUIZ'"
                            (click)="previewQuizLesson(l)"
                            class="px-3 py-1.5 text-sm bg-purple-50 text-purple-600 rounded hover:bg-purple-100 transition-colors flex items-center gap-1.5 border border-purple-200">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      Thử làm
                    </button>
                    
                    <!-- Regular edit button for non-quiz lessons -->
                    <button *ngIf="l.lessonType !== 'QUIZ'" 
                            (click)="startEdit(l)"
                            class="px-3 py-1.5 text-sm bg-gray-50 text-gray-600 rounded hover:bg-gray-100 transition-colors flex items-center gap-1.5 border border-gray-200">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                      </svg>
                      Sửa
                    </button>
                    
                    <!-- Delete button - for all lesson types -->
                    <button (click)="confirmDeleteLesson(l)"
                            class="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors flex items-center gap-1.5 border border-red-200">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Video viewer -->
      <div class="bg-white border shadow p-6 mt-6" *ngIf="selected() as s">
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

          <!-- QUIZ Content - Professional Coursera Style -->
          <ng-container *ngIf="s.lessonType === 'QUIZ'">
            <div class="space-y-6">
              <!-- Quiz Header -->
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold text-gray-900">Thông tin bài trắc nghiệm</h3>
                <button (click)="previewQuizLesson(s)"
                        class="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Xem trước Quiz
                </button>
              </div>

              <!-- Quiz Stats Cards -->
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-sm text-gray-500">Thời gian</p>
                      <p class="text-2xl font-bold text-blue-600 mt-1">{{ s.quizTimeLimit || 30 }}</p>
                      <p class="text-xs text-gray-400">phút</p>
                    </div>
                    <div class="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                  </div>
                </div>
                <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-sm text-gray-500">Điểm đạt</p>
                      <p class="text-2xl font-bold text-green-600 mt-1">{{ s.quizMaxScore || 60 }}%</p>
                      <p class="text-xs text-gray-400">tối thiểu</p>
                    </div>
                    <div class="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                  </div>
                </div>
                <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-sm text-gray-500">Số lần làm</p>
                      <p class="text-2xl font-bold text-orange-600 mt-1">{{ s.quizMaxAttempts || 1 }}</p>
                      <p class="text-xs text-gray-400">lần tối đa</p>
                    </div>
                    <div class="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                      <svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                      </svg>
                    </div>
                  </div>
                </div>
                <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-sm text-gray-500">Câu hỏi</p>
                      <p class="text-2xl font-bold text-purple-600 mt-1">{{ quizQuestions().length }}</p>
                      <p class="text-xs text-gray-400">câu</p>
                    </div>
                    <div class="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                      <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Questions Section -->
              <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <!-- Header -->
                <div class="px-6 py-4 bg-gray-50 border-b flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                    </svg>
                    <span class="font-medium text-gray-900">Danh sách câu hỏi</span>
                    <span class="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">{{ quizQuestions().length }} câu</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <button (click)="loadQuizQuestions(s.id)" 
                            class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                            title="Làm mới">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                      </svg>
                    </button>
                    <button (click)="openAddQuestionsModal(s.id)"
                            class="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center gap-2">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                      </svg>
                      Thêm câu hỏi
                    </button>
                  </div>
                </div>

                <!-- Loading -->
                <div *ngIf="quizQuestionsLoading()" class="p-8 text-center">
                  <div class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                  <p class="text-gray-500">Đang tải câu hỏi...</p>
                </div>

                <!-- Empty State -->
                <div *ngIf="!quizQuestionsLoading() && quizQuestions().length === 0" class="p-8">
                  <div class="text-center">
                    <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                    <h4 class="text-lg font-medium text-gray-900 mb-1">Chưa có câu hỏi</h4>
                    <p class="text-gray-500 text-sm mb-4">Thêm câu hỏi từ ngân hàng câu hỏi để bắt đầu</p>
                    <button (click)="openAddQuestionsModal(s.id)"
                            class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                      </svg>
                      Thêm câu hỏi
                    </button>
                  </div>
                </div>

                <!-- Questions List -->
                <div *ngIf="!quizQuestionsLoading() && quizQuestions().length > 0" class="divide-y divide-gray-100">
                  <div *ngFor="let q of quizQuestions(); let i = index" 
                       class="p-4 hover:bg-gray-50 transition-colors">
                    <div class="flex items-start gap-4">
                      <!-- Number Badge -->
                      <div class="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
                        {{ i + 1 }}
                      </div>
                      
                      <!-- Content -->
                      <div class="flex-1 min-w-0">
                        <p class="text-gray-900 mb-3">{{ q.content }}</p>
                        
                        <!-- Options Grid -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div *ngFor="let opt of q.options" 
                               class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                               [class.bg-green-50]="(opt.key || opt.optionKey) === q.correctOption"
                               [class.border-green-200]="(opt.key || opt.optionKey) === q.correctOption"
                               [class.border]="(opt.key || opt.optionKey) === q.correctOption"
                               [class.text-green-800]="(opt.key || opt.optionKey) === q.correctOption"
                               [class.bg-gray-50]="(opt.key || opt.optionKey) !== q.correctOption"
                               [class.text-gray-700]="(opt.key || opt.optionKey) !== q.correctOption">
                            <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                                  [class.bg-green-200]="(opt.key || opt.optionKey) === q.correctOption"
                                  [class.text-green-800]="(opt.key || opt.optionKey) === q.correctOption"
                                  [class.bg-gray-200]="(opt.key || opt.optionKey) !== q.correctOption"
                                  [class.text-gray-600]="(opt.key || opt.optionKey) !== q.correctOption">
                              {{ opt.key || opt.optionKey }}
                            </span>
                            <span class="flex-1">{{ opt.content }}</span>
                            <svg *ngIf="(opt.key || opt.optionKey) === q.correctOption" class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                            </svg>
                          </div>
                        </div>

                        <!-- Meta Tags -->
                        <div class="flex items-center gap-3 mt-3">
                          <span class="px-2 py-1 rounded-full text-xs font-medium"
                                [class.bg-green-100]="q.difficulty === 'EASY'"
                                [class.text-green-700]="q.difficulty === 'EASY'"
                                [class.bg-yellow-100]="q.difficulty === 'MEDIUM'"
                                [class.text-yellow-700]="q.difficulty === 'MEDIUM'"
                                [class.bg-red-100]="q.difficulty === 'HARD'"
                                [class.text-red-700]="q.difficulty === 'HARD'">
                            {{ q.difficulty === 'EASY' ? 'Dễ' : q.difficulty === 'MEDIUM' ? 'Trung bình' : 'Khó' }}
                          </span>
                          <span *ngIf="q.tags" class="text-xs text-gray-500">{{ q.tags }}</span>
                        </div>
                      </div>

                      <!-- Actions -->
                      <div class="flex-shrink-0 flex items-center gap-1">
                        <button (click)="removeQuestionFromQuiz(s.id, q.id)" 
                                class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                                title="Xóa khỏi quiz">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                          </svg>
                        </button>
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
                <!-- PDF Viewer - Simple như professional-learning -->
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
                      <button class="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
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

      <!-- Create New Lesson Form - Professional Style -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 mt-6 overflow-hidden" *ngIf="showCreateForm()">
        <!-- Header -->
        <div class="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-white">Thêm nội dung mới</h3>
              <p class="text-sm text-blue-100">Tạo bài học, bài tập hoặc bài trắc nghiệm</p>
            </div>
          </div>
          <button (click)="toggleCreateForm()" class="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Form Content -->
        <form [formGroup]="createForm" class="p-6 space-y-6">
          <!-- Basic Info -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="md:col-span-1">
              <label class="block text-sm font-medium text-gray-700 mb-2">Loại nội dung</label>
              <select class="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" formControlName="lessonType">
                <option *ngFor="let option of lessonTypeOptions" [value]="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-2">Tiêu đề</label>
              <input class="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                     formControlName="title" 
                     placeholder="Nhập tiêu đề bài học" />
            </div>
          </div>
          
          <!-- Video URL - Only for LECTURE type -->
          <div *ngIf="!isAssignmentType && !isQuizType">
            <label class="block text-sm font-medium text-gray-700 mb-2">URL Video (tùy chọn)</label>
            <input class="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                   formControlName="videoUrl" 
                   placeholder="https://youtube.com/watch?v=..." />
          </div>

          <!-- Assignment-specific fields (conditional) -->
          <div *ngIf="isAssignmentType" class="bg-blue-50 rounded-xl p-5 border border-blue-200">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                </svg>
              </div>
              <h4 class="font-semibold text-blue-800">Thông tin bài tập</h4>
            </div>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-blue-700 mb-2">Mô tả bài tập</label>
                <textarea class="w-full border border-blue-200 rounded-lg px-4 py-3 min-h-[80px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" 
                          formControlName="assignmentDescription" 
                          placeholder="Mô tả ngắn gọn về bài tập..."></textarea>
              </div>
              <div>
                <label class="block text-sm font-medium text-blue-700 mb-2">Hướng dẫn chi tiết</label>
                <textarea class="w-full border border-blue-200 rounded-lg px-4 py-3 min-h-[80px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" 
                          formControlName="assignmentInstructions" 
                          placeholder="Hướng dẫn chi tiết cho học viên..."></textarea>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-blue-700 mb-2">Ngày hết hạn</label>
                  <input type="datetime-local" 
                         class="w-full border border-blue-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" 
                         formControlName="dueDate" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-blue-700 mb-2">Điểm tối đa</label>
                  <input type="number" 
                         class="w-full border border-blue-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" 
                         formControlName="maxScore" 
                         placeholder="100" />
                </div>
              </div>
            </div>
          </div>

          <!-- File Attachments Section - Hidden for Quiz type -->
          <div *ngIf="!isQuizType" class="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
                </svg>
              </div>
              <div>
                <h4 class="font-semibold text-gray-800" *ngIf="!isAssignmentType">File đính kèm</h4>
                <h4 class="font-semibold text-gray-800" *ngIf="isAssignmentType">File đính kèm & Template</h4>
                <p class="text-xs text-gray-500" *ngIf="!isAssignmentType">PDF, Word, Excel, PowerPoint, Video, Audio</p>
                <p class="text-xs text-gray-500" *ngIf="isAssignmentType">Mẫu/template cho sinh viên tham khảo</p>
              </div>
            </div>
            <div class="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white hover:border-blue-400 transition-colors">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.mp4,.avi,.mov,.mp3,.wav,.zip,.rar"
                multiple
                (change)="onFileAttachmentsUpload($event)"
                class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
            </div>
            <p class="text-xs text-gray-500 mt-2">
              <span *ngIf="!isAssignmentType">Hỗ trợ: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, MP4, AVI, MOV, MP3, WAV (tối đa 100MB/file)</span>
              <span *ngIf="isAssignmentType">Hỗ trợ: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, MP4, AVI, MOV, MP3, WAV, ZIP, RAR (tối đa 100MB/file)</span>
            </p>

            <!-- Upload Progress -->
            <div *ngIf="attachmentUploadProgress()" class="mt-4 bg-white rounded-lg p-3 border border-gray-200">
              <div class="flex items-center justify-between text-sm mb-2">
                <span class="text-blue-600 font-medium">{{ attachmentUploadProgress()?.message }}</span>
                <span class="text-blue-600 font-medium">{{ attachmentUploadProgress()?.progress }}%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                     [style.width.%]="attachmentUploadProgress()?.progress"></div>
              </div>
            </div>

            <!-- Upload Success Message -->
            <div *ngIf="attachmentUploadSuccess()" class="mt-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm flex items-center gap-2">
              <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
              </svg>
              {{ attachmentUploadSuccess() }}
            </div>

            <!-- Selected Attachments List -->
            <div *ngIf="tempAttachments.length > 0" class="mt-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-700">File đã chọn</span>
                <span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{{ tempAttachments.length }} file</span>
              </div>
              <div class="space-y-2">
                <div *ngFor="let file of tempAttachments; let i = index" 
                     class="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                  <div class="flex items-center gap-3">
                    <div class="text-xs px-2 py-1 rounded font-medium" [class]="getFileTypeClass(file.name)">
                      {{ getFileExtension(file.name) }}
                    </div>
                    <div>
                      <span class="text-sm font-medium text-gray-900">{{ file.name }}</span>
                      <span class="text-xs text-gray-500 ml-2">({{ formatFileSize(file.size) }})</span>
                    </div>
                  </div>
                  <button type="button" 
                          (click)="removeAttachment(i)" 
                          class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Assignment Instructions Document Upload -->
          <div *ngIf="isAssignmentType" class="bg-green-50 rounded-xl p-5 border border-green-200">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <div>
                <h4 class="font-semibold text-green-800">Tải file Word</h4>
                <p class="text-xs text-green-600">Tự động điền hướng dẫn chi tiết</p>
              </div>
            </div>
            <div class="border-2 border-dashed border-green-300 rounded-lg p-4 bg-white hover:border-green-400 transition-colors">
              <input
                type="file"
                accept=".doc,.docx"
                (change)="onInstructionsDocumentUpload($event)"
                class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer"
              />
            </div>
            <p class="text-xs text-green-600 mt-2">.doc, .docx (tối đa 10MB) - Nội dung sẽ được điền vào "Hướng dẫn chi tiết"</p>

            <!-- Upload Progress -->
            <div *ngIf="uploadProgress()" class="mt-4 bg-white rounded-lg p-3 border border-green-200">
              <div class="flex items-center justify-between text-sm mb-2">
                <span class="text-green-600 font-medium">{{ uploadProgress()?.message }}</span>
                <span class="text-green-600 font-medium">{{ uploadProgress()?.progress }}%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-green-600 h-2 rounded-full transition-all duration-300"
                     [style.width.%]="uploadProgress()?.progress"></div>
              </div>
            </div>

            <!-- Upload Success Message -->
            <div *ngIf="uploadSuccess()" class="mt-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm flex items-center gap-2">
              <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
              </svg>
              Đã tải và xử lý file thành công: <strong class="ml-1">{{ uploadSuccess() }}</strong>
            </div>
          </div>

          <!-- Content Document Upload - Only for LECTURE type -->
          <div *ngIf="createForm.get('lessonType')?.value === 'LECTURE'" class="bg-blue-50 rounded-xl p-5 border border-blue-200">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <div>
                <h4 class="font-semibold text-blue-800">Tải file Word</h4>
                <p class="text-xs text-blue-600">Tự động điền nội dung bài học</p>
              </div>
            </div>
            <div class="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-white hover:border-blue-400 transition-colors">
              <input
                type="file"
                accept=".doc,.docx"
                (change)="onDocumentUpload($event)"
                class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
            </div>
            <p class="text-xs text-blue-600 mt-2">.doc, .docx (tối đa 10MB) - Nội dung sẽ được điền vào "Nội dung bài học"</p>
            
            <!-- Upload Progress -->
            <div *ngIf="uploadProgress()" class="mt-4 bg-white rounded-lg p-3 border border-blue-200">
              <div class="flex items-center justify-between text-sm mb-2">
                <span class="text-blue-600 font-medium">{{ uploadProgress()?.message }}</span>
                <span class="text-blue-600 font-medium">{{ uploadProgress()?.progress }}%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                     [style.width.%]="uploadProgress()?.progress"></div>
              </div>
            </div>
          </div>

          <!-- Content Textarea - Only for LECTURE type -->
          <div *ngIf="createForm.get('lessonType')?.value === 'LECTURE'">
            <label class="block text-sm font-medium text-gray-700 mb-2">Nội dung bài học</label>
            <textarea 
              class="w-full border border-gray-300 rounded-lg px-4 py-3 min-h-[200px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
              formControlName="content" 
              placeholder="Nhập nội dung bài học hoặc tải file .doc/.docx ở trên để tự động điền...">
            </textarea>
          </div>

<<<<<<< HEAD
          <!-- Quiz Configuration Section - Simplified -->
          <div *ngIf="isQuizType" class="border-2 border-purple-300 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 overflow-hidden">
            <!-- Header -->
            <div class="bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-3">
              <h3 class="text-white font-semibold flex items-center gap-2">
                <span class="text-xl">🎯</span>
                Cấu hình bài trắc nghiệm
              </h3>
            </div>
            
            <div class="p-5 space-y-5">
              <!-- Basic Settings Grid -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-white rounded-lg p-4 shadow-sm">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    <span class="text-purple-600">⏱️</span> Thời gian (phút)
                  </label>
                  <input type="number" formControlName="quizTimeLimit" 
                         class="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 text-base focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-all" 
                         placeholder="30" min="1" />
                  <p class="text-xs text-gray-500 mt-1">Để trống = không giới hạn</p>
                </div>

                <div class="bg-white rounded-lg p-4 shadow-sm">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    <span class="text-green-600">🎯</span> Điểm tối đa
                  </label>
                  <input type="number" formControlName="quizMaxScore" 
                         class="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 text-base focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-all" 
                         placeholder="100" min="1" />
                </div>

                <div class="bg-white rounded-lg p-4 shadow-sm">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    <span class="text-orange-600">🔄</span> Số lần làm tối đa
                  </label>
                  <input type="number" formControlName="quizMaxAttempts" 
                         class="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 text-base focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-all" 
                         placeholder="1" min="1" />
                </div>
              </div>

              <!-- Question Selection Section -->
              <div class="bg-white rounded-xl p-5 shadow-sm border border-purple-100">
                <div class="flex items-center justify-between mb-4">
                  <h4 class="font-semibold text-gray-900 flex items-center gap-2">
                    <span class="text-xl">📦</span>
                    Chọn câu hỏi từ Quiz Bank
                  </h4>
                  <span class="text-sm text-purple-600 font-medium bg-purple-100 px-3 py-1 rounded-full">
                    {{ selectedQuizQuestions().length }} câu đã chọn
                  </span>
                </div>

                <!-- Package Selector -->
                <div class="mb-4">
                  <label class="block text-sm font-medium text-gray-700 mb-2">Chọn gói câu hỏi:</label>
                  <div class="flex gap-2">
                    <select [value]="quizPackageId" 
                            (change)="onQuizPackageChange($any($event.target).value)"
                            class="flex-1 border-2 border-gray-200 rounded-lg px-4 py-2.5 text-base focus:border-purple-500 focus:outline-none bg-white">
                      <option value="">-- Chọn gói câu hỏi --</option>
                      <option *ngFor="let pkg of quizPackages()" [value]="pkg.id">
                        {{ pkg.name }} ({{ pkg.questionCount }} câu)
                      </option>
                    </select>
                    <button type="button" (click)="loadQuizPackages()" 
                            class="px-3 py-2 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            title="Làm mới">
                      🔄
                    </button>
                  </div>
                </div>

                <!-- Questions List -->
                <div *ngIf="quizPackageQuestions().length > 0" class="border border-gray-200 rounded-lg overflow-hidden">
                  <div class="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                    <span class="text-sm font-medium text-gray-700">
                      {{ quizPackageQuestions().length }} câu hỏi có sẵn
                    </span>
                    <div class="flex gap-2">
                      <button type="button" (click)="selectAllQuizQuestions()" 
                              class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                        Chọn tất cả
                      </button>
                      <button type="button" (click)="clearQuizQuestionSelection()" 
                              class="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                        Bỏ chọn
                      </button>
                    </div>
                  </div>
                  
                  <div class="max-h-48 overflow-y-auto">
                    <div *ngFor="let q of quizPackageQuestions(); let i = index" 
                         class="flex items-start gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-purple-50 cursor-pointer transition-colors"
                         (click)="toggleQuizQuestion(q.id)">
                      <input type="checkbox" 
                             [checked]="isQuizQuestionSelected(q.id)"
                             (click)="$event.stopPropagation()"
                             (change)="toggleQuizQuestion(q.id)"
                             class="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-purple-500">
                      <div class="flex-1 min-w-0">
                        <p class="text-sm text-gray-900 line-clamp-2">{{ i + 1 }}. {{ q.content }}</p>
                        <div class="flex gap-2 mt-1">
                          <span class="text-xs px-2 py-0.5 rounded-full"
                                [class]="q.difficulty === 'EASY' ? 'bg-green-100 text-green-700' : 
                                         q.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' : 
                                         'bg-red-100 text-red-700'">
                            {{ q.difficulty === 'EASY' ? 'Dễ' : q.difficulty === 'MEDIUM' ? 'TB' : 'Khó' }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Empty State -->
                <div *ngIf="quizPackageId && quizPackageQuestions().length === 0" 
                     class="text-center py-8 text-gray-500">
                  <span class="text-4xl mb-2 block">📭</span>
                  <p>Gói này chưa có câu hỏi nào</p>
                </div>

                <!-- No Package Selected -->
                <div *ngIf="!quizPackageId" class="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <span class="text-4xl mb-2 block">📦</span>
                  <p class="text-gray-600 mb-2">Chọn gói câu hỏi để bắt đầu</p>
                  <p class="text-sm text-gray-400">Hoặc tạo gói mới trong Quiz Bank</p>
                </div>

                <!-- Quick Link to Quiz Bank -->
                <div class="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <p class="text-sm text-gray-500">
                    💡 Cần thêm câu hỏi mới?
                  </p>
                  <button type="button" (click)="openQuizBankInNewTab()"
                          class="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
                    Mở Quiz Bank
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                    </svg>
                  </button>
                </div>
=======
          <!-- Quiz Configuration Section -->
          <div *ngIf="isQuizType" class="border-2 border-dashed border-purple-300 rounded-lg p-6 bg-purple-50 space-y-4">
            <div class="flex items-start gap-3">
              <span class="text-3xl">🚀</span>
              <div class="flex-1">
                <div class="text-base font-semibold text-purple-800 mb-2">Thiết lập bài trắc nghiệm</div>
                <p class="text-sm text-purple-700 mb-4">
                  Sau khi tạo bài học, bạn sẽ được chuyển đến trang thiết lập chi tiết để:
                </p>
                <ul class="list-disc list-inside text-sm text-purple-700 space-y-1 ml-2">
                  <li>Cấu hình thời gian, điểm số, số lần làm bài.</li>
                  <li>Chọn câu hỏi từ ngân hàng câu hỏi.</li>
                  <li>Xem trước bài kiểm tra.</li>
                </ul>
>>>>>>> 9ca6de4b665424150c4b065bf0ee346fc8478961
              </div>
            </div>
          </div>

          <!-- Error Message -->
          <div *ngIf="opError()" class="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
            <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
            </svg>
            {{ opError() }}
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" 
                    (click)="resetForm()"
                    class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Xóa form
            </button>
            <button type="button" 
                    (click)="toggleCreateForm()"
                    class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Hủy
            </button>
            <button type="button" 
                    [disabled]="createForm.invalid || uploadProgress() || isCreating()" 
                    (click)="createLesson()"
                    class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              @if (isCreating()) {
                <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang tạo...
              } @else {
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                {{ isAssignmentType ? 'Tạo bài tập' : isQuizType ? 'Tạo bài trắc nghiệm' : 'Tạo bài học' }}
              }
            </button>
          </div>
        </div>
      </div>

      <!-- Edit Lesson Panel - Professional Style -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 mt-6 overflow-hidden" *ngIf="editingId() as id">
        <!-- Header -->
        <div class="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Chỉnh sửa bài học</h3>
              <p class="text-sm text-gray-500">Cập nhật thông tin và nội dung bài học</p>
            </div>
          </div>
          <button (click)="cancelEdit()" class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Form Content -->
        <form [formGroup]="editForm" class="p-6 space-y-6">
          <!-- Basic Info -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Tiêu đề bài học</label>
              <input class="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                     formControlName="title" 
                     placeholder="Nhập tiêu đề bài học" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">URL Video (tùy chọn)</label>
              <input class="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                     formControlName="videoUrl" 
                     placeholder="https://youtube.com/watch?v=..." />
            </div>
          </div>

          <!-- Document Upload for Edit -->
          <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div class="flex items-center gap-2 mb-3">
              <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <span class="text-sm font-medium text-gray-700">Tải file Word để thay thế nội dung</span>
            </div>
            <input 
              type="file" 
              accept=".doc,.docx"
              (change)="onDocumentUploadEdit($event)"
              class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
          </div>

          <!-- File Attachments Management for Edit -->
          <div class="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div class="flex items-center gap-2 mb-3">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
              </svg>
              <span class="text-sm font-medium text-blue-800">Quản lý tệp đính kèm</span>
            </div>
            
            <!-- Add New Attachments -->
            <div class="mb-4">
              <label class="block text-xs text-blue-700 mb-2">Thêm tệp đính kèm mới:</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.mp4,.avi,.mov,.mp3,.wav"
                multiple
                (change)="onEditAttachmentsUpload($event)"
                class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-white file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
              <p class="text-xs text-blue-600 mt-1">PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, MP4, AVI, MOV, MP3, WAV (tối đa 100MB/file)</p>
            </div>

            <!-- Upload Progress for Edit -->
            <div *ngIf="editAttachmentUploadProgress()" class="mb-4 bg-white rounded-lg p-3">
              <div class="flex items-center justify-between text-sm mb-2">
                <span class="text-blue-600 font-medium">{{ editAttachmentUploadProgress()?.message }}</span>
                <span class="text-blue-600">{{ editAttachmentUploadProgress()?.progress }}%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                     [style.width.%]="editAttachmentUploadProgress()?.progress"></div>
              </div>
            </div>

            <!-- Upload Success Message for Edit -->
            <div *ngIf="editAttachmentUploadSuccess()" class="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm flex items-center gap-2">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
              </svg>
              {{ editAttachmentUploadSuccess() }}
            </div>

            <!-- Current Attachments List -->
            <div *ngIf="getCurrentLessonForEdit()?.attachments?.length > 0">
              <label class="block text-xs text-blue-700 mb-2">Tệp đính kèm hiện có ({{ getCurrentLessonForEdit()?.attachments?.length }}):</label>
              <div class="space-y-2">
                <div *ngFor="let attachment of getCurrentLessonForEdit()?.attachments; let i = index" 
                     class="flex items-center justify-between bg-white p-3 rounded-lg border border-blue-100">
                  <div class="flex items-center gap-3">
                    <div class="text-xs px-2 py-1 rounded font-medium" 
                         [class]="getFileTypeClass(attachment.originalFileName)">
                      {{ getFileExtension(attachment.originalFileName) }}
                    </div>
                    <div>
                      <div class="font-medium text-gray-900 text-sm">{{ attachment.originalFileName }}</div>
                      <div class="text-xs text-gray-500">{{ formatFileSize(attachment.fileSize) }}</div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <a [href]="attachment.fileUrl" target="_blank" 
                       class="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors">
                      Xem
                    </a>
                    <button type="button" 
                            class="px-3 py-1.5 bg-red-50 text-red-600 text-xs rounded-lg hover:bg-red-100 border border-red-200 transition-colors" 
                            (click)="removeAttachmentFromEditingLesson(attachment.id)">
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Content Textarea -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Nội dung bài học</label>
            <textarea class="w-full border border-gray-300 rounded-lg px-4 py-3 min-h-[200px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                      formControlName="content" 
                      placeholder="Nhập nội dung bài học..."></textarea>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" 
                    (click)="cancelEdit()"
                    class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Hủy
            </button>
            <button type="button" 
                    (click)="saveEdit(id)"
                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Quiz Preview Modal -->
    @if (showQuizPreview()) {
      <div class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        <div class="flex items-start justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" (click)="closeQuizPreview()"></div>

          <div class="inline-block align-top bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
            <!-- Header -->
            <div class="bg-indigo-600 px-6 py-4">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-medium text-white">
                  Xem trước: {{ previewQuizTitle() }}
                </h3>
                <button (click)="closeQuizPreview()" class="text-indigo-200 hover:text-white">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
              <p class="text-indigo-200 text-sm mt-1">
                Đây là giao diện mà học viên sẽ thấy khi làm quiz
              </p>
            </div>

            <!-- Quiz Content -->
            <div class="bg-white px-6 py-6 max-h-96 overflow-y-auto">
              <div class="space-y-8">
                @for (question of previewQuestions(); track question.id; let idx = $index) {
                  <div class="border border-gray-200 rounded-lg p-6">
                    <!-- Question Header -->
                    <div class="flex items-start gap-4 mb-4">
                      <div class="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-semibold">
                        {{ question.questionNumber }}
                      </div>
                      <div class="flex-1">
                        <h4 class="text-lg font-medium text-gray-900">{{ question.content }}</h4>
                      </div>
                    </div>

                    <!-- Options -->
                    <div class="ml-12 space-y-3">
                      @for (option of question.options; track option.optionKey) {
                        <label class="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                               [class.border-indigo-500]="question.selectedAnswer === option.optionKey"
                               [class.bg-indigo-50]="question.selectedAnswer === option.optionKey">
                          <input type="radio" 
                                 [name]="'preview-q-' + question.id"
                                 [value]="option.optionKey"
                                 [checked]="question.selectedAnswer === option.optionKey"
                                 (change)="selectPreviewAnswer(question.id, option.optionKey)"
                                 class="mt-0.5 h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500">
                          <div class="flex-1">
                            <div class="flex items-center gap-2">
                              <span class="font-medium text-gray-900">{{ option.optionKey }}.</span>
                              <span class="text-gray-700">{{ option.content }}</span>
                            </div>
                          </div>
                        </label>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Footer -->
            <div class="bg-gray-50 px-6 py-4 flex justify-between items-center">
              <div class="text-sm text-gray-600">
                Tổng {{ previewQuestions().length }} câu hỏi
              </div>
              <div class="flex gap-3">
                <button (click)="closeQuizPreview()" 
                        class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Đóng
                </button>
                <button class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                  Xem kết quả
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Delete Confirmation Modal -->
    @if (showDeleteModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center" aria-labelledby="delete-modal-title" role="dialog" aria-modal="true">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" (click)="cancelDelete()"></div>
        
        <!-- Modal Panel -->
        <div class="relative z-10 bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full mx-4">
            <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div class="sm:flex sm:items-start">
                <!-- Warning Icon -->
                <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <!-- Content -->
                <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 class="text-lg leading-6 font-medium text-gray-900" id="delete-modal-title">
                    Xóa {{ lessonToDelete()?.lessonType === 'QUIZ' ? 'bài trắc nghiệm' : lessonToDelete()?.lessonType === 'ASSIGNMENT' ? 'bài tập' : 'bài học' }}
                  </h3>
                  <div class="mt-2">
                    <p class="text-sm text-gray-500">
                      Bạn có chắc muốn xóa <span class="font-semibold text-gray-700">"{{ lessonToDelete()?.title }}"</span>?
                    </p>
                    <p class="text-sm text-red-600 mt-2">
                      ⚠️ {{ getDeleteWarningMessage() }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <!-- Actions -->
            <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
              <button type="button" 
                      (click)="executeDelete()"
                      [disabled]="isDeleting()"
                      class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                @if (isDeleting()) {
                  <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang xóa...
                } @else {
                  Xóa
                }
              </button>
              <button type="button" 
                      (click)="cancelDelete()"
                      [disabled]="isDeleting()"
                      class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50">
                Hủy
              </button>
            </div>
          </div>
        </div>
    }

    <!-- Quiz Edit Modal -->
    <app-quiz-edit-modal
      (saved)="onQuizSettingsSaved()"
      (closed)="onQuizEditModalClosed()">
    </app-quiz-edit-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SectionEditorComponent implements OnDestroy {

  @ViewChild(QuizEditModalComponent) quizEditModal!: QuizEditModalComponent;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private lessonApi = inject(LessonApi);
  private lessonAttachmentApi = inject(LessonAttachmentApi);
  private fb = inject(FormBuilder);
  private sanitizer = inject(DomSanitizer);
  private documentService = inject(DocumentService);
  private quizApi = inject(QuizApi);
  private questionApi = inject(QuestionApi);

  courseId: string = '';
  sectionId: string = '';
  lessons = signal<any[]>([]);
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

  // Router subscription for detecting navigation back
  private routerSubscription: Subscription | null = null;

  // Quiz viewer data
  currentViewingQuizId = signal<string | null>(null);
  quizQuestions = signal<any[]>([]);
  quizQuestionsLoading = signal<boolean>(false);

  // Quiz preview data
  showQuizPreview = signal<boolean>(false);
  previewQuizId = signal<string | null>(null);
  previewQuizTitle = signal<string>('');
  previewQuestions = signal<any[]>([]);

  // Course questions data
  courseQuestions = signal<Question[]>([]);
  courseQuestionsError = signal<string>('');

  // Selected questions for bulk addition
  selectedQuestionIds = signal<Set<string>>(new Set());

  // Quiz creation - Package and Question selection
  quizPackages = signal<any[]>([]);
  quizPackageId = '';
  quizPackageQuestions = signal<any[]>([]);
  selectedQuizQuestions = signal<string[]>([]);

  // Inline add questions to existing quiz
  inlinePackageId = '';
  inlinePackageQuestions = signal<any[]>([]);
  selectedInlineQuestions = signal<string[]>([]);
  addingInlineQuestions = signal<boolean>(false);

  // Temporary storage for attachments before lesson creation
  tempAttachments: File[] = [];

  // Attachment viewer state
  expandedAttachment: number | null = null;

  // PDF fullscreen viewer state
  pdfFullscreenAttachment: any = null;
  showFullscreenHeader = true;
  fullscreenHeaderTimeout: any;

  // Delete confirmation modal state
  showDeleteModal = signal<boolean>(false);
  lessonToDelete = signal<any>(null);
  isDeleting = signal<boolean>(false);

  // Create lesson state - prevent double-click
  isCreating = signal<boolean>(false);



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

    this.sectionId = this.route.snapshot.paramMap.get('sectionId')!;
    // Resolve courseId to support back navigation
    this.courseId = this.route.snapshot.paramMap.get('courseId')
      || this.route.parent?.snapshot.paramMap.get('courseId')
      || this.route.parent?.parent?.snapshot.paramMap.get('courseId')
      || '';
    this.lessonApi.listBySection(this.sectionId).subscribe({
      next: (res) => this.lessons.set(res?.data || []),
      error: (err) => this.error.set(err?.message || 'Không tải được danh sách bài học')
    });

    // Subscribe to router events to reload quiz questions when navigating back
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      // If we have a quiz being viewed, reload its questions
      const currentQuizId = this.currentViewingQuizId();
      if (currentQuizId) {
        this.loadQuizQuestions(currentQuizId);
      }
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
        // Load packages when switching to QUIZ type
        this.loadQuizPackages();
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
    
    // Prevent double-click
    if (this.isCreating()) return;
    this.isCreating.set(true);

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
          this.isCreating.set(false);
        },
        error: (err) => {
          this.opError.set(err?.message || 'Tạo bài tập thất bại');
          this.isCreating.set(false);
        }
      });
    } else if (lessonType === 'QUIZ') {
      // Get selected question IDs
      const selectedQuestionIds = this.selectedQuizQuestions();
      
      // Create quiz lesson with proper backend integration
      const lessonPayload: CreateLessonRequest = {
        title: this.createForm.value.title ?? '',
        lessonType: 'QUIZ',
        // Default values, will be configured in wizard
        quizTimeLimit: 30,
        quizMaxScore: 100,
        quizMaxAttempts: 1
      };

      // Create the lesson first
      this.lessonApi.createLesson(sectionId, lessonPayload).subscribe({
        next: async (lessonRes) => {
          const lesson = lessonRes?.data;
          if (lesson) {
            try {
              // Create corresponding Quiz entity using Backend Quiz API
              const quizPayload = {
                questionIds: selectedQuestionIds, // Use selected questions
                timeLimitMinutes: Number(this.createForm.value.quizTimeLimit) || 30,
                maxAttempts: Number(this.createForm.value.quizMaxAttempts) || 1,
                passingScore: Number(this.createForm.value.quizMaxScore) || 100,
                shuffleQuestions: false,
                shuffleOptions: false,
                showResultsImmediately: true,
                showCorrectAnswers: true
              };

              // Create Quiz entity
              const quizResponse = await firstValueFrom(this.quizApi.createQuiz(lesson.id, quizPayload));
              const createdQuiz = quizResponse as any;

              if (createdQuiz) {
                this.lessons.update(list => [...list, lesson]);

                // Save quiz ID and title for Quiz Bank navigation
                this.lastCreatedQuizId.set(createdQuiz.id || lesson.id);
                this.lastCreatedQuizTitle.set(lesson.title);

                // Reset form and quiz selection
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
                
                // Reset quiz selection state
                this.quizPackageId = '';
                this.quizPackageQuestions.set([]);
                this.selectedQuizQuestions.set([]);

                // Close the form after successful creation
                this.showCreateForm.set(false);

                // Show success message
                this.opError.set('');
                const questionCount = selectedQuestionIds.length;
                alert(`✅ Đã tạo bài trắc nghiệm "${lesson.title}" thành công!\n\n📝 ${questionCount} câu hỏi đã được thêm vào quiz.`);
              } else {
                // Lesson created but Quiz creation failed
                this.lessons.update(list => [...list, lesson]);
                this.opError.set('');
                alert(`⚠️ Đã tạo lesson "${lesson.title}" nhưng không thể tạo Quiz entity. Vui lòng kiểm tra logs.`);
              }
              this.isCreating.set(false);
            } catch (quizError) {
              console.error('Quiz creation error:', quizError);
              // Still add the lesson even if quiz creation failed
              this.lessons.update(list => [...list, lesson]);
              this.opError.set('');
              this.isCreating.set(false);
              alert(`⚠️ Đã tạo lesson "${lesson.title}" nhưng lỗi khi tạo Quiz entity: ${(quizError as any)?.message || 'Lỗi không xác định'}`);
            }
          }
        },
        error: (err) => {
          this.opError.set(err?.message || 'Tạo bài trắc nghiệm thất bại');
          this.isCreating.set(false);
        }
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
          this.isCreating.set(false);
        },
        error: (err) => {
          this.opError.set(err?.message || 'Tạo bài học thất bại');
          this.isCreating.set(false);
        }
      });
    }
  }

  startEdit(l: any) {
    this.editingId.set(l.id);
    this.editForm.patchValue({ title: l.title || '', content: l.content || '', videoUrl: l.videoUrl || '' });
  }

  startAddNew() {
    this.showCreateForm.set(true);
    this.createForm.reset();
    // Close view form when opening create form
    this.selected.set(null);
    this.currentViewingQuizId.set(null);
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
    this.lessonApi.deleteLesson(id).subscribe({
      next: () => this.lessons.update(list => list.filter(i => i.id !== id)),
      error: (err) => this.opError.set(err?.message || 'Xóa bài học thất bại')
    });
  }

  // Confirm delete with proper message based on lesson type
  confirmDeleteLesson(lesson: any) {
    this.lessonToDelete.set(lesson);
    this.showDeleteModal.set(true);
  }

  // Cancel delete
  cancelDelete() {
    this.showDeleteModal.set(false);
    this.lessonToDelete.set(null);
  }

  // Execute delete
  executeDelete() {
    const lesson = this.lessonToDelete();
    if (!lesson) return;
    
    this.isDeleting.set(true);
    this.lessonApi.deleteLesson(lesson.id).subscribe({
      next: () => {
        this.lessons.update(list => list.filter(i => i.id !== lesson.id));
        this.showDeleteModal.set(false);
        this.lessonToDelete.set(null);
        this.isDeleting.set(false);
      },
      error: (err) => {
        this.opError.set(err?.message || 'Xóa bài học thất bại');
        this.isDeleting.set(false);
      }
    });
  }

  // Get delete warning message based on lesson type
  getDeleteWarningMessage(): string {
    const lesson = this.lessonToDelete();
    if (!lesson) return '';
    
    if (lesson.lessonType === 'QUIZ') {
      return 'Tất cả câu hỏi trong quiz và kết quả làm bài của học viên sẽ bị xóa vĩnh viễn.';
    } else if (lesson.lessonType === 'ASSIGNMENT') {
      return 'Tất cả bài nộp của học viên sẽ bị xóa vĩnh viễn.';
    }
    return 'Hành động này không thể hoàn tác.';
  }

  // Preview quiz - simulate student experience
  async previewQuizLesson(lesson: any) {
    try {
      // First check if quiz has questions
      const response = await firstValueFrom(this.quizApi.getQuizQuestions(lesson.id));
      const questions = Array.isArray(response) ? response : (response as any).data || [];
      
      if (questions.length === 0) {
        alert('⚠️ Quiz này chưa có câu hỏi nào.\n\nVui lòng thêm câu hỏi trước khi xem trước.');
        return;
      }
      
      // Navigate to quiz preview page
      this.router.navigate(['/teacher/quiz/preview', lesson.id], {
        queryParams: {
          title: lesson.title,
          returnUrl: this.router.url
        }
      });
    } catch (error: any) {
      console.error('Error previewing quiz:', error);
      alert('Không thể xem trước quiz: ' + (error?.message || 'Lỗi không xác định'));
    }
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

    // Auto-load quiz questions if this is a QUIZ lesson
    if (l.lessonType === 'QUIZ') {
      console.log('🎯 Auto-loading quiz questions for lesson:', l.id);
      this.loadQuizQuestions(l.id);
      // Also load packages for inline add questions
      this.loadQuizPackages();
      // Reset inline selection state
      this.inlinePackageId = '';
      this.inlinePackageQuestions.set([]);
      this.selectedInlineQuestions.set([]);
    }
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
    } catch { }
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
      this.router.navigate(['/teacher/quiz/quiz-bank'], {
        queryParams: {
          quizId: quizId,
          quizTitle: quizTitle,
          returnUrl: this.router.url // Save current URL to return later
        }
      });
    } else {
      // Open without context
      this.router.navigate(['/teacher/quiz/quiz-bank']);
    }
  }

  // ==================== QUIZ PACKAGE SELECTION METHODS ====================
  
  private packageApi = inject(PackageApi);

  async loadQuizPackages() {
    try {
      const packages = await firstValueFrom(this.packageApi.getMyPackages());
      this.quizPackages.set(packages || []);
      console.log('📦 Loaded packages:', packages?.length || 0);
    } catch (error) {
      console.error('Failed to load packages:', error);
      this.quizPackages.set([]);
    }
  }

  async onQuizPackageChange(packageId: string) {
    this.quizPackageId = packageId;
    this.selectedQuizQuestions.set([]);
    
    if (!packageId) {
      this.quizPackageQuestions.set([]);
      return;
    }

    try {
      const questions = await firstValueFrom(this.packageApi.getQuestionsInPackage(packageId));
      const questionList = Array.isArray(questions) ? questions : [];
      this.quizPackageQuestions.set(questionList);
      console.log('📝 Loaded questions for package:', questionList.length);
    } catch (error) {
      console.error('Failed to load package questions:', error);
      this.quizPackageQuestions.set([]);
    }
  }

  toggleQuizQuestion(questionId: string) {
    const current = this.selectedQuizQuestions();
    if (current.includes(questionId)) {
      this.selectedQuizQuestions.set(current.filter(id => id !== questionId));
    } else {
      this.selectedQuizQuestions.set([...current, questionId]);
    }
  }

  isQuizQuestionSelected(questionId: string): boolean {
    return this.selectedQuizQuestions().includes(questionId);
  }

  selectAllQuizQuestions() {
    const allIds = this.quizPackageQuestions().map(q => q.id);
    this.selectedQuizQuestions.set(allIds);
  }

  clearQuizQuestionSelection() {
    this.selectedQuizQuestions.set([]);
  }

  // ==================== INLINE ADD QUESTIONS TO EXISTING QUIZ ====================
  
  async onInlinePackageChange(packageId: string) {
    this.inlinePackageId = packageId;
    this.selectedInlineQuestions.set([]);
    
    if (!packageId) {
      this.inlinePackageQuestions.set([]);
      return;
    }

    try {
      const questions = await firstValueFrom(this.packageApi.getQuestionsInPackage(packageId));
      const questionList = Array.isArray(questions) ? questions : [];
      this.inlinePackageQuestions.set(questionList);
      console.log('📝 Loaded inline questions for package:', questionList.length);
    } catch (error) {
      console.error('Failed to load inline package questions:', error);
      this.inlinePackageQuestions.set([]);
    }
  }

  clearInlinePackageSelection() {
    this.inlinePackageId = '';
    this.inlinePackageQuestions.set([]);
    this.selectedInlineQuestions.set([]);
  }

  toggleInlineQuestion(questionId: string) {
    const current = this.selectedInlineQuestions();
    if (current.includes(questionId)) {
      this.selectedInlineQuestions.set(current.filter(id => id !== questionId));
    } else {
      this.selectedInlineQuestions.set([...current, questionId]);
    }
  }

  isInlineQuestionSelected(questionId: string): boolean {
    return this.selectedInlineQuestions().includes(questionId);
  }

  selectAllInlineQuestions() {
    const allIds = this.inlinePackageQuestions().map(q => q.id);
    if (this.selectedInlineQuestions().length === allIds.length) {
      // Deselect all
      this.selectedInlineQuestions.set([]);
    } else {
      // Select all
      this.selectedInlineQuestions.set(allIds);
    }
  }

  async addInlineQuestionsToQuiz(lessonId: string) {
    const selectedIds = this.selectedInlineQuestions();
    if (selectedIds.length === 0) return;

    this.addingInlineQuestions.set(true);

    try {
      let addedCount = 0;
      let skippedCount = 0;

      for (const questionId of selectedIds) {
        try {
          console.log('🔄 Adding question to quiz - lessonId:', lessonId, 'questionId:', questionId);
          const result = await firstValueFrom(this.quizApi.addQuestionToQuiz(lessonId, questionId));
          console.log('✅ Add question result:', result);
          addedCount++;
        } catch (error: any) {
          console.error('❌ Error adding question:', questionId, error);
          if (error?.error?.message?.includes('đã tồn tại')) {
            skippedCount++;
          } else {
            // Log full error for debugging
            console.error('Full error:', JSON.stringify(error, null, 2));
          }
        }
      }

      // Reload quiz questions
      await this.loadQuizQuestions(lessonId);

      // Reset inline selection
      this.selectedInlineQuestions.set([]);
      this.inlinePackageId = '';
      this.inlinePackageQuestions.set([]);

      // Show result
      console.log('📊 Add result - added:', addedCount, 'skipped:', skippedCount);
      if (addedCount > 0) {
        let msg = `✅ Đã thêm ${addedCount} câu hỏi vào Quiz!`;
        if (skippedCount > 0) {
          msg += ` (${skippedCount} câu đã có sẵn)`;
        }
        alert(msg);
      } else if (skippedCount > 0) {
        alert('⚠️ Tất cả câu hỏi đã có trong Quiz rồi!');
      } else {
        alert('⚠️ Không có câu hỏi nào được thêm. Kiểm tra console log để biết chi tiết.');
      }
    } catch (error: any) {
      console.error('Error adding inline questions:', error);
      alert('❌ Lỗi: ' + (error?.message || error?.error?.message || 'Không xác định'));
    } finally {
      this.addingInlineQuestions.set(false);
    }
  }

  async loadQuizQuestions(lessonId: string): Promise<void> {
    this.quizQuestionsLoading.set(true);
    this.currentViewingQuizId.set(lessonId);
    
    try {
      console.log('🔍 Loading quiz questions for lesson:', lessonId);
      
      // Fetch real questions from API using lesson ID
      const response = await firstValueFrom(this.quizApi.getQuizQuestions(lessonId));
      console.log('📦 Raw API response:', response);

      // Handle ApiResponse wrapper
      const questions = Array.isArray(response) ? response : (response as any).data || [];

      console.log('📊 Loaded quiz questions:', questions.length, 'questions');

      // Transform to display format - handle both optionKey and key
      this.quizQuestions.set(questions.map((q: any) => ({
        id: q.id,
        content: q.content,
        difficulty: q.difficulty,
        tags: q.tags,
        correctOption: q.correctOption,
        options: (q.options || []).sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0)).map((opt: any) => ({
          key: opt.optionKey || opt.key,
          optionKey: opt.optionKey || opt.key,
          content: opt.content
        }))
      })));

    } catch (error: any) {
      console.error('❌ Error loading quiz questions:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      
      // Show error to user if quiz not found
      if (error?.error?.message?.includes('Quiz not found')) {
        console.log('⚠️ Quiz entity does not exist for this lesson. It will be created when adding questions.');
      }
      
      this.quizQuestions.set([]);
    } finally {
      this.quizQuestionsLoading.set(false);
    }
  }

  // Open modal to add questions from Quiz Bank
  openAddQuestionsModal(lessonId: string) {
    // Load packages first, then show selection
    this.loadQuizPackages();
    this.currentViewingQuizId.set(lessonId);
    // For now, navigate to Quiz Bank with context
    this.router.navigate(['/teacher/quiz/quiz-bank'], {
      queryParams: {
        addToQuiz: lessonId,
        returnUrl: this.router.url
      }
    });
  }

  // Remove question from quiz
  async removeQuestionFromQuiz(lessonId: string, questionId: string) {
    if (!confirm('Bạn có chắc muốn xóa câu hỏi này khỏi quiz?')) return;
    
    try {
      await firstValueFrom(this.quizApi.removeQuestionFromQuiz(lessonId, questionId));
      // Reload questions
      await this.loadQuizQuestions(lessonId);
      console.log('✅ Removed question from quiz');
    } catch (error) {
      console.error('Error removing question:', error);
      alert('Không thể xóa câu hỏi: ' + (error as any).message);
    }
  }

  // Edit question - navigate to Quiz Bank with question ID
  editQuestionInQuizBank(questionId: string) {
    this.router.navigate(['/teacher/quiz/quiz-bank'], {
      queryParams: {
        editQuestion: questionId,
        returnUrl: this.router.url
      }
    });
  }

  async previewQuiz(quizId: string, quizTitle: string) {
    try {
      console.log('🔍 Preview Quiz - ID:', quizId, 'Title:', quizTitle);

      // Load quiz questions first to validate
      const response = await firstValueFrom(this.quizApi.getQuizQuestions(quizId));
      console.log('🔍 Preview Quiz - API Response:', response);

      const questions = Array.isArray(response) ? response : (response as any).data || [];
      console.log('🔍 Preview Quiz - Questions:', questions);

      if (questions.length === 0) {
        alert('Quiz này chưa có câu hỏi nào. Vui lòng thêm câu hỏi trước khi xem trước.');
        return;
      }

      // Navigate to quiz preview page
      this.router.navigate(['/teacher/quiz/preview', quizId]);

    } catch (error) {
      console.error('❌ Error loading quiz for preview:', error);
      alert('Không thể tải quiz để xem trước: ' + (error as any).message);
    }
  }

  closeQuizPreview() {
    this.showQuizPreview.set(false);
    this.previewQuizId.set(null);
    this.previewQuizTitle.set('');
    this.previewQuestions.set([]);
  }

  selectPreviewAnswer(questionId: string, selectedKey: string) {
    const questions = this.previewQuestions();
    const updatedQuestions = questions.map(q =>
      q.id === questionId ? { ...q, selectedAnswer: selectedKey } : q
    );
    this.previewQuestions.set(updatedQuestions);
  }

  openQuizBankToAddQuestions(quizId: string, quizTitle: string) {
    // Navigate to Quiz Bank to add questions to an existing quiz
    this.router.navigate(['/teacher/quiz/quiz-bank'], {
      queryParams: {
        quizId: quizId,
        quizTitle: quizTitle,
        courseId: this.courseId,  // Pass courseId for question creation
        returnUrl: this.router.url
      }
    });
  }

  toggleCreateForm() {
    this.showCreateForm.update(show => !show);
    // Reset form when opening
    if (this.showCreateForm()) {
      this.resetForm();
      // Close view form when opening create form
      this.selected.set(null);
      this.currentViewingQuizId.set(null);
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
    // Simple toggle like professional-learning
    this.expandedAttachment = this.expandedAttachment === index ? null : index;
  }


  getSafeUrl(url: string): any {
    // Simple implementation like professional-learning
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  getOfficeViewerUrl(fileUrl: string): any {
    // Use Microsoft Office Online Viewer
    const encodedUrl = encodeURIComponent(fileUrl);
    const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(viewerUrl);
  }

  getGoogleDocsPdfUrl(fileUrl: string): any {
    // Sử dụng Google Docs viewer cho PDF
    const encodedUrl = encodeURIComponent(fileUrl);
    const viewerUrl = `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(viewerUrl);
  }



  // Quiz Edit Modal Methods
  editQuizSettings(lessonId: string) {
    console.log('🔧 Opening quiz edit modal for lesson:', lessonId);
    if (this.quizEditModal) {
      this.quizEditModal.lessonId = lessonId;
      this.quizEditModal.open();
    }
  }

  onQuizSettingsSaved() {
    console.log('✅ Quiz settings updated, refreshing lessons...');
    // Reload lessons to show updated quiz settings
    this.lessonApi.listBySection(this.sectionId).subscribe({
      next: (res) => {
        this.lessons.set(res?.data || []);
        console.log('✅ Lessons refreshed after quiz settings update');
      },
      error: (err) => this.error.set(err?.message || 'Không tải được danh sách bài học')
    });
  }

  onQuizEditModalClosed() {
    console.log('Quiz edit modal closed');
  }

  ngOnDestroy(): void {
    // Clean up any timeouts
    this.clearHeaderTimeout();
    // Clean up router subscription
    this.routerSubscription?.unsubscribe();
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

  // Bulk question selection methods
  toggleQuestionSelection(questionId: string): void {
    const currentSelection = this.selectedQuestionIds();
    const newSelection = new Set(currentSelection);

    if (newSelection.has(questionId)) {
      newSelection.delete(questionId);
    } else {
      newSelection.add(questionId);
    }

    this.selectedQuestionIds.set(newSelection);
  }

  selectAllQuestions(): void {
    const allQuestionIds = new Set(this.courseQuestions().map(q => q.id));
    this.selectedQuestionIds.set(allQuestionIds);
  }

  clearQuestionSelection(): void {
    this.selectedQuestionIds.set(new Set());
  }

  getSelectedQuestionCount(): number {
    return this.selectedQuestionIds().size;
  }

  isQuestionSelected(questionId: string): boolean {
    return this.selectedQuestionIds().has(questionId);
  }

  // Add selected questions to quiz (bulk operation) - Uses QuizQuestion table
  async addSelectedQuestionsToQuiz(lessonId: string): Promise<void> {
    const selectedIds = Array.from(this.selectedQuestionIds());

    if (selectedIds.length === 0) {
      alert('Vui lòng chọn ít nhất một câu hỏi để thêm vào quiz.');
      return;
    }

    try {
      console.log('🔄 Adding selected questions to quiz:', selectedIds.length, 'questions');

      let addedCount = 0;
      let skippedCount = 0;

      // Add each question using the correct API
      for (const questionId of selectedIds) {
        try {
          await firstValueFrom(this.quizApi.addQuestionToQuiz(lessonId, questionId));
          addedCount++;
        } catch (error: any) {
          // Question might already exist
          if (error?.error?.message?.includes('đã tồn tại')) {
            skippedCount++;
          } else {
            throw error;
          }
        }
      }

      // Clear selection after successful addition
      this.clearQuestionSelection();

      // Refresh quiz questions display
      await this.loadQuizQuestions(lessonId);

      // Show success message
      if (addedCount > 0) {
        let msg = `✅ Đã thêm ${addedCount} câu hỏi vào quiz!`;
        if (skippedCount > 0) {
          msg += `\n⚠️ ${skippedCount} câu đã có sẵn trong quiz.`;
        }
        alert(msg);
      } else if (skippedCount > 0) {
        alert('⚠️ Tất cả câu hỏi đã có trong quiz rồi!');
      }

      console.log('✅ Added:', addedCount, 'Skipped:', skippedCount);
    } catch (error: any) {
      console.error('❌ Error adding selected questions to quiz:', error);
      alert('❌ Lỗi khi thêm câu hỏi vào quiz: ' + (error?.message || 'Lỗi không xác định'));
    }
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

  // Load course questions for quiz creation
  async loadQuestionsByCourse(courseId: string): Promise<void> {
    try {
      this.courseQuestionsError.set('');

      console.log('🔍 Loading questions for course:', courseId);

      const response = await firstValueFrom(
        this.questionApi.getQuestionsByCourse(courseId, 'ACTIVE')
      );

      console.log('📦 API Response:', response);
      console.log('📦 Response type:', typeof response);
      console.log('📦 Response.data:', (response as any).data);

      // Backend trả về {data: Question[], pagination: null, message: null}
      if (response && (response as any).data) {
        this.courseQuestions.set((response as any).data);
        console.log('✅ Loaded', (response as any).data.length, 'questions for course');
      } else {
        console.log('❌ No data in response:', response);
        this.courseQuestionsError.set('Không có dữ liệu câu hỏi');
      }
    } catch (error: any) {
      console.error('❌ Error loading course questions:', error);
      this.courseQuestionsError.set(
        error?.error?.message || error?.message || 'Có lỗi xảy ra khi tải câu hỏi'
      );
    }
  }

  // Add question to quiz (single question) - Uses QuizQuestion table
  async addQuestionToQuiz(questionId: string, lessonId: string): Promise<void> {
    try {
      console.log('🔍 Adding question', questionId, 'to quiz (lesson)', lessonId);

      // Use the correct API that adds to quiz_questions table
      await firstValueFrom(this.quizApi.addQuestionToQuiz(lessonId, questionId));

      // If question was in selected set, remove it
      this.selectedQuestionIds.update(selected => {
        const newSelected = new Set(selected);
        newSelected.delete(questionId);
        return newSelected;
      });

      // Refresh quiz questions display
      await this.loadQuizQuestions(lessonId);

      console.log('✅ Successfully added question to quiz');
    } catch (error: any) {
      console.error('❌ Error adding question to quiz:', error);
      const errorMsg = error?.error?.message || error?.message || 'Lỗi không xác định';
      if (errorMsg.includes('đã tồn tại')) {
        alert('⚠️ Câu hỏi này đã có trong quiz rồi!');
      } else {
        alert('❌ Lỗi khi thêm câu hỏi: ' + errorMsg);
      }
    }
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
