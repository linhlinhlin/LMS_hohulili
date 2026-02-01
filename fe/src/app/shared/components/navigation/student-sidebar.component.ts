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
      icon: '🏠',
      route: '/student/dashboard',
      isActive: false
    },
    {
      label: 'Khóa học của tôi',
      icon: '📚',
      route: '/student/courses',
      isActive: false
    },
    {
      label: 'Bài tập của tôi',
      icon: '📋',
      route: '/student/assignments',
      badge: '3',
      isActive: false
    },
    {
      label: 'Tin nhắn',
      icon: '💬',
      route: '/student/messages',
      isActive: false
    },
    {
      label: 'Phân tích',
      icon: '📊',
      route: '/student/analytics',
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
