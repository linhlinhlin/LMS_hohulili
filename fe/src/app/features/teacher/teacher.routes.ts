import { Routes } from '@angular/router';
import { teacherGuard, teacherOnlyGuard } from '../../core/guards/role.guard';
import { quizRoutes, quizStandaloneRoutes } from './quiz/quiz.routes';

/**
 * Teacher Routes Configuration
 * 
 * Cấu trúc routing đơn giản và chuyên nghiệp cho Teacher features
 * - Flat structure để dễ maintain
 * - Consistent naming conventions
 * - Clear hierarchy và organization
 * - Proper lazy loading cho performance
 * 
 * REFACTORED: Hợp nhất courses và course-editor
 * - /teacher/courses → Danh sách khóa học
 * - /teacher/course-creation → Tạo khóa học mới
 * - /teacher/courses/:id/editor/* → Chỉnh sửa khóa học (course-editor)
 */
export const teacherRoutes: Routes = [
  // Standalone routes (không có sidebar) - phải đặt TRƯỚC layout routes
  ...quizStandaloneRoutes,

  // Course Editor - Standalone Layout (không có teacher sidebar)
  {
    path: 'courses/:id/editor',
    loadChildren: () => import('./course-editor/course-editor.routes').then(m => m.courseEditorRoutes),
    canActivate: [teacherGuard],
    title: 'Chỉnh sửa khóa học'
  },

  // Section Editor - Standalone (quản lý bài học trong chương)
  {
    path: 'courses/:courseId/sections/:sectionId',
    loadComponent: () => import('./courses/section-editor/legacy-section-editor-redirect.component').then(m => m.LegacySectionEditorRedirectComponent),
    canActivate: [teacherGuard],
    title: 'Quản lý bài học'
  },

  // Layout routes (có sidebar) - ONLY for Teachers, Admin blocked
  {
    path: '',
    loadComponent: () => import('./shared/teacher-layout-simple.component').then(m => m.TeacherLayoutSimpleComponent),
    canActivate: [teacherOnlyGuard],
    children: [
      // Default redirect to dashboard
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },

      // Dashboard - Trang chủ giảng viên
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/teacher-dashboard.component').then(m => m.TeacherDashboardComponent),
        title: 'Dashboard - Giảng viên'
      },

      // Course Management Routes
      {
        path: 'courses',
        loadComponent: () => import('./courses/course-management.component').then(m => m.CourseManagementComponent),
        title: 'Quản lý khóa học'
      },
      {
        path: 'course-creation',
        loadComponent: () => import('./courses/course-creation.component').then(m => m.CourseCreationComponent),
        title: 'Tạo khóa học mới',
        canDeactivate: [(component: any) => component.canDeactivate()]
      },

      // Assignment Hub Routes (Unified Assignment + Grading)
      {
        path: 'assessments',
        loadChildren: () => import('./assignment-hub/assignment-hub.routes').then(m => m.assignmentHubRoutes)
      },
      {
        path: 'assignments',
        redirectTo: 'assessments/classes/assignments',
        pathMatch: 'full'
      },

      // Legacy routes (backward compatibility)
      {
        path: 'assignment-creation',
        redirectTo: 'assessments/classes/assignments/create',
        pathMatch: 'full'
      },
      {
        path: 'courses/:courseId/sections/:sectionId/assignments/:assignmentId/submissions',
        loadComponent: () => import('./assignments/assignment-submissions.component').then(m => m.AssignmentSubmissionsComponent),
        title: 'Bài nộp của học viên'
      },

      // Student Management Routes
      {
        path: 'students',
        loadComponent: () => import('./students/student-management.component').then(m => m.StudentManagementComponent),
        title: 'Quản lý học viên'
      },
      {
        path: 'classes/:classId/students',
        loadComponent: () => import('./course-editor/pages/course-classes/class-students/class-students.component').then(m => m.ClassStudentsComponent),
        title: 'Danh sách học viên'
      },
      {
        path: 'students/:id',
        loadComponent: () => import('./students/student-detail.component').then(m => m.StudentDetailComponent),
        title: 'Chi tiết học viên'
      },

      // Quiz Management Routes
      ...quizRoutes,


      // Analytics Routes
      {
        path: 'analytics',
        loadComponent: () => import('./analytics/teacher-analytics.component').then(m => m.TeacherAnalyticsComponent),
        title: 'Phân tích giảng dạy'
      },

      // Revenue Routes
      {
        path: 'revenue',
        loadComponent: () => import('./revenue/teacher-revenue-dashboard.component').then(m => m.TeacherRevenueDashboardComponent),
        title: 'Doanh thu'
      },
      {
        path: 'revenue/payouts',
        loadComponent: () => import('./revenue/teacher-payout-history.component').then(m => m.TeacherPayoutHistoryComponent),
        title: 'Lịch sử rút tiền'
      },
      {
        path: 'revenue/bank-accounts',
        loadComponent: () => import('./revenue/teacher-bank-accounts.component').then(m => m.TeacherBankAccountsComponent),
        title: 'Tài khoản ngân hàng'
      },

      // Invitations Route
      {
        path: 'invitations',
        loadComponent: () => import('./dashboard/my-invitations.component').then(m => m.MyInvitationsComponent),
        title: 'Lời mời tham gia'
      },

      // Grading Routes (redirect to unified Assignment Hub)
      {
        path: 'grading',
        redirectTo: 'assessments/classes/assignments',
        pathMatch: 'full'
      },
      {
        path: 'grading/speed-grader/:assignmentId',
        redirectTo: 'assignments/:assignmentId/submissions',
        pathMatch: 'full'
      },
      {
        path: 'grading/speed-grader/:assignmentId/:submissionId',
        redirectTo: 'assignments/:assignmentId/grade/:submissionId',
        pathMatch: 'full'
      },
      {
        path: 'grading/rubrics',
        redirectTo: 'assessments/shared/rubrics',
        pathMatch: 'full'
      },
      {
        path: 'rubrics',
        redirectTo: 'assessments/shared/rubrics',
        pathMatch: 'full'
      },

      // Sprint 220b: ai-chat full-page route removed — AI chat is now an iframe widget
    ]
  }
];
