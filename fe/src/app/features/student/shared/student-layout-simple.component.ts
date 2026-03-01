import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';

import { RouterModule, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { SidebarComponent, SidebarConfig } from '../../../shared/components/navigation/sidebar.component';
import { studentSidebarConfig as baseStudentSidebarConfig } from '../../../shared/components/navigation/sidebar.config';
import { NotificationBellComponent } from '../../../shared/components/notification-bell.component';
import { NotificationService } from '../../../core/services/notification.service';
import { MessagingService } from '../../../core/services/messaging.service';
import { ChatWidgetComponent } from '../../ai-chat/presentation/components/chat-widget/chat-widget.component';

@Component({
  selector: 'app-student-layout-simple',
  imports: [RouterModule, RouterOutlet, SidebarComponent, NotificationBellComponent, ChatWidgetComponent],
  template: `
    <!-- Modern gradient background -->
    <div class="min-h-screen flex flex-col">
      <!-- Desktop Sidebar - Full Height -->
      @if (!shouldHideSidebar()) {
        <div [class]="'hidden md:flex md:flex-col md:fixed md:inset-y-0 md:z-40 transition-all duration-300 '
          + (sidebarCollapsed() ? 'md:w-16' : 'md:w-72')">
          <app-sidebar [config]="studentSidebarConfig()"
            [collapsed]="sidebarCollapsed()"
            (toggleCollapse)="toggleSidebarCollapse()"></app-sidebar>
        </div>
      }
    
      <!-- Mobile sidebar overlay with backdrop blur -->
      @if (isMobileSidebarOpen() && !shouldHideSidebar()) {
        <div
          class="fixed inset-0 z-50 md:hidden"
          (click)="toggleMobileSidebar()">
          <div class="fixed inset-0 bg-black/60 backdrop-blur-sm"></div>
          <div class="fixed inset-y-0 left-0 w-72 bg-white/95 backdrop-blur-xl shadow-2xl border-r border-white/20">
            <app-sidebar [config]="studentSidebarConfig()"
              [collapsed]="false"></app-sidebar>
          </div>
        </div>
      }
    
      <!-- Main content area -->
      <div [class]="shouldHideSidebar()
        ? 'flex flex-col flex-1 min-h-0'
        : 'flex flex-col flex-1 min-h-0 transition-all duration-300 '
          + (sidebarCollapsed() ? 'md:pl-16' : 'md:pl-72')">
        <!-- Modern top navigation bar - Mobile only -->
        <header class="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 md:hidden shadow-sm">
          <div class="px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
              <div class="flex items-center space-x-3">
                <!-- Modern hamburger menu -->
                <button (click)="toggleMobileSidebar()"
                  class="p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 focus:outline-none focus:ring-2 focus:ring-[#0056D2]/20 transition-all duration-200">
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
    
                <!-- Modern logo/brand -->
                <div class="flex items-center space-x-2">
                  <div class="w-8 h-8 bg-[#0056D2] rounded-lg flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                    </svg>
                  </div>
                  <h1 class="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    Cổng Học viên
                  </h1>
                </div>
              </div>
    
              <!-- Modern user menu -->
              <div class="flex items-center space-x-3">
                <!-- Notification Bell -->
                <app-notification-bell></app-notification-bell>
    
                <!-- User avatar and info -->
                <div class="flex items-center space-x-2">
                  <div class="w-8 h-8 bg-[#0056D2] rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {{ getUserInitials() }}
                  </div>
                  <div class="hidden sm:block">
                    <p class="text-sm font-medium text-gray-900">{{ authService.currentUser()?.fullName }}</p>
                    <p class="text-xs text-gray-500">Student</p>
                  </div>
                </div>
    
                <!-- Logout button — soft logout when offline (Moodle "Change Site" pattern) -->
                <button (click)="logout()"
                  class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500/20">
                  <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>
    
        <!-- Page content with modern spacing -->
        <main class="flex-1 overflow-auto bg-transparent">
          <router-outlet></router-outlet>
        </main>
    
        <!-- Mobile Bottom Navigation Bar - Like Udemy/Coursera -->
        @if (!shouldHideSidebar()) {
          <nav class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-gray-200/50 shadow-2xl">
            <div class="flex items-center justify-around px-2 py-2">
              <!-- Dashboard -->
              <a routerLink="/student"
                routerLinkActive="text-[#0056D2]"
                [routerLinkActiveOptions]="{exact: true}"
                class="flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 min-w-0 flex-1">
                <div class="w-6 h-6 mb-1">
                  <svg class="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z"></path>
                  </svg>
                </div>
                <span class="text-xs font-medium">Trang chủ</span>
              </a>
              <!-- My Courses -->
              <a routerLink="/student/my-courses"
                routerLinkActive="text-emerald-600"
                class="flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 min-w-0 flex-1">
                <div class="w-6 h-6 mb-1">
                  <svg class="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                  </svg>
                </div>
                <span class="text-xs font-medium">Khóa học</span>
              </a>
              <!-- Assignments -->
              <a routerLink="/student/assignments"
                routerLinkActive="text-purple-600"
                class="flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 min-w-0 flex-1 relative">
                <div class="w-6 h-6 mb-1">
                  <svg class="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                  </svg>
                </div>
                <span class="text-xs font-medium">Bài tập</span>
              </a>
              <!-- Grades -->
              <a routerLink="/student/grades"
                routerLinkActive="text-orange-600"
                class="flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 min-w-0 flex-1">
                <div class="w-6 h-6 mb-1">
                  <svg class="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <span class="text-xs font-medium">Bảng điểm</span>
              </a>
              <!-- Profile -->
              <a routerLink="/student/profile"
                routerLinkActive="text-slate-600"
                class="flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 min-w-0 flex-1">
                <div class="w-6 h-6 mb-1">
                  <svg class="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                </div>
                <span class="text-xs font-medium">Hồ sơ</span>
              </a>
            </div>
          </nav>
        }
    
        <!-- Add bottom padding for mobile navigation -->
        @if (!shouldHideSidebar()) {
          <div class="h-20 md:hidden"></div>
        }
      </div>
    
      <!-- AI Chat Widget -->
      <app-chat-widget />
    </div>
    `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentLayoutSimpleComponent implements OnInit, OnDestroy {
  protected authService = inject(AuthService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private messagingService = inject(MessagingService);
  protected isMobileSidebarOpen = signal(false);
  protected sidebarCollapsed = signal(false);

  // Dynamic sidebar config with unread messages badge
  protected studentSidebarConfig = computed<SidebarConfig>(() => {
    const unreadCount = this.messagingService.totalUnreadCount();
    const config = { ...baseStudentSidebarConfig };
    config.menuItems = config.menuItems.map(item => {
      if (item.route === '/student/messages') {
        return {
          ...item,
          badge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount.toString()) : undefined
        };
      }
      return item;
    });
    return config;
  });

  // Sidebar visibility state persisted in localStorage
  private sidebarHidden = signal<boolean>(false);

  // Hide sidebar when in learning interface for focused experience
  protected shouldHideSidebar = computed(() => {
    return this.sidebarHidden();
  });

  private routerSubscription?: Subscription;

  ngOnInit() {
    // Initialize notification service with current user ID
    const userId = this.authService.currentUser()?.id || 'student-1';
    this.notificationService.initialize(userId);

    // Initialize messaging service for unread count
    this.messagingService.setCurrentUserId(userId);
    this.messagingService.getConversations().subscribe({
      error: () => {} // Non-blocking init — silent fail is acceptable
    });

    // Load sidebar state from localStorage on initialization
    this.loadSidebarState();
    this.loadCollapsedState();

    // Subscribe to router events to detect navigation changes
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.handleRouteChange(event.urlAfterRedirects);
      });

    // Handle initial route
    this.handleRouteChange(this.router.url);
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  private handleRouteChange(url: string) {
    const isInLearningInterface = url.includes('/student/learn/course/');
    const isInQuiz = url.includes('/student/quiz/take/'); // Hide sidebar when taking quiz
    const shouldHide = isInLearningInterface || isInQuiz || url.includes('/ai-chat');
    const isCurrentlyHidden = this.sidebarHidden();

    // Auto-hide sidebar when entering learning interface or quiz
    if (shouldHide && !isCurrentlyHidden) {
      this.sidebarHidden.set(true);
      this.saveSidebarState(true);
    }
    // Auto-show sidebar when leaving learning interface or quiz
    else if (!shouldHide && isCurrentlyHidden) {
      this.sidebarHidden.set(false);
      this.saveSidebarState(false);
    }
  }

  private saveSidebarState(hidden: boolean): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('student_sidebar_hidden', hidden.toString());
    }
  }

  private loadSidebarState(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('student_sidebar_hidden');
      if (saved !== null) {
        this.sidebarHidden.set(saved === 'true');
      }
    }
  }

  toggleSidebarCollapse(): void {
    this.sidebarCollapsed.update(v => !v);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('student_sidebar_collapsed', this.sidebarCollapsed().toString());
    }
  }

  private loadCollapsedState(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      this.sidebarCollapsed.set(localStorage.getItem('student_sidebar_collapsed') === 'true');
    }
  }

  toggleMobileSidebar(): void {
    this.isMobileSidebarOpen.update(open => !open);
  }

  logout(): void {
    this.authService.logout();
  }

  getUserInitials(): string {
    const name = this.authService.currentUser()?.fullName || '';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }
}
