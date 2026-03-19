import { Routes } from '@angular/router';

export const assignmentHubRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/assessments-shell.component').then(m => m.AssessmentsShellComponent),
    children: [
      {
        path: '',
        redirectTo: 'classes/assignments',
        pathMatch: 'full'
      },

      {
        path: 'courses',
        redirectTo: '/teacher/assessments/classes/assignments',
        pathMatch: 'full'
      },
      {
        path: 'courses/overview',
        redirectTo: '/teacher/assessments/classes/assignments',
        pathMatch: 'full'
      },

      {
        path: 'classes',
        children: [
          {
            path: '',
            redirectTo: 'assignments',
            pathMatch: 'full'
          },
          {
            path: 'assignments',
            loadComponent: () => import('./components/assignment-list.component').then(m => m.AssignmentListComponent),
            title: 'Vận hành bài tập'
          },
          {
            path: 'assignments/create',
            loadComponent: () => import('../assignments/assignment-creation.component').then(m => m.AssignmentCreationComponent),
            title: 'Tạo bài tập'
          },
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
                title: 'Bài nộp'
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
          {
            path: 'assignments/:id/grade/:submissionId',
            loadComponent: () => import('./components/speed-grader.component').then(m => m.SpeedGraderComponent),
            title: 'Chấm điểm'
          },
          {
            path: 'quizzes',
            loadComponent: () => import('./components/quiz-list.component').then(m => m.QuizListComponent),
            title: 'Vận hành bài kiểm tra'
          },
          {
            path: 'quizzes/create',
            loadComponent: () => import('./components/quiz-create-launcher.component').then(m => m.QuizCreateLauncherComponent),
            title: 'Chọn khóa học để tạo bài kiểm tra'
          },
          {
            path: 'quizzes/create/:courseId',
            loadComponent: () => import('../quiz/containers/assignment-quiz-create/assignment-quiz-create.component').then(m => m.AssignmentQuizCreateComponent),
            title: 'Tạo bài kiểm tra theo ngữ cảnh vận hành'
          },
          {
            path: 'quizzes/:quizId/editor',
            loadComponent: () => import('../quiz/quiz-edit.component').then(m => m.QuizEditComponent),
            canDeactivate: [(component: any) => component.canDeactivate?.() ?? true],
            title: 'Chỉnh sửa bài kiểm tra'
          },
          {
            path: 'quizzes/:quizId/essay-grading',
            loadComponent: () => import('../quiz/quiz-essay-grading.component').then(m => m.QuizEssayGradingComponent),
            title: 'Chấm tự luận'
          }
        ]
      },

      {
        path: 'shared',
        children: [
          {
            path: '',
            redirectTo: 'question-bank',
            pathMatch: 'full'
          },
          {
            path: 'question-bank',
            loadComponent: () => import('../quiz/quiz-bank.component').then(m => m.QuizBankComponent),
            title: 'Ngân hàng câu hỏi'
          },
          {
            path: 'rubrics',
            loadComponent: () => import('../grading/rubric-manager.component').then(m => m.RubricManagerComponent),
            title: 'Thư viện Rubric'
          },
          {
            path: 'rubrics/create',
            loadComponent: () => import('../grading/rubric-creator.component').then(m => m.RubricCreatorComponent),
            title: 'Tạo Rubric'
          },
          {
            path: 'rubrics/edit/:rubricId',
            loadComponent: () => import('../grading/rubric-editor.component').then(m => m.RubricEditorComponent),
            title: 'Chỉnh sửa Rubric'
          }
        ]
      },

      // Legacy redirects during migration
      {
        path: 'assignments',
        redirectTo: 'classes/assignments',
        pathMatch: 'full'
      },
      {
        path: 'assignments/create',
        redirectTo: 'classes/assignments/create',
        pathMatch: 'full'
      },
      {
        path: 'assignments/:id',
        redirectTo: 'classes/assignments/:id',
        pathMatch: 'full'
      },
      {
        path: 'assignments/:id/overview',
        redirectTo: 'classes/assignments/:id/overview',
        pathMatch: 'full'
      },
      {
        path: 'assignments/:id/submissions',
        redirectTo: 'classes/assignments/:id/submissions',
        pathMatch: 'full'
      },
      {
        path: 'assignments/:id/settings',
        redirectTo: 'classes/assignments/:id/settings',
        pathMatch: 'full'
      },
      {
        path: 'assignments/:id/rubric',
        redirectTo: 'classes/assignments/:id/rubric',
        pathMatch: 'full'
      },
      {
        path: 'assignments/:id/audit-log',
        redirectTo: 'classes/assignments/:id/audit-log',
        pathMatch: 'full'
      },
      {
        path: 'assignments/:id/grade/:submissionId',
        redirectTo: 'classes/assignments/:id/grade/:submissionId',
        pathMatch: 'full'
      },
      {
        path: 'quizzes',
        redirectTo: 'classes/quizzes',
        pathMatch: 'full'
      },
      {
        path: 'quizzes/create',
        redirectTo: 'classes/quizzes/create',
        pathMatch: 'full'
      },
      {
        path: 'quizzes/:quizId',
        redirectTo: 'classes/quizzes/:quizId/editor',
        pathMatch: 'full'
      },
      {
        path: 'quizzes/:quizId/overview',
        redirectTo: 'classes/quizzes/:quizId/editor',
        pathMatch: 'full'
      },
      {
        path: 'quizzes/:quizId/editor',
        redirectTo: 'classes/quizzes/:quizId/editor',
        pathMatch: 'full'
      },
      {
        path: 'quizzes/:quizId/essay-grading',
        redirectTo: 'classes/quizzes/:quizId/essay-grading',
        pathMatch: 'full'
      },
      {
        path: 'rubrics',
        redirectTo: 'shared/rubrics',
        pathMatch: 'full'
      },
      {
        path: 'rubrics/create',
        redirectTo: 'shared/rubrics/create',
        pathMatch: 'full'
      },
      {
        path: 'rubrics/edit/:rubricId',
        redirectTo: 'shared/rubrics/edit/:rubricId',
        pathMatch: 'full'
      },
      {
        path: 'question-bank',
        redirectTo: 'shared/question-bank',
        pathMatch: 'full'
      },
      {
        path: ':id/edit',
        redirectTo: 'classes/assignments/:id/settings',
        pathMatch: 'full'
      }
    ]
  }
];
