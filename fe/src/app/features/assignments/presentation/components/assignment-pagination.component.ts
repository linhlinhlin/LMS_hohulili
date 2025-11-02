import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Assignment Pagination Component
 * Provides pagination controls for assignment lists
 * Supports different page sizes and navigation
 */
@Component({
  selector: 'app-assignment-pagination',
  imports: [CommonModule],
  template: `
    @if (totalPages() > 1) {
      <div class="flex items-center justify-between px-6 py-4 bg-white border-t border-gray-200">

        <!-- Page Size Selector -->
        <div class="flex items-center space-x-2">
          <span class="text-sm text-gray-700">Hiển thị</span>
          <select [value]="pageSize()"
                  (change)="onPageSizeChange($event)"
                  class="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500">
            <option value="6">6</option>
            <option value="12">12</option>
            <option value="24">24</option>
            <option value="48">48</option>
          </select>
          <span class="text-sm text-gray-700">bài tập mỗi trang</span>
        </div>

        <!-- Pagination Info -->
        <div class="text-sm text-gray-700">
          Hiển thị {{ startItem() }}-{{ endItem() }} trong tổng số {{ totalItems() }} bài tập
        </div>

        <!-- Pagination Controls -->
        <div class="flex items-center space-x-2">

          <!-- Previous Button -->
          <button (click)="goToPreviousPage()"
                  [disabled]="!hasPrev()"
                  [class.opacity-50]="!hasPrev()"
                  [class.cursor-not-allowed]="!hasPrev()"
                  class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:hover:bg-white">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            Trước
          </button>

          <!-- Page Numbers -->
          <div class="flex items-center space-x-1">
            @for (page of visiblePages(); track page) {
              <button (click)="goToPage(page)"
                      [class.bg-blue-600]="page === currentPage()"
                      [class.text-white]="page === currentPage()"
                      [class.text-gray-700]="page !== currentPage()"
                      class="px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                {{ page }}
              </button>
            }
          </div>

          <!-- Next Button -->
          <button (click)="goToNextPage()"
                  [disabled]="!hasNext()"
                  [class.opacity-50]="!hasNext()"
                  [class.cursor-not-allowed]="!hasNext()"
                  class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:hover:bg-white">
            Sau
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </button>
        </div>
      </div>
    }
  `
})
export class AssignmentPaginationComponent {
  // ========================================
  // INPUTS
  // ========================================

  currentPage = input.required<number>();
  totalPages = input.required<number>();
  totalItems = input.required<number>();
  pageSize = input.required<number>();
  hasNext = input.required<boolean>();
  hasPrev = input.required<boolean>();

  // ========================================
  // OUTPUTS
  // ========================================

  pageChanged = output<number>();
  pageSizeChanged = output<number>();

  // ========================================
  // COMPUTED PROPERTIES
  // ========================================

  startItem = computed(() => {
    if (this.totalItems() === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  endItem = computed(() => {
    if (this.totalItems() === 0) return 0;
    return Math.min(this.currentPage() * this.pageSize(), this.totalItems());
  });

  visiblePages = computed(() => {
    const current = this.currentPage();
    const total = this.totalPages();
    const pages: number[] = [];

    // Show maximum 5 pages around current page
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  });

  // ========================================
  // EVENT HANDLERS
  // ========================================

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.pageChanged.emit(page);
    }
  }

  goToPreviousPage(): void {
    if (this.hasPrev()) {
      this.pageChanged.emit(this.currentPage() - 1);
    }
  }

  goToNextPage(): void {
    if (this.hasNext()) {
      this.pageChanged.emit(this.currentPage() + 1);
    }
  }

  onPageSizeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newSize = parseInt(target.value, 10);
    this.pageSizeChanged.emit(newSize);
  }
}