import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TeacherService } from '../services/teacher.service';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

interface GradingRubric {
  id: string;
  name: string;
  description: string;
  criteria: RubricCriteria[];
  totalPoints: number;
  createdAt: Date;
  updatedAt: Date;
}

interface RubricCriteria {
  id: string;
  name: string;
  description: string;
  maxPoints: number;
  levels: RubricLevel[];
}

interface RubricLevel {
  name: string;
  description: string;
  points: number;
  examples?: string[];
}

interface AssignmentSubmission {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  assignmentId: string;
  assignmentTitle: string;
  submittedAt: Date;
  content: string;
  attachments: SubmissionAttachment[];
  status: 'submitted' | 'graded' | 'returned';
  grade?: number;
  maxGrade: number;
  feedback?: string;
  rubricScores?: RubricScore[];
  timeSpent?: number; // in minutes
  wordCount?: number;
  plagiarismScore?: number;
  lateSubmission: boolean;
  attemptNumber: number;
}

interface SubmissionAttachment {
  id: string;
  name: string;
  url: string;
  type: 'pdf' | 'doc' | 'image' | 'video' | 'other';
  size: number;
  uploadedAt: Date;
}

interface RubricScore {
  criteriaId: string;
  criteriaName: string;
  selectedLevel: RubricLevel;
  points: number;
  maxPoints: number;
  feedback?: string;
}

interface GradingSession {
  id: string;
  assignmentId: string;
  graderId: string;
  startTime: Date;
  endTime?: Date;
  submissionsGraded: number;
  totalSubmissions: number;
  averageGrade: number;
  status: 'active' | 'completed' | 'paused';
}

@Component({
  selector: 'app-advanced-grading-system',
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, LoadingComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <!-- Loading State -->
    <app-loading 
      [show]="isLoading()" 
      text="Đang tải hệ thống chấm điểm..."
      subtext="Vui lòng chờ trong giây lát"
      variant="overlay"
      color="purple">
    </app-loading>

    <div class="bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 min-h-screen">
      <div class="max-w-7xl mx-auto px-6 py-8">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 mb-2">🎯 Hệ thống chấm điểm nâng cao</h1>
              <p class="text-gray-600">Chấm điểm bài tập với rubric chi tiết và phản hồi cá nhân hóa</p>
            </div>
            <div class="flex items-center space-x-4">
              <button (click)="createNewRubric()"
                      class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                <svg class="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path>
                </svg>
                Tạo Rubric mới
              </button>
              <button (click)="startBatchGrading()"
                      class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                <svg class="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path>
                </svg>
                Chấm hàng loạt
              </button>
            </div>
          </div>
        </div>

        <!-- Grading Stats -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-purple-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Chờ chấm điểm</p>
                <p class="text-3xl font-bold text-gray-900">{{ pendingSubmissions() }}</p>
                <p class="text-sm text-purple-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                  </svg>
                  Cần xử lý
                </p>
              </div>
              <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-green-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Đã chấm</p>
                <p class="text-3xl font-bold text-gray-900">{{ gradedSubmissions() }}</p>
                <p class="text-sm text-green-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                  </svg>
                  Hoàn thành
                </p>
              </div>
              <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-blue-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Điểm trung bình</p>
                <p class="text-3xl font-bold text-gray-900">{{ averageGrade() }}</p>
                <p class="text-sm text-blue-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h4.586l-1.293-1.293a1 1 0 011.414-1.414L10 15.414l2.293-2.293a1 1 0 111.414 1.414L12.414 15H17a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                  </svg>
                  Xu hướng tích cực
                </p>
              </div>
              <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h4.586l-1.293-1.293a1 1 0 011.414-1.414L10 15.414l2.293-2.293a1 1 0 111.414 1.414L12.414 15H17a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-orange-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Rubric có sẵn</p>
                <p class="text-3xl font-bold text-gray-900">{{ availableRubrics() }}</p>
                <p class="text-sm text-orange-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path>
                  </svg>
                  Templates
                </p>
              </div>
              <div class="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Content -->
        <div class="grid grid-cols-12 gap-6">
          <!-- Left Column - Submissions List (8 columns) -->
          <div class="col-span-12 xl:col-span-8 space-y-6">
            <!-- Filter and Search -->
            <div class="bg-white rounded-xl shadow-lg p-6">
              <div class="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div class="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
                  <div class="relative">
                    <input type="text" 
                           [(ngModel)]="searchQuery"
                           placeholder="Tìm kiếm học viên, bài tập..."
                           class="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                    <svg class="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                  
                  <select [(ngModel)]="selectedAssignment" 
                          class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="">Tất cả bài tập</option>
                    @for (assignment of assignments(); track assignment.id) {
                      <option [value]="assignment.id">{{ assignment.title }}</option>
                    }
                  </select>
                  
                  <select [(ngModel)]="selectedStatus" 
                          class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="">Tất cả trạng thái</option>
                    <option value="submitted">Chờ chấm</option>
                    <option value="graded">Đã chấm</option>
                    <option value="returned">Đã trả</option>
                  </select>
                </div>
                
                <div class="flex items-center space-x-2">
                  <button (click)="toggleSortOrder()"
                          class="px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h4.586l-1.293-1.293a1 1 0 011.414-1.414L10 15.414l2.293-2.293a1 1 0 111.414 1.414L12.414 15H17a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                    </svg>
                  </button>
                  <span class="text-sm text-gray-600">{{ filteredSubmissions().length }} bài nộp</span>
                </div>
              </div>
            </div>

            <!-- Submissions List -->
            <div class="bg-white rounded-xl shadow-lg">
              <div class="p-6 border-b border-gray-200">
                <h3 class="text-lg font-semibold text-gray-900">Danh sách bài nộp</h3>
              </div>
              
              <div class="divide-y divide-gray-200">
                @for (submission of filteredSubmissions(); track submission.id) {
                  <div class="p-6 hover:bg-gray-50 transition-colors">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center space-x-4">
                        <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-semibold">
                          {{ submission.studentName.charAt(0).toUpperCase() }}
                        </div>
                        <div>
                          <h4 class="text-lg font-semibold text-gray-900">{{ submission.studentName }}</h4>
                          <p class="text-sm text-gray-600">{{ submission.studentEmail }}</p>
                          <p class="text-sm text-gray-500">{{ submission.assignmentTitle }}</p>
                        </div>
                      </div>
                      
                      <div class="flex items-center space-x-4">
                        <div class="text-right">
                          <div class="text-sm text-gray-600">Nộp lúc</div>
                          <div class="text-sm font-medium text-gray-900">{{ formatDate(submission.submittedAt) }}</div>
                          @if (submission.lateSubmission) {
                            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Nộp muộn
                            </span>
                          }
                        </div>
                        
                        <div class="text-right">
                          <div class="text-sm text-gray-600">Trạng thái</div>
                          <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                                [class]="getStatusClass(submission.status)">
                            {{ getStatusText(submission.status) }}
                          </span>
                        </div>
                        
                        @if (submission.grade !== undefined) {
                          <div class="text-right">
                            <div class="text-sm text-gray-600">Điểm</div>
                            <div class="text-lg font-bold text-gray-900">{{ submission.grade }}/{{ submission.maxGrade }}</div>
                          </div>
                        }
                        
                        <div class="flex items-center space-x-2">
                          <button (click)="gradeSubmission(submission)"
                                  class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm">
                            @if (submission.status === 'submitted') {
                              Chấm điểm
                            } @else {
                              Xem lại
                            }
                          </button>
                          
                          <button (click)="viewSubmission(submission)"
                                  class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                            Xem chi tiết
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    @if (submission.content) {
                      <div class="mt-4 p-4 bg-gray-50 rounded-lg">
                        <div class="text-sm text-gray-600 mb-2">Nội dung bài làm:</div>
                        <div class="text-sm text-gray-900 line-clamp-3">{{ submission.content }}</div>
                      </div>
                    }
                    
                    @if (submission.attachments.length > 0) {
                      <div class="mt-4">
                        <div class="text-sm text-gray-600 mb-2">Tệp đính kèm:</div>
                        <div class="flex flex-wrap gap-2">
                          @for (attachment of submission.attachments; track attachment.id) {
                            <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                              <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                              </svg>
                              {{ attachment.name }}
                            </span>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Right Column - Grading Tools (4 columns) -->
          <div class="col-span-12 xl:col-span-4 space-y-6">
            <!-- Quick Grading Tools -->
            <div class="bg-white rounded-xl shadow-lg p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Công cụ chấm điểm</h3>
              <div class="space-y-3">
                <button (click)="startQuickGrading()"
                        class="w-full flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-200">
                  <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg class="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                  <span class="font-medium text-gray-900">Chấm điểm nhanh</span>
                </button>
                
                <button (click)="openRubricManager()"
                        class="w-full flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200">
                  <div class="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <svg class="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                  <span class="font-medium text-gray-900">Quản lý Rubric</span>
                </button>
                
                <button (click)="exportGrades()"
                        class="w-full flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all duration-200">
                  <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                  <span class="font-medium text-gray-900">Xuất điểm</span>
                </button>
              </div>
            </div>

            <!-- Grading Progress -->
            <div class="bg-white rounded-xl shadow-lg p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Tiến độ chấm điểm</h3>
              <div class="space-y-4">
                <div>
                  <div class="flex justify-between text-sm mb-1">
                    <span class="text-gray-600">Hoàn thành</span>
                    <span class="text-gray-900">{{ gradingProgress() }}%</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-purple-600 h-2 rounded-full transition-all duration-300" 
                         [style.width.%]="gradingProgress()"></div>
                  </div>
                </div>
                
                <div class="text-sm text-gray-600">
                  <div class="flex justify-between">
                    <span>Đã chấm:</span>
                    <span class="font-medium">{{ gradedSubmissions() }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Còn lại:</span>
                    <span class="font-medium">{{ pendingSubmissions() }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Recent Activity -->
            <div class="bg-white rounded-xl shadow-lg p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Hoạt động gần đây</h3>
              <div class="space-y-3">
                @for (activity of recentGradingActivity(); track activity.id) {
                  <div class="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div class="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                    <div class="flex-1">
                      <p class="text-sm text-gray-900">{{ activity.message }}</p>
                      <p class="text-xs text-gray-500">{{ formatTime(activity.timestamp) }}</p>
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
export class AdvancedGradingSystemComponent implements OnInit {
  private teacherService = inject(TeacherService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  // Signals
  isLoading = signal(false);
  submissions = signal<AssignmentSubmission[]>([]);
  assignments = signal<any[]>([]);
  rubrics = signal<GradingRubric[]>([]);
  searchQuery = signal('');
  selectedAssignment = signal('');
  selectedStatus = signal('');
  sortOrder = signal<'asc' | 'desc'>('desc');

  // Computed properties
  pendingSubmissions = computed(() => 
    this.submissions().filter(s => s.status === 'submitted').length
  );

  gradedSubmissions = computed(() => 
    this.submissions().filter(s => s.status === 'graded' || s.status === 'returned').length
  );

  averageGrade = computed(() => {
    const graded = this.submissions().filter(s => s.grade !== undefined);
    if (graded.length === 0) return 0;
    const total = graded.reduce((sum, s) => sum + (s.grade || 0), 0);
    return Math.round(total / graded.length);
  });

  availableRubrics = computed(() => this.rubrics().length);

  gradingProgress = computed(() => {
    const total = this.submissions().length;
    if (total === 0) return 0;
    return Math.round((this.gradedSubmissions() / total) * 100);
  });

  filteredSubmissions = computed(() => {
    let filtered = this.submissions();
    
    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      filtered = filtered.filter(s => 
        s.studentName.toLowerCase().includes(query) ||
        s.studentEmail.toLowerCase().includes(query) ||
        s.assignmentTitle.toLowerCase().includes(query)
      );
    }
    
    if (this.selectedAssignment()) {
      filtered = filtered.filter(s => s.assignmentId === this.selectedAssignment());
    }
    
    if (this.selectedStatus()) {
      filtered = filtered.filter(s => s.status === this.selectedStatus());
    }
    
    // Sort by submission date
    return filtered.sort((a, b) => {
      const comparison = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      return this.sortOrder() === 'asc' ? comparison : -comparison;
    });
  });

  recentGradingActivity = signal([
    { id: 1, message: 'Đã chấm bài tập "Navigation Safety"', timestamp: new Date() },
    { id: 2, message: 'Tạo rubric mới cho "Marine Engineering"', timestamp: new Date() },
    { id: 3, message: 'Xuất báo cáo điểm cho lớp A', timestamp: new Date() }
  ]);

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.isLoading.set(true);
    
    // Load mock data
    setTimeout(() => {
      this.submissions.set(this.generateMockSubmissions());
      this.assignments.set(this.generateMockAssignments());
      this.rubrics.set(this.generateMockRubrics());
      this.isLoading.set(false);
    }, 1000);
  }

  private generateMockSubmissions(): AssignmentSubmission[] {
    return [
      {
        id: '1',
        studentId: 's1',
        studentName: 'Nguyễn Văn A',
        studentEmail: 'nguyenvana@email.com',
        assignmentId: 'a1',
        assignmentTitle: 'Navigation Safety Quiz',
        submittedAt: new Date(),
        content: 'Bài làm về navigation safety...',
        attachments: [
          { id: '1', name: 'answer.pdf', url: '/files/answer.pdf', type: 'pdf', size: 1024, uploadedAt: new Date() }
        ],
        status: 'submitted',
        maxGrade: 100,
        lateSubmission: false,
        attemptNumber: 1,
        timeSpent: 45,
        wordCount: 500
      },
      {
        id: '2',
        studentId: 's2',
        studentName: 'Trần Thị B',
        studentEmail: 'tranthib@email.com',
        assignmentId: 'a1',
        assignmentTitle: 'Navigation Safety Quiz',
        submittedAt: new Date(),
        content: 'Bài làm về navigation safety...',
        attachments: [],
        status: 'graded',
        grade: 85,
        maxGrade: 100,
        feedback: 'Tốt, cần cải thiện phần...',
        lateSubmission: false,
        attemptNumber: 1,
        timeSpent: 50,
        wordCount: 600
      }
    ];
  }

  private generateMockAssignments(): any[] {
    return [
      { id: 'a1', title: 'Navigation Safety Quiz' },
      { id: 'a2', title: 'Marine Engineering Assignment' },
      { id: 'a3', title: 'Port Management Project' }
    ];
  }

  private generateMockRubrics(): GradingRubric[] {
    return [
      {
        id: 'r1',
        name: 'Navigation Safety Rubric',
        description: 'Rubric for evaluating navigation safety knowledge',
        totalPoints: 100,
        criteria: [
          {
            id: 'c1',
            name: 'Knowledge of Regulations',
            description: 'Understanding of maritime regulations',
            maxPoints: 40,
            levels: [
              { name: 'Excellent', description: 'Complete understanding', points: 40 },
              { name: 'Good', description: 'Good understanding', points: 30 },
              { name: 'Fair', description: 'Basic understanding', points: 20 },
              { name: 'Poor', description: 'Limited understanding', points: 10 }
            ]
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  createNewRubric(): void {
    // Navigate to rubric creation
    this.router.navigate(['/teacher/rubrics/create']);
  }

  startBatchGrading(): void {
    // Start batch grading process
    console.log('Starting batch grading...');
  }

  gradeSubmission(submission: AssignmentSubmission): void {
    // Navigate to grading interface
    this.router.navigate(['/teacher/grading', submission.id]);
  }

  viewSubmission(submission: AssignmentSubmission): void {
    // Navigate to submission details
    this.router.navigate(['/teacher/submissions', submission.id]);
  }

  startQuickGrading(): void {
    // Start quick grading mode
    console.log('Starting quick grading...');
  }

  openRubricManager(): void {
    // Open rubric management
    this.router.navigate(['/teacher/rubrics']);
  }

  exportGrades(): void {
    // Export grades to CSV/Excel
    console.log('Exporting grades...');
  }

  toggleSortOrder(): void {
    this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'submitted': return 'bg-yellow-100 text-yellow-800';
      case 'graded': return 'bg-green-100 text-green-800';
      case 'returned': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'submitted': return 'Chờ chấm';
      case 'graded': return 'Đã chấm';
      case 'returned': return 'Đã trả';
      default: return 'Không xác định';
    }
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return date.toLocaleDateString('vi-VN');
  }
}