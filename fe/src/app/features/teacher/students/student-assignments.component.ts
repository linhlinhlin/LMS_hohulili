/**
 * Student Assignments Tab Component
 *
 * Hiển thị danh sách bài tập của học viên và cho phép giao bài tập riêng.
 * Features:
 * - Hiển thị tất cả bài tập được giao cho học viên
 * - Phân biệt bài tập cá nhân vs bài tập chung
 * - Button "Giao bài tập" để mở modal
 * - Hiển thị trạng thái, điểm, deadline
 *
 * @requirements 2.1, 2.5
 */
import {
  Component,
  input,
  output,
  signal,
  computed,
  ChangeDetectionStrategy,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DistributionService } from '../../../core/services/distribution.service';

export interface StudentAssignment {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  courseId: string;
  courseTitle: string;
  dueDate: string | null;
  personalDeadline?: string; // Override deadline
  submittedAt?: string;
  status: 'pending' | 'submitted' | 'graded' | 'overdue';
  score?: number;
  maxScore: number;
  feedback?: string;
  isIndividual: boolean; // True nếu là bài tập được giao riêng
  assignedAt: string;
  assignedBy?: string;
}

@Component({
  selector: 'app-student-assignments',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">Bài tập của học viên</h3>
          <p class="text-sm text-gray-500">
            Tổng: {{ assignments().length }} bài tập | 
            Cá nhân: {{ individualCount() }} | 
            Đã nộp: {{ submittedCount() }}
          </p>
        </div>
        <button
          (click)="onAssignTask()"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Giao bài tập
        </button>
      </div>

      <!-- Filter Tabs -->
      <div class="flex gap-2 border-b">
        <button
          (click)="filterType.set('all')"
          class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
          [class.border-blue-600]="filterType() === 'all'"
          [class.text-blue-600]="filterType() === 'all'"
          [class.border-transparent]="filterType() !== 'all'"
          [class.text-gray-500]="filterType() !== 'all'"
        >
          Tất cả ({{ assignments().length }})
        </button>
        <button
          (click)="filterType.set('individual')"
          class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
          [class.border-blue-600]="filterType() === 'individual'"
          [class.text-blue-600]="filterType() === 'individual'"
          [class.border-transparent]="filterType() !== 'individual'"
          [class.text-gray-500]="filterType() !== 'individual'"
        >
          Cá nhân ({{ individualCount() }})
        </button>
        <button
          (click)="filterType.set('pending')"
          class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
          [class.border-blue-600]="filterType() === 'pending'"
          [class.text-blue-600]="filterType() === 'pending'"
          [class.border-transparent]="filterType() !== 'pending'"
          [class.text-gray-500]="filterType() !== 'pending'"
        >
          Chưa nộp ({{ pendingCount() }})
        </button>
        <button
          (click)="filterType.set('graded')"
          class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
          [class.border-blue-600]="filterType() === 'graded'"
          [class.text-blue-600]="filterType() === 'graded'"
          [class.border-transparent]="filterType() !== 'graded'"
          [class.text-gray-500]="filterType() !== 'graded'"
        >
          Đã chấm ({{ gradedCount() }})
        </button>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span class="ml-3 text-gray-600">Đang tải...</span>
        </div>
      }

      <!-- Empty State -->
      @if (!loading() && filteredAssignments().length === 0) {
        <div class="text-center py-12 bg-gray-50 rounded-lg">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">Chưa có bài tập</h3>
          <p class="mt-1 text-sm text-gray-500">
            @if (filterType() === 'individual') {
              Học viên chưa được giao bài tập cá nhân nào.
            } @else if (filterType() === 'pending') {
              Không có bài tập nào đang chờ nộp.
            } @else if (filterType() === 'graded') {
              Chưa có bài tập nào được chấm điểm.
            } @else {
              Học viên chưa có bài tập nào.
            }
          </p>
          <button
            (click)="onAssignTask()"
            class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Giao bài tập mới
          </button>
        </div>
      }

      <!-- Assignment List -->
      @if (!loading() && filteredAssignments().length > 0) {
        <div class="space-y-3">
          @for (assignment of filteredAssignments(); track assignment.id) {
            <div 
              class="border rounded-lg p-4 hover:shadow-md transition-shadow"
              [class.border-purple-200]="assignment.isIndividual"
              [class.bg-purple-50]="assignment.isIndividual"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <h4 class="font-medium text-gray-900">{{ assignment.assignmentTitle }}</h4>
                    @if (assignment.isIndividual) {
                      <span class="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                        Cá nhân
                      </span>
                    }
                    @if (assignment.personalDeadline) {
                      <span class="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                        Gia hạn
                      </span>
                    }
                  </div>
                  <p class="text-sm text-gray-600 mt-1">{{ assignment.courseTitle }}</p>
                  
                  <div class="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span class="flex items-center gap-1">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                      Hạn: {{ formatDate(assignment.personalDeadline || assignment.dueDate) }}
                    </span>
                    @if (assignment.submittedAt) {
                      <span class="flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        Nộp: {{ formatDate(assignment.submittedAt) }}
                      </span>
                    }
                    <span class="flex items-center gap-1">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      Giao: {{ formatDate(assignment.assignedAt) }}
                    </span>
                  </div>
                </div>

                <div class="flex flex-col items-end gap-2">
                  <!-- Status Badge -->
                  <span 
                    class="px-2 py-1 text-xs font-semibold rounded-full"
                    [class.bg-yellow-100]="assignment.status === 'pending'"
                    [class.text-yellow-800]="assignment.status === 'pending'"
                    [class.bg-blue-100]="assignment.status === 'submitted'"
                    [class.text-blue-800]="assignment.status === 'submitted'"
                    [class.bg-green-100]="assignment.status === 'graded'"
                    [class.text-green-800]="assignment.status === 'graded'"
                    [class.bg-red-100]="assignment.status === 'overdue'"
                    [class.text-red-800]="assignment.status === 'overdue'"
                  >
                    {{ getStatusText(assignment.status) }}
                  </span>

                  <!-- Score -->
                  @if (assignment.score !== undefined) {
                    <div class="text-right">
                      <span 
                        class="text-lg font-bold"
                        [class.text-green-600]="getScorePercentage(assignment) >= 80"
                        [class.text-yellow-600]="getScorePercentage(assignment) >= 50 && getScorePercentage(assignment) < 80"
                        [class.text-red-600]="getScorePercentage(assignment) < 50"
                      >
                        {{ assignment.score }}
                      </span>
                      <span class="text-gray-500">/{{ assignment.maxScore }}</span>
                    </div>
                  }

                  <!-- Actions -->
                  <div class="flex gap-2">
                    @if (assignment.status === 'submitted' || assignment.status === 'graded') {
                      <a
                        [routerLink]="['/teacher/assignment-hub', assignment.assignmentId, 'submissions']"
                        class="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Xem bài nộp
                      </a>
                    }
                    @if (assignment.isIndividual && assignment.status === 'pending') {
                      <button
                        (click)="onRemoveAssignment(assignment)"
                        class="text-sm text-red-600 hover:text-red-800"
                      >
                        Hủy giao
                      </button>
                    }
                  </div>
                </div>
              </div>

              <!-- Feedback -->
              @if (assignment.feedback) {
                <div class="mt-3 p-3 bg-gray-100 rounded-lg">
                  <p class="text-sm text-gray-700">
                    <span class="font-medium">Nhận xét:</span> {{ assignment.feedback }}
                  </p>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class StudentAssignmentsComponent implements OnInit {
  // Signal inputs (Angular v20+)
  readonly studentId = input.required<string>();
  readonly studentName = input<string>('');

  // Output functions (Angular v20+)
  readonly assignTask = output<void>();
  readonly removeAssignment = output<StudentAssignment>();

  private distributionService = inject(DistributionService);

  // State
  assignments = signal<StudentAssignment[]>([]);
  loading = signal(false);
  filterType = signal<'all' | 'individual' | 'pending' | 'graded'>('all');

  // Computed
  filteredAssignments = computed(() => {
    const type = this.filterType();
    const all = this.assignments();

    switch (type) {
      case 'individual':
        return all.filter(a => a.isIndividual);
      case 'pending':
        return all.filter(a => a.status === 'pending' || a.status === 'overdue');
      case 'graded':
        return all.filter(a => a.status === 'graded');
      default:
        return all;
    }
  });

  individualCount = computed(() => this.assignments().filter(a => a.isIndividual).length);
  submittedCount = computed(() => this.assignments().filter(a => a.status === 'submitted' || a.status === 'graded').length);
  pendingCount = computed(() => this.assignments().filter(a => a.status === 'pending' || a.status === 'overdue').length);
  gradedCount = computed(() => this.assignments().filter(a => a.status === 'graded').length);

  ngOnInit(): void {
    this.loadAssignments();
  }

  private loadAssignments(): void {
    this.loading.set(true);

    this.distributionService.getStudentTasks(this.studentId()).subscribe({
      next: (tasks) => {
        // Convert tasks to StudentAssignment format
        const assignments: StudentAssignment[] = tasks.map(task => ({
          id: task.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          assignmentId: task.assignmentId,
          assignmentTitle: task.title || 'Untitled Assignment',
          courseId: task.courseId,
          courseTitle: task.courseName || 'Unknown Course',
          dueDate: task.dueDate,
          personalDeadline: task.personalDeadline,
          submittedAt: task.submittedAt,
          status: task.status as 'pending' | 'submitted' | 'graded' | 'overdue',
          score: task.grade,
          maxScore: task.maxScore || 100,
          feedback: task.feedback,
          isIndividual: task.isIndividual || false,
          assignedAt: task.assignedAt || new Date().toISOString(),
          assignedBy: task.assignedBy
        }));

        this.assignments.set(assignments);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading student assignments:', error);
        // Load mock data for development
        this.loadMockData();
        this.loading.set(false);
      }
    });
  }

  private loadMockData(): void {
    const mockAssignments: StudentAssignment[] = [
      {
        id: '1',
        assignmentId: 'a1',
        assignmentTitle: 'Bài tập An toàn Hàng hải - Chương 1',
        courseId: 'c1',
        courseTitle: 'An toàn Hàng hải Cơ bản',
        dueDate: '2025-11-30T23:59:59Z',
        submittedAt: '2025-11-28T14:30:00Z',
        status: 'graded',
        score: 85,
        maxScore: 100,
        feedback: 'Bài làm tốt, cần chú ý thêm về phần SOLAS',
        isIndividual: false,
        assignedAt: '2025-11-01T00:00:00Z'
      },
      {
        id: '2',
        assignmentId: 'a2',
        assignmentTitle: 'Bài tập bổ sung - Điều hướng',
        courseId: 'c2',
        courseTitle: 'Điều hướng Maritime',
        dueDate: '2025-12-05T23:59:59Z',
        personalDeadline: '2025-12-10T23:59:59Z',
        status: 'pending',
        maxScore: 100,
        isIndividual: true,
        assignedAt: '2025-11-25T10:00:00Z',
        assignedBy: 'Giảng viên Nguyễn Văn A'
      },
      {
        id: '3',
        assignmentId: 'a3',
        assignmentTitle: 'Thực hành Radar',
        courseId: 'c2',
        courseTitle: 'Điều hướng Maritime',
        dueDate: '2025-12-01T23:59:59Z',
        submittedAt: '2025-11-30T20:15:00Z',
        status: 'submitted',
        maxScore: 100,
        isIndividual: false,
        assignedAt: '2025-11-15T00:00:00Z'
      }
    ];

    this.assignments.set(mockAssignments);
  }

  onAssignTask(): void {
    this.assignTask.emit();
  }

  onRemoveAssignment(assignment: StudentAssignment): void {
    if (confirm(`Bạn có chắc muốn hủy giao bài tập "${assignment.assignmentTitle}" cho học viên này?`)) {
      this.removeAssignment.emit(assignment);
      // Remove from local state
      this.assignments.update(current =>
        current.filter(a => a.id !== assignment.id)
      );
    }
  }

  getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'Chưa nộp',
      'submitted': 'Đã nộp',
      'graded': 'Đã chấm',
      'overdue': 'Quá hạn'
    };
    return statusMap[status] || status;
  }

  getScorePercentage(assignment: StudentAssignment): number {
    if (assignment.score === undefined) return 0;
    return (assignment.score / assignment.maxScore) * 100;
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'Không giới hạn';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  refresh(): void {
    this.loadAssignments();
  }
}
