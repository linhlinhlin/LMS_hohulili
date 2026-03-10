import { Routes } from '@angular/router';
import { teacherGuard } from '../../../core/guards/role.guard';

// Routes inside the teacher layout (with sidebar)
export const quizRoutes: Routes = [
  {
    path: 'quiz',
    children: [
      {
        path: '',
        redirectTo: 'quiz-bank',
        pathMatch: 'full'
      },
      {
        path: 'quiz-bank',
        loadComponent: () => import('./quiz-bank.component').then(m => m.QuizBankComponent),
        canActivate: [teacherGuard],
        title: 'Ngân hàng câu hỏi'
      },
      {
        path: 'create',
        loadComponent: () => import('./quiz-create.component').then(m => m.QuizCreateComponent),
        canActivate: [teacherGuard],
        title: 'Tạo quiz mới'
      },
      {
        path: 'create/lesson/:lessonId',
        loadComponent: () => import('./containers/lesson-quiz-create/lesson-quiz-create.component')
          .then(m => m.LessonQuizCreateComponent),
        canActivate: [teacherGuard],
        title: 'Tạo quiz cho bài học'
      },
      {
        path: 'create/chapter/:chapterId',
        loadComponent: () => import('./containers/lesson-quiz-create/lesson-quiz-create.component')
          .then(m => m.LessonQuizCreateComponent),
        canActivate: [teacherGuard],
        title: 'Tạo quiz cho chương'
      },
      {
        path: 'create/section/:sectionId',
        loadComponent: () => import('./containers/lesson-quiz-create/lesson-quiz-create.component')
          .then(m => m.LessonQuizCreateComponent),
        canActivate: [teacherGuard],
        title: 'Tạo quiz cho chương (legacy)'
      },
      {
        path: 'create/assignment/:courseId',
        loadComponent: () => import('./containers/assignment-quiz-create/assignment-quiz-create.component')
          .then(m => m.AssignmentQuizCreateComponent),
        canActivate: [teacherGuard],
        title: 'Tạo bài tập'
      },
      {
        path: ':quizId/essay-grading',
        loadComponent: () => import('./quiz-essay-grading.component').then(m => m.QuizEssayGradingComponent),
        canActivate: [teacherGuard],
        title: 'Chấm điểm tự luận'
      },
      {
        path: ':quizId/edit',
        loadComponent: () => import('./quiz-edit.component').then(m => m.QuizEditComponent),
        canActivate: [teacherGuard],
        canDeactivate: [(component: any) => component.canDeactivate?.() ?? true],
        title: 'Chỉnh sửa quiz'
      },
      {
        path: 'question/create',
        loadComponent: () => import('./question-create.component').then(m => m.QuestionCreateComponent),
        canActivate: [teacherGuard],
        title: 'Tạo câu hỏi mới'
      },
      {
        path: 'question/:questionId/edit',
        loadComponent: () => import('./question-edit.component').then(m => m.QuestionEditComponent),
        canActivate: [teacherGuard],
        title: 'Chỉnh sửa câu hỏi'
      }
    ]
  }
];

// Standalone routes without the teacher sidebar
export const quizStandaloneRoutes: Routes = [
  {
    path: 'quiz/preview/:quizId',
    loadComponent: () => import('./quiz-preview.component').then(m => m.QuizPreviewComponent),
    canActivate: [teacherGuard],
    title: 'Xem trước bài kiểm tra'
  }
];
