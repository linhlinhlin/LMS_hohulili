import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';

import { RouterModule, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { SidebarComponent } from '../../../shared/components/navigation/sidebar.component';
import { teacherSidebarConfig } from '../../../shared/components/navigation/sidebar.config';
import { NotificationBellComponent } from '../../../shared/components/notification-bell.component';
import { NotificationService } from '../../../core/services/notification.service';
import { ChatPanelComponent } from '../../ai-chat/presentation/components/chat-panel/chat-panel.component';
import { FloatingChatBubbleComponent } from '../../ai-chat/presentation/components/floating-chat-bubble/floating-chat-bubble.component';

@Component({
  selector: 'app-teacher-layout-simple',
  imports: [RouterModule, RouterOutlet, SidebarComponent, NotificationBellComponent, ChatPanelComponent, FloatingChatBubbleComponent],
  template: `
    <!-- Modern gradient background for teacher portal -->
    <div class="min-h-screen flex flex-col">
      <!-- Desktop Sidebar - Full Height -->
      @if (!shouldHideSidebar()) {
        <div class="hidden lg:flex lg:w-72 lg:flex-col lg:fixed lg:inset-y-0 lg:z-40">
          <app-sidebar [config]="teacherSidebarConfig"></app-sidebar>
        </div>
      }

      <!-- Mobile sidebar overlay -->
      @if (isMobileSidebarOpen() && !shouldHideSidebar()) {
        <div
          class="fixed inset-0 z-50 lg:hidden"
          (click)="toggleMobileSidebar()">
          <div class="fixed inset-0 bg-black/60 backdrop-blur-sm"></div>
          <div class="fixed inset-y-0 left-0 w-72 bg-white/95 backdrop-blur-xl shadow-2xl border-r border-white/20">
            <app-sidebar [config]="teacherSidebarConfig"></app-sidebar>
          </div>
        </div>
      }

      <!-- Main content + AI Sidebar wrapper -->
      <div [class]="shouldHideSidebar() ? 'flex flex-1 min-h-0' : 'lg:pl-72 flex flex-1 min-h-0'">

        <!-- Main content column -->
        <div class="flex flex-col flex-1 min-w-0">
          <!-- Modern top navigation bar - Mobile only -->
          @if (!shouldHideSidebar()) {
            <header class="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 lg:hidden shadow-sm">
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
                        Cổng Giảng viên
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
                        <p class="text-xs text-gray-500">Teacher</p>
                      </div>
                    </div>
                    <!-- Logout button -->
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
          }

          <!-- Page content -->
          <main class="flex-1 overflow-auto bg-transparent">
            <router-outlet></router-outlet>
          </main>
        </div>

        <!-- AI Sidebar (Desktop) — always rendered, animated via CSS -->
        @if (!shouldHideSidebar()) {
          <aside class="ai-sidebar hidden lg:flex lg:flex-col"
                 [class.ai-sidebar-open]="isAiSidebarOpen()"
                 [class.ai-sidebar-resizing]="isResizing()"
                 [style.width.px]="isAiSidebarOpen() ? aiSidebarWidth() : null"
                 [style.min-width.px]="isAiSidebarOpen() ? aiSidebarWidth() : null">
            <app-chat-panel
              mode="sidebar"
              (closePanel)="toggleAiSidebar()"
            />
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
      @if (!shouldHideSidebar()) {
        <button
          class="ai-sidebar-toggle hidden lg:flex"
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
           MOBILE: Floating bubble + popup panel
           ============================================================ -->
      @if (!shouldHideSidebar()) {
        <div class="lg:hidden">
          @if (isMobilePanelOpen()) {
            <app-chat-panel
              mode="widget"
              (closePanel)="closeMobilePanel()"
            />
          }
          <app-floating-chat-bubble
            [isPanelOpen]="isMobilePanelOpen()"
            (bubbleClick)="toggleMobilePanel()"
          />
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
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeacherLayoutSimpleComponent implements OnInit, OnDestroy {
  protected authService = inject(AuthService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  protected isMobileSidebarOpen = signal(false);
  protected teacherSidebarConfig = teacherSidebarConfig;

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
  private routerSubscription?: Subscription;

  protected shouldHideSidebar = computed(() => this.sidebarHidden());

  ngOnInit(): void {
    // Initialize notification service with current user ID
    const userId = this.authService.currentUser()?.id || 'teacher-1';
    this.notificationService.initialize(userId);

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
