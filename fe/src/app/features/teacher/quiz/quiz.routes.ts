import { Routes } from '@angular/router';
import { teacherGuard } from '../../../core/guards/role.guard';

// Routes nằm trong layout (có sidebar)
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
      // Legacy Create Route (can be deprecated or redirected)
      {
        path: 'create',
        loadComponent: () => import('./quiz-create.component').then(m => m.QuizCreateComponent),
        canActivate: [teacherGuard],
        title: 'Tạo Quiz Mới'
      },
      // NEW: Lesson Quiz Create (Smart Component)
      {
        path: 'create/lesson/:lessonId',
        loadComponent: () => import('./containers/lesson-quiz-create/lesson-quiz-create.component')
          .then(m => m.LessonQuizCreateComponent),
        canActivate: [teacherGuard],
        title: 'Tạo Quiz cho Lesson'
      },
      // NEW: Assignment Quiz Create (Smart Component)
      {
        path: 'create/assignment/:courseId',
        loadComponent: () => import('./containers/assignment-quiz-create/assignment-quiz-create.component')
          .then(m => m.AssignmentQuizCreateComponent),
        canActivate: [teacherGuard],
        title: 'Tạo Bài Tập về Nhà'
      },
      // Assignment Management Routes (Placeholder for future implementation)
      // {
      //   path: 'assignments/:quizId/assign',
      //   loadComponent: () => import('./quiz-assign-students.component').then(m => m.QuizAssignStudentsComponent), // To be created
      //   canActivate: [teacherGuard],
      //   title: 'Giao Bài cho Học Viên'
      // },
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
      }
      // Note: preview route moved to standalone routes (no sidebar)
    ]
  }
];

// Routes độc lập (không có sidebar) - dùng cho quiz taking experience
export const quizStandaloneRoutes: Routes = [
  {
    path: 'quiz/preview/:lessonId',
    loadComponent: () => import('./quiz-preview.component').then(m => m.QuizPreviewComponent),
    canActivate: [teacherGuard],
    title: 'Xem trước bài kiểm tra'
  }
];
