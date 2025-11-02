import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ErrorHandlingService } from '../../shared/services/error-handling.service';
import { LoadingComponent } from '../../shared/components/loading/loading.component';

interface Assignment {
  id: string;
  title: string;
  description: string;
  courseId: string;
  courseName: string;
  instructor: {
    name: string;
    avatar: string;
  };
  type: 'quiz' | 'assignment' | 'project' | 'discussion';
  status: 'pending' | 'in-progress' | 'submitted' | 'graded' | 'overdue';
  priority: 'low' | 'medium' | 'high';
  dueDate: Date;
  submittedAt?: Date;
  gradedAt?: Date;
  grade?: number;
  maxGrade: number;
  feedback?: string;
  attachments: AssignmentAttachment[];
  instructions: string;
  rubric?: AssignmentRubric[];
  attempts: number;
  maxAttempts: number;
  timeLimit?: number; // in minutes
  wordCount?: number;
  fileUploads: AssignmentFile[];
}

interface AssignmentAttachment {
  id: string;
  name: string;
  url: string;
  type: 'pdf' | 'doc' | 'image' | 'video' | 'other';
  size: number;
}

interface AssignmentRubric {
  criterion: string;
  description: string;
  points: number;
  grade?: number;
}

interface AssignmentFile {
  id: string;
  name: string;
  url: string;
  uploadedAt: Date;
  size: number;
}

interface AssignmentFilter {
  status: string[];
  type: string[];
  priority: string[];
  course: string[];
  sortBy: 'dueDate' | 'title' | 'priority' | 'status';
  sortOrder: 'asc' | 'desc';
}

@Component({
  selector: 'app-student-assignments',
  imports: [CommonModule, RouterModule, FormsModule, LoadingComponent],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  template: `
    <!-- Loading State -->
    <app-loading 
      [show]="isLoading()" 
      text="Đang tải bài tập..."
      subtext="Vui lòng chờ trong giây lát"
      variant="overlay"
      color="blue">
    </app-loading>
    <div class="bg-gray-50">
      <!-- Header -->
      <div class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900">Bài tập của tôi</h1>
              <p class="text-lg text-gray-600 mt-2">Quản lý và theo dõi tiến độ bài tập</p>
            </div>
            <div class="flex items-center space-x-4">
              <button (click)="goToCalendar()"
                      class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"></path>
                </svg>
                Lịch học tập
              </button>
              <button (click)="goToGrades()"
                      class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                </svg>
                Xem điểm
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div class="bg-white rounded-xl shadow-lg p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Tổng bài tập</p>
                <p class="text-3xl font-bold text-gray-900">{{ assignments().length }}</p>
              </div>
              <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Chờ làm</p>
                <p class="text-3xl font-bold text-gray-900">{{ pendingAssignments().length }}</p>
              </div>
              <div class="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Đã nộp</p>
                <p class="text-3xl font-bold text-gray-900">{{ submittedAssignments().length }}</p>
              </div>
              <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Quá hạn</p>
                <p class="text-3xl font-bold text-gray-900">{{ overdueAssignments().length }}</p>
              </div>
              <div class="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Filters -->
        <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div class="flex flex-wrap items-center gap-4">
            <div class="flex items-center space-x-2">
              <label class="text-sm font-medium text-gray-700">Trạng thái:</label>
              <select [(ngModel)]="filters.status[0]" 
                      (ngModelChange)="applyFilters()"
                      class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Tất cả</option>
                <option value="pending">Chờ làm</option>
                <option value="in-progress">Đang làm</option>
                <option value="submitted">Đã nộp</option>
                <option value="graded">Đã chấm</option>
                <option value="overdue">Quá hạn</option>
              </select>
            </div>

            <div class="flex items-center space-x-2">
              <label class="text-sm font-medium text-gray-700">Loại:</label>
              <select [(ngModel)]="filters.type[0]" 
                      (ngModelChange)="applyFilters()"
                      class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Tất cả</option>
                <option value="quiz">Quiz</option>
                <option value="assignment">Bài tập</option>
                <option value="project">Dự án</option>
                <option value="discussion">Thảo luận</option>
              </select>
            </div>

            <div class="flex items-center space-x-2">
              <label class="text-sm font-medium text-gray-700">Ưu tiên:</label>
              <select [(ngModel)]="filters.priority[0]" 
                      (ngModelChange)="applyFilters()"
                      class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Tất cả</option>
                <option value="high">Cao</option>
                <option value="medium">Trung bình</option>
                <option value="low">Thấp</option>
              </select>
            </div>

            <div class="flex items-center space-x-2">
              <label class="text-sm font-medium text-gray-700">Sắp xếp:</label>
              <select [(ngModel)]="filters.sortBy" 
                      (ngModelChange)="applyFilters()"
                      class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="dueDate">Hạn nộp</option>
                <option value="priority">Ưu tiên</option>
                <option value="title">Tên bài tập</option>
                <option value="status">Trạng thái</option>
              </select>
            </div>

            <button (click)="clearFilters()"
                    class="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors">
              Xóa bộ lọc
            </button>
          </div>
        </div>

        <!-- Assignments List -->
        <div class="space-y-6">
          @for (assignment of filteredAssignments(); track assignment.id) {
            <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center space-x-3 mb-3">
                    <h3 class="text-xl font-semibold text-gray-900">{{ assignment.title }}</h3>
                    <span class="px-3 py-1 rounded-full text-sm font-medium"
                          [class]="getStatusClass(assignment.status)">
                      {{ getStatusText(assignment.status) }}
                    </span>
                    <span class="px-3 py-1 rounded-full text-sm font-medium"
                          [class]="getPriorityClass(assignment.priority)">
                      {{ getPriorityText(assignment.priority) }}
                    </span>
                    <span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      {{ getTypeText(assignment.type) }}
                    </span>
                    <span class="px-3 py-1 rounded-full text-sm font-medium border"
                          [class]="getUrgencyClass(getUrgencyLevel(assignment))">
                      {{ getUrgencyText(getUrgencyLevel(assignment)) }}
                    </span>
                  </div>
                  
                  <p class="text-gray-600 mb-4">{{ assignment.description }}</p>
                  
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Khóa học</label>
                      <p class="text-gray-900">{{ assignment.courseName }}</p>
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Hạn nộp</label>
                      <p class="text-gray-900" [class]="isOverdue(assignment.dueDate) ? 'text-red-600 font-medium' : ''">
                        {{ formatDate(assignment.dueDate) }}
                      </p>
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Giảng viên</label>
                      <div class="flex items-center space-x-2">
                        <img [src]="assignment.instructor.avatar" [alt]="assignment.instructor.name" 
                             class="w-6 h-6 rounded-full object-cover">
                        <span class="text-gray-900">{{ assignment.instructor.name }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Enhanced Progress Info -->
                  <div class="space-y-3 mb-4">
                    <!-- Progress Bar -->
                    <div class="flex items-center justify-between text-sm text-gray-600">
                      <span>Tiến độ hoàn thành</span>
                      <span>{{ getAssignmentProgress(assignment) }}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                      <div class="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                           [style.width.%]="getAssignmentProgress(assignment)"></div>
                    </div>
                    
                    <!-- Assignment Details -->
                    <div class="flex items-center justify-between text-sm text-gray-600">
                      <span>Lần thử: {{ assignment.attempts }}/{{ assignment.maxAttempts }}</span>
                      @if (assignment.timeLimit) {
                        <span>Thời gian: {{ assignment.timeLimit }} phút</span>
                      }
                      @if (assignment.wordCount) {
                        <span>Từ tối thiểu: {{ assignment.wordCount }} từ</span>
                      }
                    </div>
                    
                    <!-- Days Until Due -->
                    <div class="flex items-center justify-between text-sm">
                      <span class="text-gray-600">Còn lại:</span>
                      <span [class]="getDaysUntilDue(assignment.dueDate) <= 3 ? 'text-red-600 font-medium' : 'text-gray-900'">
                        {{ getDaysUntilDue(assignment.dueDate) }} ngày
                      </span>
                    </div>
                  </div>

                  <!-- Attachments -->
                  @if (assignment.attachments && assignment.attachments.length > 0) {
                    <div class="mb-4">
                      <h4 class="text-sm font-medium text-gray-700 mb-2">Tài liệu đính kèm:</h4>
                      <div class="space-y-2">
                        @for (attachment of assignment.attachments; track attachment.id) {
                          <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <div class="flex items-center space-x-2">
                              <svg class="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                              </svg>
                              <span class="text-sm text-gray-900">{{ attachment.name }}</span>
                              <span class="text-xs text-gray-500">({{ formatFileSize(attachment.size) }})</span>
                            </div>
                            <button (click)="downloadAttachment(attachment)"
                                    class="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm">
                              Tải xuống
                            </button>
                          </div>
                        }
                      </div>
                    </div>
                  }

                  <!-- Grade Display -->
                  @if (assignment.grade !== undefined) {
                    <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <div class="flex items-center justify-between">
                        <div>
                          <h4 class="font-medium text-green-900">Điểm số</h4>
                          <p class="text-green-800">{{ assignment.grade }}/{{ assignment.maxGrade }}</p>
                        </div>
                        <div class="text-right">
                          <p class="text-sm text-green-600">Chấm ngày: {{ formatDate(assignment.gradedAt!) }}</p>
                        </div>
                      </div>
                      @if (assignment.feedback) {
                        <div class="mt-3">
                          <h5 class="font-medium text-green-900 mb-1">Nhận xét:</h5>
                          <p class="text-green-800">{{ assignment.feedback }}</p>
                        </div>
                      }
                    </div>
                  }
                </div>

                <!-- Actions -->
                <div class="flex flex-col space-y-2 ml-6">
                  @if (assignment.status === 'pending' || assignment.status === 'in-progress') {
                    <button (click)="startAssignment(assignment.id)"
                            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                      <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                      </svg>
                      {{ assignment.status === 'pending' ? 'Bắt đầu' : 'Tiếp tục' }}
                    </button>
                  } @else if (assignment.status === 'submitted') {
                    <button (click)="viewSubmission(assignment.id)"
                            class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
                      <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
                      </svg>
                      Xem bài nộp
                    </button>
                  } @else if (assignment.status === 'graded') {
                    <button (click)="viewGrade(assignment.id)"
                            class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
                      <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                      </svg>
                      Xem điểm
                    </button>
                  }
                  
                  <button (click)="viewAssignmentDetail(assignment.id)"
                          class="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                    <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path>
                      <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"></path>
                    </svg>
                    Chi tiết
                  </button>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Empty State -->
        @if (filteredAssignments().length === 0) {
          <div class="text-center py-12">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">Không có bài tập nào</h3>
            <p class="mt-1 text-sm text-gray-500">Bạn chưa có bài tập nào hoặc không có bài tập phù hợp với bộ lọc.</p>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentAssignmentsComponent implements OnInit {
  protected authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private errorService = inject(ErrorHandlingService);

  // Loading state
  isLoading = signal<boolean>(true);

  // Mock assignments data
  assignments = signal<Assignment[]>([
    {
      id: 'assignment-1',
      title: 'Bài tập về Cấu trúc Tàu',
      description: 'Phân tích cấu trúc tàu container và trình bày báo cáo chi tiết về các thành phần chính.',
      courseId: 'course-1',
      courseName: 'Kỹ thuật Tàu biển Cơ bản',
      instructor: {
        name: 'ThS. Nguyễn Văn Hải',
        avatar: 'https://via.placeholder.com/150'
      },
      type: 'assignment',
      status: 'pending',
      priority: 'high',
      dueDate: new Date('2024-09-20'),
      maxGrade: 100,
      attachments: [
        {
          id: 'att-1',
          name: 'Hướng dẫn bài tập.pdf',
          url: '/attachments/assignment-1-guide.pdf',
          type: 'pdf',
          size: 1024000
        }
      ],
      instructions: 'Viết báo cáo phân tích cấu trúc tàu container với tối thiểu 2000 từ, bao gồm hình ảnh minh họa và tài liệu tham khảo.',
      attempts: 0,
      maxAttempts: 3,
      wordCount: 2000,
      fileUploads: []
    },
    {
      id: 'assignment-2',
      title: 'Quiz An toàn Hàng hải',
      description: 'Kiểm tra kiến thức về quy định an toàn hàng hải quốc tế.',
      courseId: 'course-2',
      courseName: 'An toàn Hàng hải',
      instructor: {
        name: 'TS. Phạm Văn Nam',
        avatar: 'https://via.placeholder.com/150'
      },
      type: 'quiz',
      status: 'graded',
      priority: 'medium',
      dueDate: new Date('2024-09-15'),
      submittedAt: new Date('2024-09-14'),
      gradedAt: new Date('2024-09-16'),
      grade: 85,
      maxGrade: 100,
      feedback: 'Bạn đã làm tốt bài quiz này. Cần chú ý thêm về các quy định STCW mới nhất.',
      attachments: [],
      instructions: 'Trả lời 20 câu hỏi trắc nghiệm trong thời gian 30 phút.',
      attempts: 1,
      maxAttempts: 2,
      timeLimit: 30,
      fileUploads: []
    },
    {
      id: 'assignment-3',
      title: 'Dự án Quản lý Cảng',
      description: 'Thiết kế hệ thống quản lý cảng biển hiện đại.',
      courseId: 'course-3',
      courseName: 'Quản lý Cảng biển',
      instructor: {
        name: 'ThS. Trần Thị Lan',
        avatar: 'https://via.placeholder.com/150'
      },
      type: 'project',
      status: 'in-progress',
      priority: 'high',
      dueDate: new Date('2024-09-25'),
      maxGrade: 100,
      attachments: [
        {
          id: 'att-2',
          name: 'Template dự án.docx',
          url: '/attachments/project-template.docx',
          type: 'doc',
          size: 512000
        }
      ],
      instructions: 'Thiết kế hệ thống quản lý cảng với các module chính: quản lý tàu, quản lý hàng hóa, quản lý nhân viên.',
      attempts: 1,
      maxAttempts: 1,
      fileUploads: [
        {
          id: 'file-1',
          name: 'Báo cáo tiến độ.docx',
          url: '/uploads/progress-report.docx',
          uploadedAt: new Date('2024-09-10'),
          size: 256000
        }
      ]
    }
  ]);

  filters: AssignmentFilter = {
    status: [],
    type: [],
    priority: [],
    course: [],
    sortBy: 'dueDate',
    sortOrder: 'asc'
  };

  // Computed values
  pendingAssignments = computed(() => 
    this.assignments().filter(assignment => assignment.status === 'pending')
  );

  submittedAssignments = computed(() => 
    this.assignments().filter(assignment => assignment.status === 'submitted' || assignment.status === 'graded')
  );

  overdueAssignments = computed(() => 
    this.assignments().filter(assignment => 
      assignment.status === 'pending' && this.isOverdue(assignment.dueDate)
    )
  );

  filteredAssignments = computed(() => {
    let assignments = [...this.assignments()];

    // Apply status filter
    if (this.filters.status.length > 0 && this.filters.status[0]) {
      assignments = assignments.filter(assignment => assignment.status === this.filters.status[0]);
    }

    // Apply type filter
    if (this.filters.type.length > 0 && this.filters.type[0]) {
      assignments = assignments.filter(assignment => assignment.type === this.filters.type[0]);
    }

    // Apply priority filter
    if (this.filters.priority.length > 0 && this.filters.priority[0]) {
      assignments = assignments.filter(assignment => assignment.priority === this.filters.priority[0]);
    }

    // Apply sorting
    assignments.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (this.filters.sortBy) {
        case 'title':
          aValue = a.title;
          bValue = b.title;
          break;
        case 'priority':
          const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder];
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder];
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'dueDate':
        default:
          aValue = a.dueDate;
          bValue = b.dueDate;
          break;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return this.filters.sortOrder === 'desc' 
          ? bValue.localeCompare(aValue)
          : aValue.localeCompare(bValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return this.filters.sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
      }
      
      if (aValue instanceof Date && bValue instanceof Date) {
        return this.filters.sortOrder === 'desc' 
          ? bValue.getTime() - aValue.getTime()
          : aValue.getTime() - bValue.getTime();
      }
      
      return 0;
    });

    return assignments;
  });

  ngOnInit(): void {
    this.loadAssignments();
  }

  private async loadAssignments(): Promise<void> {
    try {
      this.isLoading.set(true);
      
      // Simulate loading data
      await this.simulateDataLoading();
      
      // Force change detection to ensure component renders
      this.cdr.markForCheck();
      this.cdr.detectChanges();
      
      console.log('🔧 Student Assignments - Component initialized successfully');
      console.log('🔧 Student Assignments - Assignments count:', this.assignments().length);
      console.log('🔧 Student Assignments - Pending assignments:', this.pendingAssignments().length);
      
      this.errorService.showSuccess('Bài tập đã được tải thành công!', 'assignments');
      
    } catch (error) {
      this.errorService.handleApiError(error, 'assignments');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async simulateDataLoading(): Promise<void> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  applyFilters(): void {
    // Filters are applied automatically through computed signal
    console.log('Applying filters...');
  }

  clearFilters(): void {
    this.filters = {
      status: [],
      type: [],
      priority: [],
      course: [],
      sortBy: 'dueDate',
      sortOrder: 'asc'
    };
  }

  startAssignment(assignmentId: string): void {
    console.log('🔧 Student Assignments - Start assignment:', assignmentId);
    this.router.navigate(['/student/assignments/work', assignmentId]).catch(error => {
      this.errorService.handleNavigationError(error, `/student/assignments/work/${assignmentId}`);
    });
  }

  viewAssignmentDetail(assignmentId: string): void {
    console.log('🔧 Student Assignments - View assignment detail:', assignmentId);
    this.errorService.showInfo('Tính năng xem chi tiết bài tập sẽ được phát triển trong phiên bản tiếp theo', 'assignment');
  }

  viewSubmission(assignmentId: string): void {
    console.log('🔧 Student Assignments - View submission:', assignmentId);
    this.errorService.showInfo('Tính năng xem bài nộp sẽ được phát triển trong phiên bản tiếp theo', 'submission');
  }

  viewGrade(assignmentId: string): void {
    console.log('🔧 Student Assignments - View grade:', assignmentId);
    this.errorService.showInfo('Tính năng xem điểm chi tiết sẽ được phát triển trong phiên bản tiếp theo', 'grade');
  }

  goToCalendar(): void {
    console.log('🔧 Student Assignments - Go to calendar');
    this.errorService.showInfo('Tính năng lịch học tập sẽ được phát triển trong phiên bản tiếp theo', 'calendar');
  }

  goToGrades(): void {
    console.log('🔧 Student Assignments - Go to grades');
    this.router.navigate(['/student/analytics']).catch(error => {
      this.errorService.handleNavigationError(error, '/student/analytics');
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'text-yellow-800 bg-yellow-100';
      case 'in-progress':
        return 'text-blue-800 bg-blue-100';
      case 'submitted':
        return 'text-green-800 bg-green-100';
      case 'graded':
        return 'text-purple-800 bg-purple-100';
      case 'overdue':
        return 'text-red-800 bg-red-100';
      default:
        return 'text-gray-800 bg-gray-100';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'pending':
        return 'Chờ làm';
      case 'in-progress':
        return 'Đang làm';
      case 'submitted':
        return 'Đã nộp';
      case 'graded':
        return 'Đã chấm';
      case 'overdue':
        return 'Quá hạn';
      default:
        return 'Không xác định';
    }
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'high':
        return 'text-red-800 bg-red-100';
      case 'medium':
        return 'text-yellow-800 bg-yellow-100';
      case 'low':
        return 'text-green-800 bg-green-100';
      default:
        return 'text-gray-800 bg-gray-100';
    }
  }

  getPriorityText(priority: string): string {
    switch (priority) {
      case 'high':
        return 'Cao';
      case 'medium':
        return 'Trung bình';
      case 'low':
        return 'Thấp';
      default:
        return 'Không xác định';
    }
  }

  getTypeText(type: string): string {
    switch (type) {
      case 'quiz':
        return 'Quiz';
      case 'assignment':
        return 'Bài tập';
      case 'project':
        return 'Dự án';
      case 'discussion':
        return 'Thảo luận';
      default:
        return 'Không xác định';
    }
  }

  isOverdue(dueDate: Date): boolean {
    return new Date() > dueDate;
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('vi-VN');
  }

  // Enhanced features
  getDaysUntilDue(dueDate: Date): number {
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getUrgencyLevel(assignment: Assignment): 'low' | 'medium' | 'high' | 'critical' {
    const daysUntilDue = this.getDaysUntilDue(assignment.dueDate);
    
    if (assignment.status === 'overdue') return 'critical';
    if (daysUntilDue <= 1) return 'critical';
    if (daysUntilDue <= 3) return 'high';
    if (daysUntilDue <= 7) return 'medium';
    return 'low';
  }

  getUrgencyClass(urgency: string): string {
    switch (urgency) {
      case 'critical':
        return 'text-red-800 bg-red-100 border-red-200';
      case 'high':
        return 'text-orange-800 bg-orange-100 border-orange-200';
      case 'medium':
        return 'text-yellow-800 bg-yellow-100 border-yellow-200';
      case 'low':
        return 'text-green-800 bg-green-100 border-green-200';
      default:
        return 'text-gray-800 bg-gray-100 border-gray-200';
    }
  }

  getUrgencyText(urgency: string): string {
    switch (urgency) {
      case 'critical':
        return 'Khẩn cấp';
      case 'high':
        return 'Cao';
      case 'medium':
        return 'Trung bình';
      case 'low':
        return 'Thấp';
      default:
        return 'Không xác định';
    }
  }

  downloadAttachment(attachment: AssignmentAttachment): void {
    // Simulate file download
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.name;
    link.click();
    this.errorService.showSuccess(`Đang tải xuống: ${attachment.name}`, 'download');
  }

  getTotalAssignments(): number {
    return this.assignments().length;
  }

  getCompletedAssignments(): number {
    return this.assignments().filter(a => a.status === 'graded').length;
  }

  getAverageGrade(): number {
    const gradedAssignments = this.assignments().filter(a => a.grade !== undefined);
    if (gradedAssignments.length === 0) return 0;
    return gradedAssignments.reduce((sum, a) => sum + (a.grade || 0), 0) / gradedAssignments.length;
  }

  getUpcomingAssignments(): Assignment[] {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return this.assignments().filter(assignment => 
      assignment.dueDate >= today && 
      assignment.dueDate <= nextWeek &&
      (assignment.status === 'pending' || assignment.status === 'in-progress')
    );
  }

  getOverdueAssignments(): Assignment[] {
    const today = new Date();
    return this.assignments().filter(assignment => 
      assignment.dueDate < today && 
      (assignment.status === 'pending' || assignment.status === 'in-progress')
    );
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getAssignmentProgress(assignment: Assignment): number {
    if (assignment.status === 'graded') return 100;
    if (assignment.status === 'submitted') return 90;
    if (assignment.status === 'in-progress') return 50;
    return 0;
  }
}