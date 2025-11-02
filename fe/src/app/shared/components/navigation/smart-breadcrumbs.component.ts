import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';

interface BreadcrumbItem {
  label: string;
  route: string;
}

@Component({
  selector: 'app-smart-breadcrumbs',
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="flex items-center space-x-2 text-sm" aria-label="Breadcrumb">
      <a [routerLink]="getDashboardLink()" class="text-gray-500 hover:text-gray-700 flex items-center">
        <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
        </svg>
        Dashboard
      </a>
      
      @for (crumb of breadcrumbs(); track crumb.label; let i = $index) {
        <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
        </svg>
        
        @if (i === breadcrumbs().length - 1) {
          <span class="text-gray-900 font-medium">{{ crumb.label }}</span>
        } @else {
          <a [routerLink]="crumb.route" class="text-gray-500 hover:text-gray-700">{{ crumb.label }}</a>
        }
      }
    </nav>
  `,
  standalone: true
})
export class SmartBreadcrumbsComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  getDashboardLink(): string {
    const url = this.router.url;
    if (url.startsWith('/teacher')) {
      return '/teacher/dashboard';
    } else if (url.startsWith('/student')) {
      return '/student/dashboard';
    } else if (url.startsWith('/admin')) {
      return '/admin/dashboard';
    }
    return '/';
  }

  breadcrumbs = computed(() => {
    const url = this.router.url;
    const segments = url.split('/').filter(segment => segment);
    
    const breadcrumbMap: { [key: string]: string } = {
      'courses': 'Khóa học',
      'course-creation': 'Tạo khóa học',
      'learning': 'Học tập',
      'assignments': 'Bài tập',
      'assignment-creation': 'Tạo bài tập',
      'quiz': 'Quiz',
      'forum': 'Diễn đàn',
      'discussions': 'Thảo luận',
      'analytics': 'Phân tích',
      'streaks': 'Study Streaks',
      'profile': 'Hồ sơ',
      'planner': 'Kế hoạch học tập',
      'calendar': 'Lịch học tập',
      'notes': 'Ghi chú',
      'bookmarks': 'Bookmarks',
      'result': 'Kết quả',
      'students': 'Học viên',
      'notifications': 'Thông báo'
    };

    const breadcrumbs: BreadcrumbItem[] = [];
    let currentPath = '';
    
    // Handle teacher routes
    if (segments[0] === 'teacher') {
      for (let i = 1; i < segments.length; i++) { // Skip 'teacher'
        currentPath += '/' + segments[i];
        const label = breadcrumbMap[segments[i]];
        if (label) {
          breadcrumbs.push({ label, route: currentPath });
        }
      }
    } else if (segments[0] === 'student') {
      // Handle student routes
      for (let i = 1; i < segments.length; i++) { // Skip 'student'
        currentPath += '/' + segments[i];
        const label = breadcrumbMap[segments[i]];
        if (label) {
          breadcrumbs.push({ label, route: currentPath });
        }
      }
    } else if (segments[0] === 'admin') {
      // Handle admin routes
      for (let i = 1; i < segments.length; i++) { // Skip 'admin'
        currentPath += '/' + segments[i];
        const label = breadcrumbMap[segments[i]];
        if (label) {
          breadcrumbs.push({ label, route: currentPath });
        }
      }
    }
    
    return breadcrumbs;
  });
}