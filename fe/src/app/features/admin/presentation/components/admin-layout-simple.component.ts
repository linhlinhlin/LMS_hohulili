import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';

import { RouterModule, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { SidebarComponent } from '../../../../shared/components/navigation/sidebar.component';
import { getSidebarConfig } from '../../../../shared/components/navigation/sidebar.config';
import { ChatPanelComponent } from '../../../ai-chat/presentation/components/chat-panel/chat-panel.component';
import { FloatingChatBubbleComponent } from '../../../ai-chat/presentation/components/floating-chat-bubble/floating-chat-bubble.component';
import { AiAvailabilityService } from '../../../ai-chat/application/services/ai-availability.service';

@Component({
  selector: 'app-admin-layout-simple',
  imports: [RouterModule, RouterOutlet, SidebarComponent, ChatPanelComponent, FloatingChatBubbleComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="min-h-screen flex">
      <!-- Desktop Sidebar -->
      @if (!shouldHideSidebar()) {
        <div class="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-50 lg:w-72">
          <app-sidebar [config]="adminSidebarConfig" [collapsed]="false"></app-sidebar>
        </div>
      }

      <!-- Mobile sidebar overlay -->
      @if (isMobileSidebarOpen() && !shouldHideSidebar()) {
        <div class="fixed inset-0 z-50 lg:hidden"
          (click)="toggleMobileSidebar()">
          <div class="fixed inset-0 bg-black bg-opacity-50"></div>
          <div class="fixed inset-y-0 left-0 w-72 bg-white shadow-lg">
            <app-sidebar [config]="adminSidebarConfig" [collapsed]="false"></app-sidebar>
          </div>
        </div>
      }

      <!-- Main content + AI Sidebar wrapper -->
      <div [class]="shouldHideSidebar() ? 'flex flex-1 min-w-0 min-h-screen' : 'lg:pl-72 flex flex-1 min-w-0 min-h-screen'">

        <!-- Main content column -->
        <div class="flex flex-col flex-1 min-w-0">
          <!-- Mobile top bar -->
          @if (!shouldHideSidebar()) {
            <header class="bg-white shadow-sm border-b border-gray-200 lg:hidden sticky top-0 z-40">
              <div class="px-4 sm:px-6">
                <div class="flex justify-between items-center h-16">
                  <div class="flex items-center">
                    <button (click)="toggleMobileSidebar()"
                      class="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                      aria-label="Open sidebar">
                      <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                    <p class="ml-3 text-lg font-semibold text-gray-900 mb-0">{{ mobileTitle() }}</p>
                  </div>
                  <div class="flex items-center space-x-3">
                    <span class="text-sm text-gray-600 hidden sm:inline">{{ authService.currentUser()?.fullName }}</span>
                    <button (click)="logout()"
                      class="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                      aria-label="Đăng xuất">
                      Đăng xuất
                    </button>
                  </div>
                </div>
              </div>
            </header>
          }

          <!-- Page content -->
          <main class="flex-1">
            <router-outlet></router-outlet>
          </main>
        </div>

        <!-- AI Sidebar (Desktop) — always rendered, animated via CSS -->
        @if (canShowAssistant()) {
          <aside class="ai-sidebar hidden lg:flex lg:flex-col"
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
      @if (canShowAssistant()) {
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

      <!-- MOBILE: Floating bubble + popup -->
      @if (canShowAssistant()) {
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
    :host {
      display: block;
    }

    main {
      display: block;
      width: 100%;
    }

    .lg\\:pl-72 {
      transition: padding-left 0.3s ease;
    }

    @media (max-width: 1023px) {
      .fixed.inset-y-0.left-0 {
        animation: slideIn 0.3s ease-out;
      }
    }

    @keyframes slideIn {
      from { transform: translateX(-100%); }
      to { transform: translateX(0); }
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
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminLayoutSimpleComponent implements OnInit, OnDestroy {
  protected authService = inject(AuthService);
  private aiAvailability = inject(AiAvailabilityService);
  private router = inject(Router);
  protected isMobileSidebarOpen = signal(false);

  // Sidebar config — use shared config based on user role
  protected get adminSidebarConfig() {
    const role = this.authService.userRole() || 'admin';
    return getSidebarConfig(role as any);
  }

  // AI Sidebar state
  protected isAiSidebarOpen = signal(false);
  protected isMobilePanelOpen = signal(false);

  // Resize state
  private readonly AI_SIDEBAR_DEFAULT_WIDTH = 420;
  private readonly AI_SIDEBAR_MIN_WIDTH = 320;
  private readonly AI_SIDEBAR_MAX_WIDTH_RATIO = 0.5;
  protected aiSidebarWidth = signal(420);
  protected isResizing = signal(false);

  protected mobileTitle = computed(() =>
    this.authService.userRole() === 'admin' ? 'Quản trị hệ thống' : 'Chuyên viên quản lý'
  );

  private sidebarHidden = signal<boolean>(false);
  private currentRoute = signal('');
  private routerSubscription?: Subscription;

  protected shouldHideSidebar = computed(() => this.sidebarHidden());
  protected canShowAssistant = computed(() => {
    const route = this.currentRoute();
    const isOperationalAdminRoute = route.startsWith('/admin/offline-storage')
      || route.startsWith('/admin/settings')
      || route.startsWith('/admin/logs');
    return this.aiAvailability.isAvailable()
      && !this.shouldHideSidebar()
      && !isOperationalAdminRoute;
  });

  ngOnInit(): void {
    this.loadAiSidebarState();
    this.loadAiSidebarWidth();

    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.handleRouteChange(event.urlAfterRedirects);
      });
    this.handleRouteChange(this.router.url);
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  private handleRouteChange(url: string) {
    this.currentRoute.set(url);
    const isInAiChat = url.includes('/ai-chat');
    const isInPreview = url.includes('/preview');
    this.sidebarHidden.set(isInAiChat || isInPreview);
  }

  toggleMobileSidebar(): void {
    this.isMobileSidebarOpen.update(open => !open);
  }

  // --- AI Sidebar ---

  toggleAiSidebar(): void {
    this.isAiSidebarOpen.update(v => !v);
    this.saveAiSidebarState(this.isAiSidebarOpen());
  }

  private saveAiSidebarState(open: boolean): void {
    localStorage?.setItem('admin_ai_sidebar_open', open.toString());
  }

  private loadAiSidebarState(): void {
    const saved = localStorage?.getItem('admin_ai_sidebar_open');
    if (saved !== null) {
      this.isAiSidebarOpen.set(saved === 'true');
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
    localStorage?.setItem('admin_ai_sidebar_width', width.toString());
  }

  private loadAiSidebarWidth(): void {
    const saved = localStorage?.getItem('admin_ai_sidebar_width');
    if (saved) {
      const w = parseInt(saved, 10);
      if (w >= this.AI_SIDEBAR_MIN_WIDTH && w <= 800) {
        this.aiSidebarWidth.set(w);
      }
    }
  }

  toggleMobilePanel(): void {
    this.isMobilePanelOpen.update(v => !v);
  }

  closeMobilePanel(): void {
    this.isMobilePanelOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
  }
}
