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
  selector: 'app-admin-sidebar',
  imports: [CommonModule, RouterModule, RouterLinkActive],
  encapsulation: ViewEncapsulation.None,
  template: `
    <aside class="w-64 bg-gradient-to-b from-white to-gray-50 shadow-xl border-r border-gray-200 h-full flex flex-col">
      <!-- Header với Logo chuyên nghiệp cho Admin -->
      <div class="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-800 to-gray-900">
        <div class="flex items-center space-x-3">
          <div class="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <svg class="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"></path>
            </svg>
          </div>
          <div>
            <h1 class="text-xl font-bold text-white">LMS Maritime</h1>
            <p class="text-xs text-gray-300">Admin Portal</p>
          </div>
        </div>
      </div>

      <!-- User Profile với thiết kế hiện đại -->
      <div class="p-6 border-b border-gray-200 bg-white">
        <div class="flex items-center space-x-4">
          <div class="relative">
            <img [src]="authService.currentUser()?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'" 
                 [alt]="authService.userName()" 
                 class="w-14 h-14 rounded-xl object-cover border-3 border-gray-200 shadow-lg">
            <div class="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-gray-900 truncate">{{ authService.userName() }}</p>
            <p class="text-xs text-gray-500 truncate">{{ authService.userEmail() }}</p>
            <div class="flex items-center mt-1">
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Quản trị viên
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Admin Stats với thiết kế đẹp -->
      <div class="p-4 border-b border-gray-200 bg-white">
        <div class="grid grid-cols-2 gap-3">
          <div class="text-center p-3 bg-blue-50 rounded-xl">
            <div class="text-lg font-bold text-blue-600">{{ adminStats().users }}</div>
            <div class="text-xs text-blue-500">Người dùng</div>
          </div>
          <div class="text-center p-3 bg-green-50 rounded-xl">
            <div class="text-lg font-bold text-green-600">{{ adminStats().courses }}</div>
            <div class="text-xs text-green-500">Khóa học</div>
          </div>
        </div>
      </div>

      <!-- Search với thiết kế đẹp -->
      <div class="p-4 border-b border-gray-200 bg-white">
        <div class="relative">
          <input type="text" 
                 placeholder="Tìm kiếm người dùng, khóa học..."
                 class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all duration-200">
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
               routerLinkActive="bg-gray-50 text-gray-700 border-r-2 border-gray-700 shadow-sm"
               [routerLinkActiveOptions]="{exact: false}"
               class="flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group hover:bg-gray-50 hover:shadow-sm">
              <div class="flex items-center space-x-3">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200"
                     [class]="getIconBgClass(item)">
                  <span class="text-sm">{{ item.icon }}</span>
                </div>
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
                     routerLinkActive="bg-gray-100 text-gray-800"
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
          <button (click)="goToQuickAction('manage-users')"
                  class="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 rounded-xl hover:bg-gray-50 hover:text-gray-700 transition-all duration-200 group">
            <div class="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 8v1h1.5a.5.5 0 01.5.5v9a.5.5 0 01-.5.5h-13a.5.5 0 01-.5-.5v-9a.5.5 0 01.5-.5H8v-1a5 5 0 00-5 5v1h9.93z"></path>
              </svg>
            </div>
            <span class="font-medium">Quản lý người dùng</span>
          </button>
          
          <button (click)="goToQuickAction('system-settings')"
                  class="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 rounded-xl hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 group">
            <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"></path>
              </svg>
            </div>
            <span class="font-medium">Cài đặt hệ thống</span>
          </button>
          
          <button (click)="goToQuickAction('reports')"
                  class="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 rounded-xl hover:bg-green-50 hover:text-green-700 transition-all duration-200 group">
            <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h4.586l-1.293-1.293a1 1 0 011.414-1.414L10 15.414l2.293-2.293a1 1 0 111.414 1.414L12.414 15H17a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
              </svg>
            </div>
            <span class="font-medium">Báo cáo hệ thống</span>
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
export class AdminSidebarComponent {
  protected authService = inject(AuthService);
  private router = inject(Router);

  // Admin Stats
  adminStats = signal({
    users: 1250,
    courses: 45,
    teachers: 25,
    students: 1200
  });

  // Navigation items với thiết kế chuyên nghiệp cho Admin - SIMPLIFIED ROUTES
  navigationItems = signal<NavigationItem[]>([
    {
      label: 'Dashboard',
      icon: '🏠',
      route: '/admin/dashboard',
      isActive: false
    },
    {
      label: 'Người dùng',
      icon: '👥',
      route: '/admin/users',
      children: [
        {
          label: 'Tất cả người dùng',
          icon: '👤',
          route: '/admin/users',
          isActive: false
        },
        {
          label: 'Sinh viên',
          icon: '🎓',
          route: '/admin/users',
          isActive: false
        },
        {
          label: 'Giảng viên',
          icon: '👨‍🏫',
          route: '/admin/users',
          isActive: false
        },
        {
          label: 'Thêm người dùng',
          icon: '➕',
          route: '/admin/users',
          isActive: false
        }
      ],
      isActive: false
    },
    {
      label: 'Khóa học',
      icon: '📚',
      route: '/admin/courses',
      children: [
        {
          label: 'Tất cả khóa học',
          icon: '📖',
          route: '/admin/courses',
          isActive: false
        },
        {
          label: 'Phê duyệt khóa học',
          icon: '✅',
          route: '/admin/courses',
          badge: '3',
          isActive: false
        },
        {
          label: 'Danh mục',
          icon: '📁',
          route: '/admin/courses',
          isActive: false
        }
      ],
      isActive: false
    },
    {
      label: 'Hệ thống',
      icon: '⚙️',
      route: '/admin/system',
      children: [
        {
          label: 'Cài đặt chung',
          icon: '🔧',
          route: '/admin/system',
          isActive: false
        },
        {
          label: 'Bảo mật',
          icon: '🔒',
          route: '/admin/system',
          isActive: false
        },
        {
          label: 'Backup & Restore',
          icon: '💾',
          route: '/admin/system',
          isActive: false
        }
      ],
      isActive: false
    },
    {
      label: 'Báo cáo',
      icon: '📊',
      route: '/admin/reports',
      children: [
        {
          label: 'Tổng quan',
          icon: '📈',
          route: '/admin/reports',
          isActive: false
        },
        {
          label: 'Người dùng',
          icon: '👥',
          route: '/admin/reports',
          isActive: false
        },
        {
          label: 'Khóa học',
          icon: '📚',
          route: '/admin/reports',
          isActive: false
        },
        {
          label: 'Doanh thu',
          icon: '💰',
          route: '/admin/reports',
          isActive: false
        }
      ],
      isActive: false
    },
    {
      label: 'Thông báo',
      icon: '🔔',
      route: '/admin/notifications',
      badge: '5',
      isActive: false
    },
    {
      label: 'Nhật ký',
      icon: '📝',
      route: '/admin/logs',
      isActive: false
    },
    {
      label: 'Cài đặt',
      icon: '⚙️',
      route: '/admin/settings',
      isActive: false
    }
  ]);

  getIconBgClass(item: NavigationItem): string {
    const iconMap: { [key: string]: string } = {
      '🏠': 'bg-gray-100 text-gray-600',
      '👥': 'bg-blue-100 text-blue-600',
      '📚': 'bg-green-100 text-green-600',
      '⚙️': 'bg-orange-100 text-orange-600',
      '📊': 'bg-indigo-100 text-indigo-600',
      '🔔': 'bg-red-100 text-red-600',
      '📝': 'bg-purple-100 text-purple-600'
    };
    return iconMap[item.icon] || 'bg-gray-100 text-gray-600';
  }

  isSubMenuOpen(item: NavigationItem): boolean {
    return this.router.url.startsWith(item.route);
  }

  goToQuickAction(action: string): void {
    switch (action) {
      case 'manage-users':
        this.router.navigate(['/admin/users']);
        break;
      case 'system-settings':
        this.router.navigate(['/admin/system']);
        break;
      case 'reports':
        this.router.navigate(['/admin/reports']);
        break;
    }
  }

  logout(): void {
    this.authService.logout();
  }
}