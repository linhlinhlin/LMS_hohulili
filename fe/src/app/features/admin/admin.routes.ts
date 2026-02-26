import { Routes } from '@angular/router';
import { adminGuard, systemAdminGuard } from '../../core/guards/role.guard';

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

      // User Management Routes - Tách theo vai trò
      {
        path: 'users',
        children: [
          {
            path: '',
            redirectTo: 'all',
            pathMatch: 'full'
          },
          {
            path: 'all',
            loadComponent: () => import('./presentation/components/user-management/user-management-refactored.component').then(m => m.UserManagementRefactoredComponent),
            title: 'Tất cả người dùng'
          },
          {
            path: 'admins',
            loadComponent: () => import('./presentation/components/admin-user-management.component').then(m => m.AdminUserManagementComponent),
            title: 'Quản lý Quản trị viên'
          },
          {
            path: 'teachers',
            loadComponent: () => import('./presentation/components/teacher-management.component').then(m => m.TeacherManagementComponent),
            title: 'Quản lý Giảng viên'
          },
          {
            path: 'students',
            loadComponent: () => import('./presentation/components/student-management.component').then(m => m.StudentManagementComponent),
            title: 'Quản lý Học viên'
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
          },
          {
            path: ':courseId/preview',
            loadComponent: () => import('./presentation/components/course-content-preview.component').then(m => m.CourseContentPreviewComponent),
            title: 'Xem trước nội dung khóa học'
          }
        ]
      },

      // Analytics Routes
      {
        path: 'analytics',
        loadComponent: () => import('./presentation/components/admin-analytics.component').then(m => m.AdminAnalyticsComponent),
        title: 'Phân tích hệ thống'
      },

      // Settings Routes - SYSTEM_ADMIN only
      {
        path: 'settings',
        loadComponent: () => import('./presentation/components/system-settings.component').then(m => m.SystemSettingsComponent),
        canActivate: [systemAdminGuard],
        title: 'Cài đặt hệ thống'
      },

      // Audit Logs Routes - SYSTEM_ADMIN only
      {
        path: 'logs',
        loadComponent: () => import('./presentation/components/audit-logs.component').then(m => m.AuditLogsComponent),
        canActivate: [systemAdminGuard],
        title: 'Nhật ký kiểm toán'
      },

      // AI Chat - Trợ lý AI Hàng Hải
      {
        path: 'ai-chat',
        loadChildren: () => import('../ai-chat/ai-chat.routes').then(m => m.AI_CHAT_ROUTES),
        title: 'Trợ lý AI Hàng Hải'
      }
    ]
  }
];
