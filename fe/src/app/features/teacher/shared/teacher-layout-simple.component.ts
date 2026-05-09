import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';

import { RouterModule, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { SidebarStateService } from '../../../shared/services/sidebar-state.service';
import { SidebarComponent, SidebarConfig } from '../../../shared/components/navigation/sidebar.component';
import { SkipLinkComponent } from '../../../shared/components/skip-link/skip-link.component';
import { FocusTrapDirective } from '../../../shared/directives/focus-trap.directive';
import { teacherSidebarConfig as baseTeacherSidebarConfig } from '../../../shared/components/navigation/sidebar.config';
import { NotificationService } from '../../../core/services/notification.service';
import { MessagingService } from '../../../core/services/messaging.service';
import { ChatPanelComponent } from '../../ai-chat/presentation/components/chat-panel/chat-panel.component';
import { AiAvailabilityService } from '../../ai-chat/application/services/ai-availability.service';

@Component({
  selector: 'app-teacher-layout-simple',
  imports: [RouterModule, RouterOutlet, SidebarComponent, ChatPanelComponent, SkipLinkComponent, FocusTrapDirective],
  template: `
    <!-- Modern gradient background for teacher portal -->
    <div class="min-h-screen flex flex-col">
      <!-- WCAG 2.4.1 Bypass Blocks — first focusable element jumps to <main>. -->
      <app-skip-link/>
      <!-- Desktop Sidebar - Full Height (collapsible, matching student pattern) -->
      @if (!shouldHideSidebar()) {
        <div [class]="'hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-40 transition-all duration-300 '
          + (sidebarState.collapsed() ? 'lg:w-16' : 'lg:w-72')">
          <app-sidebar [config]="teacherSidebarConfig()"
            [collapsed]="sidebarState.collapsed()"
            (toggleCollapse)="sidebarState.toggleCollapsed()"></app-sidebar>
        </div>
      }

      <!-- Mobile sidebar overlay — CSS animation (matching student layout) -->
      @if (!shouldHideSidebar()) {
        <div id="mobile-sidebar-drawer"
             class="mobile-sidebar-overlay lg:hidden"
             [class.open]="isMobileSidebarOpen()"
             [attr.aria-hidden]="!isMobileSidebarOpen()"
             [attr.aria-modal]="isMobileSidebarOpen() ? 'true' : null"
             [attr.inert]="isMobileSidebarOpen() ? null : ''"
             role="dialog"
             [appFocusTrap]="isMobileSidebarOpen()"
             (escape)="closeMobileSidebar()">
          <div class="mobile-sidebar-backdrop" (click)="toggleMobileSidebar()"></div>
          <div class="mobile-sidebar-panel">
            <app-sidebar [config]="teacherSidebarConfig()"
              [collapsed]="false"
              (itemClick)="closeMobileSidebar()"></app-sidebar>
          </div>
        </div>
      }

      <!-- Main content + AI Sidebar wrapper -->
      <div [class]="shouldHideSidebar()
        ? 'flex flex-1 min-h-0'
        : 'flex flex-1 min-h-0 transition-all duration-300 '
          + (sidebarState.collapsed() ? 'lg:pl-16' : 'lg:pl-72')">

        <!-- Main content column -->
        <div class="flex flex-col flex-1 min-w-0">
          <!-- Mobile top bar — minimal: [☰] [Logo] [Avatar] (matching student layout) -->
          <header class="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 lg:hidden shadow-sm overflow-hidden transition-[max-height,opacity] duration-300 ease-out"
                  [class.max-h-14]="!shouldHideMobileChrome()"
                  [class.max-h-0]="shouldHideMobileChrome()"
                  [class.opacity-0]="shouldHideMobileChrome()"
                  [class.border-b-0]="shouldHideMobileChrome()">
            <div class="px-4">
              <div class="flex justify-between items-center h-14">
                <div class="flex items-center space-x-3">
                  <button (click)="toggleMobileSidebar()"
                    aria-label="Mở menu điều hướng"
                    [attr.aria-expanded]="isMobileSidebarOpen()"
                    aria-controls="mobile-sidebar-drawer"
                    class="inline-flex h-11 w-11 items-center justify-center rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 focus:outline-none focus:ring-2 focus:ring-[#0056D2]/20 transition-all duration-200">
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <div class="flex items-center space-x-2">
                    <img src="/icons/logo-master.png" alt="LMS Maritime" class="w-7 h-7 rounded-lg">
                    <span class="text-base font-bold text-gray-900">Cổng Giảng viên</span>
                  </div>
                </div>
                <button (click)="toggleMobileSidebar()" aria-label="Mở hồ sơ và menu" class="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0056D2]/20">
                  <div class="w-9 h-9 bg-[#0056D2] rounded-full flex items-center justify-center text-white text-xs font-semibold">
                    {{ getUserInitials() }}
                  </div>
                </button>
              </div>
            </div>
          </header>

          <!-- Page content -->
          <main id="main-content" tabindex="-1" class="flex-1 overflow-auto bg-transparent">
            <router-outlet></router-outlet>
          </main>

          <!-- Mobile Bottom Navigation — 4 nav + 1 center AI (matching student + UX Guidelines) -->
            <nav class="mobile-bottom-nav lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg transition-[transform,opacity] duration-300 ease-out"
                 [class.translate-y-full]="shouldHideMobileChrome()"
                 [class.opacity-0]="shouldHideMobileChrome()"
                 [class.pointer-events-none]="shouldHideMobileChrome()">
              <div class="flex items-center justify-around px-1 py-1">
                <a routerLink="/teacher/courses"
                  aria-label="Khóa học của tôi"
                  routerLinkActive="tab-active"
                  [routerLinkActiveOptions]="{exact: true}"
                  class="tab-item">
                  <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z"></path>
                  </svg>
                  <span class="tab-label">Khóa học</span>
                </a>
                <a routerLink="/teacher/courses/library"
                  aria-label="Tất cả khóa học"
                  routerLinkActive="tab-active"
                  class="tab-item">
                  <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                  </svg>
                  <span class="tab-label">Tất cả</span>
                </a>
                <!-- Center: Wiii AI toggle (matching student pattern) -->
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
                <a routerLink="/teacher/assessments"
                  aria-label="Đánh giá"
                  routerLinkActive="tab-active"
                  class="tab-item">
                  <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                  </svg>
                  <span class="tab-label">Đánh giá</span>
                </a>
                <a routerLink="/teacher/revenue"
                  aria-label="Doanh thu"
                  routerLinkActive="tab-active"
                  class="tab-item">
                  <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span class="tab-label">Doanh thu</span>
                </a>
              </div>
            </nav>

          <!-- Bottom padding — collapses when nav hidden -->
            <div class="lg:hidden transition-[height] duration-300 ease-out"
                 [class.h-16]="!shouldHideMobileChrome()"
                 [class.h-0]="shouldHideMobileChrome()"></div>
        </div>

        <!-- AI Sidebar (Desktop) — always rendered, animated via CSS -->
        @if (enableAssistant()) {
        <aside class="ai-sidebar hidden md:flex md:flex-col"
               [class.ai-sidebar-open]="isAiSidebarOpen()"
               [class.ai-sidebar-resizing]="isResizing()"
               [style.width.px]="isAiSidebarOpen() ? aiSidebarWidth() : null"
               [style.min-width.px]="isAiSidebarOpen() ? aiSidebarWidth() : null">
          @if (isAiSidebarOpen()) {
            <app-chat-panel
              mode="sidebar"
              (closePanel)="toggleAiSidebar()"
            />
          }
        </aside>

        <!-- Resize handle — fixed position at sidebar's left edge -->
        @if (isAiSidebarOpen()) {
          <div class="resize-handle-track"
               [style.right.px]="aiSidebarWidth() - 6"
               [class.resize-active]="isResizing()"
               (mousedown)="startResize($event)"
               (dblclick)="resetSidebarWidth()">
            <div class="resize-handle-line"></div>
          </div>
        }

        <!-- Resize overlay — blocks iframe from stealing mouse events -->
        @if (isResizing()) {
          <div class="resize-overlay"></div>
        }
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
           MOBILE: Slide-up AI panel (triggered from bottom nav tab)
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
    /* ── Mobile Sidebar — slide-in from left (matching student) ── */
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

    /* ── Bottom nav bar (matching student) ── */
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
      text-decoration: none;
    }

    .tab-item.tab-active {
      color: #0056D2;
    }
    /* Match sidebar active-item font weight (font-semibold = 600) per spec FR-037. */
    .tab-item.tab-active .tab-label {
      font-weight: 600;
    }

    .tab-label {
      font-size: 10px;
      font-weight: 500;
      line-height: 1;
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

    /* Overlay — covers viewport during drag to prevent iframe event stealing */
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

    /* Respect reduced motion preference */
    @media (prefers-reduced-motion: reduce) {
      header, nav, .mobile-bottom-nav,
      .mobile-sidebar-backdrop, .mobile-sidebar-panel,
      .mobile-ai-backdrop, .mobile-ai-panel { transition-duration: 0ms !important; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeacherLayoutSimpleComponent implements OnInit, OnDestroy {
  protected authService = inject(AuthService);
  private aiAvailability = inject(AiAvailabilityService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private messagingService = inject(MessagingService);
  protected readonly enableAssistant = this.aiAvailability.isAvailable;
  protected isMobileSidebarOpen = signal(false);
  /** Sidebar collapsed/mobileOpen/hidden state — single source of truth shared
   *  with student + admin portals via SidebarStateService. Replaces the old
   *  per-portal `teacher_sidebar_collapsed` localStorage key + duplicated
   *  signal/load/toggle methods. */
  protected sidebarState = inject(SidebarStateService);

  // Dynamic sidebar config with unread messages badge (matching student pattern)
  protected teacherSidebarConfig = computed<SidebarConfig>(() => {
    const unreadCount = this.messagingService.totalUnreadCount();
    const config = { ...baseTeacherSidebarConfig };
    config.menuItems = config.menuItems.map(item => {
      if (item.route === '/teacher/messages') {
        return {
          ...item,
          badge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount.toString()) : undefined
        };
      }
      return item;
    });
    return config;
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

  private sidebarHidden = signal<boolean>(false);
  protected readonly hideMobileChrome = signal(false);
  private routerSubscription?: Subscription;

  protected shouldHideSidebar = computed(() => this.sidebarHidden());
  protected shouldHideMobileChrome = computed(() => this.sidebarHidden() || this.hideMobileChrome());

  ngOnInit(): void {
    // Initialize notification service with current user ID
    const userId = this.authService.currentUser()?.id || 'teacher-1';
    this.notificationService.initialize(userId);

    // Initialize messaging service for unread count badge
    this.messagingService.setCurrentUserId(userId);
    this.messagingService.getConversations().subscribe({
      error: () => {} // Non-blocking init
    });

    // Sidebar collapsed state now hydrated by SidebarStateService.
    this.loadAiSidebarState();
    this.loadAiSidebarWidth();

    // Subscribe to router events
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
    const isInAiChat = url.includes('/ai-chat');
    this.sidebarHidden.set(isInAiChat);

    // Chat: only hide mobile chrome, NOT desktop sidebar
    const isInConversation = /\/teacher\/messages\/[0-9a-f-]{36}/i.test(url) || url.includes('/teacher/messages/new');
    this.hideMobileChrome.set(isInConversation);
  }

  toggleMobileSidebar(): void {
    this.isMobileSidebarOpen.update(open => !open);
  }

  /** Auto-close drawer after a leaf nav item is tapped (mobile UX standard).
   *  Called from <app-sidebar (itemClick)> binding; idempotent on desktop
   *  where mobileOpen is already false. Per spec FR-012. */
  closeMobileSidebar(): void {
    this.isMobileSidebarOpen.set(false);
  }

  // --- AI Sidebar (Desktop) ---

  toggleAiSidebar(): void {
    this.isAiSidebarOpen.update(v => !v);
    this.saveAiSidebarState(this.isAiSidebarOpen());
  }

  private saveAiSidebarState(open: boolean): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('teacher_ai_sidebar_open', open.toString());
    }
  }

  private loadAiSidebarState(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      this.isAiSidebarOpen.set(localStorage.getItem('teacher_ai_sidebar_open') === 'true');
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
    localStorage?.setItem('teacher_ai_sidebar_width', width.toString());
  }

  private loadAiSidebarWidth(): void {
    const saved = localStorage?.getItem('teacher_ai_sidebar_width');
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

  logout(): void {
    this.authService.logout();
  }

  getUserInitials(): string {
    const name = this.authService.currentUser()?.fullName || '';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }
}
