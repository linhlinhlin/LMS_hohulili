import { Component, signal, inject, OnInit, OnDestroy, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { debounceTime, distinctUntilChanged, switchMap, startWith, takeUntil, Subject } from 'rxjs';

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
                    <!-- Thumbnail -->
                    <div class="flex-shrink-0">
                      @if (result.thumbnail) {
                        <img [src]="result.thumbnail" 
                             [alt]="result.title"
                             class="w-12 h-12 rounded-lg object-cover">
                      } @else {
                        <div class="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center">
                          @switch (result.type) {
                            @case ('course') {
                              <svg class="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                              </svg>
                            }
                            @case ('instructor') {
                              <svg class="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                              </svg>
                            }
                            @case ('category') {
                              <svg class="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                              </svg>
                            }
                          }
                        </div>
                      }
                    </div>

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
                      
                      <!-- Course specific info -->
                      @if (result.type === 'course') {
                        <div class="flex items-center space-x-4 text-xs text-gray-500">
                          @if (result.level) {
                            <span class="flex items-center">
                              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                              </svg>
                              {{ result.level }}
                            </span>
                          }
                          @if (result.duration) {
                            <span class="flex items-center">
                              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                              </svg>
                              {{ result.duration }}
                            </span>
                          }
                          @if (result.students) {
                            <span class="flex items-center">
                              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                              </svg>
                              {{ result.students }}+ học viên
                            </span>
                          }
                          @if (result.rating) {
                            <span class="flex items-center">
                              <svg class="w-3 h-3 mr-1 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                              </svg>
                              {{ result.rating }}
                            </span>
                          }
                        </div>
                      }
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
  
  private destroy$ = new Subject<void>();
  private searchContainer = viewChild<ElementRef>('searchContainer');

  ngOnInit(): void {
    // Setup search with debounce and real-time suggestions
    this.searchControl.valueChanges
      .pipe(
        startWith(''),
        debounceTime(300), // Wait 300ms after user stops typing
        distinctUntilChanged(), // Only emit when value actually changes
        switchMap(query => this.performSearch(query || '')),
        takeUntil(this.destroy$)
      )
      .subscribe(results => {
        this.searchResults.set(results);
        this.isLoading.set(false);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private performSearch(query: string) {
    if (!query.trim()) {
      this.isLoading.set(false);
      return Promise.resolve([]);
    }

    this.isLoading.set(true);
    
    // Simulate API call with mock data
    return new Promise<SearchResult[]>((resolve) => {
      setTimeout(() => {
        const results = this.getMockSearchResults(query);
        resolve(results);
      }, 500); // Simulate network delay
    });
  }

  private getMockSearchResults(query: string): SearchResult[] {
    const mockResults: SearchResult[] = [
      {
        id: 'stcw-basic',
        title: 'STCW Cơ bản - An toàn Hàng hải',
        type: 'course',
        description: 'Khóa học cơ bản về an toàn hàng hải theo tiêu chuẩn STCW quốc tế',
        level: 'Cơ bản',
        duration: '40h',
        students: 1200,
        rating: 4.8
      },
      {
        id: 'radar-navigation',
        title: 'Điều hướng Radar và ARPA',
        type: 'course',
        description: 'Học cách sử dụng radar và hệ thống ARPA để điều hướng an toàn',
        level: 'Trung cấp',
        duration: '32h',
        students: 750,
        rating: 4.6
      },
      {
        id: 'captain-nguyen',
        title: 'Thuyền trưởng Nguyễn Văn Hải',
        type: 'instructor',
        description: 'Chuyên gia với 20 năm kinh nghiệm điều khiển tàu container',
        thumbnail: '/images/testimonials/captain-portrait.jpg'
      },
      {
        id: 'safety-category',
        title: 'An toàn Hàng hải',
        type: 'category',
        description: 'Tất cả khóa học về an toàn, cứu hộ và ứng phó khẩn cấp'
      }
    ];

    // Simple search logic - in real app, this would be handled by backend
    return mockResults.filter(result => 
      result.title.toLowerCase().includes(query.toLowerCase()) ||
      result.description.toLowerCase().includes(query.toLowerCase())
    );
  }

  onSearchFocus(): void {
    this.isSearchFocused.set(true);
  }

  onSearchBlur(): void {
    // Delay hiding to allow clicking on results
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
