import { Routes } from '@angular/router';
import { teacherGuard } from '../../core/guards/role.guard';
import { quizRoutes } from './quiz/quiz.routes';

/**
 * Teacher Routes Configuration
 * 
 * Cấu trúc routing đơn giản và chuyên nghiệp cho Teacher features
 * - Flat structure để dễ maintain
 * - Consistent naming conventions
 * - Clear hierarchy và organization
 * - Proper lazy loading cho performance
 */
export const teacherRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./shared/teacher-layout-simple.component').then(m => m.TeacherLayoutSimpleComponent),
    canActivate: [teacherGuard],
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
        title: 'Tạo khóa học mới'
      },
      {
        path: 'courses/:id/edit',
        loadComponent: () => import('./courses/course-editor.component').then(m => m.CourseEditorComponent),
        title: 'Chỉnh sửa khóa học'
      },
      {
        path: 'courses/:id/sections',
        loadComponent: () => import('./courses/section-list.component').then(m => m.SectionListComponent),
        title: 'Danh sách chương'
      },
      {
        path: 'courses/:id/sections/:sectionId',
        loadComponent: () => import('./courses/section-editor.component').then(m => m.SectionEditorComponent),
        title: 'Chỉnh sửa chương'
      },
      
      // Assignment Management Routes
      {
        path: 'assignments',
        loadComponent: () => import('./assignments/assignment-management.component').then(m => m.AssignmentManagementComponent),
        title: 'Quản lý bài tập'
      },
      {
        path: 'assignment-creation',
        loadComponent: () => import('./assignments/assignment-creation.component').then(m => m.AssignmentCreationComponent),
        title: 'Tạo bài tập mới'
      },
      {
        path: 'assignments/:id/edit',
        loadComponent: () => import('./assignments/assignment-editor.component').then(m => m.AssignmentEditorComponent),
        title: 'Chỉnh sửa bài tập'
      },
      {
        path: 'assignments/:id/submissions',
        loadComponent: () => import('./assignments/assignment-submissions.component').then(m => m.AssignmentSubmissionsComponent),
        title: 'Bài nộp của học viên'
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
      
      // Grading System Routes
      {
        path: 'grading',
        loadComponent: () => import('./grading/advanced-grading-system.component').then(m => m.AdvancedGradingSystemComponent),
        title: 'Hệ thống chấm điểm'
      },
      {
        path: 'grading/:id',
        loadComponent: () => import('./grading/assignment-grader.component').then(m => m.AssignmentGraderComponent),
        title: 'Chấm điểm bài tập'
      },
      {
        path: 'rubrics',
        loadComponent: () => import('./grading/rubric-manager.component').then(m => m.RubricManagerComponent),
        title: 'Quản lý Rubric'
      },
      {
        path: 'rubrics/create',
        loadComponent: () => import('./grading/rubric-creator.component').then(m => m.RubricCreatorComponent),
        title: 'Tạo Rubric mới'
      },
      {
        path: 'rubrics/:id/edit',
        loadComponent: () => import('./grading/rubric-editor.component').then(m => m.RubricEditorComponent),
        title: 'Chỉnh sửa Rubric'
      },
      
      // Notifications Routes
      {
        path: 'notifications',
        loadComponent: () => import('./notifications/teacher-notifications.component').then(m => m.TeacherNotificationsComponent),
        title: 'Thông báo'
      }
    ]
  }
];