import { Component, inject, OnInit, computed, signal, effect, untracked, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';

import { RouterOutlet, RouterModule, ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { CourseEditorSidebarComponent } from '../../components/sidebar/sidebar.component';
import { CourseEditorHeaderComponent } from '../../components/header/header.component';
import { CourseRejectionBannerComponent } from '../../components/rejection-banner/rejection-banner.component';
import { CourseEditorStore } from '../../store/course-editor.store';
import { CurriculumSelectionService } from '../../services/curriculum-selection.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { ChatWidgetComponent } from '../../../../ai-chat/presentation/components/chat-widget/chat-widget.component';
import { distinctUntilChanged, filter, take, map } from 'rxjs/operators';


@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-course-editor-layout',
  imports: [RouterOutlet, RouterModule, CourseEditorSidebarComponent, CourseEditorHeaderComponent, CourseRejectionBannerComponent, ChatWidgetComponent],
  styleUrl: './course-editor-layout.component.scss',
  template: `
    <div class="relative flex h-screen w-full flex-col overflow-hidden font-sans bg-white text-slate-900"
         data-wiii-id="course-editor-shell">
      <!-- Admin View-Only Mode Banner -->
      @if (isAdminViewMode()) {
        <div class="flex-shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium shadow-md z-30">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path>
            <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"></path>
          </svg>
          <span>Chế độ xem - Admin chỉ có quyền xem, không thể chỉnh sửa nội dung</span>
        </div>
      }

      <!-- Header -->
      <app-course-editor-header class="h-12 flex-shrink-0 z-20 bg-white">
      </app-course-editor-header>

      <!-- Admin rejection banner: shows above tabs so teachers see the
           feedback no matter which tab they deep-link into. -->
      <app-course-rejection-banner class="flex-shrink-0 z-10"></app-course-rejection-banner>

      <!-- Editor Tabs — above grid so position is stable regardless of sidebar -->
      <nav aria-label="Editor tabs" role="tablist"
           class="flex items-center gap-1 border-b border-gray-200 flex-shrink-0 bg-white relative z-10 px-4 overflow-x-auto scrollbar-hide">
         <a routerLink="info"
            data-wiii-id="course-editor-tab-info"
            data-wiii-click-safe="true"
            data-wiii-click-kind="navigation"
            role="tab"
            [attr.aria-selected]="activeTab() === 'info'"
            routerLinkActive="editor-tab--active"
            class="editor-tab">
            Thông tin
         </a>
         <a routerLink="curriculum"
            data-wiii-id="course-editor-tab-curriculum"
            data-wiii-click-safe="true"
            data-wiii-click-kind="navigation"
            role="tab"
            [attr.aria-selected]="activeTab() === 'curriculum'"
            routerLinkActive="editor-tab--active"
            class="editor-tab">
            Nội dung
         </a>
         @if (isInstructorLed()) {
           <a routerLink="classes"
              data-wiii-id="course-editor-tab-classes"
              data-wiii-click-safe="true"
              data-wiii-click-kind="navigation"
              role="tab"
              [attr.aria-selected]="activeTab() === 'classes'"
              routerLinkActive="editor-tab--active"
              class="editor-tab">
              Lớp học
           </a>
         }
         <a routerLink="competency"
            data-wiii-id="course-editor-tab-competency"
            data-wiii-click-safe="true"
            data-wiii-click-kind="navigation"
            role="tab"
            [attr.aria-selected]="activeTab() === 'competency'"
            routerLinkActive="editor-tab--active"
            class="editor-tab">
            Tiêu chuẩn
         </a>
         <a routerLink="settings"
            data-wiii-id="course-editor-tab-settings"
            data-wiii-click-safe="true"
            data-wiii-click-kind="navigation"
            role="tab"
            [attr.aria-selected]="activeTab() === 'settings'"
            routerLinkActive="editor-tab--active"
            class="editor-tab">
            Cài đặt
         </a>
      </nav>

      <main class="editor-main flex-grow grid grid-cols-1 overflow-hidden relative"
            [class.sidebar-open]="!sidebarCollapsed()">

        <!-- Sidebar: always in DOM for signals/effects/modals -->
        <!-- Mobile backdrop -->
        <div class="sidebar-backdrop"
             [class.sidebar-backdrop--visible]="!sidebarCollapsed()"
             (click)="toggleSidebar()"></div>

        <!-- Sidebar panel (CSS-controlled visibility) -->
        <div class="sidebar-panel"
             [class.sidebar-panel--open]="!sidebarCollapsed()">
          <app-course-editor-sidebar class="h-full block"></app-course-editor-sidebar>
        </div>

        <!-- Main Content -->
        <div class="flex flex-col min-w-0 h-full overflow-hidden bg-slate-50 relative">
            <!-- Workspace Area -->
            <div class="flex-grow overflow-y-auto min-h-0 relative">
                @if (store.isLoading()) {
                  <!-- Loading Skeleton — matches sidebar + cards grid -->
                  <div class="p-5 animate-pulse editor-skeleton-layout" aria-hidden="true">
                    <div class="hidden md:flex flex-col gap-2 pt-1">
                      <div class="h-4 w-20 bg-gray-200 rounded"></div>
                      <div class="h-4 w-24 bg-gray-200 rounded"></div>
                      <div class="h-4 w-16 bg-gray-200 rounded"></div>
                      <div class="h-4 w-20 bg-gray-200 rounded"></div>
                      <div class="h-4 w-14 bg-gray-200 rounded"></div>
                    </div>
                    <div class="space-y-4">
                      <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <div class="px-5 py-4 border-b border-gray-100 bg-slate-50"><div class="h-4 w-32 bg-gray-200 rounded"></div></div>
                        <div class="p-5 space-y-3">
                          <div class="h-10 bg-gray-100 rounded-lg"></div>
                          <div class="h-20 bg-gray-100 rounded-lg"></div>
                          <div class="flex gap-3"><div class="h-10 flex-1 bg-gray-100 rounded-lg"></div><div class="h-10 flex-1 bg-gray-100 rounded-lg"></div></div>
                        </div>
                      </div>
                      <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <div class="px-5 py-4 border-b border-gray-100 bg-slate-50"><div class="h-4 w-28 bg-gray-200 rounded"></div></div>
                        <div class="p-5"><div class="h-40 bg-gray-100 rounded-lg"></div></div>
                      </div>
                    </div>
                  </div>
                } @else if (store.error()) {
                  <!-- Error State -->
                  <div class="flex flex-col items-center justify-center h-full p-6">
                    <svg class="w-16 h-16 text-red-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                    </svg>
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">Không thể tải khóa học</h3>
                    <p class="text-sm text-gray-500 mb-4 text-center max-w-md">{{ store.error() }}</p>
                    <button (click)="retryLoad()" class="px-4 py-2 bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5] transition-colors text-sm">
                      Thử lại
                    </button>
                  </div>
                } @else {
                  @if (isAdminViewMode()) {
                    <!-- Transparent click-catcher: blocks all interaction with the
                         editor panel while admin is viewing, without dimming the UI. -->
                    <div class="absolute inset-0 z-50 cursor-not-allowed"
                         aria-hidden="true"
                         (click)="$event.stopPropagation(); $event.preventDefault()"
                         (mousedown)="$event.stopPropagation(); $event.preventDefault()"
                         (touchstart)="$event.stopPropagation(); $event.preventDefault()">
                    </div>
                  }

                  <router-outlet></router-outlet>
                }
            </div>
        </div>
        <app-chat-widget variant="responsive-sidebar" />
      </main>
    </div>
  `
})
export class CourseEditorLayoutComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  store = inject(CourseEditorStore);
  private selectionService = inject(CurriculumSelectionService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  private currentUrl = toSignal(this.router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    map(() => this.router.url)
  ), {
    initialValue: this.router.url
  });
  private lastSyncedCurriculumSelectionKey: string | null = null;

  /** Sidebar collapsed state — synced via store for child component access */
  sidebarCollapsed = this.store.sidebarCollapsed;
  /** Current active tab - tracks route segment */
  activeTab = signal<string>('info');

  isAdminViewMode = computed(() => {
    const role = this.authService.userRole();
    return role === 'admin' || role === 'org_admin';
  });

  isInstructorLed = computed(() => {
    return this.store.courseTree()?.deliveryMode === 'INSTRUCTOR_LED';
  });

  constructor() {
    // Auto-collapse/expand sidebar based on active route
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(e => {
      const url = e.urlAfterRedirects;
      this.updateSidebarForRoute(url);
      this.updateActiveTab(url);
    });

    effect(() => {
      if (this.activeTab() !== 'curriculum') {
        this.lastSyncedCurriculumSelectionKey = null;
        return;
      }

      const currentUrl = this.currentUrl();
      if (currentUrl === null) {
        return;
      }

      const currentQueryParams = this.getCurrentQueryParams(currentUrl);
      const chapterId = this.selectionService.selectedChapterId();
      const lessonId = this.selectionService.selectedLessonId();
      const sectionId = this.selectionService.selectedSectionId();
      const nextSelectionKey = `${chapterId ?? ''}|${lessonId ?? ''}|${sectionId ?? ''}`;
      const currentQueryKey = `${currentQueryParams.get('chapterId') ?? ''}|${currentQueryParams.get('lessonId') ?? ''}|${currentQueryParams.get('sectionId') ?? ''}`;

      if (!chapterId && !lessonId && !sectionId) {
        this.lastSyncedCurriculumSelectionKey = null;
        return;
      }

      if (currentQueryKey === nextSelectionKey) {
        this.lastSyncedCurriculumSelectionKey = nextSelectionKey;
        return;
      }

      if (this.lastSyncedCurriculumSelectionKey === nextSelectionKey) {
        return;
      }

      const nextQueryParams = {
        ...Object.fromEntries(currentQueryParams.entries()),
        chapterId,
        lessonId,
        sectionId
      } as Record<string, string | null>;

      if (!chapterId) {
        delete nextQueryParams['chapterId'];
      }
      if (!lessonId) {
        delete nextQueryParams['lessonId'];
      }
      if (!sectionId) {
        delete nextQueryParams['sectionId'];
      }

      untracked(() => {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: nextQueryParams,
          replaceUrl: true
        });
      });
      this.lastSyncedCurriculumSelectionKey = nextSelectionKey;
    });

    // Warn before leaving with unsaved changes
    const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
      if (this.store.saveStatus() === 'unsaved') {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', beforeUnloadHandler);
    this.destroyRef.onDestroy(() => window.removeEventListener('beforeunload', beforeUnloadHandler));
  }

  toggleSidebar() {
    this.sidebarCollapsed.update(v => !v);
  }

  private updateSidebarForRoute(url: string) {
    const lastSegment = this.getRouteTailSegment(url);
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (lastSegment === 'info' || lastSegment === 'settings' || lastSegment === 'competency') {
      this.sidebarCollapsed.set(true);
    } else if (lastSegment === 'curriculum' || lastSegment === 'classes') {
      this.sidebarCollapsed.set(isMobile); // collapsed on mobile, expanded on desktop
    }
  }

  private updateActiveTab(url: string) {
    const lastSegment = this.getRouteTailSegment(url);
    if (['info', 'curriculum', 'settings', 'classes', 'competency'].includes(lastSegment)) {
      this.activeTab.set(lastSegment);
    }
  }

  ngOnInit() {
    // Set initial state from current URL
    this.updateSidebarForRoute(this.router.url);
    this.updateActiveTab(this.router.url);

    this.getRouteId().pipe(
      filter((id): id is string => !!id),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(id => {
      this.resetRouteScopedEditorState();
      this.store.loadCourse(id, true);
    });
  }

  retryLoad() {
    this.getRouteId().pipe(
      take(1),
      filter((id): id is string => !!id)
    ).subscribe(id => {
      this.store.loadCourse(id, true);
    });
  }

  private getRouteId() {
    let currentRoute: ActivatedRoute | null = this.route;
    while (currentRoute) {
      const id = currentRoute.snapshot.paramMap.get('id');
      if (id) {
        return currentRoute.paramMap.pipe(map(params => params.get('id')));
      }
      currentRoute = currentRoute.parent;
    }
    return this.route.paramMap.pipe(map(params => params.get('id')));
  }

  private getRouteTailSegment(url: string): string {
    const pathWithoutQuery = url.split('?')[0].split('#')[0];
    const segments = pathWithoutQuery.split('/').filter(Boolean);
    return segments[segments.length - 1] || '';
  }

  private getCurrentQueryParams(url: string): URLSearchParams {
    return new URLSearchParams(this.router.parseUrl(url).queryParams as Record<string, string>);
  }

  private resetRouteScopedEditorState(): void {
    this.lastSyncedCurriculumSelectionKey = null;
    this.selectionService.clearSelection();
    this.store.resetEditorState();
  }

}
