import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AssignmentFilters, AssignmentStatus, AssignmentType, PriorityLevel, DeadlineStatus } from '../../domain/types';

/**
 * Assignment Filter Panel Component
 * Provides filtering controls for assignment lists
 * Supports search, status, type, priority, and date range filters
 */
@Component({
  selector: 'app-assignment-filter-panel',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white border-b border-gray-200 px-6 py-4">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

        <!-- Search Input -->
        <div class="flex-1 max-w-md">
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            <input type="text"
                   [value]="filters().searchQuery || ''"
                   (input)="onSearchChange($event)"
                   placeholder="Tìm kiếm bài tập..."
                   class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm">
          </div>
        </div>

        <!-- Filter Controls -->
        <div class="flex flex-wrap items-center gap-3">

          <!-- Status Filter -->
          <div class="relative">
            <select [value]="filters().status?.[0] || ''"
                    (change)="onStatusChange($event)"
                    class="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-blue-500 focus:border-blue-500">
              <option value="">Tất cả trạng thái</option>
              <option value="draft">Bản nháp</option>
              <option value="published">Đã xuất bản</option>
              <option value="archived">Đã lưu trữ</option>
            </select>
            <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>

          <!-- Type Filter -->
          <div class="relative">
            <select [value]="filters().type?.[0] || ''"
                    (change)="onTypeChange($event)"
                    class="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-blue-500 focus:border-blue-500">
              <option value="">Tất cả loại</option>
              <option value="assignment">Bài tập</option>
              <option value="quiz">Bài kiểm tra</option>
              <option value="project">Dự án</option>
              <option value="discussion">Thảo luận</option>
            </select>
            <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>

          <!-- Priority Filter -->
          <div class="relative">
            <select [value]="filters().priority?.[0] || ''"
                    (change)="onPriorityChange($event)"
                    class="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-blue-500 focus:border-blue-500">
              <option value="">Tất cả ưu tiên</option>
              <option value="urgent">Khẩn cấp</option>
              <option value="high">Cao</option>
              <option value="medium">Trung bình</option>
              <option value="low">Thấp</option>
            </select>
            <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>

          <!-- Quick Filters -->
          <div class="flex items-center space-x-2">
            <button (click)="applyQuickFilter('upcoming')"
                    [class.bg-blue-100]="activeQuickFilter() === 'upcoming'"
                    [class.text-blue-700]="activeQuickFilter() === 'upcoming'"
                    class="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              Sắp đến hạn
            </button>

            <button (click)="applyQuickFilter('overdue')"
                    [class.bg-red-100]="activeQuickFilter() === 'overdue'"
                    [class.text-red-700]="activeQuickFilter() === 'overdue'"
                    class="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-red-500 focus:border-red-500">
              Quá hạn
            </button>

            <button (click)="applyQuickFilter('urgent')"
                    [class.bg-orange-100]="activeQuickFilter() === 'urgent'"
                    [class.text-orange-700]="activeQuickFilter() === 'urgent'"
                    class="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
              Khẩn cấp
            </button>
          </div>

          <!-- Clear Filters -->
          @if (hasActiveFilters()) {
            <button (click)="clearAllFilters()"
                    class="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:border-gray-500">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
              Xóa bộ lọc
            </button>
          }

          <!-- Advanced Filters Toggle -->
          <button (click)="toggleAdvancedFilters()"
                  [class.bg-blue-100]="showAdvancedFilters()"
                  [class.text-blue-700]="showAdvancedFilters()"
                  class="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"></path>
            </svg>
            Nâng cao
          </button>
        </div>
      </div>

      <!-- Advanced Filters Panel -->
      @if (showAdvancedFilters()) {
        <div class="mt-4 pt-4 border-t border-gray-200">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

            <!-- Date Range Filter -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Từ ngày
              </label>
              <input type="date"
                     [value]="filters().dateRange?.start ? formatDate(filters().dateRange!.start) : ''"
                     (change)="onStartDateChange($event)"
                     class="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500">
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Đến ngày
              </label>
              <input type="date"
                     [value]="filters().dateRange?.end ? formatDate(filters().dateRange!.end) : ''"
                     (change)="onEndDateChange($event)"
                     class="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500">
            </div>

            <!-- Course Filter -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Khóa học
              </label>
              <select [value]="filters().courseId?.[0] || ''"
                      (change)="onCourseChange($event)"
                      class="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500">
                <option value="">Tất cả khóa học</option>
                <option value="course-1">Kỹ thuật Tàu biển Cơ bản</option>
                <option value="course-2">An toàn Hàng hải Quốc tế</option>
                <option value="course-3">Quản lý Cảng biển</option>
              </select>
            </div>

            <!-- Instructor Filter -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Giảng viên
              </label>
              <select [value]="filters().instructorId?.[0] || ''"
                      (change)="onInstructorChange($event)"
                      class="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500">
                <option value="">Tất cả giảng viên</option>
                <option value="instructor-1">ThS. Nguyễn Văn Hải</option>
                <option value="instructor-2">TS. Phạm Văn Nam</option>
                <option value="instructor-3">ThS. Trần Thị Lan</option>
              </select>
            </div>
          </div>
        </div>
      }

      <!-- Active Filters Summary -->
      @if (hasActiveFilters()) {
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <span class="text-sm text-gray-600">Bộ lọc đang áp dụng:</span>

          @if (filters().searchQuery) {
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Tìm kiếm: "{{ filters().searchQuery }}"
              <button (click)="removeSearchFilter()" class="ml-1 text-blue-600 hover:text-blue-800">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </span>
          }

          @if (filters().status?.length) {
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Trạng thái: {{ getStatusText(filters().status![0]) }}
              <button (click)="removeStatusFilter()" class="ml-1 text-green-600 hover:text-green-800">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </span>
          }

          @if (filters().type?.length) {
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Loại: {{ getTypeText(filters().type![0]) }}
              <button (click)="removeTypeFilter()" class="ml-1 text-purple-600 hover:text-purple-800">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </span>
          }

          @if (filters().priority?.length) {
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              Ưu tiên: {{ getPriorityText(filters().priority![0]) }}
              <button (click)="removePriorityFilter()" class="ml-1 text-orange-600 hover:text-orange-800">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </span>
          }
        </div>
      }
    </div>
  `
})
export class AssignmentFilterPanelComponent {
  // ========================================
  // INPUTS
  // ========================================

  filters = input.required<AssignmentFilters>();

  // ========================================
  // OUTPUTS
  // ========================================

  filtersChanged = output<AssignmentFilters>();

  // ========================================
  // INTERNAL STATE
  // ========================================

  private showAdvancedFiltersSignal = signal<boolean>(false);
  private activeQuickFilterSignal = signal<string>('');

  // ========================================
  // COMPUTED PROPERTIES
  // ========================================

  showAdvancedFilters = this.showAdvancedFiltersSignal.asReadonly();
  activeQuickFilter = this.activeQuickFilterSignal.asReadonly();

  hasActiveFilters = computed(() => {
    const f = this.filters();
    return !!(
      f.searchQuery ||
      f.status?.length ||
      f.type?.length ||
      f.priority?.length ||
      f.courseId?.length ||
      f.instructorId?.length ||
      f.dateRange
    );
  });

  // ========================================
  // EVENT HANDLERS
  // ========================================

  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.updateFilters({ searchQuery: target.value || undefined });
  }

  onStatusChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const status = target.value ? [target.value as AssignmentStatus] : undefined;
    this.updateFilters({ status });
  }

  onTypeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const type = target.value ? [target.value as AssignmentType] : undefined;
    this.updateFilters({ type });
  }

  onPriorityChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const priority = target.value ? [target.value as PriorityLevel] : undefined;
    this.updateFilters({ priority });
  }

  onStartDateChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const startDate = target.value ? new Date(target.value) : undefined;
    const currentRange = this.filters().dateRange;
    const endDate = currentRange?.end;

    if (startDate && endDate) {
      this.updateFilters({
        dateRange: { start: startDate, end: endDate }
      });
    } else if (startDate) {
      this.updateFilters({
        dateRange: { start: startDate, end: new Date() }
      });
    } else {
      this.updateFilters({ dateRange: undefined });
    }
  }

  onEndDateChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const endDate = target.value ? new Date(target.value) : undefined;
    const currentRange = this.filters().dateRange;
    const startDate = currentRange?.start;

    if (startDate && endDate) {
      this.updateFilters({
        dateRange: { start: startDate, end: endDate }
      });
    } else if (endDate) {
      this.updateFilters({
        dateRange: { start: new Date(), end: endDate }
      });
    } else {
      this.updateFilters({ dateRange: undefined });
    }
  }

  onCourseChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const courseId = target.value ? [target.value as any] : undefined;
    this.updateFilters({ courseId });
  }

  onInstructorChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const instructorId = target.value ? [target.value as any] : undefined;
    this.updateFilters({ instructorId });
  }

  applyQuickFilter(filterType: string): void {
    this.activeQuickFilterSignal.set(filterType);

    switch (filterType) {
      case 'upcoming':
        this.updateFilters({
          deadlineStatus: [DeadlineStatus.DUE_SOON],
          status: undefined,
          type: undefined,
          priority: undefined
        });
        break;
      case 'overdue':
        this.updateFilters({
          deadlineStatus: [DeadlineStatus.OVERDUE],
          status: undefined,
          type: undefined,
          priority: undefined
        });
        break;
      case 'urgent':
        this.updateFilters({
          priority: [PriorityLevel.URGENT, PriorityLevel.HIGH],
          status: undefined,
          type: undefined,
          deadlineStatus: undefined
        });
        break;
    }
  }

  clearAllFilters(): void {
    this.activeQuickFilterSignal.set('');
    this.updateFilters({});
  }

  toggleAdvancedFilters(): void {
    this.showAdvancedFiltersSignal.update(show => !show);
  }

  // Remove individual filters
  removeSearchFilter(): void {
    this.updateFilters({ searchQuery: undefined });
  }

  removeStatusFilter(): void {
    this.updateFilters({ status: undefined });
  }

  removeTypeFilter(): void {
    this.updateFilters({ type: undefined });
  }

  removePriorityFilter(): void {
    this.updateFilters({ priority: undefined });
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  private updateFilters(updates: Partial<AssignmentFilters>): void {
    const newFilters = { ...this.filters(), ...updates };
    this.filtersChanged.emit(newFilters);
  }

  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'draft': return 'Bản nháp';
      case 'published': return 'Đã xuất bản';
      case 'archived': return 'Đã lưu trữ';
      default: return status;
    }
  }

  getTypeText(type: string): string {
    switch (type) {
      case 'assignment': return 'Bài tập';
      case 'quiz': return 'Bài kiểm tra';
      case 'project': return 'Dự án';
      case 'discussion': return 'Thảo luận';
      default: return type;
    }
  }

  getPriorityText(priority: string): string {
    switch (priority) {
      case 'urgent': return 'Khẩn cấp';
      case 'high': return 'Cao';
      case 'medium': return 'Trung bình';
      case 'low': return 'Thấp';
      default: return priority;
    }
  }
}