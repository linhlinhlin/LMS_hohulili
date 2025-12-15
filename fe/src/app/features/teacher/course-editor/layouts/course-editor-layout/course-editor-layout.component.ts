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
    <div class="relative flex h-screen w-full flex-col overflow-hidden font-sans bg-gray-50 text-gray-900">
      <!-- Header -->
      <app-course-editor-header class="flex-shrink-0 z-10"></app-course-editor-header>

      <main class="flex-grow flex overflow-hidden">
        <!-- Sidebar -->
        <app-course-editor-sidebar class="w-[320px] flex-shrink-0 overflow-y-auto"></app-course-editor-sidebar>

        <!-- Main Content (Router Outlet) -->
        <div class="flex-grow flex flex-col min-w-0 bg-gray-50">
            <!-- Tabs -->
           <div class="flex items-center gap-1 border-b border-gray-200 px-8 flex-shrink-0 bg-white z-10 w-full">
               <a routerLink="info" 
                  routerLinkActive="border-b-2 border-blue-600 text-blue-600 bg-blue-50/50" 
                  class="px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors border-b-2 border-transparent rounded-t-lg flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Thông tin
               </a>
               <a routerLink="curriculum" 
                  routerLinkActive="border-b-2 border-blue-600 text-blue-600 bg-blue-50/50"
                  class="px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors border-b-2 border-transparent rounded-t-lg flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                  </svg>
                  Nội dung
               </a>
               <a routerLink="assignment" 
                  routerLinkActive="border-b-2 border-blue-600 text-blue-600 bg-blue-50/50"
                  class="px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors border-b-2 border-transparent rounded-t-lg flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                  </svg>
                  Học viên
               </a>
               <a routerLink="settings" 
                  routerLinkActive="border-b-2 border-blue-600 text-blue-600 bg-blue-50/50"
                  class="px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors border-b-2 border-transparent rounded-t-lg flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  Cài đặt
               </a>
           </div>

           <div class="flex-grow p-0 overflow-y-auto">
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
