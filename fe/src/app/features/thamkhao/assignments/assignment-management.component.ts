import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TeacherService, TeacherAssignment } from '../services/teacher.service';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

@Component({
  selector: 'app-assignment-management',
  imports: [CommonModule, RouterModule, FormsModule, LoadingComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <!-- Loading State -->
    <app-loading 
      [show]="teacherService.isLoading()" 
      text="Đang tải bài tập..."
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
              <h1 class="text-3xl font-bold text-gray-900 mb-2">📝 Quản lý bài tập</h1>
              <p class="text-gray-600">Tạo và quản lý bài tập cho học viên</p>
            </div>
            <button (click)="createNewAssignment()"
                    class="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105">
              <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path>
              </svg>
              Tạo bài tập mới
            </button>
          </div>
        </div>

        <!-- Stats Overview -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-purple-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Tổng bài tập</p>
                <p class="text-3xl font-bold text-gray-900">{{ totalAssignments() }}</p>
                <p class="text-sm text-purple-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                  </svg>
                  +{{ activeAssignments().length }} đang hoạt động
                </p>
              </div>
              <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-green-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Chờ chấm</p>
                <p class="text-3xl font-bold text-gray-900">{{ pendingGrading() }}</p>
                <p class="text-sm text-green-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                  </svg>
                  Cần xử lý
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
                <p class="text-sm font-medium text-gray-600 mb-1">Tổng nộp bài</p>
                <p class="text-3xl font-bold text-gray-900">{{ totalSubmissions() }}</p>
                <p class="text-sm text-blue-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                  </svg>
                  +{{ recentSubmissions() }} tuần này
                </p>
              </div>
              <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                  <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-orange-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Tỷ lệ nộp bài</p>
                <p class="text-3xl font-bold text-gray-900">{{ submissionRate() }}%</p>
                <p class="text-sm text-orange-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                  </svg>
                  Tốt
                </p>
              </div>
              <div class="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Filter and Search -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div class="flex flex-col md:flex-row gap-4">
            <div class="flex-1">
              <input type="text" 
                     [(ngModel)]="searchQuery"
                     placeholder="Tìm kiếm bài tập..."
                     class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
            </div>
            <div class="flex gap-4">
              <select [(ngModel)]="statusFilter" 
                      class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                <option value="">Tất cả trạng thái</option>
                <option value="draft">Nháp</option>
                <option value="active">Đang hoạt động</option>
                <option value="completed">Hoàn thành</option>
                <option value="graded">Đã chấm</option>
              </select>
              <select [(ngModel)]="typeFilter" 
                      class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                <option value="">Tất cả loại</option>
                <option value="quiz">Quiz</option>
                <option value="assignment">Bài tập</option>
                <option value="project">Dự án</option>
                <option value="discussion">Thảo luận</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Assignments Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          @for (assignment of filteredAssignments(); track assignment.id) {
            <div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
              <!-- Assignment Header -->
              <div class="p-6 border-b border-gray-100">
                <div class="flex items-center justify-between mb-4">
                  <span class="px-3 py-1 text-xs font-medium rounded-full"
                        [class]="getTypeClass(assignment.type)">
                    {{ getTypeText(assignment.type) }}
                  </span>
                  <span class="px-3 py-1 text-xs font-medium rounded-full"
                        [class]="getStatusClass(assignment.status)">
                    {{ getStatusText(assignment.status) }}
                  </span>
                </div>
                <h3 class="text-xl font-semibold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                  {{ assignment.title }}
                </h3>
                <p class="text-gray-600 text-sm mb-4 line-clamp-2">
                  {{ assignment.description }}
                </p>
              </div>

              <!-- Assignment Content -->
              <div class="p-6">
                <!-- Course Info -->
                <div class="flex items-center mb-4">
                  <svg class="w-4 h-4 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                    <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                  </svg>
                  <span class="text-sm text-gray-600">{{ assignment.courseTitle }}</span>
                </div>

                <!-- Due Date -->
                <div class="flex items-center mb-4">
                  <svg class="w-4 h-4 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"></path>
                  </svg>
                  <span class="text-sm text-gray-600">{{ formatDate(assignment.dueDate) }}</span>
                </div>

                <!-- Submission Stats -->
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center">
                    <svg class="w-4 h-4 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 8v1h1.5a.5.5 0 01.5.5v9a.5.5 0 01-.5.5h-13a.5.5 0 01-.5-.5v-9a.5.5 0 01.5-.5H8v-1a5 5 0 00-5 5v1h9.93z"></path>
                    </svg>
                    <span class="text-sm text-gray-600">{{ assignment.submissions }}/{{ assignment.totalStudents }} nộp bài</span>
                  </div>
                  <span class="text-sm font-medium text-gray-900">{{ assignment.maxScore }} điểm</span>
                </div>

                <!-- Progress Bar -->
                <div class="mb-4">
                  <div class="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>Tỷ lệ nộp bài</span>
                    <span>{{ getSubmissionRate(assignment) }}%</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-purple-600 h-2 rounded-full" 
                         [style.width.%]="getSubmissionRate(assignment)"></div>
                  </div>
                </div>

                <!-- Assignment Actions -->
                <div class="flex gap-2">
                  <button (click)="editAssignment(assignment.id)"
                          class="flex-1 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium">
                    Chỉnh sửa
                  </button>
                  <button (click)="viewSubmissions(assignment.id)"
                          class="flex-1 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium">
                    Xem bài nộp
                  </button>
                  <button (click)="deleteAssignment(assignment.id)"
                          class="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Empty State -->
        @if (filteredAssignments().length === 0) {
          <div class="text-center py-12">
            <svg class="w-24 h-24 text-gray-300 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Không có bài tập nào</h3>
            <p class="text-gray-500 mb-6">Bắt đầu tạo bài tập đầu tiên của bạn</p>
            <button (click)="createNewAssignment()"
                    class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              Tạo bài tập mới
            </button>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignmentManagementComponent implements OnInit {
  protected teacherService = inject(TeacherService);
  private router = inject(Router);

  // Filter states
  searchQuery = signal('');
  statusFilter = signal('');
  typeFilter = signal('');

  // Computed properties
  totalAssignments = computed(() => this.teacherService.assignments().length);
  activeAssignments = computed(() => this.teacherService.assignments().filter(a => a.status === 'active'));
  pendingGrading = computed(() => this.teacherService.assignments().filter(a => a.status === 'active' && a.submissions > 0).length);
  
  totalSubmissions = computed(() => 
    this.teacherService.assignments().reduce((sum, assignment) => sum + assignment.submissions, 0)
  );
  
  recentSubmissions = computed(() => {
    // Mock data for recent submissions
    return Math.floor(Math.random() * 10) + 5;
  });
  
  submissionRate = computed(() => {
    const assignments = this.teacherService.assignments();
    if (assignments.length === 0) return 0;
    const totalPossible = assignments.reduce((sum, a) => sum + a.totalStudents, 0);
    const totalSubmitted = assignments.reduce((sum, a) => sum + a.submissions, 0);
    return totalPossible > 0 ? Math.round((totalSubmitted / totalPossible) * 100) : 0;
  });

  filteredAssignments = computed(() => {
    let assignments = this.teacherService.assignments();
    
    // Filter by search query
    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      assignments = assignments.filter(assignment => 
        assignment.title.toLowerCase().includes(query) ||
        assignment.description.toLowerCase().includes(query) ||
        assignment.courseTitle.toLowerCase().includes(query)
      );
    }
    
    // Filter by status
    if (this.statusFilter()) {
      assignments = assignments.filter(assignment => assignment.status === this.statusFilter());
    }
    
    // Filter by type
    if (this.typeFilter()) {
      assignments = assignments.filter(assignment => assignment.type === this.typeFilter());
    }
    
    return assignments;
  });

  ngOnInit(): void {
    this.loadAssignments();
  }

  async loadAssignments(): Promise<void> {
    await this.teacherService.getAssignments();
  }

  createNewAssignment(): void {
    this.router.navigate(['/teacher/assignment-creation']);
  }

  editAssignment(assignmentId: string): void {
    this.router.navigate(['/teacher/assignments', assignmentId, 'edit']);
  }

  viewSubmissions(assignmentId: string): void {
    this.router.navigate(['/teacher/assignments', assignmentId, 'submissions']);
  }

  async deleteAssignment(assignmentId: string): Promise<void> {
    if (confirm('Bạn có chắc chắn muốn xóa bài tập này?')) {
      await this.teacherService.deleteAssignment(assignmentId);
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getSubmissionRate(assignment: TeacherAssignment): number {
    if (assignment.totalStudents === 0) return 0;
    return Math.round((assignment.submissions / assignment.totalStudents) * 100);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'graded':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'draft':
        return 'Nháp';
      case 'active':
        return 'Đang hoạt động';
      case 'completed':
        return 'Hoàn thành';
      case 'graded':
        return 'Đã chấm';
      default:
        return 'Không xác định';
    }
  }

  getTypeClass(type: string): string {
    switch (type) {
      case 'quiz':
        return 'bg-blue-100 text-blue-800';
      case 'assignment':
        return 'bg-green-100 text-green-800';
      case 'project':
        return 'bg-purple-100 text-purple-800';
      case 'discussion':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
}