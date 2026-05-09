import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';

import { RouterModule, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { SidebarComponent, SidebarConfig } from '../../../shared/components/navigation/sidebar.component';
import { studentSidebarConfig as baseStudentSidebarConfig } from '../../../shared/components/navigation/sidebar.config';
import { NotificationService } from '../../../core/services/notification.service';
import { MessagingService } from '../../../core/services/messaging.service';
import { ChatPanelComponent } from '../../ai-chat/presentation/components/chat-panel/chat-panel.component';
import { OfflineSyncService } from '../../../core/services/offline-sync.service';
import { NetworkStatusService } from '../../../core/services/network-status.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { AiAvailabilityService } from '../../ai-chat/application/services/ai-availability.service';

@Component({
  selector: 'app-student-layout-simple',
  imports: [RouterModule, RouterOutlet, SidebarComponent, ChatPanelComponent],
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

      <!-- Mobile sidebar overlay — always rendered, animated via CSS -->
      @if (!shouldHideSidebar()) {
        <div class="mobile-sidebar-overlay md:hidden"
             [class.open]="isMobileSidebarOpen()"
             [attr.aria-hidden]="!isMobileSidebarOpen()"
             [attr.aria-modal]="isMobileSidebarOpen() ? 'true' : null"
             [attr.inert]="isMobileSidebarOpen() ? null : ''"
             role="dialog">
          <div class="mobile-sidebar-backdrop" (click)="toggleMobileSidebar()"></div>
          <div class="mobile-sidebar-panel">
            <app-sidebar [config]="studentSidebarConfig()"
              [collapsed]="false"></app-sidebar>
          </div>
        </div>
      }

      <!-- Main content + AI Sidebar wrapper -->
      <div [class]="shouldHideSidebar()
        ? 'flex flex-1 min-h-0'
        : 'flex flex-1 min-h-0 transition-all duration-300 '
          + (sidebarCollapsed() ? 'md:pl-16' : 'md:pl-72')">

        <!-- Main content column -->
        <div class="flex flex-col flex-1 min-w-0">
          <!-- Mobile top bar — sticky + collapses in full-screen views -->
          <header class="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 md:hidden shadow-sm overflow-hidden transition-[max-height,opacity] duration-300 ease-out"
                  [class.max-h-14]="!shouldHideMobileChrome()"
                  [class.max-h-0]="shouldHideMobileChrome()"
                  [class.opacity-0]="shouldHideMobileChrome()"
                  [class.border-b-0]="shouldHideMobileChrome()">
            <div class="px-4">
              <div class="flex justify-between items-center h-14">
                <div class="flex items-center space-x-3">
                  <button (click)="toggleMobileSidebar()"
                    aria-label="Mở menu điều hướng"
                    class="inline-flex h-11 w-11 items-center justify-center rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 focus:outline-none focus:ring-2 focus:ring-[#0056D2]/20 transition-all duration-200">
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <div class="flex items-center space-x-2">
                    <img src="/icons/logo-master.png" alt="LMS Maritime" class="w-7 h-7 rounded-lg">
                    <span class="text-base font-bold text-gray-900">Cổng Học viên</span>
                  </div>
                </div>
                <button (click)="toggleMobileSidebar()" aria-label="Mở hồ sơ và menu" class="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0056D2]/20">
                  @if (userAvatarUrl()) {
                    <img [src]="userAvatarUrl()" [alt]="authService.currentUser()?.fullName || ''"
                         class="w-9 h-9 rounded-full object-cover">
                  } @else {
                    <div class="w-9 h-9 bg-[#0056D2] rounded-full flex items-center justify-center text-white text-xs font-semibold">
                      {{ getUserInitials() }}
                    </div>
                  }
                </button>
              </div>
            </div>
          </header>

          <!-- Page content with modern spacing -->
          <main class="flex-1 overflow-auto bg-transparent">
            <router-outlet></router-outlet>
          </main>

          <!-- Mobile Bottom Navigation — slides down in full-screen views -->
            <nav class="mobile-bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg transition-[transform,opacity] duration-300 ease-out"
                 [class.translate-y-full]="shouldHideMobileChrome()"
                 [class.opacity-0]="shouldHideMobileChrome()"
                 [class.pointer-events-none]="shouldHideMobileChrome()">
              <div class="flex items-center justify-around px-1 py-1">
                <a routerLink="/student/courses"
                  aria-label="Khóa học"
                  routerLinkActive="tab-active"
                  class="tab-item">
                  <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                  </svg>
                  <span class="tab-label">Khóa học</span>
                </a>
                <a routerLink="/student/tasks"
                  aria-label="Bài cần làm"
                  routerLinkActive="tab-active"
                  [class.tab-active]="isTasksTabActive()"
                  class="tab-item">
                  <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                  </svg>
                  <span class="tab-label">Cần làm</span>
                </a>
                @if (enableAssistant()) {
                  <button
                    (click)="toggleMobilePanel()"
                    aria-label="Trợ lý Wiii AI"
                    class="tab-item"
                    [class.tab-active]="isMobilePanelOpen()">
                    <svg class="w-5 h-5 mb-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path fill-rule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5z" clip-rule="evenodd"/>
                    </svg>
                    <span class="tab-label">Wiii AI</span>
                  </button>
                }
                <a routerLink="/student/browse"
                  aria-label="Khám phá"
                  routerLinkActive="tab-active"
                  class="tab-item">
                  <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                  <span class="tab-label">Khám phá</span>
                </a>
                <a routerLink="/student/profile"
                  aria-label="Hồ sơ"
                  routerLinkActive="tab-active"
                  class="tab-item">
                  <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                  <span class="tab-label">Hồ sơ</span>
                </a>
              </div>
            </nav>

          <!-- Bottom padding for mobile navigation — collapses when nav hidden -->
            <div class="md:hidden transition-[height] duration-300 ease-out"
                 [class.h-16]="!shouldHideMobileChrome()"
                 [class.h-0]="shouldHideMobileChrome()"></div>
        </div>

        <!-- AI Sidebar (Desktop) — always rendered, animated via CSS -->
        @if (enableAssistant() && isAiSidebarOpen()) {
          <aside class="ai-sidebar ai-sidebar-open hidden md:flex md:flex-col"
                 [class.ai-sidebar-resizing]="isResizing()"
                 [style.width.px]="aiSidebarWidth()"
                 [style.min-width.px]="aiSidebarWidth()">
            <app-chat-panel
              mode="sidebar"
              (closePanel)="toggleAiSidebar()"
            />
          </aside>
        }

        <!-- Resize handle — fixed position at sidebar's left edge -->
        @if (enableAssistant() && isAiSidebarOpen()) {
          <div class="resize-handle-track"
               [style.right.px]="aiSidebarWidth() - 6"
               [class.resize-active]="isResizing()"
               (mousedown)="startResize($event)"
               (dblclick)="resetSidebarWidth()">
            <div class="resize-handle-line"></div>
          </div>
        }

        <!-- Resize overlay — blocks iframe from stealing mouse events during drag -->
        @if (enableAssistant() && isResizing()) {
          <div class="resize-overlay"></div>
        }
      </div>

      <!-- Desktop: Toggle tab — always rendered, animated -->
      @if (enableAssistant()) {
      <button
        class="ai-sidebar-toggle hidden md:flex"
        [class.ai-toggle-hidden]="isAiSidebarOpen()"
        (click)="toggleAiSidebar()"
        title="Mở trợ lý AI"
        aria-label="Mở trợ lý AI">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="toggle-icon">
          <path fill-rule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5z" clip-rule="evenodd" />
        </svg>
      </button>
      }

      <!-- ============================================================
           MOBILE: Chat panel with slide-up animation
           ============================================================ -->
      @if (enableAssistant()) {
        <div class="mobile-ai-overlay md:hidden"
             [class.open]="isMobilePanelOpen()">
          <div class="mobile-ai-backdrop" (click)="closeMobilePanel()"></div>
          <div class="mobile-ai-panel">
            @if (isMobilePanelOpen()) {
              <app-chat-panel
                mode="widget"
                (closePanel)="closeMobilePanel()"
              />
            }
          </div>
        </div>
      }
    </div>
    `,
  styles: [`
    /* ── AI Sidebar — always rendered, animated via CSS ── */
    .ai-sidebar {
      flex-shrink: 0;
      width: 0;
      min-width: 0;
      overflow: hidden;
      height: 100vh;
      position: sticky;
      top: 0;
      background: white;
      opacity: 0;
      border-left: 1px solid transparent;
      transition: width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                  min-width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                  opacity 0.25s ease 0.05s,
                  border-color 0.3s ease;
    }

    .ai-sidebar.ai-sidebar-open {
      width: 420px;
      min-width: 320px;
      opacity: 1;
      border-left-color: #e5e7eb;
    }

    /* ── Resize handle — fixed at sidebar left edge ── */
    .resize-handle-track {
      position: fixed;
      width: 12px;
      top: 0;
      bottom: 0;
      cursor: col-resize;
      z-index: 60;
      display: flex;
      align-items: stretch;
      justify-content: center;
    }

    .resize-handle-line {
      width: 2px;
      background: #e5e7eb;
      border-radius: 1px;
      transition: width 0.15s ease, background 0.15s ease;
    }

    .resize-handle-track:hover .resize-handle-line,
    .resize-handle-track.resize-active .resize-handle-line {
      width: 4px;
      background: #0056D2;
    }

    /* Overlay — covers entire viewport during drag to prevent iframe event stealing */
    .resize-overlay {
      position: fixed;
      inset: 0;
      z-index: 55;
      cursor: col-resize;
    }

    /* During resize — disable transitions for instant feedback */
    .ai-sidebar.ai-sidebar-resizing {
      transition: none !important;
    }

    /* ── Toggle tab — subtle, professional ── */
    .ai-sidebar-toggle {
      position: fixed;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      z-index: 50;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 72px;
      background: white;
      color: #9ca3af;
      border: 1px solid #e5e7eb;
      border-right: none;
      border-radius: 8px 0 0 8px;
      cursor: pointer;
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.04);
      transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                  opacity 0.25s ease,
                  width 0.15s ease,
                  color 0.15s ease,
                  background 0.15s ease,
                  box-shadow 0.15s ease;
    }

    .ai-sidebar-toggle:hover {
      width: 32px;
      background: #f9fafb;
      color: #0056D2;
      box-shadow: -3px 0 12px rgba(0, 0, 0, 0.08);
    }

    .ai-sidebar-toggle.ai-toggle-hidden {
      transform: translateY(-50%) translateX(100%);
      opacity: 0;
      pointer-events: none;
    }

    .toggle-icon {
      width: 18px;
      height: 18px;
    }

    /* ── Mobile Sidebar — slide-in from left ── */
    .mobile-sidebar-overlay {
      position: fixed;
      inset: 0;
      z-index: 50;
      pointer-events: none;
    }
    .mobile-sidebar-overlay.open {
      pointer-events: auto;
    }

    .mobile-sidebar-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    .mobile-sidebar-overlay.open .mobile-sidebar-backdrop {
      opacity: 1;
    }

    .mobile-sidebar-panel {
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      width: 288px;
      background: white;
      box-shadow: 4px 0 24px rgba(0, 0, 0, 0.1);
      transform: translateX(-100%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 51;
    }
    .mobile-sidebar-panel .nav-item,
    .mobile-sidebar-panel .sub-menu-item,
    .mobile-sidebar-panel .user-menu-trigger,
    .mobile-sidebar-panel .user-menu-item {
      min-height: 44px;
    }
    .mobile-sidebar-overlay.open .mobile-sidebar-panel {
      transform: translateX(0);
    }

    /* ── Mobile AI Panel — slide-up from bottom ── */
    .mobile-ai-overlay {
      position: fixed;
      inset: 0;
      z-index: 60;
      pointer-events: none;
    }
    .mobile-ai-overlay.open {
      pointer-events: auto;
    }

    .mobile-ai-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    .mobile-ai-overlay.open .mobile-ai-backdrop {
      opacity: 1;
    }

    .mobile-ai-panel {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      transform: translateY(100%);
      transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 61;
    }
    .mobile-ai-overlay.open .mobile-ai-panel {
      transform: translateY(0);
    }

    /* ── Bottom nav bar ── */
    .mobile-bottom-nav { padding-bottom: env(safe-area-inset-bottom, 0); }

    .tab-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 48px;
      padding: 6px 0;
      min-width: 0;
      flex: 1;
      color: #9ca3af;
      transition: color 0.15s ease;
      background: none;
      border: none;
      cursor: pointer;
    }

    .tab-item.tab-active {
      color: #0056D2;
    }

    .tab-label {
      font-size: 10px;
      font-weight: 500;
      line-height: 1;
    }

    /* Respect reduced motion preference */
    @media (prefers-reduced-motion: reduce) {
      header, nav, .mobile-bottom-nav { transition-duration: 0ms !important; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentLayoutSimpleComponent implements OnInit, OnDestroy {
  protected authService = inject(AuthService);
  private aiAvailability = inject(AiAvailabilityService);
  protected readonly enableAssistant = this.aiAvailability.isAvailable;
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private messagingService = inject(MessagingService);
  private syncService = inject(OfflineSyncService);
  private network = inject(NetworkStatusService);
  private dialog = inject(ConfirmDialogService);
  protected isMobileSidebarOpen = signal(false);

  // Reactive URL signal — updates on NavigationEnd for OnPush compatibility
  private currentUrl = signal('');

  // "Cần làm" tab active for /student/tasks AND /student/quiz/*
  protected isTasksTabActive = computed(() => {
    const url = this.currentUrl();
    return url.startsWith('/student/tasks') || url.startsWith('/student/quiz');
  });
  protected sidebarCollapsed = signal(false);

  // User avatar — show real avatar if exists, fallback to initials circle
  protected userAvatarUrl = computed(() => {
    const user = this.authService.currentUser();
    return user?.avatar || (user as any)?.avatarUrl || null;
  });

  // AI Sidebar state (desktop)
  protected isAiSidebarOpen = signal(false);
  // AI Panel state (mobile)
  protected isMobilePanelOpen = signal(false);

  // Resize state
  private readonly AI_SIDEBAR_DEFAULT_WIDTH = 420;
  private readonly AI_SIDEBAR_MIN_WIDTH = 320;
  private readonly AI_SIDEBAR_MAX_WIDTH_RATIO = 0.5;
  protected aiSidebarWidth = signal(420);
  protected isResizing = signal(false);

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
  /** Mobile-only: hide header + bottom nav when in full-screen chat */
  protected readonly hideMobileChrome = signal(false);

  // Hide sidebar when in learning interface for focused experience
  protected shouldHideSidebar = computed(() => {
    return this.sidebarHidden();
  });

  /** Hide mobile chrome (header + bottom nav) — combines sidebar-hidden + chat mode */
  protected shouldHideMobileChrome = computed(() => {
    return this.sidebarHidden() || this.hideMobileChrome();
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
    this.loadAiSidebarState();
    this.loadAiSidebarWidth();

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
    // Update reactive URL signal for computed properties (OnPush safe)
    this.currentUrl.set(url.split('?')[0]);

    const isInLearningInterface = url.includes('/student/learn/course/');
    const isInQuiz = url.includes('/student/quiz/take/');
    const shouldHide = isInLearningInterface || isInQuiz || url.includes('/ai-chat');

    // Chat conversation: only hide mobile chrome (header + bottom nav), NOT desktop sidebar
    const isInConversation = /\/student\/messages\/[0-9a-f-]{36}/i.test(url) || url.includes('/student/messages/new');
    this.hideMobileChrome.set(isInConversation);
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

  // --- AI Sidebar (Desktop) ---

  toggleAiSidebar(): void {
    this.isAiSidebarOpen.update(v => !v);
    this.saveAiSidebarState(this.isAiSidebarOpen());
  }

  private saveAiSidebarState(open: boolean): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('student_ai_sidebar_open', open.toString());
    }
  }

  private loadAiSidebarState(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      this.isAiSidebarOpen.set(localStorage.getItem('student_ai_sidebar_open') === 'true');
    }
  }

  // --- AI Sidebar Resize ---

  startResize(event: MouseEvent): void {
    event.preventDefault();
    this.isResizing.set(true);
    const startX = event.clientX;
    const startWidth = this.aiSidebarWidth();
    const maxWidth = Math.min(window.innerWidth * this.AI_SIDEBAR_MAX_WIDTH_RATIO, 800);

    const onMouseMove = (e: MouseEvent) => {
      const delta = startX - e.clientX;
      const newWidth = Math.max(this.AI_SIDEBAR_MIN_WIDTH, Math.min(maxWidth, startWidth + delta));
      this.aiSidebarWidth.set(newWidth);
    };

    const onMouseUp = () => {
      this.isResizing.set(false);
      this.saveAiSidebarWidth(this.aiSidebarWidth());
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  resetSidebarWidth(): void {
    this.aiSidebarWidth.set(this.AI_SIDEBAR_DEFAULT_WIDTH);
    this.saveAiSidebarWidth(this.AI_SIDEBAR_DEFAULT_WIDTH);
  }

  private saveAiSidebarWidth(width: number): void {
    localStorage?.setItem('student_ai_sidebar_width', width.toString());
  }

  private loadAiSidebarWidth(): void {
    const saved = localStorage?.getItem('student_ai_sidebar_width');
    if (saved) {
      const w = parseInt(saved, 10);
      if (w >= this.AI_SIDEBAR_MIN_WIDTH && w <= 800) {
        this.aiSidebarWidth.set(w);
      }
    }
  }

  // --- AI Panel (Mobile) ---

  toggleMobilePanel(): void {
    this.isMobilePanelOpen.update(v => !v);
  }

  closeMobilePanel(): void {
    this.isMobilePanelOpen.set(false);
  }

  async logout(): Promise<void> {
    const pending = this.syncService.pendingCount();
    const failed = this.syncService.failedCount();

    if (pending > 0 || failed > 0) {
      if (this.network.online() && pending > 0) {
        // Online with pending items — try to sync first
        const confirmed = await this.dialog.confirm({
          title: 'Đồng bộ trước khi đăng xuất?',
          message: `Bạn có ${pending} mục chờ đồng bộ. Đồng bộ trước khi đăng xuất?`,
          variant: 'warning',
          confirmText: 'Đồng bộ & Đăng xuất',
          cancelText: 'Đăng xuất ngay'
        });

        if (confirmed) {
          try {
            await this.syncService.syncAll();
          } catch {
            // Sync failed — proceed with logout anyway
          }
        }
      } else if (!this.network.online()) {
        // Offline with pending items — warn user
        const confirmed = await this.dialog.confirm({
          title: 'Dữ liệu chưa đồng bộ',
          message: `Bạn có ${pending + failed} mục chưa đồng bộ. Dữ liệu ngoại tuyến sẽ được giữ lại và đồng bộ khi đăng nhập lại.`,
          variant: 'info',
          confirmText: 'Đăng xuất',
          cancelText: 'Hủy'
        });

        if (!confirmed) return;
      }
      // Online with only failed items (pending === 0) — proceed directly
      // (failed items need manual retry in Storage Management, not auto-sync)
    }

    this.authService.logout();
  }

  getUserInitials(): string {
    const name = this.authService.currentUser()?.fullName || '';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }
}
