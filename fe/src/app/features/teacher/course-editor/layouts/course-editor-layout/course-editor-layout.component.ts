import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule, ActivatedRoute } from '@angular/router';
import { CourseEditorSidebarComponent } from '../../components/sidebar/sidebar.component';
import { CourseEditorHeaderComponent } from '../../components/header/header.component';
import { CourseEditorStore } from '../../store/course-editor.store';
import { filter, take, map } from 'rxjs/operators';

@Component({
  selector: 'app-course-editor-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule, CourseEditorSidebarComponent, CourseEditorHeaderComponent],
  template: `
    <div class="relative flex h-screen w-full flex-col overflow-hidden font-sans bg-white text-slate-900">
      <!-- Header (SOTA 2025: Fixed height, subtle shadow) -->
      <app-course-editor-header class="h-14 flex-shrink-0 z-20 border-b border-slate-200 shadow-sm bg-white"></app-course-editor-header>

      <main class="flex-grow grid overflow-hidden relative" 
            [style.grid-template-columns]="'var(--sidebar-width, 320px) 1fr'">
        
        <!-- Sidebar Container (Zero-Shift) -->
        <div class="h-full overflow-hidden border-r border-slate-200 bg-white z-10">
          <app-course-editor-sidebar class="h-full block"></app-course-editor-sidebar>
        </div>

        <!-- Main Content (SOTA 2025: min-width: 0 is CRITICAL for grid children with overflow) -->
        <div class="flex flex-col min-w-0 bg-slate-50 relative">
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

            <!-- Workspace Area -->
            <div class="flex-grow overflow-y-auto min-h-0 relative">
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
