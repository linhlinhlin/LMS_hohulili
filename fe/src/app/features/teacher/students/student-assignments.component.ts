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

import { RouterModule } from '@angular/router';
import { DistributionService } from '../../../core/services/distribution.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

export interface StudentAssignment {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  courseId: string;
  courseTitle: string;
  dueDate: string | null;
  personalDeadline?: string;
  submittedAt?: string;
  status: 'pending' | 'submitted' | 'graded' | 'overdue';
  score?: number;
  maxScore: number;
  feedback?: string;
  isIndividual: boolean;
  assignedAt: string;
  assignedBy?: string;
}

@Component({
  selector: 'app-student-assignments',
  imports: [RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">B\u00e0i t\u1eadp c\u1ee7a h\u1ecdc vi\u00ean</h3>
          <p class="text-sm text-gray-500">
            T\u1ed5ng: {{ assignments().length }} b\u00e0i t\u1eadp |
            C\u00e1 nh\u00e2n: {{ individualCount() }} |
            \u0110\u00e3 n\u1ed9p: {{ submittedCount() }}
          </p>
        </div>
        <button
          (click)="onAssignTask()"
          class="px-4 py-2 bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5] transition-colors flex items-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Giao b\u00e0i t\u1eadp
        </button>
      </div>

      <div class="flex gap-2 border-b">
        <button
          (click)="filterType.set('all')"
          class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
          [class.border-[#0056D2]]="filterType() === 'all'"
          [class.text-[#0056D2]]="filterType() === 'all'"
          [class.border-transparent]="filterType() !== 'all'"
          [class.text-gray-500]="filterType() !== 'all'"
        >
          T\u1ea5t c\u1ea3 ({{ assignments().length }})
        </button>
        <button
          (click)="filterType.set('individual')"
          class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
          [class.border-[#0056D2]]="filterType() === 'individual'"
          [class.text-[#0056D2]]="filterType() === 'individual'"
          [class.border-transparent]="filterType() !== 'individual'"
          [class.text-gray-500]="filterType() !== 'individual'"
        >
          C\u00e1 nh\u00e2n ({{ individualCount() }})
        </button>
        <button
          (click)="filterType.set('pending')"
          class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
          [class.border-[#0056D2]]="filterType() === 'pending'"
          [class.text-[#0056D2]]="filterType() === 'pending'"
          [class.border-transparent]="filterType() !== 'pending'"
          [class.text-gray-500]="filterType() !== 'pending'"
        >
          Ch\u01b0a n\u1ed9p ({{ pendingCount() }})
        </button>
        <button
          (click)="filterType.set('graded')"
          class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
          [class.border-[#0056D2]]="filterType() === 'graded'"
          [class.text-[#0056D2]]="filterType() === 'graded'"
          [class.border-transparent]="filterType() !== 'graded'"
          [class.text-gray-500]="filterType() !== 'graded'"
        >
          \u0110\u00e3 ch\u1ea5m ({{ gradedCount() }})
        </button>
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0056D2]"></div>
          <span class="ml-3 text-gray-600">\u0110ang t\u1ea3i...</span>
        </div>
      }

      @if (!loading() && filteredAssignments().length === 0) {
        <div class="text-center py-12 bg-gray-50 rounded-lg">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">Ch\u01b0a c\u00f3 b\u00e0i t\u1eadp</h3>
          <p class="mt-1 text-sm text-gray-500">
            @if (filterType() === 'individual') {
              H\u1ecdc vi\u00ean ch\u01b0a \u0111\u01b0\u1ee3c giao b\u00e0i t\u1eadp c\u00e1 nh\u00e2n n\u00e0o.
            } @else if (filterType() === 'pending') {
              Kh\u00f4ng c\u00f3 b\u00e0i t\u1eadp n\u00e0o \u0111ang ch\u1edd n\u1ed9p.
            } @else if (filterType() === 'graded') {
              Ch\u01b0a c\u00f3 b\u00e0i t\u1eadp n\u00e0o \u0111\u01b0\u1ee3c ch\u1ea5m \u0111i\u1ec3m.
            } @else {
              H\u1ecdc vi\u00ean ch\u01b0a c\u00f3 b\u00e0i t\u1eadp n\u00e0o.
            }
          </p>
          <button
            (click)="onAssignTask()"
            class="mt-4 px-4 py-2 bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5] text-sm"
          >
            Giao b\u00e0i t\u1eadp m\u1edbi
          </button>
        </div>
      }

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
                        C\u00e1 nh\u00e2n
                      </span>
                    }
                    @if (assignment.personalDeadline) {
                      <span class="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                        Gia h\u1ea1n
                      </span>
                    }
                  </div>
                  <p class="text-sm text-gray-600 mt-1">{{ assignment.courseTitle }}</p>

                  <div class="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span class="flex items-center gap-1">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                      H\u1ea1n: {{ formatDate(assignment.personalDeadline || assignment.dueDate) }}
                    </span>
                    @if (assignment.submittedAt) {
                      <span class="flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        N\u1ed9p: {{ formatDate(assignment.submittedAt) }}
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
                  <span
                    class="px-2 py-1 text-xs font-semibold rounded-full"
                    [class.bg-yellow-100]="assignment.status === 'pending'"
                    [class.text-yellow-800]="assignment.status === 'pending'"
                    [class.bg-[#0056D2]/10]="assignment.status === 'submitted'"
                    [class.text-[#004BB5]]="assignment.status === 'submitted'"
                    [class.bg-green-100]="assignment.status === 'graded'"
                    [class.text-green-800]="assignment.status === 'graded'"
                    [class.bg-red-100]="assignment.status === 'overdue'"
                    [class.text-red-800]="assignment.status === 'overdue'"
                  >
                    {{ getStatusText(assignment.status) }}
                  </span>

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

                  <div class="flex gap-2">
                    @if (assignment.status === 'submitted' || assignment.status === 'graded') {
                      <a
                        [routerLink]="['/teacher/assignment-hub', assignment.assignmentId, 'submissions']"
                        class="text-sm text-[#0056D2] hover:text-[#004BB5]"
                      >
                        Xem b\u00e0i n\u1ed9p
                      </a>
                    }
                    @if (assignment.isIndividual && assignment.status === 'pending') {
                      <button
                        (click)="onRemoveAssignment(assignment)"
                        class="text-sm text-red-600 hover:text-red-800"
                      >
                        H\u1ee7y giao
                      </button>
                    }
                  </div>
                </div>
              </div>

              @if (assignment.feedback) {
                <div class="mt-3 p-3 bg-gray-100 rounded-lg">
                  <p class="text-sm text-gray-700">
                    <span class="font-medium">Nh\u1eadn x\u00e9t:</span> {{ assignment.feedback }}
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
  readonly studentId = input.required<string>();
  readonly studentName = input<string>('');

  readonly assignTask = output<void>();
  readonly removeAssignment = output<StudentAssignment>();

  private distributionService = inject(DistributionService);
  private confirmDialog = inject(ConfirmDialogService);

  assignments = signal<StudentAssignment[]>([]);
  loading = signal(false);
  loadError = signal(false);
  filterType = signal<'all' | 'individual' | 'pending' | 'graded'>('all');

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
        const assignments: StudentAssignment[] = tasks.map(task => ({
          id: task.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          assignmentId: task.assignmentId,
          assignmentTitle: task.title || 'B\u00e0i t\u1eadp ch\u01b0a \u0111\u1eb7t t\u00ean',
          courseId: task.courseId,
          courseTitle: task.courseName || 'Kh\u00f3a h\u1ecdc ch\u01b0a x\u00e1c \u0111\u1ecbnh',
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
      error: () => {
        this.assignments.set([]);
        this.loadError.set(true);
        this.loading.set(false);
      }
    });
  }

  onAssignTask(): void {
    this.assignTask.emit();
  }

  async onRemoveAssignment(assignment: StudentAssignment): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'H\u1ee7y giao b\u00e0i t\u1eadp',
      message: `B\u1ea1n c\u00f3 ch\u1eafc mu\u1ed1n h\u1ee7y giao b\u00e0i t\u1eadp "${assignment.assignmentTitle}" cho h\u1ecdc vi\u00ean n\u00e0y?`,
      variant: 'danger',
      confirmText: 'H\u1ee7y giao',
      cancelText: 'Gi\u1eef l\u1ea1i'
    });
    if (!confirmed) return;

    this.removeAssignment.emit(assignment);
    this.assignments.update(current =>
      current.filter(a => a.id !== assignment.id)
    );
  }

  getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      pending: 'Ch\u01b0a n\u1ed9p',
      submitted: '\u0110\u00e3 n\u1ed9p',
      graded: '\u0110\u00e3 ch\u1ea5m',
      overdue: 'Qu\u00e1 h\u1ea1n'
    };
    return statusMap[status] || status;
  }

  getScorePercentage(assignment: StudentAssignment): number {
    if (assignment.score === undefined) return 0;
    return (assignment.score / assignment.maxScore) * 100;
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'Kh\u00f4ng gi\u1edbi h\u1ea1n';
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
