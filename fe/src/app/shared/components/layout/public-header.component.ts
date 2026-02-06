import { Component, signal, ChangeDetectionStrategy, ViewEncapsulation, inject, OnInit, OnDestroy, HostListener, HostBinding, PLATFORM_ID, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MegaMenuComponent } from './mega-menu/mega-menu.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-public-header',
  imports: [RouterModule, FormsModule, MegaMenuComponent],
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./public-header.component.scss'],
  templateUrl: './public-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PublicHeaderComponent implements OnInit, OnDestroy {
  private platformId = inject<Object>(PLATFORM_ID);

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

  // Auth service and user menu
  protected authService = inject(AuthService);
  showUserMenu = signal(false);

  // Reactive user state signal - updated via subscription
  private currentUser = signal<any>(null);
  private userSubscription: any;

  // Computed: Check if user is logged in based on reactive signal
  isLoggedIn = computed(() => !!this.currentUser());

  // User info getters - only return value if user exists
  userName = () => this.currentUser()?.fullName || this.currentUser()?.name || '';
  userRole = () => this.currentUser()?.role || '';

  getUserInitials(): string {
    const name = this.userName();
    if (!name || name.length === 0) return '';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  toggleUserMenu(): void {
    this.showUserMenu.set(!this.showUserMenu());
  }

  closeUserMenu(): void {
    this.showUserMenu.set(false);
  }

  logout(): void {
    this.closeUserMenu();
    this.authService.logout();
  }

  getDashboardRoute(): string {
    const role = this.userRole();
    switch (role) {
      case 'admin': return '/admin/dashboard';
      case 'teacher': return '/teacher/dashboard';
      default: return '/student/dashboard';
    }
  }

  getMyCoursesRoute(): string {
    const role = this.userRole();
    switch (role) {
      case 'teacher': return '/teacher/courses';
      default: return '/student/my-courses';
    }
  }

  ngOnInit(): void {
    // Subscribe to auth state changes for reactive updates
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser.set(user);
    });

    // Initialize scroll state only in browser
    if (isPlatformBrowser(this.platformId)) {
      this.lastScrollY = window.scrollY;
      this.updateScrollState();
    }
  }

  ngOnDestroy(): void {
    // Cleanup subscription to prevent memory leaks
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
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
    'Điều hướng & Radar nâng cao â€“ Hợp tác với IMO',
    'An toàn & Cứu sinh â€“ Chứng chỉ SOLAS',
    'Quản lý cảng biển hiện đại â€“ ĐH Hàng hải VN',
    'GMDSS â€“ Thông tin liên lạc tàu biển â€“ Bộ GTVT',

    // Đang phổ biến hiện nay
    'ECDIS',
    'Radar ARPA',
    'STCW cơ bản',
    'Quản lý đội tàu',
    'MARPOL',

    // CTA định hướng
    'Không chắc nên bắt đầu từ đâu? â†’ Làm bài kiểm tra định hướng lộ trình học'
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
      'Điều hướng & Radar nâng cao â€“ Hợp tác với IMO': '/courses/navigation',
      'An toàn & Cứu sinh â€“ Chứng chỉ SOLAS': '/courses/safety',
      'Quản lý cảng biển hiện đại â€“ ĐH Hàng hải VN': '/courses/logistics',
      'GMDSS â€“ Thông tin liên lạc tàu biển â€“ Bộ GTVT': '/courses/navigation',
      'ECDIS': '/courses/navigation',
      'Radar ARPA': '/courses/navigation',
      'STCW cơ bản': '/courses/safety',
      'Quản lý đội tàu': '/courses/logistics',
      'MARPOL': '/courses/law',
      'Không chắc nên bắt đầu từ đâu? â†’ Làm bài kiểm tra định hướng lộ trình học': '/assessment'
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

