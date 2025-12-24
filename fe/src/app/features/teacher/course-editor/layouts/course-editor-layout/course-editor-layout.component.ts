import { Component, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule, ActivatedRoute } from '@angular/router';
import { CourseEditorSidebarComponent } from '../../components/sidebar/sidebar.component';
import { CourseEditorHeaderComponent } from '../../components/header/header.component';
import { CourseEditorStore } from '../../store/course-editor.store';
import { AuthService } from '../../../../../core/services/auth.service';
import { filter, take, map } from 'rxjs/operators';

@Component({
  selector: 'app-course-editor-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule, CourseEditorSidebarComponent, CourseEditorHeaderComponent],
  template: `
    <div class="relative flex h-screen w-full flex-col overflow-hidden font-sans bg-white text-slate-900">
      <!-- Admin View-Only Mode Banner -->
      @if (isAdminViewMode()) {
        <div class="flex-shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium shadow-md z-30">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path>
            <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"></path>
          </svg>
          <span>🔒 Chế độ xem - Admin chỉ có quyền xem, không thể chỉnh sửa nội dung</span>
        </div>
      }
      
      <!-- Header (SOTA 2025: Fixed height, subtle shadow) -->
      <app-course-editor-header class="h-14 flex-shrink-0 z-20 border-b border-slate-200 shadow-sm bg-white"></app-course-editor-header>

      <main class="flex-grow grid overflow-hidden relative" 
            [style.grid-template-columns]="'var(--sidebar-width, 320px) 1fr'">
        
        <!-- Sidebar Container (Zero-Shift) -->
        <div class="h-full overflow-hidden border-r border-slate-200 bg-white z-10">
          <app-course-editor-sidebar class="h-full block"></app-course-editor-sidebar>
        </div>

        <!-- Main Content (SOTA 2025: h-full + overflow-hidden constrains height for child scroll) -->
        <div class="flex flex-col min-w-0 h-full overflow-hidden bg-slate-50 relative">
            <!-- Navigation Tabs (SOTA 2025: Sleek, high-density) -->
            <nav class="flex items-center gap-1 border-b border-slate-200 px-6 h-12 flex-shrink-0 bg-white z-10 w-full overflow-x-auto scrollbar-hide">
               <a routerLink="info" 
                  routerLinkActive="bg-slate-900 text-white shadow-md scale-105" 
                  class="px-4 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-all rounded-full flex items-center gap-2">
                  Thông tin
               </a>
               <a routerLink="curriculum" 
                  routerLinkActive="bg-slate-900 text-white shadow-md scale-105"
                  class="px-4 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-all rounded-full flex items-center gap-2">
                  Nội dung
               </a>
               <a routerLink="classes" 
                  routerLinkActive="bg-slate-900 text-white shadow-md scale-105"
                  class="px-4 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-all rounded-full flex items-center gap-2">
                  Lớp học
               </a>
               <a routerLink="settings" 
                  routerLinkActive="bg-slate-900 text-white shadow-md scale-105"
                  class="px-4 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-all rounded-full flex items-center gap-2">
                  Cài đặt
               </a>
            </nav>

            <!-- Workspace Area with SOTA Readonly Overlay Pattern -->
            <div class="flex-grow overflow-y-auto min-h-0 relative">
                <!-- SOTA: Invisible overlay for readonly mode (Google Docs/Figma pattern)
                     - Overlay captures ALL click events (pointer-events: auto)
                     - Scroll works because wheel events propagate to parent scrollable container
                     - z-index ensures it's above all child component content -->
                @if (isAdminViewMode()) {
                  <div class="absolute inset-0 z-50 cursor-not-allowed"
                       style="background: transparent;"
                       (click)="$event.stopPropagation(); $event.preventDefault()"
                       (mousedown)="$event.stopPropagation(); $event.preventDefault()"
                       (touchstart)="$event.stopPropagation(); $event.preventDefault()">
                  </div>
                }
                
                <router-outlet></router-outlet>
            </div>
        </div>
      </main>
    </div>
  `
})
export class CourseEditorLayoutComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private store = inject(CourseEditorStore);
  private authService = inject(AuthService);

  /**
   * Check if current user is Admin viewing Teacher's course (view-only mode)
   */
  isAdminViewMode = computed(() => {
    return this.authService.userRole() === 'admin';
  });

  ngOnInit() {
    // FIXED: Extract course ID once from route hierarchy, load only once
    this.getRouteId().pipe(
      take(1),
      filter((id): id is string => !!id)
    ).subscribe(id => {
      console.log('CourseEditorLayout: Loading course', id);
      this.store.loadCourse(id);
    });
  }

  /**
   * Find 'id' param by traversing route hierarchy
   */
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
