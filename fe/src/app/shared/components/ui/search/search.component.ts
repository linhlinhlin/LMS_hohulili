import { Component, signal, OnInit, OnDestroy, ElementRef, viewChild, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { debounceTime, distinctUntilChanged, startWith, takeUntil, Subject } from 'rxjs';

interface SearchResult {
  id: string;
  title: string;
  type: 'course' | 'instructor' | 'category';
  description: string;
  thumbnail?: string;
  level?: string;
  duration?: string;
  students?: number;
  rating?: number;
}

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="relative" #searchContainer>
      <!-- Search Input -->
      <div class="relative">
        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
        <input
          [formControl]="searchControl"
          type="text"
          placeholder="Bạn muốn học gì?"
          class="block w-full pl-12 pr-16 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white shadow-lg hover:shadow-xl"
          (focus)="onSearchFocus()"
          (blur)="onSearchBlur()"
        />
        @if (searchControl.value) {
          <button
            (click)="clearSearch()"
            class="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        }
      </div>

      <!-- Search Results Dropdown -->
      @if (isSearchFocused() && (searchResults().length > 0 || isLoading())) {
        <div class="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
          
          <!-- Loading State -->
          @if (isLoading()) {
            <div class="p-4 text-center">
              <div class="inline-flex items-center space-x-2 text-gray-500">
                <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="text-sm">Đang tìm kiếm...</span>
              </div>
            </div>
          }

          <!-- Search Results -->
          @if (searchResults().length > 0) {
            <div class="py-2">
              @for (result of searchResults(); track result.id) {
                <a [routerLink]="getResultLink(result)" 
                   class="block px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0">
                  <div class="flex items-start space-x-3">
                    <!-- Content -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center space-x-2 mb-1">
                        <h4 class="text-sm font-medium text-gray-900 truncate">{{ result.title }}</h4>
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                              [class]="getTypeBadgeClass(result.type)">
                          {{ getTypeLabel(result.type) }}
                        </span>
                      </div>
                      <p class="text-sm text-gray-600 mb-2 line-clamp-2">{{ result.description }}</p>
                    </div>
                  </div>
                </a>
              }
            </div>

            <!-- View All Results -->
            <div class="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <a [routerLink]="['/courses']" 
                 [queryParams]="{ search: searchControl.value }"
                 class="text-sm text-blue-600 hover:text-blue-700 font-medium">
                Xem tất cả kết quả cho "{{ searchControl.value }}"
              </a>
            </div>
          }

          <!-- No Results -->
          @if (searchControl.value && searchResults().length === 0 && !isLoading()) {
            <div class="p-4 text-center">
              <svg class="mx-auto h-12 w-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <p class="text-sm text-gray-500 mb-2">Không tìm thấy kết quả nào</p>
              <p class="text-xs text-gray-400">Thử tìm kiếm với từ khóa khác</p>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class SearchComponent implements OnInit, OnDestroy {
  searchControl = new FormControl('');
  searchResults = signal<SearchResult[]>([]);
  isSearchFocused = signal(false);
  isLoading = signal(false);
  
  @Output() searchQuery = new EventEmitter<string>();
  
  private destroy$ = new Subject<void>();
  private searchContainer = viewChild<ElementRef>('searchContainer');

  ngOnInit(): void {
    // Setup search with debounce
    this.searchControl.valueChanges
      .pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(query => {
        this.searchQuery.emit(query || '');
        this.performSearch(query || '');
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private performSearch(query: string): void {
    if (!query.trim()) {
      this.isLoading.set(false);
      this.searchResults.set([]);
      return;
    }

    this.isLoading.set(true);
    
    // Simulate API call with mock data
    setTimeout(() => {
      const results = this.getMockSearchResults(query);
      this.searchResults.set(results);
      this.isLoading.set(false);
    }, 300);
  }

  private getMockSearchResults(query: string): SearchResult[] {
    const mockResults: SearchResult[] = [
      {
        id: 'stcw-basic',
        title: 'STCW Cơ bản - An toàn Hàng hải',
        type: 'course',
        description: 'Khóa học cơ bản về an toàn hàng hải theo tiêu chuẩn STCW quốc tế'
      },
      {
        id: 'radar-navigation',
        title: 'Điều hướng Radar và ARPA',
        type: 'course',
        description: 'Học cách sử dụng radar và hệ thống ARPA để điều hướng an toàn'
      },
      {
        id: 'safety-category',
        title: 'An toàn Hàng hải',
        type: 'category',
        description: 'Tất cả khóa học về an toàn, cứu hộ và ứng phó khẩn cấp'
      }
    ];

    return mockResults.filter(result => 
      result.title.toLowerCase().includes(query.toLowerCase()) ||
      result.description.toLowerCase().includes(query.toLowerCase())
    );
  }

  onSearchFocus(): void {
    this.isSearchFocused.set(true);
  }

  onSearchBlur(): void {
    setTimeout(() => {
      this.isSearchFocused.set(false);
    }, 200);
  }

  clearSearch(): void {
    this.searchControl.setValue('');
    this.searchResults.set([]);
  }

  getResultLink(result: SearchResult): string[] {
    switch (result.type) {
      case 'course':
        return ['/courses', result.id];
      case 'instructor':
        return ['/instructors', result.id];
      case 'category':
        return ['/courses', 'category', result.id];
      default:
        return ['/courses'];
    }
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'course':
        return 'Khóa học';
      case 'instructor':
        return 'Giảng viên';
      case 'category':
        return 'Danh mục';
      default:
        return 'Khác';
    }
  }

  getTypeBadgeClass(type: string): string {
    switch (type) {
      case 'course':
        return 'bg-blue-100 text-blue-800';
      case 'instructor':
        return 'bg-green-100 text-green-800';
      case 'category':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}
