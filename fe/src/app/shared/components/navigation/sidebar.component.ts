import { Component, input, output, signal, computed, inject, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';

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
  group?: string;
}

export interface SidebarConfig {
  role: UserRole;
  title: string;
  subtitle?: string;
  logoIcon: IconName;
  menuItems: SidebarMenuItem[];
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
  collapsed = input(false);
  toggleCollapse = output<void>();

  getSidebarClasses(): string {
    return `sidebar-${this.config().role.toLowerCase()}`;
  }

  getLogoClasses(): string {
    return `sidebar-logo-${this.config().role.toLowerCase()}`;
  }

  shouldShowGroupTitle(index: number): boolean {
    const items = this.config().menuItems;
    const item = items[index];
    if (!item.group) return false;
    if (index === 0) return true;
    return item.group !== items[index - 1].group;
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
