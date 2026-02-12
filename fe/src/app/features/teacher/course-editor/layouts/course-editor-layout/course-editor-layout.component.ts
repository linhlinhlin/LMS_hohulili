import { Component, inject, OnInit, computed, signal, effect, untracked, ChangeDetectionStrategy } from '@angular/core';

import { RouterOutlet, RouterModule, ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { CourseEditorSidebarComponent } from '../../components/sidebar/sidebar.component';
import { CourseEditorHeaderComponent } from '../../components/header/header.component';
import { CourseEditorStore } from '../../store/course-editor.store';
import { CurriculumSelectionService } from '../../services/curriculum-selection.service';
import { AuthService } from '../../../../../core/services/auth.service';
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
            [style.grid-template-columns]="sidebarCollapsed() ? '0px 1fr' : '320px 1fr'">

        <!-- Sidebar Container -->
        <div class="h-full overflow-hidden border-r border-slate-200 bg-white z-10 transition-[opacity] duration-300"
             [class.opacity-0]="sidebarCollapsed()"
             [class.pointer-events-none]="sidebarCollapsed()">
          <app-course-editor-sidebar class="h-full block"></app-course-editor-sidebar>
        </div>

        <!-- Main Content -->
        <div class="flex flex-col min-w-0 h-full overflow-hidden bg-slate-50 relative">
            <!-- Navigation Tabs (Underline style - Coursera/Material Design 3) -->
            <nav class="flex items-center gap-0 border-b border-slate-200 px-6 flex-shrink-0 bg-white z-10 w-full overflow-x-auto scrollbar-hide">
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

    // Auto-select first content when on curriculum tab with no selection
    effect(() => {
      const tab = this.activeTab();
      const tree = this.store.courseTree();
      const hasSelection = this.selectionService.selectedChapterId();

      if (tab === 'curriculum' && tree && tree.chapters?.length > 0 && !hasSelection) {
        const firstChapter = tree.chapters[0];
        const firstLesson = firstChapter.lessons?.[0];
        if (firstLesson) {
          untracked(() => this.selectionService.selectLesson(firstChapter, firstLesson));
        } else {
          untracked(() => this.selectionService.selectChapter(firstChapter));
        }
      }
    }, { allowSignalWrites: true });
  }

  toggleSidebar() {
    this.sidebarCollapsed.update(v => !v);
  }

  private updateSidebarForRoute(url: string) {
    const segments = url.split('/');
    const lastSegment = segments[segments.length - 1];
    // Collapse on info/settings, expand on curriculum/classes
    if (lastSegment === 'info' || lastSegment === 'settings') {
      this.sidebarCollapsed.set(true);
    } else if (lastSegment === 'curriculum' || lastSegment === 'classes') {
      this.sidebarCollapsed.set(false);
    }
  }

  private updateActiveTab(url: string) {
    const segments = url.split('/');
    const lastSegment = segments[segments.length - 1];
    if (['info', 'curriculum', 'settings', 'classes'].includes(lastSegment)) {
      this.activeTab.set(lastSegment);
    }
  }

  clearBreadcrumb() {
    this.selectionService.clearSelection();
  }

  selectChapter() {
    const ch = this.selectionService.selectedChapter();
    if (ch) {
      this.selectionService.selectChapter(ch);
    }
  }

  selectLesson() {
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
}
