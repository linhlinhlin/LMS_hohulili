import { Routes } from '@angular/router';

export const learningRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./learning-new.component').then(m => m.LearningNewComponent),
    title: 'Học tập - LMS Maritime'
  },
  {
    path: 'select',
    redirectTo: '/student/my-courses',
    pathMatch: 'full'
  },
  // New Learning Interface (Refactored)
  {
    path: 'course/:courseId',
    loadComponent: () => import('./pages/course-learning.component').then(m => m.CourseLearningComponent),
    title: 'Khóa học - LMS Maritime'
  },
  {
    path: 'course/:courseId/lesson/:lessonId',
    loadComponent: () => import('./pages/course-learning.component').then(m => m.CourseLearningComponent),
    title: 'Bài học - LMS Maritime'
  },
  // Legacy route for backward compatibility (will be removed later)
  {
    path: 'course/:id',
    redirectTo: 'course/:id',
    pathMatch: 'full'
  },
  {
    path: 'planner',
    loadComponent: () => import('./components/study-planner.component').then(m => m.StudyPlannerComponent),
    title: 'Study Planner - LMS Maritime'
  },
  {
    path: 'calendar',
    loadComponent: () => import('./components/learning-calendar.component').then(m => m.LearningCalendarComponent),
    title: 'Learning Calendar - LMS Maritime'
  },
  {
    path: 'notes',
    loadComponent: () => import('./components/note-taking.component').then(m => m.NoteTakingComponent),
    title: 'Ghi chú - LMS Maritime'
  },
  {
    path: 'bookmarks',
    loadComponent: () => import('./components/bookmark-system.component').then(m => m.BookmarkSystemComponent),
    title: 'Bookmarks - LMS Maritime'
  },
  {
    path: 'quiz',
    loadComponent: () => import('./quiz/presentation/components/quiz-list.component').then(m => m.QuizListComponent),
    title: 'Danh sách Quiz - LMS Maritime'
  },
  {
    path: 'quiz/attempt/:id',
    loadComponent: () => import('./quiz/presentation/components/quiz-attempt.component').then(m => m.QuizAttemptComponent),
    title: 'Làm Quiz - LMS Maritime'
  },
  {
    path: 'quiz/result',
    loadComponent: () => import('./quiz/presentation/components/quiz-result.component').then(m => m.QuizResultComponent),
    title: 'Kết quả Quiz - LMS Maritime'
  },
  {
    path: 'learning-paths',
    loadComponent: () => import('./components/personalized-learning-paths.component').then(m => m.PersonalizedLearningPathsComponent),
    title: 'Learning Paths - LMS Maritime'
  },
  {
    path: 'learning-path/:id',
    loadComponent: () => import('./components/learning-path-detail.component').then(m => m.LearningPathDetailComponent),
    title: 'Learning Path Detail - LMS Maritime'
  }
];
