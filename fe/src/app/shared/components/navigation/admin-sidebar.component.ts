import { Component, signal, inject, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
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
    <aside class="admin-sidebar">
      <!-- Header với Maritime Theme -->
      <div class="sidebar-header">
        <div class="flex items-center space-x-3">
          <div class="header-icon">
            <svg class="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"></path>
            </svg>
          </div>
          <div>
            <h1 class="text-xl font-bold text-white">LMS Maritime</h1>
            <p class="text-xs text-blue-100">Admin Portal</p>
          </div>
        </div>
      </div>

      <!-- User Profile -->
      <div class="user-profile">
        <div class="flex items-center space-x-3">
          <div class="relative">
            <img [src]="authService.currentUser()?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'" 
                 [alt]="authService.userName()" 
                 class="w-12 h-12 rounded-lg object-cover border-2 border-blue-200 shadow-sm">
            <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-gray-900 truncate">{{ authService.userName() }}</p>
            <p class="text-xs text-gray-500 truncate">{{ authService.userEmail() }}</p>
            <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 mt-1">
              Administrator
            </span>
          </div>
        </div>
      </div>

      <!-- Navigation với scrolling -->
      <nav class="sidebar-nav">
        @for (item of navigationItems(); track item.route) {
          <a [routerLink]="item.route"
             routerLinkActive="nav-item-active"
             [routerLinkActiveOptions]="{exact: false}"
             class="nav-item">
            <div class="flex items-center space-x-3">
              <div class="nav-icon" [class]="getIconBgClass(item)">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="item.icon"></path>
                </svg>
              </div>
              <span class="nav-label">{{ item.label }}</span>
            </div>
            @if (item.badge) {
              <span class="nav-badge">{{ item.badge }}</span>
            }
          </a>
        }
      </nav>

      <!-- Footer -->
      <div class="sidebar-footer">
        <button (click)="logout()" class="logout-btn">
          <div class="logout-icon">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clip-rule="evenodd"></path>
            </svg>
          </div>
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    /* Maritime Theme - Blue Ocean Colors */
    .admin-sidebar {
      width: 256px;
      min-width: 256px;
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: linear-gradient(to bottom, #ffffff, #f8fafc);
      border-right: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    /* Header - Maritime Blue Gradient */
    .sidebar-header {
      padding: 1.5rem;
      background: linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .header-icon {
      width: 3rem;
      height: 3rem;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(10px);
    }

    /* User Profile */
    .user-profile {
      padding: 1.25rem 1.5rem;
      background: white;
      border-bottom: 1px solid #e2e8f0;
    }

    /* Navigation - Scrollable */
    .sidebar-nav {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 1rem;
      background: white;
    }

    /* Custom Scrollbar */
    .sidebar-nav::-webkit-scrollbar {
      width: 6px;
    }

    .sidebar-nav::-webkit-scrollbar-track {
      background: transparent;
    }

    .sidebar-nav::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 3px;
    }

    .sidebar-nav::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }

    /* Nav Items */
    .nav-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      margin-bottom: 0.25rem;
      border-radius: 0.5rem;
      color: #475569;
      font-size: 0.875rem;
      font-weight: 500;
      text-decoration: none;
      transition: all 0.2s ease;
      cursor: pointer;
    }

    .nav-item:hover {
      background: #f1f5f9;
      color: #0369a1;
    }

    .nav-item-active {
      background: linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%);
      color: white;
      box-shadow: 0 2px 4px rgba(3, 105, 161, 0.2);
    }

    .nav-item-active .nav-icon {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }

    .nav-icon {
      width: 2rem;
      height: 2rem;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .nav-item:hover .nav-icon {
      transform: scale(1.1);
    }

    .nav-label {
      flex: 1;
      margin-left: 0.75rem;
    }

    .nav-badge {
      padding: 0.125rem 0.5rem;
      background: #ef4444;
      color: white;
      font-size: 0.75rem;
      font-weight: 700;
      border-radius: 9999px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    /* Footer */
    .sidebar-footer {
      padding: 1rem 1.5rem;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
    }

    .logout-btn {
      width: 100%;
      display: flex;
      align-items: center;
      padding: 0.75rem 1rem;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      color: #dc2626;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .logout-btn:hover {
      background: #fef2f2;
      border-color: #fecaca;
    }

    .logout-icon {
      width: 2rem;
      height: 2rem;
      background: #fee2e2;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 0.75rem;
      transition: all 0.2s ease;
    }

    .logout-btn:hover .logout-icon {
      background: #fecaca;
    }

    /* Icon Colors - Maritime Theme */
    .icon-dashboard {
      background: #e0f2fe;
      color: #0369a1;
    }

    .icon-users {
      background: #dbeafe;
      color: #2563eb;
    }

    .icon-courses {
      background: #d1fae5;
      color: #059669;
    }

    .icon-analytics {
      background: #e0e7ff;
      color: #4f46e5;
    }

    .icon-settings {
      background: #fef3c7;
      color: #d97706;
    }

    .icon-reports {
      background: #e9d5ff;
      color: #9333ea;
    }

    .icon-notifications {
      background: #fee2e2;
      color: #dc2626;
    }

    .icon-logs {
      background: #f3f4f6;
      color: #6b7280;
    }

    .icon-default {
      background: #f1f5f9;
      color: #64748b;
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

  // Navigation items với SVG icons chuyên nghiệp
  navigationItems = signal<NavigationItem[]>([
    {
      label: 'Dashboard',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6',
      route: '/admin/dashboard',
      isActive: false
    },
    {
      label: 'Người dùng',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M15 7a3 3 0 11-6 0 3 3 0 016 0z',
      route: '/admin/users',
      isActive: false
    },
    {
      label: 'Khóa học',
      icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
      route: '/admin/courses',
      isActive: false
    },
    {
      label: 'Phân tích',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      route: '/admin/analytics',
      isActive: false
    },
    {
      label: 'Cài đặt hệ thống',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
      route: '/admin/settings',
      isActive: false
    },
    {
      label: 'Báo cáo',
      icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      route: '/admin/reports',
      isActive: false
    },
    {
      label: 'Thông báo',
      icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0',
      route: '/admin/notifications',
      badge: '5',
      isActive: false
    },
    {
      label: 'Nhật ký hệ thống',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      route: '/admin/logs',
      isActive: false
    }
  ]);

  getIconBgClass(item: NavigationItem): string {
    // Maritime theme colors - ocean blues and nautical colors
    const routeColorMap: { [key: string]: string } = {
      '/admin/dashboard': 'icon-dashboard',
      '/admin/users': 'icon-users',
      '/admin/courses': 'icon-courses',
      '/admin/analytics': 'icon-analytics',
      '/admin/settings': 'icon-settings',
      '/admin/reports': 'icon-reports',
      '/admin/notifications': 'icon-notifications',
      '/admin/logs': 'icon-logs'
    };
    return routeColorMap[item.route] || 'icon-default';
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