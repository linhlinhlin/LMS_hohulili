import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { AssignmentListState } from '../state/assignment-list.state';
import { AssignmentCardComponent } from '../components/assignment-card.component';
import { AssignmentFilterPanelComponent } from '../components/assignment-filter-panel.component';
import { AssignmentPaginationComponent } from '../components/assignment-pagination.component';
import { AssignmentLoadingComponent } from '../components/assignment-loading.component';

/**
 * Assignment List Page Component
 * Main container component for the student assignment list page
 * Orchestrates state management, component integration, and user interactions
 */
@Component({
  selector: 'app-assignment-list-page',
  imports: [
    CommonModule,
    RouterModule,
    AssignmentCardComponent,
    AssignmentFilterPanelComponent,
    AssignmentPaginationComponent,
    AssignmentLoadingComponent
  ],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Page Header -->
      <div class="bg-white border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-6 py-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Bài tập của tôi</h1>
              <p class="text-gray-600 mt-1">Quản lý và nộp bài tập của bạn</p>
            </div>

            <!-- View Toggle & Actions -->
            <div class="flex items-center space-x-3">
              <!-- View Mode Toggle -->
              <div class="flex items-center bg-gray-100 rounded-lg p-1">
                <button (click)="toggleViewMode()"
                        [class.bg-white]="assignmentState.currentView() === 'list'"
                        [class.shadow-sm]="assignmentState.currentView() === 'list'"
                        class="p-2 rounded-md transition-all duration-200">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
                  </svg>
                </button>
                <button (click)="toggleViewMode()"
                        [class.bg-white]="assignmentState.currentView() === 'grid'"
                        [class.shadow-sm]="assignmentState.currentView() === 'grid'"
                        class="p-2 rounded-md transition-all duration-200">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
                  </svg>
                </button>
              </div>

              <!-- Bulk Actions (when items selected) -->
              @if (assignmentState.selectedCount() > 0) {
                <div class="flex items-center space-x-2">
                  <span class="text-sm text-gray-600">
                    Đã chọn {{ assignmentState.selectedCount() }} bài tập
                  </span>
                  <button (click)="clearSelection()"
                          class="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                    Bỏ chọn
                  </button>
                  <button (click)="markAsRead()"
                          class="px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100">
                    Đánh dấu đã đọc
                  </button>
                </div>
              }

              <!-- Refresh Button -->
              <button (click)="refreshAssignments()"
                      [disabled]="assignmentState.isLoading()"
                      class="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
              </button>
            </div>
          </div>

          <!-- Stats Bar -->
          <div class="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="bg-blue-50 rounded-lg p-4">
              <div class="flex items-center">
                <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                <div class="ml-3">
                  <p class="text-sm font-medium text-blue-600">Tổng số</p>
                  <p class="text-lg font-semibold text-blue-900">{{ assignmentState.assignments().length }}</p>
                </div>
              </div>
            </div>

            <div class="bg-green-50 rounded-lg p-4">
              <div class="flex items-center">
                <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div class="ml-3">
                  <p class="text-sm font-medium text-green-600">Hoàn thành</p>
                  <p class="text-lg font-semibold text-green-900">{{ assignmentState.stats()?.completedAssignments || 0 }}</p>
                </div>
              </div>
            </div>

            <div class="bg-orange-50 rounded-lg p-4">
              <div class="flex items-center">
                <div class="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg class="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                  </svg>
                </div>
                <div class="ml-3">
                  <p class="text-sm font-medium text-orange-600">Quá hạn</p>
                  <p class="text-lg font-semibold text-orange-900">{{ assignmentState.stats()?.overdueAssignments || 0 }}</p>
                </div>
              </div>
            </div>

            <div class="bg-purple-50 rounded-lg p-4">
              <div class="flex items-center">
                <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                  </svg>
                </div>
                <div class="ml-3">
                  <p class="text-sm font-medium text-purple-600">Điểm TB</p>
                  <p class="text-lg font-semibold text-purple-900">{{ assignmentState.stats()?.averageGrade || 'N/A' }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Filter Panel -->
      <app-assignment-filter-panel
        [filters]="assignmentState.filters()"
        (filtersChanged)="onFiltersChanged($event)">
      </app-assignment-filter-panel>

      <!-- Main Content -->
      <div class="max-w-7xl mx-auto px-6 py-6">

        <!-- Error State -->
        @if (assignmentState.error()) {
          <div class="bg-red-50 border border-red-200 rounded-lg p-6">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
              </div>
              <div class="ml-3 flex-1">
                <h3 class="text-sm font-medium text-red-800">Lỗi tải dữ liệu</h3>
                <p class="text-sm text-red-700 mt-1">{{ assignmentState.error() }}</p>
              </div>
              <div class="ml-4">
                <button (click)="refreshAssignments()"
                        class="px-3 py-2 text-sm font-medium text-red-800 bg-red-100 border border-red-300 rounded-lg hover:bg-red-200">
                  Thử lại
                </button>
              </div>
            </div>
          </div>
        }

        <!-- Loading State -->
        @if (assignmentState.isLoading() && assignmentState.assignments().length === 0) {
          <app-assignment-loading
            [variant]="assignmentState.currentView()"
            [count]="assignmentState.pageSize()"
            [showSelection]="showSelectionMode()"
            [showProgress]="true">
          </app-assignment-loading>
        }

        <!-- Empty State -->
        @if (!assignmentState.isLoading() && assignmentState.assignments().length === 0 && !assignmentState.error()) {
          <div class="text-center py-12">
            <svg class="mx-auto h-24 w-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <h3 class="mt-4 text-lg font-medium text-gray-900">Không có bài tập nào</h3>
            <p class="mt-2 text-gray-600">
              @if (hasActiveFilters()) {
                Không tìm thấy bài tập nào phù hợp với bộ lọc hiện tại.
              } @else {
                Bạn chưa được giao bài tập nào. Hãy liên hệ với giảng viên để được hỗ trợ.
              }
            </p>
            @if (hasActiveFilters()) {
              <button (click)="clearAllFilters()"
                      class="mt-4 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100">
                Xóa bộ lọc
              </button>
            }
          </div>
        }

        <!-- Assignment Grid/List -->
        @if (assignmentState.assignments().length > 0) {
          <div class="space-y-6">

            <!-- Selection Mode Toggle -->
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <label class="flex items-center">
                  <input type="checkbox"
                         [checked]="assignmentState.isAllSelected()"
                         [indeterminate]="assignmentState.isIndeterminate()"
                         (change)="assignmentState.toggleSelectAll()"
                         class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  <span class="ml-2 text-sm text-gray-700">Chọn tất cả</span>
                </label>
                @if (assignmentState.selectedCount() > 0) {
                  <span class="text-sm text-gray-600">
                    ({{ assignmentState.selectedCount() }} đã chọn)
                  </span>
                }
              </div>

              <div class="text-sm text-gray-600">
                Hiển thị {{ assignmentState.paginationInfo().startItem }} -
                {{ assignmentState.paginationInfo().endItem }} của
                {{ assignmentState.paginationInfo().totalItems }} bài tập
              </div>
            </div>

            <!-- Assignment Items -->
            @if (assignmentState.currentView() === 'list') {
              <div class="space-y-4">
                @for (assignment of assignmentState.paginatedAssignments(); track assignment.id) {
                  <app-assignment-card
                    [assignment]="assignment"
                    [viewMode]="'list'"
                    [showSelection]="showSelectionMode()"
                    [isSelected]="assignmentState.selectedAssignments().has(assignment.id)"
                    (assignmentSelected)="assignmentState.toggleAssignmentSelection($event)"
                    (viewDetails)="onViewAssignment($event)"
                    (startWorking)="onStartWorking($event)"
                    (continueWorking)="onContinueWorking($event)"
                    (bookmark)="onBookmarkAssignment($event)">
                  </app-assignment-card>
                }
              </div>
            } @else {
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                @for (assignment of assignmentState.paginatedAssignments(); track assignment.id) {
                  <app-assignment-card
                    [assignment]="assignment"
                    [viewMode]="'grid'"
                    [showSelection]="showSelectionMode()"
                    [isSelected]="assignmentState.selectedAssignments().has(assignment.id)"
                    (assignmentSelected)="assignmentState.toggleAssignmentSelection($event)"
                    (viewDetails)="onViewAssignment($event)"
                    (startWorking)="onStartWorking($event)"
                    (continueWorking)="onContinueWorking($event)"
                    (bookmark)="onBookmarkAssignment($event)">
                  </app-assignment-card>
                }
              </div>
            }

            <!-- Pagination -->
            <app-assignment-pagination
              [currentPage]="assignmentState.currentPage()"
              [totalPages]="assignmentState.paginationInfo().totalPages"
              [totalItems]="assignmentState.paginationInfo().totalItems"
              [pageSize]="assignmentState.pageSize()"
              [hasNext]="assignmentState.paginationInfo().hasNext"
              [hasPrev]="assignmentState.paginationInfo().hasPrev"
              (pageChanged)="assignmentState.setPage($event)"
              (pageSizeChanged)="assignmentState.setPageSize($event)">
            </app-assignment-pagination>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    input[type="checkbox"]:indeterminate {
      background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M4 8h8'/%3e%3c/svg%3e");
      background-color: #3b82f6;
      background-size: 16px 16px;
      background-position: center;
      background-repeat: no-repeat;
    }
  `]
})
export class AssignmentListPageComponent implements OnInit {
  private authService = inject(AuthService);
  private showSelectionModeSignal = signal<boolean>(false);

  // ========================================
  // PUBLIC PROPERTIES
  // ========================================

  assignmentState = inject(AssignmentListState);
  showSelectionMode = this.showSelectionModeSignal.asReadonly();

  // ========================================
  // COMPUTED PROPERTIES
  // ========================================

  hasActiveFilters = computed(() => {
    const filters = this.assignmentState.filters();
    return !!(
      filters.searchQuery ||
      filters.status?.length ||
      filters.type?.length ||
      filters.priority?.length ||
      filters.courseId?.length ||
      filters.instructorId?.length ||
      filters.dateRange
    );
  });

  // ========================================
  // LIFECYCLE
  // ========================================

  ngOnInit(): void {
    this.loadInitialData();
  }

  // ========================================
  // PUBLIC METHODS
  // ========================================

  toggleViewMode(): void {
    this.assignmentState.toggleViewMode();
  }

  toggleSelectionMode(): void {
    this.showSelectionModeSignal.update(mode => !mode);
    if (!this.showSelectionModeSignal()) {
      this.assignmentState.clearSelection();
    }
  }

  clearSelection(): void {
    this.assignmentState.clearSelection();
  }

  refreshAssignments(): void {
    this.loadAssignments();
  }

  clearAllFilters(): void {
    this.assignmentState.clearFilters();
    this.loadAssignments();
  }

  markAsRead(): void {
    // TODO: Implement mark as read functionality
    console.log('Mark selected assignments as read');
    this.assignmentState.clearSelection();
  }

  // ========================================
  // EVENT HANDLERS
  // ========================================

  onFiltersChanged(filters: any): void {
    this.assignmentState.updateFilters(filters);
    this.loadAssignments();
  }

  onViewAssignment(assignmentId: string): void {
    this.assignmentState.navigateToAssignmentDetails(assignmentId);
  }

  onStartWorking(assignmentId: string): void {
    this.assignmentState.navigateToAssignment(assignmentId);
  }

  onContinueWorking(assignmentId: string): void {
    this.assignmentState.navigateToAssignment(assignmentId);
  }

  onBookmarkAssignment(assignmentId: string): void {
    // TODO: Implement bookmark functionality
    console.log('Bookmark assignment:', assignmentId);
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  private loadInitialData(): void {
    const currentUser = this.authService.user();
    if (currentUser?.id) {
      this.loadAssignments();
    }
  }

  private loadAssignments(): void {
    const currentUser = this.authService.user();
    if (currentUser?.id) {
      this.assignmentState.loadAssignments(currentUser.id as any);
    }
  }
}