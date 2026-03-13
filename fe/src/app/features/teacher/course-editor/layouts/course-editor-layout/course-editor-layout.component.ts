import { Component, inject, OnInit, computed, signal, effect, untracked, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { RouterOutlet, RouterModule, ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { CourseEditorSidebarComponent } from '../../components/sidebar/sidebar.component';
import { CourseEditorHeaderComponent } from '../../components/header/header.component';
import { CourseEditorStore } from '../../store/course-editor.store';
import { CurriculumSelectionService } from '../../services/curriculum-selection.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { filter, take, map } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-course-editor-layout',
  imports: [RouterOutlet, RouterModule, CourseEditorSidebarComponent, CourseEditorHeaderComponent],
  template: `
    <div class="relative flex h-screen w-full flex-col overflow-hidden font-sans bg-white text-slate-900">
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
      <app-course-editor-header
        class="h-14 flex-shrink-0 z-20 border-b border-slate-200 bg-white"
        [sidebarCollapsed]="sidebarCollapsed()"
        [activeTab]="activeTab()"
        (toggleSidebar)="toggleSidebar()">
      </app-course-editor-header>

      <main class="flex-grow grid overflow-hidden relative transition-[grid-template-columns] duration-300 ease-in-out"
            [style.grid-template-columns]="sidebarCollapsed() ? '1fr' : '320px 1fr'">

        <!-- Sidebar Container -->
        @if (!sidebarCollapsed()) {
          <div class="h-full overflow-hidden border-r border-slate-200 bg-white z-10 transition-[opacity] duration-300">
            <app-course-editor-sidebar class="h-full block"></app-course-editor-sidebar>
          </div>
        }

        <!-- Main Content -->
        <div class="flex flex-col min-w-0 h-full overflow-hidden bg-slate-50 relative">
            <!-- Navigation Tabs (Underline style - Coursera/Material Design 3) -->
            <nav aria-label="Điều hướng trình biên tập khóa học"
                 class="flex items-center gap-0 border-b border-slate-200 px-6 flex-shrink-0 bg-white z-10 w-full overflow-x-auto scrollbar-hide">
               <a routerLink="info"
                  routerLinkActive="text-[#0056D2] border-b-2 border-[#0056D2]"
                  class="px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors border-b-2 border-transparent">
                  Thông tin
               </a>
               <a routerLink="curriculum"
                  routerLinkActive="text-[#0056D2] border-b-2 border-[#0056D2]"
                  class="px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors border-b-2 border-transparent">
                  Nội dung
               </a>
               @if (isInstructorLed()) {
                 <a routerLink="classes"
                    routerLinkActive="text-[#0056D2] border-b-2 border-[#0056D2]"
                    class="px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors border-b-2 border-transparent flex items-center gap-1.5">
                    Lớp học
                 </a>
               }
               <a routerLink="settings"
                  routerLinkActive="text-[#0056D2] border-b-2 border-[#0056D2]"
                  class="px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors border-b-2 border-transparent">
                  Cài đặt
               </a>
               <!-- Mode badge -->
               <div class="ml-auto pr-2">
                 @if (isInstructorLed()) {
                   <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                     <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                     Lớp học
                   </span>
                 } @else {
                   <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#0056D2]/10 text-[#0056D2]">
                     <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                     Khóa học
                   </span>
                 }
               </div>
            </nav>

            <!-- Breadcrumb (only on curriculum tab when chapter/lesson selected) -->
            @if (activeTab() === 'curriculum' && breadcrumbChapter()) {
                <div class="flex items-center gap-1.5 px-6 py-2 bg-white border-b border-slate-100 text-xs flex-shrink-0">
                    <button (click)="clearBreadcrumb()" class="text-[#0056D2] hover:text-[#004BB5] font-medium truncate max-w-[200px]">
                        {{ store.courseInfo()?.title || 'Khóa học' }}
                    </button>
                    <svg class="w-3 h-3 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                    <button (click)="selectChapter()" class="font-medium truncate max-w-[200px]"
                            [class]="breadcrumbLesson() ? 'text-[#0056D2] hover:text-[#004BB5]' : 'text-slate-900'">
                        {{ breadcrumbChapter()?.title }}
                    </button>
                    @if (breadcrumbLesson()) {
                        <svg class="w-3 h-3 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                        <button (click)="selectLesson()" class="font-medium truncate max-w-[200px]"
                                [class]="breadcrumbSection() ? 'text-[#0056D2] hover:text-[#004BB5]' : 'text-slate-900'">
                            {{ breadcrumbLesson()?.title }}
                        </button>
                    }
                    @if (breadcrumbSection()) {
                        <svg class="w-3 h-3 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                        <span class="text-slate-900 font-medium truncate max-w-[200px]">{{ breadcrumbSection()?.title }}</span>
                    }
                </div>
            }

            <!-- Workspace Area -->
            <div class="flex-grow overflow-y-auto min-h-0 relative">
                @if (store.isLoading()) {
                  <!-- Loading Skeleton -->
                  <div class="p-6 space-y-6 animate-pulse">
                    <div class="h-8 bg-gray-200 rounded w-1/3"></div>
                    <div class="space-y-3">
                      <div class="h-4 bg-gray-200 rounded w-full"></div>
                      <div class="h-4 bg-gray-200 rounded w-5/6"></div>
                      <div class="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                      <div class="h-32 bg-gray-200 rounded-lg"></div>
                      <div class="h-32 bg-gray-200 rounded-lg"></div>
                    </div>
                    <div class="space-y-3">
                      <div class="h-4 bg-gray-200 rounded w-full"></div>
                      <div class="h-4 bg-gray-200 rounded w-4/6"></div>
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
                    <div class="absolute inset-0 z-50 cursor-not-allowed"
                         style="background: transparent;"
                         (click)="$event.stopPropagation(); $event.preventDefault()"
                         (mousedown)="$event.stopPropagation(); $event.preventDefault()"
                         (touchstart)="$event.stopPropagation(); $event.preventDefault()">
                    </div>
                  }

                  <router-outlet></router-outlet>
                }
            </div>
        </div>
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
  private confirmDialog = inject(ConfirmDialogService);
  private destroyRef = inject(DestroyRef);
  private currentUrl = toSignal(this.router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    map(() => this.router.url)
  ), {
    initialValue: this.router.url
  });
  private lastSyncedCurriculumSelectionKey: string | null = null;

  /** Sidebar collapsed state - auto-managed by route */
  sidebarCollapsed = signal(false);
  /** Current active tab - tracks route segment */
  activeTab = signal<string>('info');

  isAdminViewMode = computed(() => {
    const role = this.authService.userRole();
    return role === 'admin' || role === 'org_admin';
  });

  isInstructorLed = computed(() => {
    return this.store.courseTree()?.deliveryMode === 'INSTRUCTOR_LED';
  });

  // Breadcrumb signals
  breadcrumbChapter = this.selectionService.selectedChapter;
  breadcrumbLesson = this.selectionService.selectedLesson;
  breadcrumbSection = this.selectionService.selectedSection;

  constructor() {
    // Auto-collapse/expand sidebar based on active route
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
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
    // Collapse on info/settings, expand on curriculum/classes
    if (lastSegment === 'info' || lastSegment === 'settings') {
      this.sidebarCollapsed.set(true);
    } else if (lastSegment === 'curriculum' || lastSegment === 'classes') {
      this.sidebarCollapsed.set(false);
    }
  }

  private updateActiveTab(url: string) {
    const lastSegment = this.getRouteTailSegment(url);
    if (['info', 'curriculum', 'settings', 'classes'].includes(lastSegment)) {
      this.activeTab.set(lastSegment);
    }
  }

  async clearBreadcrumb() {
    if (!(await this.canChangeCurriculumSelection())) {
      return;
    }

    this.selectionService.clearSelection();
  }

  async selectChapter() {
    if (!(await this.canChangeCurriculumSelection())) {
      return;
    }

    const ch = this.selectionService.selectedChapter();
    if (ch) {
      this.selectionService.selectChapter(ch);
    }
  }

  async selectLesson() {
    if (!(await this.canChangeCurriculumSelection())) {
      return;
    }

    const ch = this.selectionService.selectedChapter();
    const ls = this.selectionService.selectedLesson();
    if (ch && ls) {
      this.selectionService.selectLesson(ch, ls);
    }
  }

  ngOnInit() {
    // Set initial state from current URL
    this.updateSidebarForRoute(this.router.url);
    this.updateActiveTab(this.router.url);

    this.getRouteId().pipe(
      take(1),
      filter((id): id is string => !!id)
    ).subscribe(id => {
      this.store.loadCourse(id);
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

  private async canChangeCurriculumSelection(): Promise<boolean> {
    if (this.activeTab() !== 'curriculum' || this.store.saveStatus() !== 'unsaved') {
      return true;
    }

    const shouldDiscard = await this.confirmDialog.confirm({
      title: 'Rời nội dung đang chỉnh sửa',
      message: 'Bạn có thay đổi chưa lưu trong chương trình học. Nếu chuyển ngữ cảnh lúc này, các chỉnh sửa sẽ bị mất.',
      variant: 'warning',
      confirmText: 'Rời màn này',
      cancelText: 'Ở lại'
    });
    if (shouldDiscard) {
      this.store.markSaved();
    }

    return shouldDiscard;
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

  private resolveCurriculumSelection(
    tree: NonNullable<ReturnType<CourseEditorStore['courseTree']>>,
    chapterId: string | null,
    lessonId: string | null,
    sectionId: string | null
  ): {
    chapter: (typeof tree.chapters)[number];
    lesson?: (typeof tree.chapters)[number]['lessons'][number];
    section?: (typeof tree.chapters)[number]['lessons'][number]['sections'][number];
  } | null {
    if (!chapterId && !lessonId && !sectionId) {
      return null;
    }

    for (const chapter of tree.chapters) {
      if (chapterId && chapter.id === chapterId && !lessonId && !sectionId) {
        return { chapter };
      }

      for (const lesson of chapter.lessons || []) {
        if (sectionId) {
          const section = (lesson.sections || []).find(item => item.id === sectionId);
          if (section) {
            return { chapter, lesson, section };
          }
        }

        if (lessonId && lesson.id === lessonId) {
          return { chapter, lesson };
        }
      }
    }

    return null;
  }
}
