import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
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
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-2.5 sm:px-5"
         role="navigation" 
         aria-label="Phân trang kết quả">
      
      <!-- Mobile view -->
      <div class="flex flex-1 items-center justify-between gap-3 sm:hidden">
        <button 
          (click)="onPageChange(currentPage() - 1)"
          [disabled]="!hasPrevious()"
          [attr.aria-label]="'Trang trước, trang ' + (currentPage() - 1)"
          class="relative inline-flex items-center rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0056D2] disabled:cursor-not-allowed disabled:opacity-50">
          Trước
        </button>
        <span class="shrink-0 rounded-full bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700">
          Trang {{ currentPage() }} / {{ totalPages() }}
        </span>
        <button 
          (click)="onPageChange(currentPage() + 1)"
          [disabled]="!hasNext()"
          [attr.aria-label]="'Trang tiếp theo, trang ' + (currentPage() + 1)"
          class="relative inline-flex items-center rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0056D2] disabled:cursor-not-allowed disabled:opacity-50">
          Tiếp
        </button>
      </div>

      <!-- Desktop view -->
      <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between sm:gap-6">
        <div>
          <p class="whitespace-nowrap text-sm leading-5 text-slate-600">
            Hiển thị 
            <span class="font-semibold text-slate-900">{{ getStartItem() }}</span>
            đến 
            <span class="font-semibold text-slate-900">{{ getEndItem() }}</span>
            trong tổng số 
            <span class="font-semibold text-slate-900">{{ totalItems() }}</span>
            kết quả
          </p>
        </div>
        
        <div>
          <nav class="isolate inline-flex -space-x-px overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" aria-label="Phân trang">
            <!-- Previous button -->
            <button 
              (click)="onPageChange(currentPage() - 1)"
              [disabled]="!hasPrevious()"
              [attr.aria-label]="'Trang trước, trang ' + (currentPage() - 1)"
              class="relative inline-flex h-9 w-9 items-center justify-center text-slate-500 ring-1 ring-inset ring-slate-200 transition-colors hover:bg-slate-50 focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0056D2] disabled:cursor-not-allowed disabled:opacity-50">
              <span class="sr-only">Trang trước</span>
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd" />
              </svg>
            </button>

            <!-- Page numbers -->
            @for (page of getVisiblePages(); track $index) {
              @if (page !== '…') {
                <button 
                  (click)="onPageChange(+page)"
                  [attr.aria-label]="'Trang ' + page"
                  [attr.aria-current]="page === currentPage() ? 'page' : null"
                  class="relative inline-flex h-9 min-w-9 items-center justify-center px-3 text-sm font-semibold ring-1 ring-inset ring-slate-200 transition-colors hover:bg-slate-50 focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0056D2]"
                  [ngClass]="{
                    'bg-[#0056D2] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0056D2]': page === currentPage(),
                    'text-gray-900': page !== currentPage()
                  }">
                  {{ page }}
                </button>
              } @else {
                <span 
                  class="relative inline-flex h-9 min-w-9 items-center justify-center px-3 text-sm font-semibold text-slate-500 ring-1 ring-inset ring-slate-200 focus:outline-offset-0">
                  …
                </span>
              }
            }

            <!-- Next button -->
            <button 
              (click)="onPageChange(currentPage() + 1)"
              [disabled]="!hasNext()"
              [attr.aria-label]="'Trang tiếp theo, trang ' + (currentPage() + 1)"
              class="relative inline-flex h-9 w-9 items-center justify-center text-slate-500 ring-1 ring-inset ring-slate-200 transition-colors hover:bg-slate-50 focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0056D2] disabled:cursor-not-allowed disabled:opacity-50">
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
  // Signal inputs - Angular v20+
  currentPage = input<number>(1);
  totalPages = input<number>(1);
  totalItems = input<number>(0);
  itemsPerPage = input<number>(12);
  maxVisiblePages = input<number>(7);

  // Signal output - Angular v20+
  pageChange = output<number>();

  hasNext(): boolean {
    return this.currentPage() < this.totalPages();
  }

  hasPrevious(): boolean {
    return this.currentPage() > 1;
  }

  getStartItem(): number {
    return (this.currentPage() - 1) * this.itemsPerPage() + 1;
  }

  getEndItem(): number {
    const end = this.currentPage() * this.itemsPerPage();
    return Math.min(end, this.totalItems());
  }

  getVisiblePages(): (number | string)[] {
    const pages: (number | string)[] = [];
    const currentPage = this.currentPage();
    const totalPages = this.totalPages();
    const maxVisiblePages = this.maxVisiblePages();

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
          pages.push('…');
        }
        if (totalPages > 1) {
          pages.push(totalPages);
        }
      } else if (currentPage >= totalPages - 3) {
        // Show first page + ellipsis + last 5 pages
        if (totalPages > 5) {
          pages.push('…');
        }
        for (let i = Math.max(2, totalPages - 4); i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Show first page + ellipsis + current page range + ellipsis + last page
        pages.push('…');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('…');
        pages.push(totalPages);
      }
    }

    return pages;
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.currentPage()) {
      this.pageChange.emit(page);
    }
  }
}
