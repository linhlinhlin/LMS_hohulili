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
    <div class="min-h-screen bg-slate-50/50">
      <!-- Header Section -->
      <div class="bg-white border-b border-slate-200">
        <div class="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 class="text-2xl font-black text-slate-900 tracking-tight">Quản lý Bài tập</h1>
              <p class="text-sm text-slate-500 font-medium">Tạo, quản lý và chấm điểm bài tập cho học viên</p>
            </div>
            <div class="flex items-center gap-3">
              <a routerLink="rubrics" 
                 class="h-10 px-4 border border-slate-200 rounded-xl bg-white text-slate-600 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-2 shadow-sm">
                <lucide-icon name="clipboard-check" [size]="16"></lucide-icon>
                Thư viện Rubric
              </a>
              <a routerLink="create" 
                 class="h-10 px-4 bg-[#0056D2] text-white rounded-xl font-bold text-sm hover:bg-[#004BB5] transition-all flex items-center gap-2 shadow-md shadow-blue-100">
                <lucide-icon name="plus" [size]="18"></lucide-icon>
                Tạo bài tập mới
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="max-w-screen-2xl mx-auto p-3 sm:px-4">
        
        <!-- Filters & Search Toolbar -->
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <!-- Filter Tabs -->
          <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
            <button (click)="setFilter('ALL')" 
                    [class]="filter() === 'ALL' ? 'bg-white text-[#0056D2] shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                    class="h-9 px-5 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
              Tất cả ({{ allCount() }})
            </button>
            <button (click)="setFilter('NEEDS_GRADING')"
                    [class]="filter() === 'NEEDS_GRADING' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                    class="h-9 px-5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2">
              Cần chấm ({{ needsGradingCount() }})
            </button>
            <button (click)="setFilter('GRADED')"
                    [class]="filter() === 'GRADED' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                    class="h-9 px-5 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
              Đã chấm ({{ gradedCount() }})
            </button>
            <button (click)="setFilter('DRAFT')"
                    [class]="filter() === 'DRAFT' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                    class="h-9 px-5 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
              Bản nháp ({{ draftCount() }})
            </button>
          </div>

          <!-- Search Input -->
          <div class="relative group max-w-sm w-full">
            <div class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0056D2] transition-colors">
              <lucide-icon name="search" [size]="16"></lucide-icon>
            </div>
            <input type="text" [value]="searchQuery()" (input)="searchQuery.set($any($event.target).value)" 
                   placeholder="Tìm kiếm bài tập..."
                   class="w-full h-10 pl-10 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:bg-white focus:ring-4 focus:ring-[#0056D2]/5 focus:border-[#0056D2] outline-none transition-all placeholder:text-slate-400 font-bold shadow-inner"/>
            @if (searchQuery()) {
              <button (click)="searchQuery.set('')" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors">
                <lucide-icon name="x" [size]="14"></lucide-icon>
              </button>
            }
          </div>
        </div>

        <!-- Content Area -->
        @if (loading()) {
          <div class="grid grid-cols-1 gap-4">
            @for (i of [1,2,3,4]; track i) {
              <div class="bg-white rounded-xl border border-slate-100 p-5 animate-pulse">
                <div class="flex gap-4">
                  <div class="w-12 h-12 bg-slate-100 rounded-xl"></div>
                  <div class="flex-grow space-y-3">
                    <div class="h-5 bg-slate-100 rounded-md w-1/3"></div>
                    <div class="h-3 bg-slate-50 rounded-md w-1/2"></div>
                  </div>
                </div>
              </div>
            }
          </div>
        } @else {
          <!-- Assignment Cards -->
          <div class="grid grid-cols-1 gap-4">
            @for (assignment of filteredAssignments(); track assignment.id) {
              <div class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all group overflow-hidden flex flex-col sm:flex-row cursor-pointer"
                   (click)="navigateToAssignment(assignment.id)">
                
                <!-- Main Info -->
                <div class="p-6 flex-grow min-w-0">
                  <div class="flex flex-col h-full justify-center gap-3">
                    <!-- Row 1: Title + Due Date -->
                    <div class="flex items-center justify-between gap-4">
                      <div class="flex items-center gap-3 min-w-0">
                        <h3 class="text-lg font-black text-slate-900 tracking-tight truncate group-hover:text-[#0056D2] transition-colors">{{ assignment.title }}</h3>
                        <span class="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border shadow-sm flex-shrink-0"
                              [class]="getStatusClass(assignment.status)">
                          {{ getStatusText(assignment.status) }}
                        </span>
                        <div class="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                        <lucide-icon name="users" [size]="12"></lucide-icon>
                        {{ assignment.submissionsCount }}/{{ assignment.totalStudents }} Nộp bài
                      </div>
                      @if (assignment.pendingCount && assignment.pendingCount > 0) {
                        <div class="flex items-center gap-2 px-3 py-1.5 bg-orange-50 rounded-lg border border-orange-100 text-[11px] font-black text-orange-600 uppercase tracking-wider animate-pulse">
                          <span class="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                          {{ assignment.pendingCount }} Cần chấm
                        </div>
                      }
                      @if (assignment.averageScore !== undefined) {
                        <div class="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg border border-purple-100 text-[11px] font-black text-purple-600 uppercase tracking-wider">
                          <lucide-icon name="award" [size]="12"></lucide-icon>
                          {{ assignment.averageScore | number:'1.0-0' }}% Điểm TB
                        </div>
                      }
                      </div>
                      <div class="text-right flex-shrink-0">
                        <span class="text-[12px] uppercase tracking-widest text-slate-400 font-bold block">Hạn chót</span>
                        <p class="text-sm font-semibold leading-tight" 
                          [class]="isOverdue(assignment.dueDate) ? 'text-rose-500' : 'text-slate-600'">
                          {{ formatDate(assignment.dueDate) }}
                        </p>
                      </div>
                    </div>

                    <!-- Row 3: Course Title -->
                    <div class="mt-1">
                      <p class="text-xs text-slate-500 font-bold flex items-center gap-2">
                        <lucide-icon name="book-open" [size]="14" class="text-[#0056D2]/60"></lucide-icon>
                        {{ assignment.courseTitle }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Right Side Actions & Due Date -->
                <div class="p-6 sm:w-72 flex-shrink-0 flex flex-col justify-between sm:border-l border-slate-100 bg-slate-50/20 group-hover:bg-[#0056D2]/[0.02] transition-all">
                  <div class="flex items-center justify-end gap-2">
                    <button (click)="deleteAssignment(assignment.id, $event)" 
                            class="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all shadow-sm hover:shadow-md">
                      <lucide-icon name="trash-2" [size]="18"></lucide-icon>
                    </button>
                    <a [routerLink]="[assignment.id, 'settings']"
                       (click)="$event.stopPropagation()"
                       class="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-[#0056D2] hover:border-blue-200 hover:bg-blue-50 transition-all shadow-sm hover:shadow-md">
                      <lucide-icon name="edit-3" [size]="18"></lucide-icon>
                    </a>
                  </div>
                </div>
              </div>
            }

            @if (filteredAssignments().length === 0) {
              <div class="bg-white rounded-2xl border border-slate-200 border-dashed p-16 text-center shadow-inner">
                <div class="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300">
                  <lucide-icon name="clipboard-list" [size]="40"></lucide-icon>
                </div>
                <h3 class="text-xl font-black text-slate-900 mb-2">Chưa có bài tập nào</h3>
                <p class="text-sm text-slate-500 mb-8 max-w-xs mx-auto">Bắt đầu tạo bài tập đầu tiên cho khóa học của bạn để bắt đầu đánh giá học viên.</p>
                <a routerLink="create" class="inline-flex items-center gap-2 px-6 py-3 bg-[#0056D2] text-white rounded-xl font-bold hover:bg-[#004BB5] transition-all shadow-lg shadow-blue-100">
                  <lucide-icon name="plus" [size]="18"></lucide-icon>
                  Tạo bài tập mới
                </a>
              </div>
            }
          </div>
        }
      </div>
    </div>
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
    this.router.navigate(['/teacher/assessments/assignments', id, 'overview']);
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

}
