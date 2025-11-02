import { Component, signal, ChangeDetectionStrategy, ViewEncapsulation, inject, OnInit, OnDestroy, HostListener, HostBinding, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MegaMenuComponent } from './mega-menu/mega-menu.component';

@Component({
  selector: 'app-public-header',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MegaMenuComponent],
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./public-header.component.scss'],
  template: `
    <header class="fixed top-0 left-0 right-0 z-50 bg-white transition-all duration-300"
            [class.shadow-lg]="isScrolled()">
      
      <!-- Top Header - Dark Maritime Theme - Shrinks on scroll -->
      <div class="maritime-top-header text-white transition-all duration-300 overflow-hidden"
           [class.max-h-0]="isScrolled()"
           [class.opacity-0]="isScrolled()"
           [class.py-3]="!isScrolled()"
           [class.transform]="isScrolled()"
           [class.-translate-y-full]="isScrolled()"
           style="max-height: 50px;">
        <div class="max-w-7xl mx-auto px-8">
          <div class="flex items-center justify-between h-9">
            <!-- User Type Selector -->
            <div class="flex items-center space-x-6">
              <span class="text-xs font-medium text-slate-300">Đối tượng sử dụng:</span>
              <div class="user-type-selector flex items-center space-x-4">
                <button 
                  (click)="setUserType('personal')"
                  [class]="getUserTypeClass('personal')"
                  class="text-xs font-medium px-3 py-1 rounded-full transition-all duration-200 hover:bg-white/10">
                  Cá nhân
                </button>
                <button 
                  (click)="setUserType('business')"
                  [class]="getUserTypeClass('business')"
                  class="text-xs font-medium px-3 py-1 rounded-full transition-all duration-200 hover:bg-white/10">
                  Doanh nghiệp
                </button>
                <button 
                  (click)="setUserType('school')"
                  [class]="getUserTypeClass('school')"
                  class="text-xs font-medium px-3 py-1 rounded-full transition-all duration-200 hover:bg-white/10">
                  Trường học
                </button>
                <button 
                  (click)="setUserType('government')"
                  [class]="getUserTypeClass('government')"
                  class="text-xs font-medium px-3 py-1 rounded-full transition-all duration-200 hover:bg-white/10">
                  Chính phủ
                </button>
              </div>
            </div>

            <!-- Top Actions -->
            <div class="flex items-center space-x-4">
              <!-- Language Switcher -->
              <button class="flex items-center space-x-2 text-xs text-slate-300 hover:text-white transition-colors duration-200">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578a18.87 18.87 0 01-1.724 4.78c.29.354.596.696.914 1.026a1 1 0 11-1.44 1.389c-.188-.196-.373-.396-.554-.6a19.098 19.098 0 01-3.107 3.567 1 1 0 01-1.334-1.49 17.087 17.087 0 003.13-3.733 18.992 18.992 0 01-1.487-2.494 1 1 0 111.79-.89c.407.822.761 1.67 1.056 2.54H4a1 1 0 110-2h3V3a1 1 0 011-1zM6 12a1 1 0 100 2h8a1 1 0 100-2H6z" clip-rule="evenodd"></path>
                </svg>
                <span>VN</span>
              </button>

              <!-- Support -->
              <a href="/support" class="text-xs text-slate-300 hover:text-white transition-colors duration-200">
                Hỗ trợ
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Header - Main Maritime Deck - Shrinks on scroll -->
      <div class="bg-white transition-all duration-300"
           [class.-mt-12]="isScrolled()">
        <div class="max-w-7xl mx-auto px-8">
          <!-- Desktop Layout - All items in one row -->
          <div class="hidden lg:flex items-center justify-between transition-all duration-300"
               [class.h-20]="!isScrolled()"
               [class.h-16]="isScrolled()">
          
            <!-- Left: Logo - Shrinks on scroll -->
            <div class="flex-shrink-0">
              <a routerLink="/" class="flex items-center group">
                <div class="bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center mr-3 transition-all duration-300"
                     [class.w-14]="!isScrolled()"
                     [class.h-14]="!isScrolled()"
                     [class.w-10]="isScrolled()"
                     [class.h-10]="isScrolled()">
                    <!-- Compass Background Circle -->
                    <div class="absolute inset-2 bg-white/10 rounded-full pointer-events-none"></div>
                    
                    <!-- Compass Needle -->
                    <div class="relative w-8 h-8 pointer-events-none">
                      <!-- North Pointer -->
                      <div class="absolute top-0 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-b-4 border-transparent border-b-white"></div>
                      <!-- South Pointer -->
                      <div class="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-4 border-transparent border-t-white/60"></div>
                      <!-- Center Dot -->
                      <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full"></div>
                    </div>
                    
                    <!-- Wave Decorations -->
                    <div class="wave-decoration absolute -bottom-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full opacity-80 pointer-events-none"></div>
                    <div class="absolute -top-1 -left-1 w-2 h-2 bg-yellow-300 rounded-full opacity-60 pointer-events-none"></div>
                    
                    <!-- Subtle border -->
                    <div class="absolute inset-0 border-2 border-white/20 rounded-full pointer-events-none"></div>
                  </div>
                
                <span class="font-bold text-gray-900 group-hover:text-blue-600 transition-all duration-300"
                      [class.text-xl]="!isScrolled()"
                      [class.text-lg]="isScrolled()">
                  LMS Maritime
                </span>
              </a>
            </div>

            <!-- Center: Search Box - MAIN FOCUS (Udemy/Coursera Style) -->
            <div class="flex-1 max-w-4xl mx-8 transition-all duration-300"
                 [class.max-w-3xl]="isScrolled()">
              <div class="search-lighthouse relative">
                <!-- Search Input -->
                <input 
                  type="text" 
                  placeholder="Bạn muốn học gì hôm nay?"
                  [(ngModel)]="searchQuery"
                  (input)="onSearch($event)"
                  (focus)="onSearchFocus()"
                  (blur)="onSearchBlur()"
                  [class]="getSearchInputClass()"
                  class="search-input w-full h-14 pl-16 pr-6 text-lg border-2 border-gray-300 rounded-3xl focus:outline-none focus:border-yellow-400 focus:shadow-lg focus:shadow-yellow-100 bg-gray-50 focus:bg-white transition-all duration-300 shadow-sm">
                
                <!-- Search Icon - Lighthouse -->
                <div class="absolute left-5 top-1/2 transform -translate-y-1/2">
                  <svg class="search-icon w-6 h-6 text-gray-400 transition-all duration-300" 
                       [class]="isSearchFocused() ? 'focused text-yellow-500' : 'text-gray-400'"
                       fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"></path>
                  </svg>
                </div>

                <!-- Maritime Search Suggestions -->
                @if (isSearchFocused() && searchSuggestions().length > 0) {
                  <div class="search-suggestions-container absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-50">
                    <!-- Chuyên ngành nổi bật -->
                    <div class="px-6 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
                      <h4 class="text-sm font-semibold text-blue-800 mb-2">Chuyên ngành nổi bật</h4>
                      @for (suggestion of searchSuggestions().slice(0, 4); track suggestion) {
                        <button 
                          (click)="selectSuggestion(suggestion)"
                          class="w-full text-left hover:bg-white/50 transition-colors duration-200 rounded-lg p-2 mb-1">
                          <div class="flex items-center space-x-3">
                            <svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                            </svg>
                            <span class="text-gray-700 text-sm">{{ suggestion }}</span>
                          </div>
                        </button>
                      }
                    </div>
                    
                    <!-- Đang phổ biến hiện nay -->
                    <div class="px-6 py-3 bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-gray-100">
                      <h4 class="text-sm font-semibold text-orange-800 mb-2">Đang phổ biến hiện nay</h4>
                      @for (suggestion of searchSuggestions().slice(4, 9); track suggestion) {
                        <button 
                          (click)="selectSuggestion(suggestion)"
                          class="w-full text-left hover:bg-white/50 transition-colors duration-200 rounded-lg p-2 mb-1">
                          <div class="flex items-center space-x-3">
                            <svg class="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                            </svg>
                            <span class="text-gray-700 text-sm font-medium">"{{ suggestion }}"</span>
                          </div>
                        </button>
                      }
                    </div>
                    
                    <!-- CTA định hướng -->
                    <div class="px-6 py-3 bg-gradient-to-r from-green-50 to-emerald-50">
                      <h4 class="text-sm font-semibold text-green-800 mb-2">Cần hỗ trợ?</h4>
                      <button 
                        (click)="goToAssessment()"
                        class="w-full text-left hover:bg-white/50 transition-colors duration-200 rounded-lg p-2">
                        <div class="flex items-center space-x-3">
                          <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"></path>
                          </svg>
                          <span class="text-gray-700 text-sm">{{ searchSuggestions()[9] }}</span>
                        </div>
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Right: Navigation & Auth -->
            <div class="flex items-center space-x-6">
              <!-- Navigation Links -->
              <nav class="hidden lg:flex items-center space-x-6">
                <a routerLink="/" routerLinkActive="text-blue-600" 
                   class="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">
                  Trang chủ
                </a>
                
                <!-- Mega Menu for Courses -->
                <app-mega-menu></app-mega-menu>
                
                <a routerLink="/about" routerLinkActive="text-blue-600"
                   class="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">
                  Giới thiệu
                </a>
                <a routerLink="/contact" routerLinkActive="text-blue-600"
                   class="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">
                  Liên hệ
                </a>
              </nav>

              <!-- Auth Buttons -->
              <div class="flex items-center space-x-3">
                <a routerLink="/auth/login" 
                   class="text-gray-700 hover:text-blue-600 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200">
                  Đăng nhập
                </a>
                <a routerLink="/auth/register" 
                   class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md text-sm font-semibold transition-all duration-200 hover:shadow-md">
                  Tham gia miễn phí
                </a>
              </div>
            </div>
          </div>

          <!-- Mobile Layout -->
          <div class="lg:hidden">
            <div class="flex justify-between items-center h-16">
              <!-- Mobile Logo -->
              <div class="flex-shrink-0">
                <a routerLink="/" class="flex items-center">
                  <div class="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center mr-2">
                    <span class="text-white text-sm font-bold">🚢</span>
                  </div>
                  <span class="text-lg font-bold text-gray-900">LMS Maritime</span>
                </a>
              </div>

              <!-- Mobile menu button -->
              <button 
                type="button" 
                (click)="toggleMobileMenu()"
                class="text-gray-700 hover:text-blue-600 focus:outline-none focus:text-blue-600 p-2 rounded-md transition-colors duration-200">
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  @if (isMobileMenuOpen()) {
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  } @else {
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                  }
                </svg>
              </button>
            </div>

            <!-- Mobile Search Bar -->
            <div class="pb-4">
              <div class="search-lighthouse relative">
                <!-- Search Input -->
                <input 
                  type="text" 
                  placeholder="Bạn muốn học gì hôm nay?"
                  [(ngModel)]="searchQuery"
                  (input)="onSearch($event)"
                  class="w-full h-12 pl-12 pr-4 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-gray-50 focus:bg-white transition-all duration-200">
                <svg class="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Mobile Menu Overlay -->
      @if (isMobileMenuOpen()) {
        <div class="lg:hidden">
          <!-- Backdrop -->
          <div class="fixed inset-0 bg-gray-600 bg-opacity-75 z-40" 
               (click)="closeMobileMenu()"></div>
          
          <!-- Menu Panel -->
          <div class="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out">
            <div class="flex flex-col h-full">
              <!-- Menu Header -->
              <div class="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 class="text-lg font-semibold text-gray-900">Menu</h2>
                <button 
                  (click)="closeMobileMenu()"
                  class="text-gray-400 hover:text-gray-600 p-2 rounded-md transition-colors duration-200">
                  <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <!-- Menu Content -->
              <div class="flex-1 overflow-y-auto">
                <nav class="px-4 py-6 space-y-1">
                  <a routerLink="/" 
                     (click)="closeMobileMenu()"
                     routerLinkActive="bg-blue-50 text-blue-600"
                     class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-200">
                    Trang chủ
                  </a>
                  
                  <!-- Mobile Courses Section -->
                  <div class="py-2">
                    <div class="px-3 py-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                      Khám phá
                    </div>
                    <a routerLink="/courses" 
                       (click)="closeMobileMenu()"
                       class="block px-6 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-200">
                      Tất cả khóa học
                    </a>
                    <a routerLink="/courses" 
                       (click)="closeMobileMenu()"
                       [queryParams]="{ category: 'safety' }"
                       class="block px-6 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-200">
                      An toàn Hàng hải
                    </a>
                    <a routerLink="/courses" 
                       (click)="closeMobileMenu()"
                       [queryParams]="{ category: 'navigation' }"
                       class="block px-6 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-200">
                      Điều khiển Tàu
                    </a>
                    <a routerLink="/courses" 
                       (click)="closeMobileMenu()"
                       [queryParams]="{ category: 'engineering' }"
                       class="block px-6 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-200">
                      Kỹ thuật Máy tàu
                    </a>
                  </div>

                  <a routerLink="/about" 
                     (click)="closeMobileMenu()"
                     routerLinkActive="bg-blue-50 text-blue-600"
                     class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-200">
                    Giới thiệu
                  </a>
                  <a routerLink="/contact" 
                     (click)="closeMobileMenu()"
                     routerLinkActive="bg-blue-50 text-blue-600"
                     class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-200">
                    Liên hệ
                  </a>
                </nav>
              </div>

              <!-- Mobile Auth Buttons -->
              <div class="border-t border-gray-200 p-4 space-y-3">
                <a routerLink="/auth/login" 
                   (click)="closeMobileMenu()"
                   class="block w-full text-center px-4 py-2 border border-gray-300 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200">
                  Đăng nhập
                </a>
                <a routerLink="/auth/register" 
                   (click)="closeMobileMenu()"
                   class="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-md text-base font-medium hover:bg-blue-700 transition-colors duration-200">
                  Tham gia miễn phí
                </a>
              </div>
            </div>
          </div>
        </div>
      }
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PublicHeaderComponent implements OnInit, OnDestroy {
  private router = inject(Router);

  // Signals
  searchQuery = signal('');
  isMobileMenuOpen = signal(false);
  isSearchFocused = signal(false);
  selectedUserType = signal('personal');
  searchSuggestions = signal<string[]>([]);
  isScrolled = signal(false);
  
  // Scroll management
  private lastScrollY = 0;
  private scrollThreshold = 10;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    // Initialize scroll state only in browser
    if (isPlatformBrowser(this.platformId)) {
      this.lastScrollY = window.scrollY;
      this.updateScrollState();
    }
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.updateScrollState();
    }
  }

  @HostBinding('class.scrolled')
  get scrolled(): boolean {
    return this.isScrolled();
  }

  private updateScrollState(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const currentScrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    
    // Determine scroll direction
    const isScrollingDown = currentScrollY > this.lastScrollY;
    const isScrollingUp = currentScrollY < this.lastScrollY;
    
    // Only update state if scroll is significant enough
    if (Math.abs(currentScrollY - this.lastScrollY) > this.scrollThreshold) {
      if (isScrollingDown && currentScrollY > 50) {
        // Scrolling down and past initial threshold - hide top bar
        this.isScrolled.set(true);
      } else if (isScrollingUp || currentScrollY <= 50) {
        // Scrolling up or near top - show top bar
        this.isScrolled.set(false);
      }
      
      this.lastScrollY = currentScrollY;
    }
  }

  // Maritime search suggestions data
  private suggestions = [
    // Chuyên ngành nổi bật
    'Điều hướng & Radar nâng cao – Hợp tác với IMO',
    'An toàn & Cứu sinh – Chứng chỉ SOLAS',
    'Quản lý cảng biển hiện đại – ĐH Hàng hải VN',
    'GMDSS – Thông tin liên lạc tàu biển – Bộ GTVT',
    
    // Đang phổ biến hiện nay
    'ECDIS',
    'Radar ARPA',
    'STCW cơ bản',
    'Quản lý đội tàu',
    'MARPOL',
    
    // CTA định hướng
    'Không chắc nên bắt đầu từ đâu? → Làm bài kiểm tra định hướng lộ trình học'
  ];

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    const query = target.value;
    this.searchQuery.set(query);
    
    // Filter suggestions based on query
    if (query.length > 0) {
      const filtered = this.suggestions.filter(s => 
        s.toLowerCase().includes(query.toLowerCase())
      );
      this.searchSuggestions.set(filtered.slice(0, 5));
    } else {
      this.searchSuggestions.set([]);
    }
  }

  onSearchFocus(): void {
    this.isSearchFocused.set(true);
    if (this.searchQuery().length > 0) {
      this.searchSuggestions.set(this.suggestions.slice(0, 5));
    }
  }

  onSearchBlur(): void {
    // Delay to allow clicking on suggestions
    setTimeout(() => {
      this.isSearchFocused.set(false);
      this.searchSuggestions.set([]);
    }, 200);
  }

  getSearchInputClass(): string {
    return this.isSearchFocused() 
      ? 'ring-2 ring-yellow-400 ring-opacity-50' 
      : '';
  }

  selectSuggestion(suggestion: string): void {
    this.searchQuery.set(suggestion);
    this.searchSuggestions.set([]);
    this.isSearchFocused.set(false);
    
    // Navigate to search results or specific course
    this.navigateToSearch(suggestion);
  }

  private navigateToSearch(query: string): void {
    // Map suggestions to specific routes
    const suggestionRoutes: { [key: string]: string } = {
      'Điều hướng & Radar nâng cao – Hợp tác với IMO': '/courses/navigation',
      'An toàn & Cứu sinh – Chứng chỉ SOLAS': '/courses/safety',
      'Quản lý cảng biển hiện đại – ĐH Hàng hải VN': '/courses/logistics',
      'GMDSS – Thông tin liên lạc tàu biển – Bộ GTVT': '/courses/navigation',
      'ECDIS': '/courses/navigation',
      'Radar ARPA': '/courses/navigation',
      'STCW cơ bản': '/courses/safety',
      'Quản lý đội tàu': '/courses/logistics',
      'MARPOL': '/courses/law',
      'Không chắc nên bắt đầu từ đâu? → Làm bài kiểm tra định hướng lộ trình học': '/assessment'
    };

    const route = suggestionRoutes[query];
    if (route) {
      this.router.navigate([route]);
    } else {
      // Default to courses page with search query
      this.router.navigate(['/courses'], { queryParams: { search: query } });
    }
  }

  setUserType(type: string): void {
    this.selectedUserType.set(type);
    // TODO: Update user type context
    console.log('User type set to:', type);
  }

  getUserTypeClass(type: string): string {
    return this.selectedUserType() === type 
      ? 'bg-white/20 text-white' 
      : 'text-slate-300 hover:text-white';
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  goToRegister(): void {
    this.router.navigate(['/auth/register']);
  }

  goToAssessment(): void {
    this.router.navigate(['/assessment']);
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.set(!this.isMobileMenuOpen());
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }
}