import { Routes } from '@angular/router';
import { orgAdminPortalGuard } from '../../core/guards/role.guard';

export const orgAdminRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('../admin/presentation/components/admin-layout-simple.component').then(m => m.AdminLayoutSimpleComponent),
    canActivate: [orgAdminPortalGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('../admin/presentation/components/admin.component').then(m => m.AdminComponent),
        title: 'Tổng quan tổ chức'
      },
      {
        path: 'users',
        children: [
          {
            path: '',
            redirectTo: 'teachers',
            pathMatch: 'full'
          },
          {
            path: 'teachers',
            loadComponent: () => import('../admin/presentation/components/teacher-management.component').then(m => m.TeacherManagementComponent),
            title: 'Giảng viên của tổ chức'
          },
          {
            path: 'students',
            loadComponent: () => import('../admin/presentation/components/student-management.component').then(m => m.StudentManagementComponent),
            title: 'Học viên của tổ chức'
          }
        ]
      },
      {
        path: 'courses',
        children: [
          {
            // pathMatch 'full' required — without it, this empty-path child
            // captures any URL under /courses/* via prefix match, silently
            // shadowing the sibling 'review' and ':courseId/preview' routes.
            // Issue #74.
            path: '',
            pathMatch: 'full',
            loadComponent: () => import('../admin/presentation/components/course-management.component').then(m => m.CourseManagementComponent),
            title: 'Khóa học của tổ chức'
          },
          {
            path: 'review',
            loadComponent: () => import('../admin/presentation/components/course-review.component').then(m => m.CourseReviewComponent),
            title: 'Hàng đợi duyệt khóa học'
          },
          {
            path: ':courseId/preview',
            loadComponent: () => import('../admin/presentation/components/course-content-preview.component').then(m => m.CourseContentPreviewComponent),
            title: 'Xem trước nội dung khóa học'
          }
        ]
      },
      {
        path: 'analytics',
        loadComponent: () => import('../admin/presentation/components/admin-analytics.component').then(m => m.AdminAnalyticsComponent),
        title: 'Phân tích tổ chức'
      },
      {
        path: 'organization',
        loadComponent: () => import('../admin/presentation/components/organization-detail.component').then(m => m.OrganizationDetailComponent),
        title: 'Tổ chức của tôi'
      },

      // Profile — reuse shared profile component
      {
        path: 'profile',
        loadComponent: () => import('../profile/student-profile.component').then(m => m.StudentProfileComponent),
        title: 'Hồ sơ cá nhân'
      },
    ]
  }
];
