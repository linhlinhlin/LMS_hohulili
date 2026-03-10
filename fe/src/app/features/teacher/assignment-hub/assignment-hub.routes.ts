import { Routes } from '@angular/router';

/**
 * Assignment Hub Routes
 * 
 * Unified routing for Assignment-Grading Hub following expert recommendations.
 * Clean RESTful URL structure with lazy loading.
 * 
 * Routes:
 * - /assignments (list)
 * - /assignments/create
 * - /assignments/:id (redirect to overview)
 * - /assignments/:id/overview
 * - /assignments/:id/submissions
 * - /assignments/:id/settings
 * - /assignments/:id/rubric
 * - /assignments/:id/audit-log
 * - /assignments/:id/grade/:submissionId (SpeedGrader)
 * - /assignments/rubrics (Rubric Library)
 */
export const assignmentHubRoutes: Routes = [
  // Default redirect
  {
    path: '',
    redirectTo: 'assignments',
    pathMatch: 'full'
  },

  // 1.1 Bài tập tự luận (Assignments)
  {
    path: 'assignments',
    loadComponent: () => import('./components/assignment-list.component').then(m => m.AssignmentListComponent),
    title: 'Bài tập tự luận'
  },

  // 1.2 Thư viện Rubric (Rubrics)
  {
    path: 'rubrics',
    loadComponent: () => import('../grading/rubric-manager.component').then(m => m.RubricManagerComponent),
    title: 'Thư viện Rubric'
  },

  // 1.3 Ngân hàng câu hỏi (Question Bank)
  // Reusing existing QuizBankComponent
  {
    path: 'question-bank',
    loadComponent: () => import('../quiz/quiz-bank.component').then(m => m.QuizBankComponent),
    title: 'Ngân hàng câu hỏi'
  },

  // 1.4 Bài tập trắc nghiệm (Quizzes - New Aggregated View)
  {
    path: 'quizzes',
    loadComponent: () => import('./components/quiz-list.component').then(m => m.QuizListComponent),
    title: 'Bài tập trắc nghiệm'
  },

  // =========================================================
  // ACTIONS & DETAILS
  // =========================================================

  // Create Assignment
  {
    path: 'assignments/create',
    loadComponent: () => import('../assignments/assignment-creation.component').then(m => m.AssignmentCreationComponent),
    title: 'Tạo bài tập mới'
  },

  // Create Quiz (Redirect to Quiz Creation Wizard if needed, or keep here)
  {
    path: 'quizzes/create',
    loadComponent: () => import('../quiz/quiz-create.component').then(m => m.QuizCreateComponent),
    title: 'Tạo bài trắc nghiệm'
  },

  // Rubric Actions
  {
    path: 'rubrics/create',
    loadComponent: () => import('../grading/rubric-creator.component').then(m => m.RubricCreatorComponent),
    title: 'Tạo Rubric mới'
  },
  {
    path: 'rubrics/edit/:rubricId',
    loadComponent: () => import('../grading/rubric-editor.component').then(m => m.RubricEditorComponent),
    title: 'Chỉnh sửa Rubric'
  },

  // Assignment Detail with Tabs
  {
    path: 'assignments/:id',
    loadComponent: () => import('./components/assignment-detail-layout.component').then(m => m.AssignmentDetailLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'overview',
        pathMatch: 'full'
      },
      {
        path: 'overview',
        loadComponent: () => import('./components/assignment-overview.component').then(m => m.AssignmentOverviewComponent),
        title: 'Tổng quan bài tập'
      },
      {
        path: 'submissions',
        loadComponent: () => import('./components/submission-list.component').then(m => m.SubmissionListComponent),
        title: 'Danh sách bài nộp'
      },
      {
        path: 'settings',
        loadComponent: () => import('../assignments/assignment-editor.component').then(m => m.AssignmentEditorComponent),
        canDeactivate: [(component: any) => component.canDeactivate?.() ?? true],
        title: 'Cài đặt bài tập'
      },
      {
        path: 'rubric',
        loadComponent: () => import('./components/assignment-rubric.component').then(m => m.AssignmentRubricComponent),
        title: 'Rubric bài tập'
      },
      {
        path: 'audit-log',
        loadComponent: () => import('./components/assignment-audit-log.component').then(m => m.AssignmentAuditLogComponent),
        title: 'Lịch sử thao tác'
      }
    ]
  },

  // SpeedGrader
  {
    path: 'assignments/:id/grade/:submissionId',
    loadComponent: () => import('./components/speed-grader.component').then(m => m.SpeedGraderComponent),
    title: 'Chấm điểm'
  },

  // Legacy redirects
  {
    path: ':id/edit', // Old pattern
    redirectTo: 'assignments/:id/settings',
    pathMatch: 'full'
  }
];
