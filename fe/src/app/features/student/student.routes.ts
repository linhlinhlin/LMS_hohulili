import { Routes } from '@angular/router';
import { studentGuard } from '../../core/guards/role.guard';

/**
 * Student Routes Configuration
 * 
 * Cấu trúc routing đơn giản và chuyên nghiệp cho Student features
 * - Flat structure để dễ maintain
 * - Consistent naming conventions
 * - Clear hierarchy và organization
 * - Proper lazy loading cho performance
          {
            path: 'backend',
            loadComponent: () => import('../courses/my-courses-backend.component').then(m => m.MyCoursesBackendComponent),
            title: 'Khóa học của tôi (Backend)'
          }
 */
export const studentRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./shared/student-layout-simple.component').then(m => m.StudentLayoutSimpleComponent),
    canActivate: [studentGuard],
    children: [
      // Default redirect to dashboard
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      
      // Dashboard - Trang chủ học viên
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/enhanced-student-dashboard.component').then(m => m.EnhancedStudentDashboardComponent),
        title: 'Dashboard - Học viên'
      },
      
      // Course Management Routes
      {
        path: 'courses',
        children: [
          {
            path: '',
            loadComponent: () => import('../courses/my-courses.component').then(m => m.MyCoursesComponent),
            title: 'Khóa học của tôi'
          }
        ]
      },
      
      // Assignment Routes
      {
        path: 'assignments',
        children: [
          {
            path: '',
            loadComponent: () => import('../assignments/presentation/pages/assignment-list-page.component').then(m => m.AssignmentListPageComponent),
            title: 'Bài tập của tôi'
          },
          {
            path: ':id/work',
            loadComponent: () => import('../assignments/assignment-work.component').then(m => m.AssignmentWorkComponent),
            title: 'Làm bài tập'
          },
          {
            path: 'work/:id',
            loadComponent: () => import('../assignments/assignment-work.component').then(m => m.AssignmentWorkComponent),
            title: 'Làm bài tập'
          }
        ]
      },
      
      // Learning Routes - Nested under student
    {
      path: 'learn',
      loadChildren: () => import('../learning/learning.routes').then(m => m.learningRoutes)
    },
    {
      path: 'courses',
      children: [
        {
          path: '',
          loadComponent: () => import('../learning/components/course-selection-clean.component').then(c => c.CourseSelectionComponent),
          title: 'Chọn khóa học'
        },
        {
          path: ':courseId/lessons/:lessonId',
          loadComponent: () => import('./components/student-lesson-viewer.component').then(c => c.StudentLessonViewerComponent),
          title: 'Xem bài học'
        }
      ]
    },      // Quiz Routes
      {
        path: 'quiz',
        children: [
          {
            path: '',
            loadComponent: () => import('../learning/quiz/presentation/components/quiz-list.component').then(m => m.QuizListComponent),
            title: 'Quiz'
          },
          {
            path: 'take/:id',
            loadComponent: () => import('../learning/quiz/presentation/components/quiz-attempt.component').then(m => m.QuizAttemptComponent),
            title: 'Làm Quiz'
          },
          {
            path: 'result',
            loadComponent: () => import('../learning/quiz/presentation/components/quiz-result.component').then(m => m.QuizResultComponent),
            title: 'Kết quả Quiz'
          }
        ]
      },
      
      // Analytics Routes
      {
        path: 'analytics',
        loadComponent: () => import('../analytics/student-analytics.component').then(m => m.StudentAnalyticsComponent),
        title: 'Phân tích học tập'
      },
      
      // Profile Routes
      {
        path: 'profile',
        loadComponent: () => import('../profile/student-profile.component').then(m => m.StudentProfileComponent),
        title: 'Hồ sơ cá nhân'
      },
      
      // Forum Routes
      {
        path: 'forum',
        loadComponent: () => import('../communication/student-forum.component').then(m => m.StudentForumComponent),
        title: 'Diễn đàn'
      },
      
    ]
  }
];