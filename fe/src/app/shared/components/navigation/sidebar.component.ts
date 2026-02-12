import { Component, input, signal, computed, inject, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';

import { RouterModule, Router, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../shared/types/user.types';
import { IconComponent, IconName } from '../icon/icon.component';

export interface SidebarMenuItem {
  label: string;
  route: string;
  icon: IconName;
  badge?: string | number;
  children?: SidebarMenuItem[];
  exact?: boolean;
}

export interface SidebarConfig {
  role: UserRole;
  title: string;
  subtitle?: string;
  logoIcon: IconName;
  menuItems: SidebarMenuItem[];
  showProgress?: boolean;
  progressValue?: number;
  progressLabel?: string;
  collapsible?: boolean;
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterModule, RouterLinkActive, IconComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
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
    if (progress >= 60) return 'text-[#0056D2]';
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
        return `${baseClasses} text-[#0056D2]`;
      case 'teacher':
        return `${baseClasses} text-[#0056D2]`;
      case 'admin':
        return `${baseClasses} text-[#0056D2]`;
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
