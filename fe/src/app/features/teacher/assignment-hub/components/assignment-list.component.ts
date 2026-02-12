import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
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
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header Section -->
      <div class="bg-white border-b">
        <div class="max-w-7xl mx-auto px-6 py-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900">Quản lý Bài tập</h1>
              <p class="text-gray-600 mt-2">Tạo, quản lý và chấm điểm bài tập cho học viên</p>
            </div>
            <div class="flex items-center gap-3">
              <a routerLink="rubrics" class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                Thư viện Rubric
              </a>
              <a routerLink="create" class="px-4 py-2 bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5] flex items-center gap-2 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                Tạo bài tập mới
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="max-w-7xl mx-auto px-6 py-8">
        <!-- KPI Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div class="bg-white rounded shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600">Tổng bài tập</p>
                <p class="text-3xl font-bold text-[#0056D2] mt-2">{{ assignments().length }}</p>
              </div>
              <div class="w-12 h-12 bg-[#0056D2]/5 rounded flex items-center justify-center">
                <svg class="w-6 h-6 text-[#0056D2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2H9zm0 0a2 2 0 002 2h2a2 2 0 002-2"></path>
                </svg>
              </div>
            </div>
          </div>
          <div class="bg-white rounded shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600">Cần chấm điểm</p>
                <p class="text-3xl font-bold text-orange-600 mt-2">{{ needsGradingCount() }}</p>
              </div>
              <div class="w-12 h-12 bg-orange-50 rounded flex items-center justify-center">
                <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            </div>
          </div>
          <div class="bg-white rounded shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600">Đã hoàn thành</p>
                <p class="text-3xl font-bold text-green-600 mt-2">{{ getCompletedCount() }}</p>
              </div>
              <div class="w-12 h-12 bg-green-50 rounded flex items-center justify-center">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            </div>
          </div>
          <div class="bg-white rounded shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600">Điểm trung bình</p>
                <p class="text-3xl font-bold text-purple-600 mt-2">{{ getAverageScore() | number:'1.0-0' }}%</p>
              </div>
              <div class="w-12 h-12 bg-purple-50 rounded flex items-center justify-center">
                <svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Filter Tabs -->
        <div class="flex items-center gap-2 mb-6">
          <button (click)="setFilter('ALL')" 
                  [class]="filter() === 'ALL' ? 'bg-[#0056D2]/10 text-[#004BB5] border-[#0056D2]/30' : 'bg-white hover:bg-gray-50'"
                  class="px-4 py-2 border rounded-lg text-sm font-medium transition-colors">
            Tất cả
          </button>
          <button (click)="setFilter('NEEDS_GRADING')"
                  [class]="filter() === 'NEEDS_GRADING' ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-white hover:bg-gray-50'"
                  class="px-4 py-2 border rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            Cần chấm
            @if (needsGradingCount() > 0) {
              <span class="px-1.5 py-0.5 text-xs bg-orange-500 text-white rounded-full">{{ needsGradingCount() }}</span>
            }
          </button>
          <button (click)="setFilter('GRADED')"
                  [class]="filter() === 'GRADED' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-white hover:bg-gray-50'"
                  class="px-4 py-2 border rounded-lg text-sm font-medium transition-colors">
            Đã chấm
          </button>
          <button (click)="setFilter('DRAFT')"
                  [class]="filter() === 'DRAFT' ? 'bg-gray-200 text-gray-700' : 'bg-white hover:bg-gray-50'"
                  class="px-4 py-2 border rounded-lg text-sm font-medium transition-colors">
            Bản nháp
          </button>
        </div>

        <!-- Search -->
        <div class="mb-6">
          <input type="text" [value]="searchQuery()" (input)="searchQuery.set($any($event.target).value)" placeholder="Tìm kiếm bài tập..."
                 class="w-full md:w-96 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2]"/>

        </div>

        <!-- Loading -->
        @if (loading()) {
          <div class="flex items-center justify-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0056D2]"></div>
          </div>
        }

        <!-- Assignment Cards -->
        @if (!loading()) {
          <div class="space-y-4">
            @for (assignment of filteredAssignments(); track assignment.id) {
              <div class="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
                   (click)="navigateToAssignment(assignment.id)">
                <div class="p-6">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center gap-3">
                        <h3 class="text-lg font-semibold text-gray-900">{{ assignment.title }}</h3>
                        @if (assignment.pendingCount && assignment.pendingCount > 0) {
                          <span class="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded-full flex items-center gap-1">
                            <span class="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></span>
                            {{ assignment.pendingCount }} cần chấm
                          </span>
                        }
                      </div>
                      <p class="text-sm text-gray-500 mt-1">{{ assignment.courseTitle }}</p>
                      @if (assignment.description) {
                        <p class="text-gray-600 mt-2 line-clamp-2">{{ assignment.description }}</p>
                      }
                    </div>
                    
                    <!-- Status Badge -->
                    <span class="px-2 py-1 text-xs font-medium rounded-full"
                          [class]="getStatusClass(assignment.status)">
                      {{ getStatusText(assignment.status) }}
                    </span>
                  </div>

                  <!-- Stats Row -->
                  <div class="flex items-center gap-6 mt-4 pt-4 border-t">
                    <div class="text-center">
                      <div class="text-xl font-bold text-[#0056D2]">{{ assignment.submissionsCount }}/{{ assignment.totalStudents }}</div>
                      <div class="text-xs text-gray-500">Đã nộp</div>
                    </div>
                    <div class="text-center">
                      <div class="text-xl font-bold text-green-600">{{ assignment.gradedCount || 0 }}</div>
                      <div class="text-xs text-gray-500">Đã chấm</div>
                    </div>
                    <div class="text-center">
                      <div class="text-xl font-bold text-orange-600">{{ assignment.pendingCount || 0 }}</div>
                      <div class="text-xs text-gray-500">Chờ chấm</div>
                    </div>
                    @if (assignment.averageScore !== undefined) {
                      <div class="text-center">
                        <div class="text-xl font-bold text-purple-600">{{ assignment.averageScore | number:'1.0-0' }}%</div>
                        <div class="text-xs text-gray-500">Điểm TB</div>
                      </div>
                    }
                    
                    <div class="flex-1"></div>
                    
                    <!-- Due Date -->
                    <div class="text-right">
                      <div class="text-sm text-gray-600">Hạn nộp</div>
                      <div class="text-sm font-medium" [class]="isOverdue(assignment.dueDate) ? 'text-red-600' : 'text-gray-900'">
                        {{ formatDate(assignment.dueDate) }}
                      </div>
                    </div>
                  </div>

                  <!-- Actions -->
                  <div class="flex items-center gap-2 mt-4 pt-4 border-t">
                    <a [routerLink]="[assignment.id, 'overview']" 
                       (click)="$event.stopPropagation()"
                       class="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors">
                      Xem chi tiết
                    </a>
                    <a [routerLink]="[assignment.id, 'submissions']"
                       (click)="$event.stopPropagation()"
                       class="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors">
                      Xem bài nộp
                    </a>
                    
                    <a [routerLink]="[assignment.id, 'settings']"
                       (click)="$event.stopPropagation()"
                       class="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors">
                      Chỉnh sửa
                    </a>

                    @if (assignment.pendingCount && assignment.pendingCount > 0) {
                      <a [routerLink]="[assignment.id, 'submissions']" [queryParams]="{filter: 'PENDING'}"
                         (click)="$event.stopPropagation()"
                         class="px-4 py-2 text-sm bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5] transition-colors">
                        Chấm điểm →
                      </a>
                    }
                    
                    <button (click)="deleteAssignment(assignment.id, $event)" 
                            class="px-4 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors ml-auto">
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            }

            @if (filteredAssignments().length === 0) {
              <div class="bg-white rounded-xl shadow-sm border p-12 text-center">
                <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <h3 class="text-lg font-medium text-gray-900 mb-2">Chưa có bài tập nào</h3>
                <p class="text-gray-500 mb-4">Bắt đầu tạo bài tập đầu tiên cho khóa học của bạn</p>
                <a routerLink="create" class="inline-flex items-center gap-2 px-4 py-2 bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5] transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                  </svg>
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

  needsGradingCount = computed(() =>
    this.assignments().filter(a => (a.pendingCount || 0) > 0).length
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
    this.router.navigate(['/teacher/assignments', id, 'overview']);
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
      'published': 'bg-green-100 text-green-700',
      'draft': 'bg-yellow-100 text-yellow-700',
      'pending': 'bg-yellow-100 text-yellow-700',
      'closed': 'bg-gray-100 text-gray-700'
    };
    return classes[s] || 'bg-gray-100 text-gray-700';
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
