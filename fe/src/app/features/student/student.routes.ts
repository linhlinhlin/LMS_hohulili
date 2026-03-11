import { Routes } from '@angular/router';
import { studentGuard } from '../../core/guards/role.guard';

/** Student Routes - hybrid course-first structure with compatibility redirects */
export const studentRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./shared/student-layout-simple.component').then(m => m.StudentLayoutSimpleComponent),
    canActivate: [studentGuard],
    children: [
      {
        path: '',
        redirectTo: 'courses',
        pathMatch: 'full'
      },

      // Canonical course-first workspace
      {
        path: 'courses',
        children: [
          {
            path: '',
            loadComponent: () => import('./dashboard/student-dashboard.component').then(m => m.StudentDashboardComponent),
            title: 'Khóa học của tôi'
          },
          {
            path: 'library',
            loadComponent: () => import('./student-my-courses.component').then(m => m.StudentMyCoursesComponent),
            title: 'Tất cả khóa học'
          },
          {
            path: ':id',
            loadComponent: () => import('./pages/course-detail.component').then(m => m.CourseDetailComponent),
            title: 'Chi tiết khóa học'
          }
        ]
      },

      // Legacy redirects
      {
        path: 'dashboard',
        redirectTo: 'courses',
        pathMatch: 'full'
      },
      {
        path: 'my-courses',
        redirectTo: 'courses/library',
        pathMatch: 'full'
      },
      {
        path: 'course/:id',
        redirectTo: 'courses/:id',
        pathMatch: 'full'
      },
      {
        path: 'lesson-viewer',
        redirectTo: 'courses',
        pathMatch: 'full'
      },

      // Cross-course task inbox
      {
        path: 'tasks',
        children: [
          {
            path: '',
            loadComponent: () => import('./assignments/student-assignments-page.component').then(m => m.StudentAssignmentsPageComponent),
            title: 'Bài cần làm'
          },
          {
            path: ':id/work',
            loadComponent: () => import('../assignments/assignment-work.component').then(m => m.AssignmentWorkComponent),
            title: 'Làm bài tập'
          }
        ]
      },

      // Legacy assignment routes
      {
        path: 'assignments',
        children: [
          {
            path: '',
            redirectTo: '/student/tasks',
            pathMatch: 'full'
          },
          {
            path: ':id/work',
            redirectTo: '/student/tasks/:id/work',
            pathMatch: 'full'
          }
        ]
      },

      // Canonical learning shell
      {
        path: 'learn',
        loadChildren: () => import('../learning/learning.routes').then(m => m.learningRoutes)
      },

      // Quiz routes remain compatibility/runtime routes, not primary navigation
      {
        path: 'quiz',
        children: [
          {
            path: '',
            loadComponent: () => import('../learning/quiz/presentation/components/quiz-list.component').then(m => m.QuizListComponent),
            title: 'Bài kiểm tra'
          },
          {
            path: 'take/:id',
            loadComponent: () => import('./quiz/student-quiz-taking.component').then(m => m.StudentQuizTakingComponent),
            title: 'Làm bài kiểm tra'
          },
          {
            path: 'result',
            loadComponent: () => import('../learning/quiz/presentation/components/quiz-result.component').then(m => m.QuizResultComponent),
            title: 'Kết quả bài kiểm tra'
          }
        ]
      },

      // Cross-course results
      {
        path: 'results',
        loadComponent: () => import('./grades/student-grades.component').then(m => m.StudentGradesComponent),
        title: 'Kết quả học tập'
      },

      // Legacy grades route
      {
        path: 'grades',
        redirectTo: 'results',
        pathMatch: 'full'
      },

      {
        path: 'payments',
        loadComponent: () => import('./pages/student-payment-history.component').then(m => m.StudentPaymentHistoryComponent),
        title: 'Lịch sử thanh toán'
      },
      {
        path: 'storage',
        loadComponent: () => import('./storage/student-storage-management.component').then(m => m.StudentStorageManagementComponent),
        title: 'Lưu trữ ngoại tuyến'
      },

      {
        path: 'certificates',
        loadComponent: () => import('./grades/student-grades.component').then(m => m.StudentGradesComponent),
        title: 'Chứng chỉ của tôi'
      },
      {
        path: 'certificate/:token',
        loadComponent: () => import('../profile/certificate-view.component').then(m => m.CertificateViewComponent),
        title: 'Xem chứng chỉ'
      },
      {
        path: 'analytics',
        loadComponent: () => import('../analytics/student-analytics.component').then(m => m.StudentAnalyticsComponent),
        title: 'Phân tích học tập'
      },
      {
        path: 'profile',
        loadComponent: () => import('../profile/student-profile.component').then(m => m.StudentProfileComponent),
        title: 'Hồ sơ cá nhân'
      },
      {
        path: 'browse',
        loadComponent: () => import('./browse/student-course-browser.component').then(m => m.StudentCourseBrowserComponent),
        title: 'Khám phá khóa học'
      },
      {
        path: 'messages',
        loadChildren: () => import('./messages/messages.routes').then(m => m.MESSAGES_ROUTES),
        title: 'Tin nhắn'
      }
    ]
  }
];
