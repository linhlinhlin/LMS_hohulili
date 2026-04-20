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
        title: 'Tong quan to chuc'
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
            title: 'Giang vien cua to chuc'
          },
          {
            path: 'students',
            loadComponent: () => import('../admin/presentation/components/student-management.component').then(m => m.StudentManagementComponent),
            title: 'Hoc vien cua to chuc'
          }
        ]
      },
      {
        path: 'courses',
        children: [
          {
            path: '',
            loadComponent: () => import('../admin/presentation/components/course-management.component').then(m => m.CourseManagementComponent),
            title: 'Khoa hoc cua to chuc'
          },
          {
            path: 'review',
            loadComponent: () => import('../admin/presentation/components/course-review.component').then(m => m.CourseReviewComponent),
            title: 'Hang doi duyet khoa hoc'
          },
          {
            path: ':courseId/preview',
            loadComponent: () => import('../admin/presentation/components/course-content-preview.component').then(m => m.CourseContentPreviewComponent),
            title: 'Xem truoc noi dung khoa hoc'
          }
        ]
      },
      {
        path: 'analytics',
        loadComponent: () => import('../admin/presentation/components/admin-analytics.component').then(m => m.AdminAnalyticsComponent),
        title: 'Phan tich to chuc'
      },
      {
        path: 'organization',
        loadComponent: () => import('../admin/presentation/components/organization-detail.component').then(m => m.OrganizationDetailComponent),
        title: 'To chuc cua toi'
      }
    ]
  }
];
