import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AssignmentApi, AssignmentSummary } from '../../../../api/client/assignment.api';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';

/**
 * Assignment List Component
 * 
 * Displays assignments with grading stats and quick actions.
 * Features: Filter tabs, search, grading badges.
 * 
 * @requirements Expert feedback - Assignment list with grading stats
 */

type AssignmentWithStats = AssignmentSummary;

type FilterType = 'ALL' | 'NEEDS_GRADING' | 'GRADED' | 'DRAFT';

@Component({
  selector: 'app-assignment-list',
  imports: [CommonModule, RouterLink, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3">
      <!-- Toolbar -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
        <div class="flex items-center gap-3 flex-wrap">
          <div class="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg">
            <button (click)="setFilter('ALL')"
                    class="h-7 px-3 rounded-md text-xs font-medium transition-colors"
                    [ngClass]="filter() === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'">
              Tất cả {{ allCount() }}
            </button>
            <button (click)="setFilter('NEEDS_GRADING')"
                    class="h-7 px-3 rounded-md text-xs font-medium transition-colors"
                    [ngClass]="filter() === 'NEEDS_GRADING' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'">
              Cần chấm {{ needsGradingCount() }}
            </button>
            <button (click)="setFilter('GRADED')"
                    class="h-7 px-3 rounded-md text-xs font-medium transition-colors"
                    [ngClass]="filter() === 'GRADED' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'">
              Đã chấm {{ gradedCount() }}
            </button>
            <button (click)="setFilter('DRAFT')"
                    class="h-7 px-3 rounded-md text-xs font-medium transition-colors"
                    [ngClass]="filter() === 'DRAFT' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'">
              Nháp {{ draftCount() }}
            </button>
          </div>

          <div class="flex items-center gap-1.5">
            <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700">Theo lớp {{ classroomAssignments().length }}</span>
            <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-[#0056D2]">Toàn khóa học {{ courseAssignments().length }}</span>
            @if (unassignedAssignments().length > 0) {
              <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700">Chưa phân phối {{ unassignedAssignments().length }}</span>
            }
          </div>
        </div>

        <div class="flex items-center gap-2">
          <div class="relative">
            <lucide-icon name="search" [size]="14" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"></lucide-icon>
            <input type="text" [value]="searchQuery()" (input)="searchQuery.set($any($event.target).value)"
                   aria-label="Tìm bài tập"
                   placeholder="Tìm bài tập..."
                   class="h-8 w-52 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-[#0056D2]/10 focus:border-[#0056D2] outline-none"/>
            @if (searchQuery()) {
              <button (click)="searchQuery.set('')" class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500">
                <lucide-icon name="x" [size]="12"></lucide-icon>
              </button>
            }
          </div>
          <a routerLink="create"
             class="h-8 px-3.5 bg-[#0056D2] text-white rounded-lg text-xs font-semibold hover:bg-[#004BB5] transition-colors flex items-center gap-1.5">
            <lucide-icon name="plus" [size]="14"></lucide-icon>
            Tạo bài tập
          </a>
        </div>
      </div>

      <!-- Content -->
      @if (loading()) {
        <div class="space-y-2">
          @for (i of [1,2,3,4]; track i) {
            <div class="bg-white rounded-lg border border-slate-200 px-4 py-3 animate-pulse">
              <div class="flex items-center gap-4">
                <div class="h-4 bg-slate-100 rounded w-1/4"></div>
                <div class="h-4 bg-slate-50 rounded w-1/6"></div>
              </div>
            </div>
          }
        </div>
      } @else if (filteredAssignments().length === 0) {
        <div class="bg-white rounded-lg border border-dashed border-slate-200 py-12 text-center">
          <lucide-icon name="clipboard-list" [size]="32" class="mx-auto mb-3 text-slate-300"></lucide-icon>
          <p class="text-sm font-medium text-slate-500 mb-4">Chưa có bài tập nào</p>
          <a routerLink="create" class="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0056D2] text-white rounded-lg text-xs font-semibold hover:bg-[#004BB5] transition-colors">
            <lucide-icon name="plus" [size]="14"></lucide-icon>
            Tạo bài tập
          </a>
        </div>
      } @else {
        <div class="space-y-4">
          @if (classroomAssignments().length > 0) {
            <section>
              <div class="flex items-center gap-2 py-1.5">
                <h3 class="text-xs font-semibold uppercase tracking-wide text-emerald-600">Theo lớp</h3>
                <span class="text-xs text-slate-500">{{ classroomAssignments().length }}</span>
              </div>
              <div class="space-y-1">
                @for (assignment of classroomAssignments(); track assignment.id) {
                  <ng-container *ngTemplateOutlet="assignmentRow; context: { assignment: assignment }"></ng-container>
                }
              </div>
            </section>
          }

          @if (courseAssignments().length > 0) {
            <section>
              <div class="flex items-center gap-2 py-1.5">
                <h3 class="text-xs font-semibold uppercase tracking-wide text-[#0056D2]">Toàn khóa học</h3>
                <span class="text-xs text-slate-500">{{ courseAssignments().length }}</span>
              </div>
              <div class="space-y-1">
                @for (assignment of courseAssignments(); track assignment.id) {
                  <ng-container *ngTemplateOutlet="assignmentRow; context: { assignment: assignment }"></ng-container>
                }
              </div>
            </section>
          }

          @if (unassignedAssignments().length > 0) {
            <section>
              <div class="flex items-center gap-2 py-1.5">
                <h3 class="text-xs font-semibold uppercase tracking-wide text-amber-600">Chưa phân phối</h3>
                <span class="text-xs text-slate-500">{{ unassignedAssignments().length }}</span>
              </div>
              <div class="space-y-1">
                @for (assignment of unassignedAssignments(); track assignment.id) {
                  <ng-container *ngTemplateOutlet="assignmentRow; context: { assignment: assignment }"></ng-container>
                }
              </div>
            </section>
          }
        </div>
      }

      @if (error()) {
        <div class="mt-3 p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg flex items-center gap-2 text-sm">
          <lucide-icon name="alert-circle" [size]="16"></lucide-icon>
          {{ error() }}
        </div>
      }
    </div>

    <ng-template #assignmentRow let-assignment="assignment">
      <div class="bg-white rounded-lg border border-slate-200 hover:bg-slate-50/50 transition-colors cursor-pointer group focus-within:ring-2 focus-within:ring-[#0056D2]/15"
           role="link"
           tabindex="0"
           [attr.aria-label]="'Mở bài tập ' + assignment.title"
           (click)="navigateToAssignment(assignment.id)"
           (keydown.enter)="navigateToAssignment(assignment.id)"
           (keydown.space)="onAssignmentRowSpace($event, assignment.id)">
        <div class="flex items-center gap-4 px-4 py-2.5">
          <!-- Title + status -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="text-sm font-semibold text-slate-900 truncate group-hover:text-[#0056D2] transition-colors">{{ assignment.title }}</h3>
              <span class="px-1.5 py-0.5 text-[10px] font-semibold rounded shrink-0"
                    [ngClass]="getStatusClass(assignment.status)">
                {{ getStatusText(assignment.status) }}
              </span>
            </div>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-xs text-slate-500">{{ assignment.courseTitle }}</span>
              <span class="text-slate-300">&middot;</span>
              <span class="text-xs font-medium"
                    [ngClass]="getDeliveryBadgeClass(assignment.deliveryMode).includes('emerald') ? 'text-emerald-600' : 'text-[#0056D2]'">
                {{ getAudienceLabel(assignment) }}
              </span>
            </div>
          </div>

          <!-- Metrics -->
          <div class="hidden sm:flex items-center gap-3 shrink-0 text-xs text-slate-500">
            <span class="font-medium">{{ assignment.submissionsCount }}/{{ assignment.totalStudents }} nộp</span>
            @if (assignment.pendingCount && assignment.pendingCount > 0) {
              <span class="font-semibold text-orange-600">{{ assignment.pendingCount }} chấm</span>
            }
            @if (hasAverageScore(assignment)) {
              <span class="text-purple-600 font-medium">{{ assignment.averageScore | number:'1.0-0' }}%</span>
            }
          </div>

          <!-- Due date -->
          <div class="shrink-0 text-xs text-right w-20"
               [ngClass]="isOverdue(assignment.dueDate) ? 'text-rose-500 font-semibold' : 'text-slate-400'">
            {{ formatDate(assignment.dueDate) }}
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1 shrink-0 md:opacity-0 md:group-hover:opacity-100 md:transition-opacity">
            <a [routerLink]="[assignment.id, 'settings']"
               (click)="$event.stopPropagation()"
               aria-label="Chỉnh sửa bài tập"
               class="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-[#0056D2] hover:bg-blue-50 focus:ring-2 focus:ring-[#0056D2]/20 focus:outline-none transition-colors">
              <lucide-icon name="edit-3" [size]="14"></lucide-icon>
            </a>
            <button (click)="deleteAssignment(assignment.id, $event)"
                    aria-label="Xóa bài tập"
                    class="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 focus:ring-2 focus:ring-rose-200 focus:outline-none transition-colors">
              <lucide-icon name="trash-2" [size]="14"></lucide-icon>
            </button>
          </div>
        </div>
      </div>
    </ng-template>
  `
})
export class AssignmentListComponent implements OnInit {
  private assignmentApi = inject(AssignmentApi);
  private confirmDialog = inject(ConfirmDialogService);

  loading = signal(false);
  assignments = signal<AssignmentWithStats[]>([]);
  filter = signal<FilterType>('ALL');
  searchQuery = signal('');

  // Computed
  filteredAssignments = computed(() => {
    let result = this.assignments();

    // Apply filter
    switch (this.filter()) {
      case 'NEEDS_GRADING':
        result = result.filter(a => (a.pendingCount || 0) > 0);
        break;
      case 'GRADED':
        result = result.filter(a => {
          const s = a.status?.toLowerCase() || '';
          return s === 'closed' || ((a.pendingCount || 0) === 0 && a.submissionsCount > 0);
        });
        break;
      case 'DRAFT':
        result = result.filter(a => {
          const s = a.status?.toLowerCase() || '';
          return s === 'draft' || s === 'pending';
        });
        break;
    }

    // Apply search
    const searchTerm = this.searchQuery();
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      result = result.filter(a =>
        a.title.toLowerCase().includes(query) ||
        a.courseTitle?.toLowerCase().includes(query)
      );
    }

    return result;
  });

  classroomAssignments = computed(() =>
    this.filteredAssignments().filter(assignment => this.getOperationalBucket(assignment) === 'CLASSROOM')
  );

  courseAssignments = computed(() =>
    this.filteredAssignments().filter(assignment => this.getOperationalBucket(assignment) === 'COURSE')
  );

  unassignedAssignments = computed(() =>
    this.filteredAssignments().filter(assignment => this.getOperationalBucket(assignment) === 'UNASSIGNED')
  );

  allCount = computed(() => this.assignments().length);

  needsGradingCount = computed(() =>
    this.assignments().filter(a => (a.pendingCount || 0) > 0).length
  );

  gradedCount = computed(() =>
    this.assignments().filter(a => {
      const s = a.status?.toLowerCase() || '';
      return s === 'closed' || ((a.pendingCount || 0) === 0 && a.submissionsCount > 0);
    }).length
  );

  draftCount = computed(() =>
    this.assignments().filter(a => {
      const s = a.status?.toLowerCase() || '';
      return s === 'draft' || s === 'pending';
    }).length
  );

  private router = inject(Router);

  getCompletedCount(): number {
    return this.assignments().filter(a => (a.pendingCount || 0) === 0 && a.status !== 'pending').length;
  }

  getAverageScore(): number {
    const withScores = this.assignments().filter(a => a.averageScore !== undefined);
    if (withScores.length === 0) return 0;
    return withScores.reduce((sum, a) => sum + (a.averageScore || 0), 0) / withScores.length;
  }

  navigateToAssignment(id: string): void {
    this.router.navigate(['/teacher/assessments/classes/assignments', id, 'overview']);
  }

  onAssignmentRowSpace(event: Event, id: string): void {
    event.preventDefault();
    this.navigateToAssignment(id);
  }

  async deleteAssignment(id: string, event: Event): Promise<void> {
    event.stopPropagation();
    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa bài tập',
      message: 'Bạn có chắc chắn muốn xóa bài tập này không? Hành động này không thể hoàn tác.',
      variant: 'danger',
      confirmText: 'Xóa',
      cancelText: 'Hủy'
    });
    if (!confirmed) return;

    this.assignmentApi.deleteAssignment(id).subscribe({
      next: () => {
        // Remove from local list to avoid full reload flicker
        this.assignments.update(current => current.filter(a => a.id !== id));
      },
      error: (err) => {
        this.error.set('Không thể xóa bài tập. ' + (err.error?.message || 'Vui lòng thử lại.'));
      }
    });
  }

  error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadAssignments();
  }

  loadAssignments(): void {
    this.loading.set(true);
    this.error.set(null);

    this.assignmentApi.getTeacherAssignments().subscribe({
      next: (response) => {
        const data: AssignmentWithStats[] = response.data || [];
        // Normalize status to lowercase for consistent FE comparison
        const normalized = data.map(a => ({
          ...a,
          status: (a.status?.toLowerCase() || 'draft') as AssignmentSummary['status']
        }));
        this.assignments.set(normalized);
      },
      error: () => {
        this.error.set('Không thể tải danh sách bài tập. Vui lòng thử lại.');
        this.assignments.set([]);
      },
      complete: () => {
        this.loading.set(false);
      }
    });
  }

  setFilter(filter: FilterType): void {
    this.filter.set(filter);
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'Không giới hạn';
    return new Date(dateString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  isOverdue(dateString?: string): boolean {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  }

  getStatusClass(status: string): string {
    const s = status?.toLowerCase() || '';
    const classes: Record<string, string> = {
      'published': 'bg-blue-50 text-blue-700 border-blue-100',
      'draft': 'bg-slate-50 text-slate-600 border-slate-200',
      'pending': 'bg-orange-50 text-orange-700 border-orange-100',
      'closed': 'bg-rose-50 text-rose-700 border-rose-100'
    };
    return classes[s] || 'bg-slate-50 text-slate-600 border-slate-200';
  }

  getStatusText(status: string): string {
    const s = status?.toLowerCase() || '';
    const texts: Record<string, string> = {
      'published': 'Đang mở',
      'draft': 'Bản nháp',
      'pending': 'Bản nháp',
      'closed': 'Đã đóng'
    };
    return texts[s] || status;
  }

  getDeliveryLabel(deliveryMode?: string): string {
    return deliveryMode === 'INSTRUCTOR_LED' ? 'Theo lớp' : 'Toàn khóa học';
  }

  getDeliveryBadgeClass(deliveryMode?: string): string {
    return deliveryMode === 'INSTRUCTOR_LED'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : 'bg-blue-50 text-[#0056D2] border-blue-100';
  }

  getAudienceLabel(assignment: AssignmentSummary): string {
    if (assignment.distributionType === 'CLASS' && assignment.className) {
      return assignment.className;
    }

    if (assignment.distributionType === 'SPECIFIC_STUDENTS') {
      return `${assignment.totalStudents || 0} học viên chỉ định`;
    }

    return assignment.deliveryMode === 'INSTRUCTOR_LED'
      ? 'Toàn bộ học viên trong khóa học'
      : 'Toàn bộ học viên đã ghi danh';
  }

  getAudienceBadgeClass(assignment: AssignmentSummary): string {
    switch (assignment.distributionType) {
      case 'CLASS':
        return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'SPECIFIC_STUDENTS':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      default:
        return assignment.deliveryMode === 'INSTRUCTOR_LED'
          ? 'bg-slate-50 text-slate-700 border-slate-200'
          : 'bg-blue-50 text-[#0056D2] border-blue-100';
    }
  }

  hasAverageScore(assignment: AssignmentSummary): boolean {
    return typeof assignment.averageScore === 'number' && Number.isFinite(assignment.averageScore);
  }

  private getOperationalBucket(assignment: AssignmentSummary): 'CLASSROOM' | 'COURSE' | 'UNASSIGNED' {
    if (assignment.deliveryMode === 'SELF_PACED' || assignment.distributionType === 'ALL_STUDENTS') {
      return 'COURSE';
    }

    if (assignment.distributionType === 'CLASS' || assignment.distributionType === 'SPECIFIC_STUDENTS') {
      return 'CLASSROOM';
    }

    return 'UNASSIGNED';
  }

}
