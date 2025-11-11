import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6" 
         role="navigation" 
         aria-label="Phân trang kết quả">
      
      <!-- Mobile view -->
      <div class="flex flex-1 justify-between sm:hidden">
        <button 
          (click)="onPageChange(currentPage - 1)"
          [disabled]="!hasPrevious"
          [attr.aria-label]="'Trang trước, trang ' + (currentPage - 1)"
          class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
          Trước
        </button>
        <span class="text-sm text-gray-700">
          Trang {{ currentPage }} / {{ totalPages }}
        </span>
        <button 
          (click)="onPageChange(currentPage + 1)"
          [disabled]="!hasNext"
          [attr.aria-label]="'Trang tiếp theo, trang ' + (currentPage + 1)"
          class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
          Tiếp
        </button>
      </div>

      <!-- Desktop view -->
      <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p class="text-sm text-gray-700">
            Hiển thị 
            <span class="font-medium">{{ getStartItem() }}</span>
            đến 
            <span class="font-medium">{{ getEndItem() }}</span>
            trong tổng số 
            <span class="font-medium">{{ totalItems }}</span>
            kết quả
          </p>
        </div>
        
        <div>
          <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Phân trang">
            <!-- Previous button -->
            <button 
              (click)="onPageChange(currentPage - 1)"
              [disabled]="!hasPrevious"
              [attr.aria-label]="'Trang trước, trang ' + (currentPage - 1)"
              class="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed">
              <span class="sr-only">Trang trước</span>
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd" />
              </svg>
            </button>

            <!-- Page numbers -->
            <ng-container *ngFor="let page of getVisiblePages(); trackBy: trackByPage">
              <button 
                *ngIf="page !== '...'"
                (click)="onPageChange(+page)"
                [attr.aria-label]="'Trang ' + page"
                [attr.aria-current]="page === currentPage ? 'page' : null"
                class="relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                [ngClass]="{
                  'bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600': page === currentPage,
                  'text-gray-900': page !== currentPage
                }">
                {{ page }}
              </button>
              <span 
                *ngIf="page === '...'"
                class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                ...
              </span>
            </ng-container>

            <!-- Next button -->
            <button 
              (click)="onPageChange(currentPage + 1)"
              [disabled]="!hasNext"
              [attr.aria-label]="'Trang tiếp theo, trang ' + (currentPage + 1)"
              class="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed">
              <span class="sr-only">Trang tiếp theo</span>
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
              </svg>
            </button>
          </nav>
        </div>
      </div>
    </nav>
  `
})
export class PaginationComponent {
  @Input() currentPage = 1;
  @Input() totalPages = 1;
  @Input() totalItems = 0;
  @Input() itemsPerPage = 12;
  @Input() maxVisiblePages = 7;

  @Output() pageChange = new EventEmitter<number>();

  get hasNext(): boolean {
    return this.currentPage < this.totalPages;
  }

  get hasPrevious(): boolean {
    return this.currentPage > 1;
  }

  getStartItem(): number {
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  getEndItem(): number {
    const end = this.currentPage * this.itemsPerPage;
    return Math.min(end, this.totalItems);
  }

  getVisiblePages(): (number | string)[] {
    const pages: (number | string)[] = [];
    const { currentPage, totalPages, maxVisiblePages } = this;

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage <= 4) {
        // Show first 5 pages + ellipsis + last page
        for (let i = 2; i <= Math.min(5, totalPages - 1); i++) {
          pages.push(i);
        }
        if (totalPages > 5) {
          pages.push('...');
        }
        if (totalPages > 1) {
          pages.push(totalPages);
        }
      } else if (currentPage >= totalPages - 3) {
        // Show first page + ellipsis + last 5 pages
        if (totalPages > 5) {
          pages.push('...');
        }
        for (let i = Math.max(2, totalPages - 4); i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Show first page + ellipsis + current page range + ellipsis + last page
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.pageChange.emit(page);
    }
  }

  trackByPage(index: number, page: number | string): number | string {
    return page;
  }
}
