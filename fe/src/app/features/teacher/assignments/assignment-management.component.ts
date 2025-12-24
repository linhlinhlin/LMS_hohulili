import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AssignmentApi, AssignmentSummary } from '../../../api/client/assignment.api';
import {
  filterAssignments,
  sortAssignments,
  paginateAssignments,
  getPaginationInfo,
  AssignmentSortColumn,
  SortDirection,
  AssignmentFilterCriteria
} from './utils/assignment-list-utils';

/**
 * Assignment Management Component
 * 
 * Displays and manages the list of assignments for a teacher.
 * Features: filtering, sorting, pagination, and quick actions.
 * 
 * @requirements 1.1, 1.2, 1.3, 1.4, 1.5
 */
@Component({
  selector: 'app-assignment-management',
  imports: [CommonModule, RouterModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="p-6 space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Quản lý Bài tập</h1>
          <p class="text-sm text-gray-500 mt-1">Tổng cộng {{ total() }} bài tập</p>
        </div>
        <a routerLink="/teacher/assignment-creation" 
           class="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors">
          + Tạo bài tập
        </a>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-xl shadow">
        <div class="p-4 flex flex-wrap gap-3 items-center border-b">
          <div class="flex-1 min-w-[200px]">
            <input 
              class="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
              placeholder="Tìm theo tên hoặc mô tả..." 
              [ngModel]="filterKeyword()"
              (ngModelChange)="onKeywordChange($event)" />
          </div>
          <select 
            class="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
            [ngModel]="filterStatus()"
            (ngModelChange)="onStatusChange($event)">
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Nháp</option>
            <option value="published">Đã xuất bản</option>
            <option value="closed">Đã đóng</option>
          </select>
          <button 
            class="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            (click)="resetFilters()">
            Xóa bộ lọc
          </button>
        </div>

        <!-- Loading State -->
        @if (loading()) {
          <div class="p-8 text-center">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
            <p class="mt-2 text-gray-500">Đang tải danh sách bài tập...</p>
          </div>
        }

        <!-- Error State -->
        @if (error() && !loading()) {
          <div class="p-6 text-center">
            <div class="text-red-600 mb-2">{{ error() }}</div>
            <button (click)="loadAssignments()" class="text-indigo-600 hover:text-indigo-800 underline text-sm">
              Thử lại
            </button>
          </div>
        }

        <!-- Table -->
        @if (!loading() && !error()) {
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th (click)="toggleSort('title')" 
                      class="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                    <div class="flex items-center gap-1">
                      Tên bài tập
                      @if (sortColumn() === 'title') {
                        <span class="text-indigo-600">{{ sortDirection() === 'asc' ? '▲' : '▼' }}</span>
                      }
                    </div>
                  </th>
                  <th (click)="toggleSort('courseTitle')" 
                      class="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                    <div class="flex items-center gap-1">
                      Khóa học
                      @if (sortColumn() === 'courseTitle') {
                        <span class="text-indigo-600">{{ sortDirection() === 'asc' ? '▲' : '▼' }}</span>
                      }
                    </div>
                  </th>
                  <th (click)="toggleSort('dueDate')" 
                      class="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                    <div class="flex items-center gap-1">
                      Hạn nộp
                      @if (sortColumn() === 'dueDate') {
                        <span class="text-indigo-600">{{ sortDirection() === 'asc' ? '▲' : '▼' }}</span>
                      }
                    </div>
                  </th>
                  <th (click)="toggleSort('status')" 
                      class="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                    <div class="flex items-center gap-1">
                      Trạng thái
                      @if (sortColumn() === 'status') {
                        <span class="text-indigo-600">{{ sortDirection() === 'asc' ? '▲' : '▼' }}</span>
                      }
                    </div>
                  </th>
                  <th (click)="toggleSort('submissionsCount')" 
                      class="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                    <div class="flex items-center gap-1">
                      Bài nộp
                      @if (sortColumn() === 'submissionsCount') {
                        <span class="text-indigo-600">{{ sortDirection() === 'asc' ? '▲' : '▼' }}</span>
                      }
                    </div>
                  </th>
                  <th class="px-6 py-4 text-right text-sm font-semibold text-gray-600 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                @for (assignment of pagedAssignments(); track assignment.id) {
                  <tr class="hover:bg-gray-50 transition-colors">
                    <td class="px-6 py-4">
                      <div class="text-base font-medium text-gray-900">{{ assignment.title }}</div>
                      @if (assignment.description) {
                        <div class="text-sm text-gray-500 truncate max-w-xs">{{ assignment.description }}</div>
                      }
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-base text-gray-600">
                      {{ assignment.courseTitle }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-base text-gray-600">
                      {{ assignment.dueDate ? (assignment.dueDate | date:'dd/MM/yyyy HH:mm') : 'Không giới hạn' }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full"
                            [class]="getStatusClasses(assignment.status)">
                        {{ getStatusLabel(assignment.status) }}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center gap-2">
                        <span class="text-base text-gray-900 font-medium">{{ assignment.submissionsCount }}</span>
                        <span class="text-gray-400">/</span>
                        <span class="text-base text-gray-500">{{ assignment.totalStudents }}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <a [routerLink]="['/teacher/assignments', assignment.id, 'submissions']" 
                         class="text-blue-600 hover:text-blue-900 transition-colors">
                        Xem bài nộp
                      </a>
                      
                      @if (assignment.status === 'DRAFT' || assignment.status === 'pending') {
                        <button (click)="publishAssignment(assignment.id)"
                                class="text-green-600 hover:text-green-900 transition-colors">
                          Xuất bản
                        </button>
                      }
                      
                      <a [routerLink]="['/teacher/assignments', assignment.id, 'edit']" 
                         class="text-indigo-600 hover:text-indigo-900 transition-colors">
                        Sửa
                      </a>
                      
                      <button (click)="deleteAssignment(assignment.id)"
                              class="text-red-600 hover:text-red-900 transition-colors">
                        Xóa
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Empty State -->
          @if (pagedAssignments().length === 0) {
            <div class="p-8 text-center text-gray-500">
              @if (hasActiveFilters()) {
                <p>Không tìm thấy bài tập phù hợp với bộ lọc.</p>
                <button (click)="resetFilters()" class="mt-2 text-indigo-600 hover:text-indigo-800 underline">
                  Xóa bộ lọc
                </button>
              } @else {
                <p>Chưa có bài tập nào.</p>
                <a routerLink="/teacher/assignment-creation" class="mt-2 inline-block text-indigo-600 hover:text-indigo-800 underline">
                  Tạo bài tập đầu tiên
                </a>
              }
            </div>
          }
        }
      </div>

      <!-- Pagination -->
      @if (!loading() && !error() && total() > 0) {
        <div class="bg-white rounded-lg shadow p-4 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-600">Hiển thị</span>
            <select 
              class="border rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500" 
              [ngModel]="pageSize()" 
              (ngModelChange)="onPageSizeChange($event)">
              <option [ngValue]="5">5</option>
              <option [ngValue]="10">10</option>
              <option [ngValue]="20">20</option>
              <option [ngValue]="50">50</option>
            </select>
            <span class="text-sm text-gray-600">mỗi trang</span>
          </div>
          
          <div class="flex items-center gap-2">
            <button 
              class="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
              [disabled]="!paginationInfo().hasPreviousPage" 
              (click)="goToPage(pageIndex() - 1)">
              Trước
            </button>
            <span class="text-sm text-gray-700 px-2">
              Trang {{ pageIndex() }} / {{ paginationInfo().totalPages }}
            </span>
            <button 
              class="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
              [disabled]="!paginationInfo().hasNextPage" 
              (click)="goToPage(pageIndex() + 1)">
              Sau
            </button>
          </div>
          
          <div class="text-sm text-gray-600">
            Hiển thị {{ paginationInfo().startIndex + 1 }}-{{ paginationInfo().endIndex + 1 }} trong {{ total() }} bài tập
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignmentManagementComponent implements OnInit {
  private assignmentApi = inject(AssignmentApi);

  // State signals
  assignments = signal<AssignmentSummary[]>([]);
  loading = signal(false);
  error = signal('');

  // Filter signals
  filterKeyword = signal('');
  filterStatus = signal<'' | 'pending' | 'published' | 'closed'>('');

  // Sort signals
  sortColumn = signal<AssignmentSortColumn>('dueDate');
  sortDirection = signal<SortDirection>('desc');

  // Pagination signals
  pageIndex = signal(1);
  pageSize = signal(10);

  // Computed: Filter criteria
  private filterCriteria = computed<AssignmentFilterCriteria>(() => ({
    status: this.filterStatus() || undefined,
    keyword: this.filterKeyword() || undefined
  }));

  // Computed: Filtered assignments
  private filteredAssignments = computed(() =>
    filterAssignments(this.assignments(), this.filterCriteria())
  );

  // Computed: Sorted assignments
  private sortedAssignments = computed(() =>
    sortAssignments(this.filteredAssignments(), {
      column: this.sortColumn(),
      direction: this.sortDirection()
    })
  );

  // Computed: Paginated assignments
  pagedAssignments = computed(() =>
    paginateAssignments(this.sortedAssignments(), this.pageIndex(), this.pageSize())
  );

  // Computed: Total count
  total = computed(() => this.filteredAssignments().length);

  // Computed: Pagination info
  paginationInfo = computed(() =>
    getPaginationInfo(this.total(), this.pageIndex(), this.pageSize())
  );

  ngOnInit(): void {
    this.loadAssignments();
  }

  /**
   * Loads assignments from API
   */
  loadAssignments(): void {
    this.loading.set(true);
    this.error.set('');

    this.assignmentApi.getTeacherAssignments().subscribe({
      next: (response: { data?: AssignmentSummary[] }) => {
        this.assignments.set(response.data || []);
      },
      error: (err: unknown) => {
        console.error('Error loading assignments:', err);
        this.error.set('Không thể tải danh sách bài tập. Vui lòng thử lại.');
        this.assignments.set([]);
      },
      complete: () => {
        this.loading.set(false);
      }
    });
  }

  // Filter handlers
  onKeywordChange(value: string): void {
    this.filterKeyword.set(value);
    this.pageIndex.set(1);
  }

  onStatusChange(value: '' | 'pending' | 'published' | 'closed'): void {
    this.filterStatus.set(value);
    this.pageIndex.set(1);
  }

  resetFilters(): void {
    this.filterKeyword.set('');
    this.filterStatus.set('');
    this.pageIndex.set(1);
  }

  hasActiveFilters(): boolean {
    return this.filterKeyword() !== '' || this.filterStatus() !== '';
  }

  // Sort handler
  toggleSort(column: AssignmentSortColumn): void {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
    this.pageIndex.set(1);
  }

  // Pagination handlers
  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.pageIndex.set(1);
  }

  goToPage(page: number): void {
    const info = this.paginationInfo();
    if (page >= 1 && page <= info.totalPages) {
      this.pageIndex.set(page);
    }
  }

  // UI helpers
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'pending': 'Nháp',
      'published': 'Đã xuất bản',
      'closed': 'Đã đóng',
      'DRAFT': 'Nháp',
      'PUBLISHED': 'Đã xuất bản',
      'CLOSED': 'Đã đóng'
    };
    return labels[status] || status;
  }

  /**
   * Publishes a draft assignment
   */
  publishAssignment(assignmentId: string): void {
    if (!confirm('Bạn có chắc chắn muốn xuất bản bài tập này?')) return;

    this.loading.set(true);
    this.assignmentApi.publishAssignment(assignmentId).subscribe({
      next: () => {
        this.loadAssignments();
      },
      error: (err: unknown) => {
        console.error('Error publishing assignment:', err);
        this.error.set('Không thể xuất bản bài tập. Vui lòng thử lại.');
        this.loading.set(false);
      }
    });
  }

  /**
   * Deletes an assignment
   */
  deleteAssignment(assignmentId: string): void {
    if (!confirm('Bạn có chắc chắn muốn xóa bài tập này? Thao tác này không thể hoàn tác.')) return;

    this.loading.set(true);
    this.assignmentApi.deleteAssignment(assignmentId).subscribe({
      next: () => {
        this.loadAssignments();
      },
      error: (err: unknown) => {
        console.error('Error deleting assignment:', err);
        this.error.set('Không thể xóa bài tập. Vui lòng thử lại.');
        this.loading.set(false);
      }
    });
  }

  getStatusClasses(status: string): string {
    const normalized = status.toLowerCase();
    const classes: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'draft': 'bg-yellow-100 text-yellow-800',
      'published': 'bg-green-100 text-green-800',
      'closed': 'bg-gray-100 text-gray-800'
    };
    return classes[normalized] || 'bg-gray-100 text-gray-800';
  }
}
