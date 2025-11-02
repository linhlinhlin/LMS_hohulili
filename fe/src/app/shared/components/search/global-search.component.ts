import { Component, signal, computed, inject, OnInit, OnDestroy, ElementRef, viewChild, HostListener, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { debounceTime, distinctUntilChanged, switchMap, startWith, takeUntil, Subject } from 'rxjs';
import { IconComponent, IconName } from '../icon/icon.component';

interface SearchResult {
  id: string;
  title: string;
  type: 'course' | 'instructor' | 'category' | 'path';
  description: string;
  thumbnail?: string;
  level?: string;
  duration?: string;
  students?: number;
  rating?: number;
  url: string;
}

@Component({
  selector: 'app-global-search',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, IconComponent],
  template: `
    <form role="search" class="relative" (submit)="goFullSearch()">
      <label for="global-search" class="sr-only">Tìm kiếm khóa học</label>
      
      <!-- Search Input -->
      <div class="relative">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
          <app-icon name="search" size="sm" />
        </span>
        
        <input 
          id="global-search"
          [formControl]="searchControl"
          type="search"
          [placeholder]="placeholder"
          class="w-full h-10 pl-10 pr-10 rounded-xl border border-border bg-surface text-text placeholder:text-muted/70 outline-none focus:ring-2 focus:ring-focus transition-all duration-fast"
          (focus)="onSearchFocus()"
          (blur)="onSearchBlur()"
          (keydown)="onKeydown($event)"
          role="combobox"
          [attr.aria-expanded]="isOpen()"
          [attr.aria-controls]="'search-results'"
          [attr.aria-activedescendant]="activeId"
          autocomplete="off"
        />
        
        @if (searchControl.value) {
          <button
            type="button"
            (click)="clearSearch()"
            class="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-fast"
            aria-label="Xóa tìm kiếm"
          >
            <app-icon name="x" size="sm" />
          </button>
        }
      </div>

      <!-- Search Results Dropdown -->
      @if (isOpen() && (searchResults().length > 0 || isLoading())) {
        <div 
          id="search-results"
          role="listbox"
          class="absolute z-50 mt-2 w-full rounded-xl border border-border bg-surface shadow-elev-3 overflow-hidden animate-slide-down"
        >
          <!-- Loading State -->
          @if (isLoading()) {
            <div class="p-4 text-center">
              <div class="inline-flex items-center space-x-2 text-muted">
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
            <div class="max-h-[60vh] overflow-y-auto custom-scrollbar">
              @for (result of searchResults(); track result.id; let i = $index) {
                <a 
                  [id]="'search-result-' + i"
                  [routerLink]="result.url"
                  role="option"
                  [attr.aria-selected]="activeIndex() === i"
                  class="block px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-fast border-b border-border last:border-b-0"
                  [class.bg-accent/10]="activeIndex() === i"
                  (mouseenter)="setActive(i)"
                  (click)="selectResult(result)"
                >
                  <div class="flex items-start space-x-3">
                    <!-- Thumbnail/Icon -->
                    <div class="flex-shrink-0">
                      @if (result.thumbnail) {
                        <img 
                          [src]="result.thumbnail" 
                          [alt]="result.title"
                          class="w-10 h-10 rounded-lg object-cover"
                        />
                      } @else {
                        <div class="w-10 h-10 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center">
                          <app-icon [name]="getResultIcon(result.type)" size="sm" />
                        </div>
                      }
                    </div>

                    <!-- Content -->
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center space-x-2 mb-1">
                        <h4 class="text-sm font-medium text-text truncate">{{ result.title }}</h4>
                        <span 
                          class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                          [class]="getTypeBadgeClass(result.type)"
                        >
                          {{ getTypeLabel(result.type) }}
                        </span>
                      </div>
                      
                      <p class="text-sm text-muted mb-2 line-clamp-2">{{ result.description }}</p>
                      
                      <!-- Course specific info -->
                      @if (result.type === 'course') {
                        <div class="flex items-center space-x-3 text-xs text-muted">
                          @if (result.level) {
                            <span class="flex items-center">
                              <app-icon name="star" size="xs" class="mr-1" />
                              {{ result.level }}
                            </span>
                          }
                          @if (result.duration) {
                            <span class="flex items-center">
                              <app-icon name="clock" size="xs" class="mr-1" />
                              {{ result.duration }}
                            </span>
                          }
                          @if (result.students) {
                            <span class="flex items-center">
                              <app-icon name="user" size="xs" class="mr-1" />
                              {{ result.students }}+ học viên
                            </span>
                          }
                          @if (result.rating) {
                            <span class="flex items-center">
                              <app-icon name="star" size="xs" class="mr-1 text-accent" />
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
            <div class="px-4 py-3 bg-black/5 dark:bg-white/5 border-t border-border">
              <a 
                [routerLink]="['/courses']" 
                [queryParams]="{ search: searchControl.value }"
                class="text-sm text-accent hover:text-accent-press font-medium transition-colors duration-fast"
                (click)="closeSearch()"
              >
                Xem tất cả kết quả cho "{{ searchControl.value }}"
              </a>
            </div>
          }

          <!-- No Results -->
          @if (!isLoading() && searchControl.value && searchResults().length === 0) {
            <div class="p-4 text-center">
              <app-icon name="search" size="lg" class="mx-auto mb-2 text-muted" />
              <p class="text-sm text-muted mb-1">Không tìm thấy kết quả nào</p>
              <p class="text-xs text-muted">Thử tìm kiếm với từ khóa khác</p>
            </div>
          }
        </div>
      }
    </form>
  `
})
export class GlobalSearchComponent implements OnInit, OnDestroy {
  @Input() collapsed: boolean = false;
  
  searchControl = new FormControl('');
  searchResults = signal<SearchResult[]>([]);
  isOpen = signal(false);
  isLoading = signal(false);
  activeIndex = signal(-1);
  
  private destroy$ = new Subject<void>();
  private searchTimeout?: number;

  get placeholder(): string {
    return this.collapsed 
      ? 'Tìm kiếm...' 
      : 'Tìm khóa học, chủ đề, giảng viên…';
  }

  get activeId(): string {
    const index = this.activeIndex();
    return index >= 0 ? `search-result-${index}` : '';
  }

  ngOnInit(): void {
    // Setup search with debounce
    this.searchControl.valueChanges
      .pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(query => this.performSearch(query || '')),
        takeUntil(this.destroy$)
      )
      .subscribe(results => {
        this.searchResults.set(results);
        this.isLoading.set(false);
        this.activeIndex.set(-1);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.isOpen()) return;

    switch (event.key) {
      case 'Escape':
        this.closeSearch();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.navigateResults(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.navigateResults(-1);
        break;
      case 'Enter':
        event.preventDefault();
        this.selectActiveResult();
        break;
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !this.searchControl.value) {
      event.preventDefault();
      this.goFullSearch();
    }
  }

  onSearchFocus(): void {
    this.isOpen.set(true);
  }

  onSearchBlur(): void {
    // Delay hiding to allow clicking on results
    setTimeout(() => {
      this.isOpen.set(false);
    }, 200);
  }

  clearSearch(): void {
    this.searchControl.setValue('');
    this.searchResults.set([]);
    this.activeIndex.set(-1);
  }

  closeSearch(): void {
    this.isOpen.set(false);
    this.activeIndex.set(-1);
  }

  setActive(index: number): void {
    this.activeIndex.set(index);
  }

  navigateResults(direction: number): void {
    const results = this.searchResults();
    if (results.length === 0) return;

    const currentIndex = this.activeIndex();
    let newIndex = currentIndex + direction;

    if (newIndex < 0) {
      newIndex = results.length - 1;
    } else if (newIndex >= results.length) {
      newIndex = 0;
    }

    this.activeIndex.set(newIndex);
  }

  selectActiveResult(): void {
    const results = this.searchResults();
    const activeIndex = this.activeIndex();
    
    if (activeIndex >= 0 && activeIndex < results.length) {
      this.selectResult(results[activeIndex]);
    } else if (results.length > 0) {
      this.selectResult(results[0]);
    }
  }

  selectResult(result: SearchResult): void {
    this.closeSearch();
    // Navigation will be handled by routerLink
  }

  goFullSearch(): void {
    if (this.searchControl.value) {
      this.closeSearch();
      // Navigate to courses page with search query
      // This would be handled by the router
    }
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
      }, 500);
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
        rating: 4.8,
        url: '/courses/stcw-basic'
      },
      {
        id: 'radar-navigation',
        title: 'Điều hướng Radar và ARPA',
        type: 'course',
        description: 'Học cách sử dụng radar và hệ thống ARPA để điều hướng an toàn',
        level: 'Trung cấp',
        duration: '32h',
        students: 750,
        rating: 4.6,
        url: '/courses/radar-navigation'
      },
      {
        id: 'captain-nguyen',
        title: 'Thuyền trưởng Nguyễn Văn Hải',
        type: 'instructor',
        description: 'Chuyên gia với 20 năm kinh nghiệm điều khiển tàu container',
        url: '/instructors/captain-nguyen'
      },
      {
        id: 'safety-category',
        title: 'An toàn Hàng hải',
        type: 'category',
        description: 'Tất cả khóa học về an toàn, cứu hộ và ứng phó khẩn cấp',
        url: '/courses?category=safety'
      },
      {
        id: 'maritime-path',
        title: 'Lộ trình Sĩ quan Boong',
        type: 'path',
        description: 'Lộ trình học tập toàn diện để trở thành sĩ quan boong chuyên nghiệp',
        url: '/paths/maritime-officer'
      }
    ];

    // Simple search logic
    return mockResults.filter(result => 
      result.title.toLowerCase().includes(query.toLowerCase()) ||
      result.description.toLowerCase().includes(query.toLowerCase())
    );
  }

  getResultIcon(type: string): IconName {
    switch (type) {
      case 'course': return 'book';
      case 'instructor': return 'user';
      case 'category': return 'grid';
      case 'path': return 'courses';
      default: return 'book';
    }
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'course': return 'Khóa học';
      case 'instructor': return 'Giảng viên';
      case 'category': return 'Danh mục';
      case 'path': return 'Lộ trình';
      default: return 'Khác';
    }
  }

  getTypeBadgeClass(type: string): string {
    switch (type) {
      case 'course': return 'bg-primary/10 text-primary';
      case 'instructor': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'category': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'path': return 'bg-accent/20 text-accent-press';
      default: return 'bg-muted/10 text-muted';
    }
  }
}