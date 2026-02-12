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
  children?: NavigationItem[];
}

@Component({
  selector: 'app-student-sidebar',
  imports: [RouterModule, RouterLinkActive, IconComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './student-sidebar.component.html',
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
      icon: 'home',
      route: '/student/dashboard',
      isActive: false
    },
    {
      label: 'Khóa học của tôi',
      icon: 'courses',
      route: '/student/courses',
      isActive: false
    },
    {
      label: 'Bài tập của tôi',
      icon: 'blog',
      route: '/student/assignments',
      badge: '3',
      isActive: false
    },
    {
      label: 'Tin nhắn',
      icon: 'mail',
      route: '/student/messages',
      isActive: false
    },
    {
      label: 'Phân tích',
      icon: 'bar-chart',
      route: '/student/analytics',
      isActive: false
    }
  ]);

  getIconBgClass(item: NavigationItem): string {
    return 'bg-[#0056D2]/10 text-[#0056D2]';
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
