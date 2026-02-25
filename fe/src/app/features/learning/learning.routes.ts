import { Routes } from '@angular/router';
import { enrollmentGuard } from '../../core/guards/enrollment.guard';

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
  // New Learning Interface - Enrollment required (Coursera/edX pattern)
  {
    path: 'course/:courseId',
    loadComponent: () => import('./pages/course-learning.component').then(m => m.CourseLearningComponent),
    canActivate: [enrollmentGuard],
    title: 'Khóa học - LMS Maritime'
  },
  {
    path: 'course/:courseId/lesson/:lessonId',
    loadComponent: () => import('./pages/course-learning.component').then(m => m.CourseLearningComponent),
    canActivate: [enrollmentGuard],
    title: 'Bài học - LMS Maritime'
  },
  {
    path: 'notes',
    loadComponent: () => import('./components/note-taking.component').then(m => m.NoteTakingComponent),
    title: 'Ghi chú - LMS Maritime'
  },
  {
    path: 'bookmarks',
    loadComponent: () => import('./components/bookmark-system.component').then(m => m.BookmarkSystemComponent),
    title: 'Dấu trang - LMS Maritime'
  },
];
