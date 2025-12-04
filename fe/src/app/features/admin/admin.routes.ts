import { Routes } from '@angular/router';
import { adminGuard } from '../../core/guards/role.guard';

/**
 * Admin Routes Configuration
 * 
 * Cấu trúc routing đơn giản và chuyên nghiệp cho Admin features
 * - Flat structure để dễ maintain
 * - Consistent naming conventions
 * - Clear hierarchy và organization
 * - Proper lazy loading cho performance
 */
export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./presentation/components/admin-layout-simple.component').then(m => m.AdminLayoutSimpleComponent),
    canActivate: [adminGuard],
    children: [
      // Default redirect to dashboard
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },

      // Dashboard - Trang chủ quản trị
      {
        path: 'dashboard',
        loadComponent: () => import('./presentation/components/admin.component').then(m => m.AdminComponent),
        title: 'Dashboard - Quản trị'
      },

      // User Management Routes
      {
        path: 'users',
        children: [
          {
            path: '',
            loadComponent: () => import('./presentation/components/user-management.component').then(m => m.UserManagementComponent),
            title: 'Quản lý người dùng'
          }
        ]
      },

      // Course Management Routes
      {
        path: 'courses',
        children: [
          {
            path: '',
            loadComponent: () => import('./presentation/components/course-management.component').then(m => m.CourseManagementComponent),
            title: 'Quản lý khóa học'
          },
          {
            path: 'review',
            loadComponent: () => import('./presentation/components/course-review.component').then(m => m.CourseReviewComponent),
            title: 'Duyệt khóa học'
          }
        ]
      },

      // Analytics Routes
      {
        path: 'analytics',
        loadComponent: () => import('./presentation/components/admin-analytics.component').then(m => m.AdminAnalyticsComponent),
        title: 'Phân tích hệ thống'
      },

      // Settings Routes
      {
        path: 'settings',
        loadComponent: () => import('./presentation/components/system-settings.component').then(m => m.SystemSettingsComponent),
        title: 'Cài đặt hệ thống'
      },

      // Reports Routes
      {
        path: 'reports',
        loadComponent: () => import('./presentation/components/admin-analytics.component').then(m => m.AdminAnalyticsComponent),
        title: 'Báo cáo hệ thống'
      },

      // Notifications Routes
      {
        path: 'notifications',
        loadComponent: () => import('./presentation/components/admin-analytics.component').then(m => m.AdminAnalyticsComponent),
        title: 'Thông báo'
      },

      // Logs Routes
      {
        path: 'logs',
        loadComponent: () => import('./presentation/components/admin-analytics.component').then(m => m.AdminAnalyticsComponent),
        title: 'Nhật ký hệ thống'
      },

      // AI Chat - Trợ lý AI Hàng Hải
      {
        path: 'ai-chat',
        loadChildren: () => import('../ai-chat/ai-chat.routes').then(m => m.AI_CHAT_ROUTES),
        title: 'Trợ lý AI Hàng Hải'
      },

      // AI Knowledge Management - Quản lý Tri thức AI
      {
        path: 'ai-knowledge',
        loadComponent: () => import('./ai-knowledge/ai-knowledge-page.component').then(m => m.AiKnowledgePageComponent),
        title: 'Quản lý Tri thức AI'
      }
    ]
  }
];