import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Server
  },
  {
    path: 'courses',
    renderMode: RenderMode.Server
  },
  {
    path: 'courses/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'about',
    renderMode: RenderMode.Server
  },
  {
    path: 'contact',
    renderMode: RenderMode.Server
  },
  {
    path: 'privacy',
    renderMode: RenderMode.Server
  },
  {
    path: 'terms',
    renderMode: RenderMode.Server
  },
  {
    path: 'refund-policy',
    renderMode: RenderMode.Server
  },
  {
    path: 'auth/login',
    renderMode: RenderMode.Client
  },
  {
    path: 'auth/register',
    renderMode: RenderMode.Client
  },
  {
    path: 'teacher',
    renderMode: RenderMode.Client
  },
  {
    path: 'teacher/dashboard',
    renderMode: RenderMode.Client
  },
  {
    path: 'teacher/courses',
    renderMode: RenderMode.Client
  },
  {
    path: 'teacher/course-creation',
    renderMode: RenderMode.Client
  },
  {
    path: 'teacher/courses/:id/editor',
    renderMode: RenderMode.Client
  },
  {
    path: 'teacher/assessments',
    renderMode: RenderMode.Client
  },
  {
    path: 'teacher/students',
    renderMode: RenderMode.Client
  },
  {
    path: 'teacher/students/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'teacher/analytics',
    renderMode: RenderMode.Client
  },
  {
    path: 'teacher/messages',
    renderMode: RenderMode.Client
  },
  {
    path: 'student',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/dashboard',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/courses',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/courses/library',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/courses/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/my-courses',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/course/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/tasks',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/tasks/:id/work',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/assignments',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/assignments/:id/work',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/analytics',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/profile',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/learn/select',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/learn/course/:courseId',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/learn/course/:courseId/lesson/:lessonId',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/learn/notes',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/learn/bookmarks',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/results',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/grades',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/quiz',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/quiz/take/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/browse',
    renderMode: RenderMode.Client
  },
  {
    path: 'admin/dashboard',
    renderMode: RenderMode.Client
  },
  {
    path: 'admin/users',
    renderMode: RenderMode.Client
  },
  {
    path: 'admin/courses',
    renderMode: RenderMode.Client
  },
  {
    path: 'admin/analytics',
    renderMode: RenderMode.Client
  },
  {
    path: 'admin/settings',
    renderMode: RenderMode.Client
  },
  {
    path: 'admin',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];
