import {
  Component,
  inject,
  OnInit,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { StudentAssignmentService, StudentAssignment, StudentTaskStatus } from '../services/student-assignment.service';
import {
  GroupedAssignments,
  AssignmentStats,
  AssignmentFilters,
  groupTasksByStatus,
  filterAssignments,
  calculateStats,
  formatDeadline,
  formatDeadlineWithExtension,
  getStatusBadge,
  getStatusClass,
  getDeadlineUrgencyClass,
  sortByDueDate,
  getUniqueCourses,
} from './utils/assignment-utils';

/**
 * Student Assignments Page Component
 *
 * Trang hợp nhất hiển thị tất cả bài tập được giao cho học viên.
 * Hỗ trợ 2 chế độ xem: Kanban và List
 * Kết nối với API thực thông qua StudentAssignmentService
 *
 * @requirements 1.1, 2.1, 2.2, 2.3, 3.1, 3.2, 4.1-4.5, 5.1-5.4, 6.1-6.4, 7.1-7.3
 */
@Component({
  selector: 'app-student-assignments-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-white p-6">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Bài tập của tôi</h1>
        <p class="text-gray-600 mt-2">
          Quản lý và theo dõi các bài tập được giao
        </p>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3b82f6]"></div>
          <span class="ml-3 text-gray-600">Đang tải bài tập...</span>
        </div>
      }

      <!-- Error State -->
      @if (error()) {
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div class="flex items-center">
            <svg class="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <span class="text-red-700">{{ error() }}</span>
            <button (click)="loadAssignments()" class="ml-auto px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">
              Thử lại
            </button>
          </div>
        </div>
      }

      @if (!loading()) {
        <!-- Stats Cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div class="bg-[#3b82f6] rounded-lg shadow p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-white/80">Tổng bài tập</p>
                <p class="text-2xl font-bold text-white">{{ stats().total }}</p>
              </div>
              <div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-4 border border-[#3b82f6]">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500">Cần làm</p>
                <p class="text-2xl font-bold text-[#3b82f6]">{{ stats().toDo }}</p>
              </div>
              <div class="w-10 h-10 bg-[#3b82f6]/10 rounded-full flex items-center justify-center">
                <svg class="w-5 h-5 text-[#3b82f6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-4 border border-[#60a5fa]">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500">Hoàn thành</p>
                <p class="text-2xl font-bold text-[#60a5fa]">{{ stats().completed }}</p>
              </div>
              <div class="w-10 h-10 bg-[#60a5fa]/10 rounded-full flex items-center justify-center">
                <svg class="w-5 h-5 text-[#60a5fa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-4" [class.border]="stats().overdue > 0" [class.border-[#93c5fd]]="stats().overdue > 0">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500">Quá hạn</p>
                <p class="text-2xl font-bold" [class.text-[#93c5fd]]="stats().overdue > 0" [class.text-gray-400]="stats().overdue === 0">
                  {{ stats().overdue }}
                </p>
              </div>
              <div class="w-10 h-10 rounded-full flex items-center justify-center"
                   [class.bg-[#93c5fd]/10]="stats().overdue > 0"
                   [class.bg-gray-100]="stats().overdue === 0">
                <svg class="w-5 h-5" [class.text-[#93c5fd]]="stats().overdue > 0" [class.text-gray-400]="stats().overdue === 0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Filters -->
        <div class="bg-white rounded-lg shadow p-4 mb-6">
          <div class="flex flex-wrap gap-4 items-center">
            <div class="flex-1 min-w-[200px]">
              <label class="block text-sm text-gray-600 mb-1">Khóa học</label>
              <select
                [(ngModel)]="selectedCourse"
                (ngModelChange)="onFilterChange()"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] transition-all"
              >
                <option value="">Tất cả khóa học</option>
                @for (course of courses(); track course.id) {
                  <option [value]="course.id">{{ course.title }}</option>
                }
              </select>
            </div>

            <div class="flex-1 min-w-[200px]">
              <label class="block text-sm text-gray-600 mb-1">Trạng thái</label>
              <select
                [(ngModel)]="selectedStatus"
                (ngModelChange)="onFilterChange()"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] transition-all"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="NOT_STARTED">Chưa bắt đầu</option>
                <option value="IN_PROGRESS">Đang làm</option>
                <option value="SUBMITTED">Đã nộp</option>
                <option value="GRADED">Đã chấm</option>
                <option value="OVERDUE">Quá hạn</option>
              </select>
            </div>

            <div class="flex-1 min-w-[200px]">
              <label class="block text-sm text-gray-600 mb-1">Tìm kiếm</label>
              <input
                type="text"
                [(ngModel)]="searchQuery"
                (ngModelChange)="onFilterChange()"
                placeholder="Tìm theo tên bài tập..."
                class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] transition-all"
              />
            </div>

            <div class="flex items-end">
              <button
                (click)="resetFilters()"
                class="px-4 py-2 text-[#3b82f6] hover:bg-[#3b82f6]/10 rounded-lg transition-all"
              >
                Xóa bộ lọc
              </button>
            </div>
          </div>
        </div>

        <!-- View Toggle -->
        <div class="flex justify-between items-center mb-4">
          <span class="text-sm text-gray-600">
            Hiển thị {{ filteredAssignments().length }} bài tập
          </span>
          <div class="bg-white rounded-lg shadow p-1 flex">
            <button
              (click)="setViewMode('kanban')"
              [class.bg-[#3b82f6]]="viewMode() === 'kanban'"
              [class.text-white]="viewMode() === 'kanban'"
              [class.text-gray-600]="viewMode() !== 'kanban'"
              class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Kanban
            </button>
            <button
              (click)="setViewMode('list')"
              [class.bg-[#3b82f6]]="viewMode() === 'list'"
              [class.text-white]="viewMode() === 'list'"
              [class.text-gray-600]="viewMode() !== 'list'"
              class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Danh sách
            </button>
          </div>
        </div>

        <!-- Empty State -->
        @if (filteredAssignments().length === 0 && !loading()) {
          <div class="bg-white rounded-lg shadow p-12 text-center">
            <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            @if (hasActiveFilters()) {
              <h3 class="text-lg font-medium text-gray-900 mb-2">Không tìm thấy bài tập</h3>
              <p class="text-gray-600 mb-4">Không có bài tập nào phù hợp với bộ lọc hiện tại.</p>
              <button (click)="resetFilters()" class="px-4 py-2 bg-[#3b82f6] text-white rounded-lg hover:bg-[#2563eb]">
                Xóa bộ lọc
              </button>
            } @else {
              <h3 class="text-lg font-medium text-gray-900 mb-2">Chưa có bài tập nào</h3>
              <p class="text-gray-600">Bạn chưa được giao bài tập nào. Hãy liên hệ giảng viên để được hỗ trợ.</p>
            }
          </div>
        }

        <!-- Kanban View -->
        @if (viewMode() === 'kanban' && filteredAssignments().length > 0) {
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- To Do Column -->
            <div class="bg-gray-100 rounded-lg p-4">
              <div class="flex items-center justify-between mb-4">
                <h2 class="font-semibold text-gray-700 flex items-center gap-2">
                  <span class="w-3 h-3 bg-[#3b82f6] rounded-full"></span>
                  Cần làm
                </h2>
                <span class="bg-[#3b82f6] text-white px-2 py-1 rounded text-sm">
                  {{ groupedAssignments().toDo.length }}
                </span>
              </div>
              <div class="space-y-3">
                @for (assignment of groupedAssignments().toDo; track assignment.assignmentId) {
                  <div class="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
                    <div class="flex items-start justify-between mb-2">
                      <h3 class="font-medium text-gray-900 text-sm">{{ assignment.assignmentTitle }}</h3>
                      @if (assignment.isIndividual) {
                        <span class="px-2 py-0.5 text-xs bg-[#3b82f6]/10 text-[#3b82f6] rounded">Giao riêng</span>
                      }
                    </div>
                    <p class="text-xs text-gray-500 mb-2">{{ assignment.courseTitle }}</p>
                    <div class="flex items-center justify-between">
                      <span class="text-xs" [class]="getDeadlineClass(assignment)">
                        {{ formatDeadlineDisplay(assignment) }}
                      </span>
                      <a [routerLink]="['/student/assignments', assignment.assignmentId, 'work']"
                         class="text-xs text-[#3b82f6] hover:text-[#2563eb]">
                        Làm bài →
                      </a>
                    </div>
                  </div>
                } @empty {
                  <div class="text-center py-8 text-gray-500">
                    <p class="text-sm">Không có bài tập cần làm</p>
                  </div>
                }
              </div>
            </div>

            <!-- In Progress Column -->
            <div class="bg-gray-100 rounded-lg p-4">
              <div class="flex items-center justify-between mb-4">
                <h2 class="font-semibold text-gray-700 flex items-center gap-2">
                  <span class="w-3 h-3 bg-[#60a5fa] rounded-full"></span>
                  Đang làm
                </h2>
                <span class="bg-[#60a5fa] text-white px-2 py-1 rounded text-sm">
                  {{ groupedAssignments().inProgress.length }}
                </span>
              </div>
              <div class="space-y-3">
                @for (assignment of groupedAssignments().inProgress; track assignment.assignmentId) {
                  <div class="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
                    <div class="flex items-start justify-between mb-2">
                      <h3 class="font-medium text-gray-900 text-sm">{{ assignment.assignmentTitle }}</h3>
                    </div>
                    <p class="text-xs text-gray-500 mb-2">{{ assignment.courseTitle }}</p>
                    <div class="flex items-center justify-between">
                      <span class="text-xs" [class]="getDeadlineClass(assignment)">
                        {{ formatDeadlineDisplay(assignment) }}
                      </span>
                      <a [routerLink]="['/student/assignments', assignment.assignmentId, 'work']"
                         class="text-xs text-[#3b82f6] hover:text-[#2563eb]">
                        Tiếp tục →
                      </a>
                    </div>
                  </div>
                } @empty {
                  <div class="text-center py-8 text-gray-500">
                    <p class="text-sm">Không có bài tập đang làm</p>
                  </div>
                }
              </div>
            </div>

            <!-- Completed Column -->
            <div class="bg-gray-100 rounded-lg p-4">
              <div class="flex items-center justify-between mb-4">
                <h2 class="font-semibold text-gray-700 flex items-center gap-2">
                  <span class="w-3 h-3 bg-[#93c5fd] rounded-full"></span>
                  Hoàn thành
                </h2>
                <span class="bg-[#93c5fd] text-white px-2 py-1 rounded text-sm">
                  {{ groupedAssignments().completed.length }}
                </span>
              </div>
              <div class="space-y-3">
                @for (assignment of groupedAssignments().completed; track assignment.assignmentId) {
                  <div class="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
                    <div class="flex items-start justify-between mb-2">
                      <h3 class="font-medium text-gray-900 text-sm">{{ assignment.assignmentTitle }}</h3>
                      <span [class]="getStatusClassForAssignment(assignment.status)">
                        {{ getStatusLabel(assignment.status) }}
                      </span>
                    </div>
                    <p class="text-xs text-gray-500 mb-2">{{ assignment.courseTitle }}</p>
                    <div class="flex items-center justify-between">
                      @if (assignment.grade !== undefined) {
                        <span class="text-xs font-medium text-[#60a5fa]">
                          Điểm: {{ assignment.grade }}/{{ assignment.maxScore }}
                        </span>
                      } @else {
                        <span class="text-xs text-gray-500">Chờ chấm điểm</span>
                      }
                      <a [routerLink]="['/student/assignments', assignment.assignmentId, 'work']"
                         class="text-xs text-[#3b82f6] hover:text-[#2563eb]">
                        Xem →
                      </a>
                    </div>
                  </div>
                } @empty {
                  <div class="text-center py-8 text-gray-500">
                    <p class="text-sm">Chưa có bài tập hoàn thành</p>
                  </div>
                }
              </div>
            </div>
          </div>
        }

        <!-- List View -->
        @if (viewMode() === 'list' && filteredAssignments().length > 0) {
          <div class="bg-white shadow overflow-hidden">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bài tập</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Khóa học</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hạn nộp</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Điểm</th>
                  <th class="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                @for (assignment of filteredAssignments(); track assignment.assignmentId) {
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-2">
                        <span class="font-medium text-gray-900">{{ assignment.assignmentTitle }}</span>
                        @if (assignment.isIndividual) {
                          <span class="px-2 py-0.5 text-xs bg-[#3b82f6]/10 text-[#3b82f6] rounded">Giao riêng</span>
                        }
                      </div>
                    </td>
                    <td class="px-6 py-4 text-gray-900">{{ assignment.courseTitle }}</td>
                    <td class="px-6 py-4">
                      <span class="text-gray-900" [class]="getDeadlineClass(assignment)">
                        {{ formatDeadlineDisplay(assignment) }}
                      </span>
                    </td>
                    <td class="px-6 py-4">
                      <span [class]="getStatusClassForAssignment(assignment.status)">
                        {{ getStatusLabel(assignment.status) }}
                      </span>
                    </td>
                    <td class="px-6 py-4">
                      @if (assignment.grade !== undefined) {
                        <span class="font-medium text-gray-900">{{ assignment.grade }}/{{ assignment.maxScore }}</span>
                      } @else {
                        <span class="text-gray-400">--</span>
                      }
                    </td>
                    <td class="px-6 py-4 text-right">
                      <a
                        [routerLink]="['/student/assignments', assignment.assignmentId, 'work']"
                        class="text-[#3b82f6] hover:text-[#2563eb]"
                      >
                        {{ getActionLabel(assignment.status) }} →
                      </a>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    </div>
  `,
})
export class StudentAssignmentsPageComponent implements OnInit {
  private authService = inject(AuthService);
  private assignmentService = inject(StudentAssignmentService);

  // State
  allAssignments = signal<StudentAssignment[]>([]);
  courses = signal<{ id: string; title: string }[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  viewMode = signal<'kanban' | 'list'>('kanban');

  // Filters
  selectedCourse = '';
  selectedStatus: StudentTaskStatus | '' = '';
  searchQuery = '';

  // Computed
  filteredAssignments = computed(() => {
    const filters: AssignmentFilters = {};
    
    if (this.selectedCourse) {
      filters.courseId = this.selectedCourse;
    }
    if (this.selectedStatus) {
      filters.status = this.selectedStatus as StudentTaskStatus;
    }
    if (this.searchQuery) {
      filters.searchQuery = this.searchQuery;
    }

    const filtered = filterAssignments(this.allAssignments(), filters);
    return sortByDueDate(filtered);
  });

  groupedAssignments = computed(() => {
    return groupTasksByStatus(this.filteredAssignments());
  });

  stats = computed(() => {
    return calculateStats(this.filteredAssignments());
  });

  ngOnInit(): void {
    this.loadViewPreference();
    this.loadAssignments();
  }

  loadAssignments(): void {
    const user = this.authService.user();
    if (!user?.id) {
      this.error.set('Không thể xác định người dùng');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.assignmentService.getStudentAssignments(user.id).subscribe({
      next: (assignments) => {
        this.allAssignments.set(assignments);
        this.courses.set(getUniqueCourses(assignments));
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading assignments:', err);
        this.error.set('Không thể tải danh sách bài tập. Vui lòng thử lại.');
        this.loading.set(false);
      }
    });
  }

  onFilterChange(): void {
    // Filters are reactive via computed signals
  }

  resetFilters(): void {
    this.selectedCourse = '';
    this.selectedStatus = '';
    this.searchQuery = '';
  }

  hasActiveFilters(): boolean {
    return !!(this.selectedCourse || this.selectedStatus || this.searchQuery);
  }

  setViewMode(mode: 'kanban' | 'list'): void {
    this.viewMode.set(mode);
    this.saveViewPreference(mode);
  }

  private loadViewPreference(): void {
    const saved = localStorage.getItem('student-assignments-view');
    if (saved === 'kanban' || saved === 'list') {
      this.viewMode.set(saved);
    }
  }

  private saveViewPreference(mode: 'kanban' | 'list'): void {
    localStorage.setItem('student-assignments-view', mode);
  }

  // Template helpers
  formatDeadlineDisplay(assignment: StudentAssignment): string {
    return formatDeadlineWithExtension(assignment.dueDate, assignment.personalDeadline);
  }

  getDeadlineClass(assignment: StudentAssignment): string {
    return getDeadlineUrgencyClass(assignment.daysUntilDue);
  }

  getStatusLabel(status: StudentTaskStatus): string {
    return getStatusBadge(status).text;
  }

  getStatusClassForAssignment(status: StudentTaskStatus): string {
    return getStatusClass(status);
  }

  getActionLabel(status: StudentTaskStatus): string {
    switch (status) {
      case 'NOT_STARTED':
        return 'Bắt đầu';
      case 'IN_PROGRESS':
        return 'Tiếp tục';
      case 'SUBMITTED':
      case 'GRADED':
        return 'Xem';
      case 'OVERDUE':
        return 'Nộp muộn';
      default:
        return 'Xem';
    }
  }
}

