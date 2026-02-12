import { Component, signal, inject, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';

import { RouterModule, Router, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { IconComponent, IconName } from '../icon/icon.component';

interface NavigationItem {
  label: string;
  icon: IconName;
  route: string;
  badge?: string | number;
  isActive?: boolean;
  isExpanded?: boolean;
  children?: NavigationItem[];
}

@Component({
  selector: 'app-admin-sidebar',
  imports: [RouterModule, RouterLinkActive, IconComponent],
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
            <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-[#004BB5] mt-1">
              {{ authService.userRole() === 'org_admin' ? 'Chuyên viên' : 'System Admin' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Navigation với scrolling -->
      <nav class="sidebar-nav">
        @for (item of navigationItems(); track item.route) {
          @if (item.children && item.children.length > 0) {
            <!-- Parent with children (dropdown) -->
            <div class="nav-group">
              <button (click)="toggleSubmenu(item)" 
                      class="nav-item nav-parent w-full"
                      [class.nav-parent-active]="isParentActive(item)">
                <div class="flex items-center space-x-3">
                  <div class="nav-icon" [class]="getIconBgClass(item)">
                    <app-icon [name]="item.icon" size="sm"/>
                  </div>
                  <span class="nav-label">{{ item.label }}</span>
                </div>
                <svg class="w-4 h-4 transition-transform duration-200" 
                     [class.rotate-180]="item.isExpanded"
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
              
              <!-- Submenu -->
              @if (item.isExpanded) {
                <div class="nav-submenu">
                  @for (child of item.children; track child.route) {
                    <a [routerLink]="child.route"
                       routerLinkActive="nav-item-active"
                       [routerLinkActiveOptions]="{exact: true}"
                       class="nav-subitem">
                      <div class="flex items-center space-x-3">
                        <div class="nav-subicon" [class]="getSubIconClass(child)">
                          <app-icon [name]="child.icon" size="xs"/>
                        </div>
                        <span class="nav-sublabel">{{ child.label }}</span>
                      </div>
                      @if (child.badge) {
                        <span class="nav-badge-small">{{ child.badge }}</span>
                      }
                    </a>
                  }
                </div>
              }
            </div>
          } @else {
            <!-- Regular nav item -->
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

    /* Dropdown Navigation Styles */
    .nav-group {
      margin-bottom: 0.25rem;
    }

    .nav-parent {
      border: none;
      background: transparent;
      text-align: left;
    }

    .nav-parent-active {
      background: #f1f5f9;
      color: #0369a1;
    }

    .nav-submenu {
      margin-left: 1rem;
      padding-left: 0.75rem;
      border-left: 2px solid #e2e8f0;
      margin-top: 0.25rem;
      animation: slideDown 0.2s ease-out;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .nav-subitem {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.75rem;
      margin-bottom: 0.125rem;
      border-radius: 0.375rem;
      color: #64748b;
      font-size: 0.8125rem;
      font-weight: 500;
      text-decoration: none;
      transition: all 0.2s ease;
      cursor: pointer;
    }

    .nav-subitem:hover {
      background: #f1f5f9;
      color: #0369a1;
    }

    .nav-subitem.nav-item-active {
      background: linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%);
      color: white;
    }

    .nav-subicon {
      width: 1.5rem;
      height: 1.5rem;
      border-radius: 0.375rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .nav-sublabel {
      flex: 1;
      margin-left: 0.5rem;
    }

    .nav-badge-small {
      padding: 0.0625rem 0.375rem;
      background: #ef4444;
      color: white;
      font-size: 0.625rem;
      font-weight: 700;
      border-radius: 9999px;
    }

    /* Subicon Colors */
    .subicon-all {
      background: #dbeafe;
      color: #2563eb;
    }

    .subicon-admin {
      background: #fef3c7;
      color: #d97706;
    }

    .subicon-teacher {
      background: #d1fae5;
      color: #059669;
    }

    .subicon-student {
      background: #e0e7ff;
      color: #4f46e5;
    }

    .subicon-default {
      background: #f1f5f9;
      color: #64748b;
    }

    .rotate-180 {
      transform: rotate(180deg);
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

  // Routes hidden from ORG_ADMIN (system-level only)
  private readonly systemOnlyRoutes = new Set(['/admin/settings', '/admin/logs', '/admin/ai-knowledge']);

  // All navigation items
  private readonly allNavigationItems: NavigationItem[] = [
    {
      label: 'Dashboard',
      icon: 'home',
      route: '/admin/dashboard',
      isActive: false
    },
    {
      label: 'Người dùng',
      icon: 'users',
      route: '/admin/users',
      isExpanded: false,
      children: [
        {
          label: 'Tất cả người dùng',
          icon: 'users',
          route: '/admin/users/all'
        },
        {
          label: 'Quản trị viên',
          icon: 'shield',
          route: '/admin/users/admins'
        },
        {
          label: 'Giảng viên',
          icon: 'briefcase',
          route: '/admin/users/teachers'
        },
        {
          label: 'Học viên',
          icon: 'graduation-cap',
          route: '/admin/users/students'
        }
      ]
    },
    {
      label: 'Khóa học',
      icon: 'courses',
      route: '/admin/courses',
      isActive: false
    },
    {
      label: 'Phân tích',
      icon: 'bar-chart',
      route: '/admin/analytics',
      isActive: false
    },
    {
      label: 'Cài đặt hệ thống',
      icon: 'settings',
      route: '/admin/settings',
      isActive: false
    },
    {
      label: 'Báo cáo',
      icon: 'file-text',
      route: '/admin/reports',
      isActive: false
    },
    {
      label: 'Thông báo',
      icon: 'bell',
      route: '/admin/notifications',
      badge: '5',
      isActive: false
    },
    {
      label: 'Nhật ký hệ thống',
      icon: 'file-text',
      route: '/admin/logs',
      isActive: false
    },
    {
      label: 'LMS AI',
      icon: 'globe',
      route: '/admin/ai-chat',
      badge: 'NEW',
      isActive: false
    },
    {
      label: 'Quản lý Tri thức AI',
      icon: 'globe',
      route: '/admin/ai-knowledge',
      isActive: false
    }
  ];

  // Navigation items — filtered by role (ORG_ADMIN hides system-only items)
  navigationItems = signal<NavigationItem[]>(
    this.authService.userRole() === 'org_admin'
      ? this.allNavigationItems.filter(item => !this.systemOnlyRoutes.has(item.route))
      : this.allNavigationItems
  );

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
      '/admin/logs': 'icon-logs',
      '/admin/ai-chat': 'icon-dashboard',
      '/admin/ai-knowledge': 'icon-courses'
    };
    return routeColorMap[item.route] || 'icon-default';
  }

  getSubIconClass(item: NavigationItem): string {
    const routeColorMap: { [key: string]: string } = {
      '/admin/users/all': 'subicon-all',
      '/admin/users/admins': 'subicon-admin',
      '/admin/users/teachers': 'subicon-teacher',
      '/admin/users/students': 'subicon-student'
    };
    return routeColorMap[item.route] || 'subicon-default';
  }

  toggleSubmenu(item: NavigationItem): void {
    // Toggle isExpanded for the clicked item
    const items = this.navigationItems();
    const updatedItems = items.map(navItem => {
      if (navItem.route === item.route) {
        return { ...navItem, isExpanded: !navItem.isExpanded };
      }
      return navItem;
    });
    this.navigationItems.set(updatedItems);
  }

  isParentActive(item: NavigationItem): boolean {
    return this.router.url.startsWith(item.route);
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
