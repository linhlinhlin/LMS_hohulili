import { Component, signal, computed, inject, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MaritimeIconComponent } from './maritime-icon.component';

interface NavigationItem {
  label: string;
  iconKey: string;
  route: string;
  badge?: string | number;
  description?: string;
  isActive?: boolean;
}

@Component({
  selector: 'app-collapsible-student-sidebar',
  imports: [CommonModule, RouterModule, MaritimeIconComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <aside class="relative h-full bg-white flex flex-col shadow-2xl transition-all duration-500 ease-in-out"
           [class]="isCollapsed() ? 'w-16 min-w-[4rem] max-w-[4rem]' : 'w-64 min-w-[16rem] max-w-[16rem]'">
      
      <!-- Professional LED Accent Border -->
      <div class="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-600 via-yellow-400 to-blue-600 shadow-lg shadow-blue-600/30 z-10">
        <div class="absolute inset-0 bg-gradient-to-b from-transparent via-white/30 to-transparent animate-pulse"></div>
      </div>

      <!-- Toggle Button -->
      <button
        (click)="toggleSidebar()"
        class="fixed top-6 z-50 w-6 h-10 bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-600 text-white rounded-r-lg shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-500 ease-in-out border border-l-0 border-yellow-400/30 hover:border-yellow-400/60"
        [class]="isCollapsed() ? 'left-16' : 'left-64'"
        [title]="isCollapsed() ? 'Mở rộng sidebar' : 'Thu gọn sidebar'"
        [attr.aria-label]="isCollapsed() ? 'Mở rộng sidebar' : 'Thu gọn sidebar'">
        <div class="transition-transform duration-500 ease-in-out" [class]="isCollapsed() ? 'rotate-0' : 'rotate-180'">
          <app-maritime-icon iconName="chevron-left"></app-maritime-icon>
        </div>
      </button>

      <!-- Sidebar Header - Professional Maritime Design -->
      <header class="flex-shrink-0 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-600 text-white relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-transparent"></div>
        <div class="absolute top-0 right-0 w-16 h-16 bg-yellow-400/10 rounded-full -translate-y-8 translate-x-8"></div>
        
        <div class="relative z-10 transition-all duration-500" [class]="isCollapsed() ? 'px-2 py-3' : 'px-3 py-4'">
          <div class="flex items-center transition-all duration-500" [class]="isCollapsed() ? 'justify-center w-full' : 'gap-2'">
            <div class="bg-white/15 backdrop-blur-sm rounded-lg flex items-center justify-center shadow-md border border-white/20 transition-all duration-500 group hover:bg-white/20"
                 [class]="isCollapsed() ? 'w-8 h-8' : 'w-10 h-10'">
              <div class="text-white group-hover:scale-110 transition-transform duration-300 text-sm">
                <app-maritime-icon iconName="university"></app-maritime-icon>
              </div>
            </div>

            @if (!isCollapsed()) {
              <div class="flex-1 min-w-0 transition-all duration-500">
                <h1 class="text-base font-bold tracking-tight truncate mb-0.5">
                  <span class="text-white">LMS </span>
                  <span class="text-yellow-400">Maritime</span>
                </h1>
                <p class="text-xs text-blue-100/90 truncate font-medium tracking-wide">Student Portal</p>
              </div>
            }
          </div>
        </div>

        <div class="relative h-px bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent">
          <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse"></div>
        </div>
      </header>

      <!-- User Profile Section - Collapsible -->
      @if (!isCollapsed()) {
        <div class="p-6 border-b border-blue-100 bg-white">
          <div class="flex items-center space-x-4">
            <div class="relative">
              <img [src]="authService.currentUser()?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'" 
                   [alt]="authService.userName()" 
                   class="w-14 h-14 rounded-xl object-cover border-3 border-blue-200 shadow-lg">
              <div class="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white shadow-md"></div>
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
      }

      <!-- Navigation Menu - Enhanced Design -->
      <div class="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-blue-600/50">
        <!-- Section Divider -->
        <div class="flex items-center transition-all duration-300" [class]="isCollapsed() ? 'px-2 py-2' : 'px-4 py-2'">
          @if (!isCollapsed()) {
            <div class="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
            <div class="flex-1 h-px bg-gradient-to-r from-blue-600/30 via-gray-300 to-transparent ml-2"></div>
          } @else {
            <div class="w-full h-px bg-gradient-to-r from-transparent via-blue-600/50 to-transparent"></div>
          }
        </div>

        <!-- Navigation Items -->
        <nav class="flex-1 overflow-hidden transition-all duration-300" [class]="isCollapsed() ? 'px-1 py-3' : 'px-3 py-4'">
          @if (!isCollapsed()) {
            <div class="mb-4 px-2">
              <h3 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Chức năng chính</h3>
            </div>
          }

          <div class="space-y-1" [class]="isCollapsed() ? 'space-y-2' : ''">
            @for (item of navigationItems(); track item.route) {
              <div class="relative">
                <button
                  (click)="navigateTo(item.route)"
                  [title]="isCollapsed() ? item.label : undefined"
                  class="group relative w-full flex items-center text-left transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] rounded-xl overflow-hidden"
                  [class]="getNavigationItemClass(item)">
                  
                  <!-- Active Side Indicator -->
                  @if (isActiveRoute(item.route) && !isCollapsed()) {
                    <div class="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-10 bg-yellow-400 rounded-r-full shadow-lg"></div>
                  }

                  <!-- Icon Container -->
                  <div class="relative z-10 flex items-center justify-center rounded-lg transition-all duration-300 flex-shrink-0"
                       [class]="getIconContainerClass(item)">
                    <div class="transition-all duration-300 text-sm" [class]="isActiveRoute(item.route) ? 'scale-105' : 'group-hover:scale-105'">
                      <app-maritime-icon [iconName]="item.iconKey"></app-maritime-icon>
                    </div>

                    <!-- Badge for special items -->
                    @if (item.badge === "new") {
                      <div class="absolute -top-0.5 -right-0.5 w-3 h-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full border border-white animate-bounce flex items-center justify-center shadow-md">
                        <div class="w-1 h-1 bg-white rounded-full"></div>
                      </div>
                    }
                  </div>

                  <!-- Label & Description -->
                  @if (!isCollapsed()) {
                    <div class="relative z-10 flex-1 min-w-0">
                      <div class="font-semibold text-sm leading-tight transition-colors duration-300 truncate mb-0.5"
                           [class]="isActiveRoute(item.route) ? 'text-white' : 'text-gray-900 group-hover:text-blue-600'">
                        {{ item.label }}
                      </div>
                      @if (item.description) {
                        <div class="text-xs transition-colors duration-300 truncate"
                             [class]="isActiveRoute(item.route) ? 'text-blue-100' : 'text-gray-500 group-hover:text-gray-600'">
                          {{ item.description }}
                        </div>
                      }
                    </div>
                  }

                  <!-- Badge -->
                  @if (item.badge && !isCollapsed()) {
                    <span class="ml-auto px-2 py-1 text-xs bg-red-500 text-white rounded-full shadow-sm">
                      {{ item.badge }}
                    </span>
                  }

                  <!-- Active Arrow Indicator -->
                  @if (isActiveRoute(item.route) && !isCollapsed()) {
                    <div class="text-yellow-400 flex-shrink-0 animate-pulse">
                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                      </svg>
                    </div>
                  }

                  <!-- Professional Tooltip for collapsed mode -->
                  @if (isCollapsed()) {
                    <div class="absolute left-full ml-3 px-3 py-2 bg-blue-600 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-yellow-400/30">
                      <div class="font-semibold text-sm">{{ item.label }}</div>
                      @if (item.description) {
                        <div class="text-xs text-blue-100 mt-0.5">{{ item.description }}</div>
                      }
                      <!-- Enhanced Tooltip Arrow -->
                      <div class="absolute left-0 top-1/2 transform -translate-x-1 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-blue-600"></div>
                    </div>
                  }

                  <!-- Subtle background animation -->
                  <div class="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/10 to-transparent transform translate-x-full group-hover:translate-x-0 transition-transform duration-700"
                       [class]="isActiveRoute(item.route) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"></div>
                </button>
              </div>
            }
          </div>
        </nav>
      </div>

      <!-- Bottom Section Divider -->
      <div class="flex items-center transition-all duration-300" [class]="isCollapsed() ? 'px-2 py-2' : 'px-4 py-2'">
        @if (!isCollapsed()) {
          <div class="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-blue-600/30 mr-2"></div>
          <div class="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
        } @else {
          <div class="w-full h-px bg-gradient-to-r from-transparent via-blue-600/50 to-transparent"></div>
        }
      </div>

      <!-- Footer Section - Professional Design -->
      <footer class="flex-shrink-0 bg-gradient-to-r from-blue-600/5 to-yellow-400/5 border-t border-gray-200/50 transition-all duration-300"
              [class]="isCollapsed() ? 'px-2 py-2' : 'px-4 py-3'">
        @if (!isCollapsed()) {
          <div class="text-center">
            <p class="text-xs text-gray-500 font-medium">© 2025 LMS Maritime</p>
            <p class="text-xs text-gray-400 mt-0.5">Professional Student Portal</p>
          </div>
        } @else {
          <div class="flex justify-center">
            <div class="w-2 h-2 bg-blue-600 rounded-full opacity-60"></div>
          </div>
        }
      </footer>

      <!-- Bottom Accent Border -->
      <div class="h-1 bg-gradient-to-r from-blue-600 via-yellow-400 to-blue-600 shadow-inner"></div>
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
export class CollapsibleStudentSidebarComponent {
  protected authService = inject(AuthService);
  private router = inject(Router);

  // Sidebar state
  isCollapsed = signal(false);

  // Enhanced Navigation items with maritime icons
  navigationItems = signal<NavigationItem[]>([
    {
      label: 'Dashboard',
      iconKey: 'anchor',
      route: '/student/dashboard',
      description: 'Trang chủ sinh viên'
    },
    {
      label: 'Khóa học',
      iconKey: 'university',
      route: '/student/courses',
      description: 'Quản lý khóa học'
    },
    {
      label: 'Học tập',
      iconKey: 'history',
      route: '/student/learning',
      description: 'Tiếp tục học tập'
    },
    {
      label: 'Bài tập',
      iconKey: 'list',
      route: '/student/assignments',
      badge: '3',
      description: 'Bài tập chờ làm'
    },
    {
      label: 'Quiz',
      iconKey: 'list',
      route: '/student/quiz',
      description: 'Kiểm tra kiến thức'
    },
    {
      label: 'Thảo luận',
      iconKey: 'user',
      route: '/student/forum',
      description: 'Diễn đàn học tập'
    },
    {
      label: 'Phân tích',
      iconKey: 'ship-wheel',
      route: '/student/analytics',
      description: 'Thống kê học tập'
    },
    {
      label: 'Study Streaks',
      iconKey: 'check-circle',
      route: '/student/streaks',
      badge: '7',
      description: 'Chuỗi học tập'
    },
    {
      label: 'Hồ sơ',
      iconKey: 'user',
      route: '/student/profile',
      description: 'Thông tin cá nhân'
    }
  ]);

  toggleSidebar(): void {
    this.isCollapsed.set(!this.isCollapsed());
    // Save state to localStorage
    localStorage.setItem('lms-sidebar-collapsed', JSON.stringify(this.isCollapsed()));
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  isActiveRoute(route: string): boolean {
    return this.router.url.startsWith(route);
  }

  getNavigationItemClass(item: NavigationItem): string {
    const baseClass = this.isCollapsed() ? 'justify-center px-1 py-3 h-12' : 'gap-3 px-3 py-3 h-14';
    const activeClass = this.isActiveRoute(item.route)
      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/25 border border-yellow-400/30'
      : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-600/5 hover:shadow-md hover:shadow-gray-200/50 border border-transparent hover:border-blue-600/20';
    
    return `${baseClass} ${activeClass}`;
  }

  getIconContainerClass(item: NavigationItem): string {
    const sizeClass = this.isCollapsed() ? 'w-8 h-8' : 'w-10 h-10';
    const colorClass = this.isActiveRoute(item.route)
      ? 'bg-white/20 text-white shadow-md backdrop-blur-sm border border-white/30'
      : 'bg-gradient-to-br from-gray-100 to-gray-50 text-blue-600 group-hover:bg-gradient-to-br group-hover:from-blue-600 group-hover:to-blue-700 group-hover:text-white group-hover:shadow-md border border-gray-200 group-hover:border-yellow-400/30';
    
    return `${sizeClass} ${colorClass}`;
  }
}