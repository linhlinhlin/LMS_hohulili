import { Component, signal, computed, inject, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface NavigationItem {
  label: string;
  icon: string;
  route: string;
  badge?: string | number;
  isActive?: boolean;
  children?: NavigationItem[];
}

@Component({
  selector: 'app-student-sidebar',
  imports: [CommonModule, RouterModule, RouterLinkActive],
  encapsulation: ViewEncapsulation.None,
  template: `
    <aside class="w-64 bg-gradient-to-b from-white to-gray-50 shadow-xl border-r border-gray-200 h-full flex flex-col">
      <!-- Header với Logo chuyên nghiệp -->
      <div class="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
        <div class="flex items-center space-x-3">
          <div class="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <svg class="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
              <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
            </svg>
          </div>
          <div>
            <h1 class="text-xl font-bold text-white">LMS Maritime</h1>
            <p class="text-xs text-blue-100">Student Portal</p>
          </div>
        </div>
      </div>

      <!-- User Profile với thiết kế hiện đại -->
      <div class="p-6 border-b border-gray-200 bg-white">
        <div class="flex items-center space-x-4">
          <div class="relative">
            <img [src]="authService.currentUser()?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'" 
                 [alt]="authService.userName()" 
                 class="w-14 h-14 rounded-xl object-cover border-3 border-blue-200 shadow-lg">
            <div class="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-gray-900 truncate">{{ authService.userName() }}</p>
            <p class="text-xs text-gray-500 truncate">{{ authService.userEmail() }}</p>
            <div class="flex items-center mt-1">
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Student
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Search với thiết kế đẹp -->
      <div class="p-4 border-b border-gray-200 bg-white">
        <div class="relative">
          <input type="text" 
                 placeholder="Tìm kiếm khóa học, bài tập..."
                 class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all duration-200">
          <svg class="absolute left-3 top-3.5 w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"></path>
          </svg>
        </div>
      </div>

      <!-- Navigation với thiết kế chuyên nghiệp -->
      <nav class="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        @for (item of navigationItems(); track item.route) {
          <div class="space-y-1">
            <a [routerLink]="item.route"
               routerLinkActive="bg-blue-50 text-blue-700 border-r-2 border-blue-700 shadow-sm"
               [routerLinkActiveOptions]="{exact: false}"
               class="flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group hover:bg-gray-50 hover:shadow-sm">
              <div class="flex items-center space-x-3">
                @if (item.icon) {
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200"
                       [class]="getIconBgClass(item)">
                    <span class="text-sm">{{ item.icon }}</span>
                  </div>
                }
                <span class="font-medium">{{ item.label }}</span>
              </div>
              @if (item.badge) {
                <span class="px-2 py-1 text-xs font-bold bg-red-500 text-white rounded-full shadow-sm">
                  {{ item.badge }}
                </span>
              }
            </a>
            
            <!-- Sub-navigation với animation -->
            @if (item.children && isSubMenuOpen(item)) {
              <div class="ml-8 mt-2 space-y-1 animate-fadeIn">
                @for (child of item.children; track child.route) {
                  <a [routerLink]="child.route"
                     routerLinkActive="bg-blue-100 text-blue-800"
                     [routerLinkActiveOptions]="{exact: false}"
                     class="flex items-center px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-all duration-200">
                    <span class="text-xs mr-3">{{ child.icon }}</span>
                    {{ child.label }}
                  </a>
                }
              </div>
            }
          </div>
        }
      </nav>

      <!-- Quick Actions với thiết kế đẹp -->
      <div class="p-4 border-t border-gray-200 bg-white">
        <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-2">Thao tác nhanh</h4>
        <div class="space-y-2">
          <button (click)="goToQuickAction('quiz')"
                  class="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 rounded-xl hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 group">
            <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
              </svg>
            </div>
            <span class="font-medium">Làm Quiz</span>
          </button>
          
          <button (click)="goToQuickAction('courses')"
                  class="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 rounded-xl hover:bg-green-50 hover:text-green-700 transition-all duration-200 group">
            <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
              </svg>
            </div>
            <span class="font-medium">Khóa học mới</span>
          </button>
          
          <button (click)="goToQuickAction('learning')"
                  class="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 rounded-xl hover:bg-purple-50 hover:text-purple-700 transition-all duration-200 group">
            <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"></path>
              </svg>
            </div>
            <span class="font-medium">Tiếp tục học</span>
          </button>
        </div>
      </div>

      <!-- Footer với thiết kế chuyên nghiệp -->
      <div class="p-4 border-t border-gray-200 bg-gray-50">
        <button (click)="logout()"
                class="w-full flex items-center space-x-3 px-4 py-3 text-red-700 rounded-xl hover:bg-red-50 transition-all duration-200 group">
          <div class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center group-hover:bg-red-200 transition-colors">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clip-rule="evenodd"></path>
            </svg>
          </div>
          <span class="font-medium">Đăng xuất</span>
        </button>
      </div>
    </aside>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fadeIn {
      animation: fadeIn 0.3s ease-out;
    }
  `]
})
export class StudentSidebarComponent {
  protected authService = inject(AuthService);
  private router = inject(Router);

  // Navigation items với thiết kế chuyên nghiệp - CORRECTED ROUTES
  navigationItems = signal<NavigationItem[]>([
    {
      label: 'Dashboard',
      icon: '🏠',
      route: '/student/dashboard',
      isActive: false
    },
    {
      label: 'Khóa học',
      icon: '',
      route: '/student/courses',
      isActive: false
    },
    {
      label: 'Học tập',
      icon: '',
      route: '/student/learning',
      isActive: false
    },
    {
      label: 'Bài tập',
      icon: '',
      route: '/student/assignments',
      badge: '3',
      isActive: false
    },
    {
      label: 'Quiz',
      icon: '',
      route: '/student/quiz',
      isActive: false
    },
    {
      label: 'Thảo luận',
      icon: '💬',
      route: '/student/forum',
      isActive: false
    },
    {
      label: 'Phân tích',
      icon: '📊',
      route: '/student/analytics',
      isActive: false
    },
    {
      label: 'Study Streaks',
      icon: '🔥',
      route: '/student/streaks',
      badge: '7',
      isActive: false
    },
    {
      label: 'Hồ sơ',
      icon: '👤',
      route: '/student/profile',
      isActive: false
    }
  ]);

  getIconBgClass(item: NavigationItem): string {
    const iconMap: { [key: string]: string } = {
      '🏠': 'bg-blue-100 text-blue-600',
      '📚': 'bg-green-100 text-green-600',
      '🎓': 'bg-purple-100 text-purple-600',
      '📋': 'bg-orange-100 text-orange-600',
      '❓': 'bg-indigo-100 text-indigo-600',
      '💬': 'bg-pink-100 text-pink-600',
      '📊': 'bg-teal-100 text-teal-600',
      '🔥': 'bg-red-100 text-red-600',
      '👤': 'bg-gray-100 text-gray-600'
    };
    return iconMap[item.icon] || 'bg-gray-100 text-gray-600';
  }

  isSubMenuOpen(item: NavigationItem): boolean {
    return this.router.url.startsWith(item.route);
  }

  goToQuickAction(action: string): void {
    switch (action) {
      case 'quiz':
        this.router.navigate(['/student/quiz']);
        break;
      case 'courses':
        this.router.navigate(['/courses']);
        break;
      case 'learning':
        this.router.navigate(['/student/learning']);
        break;
    }
  }

  logout(): void {
    this.authService.logout();
  }
}