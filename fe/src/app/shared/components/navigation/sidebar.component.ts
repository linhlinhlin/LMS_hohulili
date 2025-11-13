import { Component, input, signal, computed, inject, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../shared/types/user.types';

export interface SidebarMenuItem {
  label: string;
  route: string;
  icon: string;
  badge?: string | number;
  children?: SidebarMenuItem[];
  exact?: boolean;
}

export interface SidebarConfig {
  role: UserRole;
  title: string;
  subtitle?: string;
  logoIcon: string;
  menuItems: SidebarMenuItem[];
  showProgress?: boolean;
  progressValue?: number;
  progressLabel?: string;
  collapsible?: boolean;
}

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule, RouterLinkActive],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="sidebar-container" [class]="getSidebarClasses()">
      <!-- Header -->
      <div class="sidebar-header">
        <div class="flex items-center space-x-3">
          <!-- Logo -->
          <div class="sidebar-logo" [class]="getLogoClasses()">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="config().logoIcon"></path>
            </svg>
          </div>

          <div class="flex-1 min-w-0">
            <h2 class="sidebar-title">{{ config().title }}</h2>
            <p class="sidebar-subtitle">{{ authService.currentUser()?.fullName }}</p>
          </div>
        </div>

        <!-- Progress Card (optional) -->
        @if (config().showProgress) {
          <div class="sidebar-progress-card">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-700">{{ config().progressLabel || 'Tiến độ học tập' }}</span>
              <span class="text-sm font-bold" [class]="getProgressTextClass()">{{ config().progressValue || 0 }}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="progress-bar" [style.width.%]="config().progressValue || 0"></div>
            </div>
            <p class="text-xs text-gray-600 mt-2">{{ getProgressSubtext() }}</p>
          </div>
        }
      </div>

      <!-- Navigation Menu -->
      <nav class="sidebar-nav">
        @for (item of config().menuItems; track item.route) {
          <div class="nav-item-container">
            <a [routerLink]="item.route"
               routerLinkActive="active"
               [routerLinkActiveOptions]="{exact: item.exact ?? false}"
               class="nav-item">
              <div class="nav-icon" [class]="getIconClasses(item)">
                <svg class="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="item.icon"></path>
                </svg>
              </div>
              <span class="nav-label">{{ item.label }}</span>
              @if (item.badge) {
                <span class="nav-badge">{{ item.badge }}</span>
              }
            </a>

            <!-- Sub-menu items -->
            @if (item.children && isSubMenuOpen(item)) {
              <div class="sub-menu">
                @for (child of item.children; track child.route) {
                  <a [routerLink]="child.route"
                     routerLinkActive="active"
                     [routerLinkActiveOptions]="{exact: child.exact ?? false}"
                     class="sub-menu-item">
                    <div class="sub-icon" [class]="getIconClasses(child)">
                      <svg class="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="child.icon"></path>
                      </svg>
                    </div>
                    {{ child.label }}
                  </a>
                }
              </div>
            }
          </div>
        }
      </nav>

      <!-- Footer -->
      <div class="sidebar-footer">
        <button (click)="logout()" class="logout-btn">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
          </svg>
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    /* Component-specific styles - avoiding Tailwind @apply conflicts */
    .sidebar-container {
      background: white;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      height: 100vh;
      display: flex;
      flex-direction: column;
      border-right: 1px solid rgba(229, 231, 235, 0.5);
    }

    .sidebar-header {
      padding: 1.5rem;
      background: white;
      border-bottom: 1px solid rgba(229, 231, 235, 0.5);
    }

    .sidebar-logo {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
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

    .sidebar-progress-card {
      margin-top: 1rem;
      padding: 1rem;
      background: linear-gradient(to right, #eff6ff, #e0e7ff);
      border-radius: 0.5rem;
      border: 1px solid #bfdbfe;
    }

    .progress-bar {
      background: linear-gradient(to right, #3b82f6, #6366f1);
      height: 0.5rem;
      border-radius: 9999px;
      transition: all 0.5s;
    }

    .sidebar-nav {
      flex: 1;
      padding: 1rem 0.75rem;
      overflow-y: auto;
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
    }

    .nav-item:hover {
      background-color: #f9fafb;
    }

    .nav-item.active {
      background-color: #eff6ff;
      color: #1d4ed8;
      border-right: 2px solid #3b82f6;
    }

    .nav-icon {
      width: 1.25rem;
      height: 1.25rem;
      margin-right: 0.75rem;
      color: #9ca3af;
      transition: transform 0.2s;
    }

    .nav-item:hover .nav-icon {
      transform: scale(1.1);
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
    }

    .sub-menu-item:hover {
      background-color: #f3f4f6;
      color: #111827;
    }

    .sub-icon {
      width: 1rem;
      height: 1rem;
      margin-right: 0.5rem;
      color: #9ca3af;
    }

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
    }

    .logout-btn:hover {
      background-color: #fef2f2;
    }

    .logout-btn svg {
      margin-right: 0.75rem;
    }

    .logout-btn span {
      font-weight: 500;
      font-size: 0.875rem;
    }

    /* Role-specific color schemes */
    .sidebar-student .sidebar-logo {
      background: linear-gradient(to bottom right, #2563eb, #4f46e5);
    }

    .sidebar-student .nav-item.active {
      background-color: #eff6ff;
      color: #1d4ed8;
      border-right: 2px solid #3b82f6;
    }

    .sidebar-teacher .sidebar-logo {
      background: linear-gradient(to bottom right, #9333ea, #7c3aed);
    }

    .sidebar-teacher .nav-item.active {
      background-color: #faf5ff;
      color: #7c3aed;
      border-right: 2px solid #9333ea;
    }

    .sidebar-admin .sidebar-logo {
      background: linear-gradient(to bottom right, #dc2626, #b91c1c);
    }

    .sidebar-admin .nav-item.active {
      background-color: #fef2f2;
      color: #b91c1c;
      border-right: 2px solid #dc2626;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  protected authService = inject(AuthService);
  private router = inject(Router);

  config = input.required<SidebarConfig>();

  getSidebarClasses(): string {
    return `sidebar-${this.config().role.toLowerCase()}`;
  }

  getLogoClasses(): string {
    return `sidebar-logo-${this.config().role.toLowerCase()}`;
  }

  getProgressTextClass(): string {
    const progress = this.config().progressValue || 0;
    if (progress >= 80) return 'text-green-600';
    if (progress >= 60) return 'text-blue-600';
    if (progress >= 40) return 'text-yellow-600';
    return 'text-red-600';
  }

  getProgressSubtext(): string {
    // This could be made configurable or computed from actual data
    return '3 khóa học đang học';
  }

  getIconClasses(item: SidebarMenuItem): string {
    const role = this.config().role.toLowerCase();
    const baseClasses = 'flex items-center justify-center';

    // Role-specific icon colors
    switch (role) {
      case 'student':
        return `${baseClasses} text-blue-500`;
      case 'teacher':
        return `${baseClasses} text-purple-500`;
      case 'admin':
        return `${baseClasses} text-red-500`;
      default:
        return `${baseClasses} text-gray-500`;
    }
  }

  isSubMenuOpen(item: SidebarMenuItem): boolean {
    return this.router.url.startsWith(item.route);
  }

  logout(): void {
    this.authService.logout();
  }
}