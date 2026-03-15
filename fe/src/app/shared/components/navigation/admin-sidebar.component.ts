import { Component, signal, inject, computed, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { RouterModule, Router, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { IconComponent, IconName } from '../icon/icon.component';

interface NavigationItem {
  label: string;
  icon: IconName;
  route: string;
  badge?: string | number;
  isExpanded?: boolean;
  separator?: boolean;
  children?: NavigationItem[];
}

@Component({
  selector: 'app-admin-sidebar',
  imports: [RouterModule, RouterLinkActive, IconComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="admin-sidebar">
      <!-- Header -->
      <div class="sidebar-header">
        <div class="flex items-center space-x-3">
          <img src="/icons/logo-master.png" alt="LMS Maritime" class="sidebar-brand-logo">
          <div class="flex-1 min-w-0">
            <h2 class="sidebar-title">{{ roleTitleText() }}</h2>
            <p class="sidebar-subtitle">{{ authService.currentUser()?.fullName }}</p>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="sidebar-nav">
        @for (item of navigationItems(); track item.route) {
          @if (item.separator) {
            <!-- Section separator (ADMIN only) -->
            <div class="nav-separator">
              <span>{{ item.label }}</span>
            </div>
          } @else if (item.children && item.children.length > 0) {
            <!-- Dropdown parent -->
            <div class="nav-item-container">
              <button (click)="toggleSubmenu(item)"
                      class="nav-item w-full"
                      [class.parent-active]="isParentActive(item)">
                <div class="nav-icon">
                  <app-icon [name]="item.icon" size="sm"/>
                </div>
                <span class="nav-label">{{ item.label }}</span>
                <svg class="w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0"
                     [class.rotate-180]="item.isExpanded"
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>

              @if (item.isExpanded) {
                <div class="sub-menu">
                  @for (child of item.children; track child.route) {
                    <a [routerLink]="child.route"
                       routerLinkActive="active"
                       [routerLinkActiveOptions]="{exact: true}"
                       class="sub-menu-item">
                      <div class="sub-icon">
                        <app-icon [name]="child.icon" size="xs"/>
                      </div>
                      {{ child.label }}
                    </a>
                  }
                </div>
              }
            </div>
          } @else {
            <!-- Regular nav item -->
            <div class="nav-item-container">
              <a [routerLink]="item.route"
                 routerLinkActive="active"
                 [routerLinkActiveOptions]="{exact: false}"
                 class="nav-item">
                <div class="nav-icon">
                  <app-icon [name]="item.icon" size="sm"/>
                </div>
                <span class="nav-label">{{ item.label }}</span>
                @if (item.badge) {
                  <span class="nav-badge">{{ item.badge }}</span>
                }
              </a>
            </div>
          }
        }
      </nav>

      <!-- Footer — matches teacher/student: simple text + icon -->
      <div class="sidebar-footer">
        <button (click)="logout()" class="logout-btn">
          <app-icon name="logout" size="sm"/>
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    /* ========================================
       Admin Sidebar — synced with SidebarComponent
       (teacher/student) visual design
       ======================================== */

    .admin-sidebar {
      background: white;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      height: 100vh;
      display: flex;
      flex-direction: column;
      border-right: 1px solid rgba(229, 231, 235, 0.5);
    }

    /* Header — white bg, same as teacher/student */
    .sidebar-header {
      padding: 1.5rem;
      background: white;
      border-bottom: 1px solid rgba(229, 231, 235, 0.5);
    }

    .sidebar-brand-logo {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 0.75rem;
      flex-shrink: 0;
      object-fit: contain;
    }

    .sidebar-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: #111827;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .sidebar-subtitle {
      font-size: 0.875rem;
      color: #6b7280;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Navigation */
    .sidebar-nav {
      flex: 1;
      padding: 1rem 0.75rem;
      overflow-y: auto;
      -ms-overflow-style: none;
      scrollbar-width: none;
    }

    .sidebar-nav::-webkit-scrollbar {
      display: none;
    }

    .nav-item-container {
      margin-bottom: 0.25rem;
    }

    .nav-item {
      display: flex;
      align-items: center;
      padding: 0.625rem 0.75rem;
      color: #374151;
      border-radius: 0.5rem;
      transition: all 0.2s;
      text-decoration: none;
      cursor: pointer;
      border: none;
      background: transparent;
      text-align: left;
      font-size: 0.875rem;
      width: 100%;
    }

    .nav-item:hover {
      background-color: #f9fafb;
    }

    /* Active state — matches teacher/student: light blue bg + blue text + right border */
    .nav-item.active {
      background-color: #eff6ff;
      color: #004BB5;
      border-right: 2px solid #0056D2;
    }

    .nav-item.active .nav-icon {
      color: #004BB5;
    }

    .parent-active {
      background-color: #f9fafb;
      color: #004BB5;
    }

    .parent-active .nav-icon {
      color: #004BB5;
    }

    /* Nav icon — small, no background box, matches teacher/student */
    .nav-icon {
      width: 1.25rem;
      height: 1.25rem;
      margin-right: 0.75rem;
      color: #9ca3af;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
    }

    .nav-item:hover .nav-icon {
      transform: scale(1.1);
      color: #0056D2;
    }

    .nav-label {
      font-weight: 500;
      font-size: 0.875rem;
      flex: 1;
    }

    .nav-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
      background-color: #fee2e2;
      color: #dc2626;
    }

    /* Section Separator (ADMIN "Hệ thống") */
    .nav-separator {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 0.75rem 0.5rem;
      margin-top: 0.5rem;
    }

    .nav-separator span {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
      white-space: nowrap;
    }

    .nav-separator::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #e2e8f0;
    }

    /* Submenu — matches teacher/student sub-menu */
    .sub-menu {
      margin-left: 2rem;
      margin-top: 0.5rem;
    }

    .sub-menu-item {
      display: flex;
      align-items: center;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      color: #6b7280;
      border-radius: 0.5rem;
      transition: all 0.2s;
      text-decoration: none;
      cursor: pointer;
    }

    .sub-menu-item:hover {
      background-color: #f3f4f6;
      color: #111827;
    }

    .sub-menu-item.active {
      background-color: #eff6ff;
      color: #004BB5;
      border-right: 2px solid #0056D2;
    }

    .sub-icon {
      width: 1rem;
      height: 1rem;
      margin-right: 0.5rem;
      color: #9ca3af;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .sub-menu-item.active .sub-icon {
      color: #004BB5;
    }

    /* Footer — matches teacher/student: simple, no border/background on button */
    .sidebar-footer {
      padding: 1rem;
      border-top: 1px solid rgba(229, 231, 235, 0.5);
    }

    .logout-btn {
      width: 100%;
      display: flex;
      align-items: center;
      padding: 0.625rem 0.75rem;
      color: #dc2626;
      border-radius: 0.5rem;
      transition: all 0.2s;
      cursor: pointer;
      border: none;
      background: transparent;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .logout-btn:hover {
      background-color: #fef2f2;
    }

    .logout-btn app-icon {
      margin-right: 0.75rem;
    }

    .rotate-180 {
      transform: rotate(180deg);
    }
  `]
})
export class AdminSidebarComponent {
  protected authService = inject(AuthService);
  private router = inject(Router);

  private isAdmin = computed(() => this.authService.userRole() === 'admin');

  roleTitleText = computed(() =>
    this.isAdmin() ? 'Cổng Quản trị' : 'Cổng Chuyên viên'
  );

  // ADMIN navigation — full access with system section
  private readonly adminNavItems: NavigationItem[] = [
    { label: 'Trang chủ', icon: 'home', route: '/admin/dashboard' },
    {
      label: 'Người dùng', icon: 'users', route: '/admin/users', isExpanded: false,
      children: [
        { label: 'Tất cả người dùng', icon: 'users', route: '/admin/users/all' },
        { label: 'Quản trị viên', icon: 'shield', route: '/admin/users/admins' },
        { label: 'Giảng viên', icon: 'briefcase', route: '/admin/users/teachers' },
        { label: 'Học viên', icon: 'graduation-cap', route: '/admin/users/students' }
      ]
    },
    { label: 'Khóa học', icon: 'courses', route: '/admin/courses' },
    { label: 'Danh mục', icon: 'tag', route: '/admin/categories' },
    { label: 'Tổ chức', icon: 'briefcase', route: '/admin/organizations' },
    { label: 'Phân tích', icon: 'bar-chart', route: '/admin/analytics' },
    { label: 'Rút tiền', icon: 'briefcase', route: '/admin/payouts' },
    { label: 'Hệ thống', icon: 'settings', route: '_separator_system', separator: true },
    { label: 'Cài đặt hệ thống', icon: 'settings', route: '/admin/settings' },
    { label: 'Nhật ký kiểm toán', icon: 'file-text', route: '/admin/logs' }
  ];

  // ORG_ADMIN navigation — operations only, no system section
  private readonly orgAdminNavItems: NavigationItem[] = [
    { label: 'Trang chủ', icon: 'home', route: '/admin/dashboard' },
    {
      label: 'Người dùng', icon: 'users', route: '/admin/users', isExpanded: false,
      children: [
        { label: 'Giảng viên', icon: 'briefcase', route: '/admin/users/teachers' },
        { label: 'Học viên', icon: 'graduation-cap', route: '/admin/users/students' }
      ]
    },
    { label: 'Khóa học', icon: 'courses', route: '/admin/courses' },
    { label: 'Danh mục', icon: 'tag', route: '/admin/categories' },
    { label: 'Tổ chức', icon: 'briefcase', route: '/admin/organizations' },
    { label: 'Phân tích', icon: 'bar-chart', route: '/admin/analytics' },
    { label: 'Rút tiền', icon: 'briefcase', route: '/admin/payouts' }
  ];

  navigationItems = signal<NavigationItem[]>(
    this.authService.userRole() === 'admin' ? this.adminNavItems : this.orgAdminNavItems
  );

  toggleSubmenu(item: NavigationItem): void {
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

  logout(): void {
    this.authService.logout();
  }
}
