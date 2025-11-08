import { Routes } from '@angular/router';
import { teacherGuard } from '../../../core/guards/role.guard';

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
        title: 'Quiz Bank - Quản lý ngân hàng câu hỏi'
      },
      {
        path: 'create',
        loadComponent: () => import('./quiz-create.component').then(m => m.QuizCreateComponent),
        canActivate: [teacherGuard],
        title: 'Tạo Quiz Mới'
      },
      {
        path: 'create/:lessonId',
        loadComponent: () => import('./quiz-create.component').then(m => m.QuizCreateComponent),
        canActivate: [teacherGuard],
        title: 'Tạo Quiz cho Lesson'
      },
      {
        path: ':quizId/edit',
        loadComponent: () => import('./quiz-edit.component').then(m => m.QuizEditComponent),
        canActivate: [teacherGuard],
        title: 'Chỉnh sửa Quiz'
      },
      {
        path: 'question/create',
        loadComponent: () => import('./question-create.component').then(m => m.QuestionCreateComponent),
        canActivate: [teacherGuard],
        title: 'Tạo Câu Hỏi Mới'
      },
      {
        path: 'question/:questionId/edit',
        loadComponent: () => import('./question-edit.component').then(m => m.QuestionEditComponent),
        canActivate: [teacherGuard],
        title: 'Chỉnh sửa Câu Hỏi'
      },
      {
        path: 'preview/:lessonId',
        loadComponent: () => import('./quiz-preview.component').then(m => m.QuizPreviewComponent),
        canActivate: [teacherGuard],
        title: 'Xem trước bài kiểm tra'
      }
    ]
  }
];
