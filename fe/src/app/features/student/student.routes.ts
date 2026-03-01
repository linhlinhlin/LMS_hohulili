import { Routes } from '@angular/router';
import { studentGuard } from '../../core/guards/role.guard';

/** Student Routes — flat structure, lazy loading, consistent naming */
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
        loadComponent: () => import('./dashboard/student-dashboard.component').then(m => m.StudentDashboardComponent),
        title: 'Dashboard - Học viên'
      },

      // My Courses - Khóa học của tôi (detailed list with modules)
      {
        path: 'my-courses',
        loadComponent: () => import('./student-my-courses.component').then(m => m.StudentMyCoursesComponent),
        title: 'Khóa học của tôi'
      },

      // Course Detail - Chi tiết khóa học
      {
        path: 'course/:id',
        loadComponent: () => import('./pages/course-detail.component').then(m => m.CourseDetailComponent),
        title: 'Chi tiết khóa học'
      },

      // Lesson Viewer - redirect to my courses
      {
        path: 'lesson-viewer',
        redirectTo: 'my-courses',
        pathMatch: 'full'
      },
      
      // Payment History - Lịch sử thanh toán
      {
        path: 'payments',
        loadComponent: () => import('./pages/student-payment-history.component').then(m => m.StudentPaymentHistoryComponent),
        title: 'Lịch sử thanh toán'
      },

      // Offline Storage Management - Lưu trữ ngoại tuyến
      {
        path: 'storage',
        loadComponent: () => import('./storage/student-storage-management.component').then(m => m.StudentStorageManagementComponent),
        title: 'Lưu trữ ngoại tuyến'
      },

      // Assignment Routes - Unified page for all student assignments
      {
        path: 'assignments',
        children: [
          {
            path: '',
            loadComponent: () => import('./assignments/student-assignments-page.component').then(m => m.StudentAssignmentsPageComponent),
            title: 'Bài tập của tôi'
          },
          {
            path: ':id/work',
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
      // Quiz Routes
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
            loadComponent: () => import('./quiz/student-quiz-taking.component').then(m => m.StudentQuizTakingComponent),
            title: 'Làm Quiz'
          },
          {
            path: 'result',
            loadComponent: () => import('../learning/quiz/presentation/components/quiz-result.component').then(m => m.QuizResultComponent),
            title: 'Kết quả Quiz'
          }
        ]
      },

      // Grades - Bảng điểm
      {
        path: 'grades',
        loadComponent: () => import('./grades/student-grades.component').then(m => m.StudentGradesComponent),
        title: 'Bảng điểm'
      },

      // Certificates
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

      // Browse Courses - Khám phá khóa học
      {
        path: 'browse',
        loadComponent: () => import('./browse/student-course-browser.component').then(m => m.StudentCourseBrowserComponent),
        title: 'Khám phá khóa học'
      },

      // Messages Routes - Tin nhắn với giảng viên
      {
        path: 'messages',
        loadChildren: () => import('./messages/messages.routes').then(m => m.MESSAGES_ROUTES),
        title: 'Tin nhắn'
      },

      // Sprint 220b: ai-chat full-page route removed — AI chat is now an iframe widget
    ]
  }
];
